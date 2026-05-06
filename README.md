# Hokie_Darvis

A course registration webapp for Virginia Tech students. Shows real grade distributions,
RateMyProfessor ratings, professor profiles, and a visual schedule builder — all in one place.

## What it does

- Browse and search VT courses by subject, GPA range, gen ed, credits, and days
- See grade distributions (A–F) per course and per professor, sourced from VT UDC
- View RateMyProfessor ratings, difficulty, and student tags on every section listing
- Build and visualize a weekly schedule before committing during registration
- (Planned) Pull live seat availability from VT Timetable of Classes

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 (CDN), Babel standalone, plain CSS-in-JS |
| Backend | Node.js + Express (not yet built) |
| Data | Scraped CSVs from VT UDC → SQLite or Postgres |
| Auth | VT CAS (planned) |
| Hosting | TBD |

## Folder layout

```
Hokie_Darvis/
├── README.md
├── .gitignore
├── frontend/
│   ├── index.html                  entry point — open in browser to run
│   └── src/
│       ├── mock-data.js            static mock data (replaced by API calls post-backend)
│       ├── App.jsx                 root component, routing, global state
│       └── components/
│           ├── nav-auth.jsx        Nav bar + AuthModal
│           ├── landing.jsx         Landing page with orbit deck + feature sections
│           ├── courses.jsx         Course search, cards, detail modal, grade grid
│           ├── schedule.jsx        Schedule builder + weekly grid view
│           └── dashboard-prof.jsx  Student dashboard + professor profile page
└── backend/
    ├── README.md
    ├── scrapers/
    │   ├── udc_grades_scraper.js   (complete) VT UDC grade distribution DOM scraper
    │   ├── rmp_scraper.js          (TODO) RateMyProfessors
    │   ├── timetable_scraper.js    (TODO) VT Timetable of Classes
    │   └── checklist_scraper.js    (TODO) VT Course Checklist
    └── data/
        └── raw/                    drop scraped CSVs here
```

## Running the frontend

The frontend is a static HTML file that loads React from CDN and transpiles JSX in the
browser via Babel. No build step required.

```bash
# Option 1 — any local server (avoids CORS issues with Babel file imports)
cd frontend
npx serve .
# Then open http://localhost:3000

# Option 2 — Python one-liner
cd frontend
python3 -m http.server 8080
# Then open http://localhost:8080

# Option 3 — VS Code Live Server extension
# Right-click frontend/index.html → "Open with Live Server"
```

Opening `index.html` directly as a `file://` URL will fail because Babel's `src` loading
requires HTTP. Use any of the options above.

## Data pipeline (current status)

1. Run `backend/scrapers/udc_grades_scraper.js` in the browser console on the VT UDC page
   to generate per-subject CSVs.
2. Drop CSVs into `backend/data/raw/`.
3. (TODO) Clean and normalize into a canonical dataset.
4. (TODO) Load into SQLite/Postgres and expose via REST API.
5. (TODO) Replace `src/mock-data.js` with real API calls.

## Planning docs

See `Cowork/outputs/ventures/Darvis/` for product spec, architecture notes, and scraper docs.
