// scripts/import_grades.js
//
// Reads every CSV in backend/data/raw/ that matches vt_udc_grades_*.csv,
// parses the rows, upserts them into the Supabase `grades` table, then
// aggregates each unique (subject, course_number) into the `courses` table.
//
// Run with: npm run import-grades
//
// Requirements:
//   - Copy .env.example to .env and fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//   - Drop your UDC CSV files (vt_udc_grades_*.csv) into backend/data/raw/
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

// Service role client — bypasses RLS, safe for server-side scripts only.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const RAW_DIR = path.join(__dirname, '../data/raw');

// ── CSV parsing ────────────────────────────────────────────────────────

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

// Handles quoted fields containing commas.
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

// The UDC CSV uses a Unicode minus in "A− (%)" — normalize to plain hyphen.
function normalizeHeader(h) {
  return h.replace(/−/g, '-').trim();
}

function toFloat(s) {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function toInt(s) {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function courseId(subject, number) {
  return `${subject.toLowerCase()}-${number.replace(/\s+/g, '')}`;
}

// ── Column mapping: UDC header → Supabase column ──────────────────────
const COLUMN_MAP = {
  'Academic Year':    'academic_year',
  'Term':             'term',
  'Subject':          'subject',
  'Course No.':       'course_number',
  'Course Title':     'course_title',
  'Instructor':       'instructor',
  'GPA':              'gpa',
  'A (%)':            'a_pct',
  'A- (%)':           'a_minus_pct',
  'B+ (%)':           'b_plus_pct',
  'B (%)':            'b_pct',
  'B- (%)':           'b_minus_pct',
  'C+ (%)':           'c_plus_pct',
  'C (%)':            'c_pct',
  'C- (%)':           'c_minus_pct',
  'D+ (%)':           'd_plus_pct',
  'D (%)':            'd_pct',
  'D- (%)':           'd_minus_pct',
  'F (%)':            'f_pct',
  'Withdraws':        'withdraws',
  'Graded Enrollment':'graded_enrollment',
  'CRN':              'crn',
  'Credits':          'credits',
};

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(RAW_DIR).filter(f =>
    f.startsWith('vt_udc_grades_') && f.endsWith('.csv') && !f.includes('_partial_')
  );

  if (files.length === 0) {
    console.log(`No CSV files found in ${RAW_DIR}.`);
    console.log('Run the UDC scraper first, then drop the CSVs into backend/data/raw/.');
    process.exit(0);
  }

  console.log(`Found ${files.length} CSV file(s):\n  ${files.join('\n  ')}\n`);

  // ── Step 1: import grade rows ──────────────────────────────────────
  let totalInserted = 0;
  let totalSkipped  = 0;

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const text     = fs.readFileSync(filePath, 'utf8');
    const rows     = parseCSV(text);
    const records  = [];

    for (const raw of rows) {
      const row = {};
      for (const [rawKey, val] of Object.entries(raw)) {
        const normalized = normalizeHeader(rawKey);
        const dbCol      = COLUMN_MAP[normalized];
        if (dbCol) row[dbCol] = val;
      }

      if (!row.subject || !row.course_number) continue;

      records.push({
        academic_year:     row.academic_year     || null,
        term:              row.term              || null,
        subject:           (row.subject || '').trim().toUpperCase(),
        course_number:     (row.course_number || '').trim(),
        course_title:      row.course_title      || null,
        instructor:        row.instructor        || null,
        gpa:               toFloat(row.gpa),
        a_pct:             toFloat(row.a_pct),
        a_minus_pct:       toFloat(row.a_minus_pct),
        b_plus_pct:        toFloat(row.b_plus_pct),
        b_pct:             toFloat(row.b_pct),
        b_minus_pct:       toFloat(row.b_minus_pct),
        c_plus_pct:        toFloat(row.c_plus_pct),
        c_pct:             toFloat(row.c_pct),
        c_minus_pct:       toFloat(row.c_minus_pct),
        d_plus_pct:        toFloat(row.d_plus_pct),
        d_pct:             toFloat(row.d_pct),
        d_minus_pct:       toFloat(row.d_minus_pct),
        f_pct:             toFloat(row.f_pct),
        withdraws:         toInt(row.withdraws),
        graded_enrollment: toInt(row.graded_enrollment),
        crn:               row.crn               || null,
        credits:           toFloat(row.credits),
      });
    }

    // Upsert in chunks of 500 to avoid request size limits.
    const CHUNK = 500;
    let fileInserted = 0;
    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from('grades')
        .upsert(chunk, {
          onConflict:        'term,subject,course_number,instructor,crn',
          ignoreDuplicates:  true,
        })
        .select('id');

      if (error) {
        console.error(`  Error inserting chunk from ${file}:`, error.message);
      } else {
        fileInserted += data ? data.length : 0;
      }
    }

    const skipped = records.length - fileInserted;
    totalInserted += fileInserted;
    totalSkipped  += skipped;
    console.log(`  ${file}: ${fileInserted} rows inserted, ${skipped} duplicates skipped`);
  }

  console.log(`\nGrade import complete: ${totalInserted} rows inserted, ${totalSkipped} duplicates skipped.`);

  // ── Step 2: aggregate into courses table ──────────────────────────
  console.log('\nAggregating courses table...');

  // Pull distinct (subject, course_number) pairs from grades.
  const { data: pairs, error: pairsError } = await supabase
    .from('grades')
    .select('subject, course_number')
    .order('subject')
    .order('course_number');

  if (pairsError) {
    console.error('Failed to fetch course pairs:', pairsError.message);
    process.exit(1);
  }

  // Deduplicate in memory.
  const unique = [...new Map(
    pairs.map(r => [`${r.subject}|${r.course_number}`, r])
  ).values()];

  console.log(`  Found ${unique.length} unique courses to aggregate.`);

  // For each course, compute aggregates via a Postgres RPC or raw query.
  // Supabase JS doesn't support GROUP BY natively, so we use a stored procedure.
  // If you haven't created the aggregate function yet, this step will fail gracefully
  // and remind you — see the comment below for the SQL to create it.
  const { error: rpcError } = await supabase.rpc('aggregate_courses');

  if (rpcError) {
    console.warn('\n⚠  aggregate_courses() RPC not found or failed:', rpcError.message);
    console.warn('   Run the following SQL in the Supabase SQL Editor to create it,');
    console.warn('   then re-run this script:\n');
    console.warn(AGGREGATE_FUNCTION_SQL);
  } else {
    const { count } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });
    console.log(`\nCourses table: ${count} unique courses`);
    console.log('Done. Connect the frontend to Supabase to start querying.');
  }
}

