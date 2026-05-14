// scripts/import_timetable.js
//
// Reads vt_timetable_fall2026_complete.csv (or any vt_timetable_*.csv) from
// backend/data/raw/ and upserts the rows into the Supabase `sections` table.
//
// Run with: npm run import-timetable
//
// Requirements:
//   - .env with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//   - CSV file(s) in backend/data/raw/
//   - Run: npm install  (first time only)

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const RAW_DIR = path.join(__dirname, '../data/raw');

// ── CSV parsing ─────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines  = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const header = parseCSVRow(lines[0]);
  const rows   = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    const obj    = {};
    header.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

function parseCSVRow(line) {
  const cols   = [];
  let cur      = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

// ── Value helpers ────────────────────────────────────────────────────────

function toInt(s) {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function toFloat(s) {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// "11:00AM" / "2:30PM" → "11:00" / "14:30"  (24-hour, no seconds)
// Also handles raw "0905" and "09:05" from older scraper versions.
function normalizeTime(s) {
  if (!s || s.trim() === '') return null;
  s = s.trim();

  // 12-hour format with AM/PM, e.g. "11:00AM" or "2:30PM"
  const ampm = s.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2];
    const period = ampm[3].toUpperCase();
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // Already "HH:MM"
  if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, '0');

  // Raw "0905" or "905"
  if (/^\d{3,4}$/.test(s)) {
    const padded = s.padStart(4, '0');
    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
  }

  return s;
}

// "T R" or "M W F" → ["T","R"] or ["M","W","F"]
// "MWF" (no spaces) → ["M","W","F"]
// "ARR" or "" → []
function parseDays(s) {
  if (!s || s.trim() === '') return [];
  const upper = s.trim().toUpperCase();
  if (upper === 'ARR' || upper === 'TBA') return [];

  // Space-separated (Banner's actual format): "T R", "M W F"
  if (s.includes(' ')) {
    return s.trim().split(/\s+/).filter(Boolean);
  }

  // Compact format: "MWF", "TR"
  const result = [];
  for (let i = 0; i < s.length; i++) {
    result.push(s[i]);
  }
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(RAW_DIR).filter(f =>
    f.startsWith('vt_timetable_') && f.endsWith('.csv') && !f.includes('_checkpoint_')
  );

  if (files.length === 0) {
    console.log(`No timetable CSV files found in ${RAW_DIR}.`);
    console.log('Expected filenames matching: vt_timetable_*.csv');
    console.log('Run the Banner timetable scraper first, then move the CSV to backend/data/raw/.');
    process.exit(0);
  }

  console.log(`Found ${files.length} timetable CSV file(s):\n  ${files.join('\n  ')}\n`);

  let totalInserted = 0;
  let totalSkipped  = 0;
  let totalAdditional = 0;

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const text     = fs.readFileSync(filePath, 'utf8');
    const rawRows  = parseCSV(text);
    const records  = [];

    for (const r of rawRows) {
      // Skip "Additional Times" sub-rows — same CRN, would cause upsert conflicts
      // and don't carry new section data (no instructor/seats on those rows).
      // Scraper stores this as "1" or "true" depending on version.
      const isAdditional = r['Is_Additional_Time'] === '1' || r['Is_Additional_Time'] === 'true';
      if (isAdditional) {
        totalAdditional++;
        continue;
      }

      const crn         = (r['CRN']           || '').trim();
      const subject     = (r['Subject']        || '').trim().toUpperCase();
      const courseNum   = (r['Course_Number']  || '').trim();
      const term        = (r['Term']           || '').trim();

      if (!crn || !subject || !courseNum || !term) continue;

      const capacity      = toInt(r['Capacity'])        ?? 0;
      const seatsAvail    = toInt(r['Seats_Available']) ?? 0;
      // enrolled = students currently registered = capacity - remaining seats.
      // seats = total capacity (matches SeatsBadge semantics: it shows capacity - enrolled).
      const enrolled      = Math.max(0, capacity - seatsAvail);

      records.push({
        crn,
        subject,
        course_number:  courseNum,
        term,
        instructor:     (r['Instructor'] || '').trim() || null,
        days:           parseDays(r['Days']),
        start_time:     normalizeTime(r['Begin_Time']),
        end_time:       normalizeTime(r['End_Time']),
        location:       (r['Location'] || '').trim() || null,
        seats:          capacity,   // total capacity
        enrolled,                   // number currently registered
        credits:        toFloat(r['Credits']),
        last_updated:   new Date().toISOString(),
      });
    }

    console.log(`  ${file}: ${rawRows.length} raw rows → ${records.length} sections (${totalAdditional} additional-time rows skipped)`);

    // Upsert in chunks of 500.
    const CHUNK = 500;
    let fileInserted = 0;
    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from('sections')
        .upsert(chunk, {
          onConflict:       'crn,term',
          ignoreDuplicates: false,   // update seats/times if re-run
        })
        .select('id');

      if (error) {
        console.error(`  Error upserting chunk from ${file}:`, error.message);
      } else {
        fileInserted += data ? data.length : 0;
      }
    }

    totalInserted += fileInserted;
    totalSkipped  += records.length - fileInserted;
    console.log(`  → ${fileInserted} sections upserted`);
  }

  console.log(`\nTimetable import complete.`);
  console.log(`  Sections upserted:        ${totalInserted}`);
  console.log(`  Already current (no-op):  ${totalSkipped}`);
  console.log(`  Additional-time rows:     ${totalAdditional}`);

  // Quick sanity check — how many sections are in the DB for Fall 2026?
  const { count } = await supabase
    .from('sections')
    .select('*', { count: 'exact', head: true })
    .eq('term', '202609');

  console.log(`\nSections in DB for Fall 2026 (term 202609): ${count}`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
