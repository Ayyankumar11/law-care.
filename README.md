# ⚖️ LawCare — Vercel Full Stack Deploy

Frontend + Backend — **everything on Vercel only**. No Render, no other service needed.

## How it works

```
lawcare-vercel/
├── public/
│   └── index.html        ← Your frontend (served by Vercel CDN)
├── api/
│   ├── _db.js            ← Shared SQLite + JWT helpers
│   ├── auth/
│   │   ├── login.js      ← POST /api/auth/login
│   │   └── register.js   ← POST /api/auth/register
│   ├── lawyers/
│   │   ├── index.js      ← GET /api/lawyers
│   │   └── [id].js       ← GET /api/lawyers/:id
│   ├── appointments/
│   │   ├── index.js      ← POST /api/appointments
│   │   └── user/[userId].js ← GET /api/appointments/user/:id
│   ├── chat/
│   │   ├── conversations.js  ← GET/POST /api/chat/conversations
│   │   ├── messages.js       ← GET/POST /api/chat/messages
│   │   └── messages/[conversationId].js
│   └── ai/
│       └── ask.js        ← POST /api/ai/ask
├── vercel.json
└── package.json
```

## Deploy Steps (10 minutes)

### Step 1 — GitHub
1. Go to https://github.com/new
2. Create repo named `lawcare-app`
3. Upload ALL files from this folder (drag & drop)

### Step 2 — Vercel
1. Go to https://vercel.com/new
2. Import your `lawcare-app` GitHub repo
3. Settings:
   - Framework: **Other**
   - Build Command: **(leave empty)**
   - Output Directory: **(leave empty)**
4. Add Environment Variable:
   - `JWT_SECRET` = `any_strong_random_password`
5. Click **Deploy**

Done! Your app is live at `https://lawcare-app.vercel.app`

## Demo Accounts
- client@demo.com / password123
- riya@demo.com / password123 (lawyer)

## Note on Socket.IO
Vercel serverless functions don't support WebSockets.
Real-time chat still works via REST polling (messages send/receive normally).
For production real-time, upgrade to Vercel Pro or add Render for backend.
