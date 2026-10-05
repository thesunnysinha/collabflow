# Architecture

CollabFlow is a real-time collaborative code/document editor.

## Services

| Service | Stack | Notes |
|---|---|---|
| `caddy` | Caddy 2 | Only published service (80/443). Automatic HTTPS; routes `/api/*` and `/socket.io/*` to the backend, everything else to the frontend; WebSocket upgrades are automatic. |
| `frontend` | React (Create React App), MUI, Ace editor | Built to static files, served by unprivileged nginx on 8080. |
| `backend` | Node 22, Express, Socket.IO, Mongoose, KafkaJS | Port 8000, runs as UID 10001. |
| `mongo` | MongoDB 7 | Users, documents. Authentication on, named volume. |
| `kafka` / `zookeeper` | Confluent 7.6 | Topic `document-updates`, internal network only. |

## Request path

The browser talks only to the Caddy origin. REST is `/api/v1/*`; real-time is Socket.IO at `/socket.io`. There is no CORS in normal operation (`CORS_ORIGINS` is empty).

## Sign-in

GitHub OAuth web flow, implemented in `controllers/authController.js`:

1. `GET /api/v1/auth/github` sets an httpOnly `oauth_state` nonce cookie and redirects to GitHub with a signed `state` containing the same nonce.
2. GitHub redirects to `/api/v1/auth/github/callback`. The state signature and cookie nonce must match.
3. The code is exchanged server-side; the profile is upserted by GitHub numeric id.
4. The app issues a 1-hour JWT and redirects to `/auth/callback#token=...` (URL fragment, never sent to a server). The SPA stores it and removes it from the address bar.

REST requests send `Authorization: Bearer`; Socket.IO sends the token in the handshake `auth` payload and the server takes the display name from the database.

## Authorization

Documents have an `owner` and `collaborators`. Members can read and edit; only the owner can share, un-share or delete. Non-members receive 404 for both missing and forbidden documents so ids cannot be probed. Access is re-checked on every socket update.

## Edit flow

```
client --document-update--> socket (validate, authorize) --> Kafka (key = documentId)
Kafka consumer --> MongoDB ($set only the changed fields) --> room broadcast `document-update-<id>`
```

Only whitelisted fields (`content`, `title`, `language`, `theme`) with validated types and sizes are accepted. Messages for one document share a partition, so they are applied in order.

## API contract

`/api/v1/...`; every response is `{success, code, message, data, meta, trace_id}` with a matching `X-Request-ID` header. Validation failures are 422 with `meta.details`. `GET /api/v1/health` has no dependencies; `GET /api/v1/ready` checks MongoDB and Kafka. See ADR 0003.

## Known limitations

- Single backend instance: Socket.IO rooms and presence are in-process, and the Kafka consumer broadcasts only to sockets on its own instance. Scaling out needs a shared adapter (for example Redis). This is the template's "process-local state breaks replicas" lesson.
- Last-write-wins editing (no OT/CRDT).
- Single-broker Kafka (replication factor 1).
- JWTs live in `localStorage` and cannot be revoked before they expire.
