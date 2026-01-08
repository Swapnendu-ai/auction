default:
  @just --list

# Run backend (recommended; avoids import issues from running src/main.py directly)
backend-dev:
  cd backend && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

backend:
  cd backend && uv run uvicorn src.main:app --host 0.0.0.0 --port 8000

# Frontend (Vite + React/TS)
frontend-install:
  cd frontend && npm install

frontend-dev:
  cd frontend && npm run dev

frontend-build:
  cd frontend && npm run build

frontend-preview:
  cd frontend && npm run preview


