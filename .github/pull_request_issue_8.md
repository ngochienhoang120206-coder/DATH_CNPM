# Pull Request: Enrollment and Learning Progress APIs (Issue #8)

## Summary

Implements student enrollment lifecycle and learning-progress tracking, including resume information and progress summaries.

Closes #8

## API changes

- `POST /api/courses/:courseId/enroll` and `POST /api/enrollments` — enroll a student in a published course.
- `DELETE /api/courses/:courseId/enroll` — mark the student's enrollment as left.
- `GET /api/enrollments/me` — list the current student's active and completed enrollments.
- `GET /api/enrollments/my-courses` — group courses into in-progress and completed lists.
- `POST /api/lessons/:lessonId/progress` and `PUT /api/progress/:lessonId` — save lesson completion and playback position.
- `GET /api/enrollments/resume` — return the most recently updated enrollment and its last lesson.

## Rules and behavior

- Restricts enrollment and progress changes to authenticated students.
- Rejects missing/unpublished courses, invalid lesson positions and progress updates without an active enrollment.
- Persists per-lesson progress, recalculates the course completion percentage and marks the enrollment complete when all active lessons are completed.
- Re-enrollment clears the prior left/deleted state.

## Tests

`backend/postman/enrollment-api.postman_collection.json` covers authentication, enroll/list/group, progress validation and persistence, resume lookup, leaving a course and denying progress after leaving.

Run against a local backend with a seeded student, published course and lesson:

```sh
npx newman run backend/postman/enrollment-api.postman_collection.json \
  --env-var baseUrl=http://localhost:5000 \
  --env-var studentEmail=<student-email> \
  --env-var studentPassword=<student-password> \
  --env-var publishedCourseId=<published-course-id> \
  --env-var lessonId=<lesson-id>
```

## Review checklist

- [ ] Newman collection passes against the configured test database.
- [ ] Confirm course completion behavior with a course containing multiple lessons.
- [ ] CI checks pass.
- [ ] At least one approving review before merge.

## Branching

Branch: `feat/issue-8-enrollment-api`
Base: `feat/issue-4-auth` (stacked on the authentication PR).
