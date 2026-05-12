// scripts/import_rmp.js
//
// Reads the RMP professor JSON produced by rmp_scraper.js, matches each
// entry to a unique instructor name in the Supabase `grades` table (by
// last name), and upserts into the `professors` table.
//
// Run from the backend/ directory:
//   node scripts/import_rmp.js
//
// Requirements:
//   - npm install  (first time only)
//   - .env with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RMP_JSON      = path.join(__dirname, '../data/raw/rmp_vt_professors.json');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

if (!fs.existsSync(RMP_JSON)) {
  console.error(`RMP data not found at ${RMP_JSON}`);
  console.error('Run: node scrapers/rmp_scraper.js  first');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Normalise a name for fuzzy matching ───────────────────────────────────
function normName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Build a map: normalised last name → array of RMP professors ───────────
function buildRmpIndex(rmpProfessors) {
  const index = new Map();
  for (const p of rmpProfessors) {
    const key = normName(p.last_name);
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(p);
  }
  return index;
}

// ── Match a grades instructor name to an RMP professor ────────────────────
// Strategy:
//   1. Direct last-name match (handles "Smith" → lastName "Smith")
//   2. For multi-word names (e.g. "Ashiq Khan"), try the last token as last name
//   Returns the single best match, or null if ambiguous / not found.
function matchProfessor(gradeName, rmpIndex) {
  const tokens = normName(gradeName).split(' ');
  const lastName = tokens[tokens.length - 1]; // last token = last name

  const candidates = rmpIndex.get(lastName) ?? [];
  if (candidates.length === 0) return null;

  // If there's only one RMP professor with this last name at VT, use it.
  if (candidates.length === 1) return candidates[0];

  // Multiple matches — try to disambiguate using department or rating count.
  // For now, pick the one with the most ratings (most likely to be the right person).
  return candidates.sort((a, b) => (b.num_ratings ?? 0) - (a.num_ratings ?? 0))[0];
}

// ── Main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log('=== RMP Import ===\n');

  // Load RMP data
  const rmpProfessors = JSON.parse(fs.readFileSync(RMP_JSON, 'utf8'));
  console.log(`Loaded ${rmpProfessors.length} professors from RMP JSON.`);

  const rmpIndex = buildRmpIndex(rmpProfessors);
  console.log(`Built index for ${rmpIndex.size} unique last names.\n`);

  // Load all distinct instructor names from grades
  const { data: rows, error: fetchErr } = await supabase
    .from('grades')
    .select('instructor')
    .not('instructor', 'is', null);

  if (fetchErr) {
    console.error('Failed to fetch instructors:', fetchErr.message);
    process.exit(1);
  }

  const uniqueInstructors = [...new Set(rows.map(r => r.instructor).filter(Boolean))];
  console.log(`Found ${uniqueInstructors.length} unique instructors in grades table.\n`);

  // Match and build upsert records
  const toUpsert = [];
  const matched  = [];
  const skipped  = [];

  for (const gradeName of uniqueInstructors) {
    const rmp = matchProfessor(gradeName, rmpIndex);
    if (!rmp) {
      skipped.push(gradeName);
      continue;
    }

    matched.push(`${gradeName} → ${rmp.first_name} ${rmp.last_name} (⭐ ${rmp.avg_rating}, ${rmp.num_ratings} ratings)`);

    toUpsert.push({
      name:            gradeName,
      name_normalized: normName(gradeName),
      rmp_id:          String(rmp.rmp_id),
      rmp_rating:      rmp.avg_rating ?? null,
      rmp_difficulty:  rmp.avg_difficulty ?? null,
      rmp_count:       rmp.num_ratings ?? 0,
      rmp_tags:        rmp.tags ?? [],
      last_fetched_at: new Date().toISOString(),
    });
  }

  console.log(`Matched ${matched.length} / ${uniqueInstructors.length} instructors.\n`);
  console.log('Sample matches:');
  matched.slice(0, 10).forEach(m => console.log(' ', m));
  if (matched.length > 10) console.log(`  ...and ${matched.length - 10} more`);

  if (skipped.length > 0) {
    console.log(`\nNo RMP match for ${skipped.length} instructors:`);
    skipped.slice(0, 20).forEach(n => console.log(' ', n));
    if (skipped.length > 20) console.log(`  ...and ${skipped.length - 20} more`);
  }

  if (toUpsert.length === 0) {
    console.log('\nNothing to upsert.');
    return;
  }

  // Upsert in chunks of 50
  console.log(`\nUpserting ${toUpsert.length} records into professors table...`);
  const CHUNK = 50;
  let inserted = 0;
  for (let i = 0; i < toUpsert.length; i += CHUNK) {
    const chunk = toUpsert.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('professors')
      .upsert(chunk, { onConflict: 'name' });

    if (error) {
      console.error(`Upsert error on chunk ${i / CHUNK + 1}:`, error.message);
    } else {
      inserted += chunk.length;
      process.stdout.write(`\r  ${inserted} / ${toUpsert.length} upserted`);
    }
  }

  console.log(`\n\nDone. ${inserted} professors imported into Supabase.`);
  console.log('\nYou can now re-deploy the chat-bot on Render — it will pick up RMP data automatically.');
})();
