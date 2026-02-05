
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.


# Project Specification

## Overview
Personal blog application for publishing articles with owner-only write access and public read access.

## Architecture
- **Application Type**: Single Page Application (SPA)
- **Backend**: TypeScript with ElysiaJS
- **Frontend**: TypeScript
- **Runtime**: Bun (build, test, execution)

## Design & UI
- **Typography**: Monospace font (Consolas or similar terminal-style font)
- **Theme**: Dark mode only - grayscale palette with beige accents
- **Style**: Minimalist console-aesthetic with simple button designs
- **Performance**: Optimized for fast load times and rendering
- **Responsive**: Mobile-first design approach - prioritize mobile layout, enhance for desktop

## Security
- **All changes must be reviewed for security vulnerabilities** (XSS, injection, CSRF, etc.)
- Sanitize all user input before rendering as HTML
- Never use `dangerouslySetInnerHTML` with unsanitized content
- Validate and sanitize markdown content on the server before storing
- Use Content Security Policy headers where applicable

## Authentication & Authorization
- **Owner Access**: Full CRUD operations on articles
- **Public Access**: Read-only mode with emoji reactions
- **Auth Implementation**: TBD - determine owner identification method (session, token, etc.)

## Data Layer
- **Database**: TBD - evaluate if persistent storage is required or if file-based content is sufficient

## Deployment & Infrastructure
- **Deployment**: Streamlined deployment process (evaluate Docker if complexity justifies it)
- **CI/CD**: Automated testing and deployment pipeline
- **Testing**: Unit tests for both backend and frontend components

## Features

### 1. Home Page
- Display recent articles in reverse chronological order
- Owner-only: Floating "+" button for creating new posts

### 2. About Page
- Styled profile card with personal information

### 3. Social Links
- Display social media links (GitHub, Telegram, etc.) in header and footer

## Technical Decisions Needed
- [ ] Owner authentication mechanism
- [ ] Database requirement (persistent DB vs flat files)
- [ ] Docker containerization necessity
