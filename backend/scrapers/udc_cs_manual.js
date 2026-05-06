/*
 * udc_cs_manual.js
 *
 * Run this AFTER manually selecting a subject in the UDC Subject dropdown.
 * It skips subject detection entirely, reads the current page state, and
 * scrapes all courses for the selected subject.
 *
 * Page: https://udc.vt.edu/irdata/data/courses/grades
 *
 * Usage:
 *   1. Open the page, select a subject (e.g. "CS - Computer Science")
 *   2. Wait for the Course dropdown to populate
 *   3. Open DevTools Console, paste this entire script, hit Enter
 */
(async () => {
  // ── Config ──────────────────────────────────────────────────────────
  const SUBJECT          = "CS - Computer Science";  // must match page exactly
  const SUBJECT_CODE     = "CS";
  const DELAY_COURSE_MS  = 1000;
  const MAX_WAIT_TABLE   = 25000;
  const CHECKPOINT_EVERY = 10;

  // ── Helpers ──────────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm  = s  => (s || "").replace(/\s+/g, " ").trim();
  const log   = (...a) => console.log("[UDC-CS]", ...a);
  const warn  = (...a) => console.warn("[UDC-CS]", ...a);

  const DESIRED_HEADERS = [
    "Academic Year","Term","Subject","Course No.","Course Title","Instructor",
    "GPA","A (%)","A− (%)","B+ (%)","B (%)","B− (%)","C+ (%)","C (%)","C− (%)",
    "D+ (%)","D (%)","D− (%)","F (%)","Withdraws","Graded Enrollment","CRN","Credits",
  ];

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" &&
           s.visibility !== "hidden" && s.opacity !== "0";
  }

  function clickElement(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + Math.min(r.width - 4, Math.max(4, r.width / 2));
    const y = r.top  + Math.min(r.height - 4, Math.max(4, r.height / 2));
    for (const t of ["pointerdown","mousedown","mouseup","click"]) {
      el.dispatchEvent(new MouseEvent(t, { bubbles:true, cancelable:true, view:window, clientX:x, clientY:y }));
    }
  }

  function getOptionElements() {
    return Array.from(document.querySelectorAll(
      "[role='option'], .p-select-option, .p-dropdown-item, .p-multiselect-item"
    )).filter(isVisible);
  }

  function getVisibleOptions() {
    return getOptionElements().map(o => norm(o.textContent)).filter(Boolean)
      .filter(s => s !== "(No Selection)").filter(s => !/^Select /i.test(s));
  }

  async function closeDropdown() {
    document.dispatchEvent(new KeyboardEvent("keydown",
      { key:"Escape", code:"Escape", bubbles:true }));
    await sleep(180);
  }

  function findScroller() {
    // Try known PrimeVue VirtualScroller selectors first.
    for (const sel of [
      '[data-pc-name="virtualscroller"]', '.p-virtualscroller', '.p-scroller',
      '.p-select-list-container', '.p-dropdown-items-wrapper', '[role="listbox"]',
    ]) {
      const el = document.querySelector(sel);
      if (el && isVisible(el) && el.scrollHeight > el.clientHeight + 2) return el;
    }
    // Walk up from first option element.
    const opt = getOptionElements()[0];
    if (!opt) return null;
    let cur = opt.parentElement;
    while (cur && cur !== document.body) {
      const s = window.getComputedStyle(cur);
      if (/(auto|scroll|hidden)/i.test(s.overflowY) && cur.scrollHeight > cur.clientHeight + 2)
        return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  // Opens a dropdown control and waits for options to appear.
  async function openControl(control) {
    await closeDropdown();
    control.scrollIntoView({ block: "center" });
    await sleep(120);
    clickElement(control);
    for (let i = 0; i < 40; i++) {
      if (getVisibleOptions().length > 0) return true;
      await sleep(100);
    }
    return getVisibleOptions().length > 0;
  }

  // Selects an option by text, scrolling + keyboard navigation to find it.
  async function selectOption(control, optionText) {
    const opened = await openControl(control);
    if (!opened) throw new Error(`Could not open dropdown to select "${optionText}"`);

    // Try filter if present.
    const filter = document.querySelector(
      ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-inputtext"
    );
    if (filter && isVisible(filter)) {
      filter.focus();
      filter.value = optionText.slice(0, 24);
      filter.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(400);
    }

    let match = null;
    for (let i = 0; i < 150; i++) {
      const opts = getOptionElements();
      match = opts.find(o => norm(o.textContent) === optionText) ||
              opts.find(o => { const t = norm(o.textContent); return t.includes(optionText) || optionText.includes(t); });
      if (match) break;

      const scroller = findScroller();
      if (scroller) {
        scroller.scrollTop += Math.max(80, scroller.clientHeight * 0.6);
        scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
        await sleep(100);
      } else {
        // Keyboard ArrowDown as fallback for VirtualScroller.
        const active = document.activeElement;
        if (active) active.dispatchEvent(new KeyboardEvent("keydown", { key:"ArrowDown", bubbles:true }));
        await sleep(80);
      }
    }

    // Last resort: PrimeVue type-ahead.
    if (!match) {
      const code = optionText.split(' - ')[0].trim().toLowerCase();
      for (const char of code) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key:char, bubbles:true }));
        await sleep(150);
      }
      await sleep(600);
      const opts = getOptionElements();
      match = opts.find(o => norm(o.textContent) === optionText) ||
              opts.find(o => { const t = norm(o.textContent); return t.includes(optionText) || optionText.includes(t); });
    }

    if (!match) {
      await closeDropdown();
      throw new Error(`Option not found: "${optionText}". Visible: ${JSON.stringify(getVisibleOptions().slice(0,8))}`);
    }
    match.scrollIntoView({ block:"center" });
    await sleep(100);
    clickElement(match);
    await sleep(550);
  }

  function getHeaders() {
    let cells = Array.from(document.querySelectorAll("table thead tr:last-child th, [role='columnheader']"));
    if (!cells.length) cells = Array.from(document.querySelectorAll("th"));
    return cells.map(th => norm(th.textContent).replace(/[↑↓⇅↕]/g, "").trim()).filter(Boolean);
  }

  function getTableRows() {
    return Array.from(document.querySelectorAll("table tbody tr"))
      .map(tr => Array.from(tr.querySelectorAll("td")).map(td => norm(td.textContent)))
      .filter(r => r.length > 0 && r.some(c => c !== ""));
  }

  function getPagingInfo() {
    const m = document.body.innerText.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i);
    return m ? { start:+m[1], end:+m[2], total:+m[3] } : null;
  }

  async function waitForTable(timeoutMs = MAX_WAIT_TABLE) {
    const start = Date.now();
    let prevSig = "", stableCount = 0;
    while (Date.now() - start < timeoutMs) {
      const rows = getTableRows(), headers = getHeaders(), info = getPagingInfo();
      const sig = JSON.stringify({ count:rows.length, first:rows[0], last:rows[rows.length-1], info });
      if (sig === prevSig) stableCount++; else stableCount = 0;
      prevSig = sig;
      if (rows.length > 0 && rows.some(r => r.length >= 8) && headers.length >= 8 && stableCount >= 2) return true;
      await sleep(250);
    }
    return false;
  }

  async function clickFirstPage() {
    const btn = Array.from(document.querySelectorAll("button")).find(b => {
      const t = `${b.title||""} ${b.getAttribute("aria-label")||""}`;
      return /first page/i.test(t) && !b.disabled && !b.classList.contains("p-disabled");
    });
    if (btn) { clickElement(btn); await sleep(500); }
  }

  async function nextPage() {
    const btn = Array.from(document.querySelectorAll("button")).find(b => {
      const t = `${b.title||""} ${b.getAttribute("aria-label")||""}`;
      return /next page/i.test(t) && !b.disabled && !b.classList.contains("p-disabled");
    });
    if (!btn) return false;
    const before = JSON.stringify({ rows:getTableRows(), info:getPagingInfo() });
    clickElement(btn);
    for (let i = 0; i < 35; i++) {
      await sleep(150);
      if (JSON.stringify({ rows:getTableRows(), info:getPagingInfo() }) !== before) return true;
    }
    return false;
  }

  function normalizeHeader(h) { return norm(h).replace(/−/g, "-"); }
  const COLUMN_MAP = {
    "Academic Year":"Academic Year","Year":"Academic Year","Term":"Term",
    "Subject":"Subject","Course No.":"Course No.","Course Number":"Course No.",
    "Course Title":"Course Title","Title":"Course Title","Instructor":"Instructor",
    "GPA":"GPA","A (%)":"A (%)","A- (%)":"A− (%)","B+ (%)":"B+ (%)","B (%)":"B (%)",
    "B- (%)":"B− (%)","C+ (%)":"C+ (%)","C (%)":"C (%)","C- (%)":"C− (%)",
    "D+ (%)":"D+ (%)","D (%)":"D (%)","D- (%)":"D− (%)","F (%)":"F (%)",
    "Withdraws":"Withdraws","Withdraw":"Withdraws","Graded Enrollment":"Graded Enrollment",
    "Enrollment":"Graded Enrollment","CRN":"CRN","Credits":"Credits","Credit":"Credits",
  };

  function rowToObj(headers, row, course) {
    const obj = {};
    for (const h of DESIRED_HEADERS) obj[h] = "";
    headers.forEach((header, i) => {
      const mapped = COLUMN_MAP[normalizeHeader(header)];
      if (mapped) obj[mapped] = row[i] || "";
    });
    if (!obj["Subject"])    obj["Subject"]    = SUBJECT_CODE;
    if (!obj["Course No."]) { const m = course.match(/\b\d{4}[A-Z]?\b/); if (m) obj["Course No."] = m[0]; }
    if (!obj["Course Title"]) obj["Course Title"] = course;
    return obj;
  }

  async function scrapeAllPages(course) {
    const headers = getHeaders();
    const collected = [];
    const seen = new Set();
    await clickFirstPage();
    for (let safety = 0; safety < 500; safety++) {
      if (window.__udcStop) break;
      await waitForTable(6000);
      const rows = getTableRows(), info = getPagingInfo();
      const pageSig = JSON.stringify({ info, first:rows[0], last:rows[rows.length-1], count:rows.length });
      if (seen.has(pageSig)) break;
      seen.add(pageSig);
      for (const row of rows) collected.push(rowToObj(headers, row, course));
      if (!info || info.end >= info.total) break;
      if (!await nextPage()) break;
    }
    return collected;
  }

  function toCSV(headers, rows) {
    const esc = v => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
    return [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h]??"")).join(","))].join("\n");
  }

  function downloadCSV(text, filename) {
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([text], { type:"text/csv;charset=utf-8" })),
      download: filename,
    });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ── Overlay ──────────────────────────────────────────────────────────
  window.__udcStop = false;
  const startTs = Date.now();
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;bottom:14px;right:14px;z-index:2147483647;background:#0b3a27;color:#adff2f;font-family:monospace;font-size:12px;padding:12px 14px;border-radius:8px;max-width:460px;box-shadow:0 8px 24px rgba(0,0,0,.35);line-height:1.45";
  overlay.innerHTML = `<div style="font-weight:700;color:#fff;margin-bottom:6px">UDC CS scraper running</div><div id="cs-prog"></div><button id="cs-stop" style="margin-top:8px;background:#5c1a1a;color:#fff;border:0;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px">Stop and save partial</button>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#cs-stop").addEventListener("click", () => { window.__udcStop = true; overlay.querySelector("#cs-stop").textContent = "Stopping…"; });
  const prog = overlay.querySelector("#cs-prog");
  let doneCourses = 0, totalCourses = 0;
  function updateProg(course) {
    const e = Math.round((Date.now()-startTs)/1000);
    prog.innerHTML = `Subject: ${SUBJECT}<br>Course: ${course||"—"}<br>Progress: ${doneCourses}/${totalCourses}<br>Elapsed: ${String(Math.floor(e/60)).padStart(2,"0")}:${String(e%60).padStart(2,"0")}`;
  }

  // ── Main ─────────────────────────────────────────────────────────────
  log(`Starting CS scrape. Make sure "CS - Computer Science" is selected in the Subject dropdown.`);

  // Find the course dropdown — it should be the last candidate with options.
  // Give the page a moment to settle after the manual subject selection.
  await sleep(1000);

  // Identify the course control: collect candidates and find one with course-like options.
  const candidates = Array.from(document.querySelectorAll(
    "[role='combobox'], .p-select, .p-dropdown, .p-select-label, .p-dropdown-label"
  )).filter(isVisible);

  let courseControl = null;

  for (const c of candidates) {
    const opened = await openControl(c);
    if (!opened) { await closeDropdown(); continue; }
    const opts = getVisibleOptions();
    const hasCourses = opts.some(o => /^\d{4}[A-Z]?\s+-\s+.+/.test(o) || /\(CS\)$/i.test(o));
    await closeDropdown();
    if (hasCourses) { courseControl = c; break; }
  }

  if (!courseControl) {
    overlay.remove();
    log("Could not find course dropdown. Make sure CS is selected in the Subject dropdown first.");
    return;
  }

  // Collect all CS courses.
  const opened = await openControl(courseControl);
  const allCourses = [];
  const seen = new Set();
  const scroller = findScroller();
  for (let i = 0; i < 300; i++) {
    getVisibleOptions().forEach(o => { if (!seen.has(o)) { seen.add(o); allCourses.push(o); } });
    if (!scroller) break;
    const before = scroller.scrollTop;
    scroller.scrollTop += Math.max(80, scroller.clientHeight * 0.6);
    scroller.dispatchEvent(new Event("scroll", { bubbles:true }));
    await sleep(100);
    if (scroller.scrollTop === before) break;
  }
  getVisibleOptions().forEach(o => { if (!seen.has(o)) { seen.add(o); allCourses.push(o); } });
  await closeDropdown();

  const courses = allCourses.filter(o => /^\d{4}[A-Z]?\s+-\s+.+/.test(o) || /\(CS\)$/i.test(o));
  totalCourses = courses.length;
  log(`Found ${courses.length} CS courses.`);

  const allRows = [];

  for (const course of courses) {
    if (window.__udcStop) break;
    updateProg(course);
    try {
      await selectOption(courseControl, course);
    } catch (err) {
      warn(`Skipping ${course}: ${err.message}`);
      doneCourses++;
      continue;
    }
    if (!await waitForTable()) {
      warn(`No table for ${course}`);
      doneCourses++;
      continue;
    }
    const rows = await scrapeAllPages(course);
    allRows.push(...rows);
    log(`${course}: ${rows.length} rows`);
    doneCourses++;
    updateProg(course);
    if (doneCourses % CHECKPOINT_EVERY === 0) log(`Checkpoint: ${allRows.length} rows so far`);
    await sleep(DELAY_COURSE_MS);
  }

  overlay.remove();
  const stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,"-");
  const filename = window.__udcStop
    ? `vt_udc_grades_CS_partial_${stamp}.csv`
    : `vt_udc_grades_CS_${stamp}.csv`;
  downloadCSV(toCSV(DESIRED_HEADERS, allRows), filename);
  log(`Done. ${allRows.length} rows → ${filename}`);
  log(`Move the CSV to backend/data/raw/ then run: npm run import-grades`);
})();
