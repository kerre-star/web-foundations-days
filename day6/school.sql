-- School database: students, courses and enrolments
-- Written for SQLite. Run the whole script, then run each query on its own.

PRAGMA foreign_keys = ON;

-- Start clean so the script can be re-run (children first, parents last)
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------

CREATE TABLE students (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  title   TEXT NOT NULL,
  credits INTEGER NOT NULL
);

-- Join table: one row = one student enrolled on one course
CREATE TABLE enrolments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  grade      INTEGER CHECK (grade BETWEEN 0 AND 100),  -- NULL until graded
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id)  REFERENCES courses(id),
  UNIQUE (student_id, course_id)  -- same student cannot join the same course twice
);

-- ------------------------------------------------------------
-- 2. Sample data
-- ------------------------------------------------------------

INSERT INTO students (name, email) VALUES
  ('Amina Wanjiru', 'amina@example.com'),
  ('Brian Otieno',  'brian@example.com'),
  ('Grace Mwangi',  'grace@example.com'),
  ('David Kamau',   'david@example.com');

INSERT INTO courses (title, credits) VALUES
  ('Web Foundations',     3),
  ('JavaScript Basics',   3),
  ('Databases with SQL',  4);

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 85),
  (1, 2, 78),
  (1, 3, NULL),
  (2, 1, 72),
  (2, 3, 90),
  (3, 2, 88);

-- ------------------------------------------------------------
-- 3. Queries
-- ------------------------------------------------------------

-- Query 1: all courses for one student (by name)
SELECT courses.title, courses.credits, enrolments.grade
FROM students
JOIN enrolments ON students.id = enrolments.student_id
JOIN courses    ON courses.id  = enrolments.course_id
WHERE students.name = 'Amina Wanjiru';

-- Query 2: all students on one course
SELECT students.name, students.email, enrolments.grade
FROM courses
JOIN enrolments ON courses.id  = enrolments.course_id
JOIN students   ON students.id = enrolments.student_id
WHERE courses.title = 'Web Foundations';

-- Query 3: the number of students per course (courses with none show 0)
SELECT courses.title, COUNT(enrolments.id) AS student_count
FROM courses
LEFT JOIN enrolments ON courses.id = enrolments.course_id
GROUP BY courses.id, courses.title;

-- Query 4: students who have no enrolments
SELECT students.id, students.name, students.email
FROM students
LEFT JOIN enrolments ON students.id = enrolments.student_id
WHERE enrolments.id IS NULL;

-- Query 5: update one enrolment's grade (Brian's grade in Web Foundations)
UPDATE enrolments
SET grade = 92
WHERE student_id = (SELECT id FROM students WHERE name = 'Brian Otieno')
  AND course_id  = (SELECT id FROM courses  WHERE title = 'Web Foundations');

-- Check the update worked
SELECT students.name, courses.title, enrolments.grade
FROM enrolments
JOIN students ON students.id = enrolments.student_id
JOIN courses  ON courses.id  = enrolments.course_id
WHERE students.name = 'Brian Otieno';
