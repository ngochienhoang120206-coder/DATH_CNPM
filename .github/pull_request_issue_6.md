# Pull Request: Course and Learning Content APIs (Issue #6)

## Summary

Completes instructor/admin course management and applies access rules to published course content.

Closes #6

## API changes

- List categories and published courses with search, category filters and pagination.
- Read course, chapter, lesson and material details with nested course content.
- Create, update and soft-delete courses, chapters, lessons and materials.
- Restrict writes to the course owner or an administrator; limit protected learning content to enrolled students and authorized staff.
- Cascade course soft deletion to chapters, lessons and materials.

## Verification

Ran the Issue #6 Newman acceptance collection against the isolated Docker test stack (PostgreSQL and Redis).

- Requests: 15; passed: 15; failed: 0.
- Assertions: 15; passed: 15; failed: 0.
- Per-request status and timing: [`backend/postman/reports/course-api-test.log`](backend/postman/reports/course-api-test.log).
- Docker API image built successfully and Prisma schema was applied to the disposable test database.

Run locally with Newman:

```sh
npx newman run backend/postman/course-api.postman_collection.json \
  --env-var baseUrl=http://localhost:5000 \
  --env-var instructorEmail=<instructor-email> \
  --env-var instructorPassword=<instructor-password>
```

## Review checklist

- [x] Newman acceptance collection passes (15/15 requests and assertions).
- [ ] Review public, enrolled-student, instructor-owner and admin access cases.
- [ ] CI checks pass.
- [ ] At least one approving review before merge.

## Branching

Branch: `feat/issue-6-course-api`  
Base: `feat/issue-4-auth` (stacked on the authentication PR).
