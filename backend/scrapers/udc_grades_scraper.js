/* VT UDC Course Grades Scraper - one subject per run
 *
 * Page:
 *   https://udc.vt.edu/irdata/data/courses/grades
 *
 * How this version works:
 *   - On each run, the script identifies the next Subject that has not
 *     yet been scraped (tracked in localStorage), iterates every Course
 *     under that subject, paginates the table, and downloads a CSV for
 *     just that subject.
 *   - To scrape the next subject, refresh the UDC page, paste the script
 *     again, hit enter. Repeat until all subjects are done.
 *   - Once every subject has been scraped, the next run will tell you so
 *     and exit without doing any work.
 *
 * Filenames:
 *   - Each run downloads `vt_udc_grades_<CODE>_<timestamp>.csv` (e.g.
 *     `vt_udc_grades_CS_2026-04-28-1422.csv`). On a within-subject failure,
 *     the partial download uses `_partial_` in the name and the subject is
 *     NOT marked done, so re-running retries it from scratch.
 *
 * Console helpers (paste into console at any time):
 *   window.udcResetSubjects()        // start over from subject 1
 *   window.udcSkipSubject("CS - …")  // mark a specific subject as done
 *                                    //   without scraping it
 *   window.udcListProgress()         // show done count + next pending
 *   window.__udcStop = true          // stop the current run mid-subject
 *
 * Optional: scrape a specific subject regardless of progress queue:
 *   set CONFIG.forceSubject = "CS - Computer Science" before pasting.
 */
