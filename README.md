# ⚡ Speeding Coding — MERN Contest Platform

A full-stack college speed coding contest platform built with **MongoDB + Express + React + Node.js**.

---

## 🗂 Project Structure

```
speeding-coding/
├── server/                  # Express + MongoDB backend
│   ├── index.js             # Entry point
│   ├── models/
│   │   ├── Student.js
│   │   ├── Problem.js       # MCQ, DebugProblem, CodingProblem
│   │   ├── Submission.js
│   │   └── ExamState.js
│   ├── routes/
│   │   ├── auth.js          # Login, admin login, reinstate
│   │   ├── students.js      # Student profile, MCQ submit, violations
│   │   ├── problems.js      # CRUD for all problem types
│   │   ├── exec.js          # Run code + submit (Piston API)
│   │   ├── submissions.js   # Submission history
│   │   ├── admin.js         # Kick, override, logs
│   │   ├── leaderboard.js   # Live leaderboard + CSV export
│   │   └── timer.js         # Round timers, pause, force-end
│   └── middleware/
│       └── auth.js          # JWT student + admin middleware
│
├── client/                  # React + Vite + Tailwind frontend
│   └── src/
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── ExamPage.jsx
│       │   ├── AdminPage.jsx
│       │   └── LeaderboardPage.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── MCQRound.jsx
│       │   ├── CodingRound.jsx   # Round 2 + 3 editor
│       │   ├── LeaderboardTab.jsx
│       │   ├── RulesModal.jsx
│       │   ├── TerminatedOverlay.jsx
│       │   └── PausedOverlay.jsx
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ExamContext.jsx
│       ├── hooks/
│       │   └── useSecurity.js
│       └── utils/
│           └── api.js
│
├── vercel.json              # Vercel deployment config
├── render.yaml              # Render deployment config
└── package.json             # Root scripts
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier) or local MongoDB

### 2. Clone & install
```bash
git clone <your-repo-url>
cd speeding-coding
npm run install:all
```

### 3. Configure environment
```bash
cd server
cp .env.example .env
```
Edit `server/.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/speeding-coding
JWT_SECRET=some_very_long_random_string_here
ADMIN_PASSWORD=your_admin_password
INVIGILATOR_CODE=INV2024
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 4. Run in development
```bash
# From root — starts both server (5000) and client (5173)
npm run dev
```

- **Student exam:** http://localhost:5173
- **Admin panel:** http://localhost:5173/admin
- **Leaderboard:** http://localhost:5173/leaderboard
- **API:**         http://localhost:5000/api

---

## 🌐 Deployment

### Option A — Render (Recommended)

Render is **best for this app** because it fully supports Express servers.

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repo — Render reads `render.yaml` automatically
4. Set environment variables in the Render dashboard:
   - `MONGODB_URI` → your MongoDB Atlas URI
   - `ADMIN_PASSWORD` → your chosen admin password
   - `INVIGILATOR_CODE` → re-entry code for kicked students
   - `CLIENT_URL` → your frontend Render URL (after first deploy)
5. Deploy!

**Free tier note:** Render free tier spins down after 15 min of inactivity. Use their $7/mo Starter plan for an always-on server during the exam.

---

### Option B — Vercel

Vercel works best if you deploy the backend separately (e.g. on Railway or Render) and only the frontend on Vercel.

**Frontend on Vercel:**
```bash
cd client
vercel --prod
```
Set `VITE_API_URL` in Vercel env vars to your backend URL.

**Backend on Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
cd server
railway up
```

---

### Option C — VPS / DigitalOcean

```bash
# On server
git clone <repo>
cd speeding-coding/server
npm install
cp .env.example .env  # fill in values
npm start

# Use PM2 for production
npm i -g pm2
pm2 start index.js --name speeding-coding-api
pm2 save

# Build and serve frontend with nginx
cd ../client
npm install && npm run build
# Point nginx to client/dist
```

---

## 🔑 Default Credentials

| Role | Credential | Default |
|------|-----------|---------|
| Admin panel | Password | Set in `ADMIN_PASSWORD` env var |
| Invigilator re-entry | Code | Set in `INVIGILATOR_CODE` env var |

---

## 📡 API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/login` | Student login/register | — |
| POST | `/api/auth/admin` | Admin login | — |
| POST | `/api/auth/reinstate` | Student re-entry | — |
| GET | `/api/students/me` | Get own profile | Student |
| POST | `/api/students/me/mcq-submit` | Submit MCQ | Student |
| POST | `/api/students/me/violation` | Report violation | Student |
| GET | `/api/problems/mcq` | Get MCQs (no answers) | Student |
| GET | `/api/problems/debug` | Get debug problems | Student |
| GET | `/api/problems/coding` | Get coding problems | Student |
| POST | `/api/exec/run` | Run code (Piston) | Student |
| POST | `/api/exec/submit` | Submit + judge | Student |
| GET | `/api/leaderboard` | Live leaderboard | Student |
| GET | `/api/leaderboard/export` | CSV export | Admin |
| GET | `/api/timer` | Get timer state | Student |
| PATCH | `/api/timer/set` | Set round duration | Admin |
| PATCH | `/api/timer/pause` | Pause/resume | Admin |
| POST | `/api/timer/force-end` | Force end round | Admin |
| GET | `/api/admin/students` | All students | Admin |
| PATCH | `/api/admin/students/:id/kick` | Kick student | Admin |
| PATCH | `/api/admin/students/:id/reinstate` | Reinstate | Admin |
| PATCH | `/api/admin/students/:id/override` | Score override | Admin |
| GET | `/api/admin/violations` | All violations | Admin |

---

## ⚡ Before the Exam Checklist

- [ ] MongoDB Atlas cluster created and URI in `.env`
- [ ] App deployed and accessible from all lab machines
- [ ] Admin panel opened on invigilator machine
- [ ] Questions added via Admin → Question Bank
- [ ] Round timers configured
- [ ] Invigilator code noted: check `INVIGILATOR_CODE` env var
- [ ] Test a student login end-to-end
- [ ] Start Round 1 via Admin → Timer Control → Start

---

## 🛡 Security Architecture

- **JWT tokens** for student sessions (12h expiry)
- **Separate admin tokens** (8h expiry, role-checked)
- **SHA-256 hashing** of expected outputs — plain text never stored
- **Server-side scoring** — MCQ answers verified on backend
- **Rate limiting** — 500 req/15min per IP
- **Helmet.js** — security headers
- **CORS** — restricted to known origins
