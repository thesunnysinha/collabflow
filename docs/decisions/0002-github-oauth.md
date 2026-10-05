# ADR 0002: GitHub OAuth as the only sign-in

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

The first production-readiness pass added username/password accounts. The product owner wanted sign-in through GitHub instead.

## Decision

Use the GitHub OAuth web flow with no passwords stored. The `state` parameter is a signed, short-lived JWT whose nonce is also bound to the browser by an httpOnly cookie (login CSRF protection). Accounts are keyed by GitHub numeric id; the username is refreshed at each sign-in because users can rename. The app's own 1-hour JWT is handed to the SPA in the URL fragment.

## Consequences

- Needs `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `PUBLIC_URL`; the OAuth App's callback is `https://<domain>/api/v1/auth/github/callback`.
- Users of the earlier password login are not migrated. Collaborators are added by GitHub username; if a user renames, the most recently active account with that name wins.
- No refresh tokens or revocation: sessions end after one hour. The template's cookie + CSRF + refresh model is a possible later change.
