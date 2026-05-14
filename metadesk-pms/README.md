# Metadesk PMS

Internal Project Management System for Metadesk Global.

This build is currently running in demo mode so the full app can be explored without connecting MongoDB yet. Demo data is stored in server memory and resets when the dev server restarts. Database persistence, production file storage, email delivery, and real push notifications can be wired after the feature set is finalized.

## Current Stack

- Next.js 14 App Router
- NextAuth JWT sessions
- Tailwind CSS
- TanStack Query
- Demo in-memory store in `lib/demo-store.ts`
- Local browser/Windows notifications while the app session is open

## Quick Start

Make sure you are inside the nested app folder:

```bash
cd C:\Users\Hp\Downloads\metadesk-pms\metadesk-pms
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Manager | `manager@metadeskglobal.com` | `password123` |
| Manager | `sara@metadeskglobal.com` | `password123` |
| Employee | `ali@metadeskglobal.com` | `password123` |
| Employee | `maham@metadeskglobal.com` | `password123` |
| Employee | `hamza@metadeskglobal.com` | `password123` |

New accounts are created as employees. Managers can promote employees from Manager Settings.

## Roles

| Role | Access |
|---|---|
| Manager | Create and edit projects, assign project tasks and standalone tasks, manage team access, view the team directory, upload files, comment, message members. |
| Employee | View assigned projects and assigned tasks, update task status/subtasks/hours, upload files where allowed, comment, reply, mention, and message members. |

## Main Features

- Dashboard with project and task overview
- Project creation and project detail pages
- Project team add/remove controls
- Project tasks kept separate from standalone employee tasks
- Task table with status, priority, assignees, target completion time, and unread comment indicators
- Task detail with comments, replies, mentions, files, subtasks, and manager editing controls
- Team directory visible only to managers, including workload counts and direct chat buttons
- Direct messages with unread badges and reply previews
- Notifications for messages, comments, replies, files, task assignments, and project updates
- Display picture upload and password change
- Global search for projects, tasks, and members
- Company logo served from `public/brand` or `public/images`

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/users/register` | Create employee account |
| PATCH | `/api/users/me` | Update display picture or password |
| GET/PATCH | `/api/users` | Manager user access controls |
| GET/POST | `/api/projects` | List/create projects |
| GET/PATCH/DELETE | `/api/projects/[id]` | Project detail, update, delete |
| GET/POST | `/api/tasks` | List/create tasks |
| GET/PATCH | `/api/tasks/[id]` | Task detail and updates |
| GET/POST | `/api/comments` | Authorized project/task comments |
| GET/POST | `/api/files` | Authorized project/task files |
| GET | `/api/files/[id]` | Authorized file download |
| GET/POST | `/api/messages` | Direct messages |
| GET/PATCH | `/api/notifications` | Notification list and read state |
| GET | `/api/mentions` | Active members for mentions |
| GET | `/api/brand-logo` | Company logo asset |

## Before Production

- Replace demo store with MongoDB persistence
- Store files in Cloudinary/S3 instead of memory
- Keep bcrypt password hashing with real user records
- Add real web push/email notifications
- Add automated tests and configure ESLint
- Remove unused production packages if they are not needed