// ── SQL for the aggregate_courses() function ──────────────────────────
// Paste this into the Supabase SQL Editor once, before running this script.
const AGGREGATE_FUNCTION_SQL = `
CREATE OR REPLACE FUNCTION aggregate_courses()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO courses (
    id, subject, course_number, title, credits,
    avg_gpa, a_pct, a_minus_pct, b_plus_pct, b_pct, b_minus_pct,
    c_plus_pct, c_pct, c_minus_pct, d_plus_pct, d_pct, d_minus_pct,
    f_pct, total_sections
  )
  SELECT
    lower(subject) || '-' || replace(course_number, ' ', '') AS id,
    subject,
    course_number,
    MAX(course_title)                                 AS title,
    ROUND(AVG(NULLIF(credits, 0))::numeric, 1)        AS credits,
    ROUND(AVG(NULLIF(gpa, 0))::numeric, 2)            AS avg_gpa,
    ROUND(AVG(NULLIF(a_pct, 0))::numeric, 1)          AS a_pct,
    ROUND(AVG(NULLIF(a_minus_pct, 0))::numeric, 1)    AS a_minus_pct,
    ROUND(AVG(NULLIF(b_plus_pct, 0))::numeric, 1)     AS b_plus_pct,
    ROUND(AVG(NULLIF(b_pct, 0))::numeric, 1)          AS b_pct,
    ROUND(AVG(NULLIF(b_minus_pct, 0))::numeric, 1)    AS b_minus_pct,
    ROUND(AVG(NULLIF(c_plus_pct, 0))::numeric, 1)     AS c_plus_pct,
    ROUND(AVG(NULLIF(c_pct, 0))::numeric, 1)          AS c_pct,
    ROUND(AVG(NULLIF(c_minus_pct, 0))::numeric, 1)    AS c_minus_pct,
    ROUND(AVG(NULLIF(d_plus_pct, 0))::numeric, 1)     AS d_plus_pct,
    ROUND(AVG(NULLIF(d_pct, 0))::numeric, 1)          AS d_pct,
    ROUND(AVG(NULLIF(d_minus_pct, 0))::numeric, 1)    AS d_minus_pct,
    ROUND(AVG(NULLIF(f_pct, 0))::numeric, 1)          AS f_pct,
    COUNT(*)                                          AS total_sections
  FROM grades
  GROUP BY subject, course_number
  ON CONFLICT (subject, course_number) DO UPDATE SET
    title          = excluded.title,
    credits        = excluded.credits,
    avg_gpa        = excluded.avg_gpa,
    a_pct          = excluded.a_pct,
    a_minus_pct    = excluded.a_minus_pct,
    b_plus_pct     = excluded.b_plus_pct,
    b_pct          = excluded.b_pct,
    b_minus_pct    = excluded.b_minus_pct,
    c_plus_pct     = excluded.c_plus_pct,
    c_pct          = excluded.c_pct,
    c_minus_pct    = excluded.c_minus_pct,
    d_plus_pct     = excluded.d_plus_pct,
    d_pct          = excluded.d_pct,
    d_minus_pct    = excluded.d_minus_pct,
    f_pct          = excluded.f_pct,
    total_sections = excluded.total_sections;
$$;
`;

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
