from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .models import InvalidBidError, TeamNames, get_state as model_get_state

app = FastAPI(title="Auction Backend", version="0.1.0")

# Serve player photos over HTTP.
# Put files in `backend/data/photos/` and reference them as `/photos/<filename>`.
app.mount("/photos", StaticFiles(directory="data/photos"), name="photos")

# Dev-friendly CORS for a separate frontend dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BidRequest(BaseModel):
    team: TeamNames
    amount: int = Field(ge=0)


@app.get("/state")
async def get_state():
    return model_get_state().model_dump()


@app.post("/bid")
async def bid(req: BidRequest):
    try:
        state = model_get_state()
        event_id = await state.event_update(
            func=state.teams[req.team].bid,
            player=state.current_player,
            amount=req.amount,
        )
        # Schedule finalize to actually run after the response returns.
        asyncio.create_task(state.finalize(event_id))
        return state.model_dump()
    except InvalidBidError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/skip")
async def skip():
    """
    Auctioneer action: skip the current player and move them to the end of the queue.
    """
    state = model_get_state()
    event_id = await state.event_update(func=state.skip_current_player)
    # Any pending finalize tasks will no-op because event_id has advanced.
    return state.model_dump()

