# School Database Design

This database stores the students at a school, the courses it offers, and which students are enrolled on which courses, together with their grades. The SQL is in `school.sql`.

## Tables

### students
- Holds one row per student.
- **Columns:** `id` (primary key), `name` (required) and `email` (required and unique, so two students cannot share an address).

### courses
- Holds one row per course the school offers.
- **Columns:** `id` (primary key), `title` (required) and `credits` (required).

### enrolments
- Holds one row for each time a student enrolls on a course. It records the *fact* of the enrolment and the grade that came with it.
- **Columns:** `id` (primary key), `student_id` (foreign key to `students`), `course_id` (foreign key to `courses`) and `grade` (0 to 100, empty until the student is graded).
- A `UNIQUE (student_id, course_id)` rule stops the same student being enrolled on the same course twice.

## Relationships

- **students to enrolments: one-to-many.** One student can have many enrolments, but each enrolment belongs to one student.
- **courses to enrolments: one-to-many.** One course can have many enrolments, but each enrolment belongs to one course.
- **students to courses: many-to-many.** A student can take many courses, and a course has many students. This relationship is made of the two one-to-many links above, joined through `enrolments`.

### Why a join table is needed
A single column cannot hold many values. Putting a `course_id` in `students` would allow only one course per student, and putting a `student_id` in `courses` would allow only one student per course. Storing a list of ids in one cell would break the rules of a relational database and make searching and counting difficult. The `enrolments` table solves this by storing one row per student and course pair. It is also the right place for the grade, because a grade belongs to the pairing and not to the student or the course alone.

## Index

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
```

**Reason:** the unique rule on `(student_id, course_id)` already creates an index that makes searching by student fast. But queries that start from a course, such as "all students on one course" and "students per course", have no matching index, so the database would scan every enrolment. With a large school, the index on `course_id` keeps those queries fast.

## SQL or NoSQL?

I would choose SQL for this system. The data is structured and every record has the same shape, and the relationships between students, courses and enrolments are central to how it is used. A relational database enforces these rules for me: foreign keys prevent an enrolment for a student who does not exist, `UNIQUE` prevents duplicate emails and duplicate enrolments, and `NOT NULL` prevents missing data. SQL also handles questions across tables easily, such as counting students per course or finding students with no enrolments, using `JOIN` and `GROUP BY`. A NoSQL document store would suit data that changes shape often or needs to scale across many servers, but a school's records are stable and need to be consistent and accurate, so the strict structure of SQL is an advantage here.
