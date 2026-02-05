# Console Memories

A minimal personal blog with a terminal/console aesthetic. Dark mode, monospace typography, beige accents.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Backend**: [ElysiaJS](https://elysiajs.com) (TypeScript)
- **Frontend**: React 19 (SPA, bundled by Bun)
- **Database**: SQLite via [Drizzle ORM](https://orm.drizzle.team)
- **Markdown**: [marked](https://marked.js.org) + [DOMPurify](https://github.com/cure53/DOMPurify) (server-side sanitization)

## Prerequisites

- [Bun](https://bun.sh) >= 1.0

## Quick Start

```sh
# Clone and install
git clone <repo-url> && cd console-memories
bun install

# Configure environment
cp .env.example .env.development

# Set your auth token in .env.development
# AUTH_TOKEN=your-secret-token

# Run development server (with HMR)
bun run dev
```

Visit `http://localhost:3000`. Log in at `/login` with your `AUTH_TOKEN`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `HOST` | `localhost` | Server host (`0.0.0.0` for production) |
| `NODE_ENV` | `development` | `development`, `production`, or `test` |
| `DATABASE_PATH` | `./data/console-memories.db` | SQLite database path |
| `UPLOAD_DIR` | `./uploads` | Media upload directory |
| `AUTH_TOKEN` | _(empty)_ | Admin token for write access (required) |
| `CORS_ENABLED` | `false` | Enable CORS |
| `CORS_ORIGIN` | _(empty)_ | Allowed CORS origin |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `PROFILE_NAME` | `Console Memories` | Blog owner name (About page) |
| `PROFILE_BIO` | _(default)_ | Blog owner bio |
| `PROFILE_AVATAR` | _(empty)_ | Avatar image URL |
| `SOCIAL_GITHUB` | _(empty)_ | GitHub profile URL |
| `SOCIAL_TELEGRAM` | _(empty)_ | Telegram profile URL |
| `SOCIAL_TWITTER` | _(empty)_ | Twitter/X profile URL |
| `SOCIAL_EMAIL` | _(empty)_ | Email address |
| `MAX_TITLE_LENGTH` | `200` | Max article title length |
| `MAX_CONTENT_LENGTH` | `100000` | Max article content length |

## Commands

| Command | Description |
|---|---|
| `bun run dev` | Start dev server with HMR |
| `bun run start` | Start production server |
| `bun test` | Run tests |
| `bun run typecheck` | TypeScript type checking |
| `bun run db:generate` | Generate Drizzle migration |
| `bun run db:migrate` | Run migrations |
| `bun run db:push` | Push schema to database |
| `bun run db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
  client/               # Frontend (React SPA)
    app.tsx              # Main app, client-side routing
    components/          # Header, Footer, ArticleCard
    pages/               # Home, About, Article, NewArticle, EditArticle, Login
    hooks/               # useAuth, usePasteUpload
    styles/              # CSS (mobile-first, dark theme)
  server/               # Backend (ElysiaJS)
    index.ts             # Server entry, Bun.serve(), SPA routing
    routes/              # articles, auth, media, pages
    middleware/           # auth (token extraction, requireAuth)
    db/                  # Drizzle schema, connection, repositories
  shared/               # Shared TypeScript types
  config.ts             # Centralized env config
drizzle/                # SQL migrations
deploy/                 # systemd services, Cloudflare Tunnel config
```

## Authentication

Admin access is controlled by `AUTH_TOKEN`. Set it in your `.env` file.

- **Login**: Visit `/login` and enter your token. A secure HttpOnly cookie (`cm_auth`) is set for 30 days.
- **API**: Send `Authorization: Bearer <token>` header, or use the cookie.
- **Protected endpoints**: `POST/PUT/DELETE` on articles and media. Reactions and reads are public.

If `AUTH_TOKEN` is empty, all write endpoints return 401.

## Features

- **Articles**: Create, edit, delete articles written in Markdown. Server-side HTML sanitization prevents XSS.
- **Reactions**: Emoji reactions (fire, heart, thinking, clap) on articles. Idempotent per visitor via `cm_visitor` cookie.
- **Media**: Upload images/videos. Paste images directly into the editor textarea.
- **Featured**: Pin articles to the top of the home page.
- **Responsive**: Mobile-first design with tablet/desktop enhancements.

## Deployment

1. Set up your `.env.production` with absolute paths and `AUTH_TOKEN`:
   ```sh
   NODE_ENV=production
   HOST=0.0.0.0
   AUTH_TOKEN=your-production-token
   DATABASE_PATH=/home/pi/blog-data/sqlite.db
   UPLOAD_DIR=/home/pi/blog-data/uploads
   ```

2. Install dependencies and run migrations:
   ```sh
   bun install --production
   bun run db:migrate
   ```

3. Start:
   ```sh
   bun run start
   ```

See `deploy/` for systemd service files and Cloudflare Tunnel configuration.
