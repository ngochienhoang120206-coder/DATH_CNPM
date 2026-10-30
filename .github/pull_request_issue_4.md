# Pull Request: Authentication, JWT and RBAC (Issue #4)

## Summary

Implements the authentication and account-management API with JWT sessions, secure role-based access control, profile management, password recovery and one-time WebSocket tickets.

Closes #4

## API changes

- `POST /api/auth/register` — creates a student account and hashes its password.
- `POST /api/auth/login` — validates credentials and issues an HttpOnly `access_token` cookie; banned or deleted accounts are rejected.
- `POST /api/auth/logout` — clears the session cookie.
- `GET /api/users/profile` and `PUT /api/users/profile` — reads and updates the authenticated user's profile.
- `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` — create and consume hashed, single-use reset tokens.
- `GET /api/auth/socket-ticket` — issues a one-time Redis ticket with a 30-second TTL for WebSocket authentication.

## Security and implementation

- Protects endpoints with JWT verification and role authorization for `student`, `instructor` and `admin`.
- Prevents public registration from assigning privileged roles.
- Rejects banned and soft-deleted users during login and authenticated requests.
- Centralizes API and Prisma error mapping.
- Regenerates the Prisma client on start, dev, seed and test commands; keeps the generated output ignored instead of committing generated client files.
- Excludes local environment files and records a sanitized acceptance-test report without cookies, JWTs, reset tokens or response bodies.

## Verification

The suite was run from the pushed branch in an isolated Docker stack. It passed **17 requests, 17 assertions, 0 failures** for registration, login, role enforcement, profile updates, password reset and logout. The per-request results are in `backend/postman/reports/auth-test.log`.

Run with `cd backend && npm test` after starting the local Postgres, Redis, Mailpit and backend test services. `npm test` generates the Prisma client before running the Newman collection.

## Review checklist

- [x] Feature implemented on `feat/issue-4-auth`.
- [x] API acceptance collection and runner included.
- [x] No secrets or local credentials included.
- [ ] CI checks pass on the pull request.
- [ ] At least one approving review before merge.
