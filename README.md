# WebSocket Chat Monorepo

This workspace is split into two folders:

- `backend`: Node.js + Express + MongoDB + `ws` WebSocket server
- `frontend`: React + Vite dashboard UI for APIs and realtime messaging

## Run Backend

```bash
cd backend
npm install
npm run dev
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend env setup:

```bash
cp .env.example .env
```

Default URLs:

- API: `http://localhost:4000`
- WebSocket: `ws://localhost:4000`
