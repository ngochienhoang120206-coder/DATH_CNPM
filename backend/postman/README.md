# Auth API Postman tests

This collection covers registration, role-assignment protection, login, cookie attributes, JWT claims and expiry, unauthenticated and banned profile access, profile update, password reset email delivery, reset-token expiry behavior and reuse prevention, password changes, logout, and the stored PostgreSQL password hash.

## Run the full automated suite

From the repository root, start only the services needed by the tests:

```powershell
docker compose -f docker-compose.yml -f backend/docker-compose.postman.yml up --build -d postgres redis mailpit backend
```

Then, from `backend`:

```powershell
npm install
npm test
```

`npm test` runs the Postman collection through Newman. The runner prepares a local banned-user fixture, waits for the backend and Mailpit, verifies the resulting password hash and student role directly in PostgreSQL, then soft-deletes the temporary registered account. It exits nonzero if an assertion or database check fails.

Every run writes a sanitized request-by-request log to `postman/reports/auth-test.log`. It records endpoint names, status codes, durations, and assertion results without writing cookies, JWTs, reset tokens, or response bodies.

Mailpit captures reset emails locally at `http://localhost:8025`; no real email account is used. The generated local Postman environments contain a temporary signed test token and are ignored by Git.

## Run in the Postman app

Run `npm test` once to generate `auth.local.postman_environment.json`, then import that environment and `auth.postman_collection.json` into Postman. Select the generated environment and run the collection. Clear any old `localhost` cookies before the run. The full PostgreSQL password-hash check is performed by the Newman runner.

Use a local development database only. The runner refuses to execute when `NODE_ENV=production`.
