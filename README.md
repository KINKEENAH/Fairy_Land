# Fairy Land Muslimah World

A web app for publishing novels chapter by chapter. Readers can browse the library, read chapters, react with emojis and leave comments. The author manages everything from a private admin area: stories, chapters, covers, imports from Word or PDF, and comment moderation.

The first story published here is **What the Heart Prays For**.

---

## Features

### For readers
- **Library** of all published stories, with covers and blurbs
- **Story page** with a table of contents, "Start from the beginning" and "Continue reading" (reading progress is remembered in the browser)
- **Chapter reader** with comfortable typography, previous/next navigation and scene breaks
- **Reactions** on every chapter: ❤️ 🤲 😮 😢 😂 🥹
- **Comments** on every chapter, shown after the author approves them
- No accounts needed, and mobile-friendly throughout

### For the author (admin)
- Password-protected admin area at `/admin`
- Create, edit, publish/unpublish and delete stories
- Upload covers from a phone gallery or computer (stored on Cloudinary, cropped to 3:4 automatically)
- Write and edit chapters with a live preview, word count and unsaved-changes warning
- **Import a whole novel** from a Word (.docx) or PDF file, check it in a preview, then save all chapters at once
- Publish chapters all at once or one at a time
- Moderate comments: approve, hide, delete, or approve many at once

---

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS 4, React Router 7, react-markdown |
| Backend | Node.js, Express |
| Database | PostgreSQL on Neon |
| Images | Cloudinary |
| Hosting | Netlify (frontend), Render (backend) |

---

## Project structure

```
.
├── muslimah_world/            # Frontend (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── admin/             # Admin pages, auth and admin hooks
│   │   ├── components/        # Shared reader components
│   │   ├── hooks/             # useApi
│   │   ├── lib/               # API client, auth, reading progress, helpers
│   │   ├── pages/             # Library, Story, Chapter, Not found
│   │   ├── index.css
│   │   └── main.jsx           # Routes
│   └── netlify.toml
│
└── server/                    # Backend (Express)
    ├── db/
    │   └── schema.sql         # Database tables
    ├── scripts/
    │   └── hashPassword.js    # Creates the admin password hash
    └── src/
        ├── middleware/        # requireAdmin
        ├── routes/            # Public routes
        │   └── admin/         # Protected admin routes
        ├── utils/             # Chapter helpers, file reading, chapter splitting
        ├── db.js
        └── index.js
```

---

## Running it locally

### Requirements
- Node.js 20 or newer
- A PostgreSQL database (a free Neon project works)
- A Cloudinary account (free plan), for cover uploads

### 1. Set up the database
Run `server/db/schema.sql` in your database (for Neon, paste it into the SQL Editor).

### 2. Set up the backend
```bash
cd server
npm install
```

Create a password hash for the admin login:
```bash
node scripts/hashPassword.js "your-password"
```

Create a random JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create `server/.env`:
```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
PORT=5000
ADMIN_PASSWORD_HASH='$2a$12$your-hash-here'
JWT_SECRET=your-long-random-secret
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Keep the single quotes around the hash in `.env`. **Never commit `.env`.**

Start the backend:
```bash
npm run dev
```
Check it at `http://localhost:5000/api/health`.

### 3. Set up the frontend
In a second terminal:
```bash
cd muslimah_world
npm install
npm run dev
```
Open `http://localhost:5173`. During development, Vite forwards `/api` requests to the backend on port 5000.

---

## Environment variables

### Backend (`server/.env` locally, Render settings in production)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port to listen on (Render sets this automatically) |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password. **On Render, paste it without quotes** |
| `JWT_SECRET` | Secret used to sign admin login tokens |
| `CLOUDINARY_URL` | Cloudinary credentials for cover uploads |
| `CORS_ORIGIN` | Production only: the frontend's address, e.g. `https://your-site.netlify.app`. Several can be listed, separated by commas |

### Frontend (Netlify settings)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | The backend's address, e.g. `https://your-api.onrender.com` (no trailing slash). Built into the site, so redeploy after changing it. Never put secrets in `VITE_` variables |

---

## Deployment

### Backend on Render
1. New **Web Service** connected to this repository
2. **Root Directory:** `server`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Add the backend environment variables above

The free plan sleeps after about 15 minutes without visitors; the first request afterwards can take 30 to 60 seconds.

### Frontend on Netlify
1. Import this repository
2. **Base directory:** `muslimah_world` (build settings come from `netlify.toml`)
3. Add `VITE_API_URL`
4. After the first deploy, set `CORS_ORIGIN` on Render to the Netlify address

`netlify.toml` includes a rule that serves `index.html` for every path, so links like `/stories/some-story` work when opened directly.

### Updating the live site
```bash
git add .
git commit -m "Describe the change"
git push
```
Render and Netlify redeploy automatically. Stories, chapters, comments and reactions live in the database, so redeploying never affects them.

---

## Adding content

### Importing a novel
In the admin, open a story and choose **Import from file**. Word (.docx) is recommended because it keeps italics; PDF works but may need paragraph checks.

For a full novel, each chapter must start with a heading line such as:
```
Chapter One: The Elevator
chapter 1: the elevator
Chapter 12
```
Numbers can be digits or words (up to ninety-nine), in any capitalisation. Text before the first heading, such as a title page, is left out.

Re-importing is safe: existing chapters are updated in place and keep their comments and reactions. If "Publish these chapters now" is unticked, new chapters are saved as drafts and existing ones keep their current setting.

### Chapter formatting (Markdown)
| Write | Result |
|---|---|
| A blank line between paragraphs | New paragraph |
| `*text*` | *Italics*, e.g. inner thoughts |
| `**text**` | **Bold** |
| `***` on its own line | Scene break (shown as `* * *`) |

---

## API overview

### Public
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/stories` | Published stories |
| GET | `/api/stories/:slug` | One story and its published chapters |
| GET | `/api/stories/:slug/chapters/:number` | Chapter text with previous/next |
| GET, POST | `/api/chapters/:chapterId/comments` | Approved comments; submit a comment |
| GET, POST | `/api/chapters/:chapterId/reactions` | Reaction counts; add a reaction |
| DELETE | `/api/chapters/:chapterId/reactions/:type` | Remove a reaction |

### Admin (requires a login token)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Log in and receive a token |
| GET, POST, PATCH, DELETE | `/api/admin/stories` | Manage stories |
| POST, DELETE | `/api/admin/stories/:id/cover` | Upload or remove a cover |
| GET, POST, PATCH, DELETE | `/api/admin/chapters` | Manage chapters |
| POST | `/api/admin/chapters/bulk` | Save many chapters in one transaction |
| POST | `/api/admin/import` | Read a Word or PDF file and return chapters for preview |
| GET, PATCH, DELETE | `/api/admin/comments` | Moderate comments |
| POST | `/api/admin/comments/approve` | Approve several comments at once |

---

## Security notes

- The admin password is stored only as a bcrypt hash; login attempts are rate-limited
- Admin routes require a signed JWT, checked on every request
- All database queries are parameterised to prevent SQL injection
- Comments are displayed as plain text and must be approved before appearing
- CORS in production only allows the site's own address
- Secrets live in environment variables and are never committed

---

## Changing the admin password

```bash
cd server
node scripts/hashPassword.js "new-password"
```
Replace `ADMIN_PASSWORD_HASH` in `server/.env` and in Render's environment settings (without quotes on Render). To also log out every existing session, generate a new `JWT_SECRET` as well.

---

## Credits



The stories published on this site are the author's own work. All rights reserved.
