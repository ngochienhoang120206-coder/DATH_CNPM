# CO3103 Programming Integration Project - Online Learning Platform with Real-Time Collaborative Classroom

## 1. Project Overview
A web-based Learning Management System (LMS) designed for IT education that integrates structured course management with a real-time collaborative classroom (shared Fabric.js whiteboard and Yjs CRDT-based Monaco code editor) for live pair programming and instructor guidance.

## Production Deployment URLs
- **Frontend Application (Vercel):** https://dath-cnpm-frontend.vercel.app
- **Backend API Server (Render):** https://dath-cnpm-ru1s.onrender.com
- **API Health Check:** https://dath-cnpm-ru1s.onrender.com/health

## Demo Accounts (Seeded on Production DB)
All demo accounts use the default password: `Demo@12345`

| Role | Email | Full Name |
| :--- | :--- | :--- |
| **Admin** | `admin@demo.edu.vn` | System Administrator |
| **Instructor** | `instructor@demo.edu.vn` | Dr. Phat Tran |
| **Student** | `learner@demo.edu.vn` | Hoang Ngoc Hien |

### Group 14 Members
| Full Name | Student ID | Role & Responsibilities |
| :--- | :--- | :--- |
| Hoang Ngoc Hien | 2411028 | Project Leader, Architecture Design, Real-Time WebSocket Backend |
| Nguyen Le Duy | 2352186 | Backend Developer (Database Schema, Core LMS REST APIs) |
| Vu Minh Phu | 2352925 | Frontend Developer (UI/UX Prototype, Core LMS Interfaces) |
| Nguyen Hoang Minh | 2412086 | Frontend Developer (UI/UX Prototype, Collaborative Whiteboard & Code Editor) |

## 2. Technology Stack
- **Frontend:** ReactJS, Monaco Editor, Fabric.js
- **Backend:** Node.js, Express.js (RESTful API & RBAC via HttpOnly Cookies)
- **Real-Time Communication:** Socket.io, Yjs (CRDTs for conflict-free concurrent code editing)
- **Database & Cache:** PostgreSQL (Persistent relational data), Redis (Room state snapshots & Pub/Sub)
- **Deployment & DevOps:** Docker, Docker Compose, Vercel, Railway/Render, Supabase, Redis Cloud

### 2.1 Key Technical & Security Decisions
- **Learning Material & File Storage:** Text lessons are stored as Markdown directly in PostgreSQL (`materials` table), while video lectures and external documents are embedded via YouTube/Google Drive iframes. Student assignment file uploads (`assessments.type = 'file_upload'`) are stored in **Supabase Storage**.
- **Cross-Domain RBAC & WebSocket Authentication:** Upon login, the Backend issues a JWT inside an `HttpOnly`, `Secure`, `SameSite=Lax` cookie rather than `localStorage` to prevent XSS token theft. In production, **Vercel Rewrites** (`frontend/vercel.json`) proxy `/api/*` requests to the Backend under the same origin. Real-time `Socket.io` connections are authenticated using a short-lived one-time `socket-ticket` stored in Redis (30s TTL).
- **Data Integrity & XSS Protection:** All database tables enforce a strict **Soft Delete** policy (`isDeleted = true`) protected by PostgreSQL `BEFORE DELETE` triggers, while administrative actions are recorded in an append-only `admin_logs` table. All user-generated Markdown and comments are sanitized on the client side using `DOMPurify`.

## 3. Repository Structure
```text
├── .github/          # Pull Request checklist template
├── backend/          # Node.js/Express REST API & Socket.io server
├── frontend/         # ReactJS single-page application
├── database/         # PostgreSQL schema and sample seed data (init.sql)
└── docker-compose.yml
```

## 4. Installation & Reproduction Guide

### Option 1: Run with Docker Compose (Recommended)

1. **Clone the repository:**
```bash
git clone https://github.com/ngochienhoang120206-coder/DATH_CNPM.git
cd DATH_CNPM
```
2. **Create the root environment configuration:**
```bash
cp .env.example .env
```
3. **Build and start all containers (PostgreSQL, Redis, Backend, Frontend):**
```bash
docker compose up --build -d
```
4. **Seed sample data (Admin, Instructor, Learner accounts & courses):**
```bash
docker exec -it lms_backend npm run seed
```

5. **Access the application:**
- Open `http://localhost:3000` in your browser.
- Backend API is exposed at `http://localhost:5000`.


### Option 2: Run Manually on Local Machine

_ Ensure Node.js (>= 20.x), PostgreSQL (>= 15), and Redis (>= 7) are installed and running.
_ Execute database/init.sql on your local PostgreSQL instance to create tables and seed sample data.

#### 1. Start the Backend server:
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

#### 2. Start the Frontend client:
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```
#### 3. Run Automated Tests (Unit/Integration & E2E):
```bash
# Run Backend API & RBAC tests
cd backend && npm test

# Run End-to-End (E2E) tests for US1-US4
cd frontend && npx playwright test
```

## 5. Team Git Workflow

### 1. Switch to "main" and pull the latest code:
```bash
git checkout main
git pull origin main
```
### 2. Create a new feature branch named after the Issue:
```bash
git checkout -b feature/issue-<number>-<short-description>
```
### 3. Commit changes (multiple commits allowed per branch):
- You can make as many commits as needed while working on the branch.
- Do NOT put Closes #<issue-number> in commit messages; write normal descriptive messages instead (and never stage .env files):
```bash
git status
git add <file-paths>
git commit -m "feat: <short description of change>"
```
### 4. Push the feature branch to GitHub:
```bash
git push origin feature/issue-<number>-<short-description>
```
### 5. Create a Pull Request (PR):
- Click **Compare & pull request** on GitHub to open one PR for the entire feature branch.
- Complete the PR checklist and write Closes #<issue-number> once in the PR description body to automatically move the Issue to Done on the Kanban board when merged.

## 6. Third-Party Services & AI Disclosure

### Third-Party Services: 
Cloud deployment relies on Vercel, Railway/Render, Supabase (PostgreSQL & Object Storage for assignment submissions), and Redis Cloud. Video lectures and external documents are embedded via YouTube and Google Drive iframes.
### AI Disclosure: 
AI tools were used during development to assist with code scaffolding, debugging, and documentation formatting. All business logic, security controls, and tests were reviewed and verified by Group 14 members.
