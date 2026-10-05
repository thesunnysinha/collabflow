# ADR 0003: Adopt the template's API contract

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

All template backends expose `/api/v1`, the envelope `{success, code, message, data, meta, trace_id}`, an `X-Request-ID` header, `GET /api/v1/health` (no dependencies) and `GET /api/v1/ready`, with validation failures as 422. CollabFlow used unversioned routes, an ad-hoc `{success, data|error}` shape and `/healthz`/`/readyz`.

## Decision

Adopt the template contract. `utils/envelope.js` builds responses, `middleware/requestId.js` accepts a bounded caller-supplied id or generates one, and error classes carry a `code` (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `NOT_READY`, `INTERNAL_ERROR`, ...).

## Consequences

- Breaking change for any client of the old routes; the frontend client and the GitHub OAuth callback URL were updated together.
- Unexpected errors never leak messages: they return `INTERNAL_ERROR` with the trace id, and the same id is in the logs.
- Socket.IO events are outside the envelope.
