# Project Context — Media Tracker App

This document summarizes decisions made during initial planning. Read this alongside `media-tracker-plan.md` to get full context.

---

## What We're Building

A self-hosted, single-user web app for tracking books, movies, TV shows, and video games. Think Goodreads but covering all media types. Users can rate and review items, track status (want to, in progress, completed, dropped, on hold), and log start/finish dates.

The app will be web-first (React) with mobile potentially added later. Because the API will be self-contained, adding a mobile client later should only require building a new UI layer.

---

## Key Decisions & Reasoning

**Self-hosted, single-user** — No multi-user auth, no social features, no "following" other users. A simple single-password session cookie is sufficient for auth.

**TanStack Start for the frontend** — Chosen for file-based routing, server functions, SSR, and staying within the TanStack ecosystem (TanStack Query is already the plan for client-side state).

**No separate backend service** — TanStack Start's server functions talk directly to the database. This simplifies the architecture for a self-hosted single-user app. A separate API service can be extracted later if needed.

**PostgreSQL** — Relational data with aggregate ratings, filtering, and search. Managed via Docker.

**Drizzle ORM** — TypeScript-native, lightweight, full SQL control without magic. Alternative considered was Prisma (more batteries-included).

**Docker Compose** — Single `docker-compose.yml` runs both the app and Postgres together. This is the deployment artifact — self-hosting is just `docker compose up`.

**External APIs for media data** — No manual data entry. Pull from:
- Open Library (books, free, no key) or Google Books (requires key)
- TMDB (movies & TV, free key)
- IGDB (games, free, requires Twitch developer account)

Cache API results in the local `media_items` table after first fetch so you never fetch the same item twice.

---

## Where We Left Off

Planning is complete. The next step is **Step 1: Project Setup** from `media-tracker-plan.md`:
- Scaffold TanStack Start project
- Set up Docker Compose with app + Postgres services
- Initialize Drizzle and connect to Postgres
- Confirm a working "hello world" page with a live DB connection

The developer is new to TanStack Start, Drizzle, and PostgreSQL. Recommend starting with the TanStack Start quickstart docs, then the Drizzle + Postgres getting started guide, before writing any app-specific code.

---

## File Reference

- `media-tracker-plan.md` — Full step-by-step implementation plan with schema, server functions, UI pages, and build order
