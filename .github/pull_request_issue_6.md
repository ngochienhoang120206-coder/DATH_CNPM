# Pull Request: Course and Learning Content APIs (Issue #6)

## Summary

Completes the instructor/admin course-management API and adds lesson-content access rules. Course owners can manage courses, chapters, lessons and materials; public users see published course details while enrolled students and owners can access learning content.

Closes #6

## API changes

- List categories and published courses with search, category filters and pagination.
- Read a course with its chapter, lesson and material hierarchy.
- Create, update and soft-delete courses, chapters, lessons and materials.
- Enforce instructor ownership or admin access for writes.
- Hide unpublished courses from non-owners and restrict lesson materials and assessments to enrolled students, instructors who own the course and administrators.
- Cascade soft deletion through a course's chapters, lessons and materials.

## Implementation notes

- Adds optional authentication to course details so published catalog metadata remains public while access to protected course content is checked for signed-in users.
- Uses the shared API error mapping for invalid input, forbidden ownership and missing resources.

## Tests

`backend/postman/course-api.postman_collection.json` exercises instructor login, course listing and pagination, course/chapter/lesson/material creation, detail nesting, and soft-delete endpoints.

Run against a local backend with a seeded instructor account:

```sh
npx newman run backend/postman/course-api.postman_collection.json \
  --env-var baseUrl=http://localhost:5000 \
  --env-var instructorEmail=<instructor-email> \
  --env-var instructorPassword=<instructor-password>
```

## Review checklist

- [ ] Newman collection passes against the configured test database.
- [ ] Verify public, enrolled-student, instructor-owner and admin access cases.
- [ ] CI checks pass.
- [ ] At least one approving review before merge.

## Branching

Branch: `feat/issue-6-course-api`
Base: `feat/issue-4-auth` (stacked on the authentication PR).
