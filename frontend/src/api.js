// src/api.js
// Query functions for the Darvis frontend.
// All functions return data in the shape the existing components expect.

window.API = {

  // Returns courses matching the given filters.
  // Filtering happens server-side in Supabase — fast even with a large table.
  async getCourses({ q, subjects, minGpa, minCredits, pathway, limit = 250, offset = 0 } = {}) {
    let query = window.darvisDb.from('courses').select('*');

    if (subjects && subjects.length) {
      query = query.in('subject', subjects);
    }
    if (minGpa) {
      query = query.gte('avg_gpa', parseFloat(minGpa));
    }
    if (minCredits) {
      const c = parseInt(minCredits);
      if (c >= 4) {
        // "4+" — everything 4 credits or more
        query = query.gte('credits', 3.6);
      } else {
        // Exact match with ±0.4 bracket for 1, 2, 3
        query = query.gte('credits', c - 0.4).lte('credits', c + 0.4);
      }
    }
    if (pathway) {
      // Postgres array containment: pathways @> ARRAY['5a']
      query = query.contains('pathways', [pathway]);
    }
    if (q && q.trim()) {
      const safe = q.trim().replace(/[%_]/g, '\\$&');
      const parts = safe.split(/\s+/);
      let orFilter = `title.ilike.%${safe}%,course_number.ilike.%${safe}%,subject.ilike.%${safe}%`;
      if (parts.length >= 2) {
        // Handle "CS 1014" style queries — first token is subject, rest is course number
        const subj = parts[0];
        const num  = parts.slice(1).join(' ');
        orFilter += `,and(subject.ilike.%${subj}%,course_number.ilike.%${num}%)`;
      }
      query = query.or(orFilter);
    }

    query = query
      .order('subject')
      .order('course_number')
      .range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(formatCourse);
  },

  // Returns the distinct subject codes present in the courses table.
  async getSubjects() {
    const { data, error } = await window.darvisDb
      .from('courses')
      .select('subject')
      .order('subject');
    if (error) throw error;
    return [...new Set((data || []).map(r => r.subject))];
  },

  // Returns a single course by subject + course_number, plus its raw grade rows.
  async getCourse(subject, number) {
    const [courseRes, gradesRes] = await Promise.all([
      window.darvisDb
        .from('courses')
        .select('*')
        .eq('subject', subject.toUpperCase())
        .eq('course_number', number)
        .single(),
      window.darvisDb
        .from('grades')
        .select('*')
        .eq('subject', subject.toUpperCase())
        .eq('course_number', number)
        .order('academic_year', { ascending: false })
        .order('term', { ascending: false }),
    ]);
    if (courseRes.error) throw courseRes.error;
    const course = formatCourse(courseRes.data);
    const grades = gradesRes.data || [];
    // Distinct instructors
    course.instructors = [...new Set(grades.map(r => r.instructor).filter(Boolean))].sort();
    // Grade trend by term
    course.gradesByTerm = buildTermTrend(grades);
    // Raw per-section rows for the breakdown table in CourseDetail
    course.rawSections = grades.map(r => ({
      academicYear:     r.academic_year,
      term:             r.term,
      crn:              r.crn,
      instructor:       r.instructor || 'Unknown',
      gpa:              r.gpa != null ? parseFloat(r.gpa) : null,
      gradedEnrollment: r.graded_enrollment || 0,
      withdraws:        r.withdraws || 0,
      gradeDistribution: {
        'A':   r.a_pct        || 0,
        'A-':  r.a_minus_pct  || 0,
        'B+':  r.b_plus_pct   || 0,
        'B':   r.b_pct        || 0,
        'B-':  r.b_minus_pct  || 0,
        'C+':  r.c_plus_pct   || 0,
        'C':   r.c_pct        || 0,
        'C-':  r.c_minus_pct  || 0,
        'D+':  r.d_plus_pct   || 0,
        'D':   r.d_pct        || 0,
        'D-':  r.d_minus_pct  || 0,
        'F':   r.f_pct        || 0,
      },
    }));
    return course;
  },
};

// ── Helpers ────────────────────────────────────────────────────────

// Maps a Supabase courses row into the shape components expect.
function formatCourse(row) {
  return {
    id:            row.id,
    subject:       row.subject,
    number:        row.course_number,
    title:         row.title || `${row.subject} ${row.course_number}`,
    credits:       row.credits   || 3,
    avgGpa:        row.avg_gpa   || 0,
    description:   row.description || '',
    pathways:      row.pathways  || [],
    totalSections: row.total_sections || 0,
    // Grade distribution in the shape GradeGrid expects
    gradeDistribution: {
      'A':   row.a_pct        || 0,
      'A-':  row.a_minus_pct  || 0,
      'B+':  row.b_plus_pct   || 0,
      'B':   row.b_pct        || 0,
      'B-':  row.b_minus_pct  || 0,
      'C+':  row.c_plus_pct   || 0,
      'C':   row.c_pct        || 0,
      'C-':  row.c_minus_pct  || 0,
      'D+':  row.d_plus_pct   || 0,
      'D':   row.d_pct        || 0,
      'D-':  row.d_minus_pct  || 0,
      'F':   row.f_pct        || 0,
    },
    // Phase 2 (timetable) and Phase 3 (RMP) — not yet populated
    profIds:  [],
    sections: [],
  };
}

// Aggregates raw grade rows into a per-term summary for the trend chart.
function buildTermTrend(rows) {
  const byKey = {};
  for (const r of rows) {
    const key = `${r.academic_year}|${r.term}`;
    if (!byKey[key]) {
      byKey[key] = { term: r.term, academic_year: r.academic_year, gpas: [], sections: 0 };
    }
    if (r.gpa) byKey[key].gpas.push(r.gpa);
    byKey[key].sections++;
  }
  return Object.values(byKey).map(t => ({
    term:          t.term,
    academic_year: t.academic_year,
    avg_gpa:       t.gpas.length ? +(t.gpas.reduce((a, b) => a + b, 0) / t.gpas.length).toFixed(2) : null,
    sections:      t.sections,
  })).sort((a, b) => {
    if (b.academic_year !== a.academic_year) return b.academic_year > a.academic_year ? 1 : -1;
    return b.term > a.term ? 1 : -1;
  });
}
