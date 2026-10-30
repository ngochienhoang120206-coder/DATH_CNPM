# Pull Request: Enrollment and Learning Progress APIs (Issue #8)

## Summary

Implements student enrollment lifecycle, lesson progress tracking, course completion summaries and resume information.

Closes #8

## API changes

- `POST /api/courses/:courseId/enroll` and `POST /api/enrollments` — enroll in a published course.
- `DELETE /api/courses/:courseId/enroll` — leave a course.
- `GET /api/enrollments/me` and `GET /api/enrollments/my-courses` — list enrollments and group courses by progress status.
- `POST /api/lessons/:lessonId/progress` and `PUT /api/progress/:lessonId` — save completion and playback position.
- `GET /api/enrollments/resume` — return the most recently updated enrollment and lesson.

## Rules and behavior

- Restricts enrollment and progress changes to authenticated students.
- Rejects unavailable courses, invalid playback positions and progress updates without an active enrollment.
- Recalculates course completion and marks enrollment complete when all active lessons are completed.
- Re-enrollment clears the previous left/deleted state.

## Verification

Ran the Issue #8 Newman acceptance collection against the isolated Docker test stack (PostgreSQL and Redis).

- Requests: 10; passed: 10; failed: 0.
- Assertions: 10; passed: 10; failed: 0.
- Includes checks for unauthenticated access, enrollment, progress persistence, validation, resume, leaving and post-leave authorization.
- Per-request status and timing: [`backend/postman/reports/enrollment-api-test.log`](backend/postman/reports/enrollment-api-test.log).
- Docker API image built successfully and Prisma schema was applied to the disposable test database.

Run locally with Newman:

```sh
npx newman run backend/postman/enrollment-api.postman_collection.json \
  --env-var baseUrl=http://localhost:5000 \
  --env-var studentEmail=<student-email> \
  --env-var studentPassword=<student-password> \
  --env-var publishedCourseId=<published-course-id> \
  --env-var lessonId=<lesson-id>
```

## Review checklist

- [x] Newman acceptance collection passes (10/10 requests and assertions).
- [ ] Confirm completion behavior with a multi-lesson course.
- [ ] CI checks pass.
- [ ] At least one approving review before merge.

## Branching

Branch: `feat/issue-8-enrollment-api`  
Base: `feat/issue-4-auth` (stacked on the authentication PR).
