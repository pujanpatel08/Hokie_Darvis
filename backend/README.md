# Hokie_Darvis — Backend

Not yet scaffolded. This folder will hold the Node.js/Express server once backend work begins.

## Planned structure

```
backend/
├── server.js            entry point (Express)
├── package.json
├── routes/
│   ├── courses.js       REST endpoints for course/section data
│   ├── professors.js    REST endpoints for professor data
│   └── auth.js          VT CAS / session handling
├── scrapers/
│   ├── udc_grades_scraper.js   (complete) DOM scraper for VT UDC grade distribution
│   ├── rmp_scraper.js          (TODO) RateMyProfessors
│   ├── timetable_scraper.js    (TODO) VT Timetable of Classes
│   └── checklist_scraper.js    (TODO) VT Course Checklist
└── data/
    └── raw/             Drop scraped CSV/JSON files here
```

## Scrapers

| Script | Source | Status |
|--------|--------|--------|
| `udc_grades_scraper.js` | https://udc.vt.edu/irdata/data/courses/grades | Complete |
| `rmp_scraper.js` | RateMyProfessors | TODO |
| `timetable_scraper.js` | VT Timetable of Classes | TODO |
| `checklist_scraper.js` | VT Course Checklist | TODO |

## Running the grades scraper

The UDC scraper runs in the browser console — not via Node. Open the UDC grades page,
paste the contents of `scrapers/udc_grades_scraper.js` into the console, and hit enter.
Drop the resulting CSVs into `data/raw/`.

Full instructions are in the project README at the root.
