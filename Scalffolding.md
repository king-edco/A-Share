# A-Share — Repo Scaffolding & Data Model (v1)

> Specification document. Scope for this phase: **repo setup + backend + data model only**. Do not build frontend screens (minimal scaffolding only), advanced business logic (full FSRS algorithm, notifications, AI grading), or branding — those are handled in separate phases.

## 1. Product context (brief)

A-Share is an exam-revision PWA for Cameroonian exams (GCE O-Level/A-Level for the anglophone system, Probatoire/Baccalauréat for the francophone system, general streams only for now). Two sides: an admin space (content creation) and a student space (revision via an FSRS-6 spaced-repetition algorithm).

## 2. Tech stack

- **Repo**: monorepo, `/frontend` and `/backend` at the root
- **Backend**: FastAPI (Python), modular architecture — `routers/`, `models/`, `schemas/`, `services/`
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui — minimal scaffolding only at this phase (project init, Tailwind/shadcn config, basic folder structure). Screens will be built separately.
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy (or SQLModel if it pairs better with Pydantic/FastAPI)
- **Migrations**: Alembic
- **PWA**: basic manifest + service worker on the frontend (no advanced offline logic yet)

## 3. What needs to be set up (scaffolding)

- Monorepo folder structure
- Environment config (`.env.example`, secrets handling per dev/staging/prod environment)
- DB connection + first Alembic migration (just the empty structure, ready to receive the models below)
- Auth foundations:
  - Structure for the admin invite-token flow (token generation, expiration) — **not the full email flow implementation**, just base models and endpoints
  - Student auth structure (phone/email + password) — base models only
- Basic CI (lint + tests) if straightforward to set up
- Basic README describing the project and how to run the repo locally

**Not to be built at this phase**: the full invite-email flow, the FSRS algorithm, AI grading of free responses, the notification system, frontend screens beyond scaffolding.

## 4. Full data model

### 4.1 Exam hierarchy

```
EducationSystem
- id
- name              # "anglophone" | "francophone"

Exam
- id
- education_system_id (FK → EducationSystem)
- name               # "GCE Ordinary Level", "GCE Advanced Level", "Probatoire", "Baccalauréat"

Track                # stream (O-Level: Science/Arts) or series (A-Level: S1-S8/A1-A5; Bac/Proba: A/C/D/E/TI)
- id
- exam_id (FK → Exam)
- name
- subject_pool_mode   # "open" (anglophone: pool + free pick) | "closed" (francophone: fixed pool, all assigned)
- min_subjects        # int
- max_subjects        # int
```

### 4.2 Subjects and pedagogical content

> Important: a `Subject` belongs to exactly one `Track` (1:N relation, never shared across streams). Two subjects with the same name in two different `Track`s are two fully independent records — their chapters/lessons/questions never cross over.

```
Subject
- id
- track_id (FK → Track)
- name
- is_compulsory       # bool — compulsory in this Track, or optional (open pool)
- coefficient          # nullable, decimal — filled only for the francophone (closed pool) side

Chapter
- id
- subject_id (FK → Subject)
- name
- order                # int, reorderable via up/down arrows (no drag-and-drop)

Lesson
- id
- chapter_id (FK → Chapter)
- title
- order                # int, same reordering logic as Chapter
- content              # block-based structured content (TipTap-style editor, Frappe LMS-style presentation)

Concept                # fine-grained pedagogical unit, used by the FSRS algorithm
- id
- subject_id (FK → Subject)
- name
- exam_frequency_score  # populated manually by admin/contributor from past-paper extraction
- last_seen_year         # nullable, int
- notes                  # free text, other extracted observations
```

### 4.3 Questions

