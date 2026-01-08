## Auction backend

FastAPI "message broker" backend for the auction game.

### Run (with `uv`)

From `backend/`:

- Install deps: `uv sync`
- Run server: `uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000`

### API

- `GET /state`: poll current auction state (also advances timers)
- `POST /bid`: place a bid
- `POST /skip`: skip an auto-assigned player (limited)
- `POST /admin/reset`: reset auction with provided players
- `POST /admin/load_players`: load players from disk and reset

### Players on disk

Put player files in `backend/data/players/*.json`, each like:

```json
{
  "name": "Player 1",
  "info": "All-rounder",
  "base_price": 10,
  "photo_path": ""
}
```