(async () => {
  const CONFIG = {
    delayBetweenCourses: 1000,
    delayBetweenSubjects: 1800,
    maxWaitForTableMs: 25000,
    checkpointEvery: 10,
    showOverlay: true,
    debugControls: true,
    forceSubject: null, // e.g. "CS - Computer Science" to override the queue
  };

  const DESIRED_HEADERS = [
    "Academic Year",
    "Term",
    "Subject",
    "Course No.",
    "Course Title",
    "Instructor",
    "GPA",
    "A (%)",
    "A− (%)",
    "B+ (%)",
    "B (%)",
    "B− (%)",
    "C+ (%)",
    "C (%)",
    "C− (%)",
    "D+ (%)",
    "D (%)",
    "D− (%)",
    "F (%)",
    "Withdraws",
    "Graded Enrollment",
    "CRN",
    "Credits",
  ];

  const DONE_KEY = "udc_grades_done_subjects_v1";
  const ROWS_KEY = "udc_grades_inflight_rows_v1";

  // Helpers exposed to the console for queue management
  window.udcResetSubjects = () => {
    localStorage.removeItem(DONE_KEY);
    localStorage.removeItem(ROWS_KEY);
    console.log("[UDC] Progress reset. Re-run the script to start from the first subject.");
  };
  window.udcSkipSubject = (name) => {
    const done = JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
    if (!done.includes(name)) {
      done.push(name);
      localStorage.setItem(DONE_KEY, JSON.stringify(done));
    }
    console.log(`[UDC] Marked "${name}" as done without scraping.`);
  };
  window.udcListProgress = () => {
    const done = JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
    console.log(`[UDC] Subjects already done: ${done.length}`);
    console.log(done);
    return done;
  };

  if (window.__udcRunning) {
    console.warn("[UDC] Scraper already running. Run window.__udcStop = true to stop.");
    return;
  }
  window.__udcRunning = true;
  window.__udcStop = false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const log = (...args) => console.log("[UDC]", ...args);
  const warn = (...args) => console.warn("[UDC]", ...args);

  const allRows = [];
  let subjectControl = null;
  let courseControl = null;
  let currentSubject = "—";
  let currentCourse = "—";
  let totalCoursesInSubject = 0;
  let doneCoursesInSubject = 0;
  const startTs = Date.now();
  let overlay = null;

  function getDoneSubjects() {
    try {
      return JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function markSubjectDone(name) {
    const done = getDoneSubjects();
    if (!done.includes(name)) {
      done.push(name);
      localStorage.setItem(DONE_KEY, JSON.stringify(done));
    }
  }
  function saveInflight() {
    try {
      localStorage.setItem(
        ROWS_KEY,
        JSON.stringify({ rows: allRows, subject: currentSubject, ts: Date.now() })
      );
    } catch (err) {
      warn("Inflight save failed:", err.message);
    }
  }
  function clearInflight() {
    localStorage.removeItem(ROWS_KEY);
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      s.display !== "none" &&
      s.visibility !== "hidden" &&
      s.opacity !== "0"
    );
  }

  function rectKey(el) {
    const r = el.getBoundingClientRect();
    return `${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.width)}:${Math.round(r.height)}`;
  }

  function makeOverlay() {
    if (!CONFIG.showOverlay) return;
    overlay = document.createElement("div");
    overlay.id = "udc-scraper-overlay";
    overlay.style.cssText = [
      "position:fixed",
      "bottom:14px",
      "right:14px",
      "z-index:2147483647",
      "background:#0b3a27",
      "color:#adff2f",
      "font-family:ui-monospace,SFMono-Regular,Menlo,monospace",
      "font-size:12px",
      "padding:12px 14px",
      "border-radius:8px",
      "max-width:480px",
      "box-shadow:0 8px 24px rgba(0,0,0,0.35)",
      "line-height:1.45",
    ].join(";");
    overlay.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;color:#fff;">UDC scraper running</div>
      <div id="udc-prog"></div>
      <button id="udc-stop" style="margin-top:8px;background:#5c1a1a;color:#fff;border:0;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">
        Stop and save partial
      </button>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#udc-stop").addEventListener("click", () => {
      window.__udcStop = true;
      overlay.querySelector("#udc-stop").textContent = "Stopping…";
    });
  }

  function updateOverlay(extra = {}) {
    if (!overlay) return;
    const elapsed = Math.round((Date.now() - startTs) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    overlay.querySelector("#udc-prog").innerHTML = `
      Subject: ${currentSubject}<br>
      Course: ${currentCourse}<br>
      Course in subject: ${doneCoursesInSubject} / ${totalCoursesInSubject}<br>
      Rows collected: ${allRows.length.toLocaleString()}<br>
      Elapsed: ${mm}:${ss}${extra.note ? `<br>${extra.note}` : ""}
    `;
  }

  function dropOverlay() {
    if (overlay) overlay.remove();
  }

  function getClickableAncestor(el) {
    let cur = el;
    for (let i = 0; i < 5 && cur; i++) {
      if (
        cur.matches?.("[role='combobox'], button, .p-select, .p-dropdown, .p-multiselect") ||
        cur.getAttribute?.("aria-haspopup") === "listbox"
      ) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return el;
  }

  function getDropdownCandidates() {
    const selector = [
      "[role='combobox']",
      "button[aria-haspopup='listbox']",
      ".p-select",
      ".p-dropdown",
      ".p-multiselect",
      ".p-select-label",
      ".p-dropdown-label",
      ".p-multiselect-label",
    ].join(",");
    const raw = Array.from(document.querySelectorAll(selector))
      .filter(isVisible)
      .map(getClickableAncestor)
      .filter(isVisible);
    const seen = new Set();
    const unique = [];
    for (const el of raw) {
      const key = rectKey(el);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(el);
      }
    }
    unique.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return ar.top - br.top || ar.left - br.left;
    });
    return unique;
  }

  function clickElement(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + Math.min(r.width - 4, Math.max(4, r.width / 2));
    const y = r.top + Math.min(r.height - 4, Math.max(4, r.height / 2));
    for (const type of ["pointerdown", "mousedown", "mouseup", "click"]) {
      el.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
        })
      );
    }
  }

  async function closeDropdown() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      })
    );
    await sleep(180);
  }

  function getVisibleOptions() {
    return Array.from(
      document.querySelectorAll(
        "[role='option'], .p-select-option, .p-dropdown-item, .p-multiselect-item"
      )
    )
      .filter(isVisible)
      .map((o) => norm(o.textContent))
      .filter(Boolean)
      .filter((s) => s !== "(No Selection)")
      .filter((s) => !/^Select /i.test(s));
  }

  function getOptionElements() {
    return Array.from(
      document.querySelectorAll(
        "[role='option'], .p-select-option, .p-dropdown-item, .p-multiselect-item"
      )
    ).filter(isVisible);
  }

  function findDropdownScroller() {
    const option = getOptionElements()[0];
    if (!option) return null;

    // PrimeVue uses a VirtualScroller whose outer element has overflow:hidden,
    // but the inner content div IS scrollable. Check for it explicitly first.
    for (const sel of [
      '[data-pc-name="virtualscroller"]',
      '[data-pc-section="content"]',
      '.p-virtualscroller',
      '.p-scroller',
      '.p-select-overlay',
      '.p-dropdown-panel',
      '[role="listbox"]',
    ]) {
      const el = document.querySelector(sel);
      if (el && isVisible(el) && el.scrollHeight > el.clientHeight + 2) return el;
    }

    // Fallback: walk up from the first option element.
    let cur = option.parentElement;
    while (cur && cur !== document.body) {
      const s = window.getComputedStyle(cur);
      const canScroll =
        /(auto|scroll|hidden)/i.test(s.overflowY) && cur.scrollHeight > cur.clientHeight + 2;
      if (canScroll) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

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
    if (!opened) {
      await closeDropdown();
      return [];
    }

    const filter = document.querySelector(
      ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-multiselect-filter, .p-inputtext"
    );

    if (filter && isVisible(filter)) {
      // The dropdown is virtualized — scrolling only renders ~18 items at a time.
      // Instead, iterate A–Z through the filter box to reliably collect every option.
      for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        // Re-open if the dropdown closed between iterations.
        if (getVisibleOptions().length === 0) {
          const reopened = await openControl(control);
          if (!reopened) continue;
        }
        const f = document.querySelector(
          ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-multiselect-filter, .p-inputtext"
        );
        if (!f || !isVisible(f)) break;
        f.focus();
        f.value = letter;
        f.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(350);

        // Scroll through filtered results (usually a short list per letter).
        let stableRounds = 0;
        let prevSize = seen.size;
        for (let i = 0; i < 40; i++) {
          getVisibleOptions().forEach((x) => seen.add(x));
          const scroller = findDropdownScroller();
          if (!scroller) {
            stableRounds += 2;
          } else {
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
        getVisibleOptions().forEach((x) => seen.add(x));
      }

      // Clear filter before closing so the dropdown resets for the next use.
      const f = document.querySelector(
        ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-multiselect-filter, .p-inputtext"
      );
      if (f && isVisible(f)) {
        f.value = "";
        f.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(150);
      }
    } else {
      // No filter input — fall back to the original scroll approach.
      let stableRounds = 0;
      let previousSize = 0;
      for (let i = 0; i < maxScrolls; i++) {
        getVisibleOptions().forEach((x) => seen.add(x));
        const scroller = findDropdownScroller();
        if (!scroller) {
          stableRounds++;
        } else {
          const beforeTop = scroller.scrollTop;
          scroller.scrollTop += Math.max(120, scroller.clientHeight * 0.85);
          scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
          await sleep(110);
          if (scroller.scrollTop === beforeTop) {
            stableRounds++;
          }
        }
        if (seen.size === previousSize) {
          stableRounds++;
        } else {
          stableRounds = 0;
        }
        previousSize = seen.size;
        if (stableRounds >= 8) break;
      }
    }

    await closeDropdown();
    return Array.from(seen);
  }

  function looksLikeAcademicYearOption(s) {
    return /^20\d{2}-\d{2}$/.test(s);
  }

  function looksLikeSubjectOption(s) {
    return (
      /^[A-Z]{2,6}\s+-\s+/.test(s) &&
      !looksLikeAcademicYearOption(s) &&
      !/\(\s*[A-Z]{2,6}\s*\)$/.test(s)
    );
  }

  function looksLikeCourseOption(s, subjectCode = "") {
    if (!s) return false;
    if (looksLikeAcademicYearOption(s)) return false;
    if (looksLikeSubjectOption(s)) return false;
    const code = subjectCode ? subjectCode.trim().toUpperCase() : "";
    const hasCourseNumberDashTitle = /^\d{4}[A-Z]?\s+-\s+.+/.test(s);
    const hasSubjectParen = code && new RegExp(`\\(${code}\\)$`, "i").test(s);
    const hasGenericSubjectParen = /\([A-Z]{2,6}\)$/.test(s);
    return hasCourseNumberDashTitle || hasSubjectParen || hasGenericSubjectParen;
  }

  async function debugControlSnapshots(stage) {
    const candidates = getDropdownCandidates();
    log(`Dropdown candidate snapshot: ${stage}. Found ${candidates.length} candidate(s).`);
    const snapshots = [];
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const r = c.getBoundingClientRect();
      const options = await collectOptionsFromControl(c, 25);
      snapshots.push({
        index: i,
        text: norm(c.textContent).slice(0, 80),
        rect: {
          left: Math.round(r.left),
          top: Math.round(r.top),
          width: Math.round(r.width),
          height: Math.round(r.height),
        },
        optionCount: options.length,
        sample: options.slice(0, 8),
      });
    }
    console.table(
      snapshots.map((s) => ({
        index: s.index,
        text: s.text,
        top: s.rect.top,
        left: s.rect.left,
        optionCount: s.optionCount,
        sample: s.sample.join(" | "),
      }))
    );
    return snapshots;
  }

  async function findSubjectControl() {
    const candidates = getDropdownCandidates();
    const scored = [];
    for (const c of candidates) {
      const options = await collectOptionsFromControl(c, 100);
      const subjectCount = options.filter(looksLikeSubjectOption).length;
      const yearCount = options.filter(looksLikeAcademicYearOption).length;
      const courseCount = options.filter((x) => looksLikeCourseOption(x)).length;
      scored.push({
        control: c,
        options,
        score: subjectCount * 20 - yearCount * 20 - courseCount * 5,
        subjectCount,
        yearCount,
        courseCount,
      });
    }
    scored.sort((a, b) => b.score - a.score);
    if (CONFIG.debugControls) {
      log("Subject-control scoring:");
      console.table(
        scored.map((s, i) => ({
          rank: i,
          score: s.score,
          subjectCount: s.subjectCount,
          yearCount: s.yearCount,
          courseCount: s.courseCount,
          sample: s.options.slice(0, 6).join(" | "),
        }))
      );
    }
    const best = scored[0];
    if (!best || best.subjectCount < 3) {
      throw new Error("Could not identify Subject dropdown.");
    }
    return {
      control: best.control,
      options: best.options.filter(looksLikeSubjectOption),
    };
  }

  async function findCourseControl(selectedSubjectText) {
    const subjectCode = selectedSubjectText.split(" - ")[0].trim().toUpperCase();
    const candidates = getDropdownCandidates();
    const scored = [];
    for (const c of candidates) {
      if (c === subjectControl) continue;
      const options = await collectOptionsFromControl(c, 200);
      const yearCount = options.filter(looksLikeAcademicYearOption).length;
      const subjectCount = options.filter(looksLikeSubjectOption).length;
      const courseCount = options.filter((x) => looksLikeCourseOption(x, subjectCode)).length;
      const exactSubjectCourseCount = options.filter((x) =>
        new RegExp(`\\(${subjectCode}\\)$`, "i").test(x)
      ).length;
      scored.push({
        control: c,
        options,
        score:
          courseCount * 80 +
          exactSubjectCourseCount * 40 -
          yearCount * 100 -
          subjectCount * 100,
        courseCount,
        exactSubjectCourseCount,
        yearCount,
        subjectCount,
      });
    }
    scored.sort((a, b) => b.score - a.score);
    if (CONFIG.debugControls) {
      log(`Course-control scoring after selecting ${selectedSubjectText}:`);
      console.table(
        scored.map((s, i) => ({
          rank: i,
          score: s.score,
          courseCount: s.courseCount,
          exactSubjectCourseCount: s.exactSubjectCourseCount,
          yearCount: s.yearCount,
          subjectCount: s.subjectCount,
          sample: s.options.slice(0, 8).join(" | "),
        }))
      );
    }
    const best = scored[0];
    if (!best || best.courseCount < 1 || best.yearCount > best.courseCount) {
      await debugControlSnapshots(`failed course detection after ${selectedSubjectText}`);
      throw new Error("Could not identify Course dropdown without confusing it with Academic Year.");
    }
    return {
      control: best.control,
      options: best.options.filter((x) => looksLikeCourseOption(x, subjectCode)),
    };
  }

  async function selectOptionFromControl(control, optionText) {
    const opened = await openControl(control);
    if (!opened) {
      throw new Error(`Could not open dropdown to select "${optionText}"`);
    }
    const filter = document.querySelector(
      ".p-select-overlay input, .p-dropdown-filter, .p-select-filter, .p-multiselect-filter, .p-inputtext"
    );
    if (filter && isVisible(filter)) {
      filter.focus();
      filter.value = "";
      filter.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(120);
      filter.value = optionText.slice(0, Math.min(optionText.length, 24));
      filter.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(350);
    }
    let match = null;
    for (let i = 0; i < 120; i++) {
      const options = getOptionElements();
      match = options.find((o) => norm(o.textContent) === optionText);
      if (!match) {
        match = options.find((o) => {
          const text = norm(o.textContent);
          return text.includes(optionText) || optionText.includes(text);
        });
      }
      if (match) break;
      const scroller = findDropdownScroller();
      if (scroller) {
        scroller.scrollTop += Math.max(80, scroller.clientHeight * 0.6);
        scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
        await sleep(120);
      } else {
        // No scrollable container found — try keyboard ArrowDown to move
        // through a PrimeVue VirtualScroller.
        const focused = document.activeElement;
        if (focused) {
          focused.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        }
        await sleep(80);
      }
    }

    // Last resort: keyboard type-ahead (PrimeVue jumps to matching option on keypress).
    if (!match) {
      const code = optionText.split(' - ')[0].trim();
      for (const char of code.toLowerCase()) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
        await sleep(150);
      }
      await sleep(600);
      const options = getOptionElements();
      match = options.find((o) => norm(o.textContent) === optionText) ||
              options.find((o) => {
                const text = norm(o.textContent);
                return text.includes(optionText) || optionText.includes(text);
              });
    }

    if (!match) {
      const visible = getVisibleOptions().slice(0, 12);
      await closeDropdown();
      throw new Error(`Option not found: "${optionText}". Visible sample: ${JSON.stringify(visible)}`);
    }
    match.scrollIntoView({ block: "center" });
    await sleep(100);
    clickElement(match);
    await sleep(550);
  }

  function getHeaders() {
    let headerCells = Array.from(
      document.querySelectorAll("table thead tr:last-child th, [role='columnheader']")
    );
    if (!headerCells.length) {
      headerCells = Array.from(document.querySelectorAll("th"));
    }
    return headerCells
      .map((th) => norm(th.textContent).replace(/[↑↓⇅↕]/g, "").trim())
      .filter(Boolean);
  }

  function getRows() {
    const trs = Array.from(document.querySelectorAll("table tbody tr"));
    return trs
      .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => norm(td.textContent)))
      .filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
  }

  function getPagingInfo() {
    const text = document.body.innerText;
    const match = text.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i);
    if (!match) return null;
    return {
      start: Number(match[1]),
      end: Number(match[2]),
      total: Number(match[3]),
    };
  }

  async function waitForTablePopulated(timeoutMs = CONFIG.maxWaitForTableMs) {
    const start = Date.now();
    let previousSig = "";
    let stableCount = 0;
    while (Date.now() - start < timeoutMs) {
      const rows = getRows();
      const headers = getHeaders();
      const info = getPagingInfo();
      const sig = JSON.stringify({
        rows: rows.length,
        first: rows[0],
        last: rows[rows.length - 1],
        info,
      });
      if (sig === previousSig) stableCount++;
      else stableCount = 0;
      previousSig = sig;
      const hasRows = rows.length > 0;
      const hasEnoughColumns = rows.some((r) => r.length >= 8);
      const hasHeaders = headers.length >= 8;
      if (hasRows && hasEnoughColumns && hasHeaders && stableCount >= 2) {
        return true;
      }
      await sleep(250);
    }
    return false;
  }

  async function clickFirstPageIfPossible() {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => {
      const text = `${b.title || ""} ${b.getAttribute("aria-label") || ""}`;
      return /first page/i.test(text) && !b.disabled && !b.classList.contains("p-disabled");
    });
    if (btn) {
      clickElement(btn);
      await sleep(500);
    }
  }

  async function nextPageIfPossible() {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => {
      const text = `${b.title || ""} ${b.getAttribute("aria-label") || ""}`;
      return /next page/i.test(text) && !b.disabled && !b.classList.contains("p-disabled");
    });
    if (!btn) return false;
    const before = JSON.stringify({
      rows: getRows(),
      info: getPagingInfo(),
    });
    clickElement(btn);
    for (let i = 0; i < 35; i++) {
      await sleep(150);
      const after = JSON.stringify({
        rows: getRows(),
        info: getPagingInfo(),
      });
      if (after !== before) return true;
    }
    return false;
  }

  function normalizeHeaderName(header) {
    return norm(header).replace(/−/g, "-").replace(/\s+/g, " ").trim();
  }

  function desiredHeaderForActual(actual) {
    const h = normalizeHeaderName(actual);
    const map = {
      "Academic Year": "Academic Year",
      "Year": "Academic Year",
      "Term": "Term",
      "Subject": "Subject",
      "Course No.": "Course No.",
      "Course Number": "Course No.",
      "Course": "Course No.",
      "Course Title": "Course Title",
      "Title": "Course Title",
      "Instructor": "Instructor",
      "GPA": "GPA",
      "A (%)": "A (%)",
      "A- (%)": "A− (%)",
      "B+ (%)": "B+ (%)",
      "B (%)": "B (%)",
      "B- (%)": "B− (%)",
      "C+ (%)": "C+ (%)",
      "C (%)": "C (%)",
      "C- (%)": "C− (%)",
      "D+ (%)": "D+ (%)",
      "D (%)": "D (%)",
      "D- (%)": "D− (%)",
      "F (%)": "F (%)",
      "Withdraws": "Withdraws",
      "Withdraw": "Withdraws",
      "W": "Withdraws",
      "Graded Enrollment": "Graded Enrollment",
      "Enrollment": "Graded Enrollment",
      "CRN": "CRN",
      "Credits": "Credits",
      "Credit": "Credits",
    };
    return map[h] || null;
  }

  function rowToObject(headers, row, subject, course) {
    const obj = {};
    for (const h of DESIRED_HEADERS) obj[h] = "";
    headers.forEach((header, index) => {
      const desired = desiredHeaderForActual(header);
      if (desired) {
        obj[desired] = row[index] || "";
      }
    });
    if (!obj["Subject"]) {
      obj["Subject"] = subject.split(" - ")[0] || subject;
    }
    if (!obj["Course No."]) {
      const match = course.match(/\b\d{4}[A-Z]?\b/);
      if (match) obj["Course No."] = match[0];
    }
    if (!obj["Course Title"]) {
      obj["Course Title"] = course;
    }
    return obj;
  }

  async function scrapeAllPagesForCurrent(subject, course) {
    const headers = getHeaders();
    const collected = [];
    const seenPages = new Set();
    await clickFirstPageIfPossible();
    for (let safety = 0; safety < 500; safety++) {
      if (window.__udcStop) break;
      await waitForTablePopulated(6000);
      const rows = getRows();
      const info = getPagingInfo();
      const pageSig = JSON.stringify({
        info,
        first: rows[0],
        last: rows[rows.length - 1],
        count: rows.length,
      });
      if (seenPages.has(pageSig)) break;
      seenPages.add(pageSig);
      for (const row of rows) {
        collected.push(rowToObject(headers, row, subject, course));
      }
      if (!info || info.end >= info.total) break;
      const moved = await nextPageIfPossible();
      if (!moved) break;
    }
    return collected;
  }

  function objectsToCSV(headers, rows) {
    const esc = (value) => {
      const s = value == null ? "" : String(value);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [];
    lines.push(headers.map(esc).join(","));
    for (const row of rows) {
      lines.push(headers.map((h) => esc(row[h] ?? "")).join(","));
    }
    return lines.join("\n");
  }

  function downloadCSV(text, filename) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  function safeFilenamePart(s) {
    return s.split(" - ")[0].replace(/[^A-Za-z0-9_-]/g, "");
  }

  async function main() {
    makeOverlay();
    log("Scanning dropdown controls...");
    if (CONFIG.debugControls) {
      await debugControlSnapshots("initial page load");
    }

    log("Finding Subject dropdown by option content...");
    const subjectResult = await findSubjectControl();
    subjectControl = subjectResult.control;
    const allSubjects = subjectResult.options;
    const doneSubjects = getDoneSubjects();
    const remaining = allSubjects.filter((s) => !doneSubjects.includes(s));

    log(`Total subjects on page: ${allSubjects.length}`);
    log(`Already done: ${doneSubjects.length}`);
    log(`Remaining: ${remaining.length}`);

    let nextSubject;
    if (CONFIG.forceSubject) {
      nextSubject = allSubjects.find(
        (s) => s === CONFIG.forceSubject || s.startsWith(CONFIG.forceSubject)
      );
      if (!nextSubject) {
        // The virtualized dropdown only showed the first ~18 subjects and this one
        // wasn't among them. Trust the config value — selectOptionFromControl will
        // scroll/keyboard-navigate the dropdown to find it.
        log(`"${CONFIG.forceSubject}" not in enumerated list — will scroll to it directly.`);
        nextSubject = CONFIG.forceSubject;
      }
      log(`forceSubject override: ${nextSubject}`);
    } else if (remaining.length === 0) {
      log("All subjects have been scraped. Nothing to do.");
      log("To start over: window.udcResetSubjects() then re-run.");
      dropOverlay();
      window.__udcRunning = false;
      return { status: "all_done", total: allSubjects.length };
    } else {
      nextSubject = remaining[0];
    }

    currentSubject = nextSubject;
    updateOverlay({ note: `Subject ${doneSubjects.length + 1} of ${allSubjects.length}` });
    log(`Scraping subject ${doneSubjects.length + 1} of ${allSubjects.length}: ${nextSubject}`);

    try {
      log(`Selecting subject: ${nextSubject}`);
      await selectOptionFromControl(subjectControl, nextSubject);
    } catch (err) {
      throw new Error(`Could not select subject "${nextSubject}": ${err.message}`);
    }
    await sleep(CONFIG.delayBetweenSubjects);

    log(`Finding Course dropdown after subject: ${nextSubject}`);
    const courseResult = await findCourseControl(nextSubject);
    courseControl = courseResult.control;
    const subjectCode = nextSubject.split(" - ")[0].trim().toUpperCase();
    const courses = courseResult.options
      .filter(Boolean)
      .filter((x) => looksLikeCourseOption(x, subjectCode))
      .filter((x) => !looksLikeAcademicYearOption(x))
      .filter((x) => !looksLikeSubjectOption(x));

    log(`Course options detected for ${nextSubject}:`, courses.slice(0, 12));
    log(`${nextSubject}: found ${courses.length} course(s).`);
    totalCoursesInSubject = courses.length;

    for (const course of courses) {
      if (window.__udcStop) break;
      currentCourse = course;
      updateOverlay({ note: `Subject ${doneSubjects.length + 1} of ${allSubjects.length}` });
      try {
        log(`Selecting course: ${nextSubject} / ${course}`);
        await selectOptionFromControl(courseControl, course);
      } catch (err) {
        warn(`Skipping course. Could not select "${course}":`, err.message);
        doneCoursesInSubject++;
        updateOverlay();
        continue;
      }
      const ready = await waitForTablePopulated();
      if (!ready) {
        warn(`No table data loaded for: ${nextSubject} / ${course}`);
        doneCoursesInSubject++;
        updateOverlay();
        continue;
      }
      const rows = await scrapeAllPagesForCurrent(nextSubject, course);
      if (rows.length === 0) {
        warn(`Zero rows collected for: ${nextSubject} / ${course}`);
      } else {
        allRows.push(...rows);
        log(`Collected ${rows.length} row(s) for ${nextSubject} / ${course}`);
      }
      doneCoursesInSubject++;
      updateOverlay();
      if (doneCoursesInSubject % CONFIG.checkpointEvery === 0) {
        saveInflight();
      }
      await sleep(CONFIG.delayBetweenCourses);
    }

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const safeCode = safeFilenamePart(nextSubject) || "subject";
    const stopped = window.__udcStop;
    const filename = stopped
      ? `vt_udc_grades_${safeCode}_partial_${stamp}.csv`
      : `vt_udc_grades_${safeCode}_${stamp}.csv`;
    const csv = objectsToCSV(DESIRED_HEADERS, allRows);
    downloadCSV(csv, filename);

    if (!stopped) {
      markSubjectDone(nextSubject);
      clearInflight();
      const newDone = getDoneSubjects();
      const newRemaining = allSubjects.length - newDone.length;
      log(`Done with ${nextSubject}. Rows: ${allRows.length}. File: ${filename}`);
      log(`Subjects done: ${newDone.length} / ${allSubjects.length}. Remaining: ${newRemaining}.`);
      if (newRemaining > 0) {
        log(`Next subject in queue: ${allSubjects.find((s) => !newDone.includes(s))}`);
        log("Refresh the page and re-run the script to scrape it.");
      } else {
        log("All subjects complete. Run window.udcResetSubjects() to start over.");
      }
    } else {
      log(`Stopped early. Partial CSV: ${filename}. Subject NOT marked done; re-run to retry.`);
    }

    dropOverlay();
    window.__udcRunning = false;
    return {
      status: stopped ? "stopped" : "ok",
      subject: nextSubject,
      rows: allRows.length,
      coursesProcessed: doneCoursesInSubject,
      file: filename,
    };
  }

  try {
    return await main();
  } catch (err) {
    console.error("[UDC] Fatal error:", err);
    if (allRows.length) {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      const safeCode = safeFilenamePart(currentSubject) || "subject";
      const csv = objectsToCSV(DESIRED_HEADERS, allRows);
      downloadCSV(csv, `vt_udc_grades_${safeCode}_error_${stamp}.csv`);
    }
    dropOverlay();
    window.__udcRunning = false;
  }
})();
