// scripts/import_descriptions.js
//
// Reads backend/data/raw/course_descriptions.json (produced by scrape-catalog)
// and writes descriptions into the Supabase `courses` table.
//
// Only updates rows where description IS NULL or empty — safe to re-run.
//
// Run with: npm run import-descriptions

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

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const IN_FILE = path.join(__dirname, '../data/raw/course_descriptions.json');

async function main() {
  // 1. Load scraped descriptions
  if (!fs.existsSync(IN_FILE)) {
    console.error(`Input file not found: ${IN_FILE}`);
    console.error('Run: npm run scrape-catalog  first.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  console.log(`Loaded ${raw.length} scraped descriptions\n`);

  // 2. Fetch the full courses table (id + subject + course_number) so we
  //    can match by subject:course_number and update by id.
  //    We page through all rows because Supabase caps single queries at 1000.
  let allCourses = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await db
      .from('courses')
      .select('id, subject, course_number, description')
      .range(from, from + PAGE - 1);
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allCourses = allCourses.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Total courses in DB: ${allCourses.length}`);

  // Only target rows without a description
  const needsDesc = allCourses.filter(r => !r.description || r.description.trim() === '');
  console.log(`Courses without description: ${needsDesc.length}`);

  // Build lookup: "SUBJECT:COURSENUMBER" → id
  const lookup = {};
  for (const row of needsDesc) {
    const key = `${row.subject.toUpperCase()}:${row.course_number.trim()}`;
    lookup[key] = row.id;
  }

  // 3. Match scraped descriptions to courses
  const updates = [];
  for (const entry of raw) {
    if (!entry.description || entry.description.length < 10) continue;
    const key = `${entry.subject.toUpperCase()}:${entry.courseNumber.trim()}`;
    if (lookup[key] !== undefined) {
      updates.push({ id: lookup[key], subject: entry.subject, courseNumber: entry.courseNumber, description: entry.description });
    }
  }

  console.log(`Matched ${updates.length} descriptions to DB rows\n`);

  if (updates.length === 0) {
    // Debug: show a few scraped keys vs a few DB keys
    const scrapedKeys = raw.slice(0, 5).map(e => `${e.subject.toUpperCase()}:${e.courseNumber}`);
    const dbKeys      = needsDesc.slice(0, 5).map(r => `${r.subject.toUpperCase()}:${r.course_number}`);
    console.log('Sample scraped keys:', scrapedKeys);
    console.log('Sample DB keys:     ', dbKeys);
    console.log('\nNo matches — key format mismatch between scraper output and DB. Check subject/course_number values above.');
    return;
  }

  // 4. Update one row at a time with .select() to confirm each write
  //    (bulk update by arbitrary id list isn't directly supported in PostgREST v2)
  let written = 0;
  let failed  = 0;
  let noMatch = 0;

  for (let i = 0; i < updates.length; i++) {
    const { id, subject, courseNumber, description } = updates[i];

    const { data, error } = await db
      .from('courses')
      .update({ description })
      .eq('subject', subject.toUpperCase())
      .eq('course_number', courseNumber.trim())
      .select('id');

    if (error) {
      console.warn(`  [${subject} ${courseNumber}] error: ${error.message}`);
      failed++;
    } else if (!data || data.length === 0) {
      // Update ran but matched 0 rows — RLS or wrong key
      if (i < 3) console.warn(`  [${subject} ${courseNumber}] update matched 0 rows`);
      noMatch++;
    } else {
      written++;
    }

    if ((i + 1) % 10 === 0 || i === updates.length - 1) {
      process.stdout.write(`  ${i + 1}/${updates.length} processed\r`);
    }
  }

  console.log(`\n\nDone.`);
  console.log(`  Written:        ${written}`);
  if (noMatch > 0) console.log(`  Matched 0 rows: ${noMatch}  ← likely RLS or column mismatch`);
  if (failed  > 0) console.log(`  Errors:         ${failed}`);

  // 5. Sanity check
  const { count } = await db
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .not('description', 'is', null)
    .neq('description', '');

  console.log(`\nCourses with a description in DB now: ${count}`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
