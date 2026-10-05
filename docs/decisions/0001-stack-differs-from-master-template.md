# ADR 0001: Keep the MERN + Kafka stack instead of the template's golden path

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

The master project template standardises FastAPI/Django/Fastify + TypeScript on PostgreSQL with a Vite + TypeScript + RTK Query frontend. CollabFlow predates it and is built on Express (JavaScript), MongoDB, Kafka, Socket.IO and Create React App. The template's generator rejects non-PostgreSQL backends, so CollabFlow cannot be generated from it.

## Decision

Keep the existing stack and align everything that does not require replacing it: the HTTP contract (ADR 0003), health endpoints, numeric non-root container user, Node 22 images, the *Quality checks* CI workflow, changelog gate, and documentation layout.

## Consequences

- Deliberate differences remain: JavaScript rather than TypeScript, jest rather than `node:test`, MongoDB/Kafka rather than PostgreSQL, Create React App rather than Vite, Compose + Caddy deployment rather than Launchpad/`vm_tool` Kubernetes manifests, and a root `.env` rather than generated `env/` overrides.
- Moving to the template stack would be a rewrite (Kafka and MongoDB are unsupported there) and is out of scope; revisit if the product moves to PostgreSQL.
- Create React App is deprecated; migrating the frontend to Vite + TypeScript is the natural next alignment step.
