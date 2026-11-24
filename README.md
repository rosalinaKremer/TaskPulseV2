# TaskPulse V2

Django REST API (`backend/`) + React/Vite app (`frontend/TaskPulseV2/`), with
MongoDB as the database through the official
[Django MongoDB Backend](https://www.mongodb.com/docs/languages/python/django-mongodb/).

## Run locally

You need a MongoDB to connect to. Either run one locally
(`docker run -d -p 27017:27017 --name mongo mongo:8`) or use a free MongoDB
Atlas cluster and set `MONGODB_URI` to its connection string.

```bash
# Backend: http://localhost:8000
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DJANGO_DEBUG=True                             # PowerShell: $env:DJANGO_DEBUG="True"
python manage.py migrate
python manage.py runserver

# Frontend: http://localhost:5173
cd frontend/TaskPulseV2
pnpm install
pnpm dev
```

With `DJANGO_DEBUG=True` the backend defaults to `mongodb://localhost:27017/`
(database `taskpulse`), a dev secret key, and allows `http://localhost:5173`. The frontend defaults to `http://localhost:8000`.

Run backend tests with `DJANGO_DEBUG=True python manage.py test`.

## Auth API

All under `/api/auth/`, JSON in and out. Auth uses JWT Bearer tokens.

| Method | Path         | Body                              | Returns                       |
|--------|--------------|-----------------------------------|-------------------------------|
| POST   | `register/`  | `full_name`, `email`, `password`  | `{user, access, refresh}` 201 |
| POST   | `login/`     | `email`, `password`               | `{user, access, refresh}`     |
| POST   | `refresh/`   | `refresh`                         | `{access, refresh}` (old refresh revoked) |
| POST   | `logout/`    | `refresh` (+ Bearer header)       | 205, refresh token revoked    |
| GET    | `me/`        | (Bearer header)                   | `{id, email, full_name, ...}` |

`GET /api/health/` returns `{"status": "ok"}` for Render's health check.

## Deploy

### 1. Database on MongoDB Atlas

1. At cloud.mongodb.com create a free **M0** cluster.
2. **Database Access** → add a user with a password (role: read and write to any database).
3. **Network Access** → add `0.0.0.0/0`. Render's free plan has no fixed outbound IP.
4. **Connect** → **Drivers** → copy the `mongodb+srv://...` string and put the user's password in it.

### 2. Backend on Render

Easiest: **Render Dashboard → New → Blueprint**, pick this repo. `render.yaml`
creates the `taskpulse-api` web service and generates `DJANGO_SECRET_KEY`.
Render will ask for `MONGODB_URI` (the Atlas string) and
`CORS_ALLOWED_ORIGINS` (your Vercel URL, which you can fill in after step 3).

Manual setup instead (New → Web Service):

- Root directory: `backend`
- Runtime: Python 3
- Build command: `./build.sh` (installs, runs `collectstatic` and `migrate`)
- Start command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
- Health check path: `/api/health/`

Environment variables:

| Name | Value |
|------|-------|
| `DJANGO_SECRET_KEY` | long random string |
| `DJANGO_DEBUG` | `False` |
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_NAME` | `taskpulse` (database name, created on first write) |
| `CORS_ALLOWED_ORIGINS` | `https://<your-app>.vercel.app` (no trailing slash; comma separate several) |
| `CORS_ALLOWED_ORIGIN_REGEXES` | optional, e.g. `^https://taskpulse-.*\.vercel\.app$` for preview deploys |
| `DJANGO_ALLOWED_HOSTS` | optional; Render's `*.onrender.com` host is added automatically. Add a custom domain here. |

Create an admin user from the service's **Shell** tab: `python manage.py createsuperuser`.

### 3. Frontend on Vercel

**Vercel → Add New → Project**, import this repo, then:

- Root Directory: `frontend/TaskPulseV2`
- Framework preset: Vite (auto-detected; build `pnpm build`, output `dist`)
- Environment variable: `VITE_API_URL` = `https://<your-service>.onrender.com` (no trailing slash)

`vercel.json` rewrites every path to `index.html`, so `/login` and `/register`
work on refresh. `VITE_API_URL` is baked in at build time: redeploy after changing it.

### 4. Connect them

Put the final Vercel URL in Render's `CORS_ALLOWED_ORIGINS` and save (Render redeploys).
On Render's free plan the API sleeps when idle, so the first login after a
while can take up to a minute.
