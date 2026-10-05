# Changelog

## Unreleased

- Production readiness: GitHub OAuth sign-in (no passwords stored), per-document ownership and sharing, authenticated Socket.IO, input validation, helmet, rate limiting, restricted CORS, structured logs without request bodies, environment validation, graceful shutdown. See ADR 0002.
- Edits now persist to MongoDB through the Kafka consumer (previously the socket path never saved them), which also fixes duplicate broadcasts and lets a document be cleared to empty.
- API follows the master template's contract: `/api/v1/...`, response envelope `{success, code, message, data, meta, trace_id}`, `X-Request-ID`, `GET /api/v1/health` and `GET /api/v1/ready`, validation failures as 422. **Breaking:** the GitHub OAuth callback URL is now `https://<domain>/api/v1/auth/github/callback`; clients of the old unversioned `/api/...` routes must move to `/api/v1`. See ADR 0003.
- Deployment: multi-stage images on Node 22 (backend runs as UID 10001; frontend is static files on unprivileged nginx), Compose with only Caddy (automatic HTTPS) published, MongoDB authentication and named volumes, pinned images, health checks, log rotation; `docker-compose.dev.yml` and `dev.sh` for development.
- CI is the template's *Quality checks* workflow (changelog gate, tests, `npm audit`, frontend build, workflow/Compose YAML validation, image builds) and gates the deploy workflow. Actions updated to v7.
- Removed the committed `services/backend/.env`; the old `JWT_SECRET` is still in git history and must be rotated. Added `.env.example`.
- Socket.IO client now connects to the same origin at `/socket.io` (it previously targeted `/api`, a namespace the proxy did not route).
- Docs: `docs/ARCHITECTURE.md` and ADRs 0001–0003 (including the deliberate differences from the master template).
- Not verified: the full stack has not been started with Docker, nor GitHub sign-in against github.com (both are covered by mocked tests and CI image builds only).
