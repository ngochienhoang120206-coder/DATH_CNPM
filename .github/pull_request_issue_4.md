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
- Keeps generated local environment files and test reports out of version control.

## Verification

The saved Newman acceptance report records **17 requests, 17 assertions, 0 failures** for registration, login, role enforcement, profile updates, password reset and logout. Run the suite with `cd backend && npm run test:auth` after configuring the local test database and Mailpit services.

## Review checklist

- [x] Feature implemented on `feat/issue-4-auth`.
- [x] API acceptance collection and runner included.
- [x] No secrets or local credentials included.
- [ ] CI checks pass on the pull request.
- [ ] At least one approving review before merge.
