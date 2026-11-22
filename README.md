# Procify AI — Intelligent Workflow Automation Platform

**Tagline:** *From Documents to Decisions. From Tasks to Automation.*

Procify AI transforms repetitive circulars, PDFs, images, emails, and natural-language briefs into structured, human-approved workflows and trackable tasks powered by Google Gemini AI and Firebase.

---

## Key Features

- **AI Document Analyzer**: Drag-and-drop PDF, PNG, JPG, JPEG, TXT, or pasted text. Server-side Gemini Vision & Text extraction outputs structured JSON with dates, events, tasks, risks, source quotes, and uncertain clauses—without fabricating missing facts.
- **Duplicate Detection**: SHA-256 file hashing, normalized text hashing, and token-overlap similarity checks warn users before saving duplicate or near-identical notices.
- **AI Workflow Builder & Visual Graph**: Generate workflows from analyzed documents, natural-language goals, or manual node creation. Reorder nodes, connect prerequisite dependencies, and regenerate with refinement feedback.
- **Human Approval Gate**: AI-generated workflows always start in `DRAFT` and move through `PENDING REVIEW` → `APPROVED` → `IN PROGRESS` → `COMPLETED` (or `REJECTED`) with full audit history.
- **Task Manager**: Switch seamlessly between List View, Kanban Board, and Schedule View with dependency blocking, priority filtering, search, and deadline sorting.
- **Calendar & Reminders**: Monthly, Weekly, and Daily views combining task deadlines and custom milestones with one-click `.ics` iCalendar export and an automated in-app Smart Reminder Engine.
- **Reports & Analytics**: Real-time Recharts visualizations (productivity trend, workflow completion, task distribution) calculated directly from stored records, with date filtering and CSV export.
- **Context-Aware Workspace Assistant**: Ask questions grounded in your actual workflows and tasks without executing destructive actions automatically.
- **Interactive Demo Workspace**: Pre-loaded with three realistic sample notices (Exam Circular, Technical Symposium, Capstone Notice) and a 9-step guided walkthrough.

---

## Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Recharts
- **Backend**: Node.js + Express (`server.ts`) with `multer` upload validation & server-side `@google/genai` (`gemini-4-hydrogen`)
- **Database & Auth**: Firebase Authentication (Google Sign-In & Email/Password) + Cloud Firestore with hardened security rules (`firestore.rules`)

---

## Environment Variables

Create a `.env` file (see `.env.example`):

```env
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"
```

---

## Local Development & Deployment

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure Firebase**:
   - Ensure `firebase-applet-config.json` is present in the project root.
   - Deploy `firestore.rules` to your Firestore database.
   - In Firebase Console → Authentication → Sign-in method, enable **Google** (and **Email/Password** if using email accounts).
3. **Run development server** (Express + Vite on port 3000):
   ```bash
   npm run dev
   ```
4. **Type-check & build for production**:
   ```bash
   npm run lint
   npm run build
   ```
5. **Run production server**:
   ```bash
   NODE_ENV=production npm start
   ```
