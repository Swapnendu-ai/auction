from __future__ import annotations

import asyncio
import csv
from functools import cache
import json
from datetime import datetime
from enum import Enum
from typing import Any
from pathlib import Path
from inspect import isawaitable

from pydantic import BaseModel, Field, field_serializer

from .constants import (
    BASE_PRICE_DEFAULT,
    BIDDING_SECONDS,
    DB_PATH,
    PLAYERS_CSV_PATH,
    TEAM_WALLET_DEFAULT,
)

_STATE_LOCK = asyncio.Lock()
@cache
def get_state()->State:
    return State()

MAX_PLAYERS_PER_TEAM: int | None = None

class InvalidBidError(Exception):
    pass

class NewBidFound(Exception):
    pass


class TeamNames(str, Enum):
    A = "Red"
    B = "Blue"
    C = "Green"
    D = "Yellow"


class Bid(BaseModel):
    team: TeamNames
    amount: int
    timestamp: datetime = Field(default_factory=datetime.now)


class Player(BaseModel):
    name: str
    info: str
    base_price: int = 0
    photo_path: str

    # Derived by the store/state machine; kept on the model for the frontend.
    current_price: int = BASE_PRICE_DEFAULT
    next_price: int = BASE_PRICE_DEFAULT

    bids: list[Bid] = Field(default_factory=list)

    def update_next_price(self) -> None:
        self.next_price = self.current_price + (self.current_price // 10) + 1

class Team(BaseModel):
    name: TeamNames
    wallet: int = Field(default=TEAM_WALLET_DEFAULT)
    players: list[Player] = Field(default_factory=list)

    def bid(self, player: Player | None, amount: int) -> None:
        if player is None:
            raise InvalidBidError("no_current_player")

        # Roster limit (set once when State is created / crash-recovered).
        if MAX_PLAYERS_PER_TEAM is not None and len(self.players) >= MAX_PLAYERS_PER_TEAM:
            raise InvalidBidError("team_roster_full")

        if amount < player.next_price:
            raise InvalidBidError("amount_must_be_amount_greater_than_next_price")
        if amount > self.wallet:
            raise InvalidBidError("insufficient_wallet")

        player.bids.append(Bid(team=self.name, amount=amount))
        # Update pricing immediately on bid, so all clients polling state see it.
        player.current_price = max(BASE_PRICE_DEFAULT, amount)
        player.update_next_price()

    def add_player(self, player: Player) -> None:
        final_amount = player.bids[-1].amount
        self.wallet -= final_amount + BASE_PRICE_DEFAULT #cashback for the player
        self.players.append(player)


class State(BaseModel):
    event_id: int = 0
    
    teams: dict[TeamNames, Team] = Field(
        default_factory=lambda: {t: Team(name=t) for t in TeamNames}
    )

    remaining_players: list[Player] = Field(default_factory=list)
    current_player: Player | None = None

    created_at: datetime = Field(default_factory=datetime.now)

    def model_post_init(self, __context: Any):
        # When we load a historical state from disk via `model_validate`, we skip this.
        if isinstance(__context, dict) and __context.get("skip_recovery"):
            return

        # Crash recovery: if DB_PATH has any json files, load from the latest one.
        recovered = self._try_load_latest_state()
        if recovered is not None:
            self._hydrate_from(recovered)
            self._normalize_all_photo_paths()
            self._init_roster_limit()
            return

        # Fresh start: load from CSV (order matters), set current player, persist.
        self.remaining_players = self._load_players()
        self.current_player = self.remaining_players.pop(0) if self.remaining_players else None
        self._normalize_all_photo_paths()
        self._init_roster_limit()
        self._persist_from_sync()

    def _hydrate_from(self, other: "State") -> None:
        # Copy fields from recovered state into this instance.
        self.event_id = other.event_id
        self.teams = other.teams
        self.remaining_players = other.remaining_players
        self.current_player = other.current_player
        self.created_at = other.created_at

    def _init_roster_limit(self) -> None:
        global MAX_PLAYERS_PER_TEAM
        if MAX_PLAYERS_PER_TEAM is not None:
            return

        total_players = sum(len(t.players) for t in self.teams.values())
        total_players += len(self.remaining_players)
        total_players += 1 if self.current_player is not None else 0

        num_teams = len(self.teams)
        MAX_PLAYERS_PER_TEAM = (total_players // num_teams) if num_teams > 0 else 0

    def _normalize_all_photo_paths(self) -> None:
        """
        Ensure the API only returns browser-loadable photo URLs.
        Converts any absolute/local paths like `/Users/.../yuvi.jpg` into `/photos/yuvi.jpg`.
        """
        def norm(p: str) -> str:
            raw = (p or "").strip()
            if not raw:
                return ""
            if raw.startswith("http://") or raw.startswith("https://"):
                return raw
            if raw.startswith("/photos/"):
                return raw
            filename = Path(raw).name
            return f"/photos/{filename}" if filename else ""

        if self.current_player is not None:
            self.current_player.photo_path = norm(self.current_player.photo_path)

        for pl in self.remaining_players:
            pl.photo_path = norm(pl.photo_path)

        for team in self.teams.values():
            for pl in team.players:
                pl.photo_path = norm(pl.photo_path)

    def _try_load_latest_state(self) -> "State | None":
        if not DB_PATH.exists():
            return None
        candidates = [p for p in DB_PATH.glob("*.json") if p.is_file()]
        if not candidates:
            return None

        def _score(p: Path):
            # Prefer numeric event-id files like "12.json"; otherwise fall back to mtime.
            stem = p.stem
            if stem.isdigit():
                return (1, int(stem))
            return (0, int(p.stat().st_mtime_ns))

        latest = max(candidates, key=_score)
        try:
            payload = json.loads(latest.read_text(encoding="utf-8"))
            # Avoid re-triggering recovery inside model_post_init.
            return State.model_validate(payload, context={"skip_recovery": True})
        except Exception:
            return None

    def _load_players(self):
        # Players are provided via a CSV (order matters; do NOT randomize).
        if not PLAYERS_CSV_PATH.exists():
            return []

        players: list[Player] = []
        with open(PLAYERS_CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Expected columns (case-sensitive):
                # - name
                # - info
                # - photo_path (optional)
                name = (row.get("name") or "").strip()
                if not name:
                    continue

                info = (row.get("info") or "").strip()
                photo_path_raw = (row.get("photo_path") or "").strip()
                # CSV may provide an absolute local path for convenience during setup;
                # normalize to a browser-loadable URL served by the backend.
                photo_filename = Path(photo_path_raw).name if photo_path_raw else ""
                photo_path = f"/photos/{photo_filename}" if photo_filename else ""

                players.append(
                    Player(
                        name=name,
                        info=info,
                        photo_path=photo_path,
                    )
                )

        return players

    @field_serializer("teams")
    def _serialize_teams(self, v: dict[TeamNames, Team], _info: Any) -> dict[str, Any]:
        # Use string keys in JSON.
        return {k.value: team.model_dump() for k, team in v.items()}

    async def event_update(self, func, *args, **kwargs) -> int:
        """
        Run a state mutation while holding the global state lock.
        If successful, increments event_id and logs a json snapshot to DB_PATH/<event_id>.json.
        """
        async with _STATE_LOCK:
            result = func(*args, **kwargs)
            if isawaitable(result):
                result = await result

            self.event_id += 1
            await self.persist()
            return self.event_id

    async def persist(self):
        DB_PATH.mkdir(parents=True, exist_ok=True)
        with open(DB_PATH / f"{self.event_id}.json", "w", encoding="utf-8") as f:
            # Ensure JSON-serializable output (e.g., datetimes become strings).
            json.dump(self.model_dump(mode="json"), f)

    def _persist_from_sync(self) -> None:
        """
        Persist from sync contexts (like model_post_init). If an event loop is
        already running, schedule; otherwise run to completion.
        """
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(self.persist())
            return
        loop.create_task(self.persist())

    async def finalize(self, event_id: int):
        await asyncio.sleep(BIDDING_SECONDS)
        async def _finalize_bid(event_id: int):
            if event_id < self.event_id:
                raise NewBidFound()
            if self.current_player and self.current_player.bids:
                self.teams[self.current_player.bids[-1].team].add_player(self.current_player)
            self.current_player = self.remaining_players.pop(0) if self.remaining_players else None
        
        try:
            await self.event_update(_finalize_bid, event_id)
        except NewBidFound:
            return


get_state()