```
Question
- id
- chapter_id (FK → Chapter)
- lesson_id (FK → Lesson, nullable)   # a question can be attached to the chapter alone, or also to a specific lesson
- type                # "qcm" | "free"
- source              # "admin_created" | "past_paper"
- year                # nullable, int — filled if source = past_paper
- options              # JSON, for type = qcm (list of choices)
- correct_answer       # for type = qcm
- answer_field         # nullable — short comparable answer (e.g. math/calculation exercises)
- solution_content     # full solution written by the admin (text + images)
- difficulty_initial   # nullable — optional admin estimate, later overridden by real data
- created_by (FK → AdminUser)
- created_at

QuestionConcept        # many-to-many join table
- question_id (FK → Question)
- concept_id (FK → Concept)
```

**Implementation notes**:
- Questions are not limited to a fixed placement (end of chapter) — they can appear in the middle of a `Lesson`'s content, at the admin's discretion when structuring content.
- The `raw_answer` field on student answers (see `StudentQuestionLog` below) is used for auditing and content improvement — always keep it.

### 4.4 Admin accounts

```
AdminUser
- id
- email
- password_hash
- full_name
- role                 # "super_admin" | "admin" | "contributor"
- invited_by (FK → AdminUser, nullable)
- invite_token          # nullable, single-use, with expiration
- invite_status         # "pending" | "accepted"
- created_at

ContributorSubject      # many-to-many join — a Contributor is scoped to specific Subjects
- admin_user_id (FK → AdminUser)
- subject_id (FK → Subject)
```

**Permission rules to enforce in the endpoints**:
- `super_admin`: full access, only role that can manage accounts (create/edit a role, delete an account)
- `admin`: near-identical access to `super_admin`, can invite new accounts, but **cannot manage existing accounts** (no deletion/role editing) and cannot delete a `super_admin`
- `contributor`: access restricted to their assigned `Subject`s via `ContributorSubject` (creating/managing Chapter, Lesson, Question, Concept only within their subjects)

### 4.5 Student accounts

```
StudentUser
- id
- full_name
- school
- city
- language_pref        # "fr" | "en"
- education_system_id (FK → EducationSystem)
- exam_id (FK → Exam)
- track_id (FK → Track)
- phone                 # primary auth identifier
- email                 # optional
- password_hash
- created_at

StudentSubject          # many-to-many join
- student_id (FK → StudentUser)
- subject_id (FK → Subject)
```

**Signup logic to support** (doesn't need to be fully implemented at this phase, just supported by the model): upon `Track` selection, `Subject`s with `is_compulsory = true` are auto-assigned; if `subject_pool_mode = open`, the student picks optional subjects up to `max_subjects`; if `subject_pool_mode = closed`, all `Subject`s in the `Track` are auto-assigned with no choice.

### 4.6 Revision state (FSRS) and logs

```
StudentConceptState     # the FSRS "card" = the Concept, not the Question
- student_id (FK → StudentUser)
- concept_id (FK → Concept)
- stability
- difficulty
- retrievability
- due_date
- reps
- lapses
- last_review_at

StudentQuestionLog       # detailed log of each question attempt
- id
- student_id (FK → StudentUser)
- question_id (FK → Question)
- concept_id (FK → Concept)       # denormalized for fast queries
- raw_answer                       # raw answer entered by the student — always keep this
- is_correct
- ai_grading_note                  # nullable, filled only when graded by an AI model (free conceptual answers)
- response_time_seconds
- rating                           # Again | Hard | Good | Easy — derived from the result, sent to FSRS
- created_at
```

> At this phase, only create the tables/models above. The FSRS calculation itself (updating `stability`/`difficulty`/`retrievability` on each answer) will be implemented in a later, dedicated phase.

## 5. Out of scope for this phase

- Frontend screens beyond minimal scaffolding
- Branding, UX, design system
- Full FSRS algorithm (priority calculation, question selection within a concept's pool)
- AI grading of free conceptual answers
- Notification system
- Past-exam-paper PDF handling (not yet decided)
- Math formula input for students (dedicated component to be defined, out of scope for scaffolding)
