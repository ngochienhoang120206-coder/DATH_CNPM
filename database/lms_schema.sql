BEGIN;

CREATE TYPE users_status         AS ENUM ('active', 'banned');
CREATE TYPE enrollments_status   AS ENUM ('enrolled', 'left', 'completed');
CREATE TYPE materials_type       AS ENUM ('video', 'text');
CREATE TYPE assessments_type     AS ENUM ('quiz', 'file_upload');
CREATE TYPE notifications_type   AS ENUM ('new_content', 'deadline_reminder', 'grade_released', 'system');
CREATE TYPE reports_status       AS ENUM ('pending', 'resolved', 'rejected');

CREATE TABLE roles (
    id          uuid         NOT NULL DEFAULT gen_random_uuid(),
    name        varchar(50)  NOT NULL,
    "deletedBy" uuid,
    "isDeleted" boolean      NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz  NOT NULL DEFAULT now(),
    "updatedAt" timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE users (
    id                    uuid          NOT NULL DEFAULT gen_random_uuid(),
    role_id               uuid          NOT NULL,
    email                 varchar(255)  NOT NULL,
    full_name             varchar(255)  NOT NULL,
    password              varchar(255)  NOT NULL,
    avatar_url            varchar(500),
    bio                   text,
    status                users_status  NOT NULL DEFAULT 'active',
    is_verified           boolean       NOT NULL DEFAULT false,
    verify_token          varchar(255),
    verify_token_expiry   timestamptz,
    reset_token           varchar(255),
    reset_token_expiry    timestamptz,
    "deletedBy"           uuid,
    "isDeleted"           boolean       NOT NULL DEFAULT false,
    "deletedAt"           timestamptz,
    "createdAt"           timestamptz   NOT NULL DEFAULT now(),
    "updatedAt"           timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE categories (
    id          uuid          NOT NULL DEFAULT gen_random_uuid(),
    name        varchar(100)  NOT NULL,
    slug        varchar(120)  NOT NULL,
    "deletedBy" uuid,
    "isDeleted" boolean       NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz   NOT NULL DEFAULT now(),
    "updatedAt" timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE courses (
    id             uuid          NOT NULL DEFAULT gen_random_uuid(),
    instructor_id  uuid          NOT NULL,
    category_id    uuid,
    title          varchar(255)  NOT NULL,
    description    text,
    prerequisites  text,
    thumbnail_url  varchar(500),
    is_published   boolean       NOT NULL DEFAULT false,
    published_at   timestamptz,
    "deletedBy"    uuid,
    "isDeleted"    boolean       NOT NULL DEFAULT false,
    "deletedAt"    timestamptz,
    "createdAt"    timestamptz   NOT NULL DEFAULT now(),
    "updatedAt"    timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT courses_pkey PRIMARY KEY (id)
);

CREATE TABLE chapters (
    id          uuid          NOT NULL DEFAULT gen_random_uuid(),
    course_id   uuid          NOT NULL,
    title       varchar(255)  NOT NULL,
    position    integer       NOT NULL,
    "deletedBy" uuid,
    "isDeleted" boolean       NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz   NOT NULL DEFAULT now(),
    "updatedAt" timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT chapters_pkey PRIMARY KEY (id)
);

CREATE TABLE lessons (
    id          uuid          NOT NULL DEFAULT gen_random_uuid(),
    chapter_id  uuid          NOT NULL,
    title       varchar(255)  NOT NULL,
    position    integer       NOT NULL,
    "deletedBy" uuid,
    "isDeleted" boolean       NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz   NOT NULL DEFAULT now(),
    "updatedAt" timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT lessons_pkey PRIMARY KEY (id)
);

CREATE TABLE materials (
    id               uuid            NOT NULL DEFAULT gen_random_uuid(),
    lesson_id        uuid            NOT NULL,
    type             materials_type  NOT NULL,
    title            varchar(255),
    url              text,
    content          text,
    duration_seconds integer,
    position         integer         NOT NULL DEFAULT 0,
    "deletedBy"      uuid,
    "isDeleted"      boolean         NOT NULL DEFAULT false,
    "deletedAt"      timestamptz,
    "createdAt"      timestamptz     NOT NULL DEFAULT now(),
    "updatedAt"      timestamptz     NOT NULL DEFAULT now(),
    CONSTRAINT materials_pkey PRIMARY KEY (id)
);

CREATE TABLE enrollments (
    id               uuid                NOT NULL DEFAULT gen_random_uuid(),
    user_id          uuid                NOT NULL,
    course_id        uuid                NOT NULL,
    status           enrollments_status  NOT NULL DEFAULT 'enrolled',
    progress_percent numeric(5,2)        NOT NULL DEFAULT 0,
    last_lesson_id   uuid,
    enrolled_at      timestamptz         NOT NULL DEFAULT now(),
    left_at          timestamptz,
    completed_at     timestamptz,
    "deletedBy"      uuid,
    "isDeleted"      boolean             NOT NULL DEFAULT false,
    "deletedAt"      timestamptz,
    "createdAt"      timestamptz         NOT NULL DEFAULT now(),
    "updatedAt"      timestamptz         NOT NULL DEFAULT now(),
    CONSTRAINT enrollments_pkey PRIMARY KEY (id)
);

CREATE TABLE progress (
    id                    uuid         NOT NULL DEFAULT gen_random_uuid(),
    enrollment_id         uuid         NOT NULL,
    lesson_id             uuid         NOT NULL,
    is_completed          boolean      NOT NULL DEFAULT false,
    last_position_seconds integer,
    completed_at          timestamptz,
    "deletedBy"           uuid,
    "isDeleted"           boolean      NOT NULL DEFAULT false,
    "deletedAt"           timestamptz,
    "createdAt"           timestamptz  NOT NULL DEFAULT now(),
    "updatedAt"           timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT progress_pkey PRIMARY KEY (id)
);

CREATE TABLE assessments (
    id                 uuid              NOT NULL DEFAULT gen_random_uuid(),
    course_id          uuid              NOT NULL,
    lesson_id          uuid,
    type               assessments_type  NOT NULL,
    title              varchar(255)      NOT NULL,
    description        text,
    time_limit_minutes integer,
    due_at             timestamptz,
    max_attempts       integer           NOT NULL DEFAULT 1,
    pass_score         numeric(5,2),
    "deletedBy"        uuid,
    "isDeleted"        boolean           NOT NULL DEFAULT false,
    "deletedAt"        timestamptz,
    "createdAt"        timestamptz       NOT NULL DEFAULT now(),
    "updatedAt"        timestamptz       NOT NULL DEFAULT now(),
    CONSTRAINT assessments_pkey PRIMARY KEY (id)
);

CREATE TABLE questions (
    id            uuid         NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid         NOT NULL,
    content       text         NOT NULL,
    points        integer      NOT NULL DEFAULT 1,
    position      integer      NOT NULL DEFAULT 0,
    "deletedBy"   uuid,
    "isDeleted"   boolean      NOT NULL DEFAULT false,
    "deletedAt"   timestamptz,
    "createdAt"   timestamptz  NOT NULL DEFAULT now(),
    "updatedAt"   timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT questions_pkey PRIMARY KEY (id)
);

CREATE TABLE answers (
    id          uuid         NOT NULL DEFAULT gen_random_uuid(),
    question_id uuid         NOT NULL,
    content     text         NOT NULL,
    is_correct  boolean      NOT NULL DEFAULT false,
    position    integer      NOT NULL DEFAULT 0,
    "deletedBy" uuid,
    "isDeleted" boolean      NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz  NOT NULL DEFAULT now(),
    "updatedAt" timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT answers_pkey PRIMARY KEY (id)
);

CREATE TABLE submissions (
    id            uuid          NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid          NOT NULL,
    user_id       uuid          NOT NULL,
    attempt_no    integer       NOT NULL DEFAULT 1,
    file_url      text,
    answers_data  jsonb,
    score         numeric(5,2),
    feedback      text,
    graded_by     uuid,
    graded_at     timestamptz,
    submitted_at  timestamptz   NOT NULL DEFAULT now(),
    "deletedBy"   uuid,
    "isDeleted"   boolean       NOT NULL DEFAULT false,
    "deletedAt"   timestamptz,
    "createdAt"   timestamptz   NOT NULL DEFAULT now(),
    "updatedAt"   timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT submissions_pkey PRIMARY KEY (id)
);

CREATE TABLE comments (
    id          uuid         NOT NULL DEFAULT gen_random_uuid(),
    lesson_id   uuid         NOT NULL,
    user_id     uuid         NOT NULL,
    parent_id   uuid,
    content     text         NOT NULL,
    "deletedBy" uuid,
    "isDeleted" boolean      NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz  NOT NULL DEFAULT now(),
    "updatedAt" timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT comments_pkey PRIMARY KEY (id)
);

CREATE TABLE notifications (
    id          uuid                NOT NULL DEFAULT gen_random_uuid(),
    user_id     uuid                NOT NULL,
    type        notifications_type  NOT NULL,
    message     text                NOT NULL,
    link        varchar(500),
    is_read     boolean             NOT NULL DEFAULT false,
    "deletedBy" uuid,
    "isDeleted" boolean             NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz         NOT NULL DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE reports (
    id          uuid            NOT NULL DEFAULT gen_random_uuid(),
    reporter_id uuid            NOT NULL,
    comment_id  uuid,
    course_id   uuid,
    reason      text            NOT NULL,
    status      reports_status  NOT NULL DEFAULT 'pending',
    resolved_by uuid,
    resolved_at timestamptz,
    "deletedBy" uuid,
    "isDeleted" boolean         NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz     NOT NULL DEFAULT now(),
    "updatedAt" timestamptz     NOT NULL DEFAULT now(),
    CONSTRAINT reports_pkey PRIMARY KEY (id)
);

CREATE TABLE reviews (
    id          uuid         NOT NULL DEFAULT gen_random_uuid(),
    course_id   uuid         NOT NULL,
    user_id     uuid         NOT NULL,
    rating      integer      NOT NULL,
    comment     text,
    "deletedBy" uuid,
    "isDeleted" boolean      NOT NULL DEFAULT false,
    "deletedAt" timestamptz,
    "createdAt" timestamptz  NOT NULL DEFAULT now(),
    "updatedAt" timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT reviews_pkey PRIMARY KEY (id)
);

CREATE TABLE admin_logs (
    id          uuid          NOT NULL DEFAULT gen_random_uuid(),
    admin_id    uuid          NOT NULL,
    action      varchar(100)  NOT NULL,
    target_type varchar(50),
    target_id   uuid,
    detail      jsonb,
    "createdAt" timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT admin_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE sessions (
    id                  uuid         NOT NULL DEFAULT gen_random_uuid(),
    course_id           uuid         NOT NULL,
    host_id             uuid         NOT NULL,
    started_at          timestamptz  NOT NULL DEFAULT now(),
    ended_at            timestamptz,
    whiteboard_snapshot jsonb,
    code_snapshot       text,
    notes_snapshot      text,
    "deletedBy"         uuid,
    "isDeleted"         boolean      NOT NULL DEFAULT false,
    "deletedAt"         timestamptz,
    "createdAt"         timestamptz  NOT NULL DEFAULT now(),
    "updatedAt"         timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX roles_name_key                                ON roles (name);
CREATE UNIQUE INDEX users_email_key                               ON users (email);
CREATE UNIQUE INDEX categories_name_key                           ON categories (name);
CREATE UNIQUE INDEX categories_slug_key                           ON categories (slug);
CREATE UNIQUE INDEX enrollments_user_id_course_id_key             ON enrollments (user_id, course_id);
CREATE UNIQUE INDEX progress_enrollment_id_lesson_id_key          ON progress (enrollment_id, lesson_id);
CREATE UNIQUE INDEX submissions_assessment_id_user_id_attempt_no_key ON submissions (assessment_id, user_id, attempt_no);

CREATE INDEX users_role_id_idx               ON users (role_id);
CREATE INDEX courses_instructor_id_idx       ON courses (instructor_id);
CREATE INDEX courses_category_id_idx         ON courses (category_id);
CREATE INDEX materials_lesson_id_idx         ON materials (lesson_id);
CREATE INDEX enrollments_course_id_idx       ON enrollments (course_id);
CREATE INDEX progress_lesson_id_idx          ON progress (lesson_id);
CREATE INDEX assessments_course_id_idx       ON assessments (course_id);
CREATE INDEX assessments_lesson_id_idx       ON assessments (lesson_id);
CREATE INDEX questions_assessment_id_idx     ON questions (assessment_id);
CREATE INDEX answers_question_id_idx         ON answers (question_id);
CREATE INDEX submissions_user_id_idx         ON submissions (user_id);
CREATE INDEX comments_lesson_id_idx          ON comments (lesson_id);
CREATE INDEX comments_user_id_idx            ON comments (user_id);
CREATE INDEX comments_parent_id_idx          ON comments (parent_id);
CREATE INDEX notifications_user_id_is_read_idx ON notifications (user_id, is_read);
CREATE INDEX reports_status_idx              ON reports (status);
CREATE INDEX admin_logs_admin_id_idx         ON admin_logs (admin_id);
CREATE INDEX "admin_logs_createdAt_idx"      ON admin_logs ("createdAt");
CREATE INDEX sessions_course_id_idx          ON sessions (course_id);
CREATE INDEX sessions_host_id_idx            ON sessions (host_id);

ALTER TABLE users       ADD CONSTRAINT users_role_id_fkey            FOREIGN KEY (role_id)        REFERENCES roles(id)       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE courses     ADD CONSTRAINT courses_instructor_id_fkey    FOREIGN KEY (instructor_id)  REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE courses     ADD CONSTRAINT courses_category_id_fkey      FOREIGN KEY (category_id)    REFERENCES categories(id)  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE chapters    ADD CONSTRAINT chapters_course_id_fkey       FOREIGN KEY (course_id)      REFERENCES courses(id)     ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE lessons     ADD CONSTRAINT lessons_chapter_id_fkey       FOREIGN KEY (chapter_id)     REFERENCES chapters(id)    ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE materials   ADD CONSTRAINT materials_lesson_id_fkey      FOREIGN KEY (lesson_id)      REFERENCES lessons(id)     ON DELETE CASCADE  ON UPDATE CASCADE;

ALTER TABLE enrollments ADD CONSTRAINT enrollments_user_id_fkey      FOREIGN KEY (user_id)        REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_course_id_fkey    FOREIGN KEY (course_id)      REFERENCES courses(id)     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_last_lesson_id_fkey FOREIGN KEY (last_lesson_id) REFERENCES lessons(id)    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE progress    ADD CONSTRAINT progress_enrollment_id_fkey   FOREIGN KEY (enrollment_id)  REFERENCES enrollments(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE progress    ADD CONSTRAINT progress_lesson_id_fkey       FOREIGN KEY (lesson_id)      REFERENCES lessons(id)     ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE assessments ADD CONSTRAINT assessments_course_id_fkey    FOREIGN KEY (course_id)      REFERENCES courses(id)     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE assessments ADD CONSTRAINT assessments_lesson_id_fkey    FOREIGN KEY (lesson_id)      REFERENCES lessons(id)     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE questions   ADD CONSTRAINT questions_assessment_id_fkey  FOREIGN KEY (assessment_id)  REFERENCES assessments(id) ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE answers     ADD CONSTRAINT answers_question_id_fkey      FOREIGN KEY (question_id)    REFERENCES questions(id)   ON DELETE CASCADE  ON UPDATE CASCADE;

ALTER TABLE submissions ADD CONSTRAINT submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE submissions ADD CONSTRAINT submissions_user_id_fkey      FOREIGN KEY (user_id)        REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE submissions ADD CONSTRAINT submissions_graded_by_fkey    FOREIGN KEY (graded_by)      REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE comments    ADD CONSTRAINT comments_lesson_id_fkey       FOREIGN KEY (lesson_id)      REFERENCES lessons(id)     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE comments    ADD CONSTRAINT comments_user_id_fkey         FOREIGN KEY (user_id)        REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE comments    ADD CONSTRAINT comments_parent_id_fkey       FOREIGN KEY (parent_id)      REFERENCES comments(id)    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey  FOREIGN KEY (user_id)        REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE reports     ADD CONSTRAINT reports_reporter_id_fkey      FOREIGN KEY (reporter_id)    REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE reports     ADD CONSTRAINT reports_comment_id_fkey       FOREIGN KEY (comment_id)     REFERENCES comments(id)    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE reports     ADD CONSTRAINT reports_course_id_fkey        FOREIGN KEY (course_id)      REFERENCES courses(id)     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE reports     ADD CONSTRAINT reports_resolved_by_fkey      FOREIGN KEY (resolved_by)    REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE reviews     ADD CONSTRAINT reviews_course_id_fkey        FOREIGN KEY (course_id)      REFERENCES courses(id)     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE reviews     ADD CONSTRAINT reviews_user_id_fkey          FOREIGN KEY (user_id)        REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE admin_logs  ADD CONSTRAINT admin_logs_admin_id_fkey      FOREIGN KEY (admin_id)       REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE sessions    ADD CONSTRAINT sessions_course_id_fkey       FOREIGN KEY (course_id)      REFERENCES courses(id)     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE sessions    ADD CONSTRAINT sessions_host_id_fkey         FOREIGN KEY (host_id)        REFERENCES users(id)       ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS chapters_course_id_position_key;
CREATE UNIQUE INDEX chapters_course_id_position_key ON chapters (course_id, position)  WHERE "isDeleted" = false;

DROP INDEX IF EXISTS lessons_chapter_id_position_key;
CREATE UNIQUE INDEX lessons_chapter_id_position_key ON lessons (chapter_id, position)  WHERE "isDeleted" = false;

DROP INDEX IF EXISTS reviews_course_id_user_id_key;
CREATE UNIQUE INDEX reviews_course_id_user_id_key   ON reviews (course_id, user_id)    WHERE "isDeleted" = false;

ALTER TABLE roles       ADD CONSTRAINT chk_roles_name
    CHECK (name IN ('instructor', 'student', 'admin'));

ALTER TABLE reviews     ADD CONSTRAINT chk_reviews_rating
    CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE enrollments ADD CONSTRAINT chk_enrollments_progress_percent
    CHECK (progress_percent BETWEEN 0 AND 100);

ALTER TABLE submissions ADD CONSTRAINT chk_submissions_score
    CHECK (score IS NULL OR score >= 0);
ALTER TABLE submissions ADD CONSTRAINT chk_submissions_attempt_no
    CHECK (attempt_no >= 1);

ALTER TABLE submissions ADD CONSTRAINT chk_submissions_has_content
    CHECK (answers_data IS NOT NULL OR file_url IS NOT NULL);

ALTER TABLE assessments ADD CONSTRAINT chk_assessments_max_attempts
    CHECK (max_attempts >= 1);
ALTER TABLE assessments ADD CONSTRAINT chk_assessments_time_limit
    CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);
ALTER TABLE assessments ADD CONSTRAINT chk_assessments_pass_score
    CHECK (pass_score IS NULL OR pass_score >= 0);

ALTER TABLE questions   ADD CONSTRAINT chk_questions_points
    CHECK (points >= 0);

ALTER TABLE progress    ADD CONSTRAINT chk_progress_last_position
    CHECK (last_position_seconds IS NULL OR last_position_seconds >= 0);

ALTER TABLE materials   ADD CONSTRAINT chk_materials_duration
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
ALTER TABLE materials   ADD CONSTRAINT chk_materials_type_content
    CHECK ((type = 'video' AND url IS NOT NULL) OR (type = 'text' AND content IS NOT NULL));

ALTER TABLE reports     ADD CONSTRAINT chk_reports_target
    CHECK (comment_id IS NOT NULL OR course_id IS NOT NULL);
ALTER TABLE reports     ADD CONSTRAINT chk_reports_resolved_by
    CHECK (status = 'pending' OR resolved_by IS NOT NULL);

CREATE OR REPLACE FUNCTION prevent_hard_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Hard delete bi chan tren bang "%": chi duoc soft delete (UPDATE "isDeleted" = true)', TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles','users','categories','courses','chapters','lessons','materials',
        'enrollments','progress','assessments','questions','answers','submissions',
        'comments','notifications','reports','reviews','sessions'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_prevent_hard_delete BEFORE DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete()',
            t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION admin_logs_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'admin_logs la append-only: khong duoc % ban ghi', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admin_logs_append_only
    BEFORE UPDATE OR DELETE ON admin_logs
    FOR EACH ROW EXECUTE FUNCTION admin_logs_append_only();

CREATE OR REPLACE FUNCTION check_assessment_lesson_course() RETURNS trigger AS $$
BEGIN
    IF NEW.lesson_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM lessons l
        JOIN chapters c ON c.id = l.chapter_id
        WHERE l.id = NEW.lesson_id
          AND c.course_id = NEW.course_id
    ) THEN
        RAISE EXCEPTION 'lesson_id % khong thuoc course_id %', NEW.lesson_id, NEW.course_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assessments_lesson_course
    BEFORE INSERT OR UPDATE OF lesson_id, course_id ON assessments
    FOR EACH ROW EXECUTE FUNCTION check_assessment_lesson_course();

INSERT INTO roles (name) VALUES ('instructor'), ('student'), ('admin');

COMMIT;
