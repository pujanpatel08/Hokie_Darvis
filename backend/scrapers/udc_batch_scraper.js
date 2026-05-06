/* VT UDC Course Grades Scraper — batch mode, user-positioned start
 *
 * Page:
 *   https://udc.vt.edu/irdata/data/courses/grades
 *
 * How to use:
 *   1. Navigate to the UDC grades page in Chrome.
 *   2. Use the Subject dropdown to manually select the subject you want to
 *      START from. The script reads the current selection and works forward
 *      through every remaining subject automatically.
 *   3. Open DevTools (Cmd+Option+J), paste this entire script into the
 *      Console tab, hit Enter.
 *   4. The script scrapes the current subject, downloads a CSV, moves to the
 *      next subject, and repeats until all subjects are done (or you stop it).
 *   5. To stop cleanly between subjects: run window.__udcStop = true
 *      OR click the "Stop" button on the overlay.
 *
 * If no subject is selected when you paste the script, it starts from the
 * first subject alphabetically.
 *
 * Console helpers:
 *   window.udcListProgress()   — show subjects completed so far
 *   window.__udcStop = true    — stop after the current subject finishes
 */
(async () => {
  const CONFIG = {
    delayBetweenCourses: 1000,   // ms between course selections within a subject
    delayBetweenSubjects: 2000,  // ms between subjects
    maxWaitForTableMs: 25000,
    checkpointEvery: 10,
    showOverlay: true,
  };

  const DESIRED_HEADERS = [
    "Academic Year", "Term", "Subject", "Course No.", "Course Title",
    "Instructor", "GPA",
    "A (%)", "A− (%)", "B+ (%)", "B (%)", "B− (%)",
    "C+ (%)", "C (%)", "C− (%)",
    "D+ (%)", "D (%)", "D− (%)",
    "F (%)", "Withdraws", "Graded Enrollment", "CRN", "Credits",
  ];

  const DONE_KEY  = "udc_grades_done_subjects_v1";
  const ROWS_KEY  = "udc_grades_inflight_rows_v1";

  // Exposed helpers
  window.udcListProgress = () => {
    const done = JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
    console.log(`[UDC] Subjects done: ${done.length}`);
    console.log(done);
    return done;
  };

  if (window.__udcRunning) {
    console.warn("[UDC] Already running. Set window.__udcStop = true to stop.");
    return;
  }
  window.__udcRunning = true;
  window.__udcStop   = false;

  // ── Utilities ────────────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm  = s  => (s || "").replace(/\s+/g, " ").trim();
  const log   = (...a) => console.log("[UDC]", ...a);
  const warn  = (...a) => console.warn("[UDC]",  ...a);

  let allRows = [];               // reset per subject
  let subjectControl        = null;
  let courseControl         = null;
  let currentSubject        = "—";
  let currentCourse         = "—";
  let totalCoursesInSubject = 0;
  let doneCoursesInSubject  = 0;
  let overallSubjectIndex   = 0;
  let overallSubjectTotal   = 0;
  const startTs = Date.now();
  let overlay = null;

  // ── localStorage progress ─────────────────────────────────────────────────
  function getDoneSubjects() {
    try { return JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch { return []; }
  }
  function markSubjectDone(name) {
    const done = getDoneSubjects();
    if (!done.includes(name)) { done.push(name); localStorage.setItem(DONE_KEY, JSON.stringify(done)); }
  }
  function saveInflight() {
    try {
      localStorage.setItem(ROWS_KEY, JSON.stringify({ rows: allRows, subject: currentSubject, ts: Date.now() }));
    } catch {}
  }
  function clearInflight() { localStorage.removeItem(ROWS_KEY); }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  }
  function rectKey(el) {
    const r = el.getBoundingClientRect();
    return `${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.width)}:${Math.round(r.height)}`;
  }
  function clickElement(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + Math.min(r.width - 4, Math.max(4, r.width / 2));
    const y = r.top  + Math.min(r.height - 4, Math.max(4, r.height / 2));
    for (const type of ["pointerdown", "mousedown", "mouseup", "click"]) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
    }
  }
  async function closeDropdown() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    await sleep(180);
  }
  function getVisibleOptions() {
    return Array.from(document.querySelectorAll("[role='option'], .p-select-option, .p-dropdown-item, .p-multiselect-item"))
      .filter(isVisible).map(o => norm(o.textContent)).filter(Boolean)
      .filter(s => s !== "(No Selection)").filter(s => !/^Select /i.test(s));
  }
  function getOptionElements() {
    return Array.from(document.querySelectorAll("[role='option'], .p-select-option, .p-dropdown-item, .p-multiselect-item"))
      .filter(isVisible);
  }
  function findDropdownScroller() {
    const option = getOptionElements()[0];
    if (!option) return null;
    for (const sel of [
      '[data-pc-name="virtualscroller"]', '[data-pc-section="content"]',
      '.p-virtualscroller', '.p-scroller', '.p-select-overlay', '.p-dropdown-panel', '[role="listbox"]',
    ]) {
      const el = document.querySelector(sel);
      if (el && isVisible(el) && el.scrollHeight > el.clientHeight + 2) return el;
    }
    let cur = option.parentElement;
    while (cur && cur !== document.body) {
      const s = window.getComputedStyle(cur);
      if (/(auto|scroll|hidden)/i.test(s.overflowY) && cur.scrollHeight > cur.clientHeight + 2) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  function getClickableAncestor(el) {
    let cur = el;
    for (let i = 0; i < 5 && cur; i++) {
      if (cur.matches?.("[role='combobox'], button, .p-select, .p-dropdown, .p-multiselect") ||
          cur.getAttribute?.("aria-haspopup") === "listbox") return cur;
      cur = cur.parentElement;
    }
    return el;
  }
  function getDropdownCandidates() {
    const selector = [
      "[role='combobox']", "button[aria-haspopup='listbox']",
      ".p-select", ".p-dropdown", ".p-multiselect",
      ".p-select-label", ".p-dropdown-label", ".p-multiselect-label",
    ].join(",");
    const raw = Array.from(document.querySelectorAll(selector))
      .filter(isVisible).map(getClickableAncestor).filter(isVisible);
    const seen = new Set();
    return raw.filter(el => {
      const key = rectKey(el);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => {
      const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      return ar.top - br.top || ar.left - br.left;
    });
  }

  // ── Overlay ────────────────────────────────────────────────────────────────
  function makeOverlay() {
    if (!CONFIG.showOverlay) return;
    overlay = document.createElement("div");
    overlay.id = "udc-scraper-overlay";
    overlay.style.cssText = [
      "position:fixed", "bottom:14px", "right:14px", "z-index:2147483647",
      "background:#0b3a27", "color:#adff2f",
      "font-family:ui-monospace,SFMono-Regular,Menlo,monospace",
      "font-size:12px", "padding:12px 14px", "border-radius:8px",
      "max-width:500px", "box-shadow:0 8px 24px rgba(0,0,0,0.35)", "line-height:1.5",
    ].join(";");
    overlay.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;color:#fff;">UDC batch scraper running</div>
      <div id="udc-prog"></div>
      <button id="udc-stop" style="margin-top:8px;background:#5c1a1a;color:#fff;border:0;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">
        Stop after this subject
      </button>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#udc-stop").addEventListener("click", () => {
      window.__udcStop = true;
      overlay.querySelector("#udc-stop").textContent = "Stopping after this subject…";
    });
  }
  function updateOverlay() {
    if (!overlay) return;
    const elapsed = Math.round((Date.now() - startTs) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    overlay.querySelector("#udc-prog").innerHTML = `
      Subject: ${overallSubjectIndex} / ${overallSubjectTotal} — ${currentSubject}<br>
      Course:  ${doneCoursesInSubject} / ${totalCoursesInSubject} — ${currentCourse}<br>
      Rows (this subject): ${allRows.length.toLocaleString()}<br>
      Elapsed: ${mm}:${ss}
    `;
  }
  function dropOverlay() { if (overlay) overlay.remove(); }

  // ── Dropdown enumeration ──────────────────────────────────────────────────
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

  async function collectOptionsFromControl(control, maxScrolls = 200) {
    const opened = await openControl(control);
    const seen = new Set();
    if (!opened) { await closeDropdown(); return []; }

    const filter = document.querySelector(
      ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-multiselect-filter, .p-inputtext"
    );

    if (filter && isVisible(filter)) {
      // Virtualized dropdown — iterate A-Z through the filter box to collect all options.
      for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        if (getVisibleOptions().length === 0) {
          if (!await openControl(control)) continue;
        }
        const f = document.querySelector(
          ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-multiselect-filter, .p-inputtext"
        );
        if (!f || !isVisible(f)) break;
        f.focus(); f.value = letter;
        f.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(350);
        let stableRounds = 0, prevSize = seen.size;
        for (let i = 0; i < 40; i++) {
          getVisibleOptions().forEach(x => seen.add(x));
          const scroller = findDropdownScroller();
          if (!scroller) { stableRounds += 2; }
          else {
            const before = scroller.scrollTop;
            scroller.scrollTop += Math.max(120, scroller.clientHeight * 0.85);
            scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
            await sleep(100);
            if (scroller.scrollTop === before) stableRounds++;
          }
          if (seen.size === prevSize) stableRounds++;
          else { stableRounds = 0; prevSize = seen.size; }
          if (stableRounds >= 4) break;
        }
        getVisibleOptions().forEach(x => seen.add(x));
      }
      // Clear filter before closing.
      const f = document.querySelector(
        ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-multiselect-filter, .p-inputtext"
      );
      if (f && isVisible(f)) { f.value = ""; f.dispatchEvent(new Event("input", { bubbles: true })); await sleep(150); }
    } else {
      let stableRounds = 0, previousSize = 0;
      for (let i = 0; i < maxScrolls; i++) {
        getVisibleOptions().forEach(x => seen.add(x));
        const scroller = findDropdownScroller();
        if (!scroller) { stableRounds++; }
        else {
          const beforeTop = scroller.scrollTop;
          scroller.scrollTop += Math.max(120, scroller.clientHeight * 0.85);
          scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
          await sleep(110);
          if (scroller.scrollTop === beforeTop) stableRounds++;
        }
        if (seen.size === previousSize) stableRounds++;
        else stableRounds = 0;
        previousSize = seen.size;
        if (stableRounds >= 8) break;
      }
    }
    await closeDropdown();
    return Array.from(seen);
  }

  // ── Option classifiers ────────────────────────────────────────────────────
  function looksLikeAcademicYearOption(s) { return /^20\d{2}-\d{2}$/.test(s); }
  function looksLikeSubjectOption(s) {
    return /^[A-Z]{2,6}\s+-\s+/.test(s) && !looksLikeAcademicYearOption(s) && !/\(\s*[A-Z]{2,6}\s*\)$/.test(s);
  }
  function looksLikeCourseOption(s, subjectCode = "") {
    if (!s || looksLikeAcademicYearOption(s) || looksLikeSubjectOption(s)) return false;
    const code = subjectCode.trim().toUpperCase();
    return /^\d{4}[A-Z]?\s+-\s+.+/.test(s) ||
      (code && new RegExp(`\\(${code}\\)$`, "i").test(s)) ||
      /\([A-Z]{2,6}\)$/.test(s);
  }

  // ── Control detection ─────────────────────────────────────────────────────
  async function findSubjectControl() {
    const candidates = getDropdownCandidates();
    const scored = [];
    for (const c of candidates) {
      const options = await collectOptionsFromControl(c, 100);
      const subjectCount = options.filter(looksLikeSubjectOption).length;
      const yearCount    = options.filter(looksLikeAcademicYearOption).length;
      const courseCount  = options.filter(x => looksLikeCourseOption(x)).length;
      scored.push({ control: c, options, score: subjectCount * 20 - yearCount * 20 - courseCount * 5, subjectCount });
    }
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.subjectCount < 3) throw new Error("Could not identify Subject dropdown.");
    return { control: best.control, options: best.options.filter(looksLikeSubjectOption) };
  }

  async function findCourseControl(selectedSubjectText) {
    const subjectCode = selectedSubjectText.split(" - ")[0].trim().toUpperCase();
    const candidates = getDropdownCandidates();
    const scored = [];
    for (const c of candidates) {
      if (c === subjectControl) continue;
      const options     = await collectOptionsFromControl(c, 200);
      const yearCount   = options.filter(looksLikeAcademicYearOption).length;
      const subjectCount = options.filter(looksLikeSubjectOption).length;
      const courseCount = options.filter(x => looksLikeCourseOption(x, subjectCode)).length;
      const exactCount  = options.filter(x => new RegExp(`\\(${subjectCode}\\)$`, "i").test(x)).length;
      scored.push({
        control: c, options,
        score: courseCount * 80 + exactCount * 40 - yearCount * 100 - subjectCount * 100,
        courseCount, yearCount,
      });
    }
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.courseCount < 1 || best.yearCount > best.courseCount) {
      throw new Error(`Could not identify Course dropdown for ${selectedSubjectText}.`);
    }
    return {
      control: best.control,
      options: best.options.filter(x => looksLikeCourseOption(x, subjectCode)),
    };
  }

  async function selectOptionFromControl(control, optionText) {
    const opened = await openControl(control);
    if (!opened) throw new Error(`Could not open dropdown to select "${optionText}"`);

    const filter = document.querySelector(
      ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-multiselect-filter, .p-inputtext"
    );
    if (filter && isVisible(filter)) {
      filter.focus(); filter.value = "";
      filter.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(120);
      filter.value = optionText.slice(0, Math.min(optionText.length, 24));
      filter.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(350);
    }

    let match = null;
    for (let i = 0; i < 120; i++) {
      const options = getOptionElements();
      match = options.find(o => norm(o.textContent) === optionText) ||
              options.find(o => { const t = norm(o.textContent); return t.includes(optionText) || optionText.includes(t); });
      if (match) break;
      const scroller = findDropdownScroller();
      if (scroller) {
        scroller.scrollTop += Math.max(80, scroller.clientHeight * 0.6);
        scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
        await sleep(120);
      } else {
        const focused = document.activeElement;
        if (focused) focused.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        await sleep(80);
      }
    }

    // Last resort: keyboard type-ahead.
    if (!match) {
      const code = optionText.split(" - ")[0].trim();
      for (const char of code.toLowerCase()) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
        await sleep(150);
      }
      await sleep(600);
      const options = getOptionElements();
      match = options.find(o => norm(o.textContent) === optionText) ||
              options.find(o => { const t = norm(o.textContent); return t.includes(optionText) || optionText.includes(t); });
    }

    if (!match) { await closeDropdown(); throw new Error(`Option not found: "${optionText}"`); }
    match.scrollIntoView({ block: "center" });
    await sleep(100);
    clickElement(match);
    await sleep(550);
  }

  // Read whatever label is currently displayed in the subject dropdown.
  // Searches the whole document rather than relying on candidate traversal,
  // since the label element may not be a direct child of the clickable ancestor.
  function getCurrentSubjectLabel() {
    const labelSelectors = [
      ".p-select-label",
      ".p-dropdown-label",
      ".p-multiselect-label",
      "[data-pc-section='label']",
    ];
    for (const sel of labelSelectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (!isVisible(el)) continue;
        const text = norm(el.textContent);
        if (text && looksLikeSubjectOption(text)) return text;
      }
    }
    return null;
  }

  // ── Table scraping ────────────────────────────────────────────────────────
  function getHeaders() {
    let cells = Array.from(document.querySelectorAll("table thead tr:last-child th, [role='columnheader']"));
    if (!cells.length) cells = Array.from(document.querySelectorAll("th"));
    return cells.map(th => norm(th.textContent).replace(/[↑↓⇅↕]/g, "").trim()).filter(Boolean);
  }
  function getRows() {
    return Array.from(document.querySelectorAll("table tbody tr"))
      .map(tr => Array.from(tr.querySelectorAll("td")).map(td => norm(td.textContent)))
      .filter(row => row.length > 0 && row.some(c => c !== ""));
  }
  function getPagingInfo() {
    const m = document.body.innerText.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i);
    return m ? { start: +m[1], end: +m[2], total: +m[3] } : null;
  }
  async function waitForTablePopulated(timeoutMs = CONFIG.maxWaitForTableMs) {
    const start = Date.now();
    let prevSig = "", stableCount = 0;
    while (Date.now() - start < timeoutMs) {
      const rows = getRows(), headers = getHeaders(), info = getPagingInfo();
      const sig = JSON.stringify({ rows: rows.length, first: rows[0], last: rows[rows.length - 1], info });
      if (sig === prevSig) stableCount++; else stableCount = 0;
      prevSig = sig;
      if (rows.length > 0 && rows.some(r => r.length >= 8) && headers.length >= 8 && stableCount >= 2) return true;
      await sleep(250);
    }
    return false;
  }
  async function clickFirstPageIfPossible() {
    const btn = Array.from(document.querySelectorAll("button")).find(b => {
      const text = `${b.title || ""} ${b.getAttribute("aria-label") || ""}`;
      return /first page/i.test(text) && !b.disabled && !b.classList.contains("p-disabled");
    });
    if (btn) { clickElement(btn); await sleep(500); }
  }
  async function nextPageIfPossible() {
    const btn = Array.from(document.querySelectorAll("button")).find(b => {
      const text = `${b.title || ""} ${b.getAttribute("aria-label") || ""}`;
      return /next page/i.test(text) && !b.disabled && !b.classList.contains("p-disabled");
    });
    if (!btn) return false;
    const before = JSON.stringify({ rows: getRows(), info: getPagingInfo() });
    clickElement(btn);
    for (let i = 0; i < 35; i++) {
      await sleep(150);
      if (JSON.stringify({ rows: getRows(), info: getPagingInfo() }) !== before) return true;
    }
    return false;
  }

  // ── Row mapping ───────────────────────────────────────────────────────────
  function normalizeHeaderName(header) { return norm(header).replace(/−/g, "-").replace(/\s+/g, " ").trim(); }
  function desiredHeaderForActual(actual) {
    const h = normalizeHeaderName(actual);
    const map = {
      "Academic Year": "Academic Year", "Year": "Academic Year",
      "Term": "Term", "Subject": "Subject",
      "Course No.": "Course No.", "Course Number": "Course No.", "Course": "Course No.",
      "Course Title": "Course Title", "Title": "Course Title",
      "Instructor": "Instructor", "GPA": "GPA",
      "A (%)": "A (%)", "A- (%)": "A− (%)",
      "B+ (%)": "B+ (%)", "B (%)": "B (%)", "B- (%)": "B− (%)",
      "C+ (%)": "C+ (%)", "C (%)": "C (%)", "C- (%)": "C− (%)",
      "D+ (%)": "D+ (%)", "D (%)": "D (%)", "D- (%)": "D− (%)",
      "F (%)": "F (%)",
      "Withdraws": "Withdraws", "Withdraw": "Withdraws", "W": "Withdraws",
      "Graded Enrollment": "Graded Enrollment", "Enrollment": "Graded Enrollment",
      "CRN": "CRN", "Credits": "Credits", "Credit": "Credits",
    };
    return map[h] || null;
  }
  function rowToObject(headers, row, subject, course) {
    const obj = {};
    for (const h of DESIRED_HEADERS) obj[h] = "";
    headers.forEach((header, i) => { const d = desiredHeaderForActual(header); if (d) obj[d] = row[i] || ""; });
    if (!obj["Subject"])    obj["Subject"]    = subject.split(" - ")[0] || subject;
    if (!obj["Course No."]) { const m = course.match(/\b\d{4}[A-Z]?\b/); if (m) obj["Course No."] = m[0]; }
    if (!obj["Course Title"]) obj["Course Title"] = course;
    return obj;
  }
  async function scrapeAllPagesForCurrent(subject, course) {
    const headers  = getHeaders();
    const collected = [];
    const seenPages = new Set();
    await clickFirstPageIfPossible();
    for (let safety = 0; safety < 500; safety++) {
      if (window.__udcStop) break;
      await waitForTablePopulated(6000);
      const rows = getRows(), info = getPagingInfo();
      const pageSig = JSON.stringify({ info, first: rows[0], last: rows[rows.length - 1], count: rows.length });
      if (seenPages.has(pageSig)) break;
      seenPages.add(pageSig);
      for (const row of rows) collected.push(rowToObject(headers, row, subject, course));
      if (!info || info.end >= info.total) break;
      if (!await nextPageIfPossible()) break;
    }
    return collected;
  }

  // ── CSV output ────────────────────────────────────────────────────────────
  function objectsToCSV(headers, rows) {
    const esc = v => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [
      headers.map(esc).join(","),
      ...rows.map(r => headers.map(h => esc(r[h] ?? "")).join(",")),
    ].join("\n");
  }
  function downloadCSV(text, filename) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function safeFilenamePart(s) { return s.split(" - ")[0].replace(/[^A-Za-z0-9_-]/g, ""); }

  // ── Main batch loop ───────────────────────────────────────────────────────
  async function main() {
    makeOverlay();
    log("Enumerating all subjects — takes a few seconds...");

    const subjectResult = await findSubjectControl();
    subjectControl      = subjectResult.control;
    const allSubjects   = subjectResult.options;
    overallSubjectTotal = allSubjects.length;
    log(`Found ${allSubjects.length} subjects.`);

    // Determine start point from current dropdown selection.
    const currentLabel = getCurrentSubjectLabel();
    let startIndex = 0;
    if (currentLabel) {
      const startCode = currentLabel.split(" - ")[0].trim();
      const idx = allSubjects.findIndex(s => s === currentLabel || s.split(" - ")[0].trim() === startCode);
      if (idx >= 0) {
        startIndex = idx;
        log(`Starting from currently selected subject: "${currentLabel}" (${startIndex + 1} of ${allSubjects.length})`);
      } else {
        log(`"${currentLabel}" not matched in enumerated list. Starting from the beginning.`);
      }
    } else {
      log("No subject currently selected. Starting from the first subject.");
    }

    for (let si = startIndex; si < allSubjects.length; si++) {
      if (window.__udcStop) { log("Stopped by user."); break; }

      const subject = allSubjects[si];

      // Reset per-subject state.
      allRows               = [];
      doneCoursesInSubject  = 0;
      totalCoursesInSubject = 0;
      currentSubject        = subject;
      currentCourse         = "—";
      overallSubjectIndex   = si + 1;
      updateOverlay();

      log(`\n─── [${si + 1}/${allSubjects.length}] ${subject} ───`);

      // Select this subject in the dropdown.
      try {
        await selectOptionFromControl(subjectControl, subject);
      } catch (err) {
        warn(`Could not select "${subject}": ${err.message}. Skipping.`);
        continue;
      }
      await sleep(CONFIG.delayBetweenSubjects);

      // Find and enumerate the course dropdown for this subject.
      let courseResult;
      try {
        courseResult = await findCourseControl(subject);
      } catch (err) {
        warn(`No course dropdown for "${subject}": ${err.message}. Skipping.`);
        continue;
      }
      courseControl = courseResult.control;
      const subjectCode = subject.split(" - ")[0].trim().toUpperCase();
      const courses = courseResult.options
        .filter(Boolean)
        .filter(x => looksLikeCourseOption(x, subjectCode))
        .filter(x => !looksLikeAcademicYearOption(x))
        .filter(x => !looksLikeSubjectOption(x));

      totalCoursesInSubject = courses.length;
      log(`${subjectCode}: ${courses.length} course(s).`);
      updateOverlay();

      // Scrape each course.
      for (const course of courses) {
        if (window.__udcStop) break;
        currentCourse = course;
        updateOverlay();

        try {
          await selectOptionFromControl(courseControl, course);
        } catch (err) {
          warn(`Skipping "${course}": ${err.message}`);
          doneCoursesInSubject++;
          continue;
        }

        const ready = await waitForTablePopulated();
        if (!ready) {
          warn(`No table loaded for ${subjectCode} / ${course}`);
          doneCoursesInSubject++;
          continue;
        }

        const rows = await scrapeAllPagesForCurrent(subject, course);
        if (rows.length > 0) allRows.push(...rows);
        doneCoursesInSubject++;
        updateOverlay();

        if (doneCoursesInSubject % CONFIG.checkpointEvery === 0) saveInflight();
        await sleep(CONFIG.delayBetweenCourses);
      }

      // Download CSV for this subject.
      const stamp    = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      const safeCode = safeFilenamePart(subject) || "subject";
      const stopped  = window.__udcStop;
      const filename = stopped
        ? `vt_udc_grades_${safeCode}_partial_${stamp}.csv`
        : `vt_udc_grades_${safeCode}_${stamp}.csv`;

      if (allRows.length > 0) {
        downloadCSV(objectsToCSV(DESIRED_HEADERS, allRows), filename);
        log(`Downloaded: ${filename} (${allRows.length} rows)`);
      } else {
        log(`No rows for "${subject}" — nothing to download.`);
      }

      if (!stopped) { markSubjectDone(subject); clearInflight(); }
      if (stopped) break;

      if (si < allSubjects.length - 1) await sleep(CONFIG.delayBetweenSubjects);
    }

    dropOverlay();
    window.__udcRunning = false;
    log("Batch complete. Run window.udcListProgress() to review what was scraped.");
  }

  try {
    await main();
  } catch (err) {
    console.error("[UDC] Fatal error:", err);
    if (allRows.length > 0) {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      downloadCSV(
        objectsToCSV(DESIRED_HEADERS, allRows),
        `vt_udc_grades_${safeFilenamePart(currentSubject)}_error_${stamp}.csv`
      );
    }
    dropOverlay();
    window.__udcRunning = false;
  }
})();
