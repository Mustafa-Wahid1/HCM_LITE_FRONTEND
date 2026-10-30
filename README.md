# HCM Lite - Frontend (Next.js)

App Router + TypeScript + Tailwind v4. Talks to the Express API over REST/JWT.

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start
```

Deploy on Vercel / Firebase Hosting / Netlify: set `NEXT_PUBLIC_API_URL` to the Render API URL, then add the site URL to the backend's `CORS_ORIGIN`.
