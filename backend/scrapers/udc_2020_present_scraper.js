/*
 * VT UDC Grade Scraper  —  2020-21 through 2025-26, all subjects, one CSV
 *
 * How to use:
 *   1. Open https://udc.vt.edu/irdata/data/courses/grades in Chrome.
 *   2. Let the page fully load.
 *   3. Open DevTools (Cmd+Option+J), paste the whole script, press Enter.
 *   4. A status overlay appears bottom-right. The script scrapes every
 *      subject × course and downloads one combined CSV when finished.
 *
 * Stop early:  window.__udcStop = true   or press the Stop button.
 *
 * Technical notes (hard-won from live debugging):
 *   - PrimeVue VirtualScroller needs  vs.dispatchEvent(new Event("scroll"))
 *     with NO { bubbles:true }.  Bubbling triggers a parent handler that
 *     resets scrollTop to 0.  Setting scrollTop without any event never
 *     fires Vue's internal handler, so items never re-render.
 *   - Option queries must be scoped to the VS element, not document-wide.
 *     Year-filter options linger in the DOM and pollute global queries.
 *   - Dropdowns open by clicking the inner [data-pc-section="label"] span,
 *     not the outer div.
 */
(async () => {

  if (window.__udcRunning) {
    console.warn("[UDC] Already running. Set window.__udcStop = true to stop.");
    return;
  }
  window.__udcRunning = true;
  window.__udcStop    = false;

  // ── Config ────────────────────────────────────────────────────────────────
  const YEAR_FROM = "2020-21";
  const YEAR_TO   = "2025-26";
  const ITEM_H    = 48;   // px per VirtualScroller row (confirmed live)

  const HEADERS = [
    "Academic Year","Term","Subject","Course No.","Course Title","Instructor","GPA",
    "A (%)","A- (%)","B+ (%)","B (%)","B- (%)","C+ (%)","C (%)","C- (%)",
    "D+ (%)","D (%)","D- (%)","F (%)","Withdraws","Graded Enrollment","CRN","Credits",
  ];

  // ── Utilities ─────────────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log   = (...a) => console.log("[UDC]", ...a);
  const warn  = (...a) => console.warn("[UDC]",  ...a);
  const norm  = s => (s || "").replace(/\s+/g, " ").trim();

  function inView(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function click(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (const t of ["pointerdown", "mousedown", "mouseup", "click"])
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
  }

  // ── VirtualScroller scroll (the only approach that works) ─────────────────
  //
  //  ✓  vs.scrollTop = X  +  non-bubbling dispatch  →  Vue re-renders items
  //  ✗  vs.scrollTop = X  alone                     →  Vue never fires, no re-render
  //  ✗  bubbling dispatch                           →  parent resets scrollTop to 0
  //
  async function vsScroll(vs, top) {
    vs.scrollTop = top;
    vs.dispatchEvent(new Event("scroll")); // non-bubbling — do not add { bubbles:true }
    await sleep(120);
  }

  // Options scoped to the VS element — avoids picking up year-filter options
  // that stay in the DOM while the subject dropdown is open.
  function vsOpts(vs) {
    return Array.from(vs.querySelectorAll("[role='option']")).map(o => norm(o.textContent));
  }

  // ── Dropdown helpers ──────────────────────────────────────────────────────
  function openDropdown(ctrl) {
    const span = ctrl && ctrl.querySelector("[data-pc-section='label']");
    click(span || ctrl);
  }

  async function closeDropdown() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await sleep(250);
  }

  async function waitForVS(ms = 4000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const v = document.querySelector("[data-pc-name='virtualscroller']");
      if (v && inView(v)) return v;
      await sleep(60);
    }
    return null;
  }

  // ── Enumerate every item in an open VirtualScroller ───────────────────────
  async function enumVS(vs, keep) {
    const seen   = new Set();
    const maxTop = vs.scrollHeight - vs.clientHeight;

    await vsScroll(vs, 0);

    let prevSize = 0, stale = 0;
    const cap = Math.ceil(maxTop / ITEM_H) + 30; // hard upper bound

    for (let i = 0; i < cap; i++) {
      vsOpts(vs).filter(keep).forEach(s => seen.add(s));

      if (seen.size > prevSize) { stale = 0; prevSize = seen.size; }
      else                      { stale++; if (stale >= 10) break; }

      const next = Math.min(vs.scrollTop + ITEM_H, maxTop);
      if (next === vs.scrollTop) break; // truly at the bottom
      await vsScroll(vs, next);
    }

    vsOpts(vs).filter(keep).forEach(s => seen.add(s)); // final read
    return Array.from(seen);
  }

  // Jump near an item's estimated position then click it
  async function pickFromVS(vs, text, idxInList) {
    // +1 because index 0 in the VS is always "(No Selection)"
    const targetTop = Math.max(0, (idxInList + 1) * ITEM_H - Math.floor(vs.clientHeight / 2));
    await vsScroll(vs, targetTop);

    for (let a = 0; a < 30; a++) {
      const opt = Array.from(vs.querySelectorAll("[role='option']"))
        .find(o => norm(o.textContent) === text);
      if (opt) { click(opt); return true; }
      await vsScroll(vs, vs.scrollTop + ITEM_H);
    }
    return false;
  }

  // ── Year filter ───────────────────────────────────────────────────────────
  async function setYears() {
    const ctrls = document.querySelectorAll(".v-year-range-picker div[data-pc-name='select']");

    const setOne = async (ctrl, target) => {
      const cur = norm(ctrl.querySelector("[data-pc-section='label']")?.textContent);
      if (cur === target) return; // already correct

      openDropdown(ctrl);
      await sleep(500);

      for (let a = 0; a < 25; a++) {
        // Year dropdowns are small — no VS, just plain options in the DOM
        const opt = Array.from(document.querySelectorAll("[role='option']"))
          .find(o => inView(o) && norm(o.textContent) === target);
        if (opt) { click(opt); break; }
        await sleep(100);
      }
      await sleep(3000); // page reloads data after a year change
    };

    await setOne(ctrls[0], YEAR_FROM);
    await setOne(ctrls[1], YEAR_TO);
    await closeDropdown();
    log(`Year filter set: ${YEAR_FROM} → ${YEAR_TO}`);
  }

  // ── Subjects ──────────────────────────────────────────────────────────────
  const isSubject = s => /^[A-Z]{2,6}\s+-\s+/.test(s);

  async function getSubjects() {
    openDropdown(document.querySelectorAll(".v-dropdown div[data-pc-name='select']")[0]);
    const vs = await waitForVS(5000);
    if (!vs) { await closeDropdown(); return []; }
    const list = await enumVS(vs, isSubject);
    await closeDropdown();
    log(`Enumerated ${list.length} subjects`);
    return list;
  }

  async function selectSubject(text, list) {
    openDropdown(document.querySelectorAll(".v-dropdown div[data-pc-name='select']")[0]);
    const vs = await waitForVS(5000);
    if (!vs) throw new Error("Subject VS not found");
    const ok = await pickFromVS(vs, text, list.indexOf(text));
    if (!ok) { await closeDropdown(); throw new Error(`Subject not clickable: ${text}`); }
    await sleep(1000); // course list needs time to populate
  }

  // ── Courses ───────────────────────────────────────────────────────────────
  function isCourse(code) {
    const re = code ? new RegExp(`\\(${code}\\)$`, "i") : null;
    return s => {
      if (!s || isSubject(s) || /^20\d{2}-\d{2}$/.test(s)) return false;
      return /^\d{4}[A-Z]?\s+-\s+/.test(s) || (re && re.test(s));
    };
  }

  // Walk up from the VS to find the filter input (course dropdown has one)
  function findFilterInput(vs) {
    let node = vs && vs.parentElement;
    for (let i = 0; i < 8 && node; i++) {
      const inp = node.querySelector("input");
      if (inp && inView(inp)) return inp;
      node = node.parentElement;
    }
    return null;
  }

  async function getCourses(code) {
    openDropdown(document.querySelectorAll(".v-dropdown div[data-pc-name='select']")[1]);
    const vs = await waitForVS(5000);
    const keep = isCourse(code);
    const seen = new Set();

    const fi = findFilterInput(vs);

    if (fi && inView(fi)) {
      // Filter-based enumeration — faster for large course lists
      for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
        fi.focus();
        fi.value = ch;
        fi.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(350);

        // After filter, a (possibly new) VS appears with filtered results
        const fvs = document.querySelector("[data-pc-name='virtualscroller']");
        if (fvs && inView(fvs)) {
          const items = await enumVS(fvs, keep);
          items.forEach(s => seen.add(s));
        } else {
          // No VS — small filtered list, read directly
          Array.from(document.querySelectorAll("[role='option']"))
            .filter(inView).map(o => norm(o.textContent)).filter(keep).forEach(s => seen.add(s));
        }
      }
      // Clear the filter
      fi.value = "";
      fi.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(200);

    } else if (vs) {
      const items = await enumVS(vs, keep);
      items.forEach(s => seen.add(s));
    } else {
      Array.from(document.querySelectorAll("[role='option']"))
        .filter(inView).map(o => norm(o.textContent)).filter(keep).forEach(s => seen.add(s));
    }

    await closeDropdown();
    return Array.from(seen).filter(keep);
  }

  async function selectCourse(text, list) {
    openDropdown(document.querySelectorAll(".v-dropdown div[data-pc-name='select']")[1]);
    const vs = await waitForVS(5000);
    const fi = findFilterInput(vs);

    if (fi && inView(fi)) {
      // Type the 4-digit course number to filter down to one result
      fi.focus();
      fi.value = text.slice(0, 4);
      fi.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(300);
    }

    const ok = await pickFromVS(vs, text, list.indexOf(text));
    if (!ok) { await closeDropdown(); throw new Error(`Course not clickable: ${text}`); }
    await sleep(600);
  }

  // ── Table scraping ────────────────────────────────────────────────────────
  function getHeaders() {
    return Array.from(document.querySelectorAll("table thead th, [role='columnheader']"))
      .map(th => norm(th.textContent).replace(/[↑↓⇅↕]/g, "").trim())
      .filter(Boolean);
  }

  function getRows() {
    return Array.from(document.querySelectorAll("table tbody tr"))
      .map(tr => Array.from(tr.querySelectorAll("td")).map(td => norm(td.textContent)))
      .filter(r => r.length > 0 && r.some(c => c));
  }

  function getPaging() {
    const m = document.body.innerText.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i);
    return m ? { start: +m[1], end: +m[2], total: +m[3] } : null;
  }

  async function waitForTable(ms = 20000) {
    const end = Date.now() + ms;
    let prev = "", stable = 0;
    while (Date.now() < end) {
      const rows = getRows(), info = getPaging();
      const sig = JSON.stringify({ n: rows.length, f: rows[0], l: rows[rows.length - 1], info });
      if (sig === prev) stable++; else stable = 0;
      prev = sig;
      if (rows.length > 0 && (rows[0]?.length ?? 0) >= 5 && stable >= 2) return true;
      await sleep(250);
    }
    return false;
  }

  async function clickNextPage() {
    const btn = Array.from(document.querySelectorAll("button")).find(b =>
      /next page/i.test(`${b.title || ""} ${b.getAttribute("aria-label") || ""}`) &&
      !b.disabled && !b.classList.contains("p-disabled")
    );
    if (!btn) return false;
    const before = JSON.stringify({ rows: getRows(), info: getPaging() });
    click(btn);
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      if (JSON.stringify({ rows: getRows(), info: getPaging() }) !== before) return true;
    }
    return false;
  }

  const HMAP = {
    "Academic Year": "Academic Year", "Year": "Academic Year",
    "Term": "Term",
    "Subject": "Subject",
    "Course No.": "Course No.", "Course Number": "Course No.", "Course": "Course No.",
    "Course Title": "Course Title", "Title": "Course Title",
    "Instructor": "Instructor",
    "GPA": "GPA",
    "A (%)": "A (%)",   "A- (%)": "A- (%)",
    "B+ (%)": "B+ (%)", "B (%)": "B (%)",  "B- (%)": "B- (%)",
    "C+ (%)": "C+ (%)", "C (%)": "C (%)",  "C- (%)": "C- (%)",
    "D+ (%)": "D+ (%)", "D (%)": "D (%)",  "D- (%)": "D- (%)",
    "F (%)": "F (%)",
    "Withdraws": "Withdraws", "Withdraw": "Withdraws", "W": "Withdraws",
    "Graded Enrollment": "Graded Enrollment", "Enrollment": "Graded Enrollment",
    "CRN": "CRN",
    "Credits": "Credits", "Credit": "Credits",
  };

  function mapRow(rawHdrs, rawRow, subject, course) {
    const obj = {};
    HEADERS.forEach(h => { obj[h] = ""; });
    rawHdrs.forEach((h, i) => {
      const key  = norm(h).replace(/−/g, "-").replace(/\s+/g, " ");
      const dest = HMAP[key];
      if (dest) obj[dest] = rawRow[i] || "";
    });
    if (!obj["Subject"])      obj["Subject"]      = subject.split(" - ")[0] || subject;
    if (!obj["Course No."])   { const m = course.match(/\b\d{4}[A-Z]?\b/); if (m) obj["Course No."] = m[0]; }
    if (!obj["Course Title"]) obj["Course Title"] = course;
    return obj;
  }

  async function scrapeTable(subject, course) {
    const hdrs = getHeaders();
    const seen = new Set();
    const rows = [];

    // Go to first page if paginator exists
    const first = Array.from(document.querySelectorAll("button"))
      .find(b => /first page/i.test(`${b.title || ""} ${b.getAttribute("aria-label") || ""}`));
    if (first && !first.disabled) { click(first); await sleep(400); }

    for (let p = 0; p < 500; p++) {
      if (window.__udcStop) break;
      await waitForTable(8000);
      const raw = getRows(), info = getPaging();
      const sig = JSON.stringify({ info, f: raw[0], l: raw[raw.length - 1], n: raw.length });
      if (seen.has(sig)) break;
      seen.add(sig);
      raw.forEach(r => rows.push(mapRow(hdrs, r, subject, course)));
      if (!info || info.end >= info.total) break;
      if (!await clickNextPage()) break;
    }
    return rows;
  }

  // ── Overlay ───────────────────────────────────────────────────────────────
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;bottom:14px;right:14px;z-index:2147483647;" +
    "background:#0b3a27;color:#adff2f;font-family:monospace;font-size:12px;" +
    "padding:12px 16px;border-radius:8px;max-width:500px;line-height:1.7;" +
    "box-shadow:0 6px 24px rgba(0,0,0,.5)";
  ov.innerHTML =
    `<div style="font-weight:700;color:#fff;margin-bottom:2px">` +
    `UDC Scraper — ${YEAR_FROM} to ${YEAR_TO}</div>` +
    `<div id="_m">Starting…</div>` +
    `<button id="_s" style="margin-top:8px;background:#5c1a1a;color:#fff;` +
    `border:0;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">` +
    `Stop</button>`;
  document.body.appendChild(ov);
  ov.querySelector("#_s").onclick = () => {
    window.__udcStop = true;
    ov.querySelector("#_s").textContent = "Stopping after this course…";
  };

  const t0 = Date.now();
  const allRows = [];

  function status(msg) {
    const s = Math.round((Date.now() - t0) / 1000);
    ov.querySelector("#_m").innerHTML =
      msg + `<br>Rows collected: ${allRows.length.toLocaleString()} | ` +
      `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
  }

  // ── CSV download ──────────────────────────────────────────────────────────
  function download() {
    const esc = v => {
      const s = String(v == null ? "" : v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      HEADERS.map(esc).join(","),
      ...allRows.map(r => HEADERS.map(h => esc(r[h] ?? "")).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), {
      href: url,
      download: `vt_grades_${YEAR_FROM}_to_${YEAR_TO}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  try {
    // 1. Year filter
    status("Setting year filter…");
    await setYears();

    // 2. Enumerate subjects
    status("Enumerating all subjects…");
    const subjects = await getSubjects();
    if (!subjects.length) throw new Error("No subjects found — is the page fully loaded?");

    log(`Starting: ${subjects.length} subjects, ${YEAR_FROM}–${YEAR_TO}`);

    // 3. Loop over subjects
    for (let si = 0; si < subjects.length; si++) {
      if (window.__udcStop) { log("Stopped by user."); break; }

      const sub  = subjects[si];
      const code = sub.split(" - ")[0].trim();

      status(`[${si + 1}/${subjects.length}] ${code} — selecting subject…`);
      log(`\n── ${si + 1}/${subjects.length} ${sub}`);

      try { await selectSubject(sub, subjects); }
      catch (e) { warn(`Skip subject "${sub}": ${e.message}`); continue; }

      // 4. Enumerate courses
      status(`[${si + 1}/${subjects.length}] ${code} — enumerating courses…`);
      let courses = [];
      try { courses = await getCourses(code); }
      catch (e) { warn(`Skip courses for "${code}": ${e.message}`); continue; }

      if (!courses.length) { log(`${code}: no courses, skipping`); continue; }
      log(`${code}: ${courses.length} course(s)`);

      // 5. Loop over courses
      for (let ci = 0; ci < courses.length; ci++) {
        if (window.__udcStop) break;

        const course = courses[ci];
        status(
          `[${si + 1}/${subjects.length}] ${code} ` +
          `— course ${ci + 1}/${courses.length}: ${course.slice(0, 30)}…`
        );

        try { await selectCourse(course, courses); }
        catch (e) { warn(`Skip course "${course}": ${e.message}`); continue; }

        await waitForTable(15000);
        const rows = await scrapeTable(sub, course);
        if (rows.length) allRows.push(...rows);
      }
    }

    // 6. Download everything as one CSV
    if (allRows.length) {
      download();
      log(`\nComplete — ${allRows.length} rows downloaded.`);
      status(`✓ Done — ${allRows.length.toLocaleString()} rows → vt_grades_${YEAR_FROM}_to_${YEAR_TO}.csv`);
    } else {
      log("Complete — no rows collected.");
      status("Done — no rows collected.");
    }

  } catch (err) {
    console.error("[UDC] Fatal:", err);
    if (allRows.length) download(); // save whatever we have
    status(`ERROR: ${err.message}`);
  } finally {
    window.__udcRunning = false;
  }

})();
