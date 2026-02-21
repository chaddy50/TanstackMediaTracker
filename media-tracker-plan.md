# Media Tracker App — Implementation Plan

A self-hosted, single-user web app for tracking books, movies, TV shows, and video games. Similar to Goodreads but covering all media types.

---

## Tech Stack

- **Frontend:** TanStack Start (file-based routing, server functions, SSR)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM (TypeScript-native, lightweight)
- **Deployment:** Docker Compose (app + Postgres together)
- **Auth:** Simple single-password session cookie (no OAuth needed for self-hosted)
- **State Management:** TanStack Query (already in ecosystem)

---

## Tech Stack Decision Notes

Since this is self-hosted and single-user, TanStack Start's server functions can talk directly to the database — no need for a separate backend service. You can always extract to a separate API later if needed.

---

## Database Schema

### `media_items`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `type` | enum | book, movie, tv_show, video_game |
| `title` | text | |
| `description` | text | nullable |
| `cover_image_url` | text | nullable |
| `release_date` | date | nullable |
| `external_id` | text | ID from source API |
| `external_source` | text | e.g. "tmdb", "igdb", "openlibrary" |
| `metadata` | JSONB | type-specific fields (author, director, platform, genre, etc.) |
| `created_at` | timestamp | |

### `user_entries`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `media_item_id` | FK → media_items | |
| `status` | enum | want_to, in_progress, completed, dropped, on_hold |
| `rating` | decimal | nullable |
| `review_text` | text | nullable |
| `started_at` | date | nullable |
| `completed_at` | date | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `lists` *(optional, add later)*
Custom named lists with a join table to media items.

---

## External API Integrations

Each source should be wrapped in a service with two functions: `search(query)` and `getDetails(externalId)`. Cache results in `media_items` after first fetch.

| Media Type | API | Notes |
|---|---|---|
| Books | Open Library | Free, no key required |
| Books (alt) | Google Books | Requires API key |
| Movies & TV | TMDB | Free API key, excellent data |
| Video Games | IGDB | Free, requires Twitch developer account |

Store API keys in `.env`, document in `.env.example`, exclude from version control.

---

## Core Server Functions

- `searchMedia(query, type)` — searches external API; shows already-in-library items with their status
- `addToLibrary(externalId, source, type)` — fetches full details, upserts into `media_items`, creates `user_entry` with status "want_to"
- `updateEntry(entryId, fields)` — updates status, rating, review, dates
- `getLibrary(filters)` — returns entries with joined media data, filterable by type and status
- `getMediaDetail(mediaItemId)` — returns media item plus your entry if it exists

---

## UI Pages & Features

### Library (main view)
- Filterable grid/list of your entries
- Filter bar: All / Books / Movies / TV / Games and All / In Progress / Completed / Want To / etc.
- Filters stored as URL search params (bookmarkable)
- Cards show: cover image, title, your rating, status badge
- Fast navigation via TanStack Query caching

### Search & Add
- Search bar in header with media type selector
- Results show cover, title, year, and "Add to Library" button (or status if already added)
- Selecting a result opens detail page or modal

### Detail & Entry Management
- Full media metadata display
- Personal entry section with:
  - Status selector (Want To / In Progress / Completed / Dropped / On Hold)
  - Start date and finish date pickers (auto-populate on status change)
  - Star or numeric rating input
  - Review/notes text area
  - Save button or debounced auto-save

### Dashboard
- **In Progress** — everything currently being read/watched/played, sorted by start date
- **Recently Completed** — last ~10 finished items
- **Want To** backlog counts per category
- **Stats** — total completed per type, optional completions-over-time chart

---

## Step-by-Step Build Order

### Step 1: Project Setup
- Scaffold TanStack Start project
- Set up folder structure: routes, components, server functions, db
- Initialize Drizzle, connect to Postgres
- Get "hello world" page with confirmed DB connection
- Write `docker-compose.yml` with `web` + `postgres` services

### Step 2: Database Schema
- Write Drizzle schema file
- Generate and run first migration
- Seed with a few test records

### Step 3: External API Integration
- Build service wrappers for Open Library / Google Books, TMDB, IGDB
- Implement caching to `media_items` on first fetch

### Step 4: Core Server Functions
- Implement all five server functions listed above
- Test with a REST client or simple test scripts

### Step 5: Library View
- Build filterable grid/list UI
- Use URL search params for filters
- Wire up to `getLibrary` server function
- Get this working even with manually seeded test data first

### Step 6: Search & Add Flow
- Search bar + media type selector in header
- Results list with add/status buttons
- Connect to `searchMedia` and `addToLibrary`

### Step 7: Detail & Entry Management
- Detail page with full metadata
- Entry management form (status, dates, rating, review)
- Auto-populate dates on status changes

### Step 8: Dashboard
- In Progress section
- Recently Completed section
- Backlog counts
- Optional stats/charts

### Step 9: Deployment Polish
- Finalize `docker-compose.yml` with env vars, volume mounts, health checks, auto-restart
- Add `pg_dump` backup script or cron job
- Write README: setup instructions, how to get API keys, how to run migrations

---

## Key Principle

**Build the library view early** — even with fake data — so you have a real UI to work toward while building the data layer. Keeps the work feeling concrete and lets you validate the design before investing in all the plumbing.
