# Auction

## Introduction
The task of this project is to build a simple auction app. 

## Backend
The backend is a message broker implemented with **FastAPI**. Clients poll the current state and place bids.

### How to run
- From repo root: `just backend-dev`
- Or manually:
  - `cd backend && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000`

### API
- `GET /state`: returns the full auction state (JSON).
- `POST /bid`: places a bid.
  - body: `{ "team": "Red" | "Blue" | "Green" | "Yellow", "amount": <int> }`
  - errors: HTTP 400 with a string reason (e.g. `amount_must_be_amount_greater_than_next_price`, `insufficient_wallet`)

### Persistence / crash recovery
- The backend writes state snapshots to `backend/db/<event_id>.json`.
- On startup, if `backend/db/*.json` exists, it loads the latest snapshot (highest numeric `<event_id>.json`).
- If no snapshots exist, it creates a new state from the players CSV (below) and persists the initial snapshot.

### Players input (CSV)
Players are loaded from `backend/data/players.csv` in **file order** (this is the queue order; no randomization).
Expected columns:
- `name` (required)
- `info` (optional)
- `base_price` (optional int)
- `photo_path` (optional string)

## Frontend
Frontend will be implemented in react / typescript.

### Auctioneer view

The page is dividied into 2 halves. 
#### Left Half
The top 75% shows player information.
The bottom 25% shows current bid and price and a timer.

#### Right Half
Each team is shows as a column. The top of the column has the name and then the players. The bottom of the
column shows the remaining purse.

### Team View
Teams will view this on the phone web. The screen will have a display with a number which is the bid for the player. The minimum amount (`next_price`) will be set by the state. There will be 3 buttons
1. Increase the price to next acceptable bid
2. Decrease the price to previous acceptable bid
3. Bid: disable if bid is more than wallet

#### Acceptable bid rule
- The backend maintains two fields on the current player:
  - `current_price`
  - `next_price`
- **Bid validation**: a bid is valid iff `amount >= next_price` and `amount <= team.wallet`.

`next_price` is derived from the latest bid:
- **No bids yet**: `current_price = next_price = max(base_price, 1)`
- **After a bid**:
  - `current_price = last_bid_amount`
  - `next_price = current_price + (current_price // 10) + 1`

## Logic
1. On startup, the backend loads the latest `db/<event_id>.json` if present; otherwise loads players from `data/players.csv` in order and sets the first player as `current_player`.
2. Teams place bids via `POST /bid`.
3. Each accepted bid increments `event_id`, persists `db/<event_id>.json`, and schedules a finalize timer.
4. **Finalize timer**: after `BIDDING_SECONDS = 10`, if no newer bid happened (checked by `event_id`), the current player is assigned to the last bidding team, then the next player becomes current.
