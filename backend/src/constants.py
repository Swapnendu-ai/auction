from pathlib import Path

# Use paths relative to the backend/ working directory (we run via `cd backend && ...`).
DB_PATH = Path("db")
PLAYERS_CSV_PATH = Path("data/players.csv")

# Auction timing / rules
BIDDING_SECONDS = 15

# Defaults
TEAM_WALLET_DEFAULT = 100
BASE_PRICE_DEFAULT = 1