// Data adapter. The UI only talks to window.MarthaAPI.
// - DemoAPI: in-memory synthetic data (always shows the Demo Mode banner).
// - LiveAPI: calls the martha-web Supabase Edge Function. Never falls back to demo data.
(function () {
  const T = window.MarthaTime;
  const CFG = window.MARTHA_CONFIG || { mode: 'demo' };
  const ACTIVE_WINDOW_DAYS = 14;

  class ApiError extends Error {
    constructor(code, message, status) { super(message); this.code = code; this.status = status; }
  }

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
  };

  // ---------- shared journey logic (mirrors Martha's next-study rules) ----------
  function studyLabel(catalog, key, part) {
    const s = catalog.find((c) => c.key === key);
    const title = s ? s.title : key;
    return part > 1 ? `${title} part ${part}` : title;
  }

  function suggestNext(catalog, events) {
    // "Other" studies never move the series forward.
    const relevant = events.filter((e) => e.status !== 'cancelled' && e.studyKey !== 'other').sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const last = relevant[relevant.length - 1];
    if (!last) return { key: 'intro', part: 1 };
    if (last.outcome === 'partial') return { key: last.studyKey, part: (last.part || 1) + 1 };
    const cur = catalog.find((c) => c.key === last.studyKey);
    if (!cur) return null;
    const next = catalog.filter((c) => c.order > cur.order && c.auto).sort((a, b) => a.order - b.order)[0];
    return next ? { key: next.key, part: 1 } : null;
  }

  // ---------- Demo adapter ----------
  function DemoAPI() {
    const db = window.MarthaMock.build();
    const wait = (v, ms = 140) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
    const now = () => new Date().toISOString();
    const person = (id) => db.people.find((p) => p.personId === id) || null;
    const ref = (id) => { const p = person(id); return p ? { personId: p.personId, name: p.displayName } : null; };
    const talk = (id) => db.talks.find((t) => t.id === id) || null;
    const latestReport = (eventId) => {
      const rs = db.reports.filter((r) => r.eventId === eventId);
      const superseded = new Set(rs.map((r) => r.supersedesId).filter(Boolean));
      return rs.filter((r) => !superseded.has(r.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
    };
    const requireChapter = (ch) => {
      if (!db.viewer.chapters.includes(ch)) throw new ApiError('forbidden', "You don't have access to that chapter.", 403);
    };
    const session = () => store.get('martha.demo.session');
    const requireSession = () => { if (!session()) throw new ApiError('unauthorized', 'Please sign in.', 401); };

    function eventDTO(e) {
      const r = latestReport(e.id);
      const t = talk(e.talkId);
      return {
        id: e.id, chapter: e.chapter, studyKey: e.studyKey, part: e.part, customTitle: e.customTitle || null,
        title: e.studyKey === 'other' ? `${e.customTitle || 'Other study'}${e.part > 1 ? ` part ${e.part}` : ''}` : studyLabel(db.catalog, e.studyKey, e.part),
        startsAt: e.startsAt, endsAt: e.endsAt, status: e.status, audience: e.audience, source: e.source, outcome: e.outcome,
        student: ref(e.studentId), leader: ref(e.leaderId), organizer: ref(e.organizerId), talk: t ? { id: t.id, name: t.name, tone: t.tone } : null,
        location: e.location,
        report: r ? { id: r.id, body: r.body, author: ref(r.authorId), createdAt: r.createdAt, edited: !!r.supersedesId } : null,
      };
    }

    function studentEvents(id) {
      return db.events.filter((e) => e.studentId === id && e.status !== 'cancelled');
    }

    function activity(p) {
      const evs = studentEvents(p.personId);
      const nowIso = now();
      const past = evs.filter((e) => e.startsAt <= nowIso).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
      const future = evs.filter((e) => e.startsAt > nowIso).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const cutoff = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86400000).toISOString();
      const active = !p.studyEnd && (future.length > 0 || (past[0] && past[0].startsAt >= cutoff) || (p.createdAt && p.createdAt >= cutoff));
      const latest = past[0] || future[0] || null;
      return { active: !!active, lastStudy: past[0] ? eventDTO(past[0]) : null, nextStudy: future[0] ? eventDTO(future[0]) : null, talkId: latest ? latest.talkId : null };
    }

    function progress(id) {
      const evs = studentEvents(id);
      return db.catalog.map((c) => {
        const mine = evs.filter((e) => e.studyKey === c.key);
        let state = 'none';
        if (mine.some((e) => e.outcome === 'completed' || (e.outcome === null && e.startsAt <= now() && e.source !== 'imported'))) state = 'done';
        else if (mine.some((e) => e.outcome === 'partial')) state = 'partial';
        else if (mine.some((e) => e.source === 'imported')) state = 'imported';
        else if (mine.some((e) => e.startsAt > now())) state = 'scheduled';
        return { key: c.key, title: c.title, order: c.order, optional: !c.auto, state };
      });
    }

    function personSummary(p) {
      const base = { personId: p.personId, displayName: p.displayName, firstName: p.firstName, aliases: p.aliases, gender: p.gender, type: p.type, phone: p.phone };
      if (p.type === 'student') {
        const a = activity(p);
        const t = talk(a.talkId);
        return { ...base, active: a.active && !p.studyEnd, studyEnd: p.studyEnd || null, lastStudy: a.lastStudy, nextStudy: a.nextStudy, talk: t ? { id: t.id, name: t.name } : null, progress: progress(p.personId) };
      }
      const t = talk(p.talkId);
      return { ...base, role: p.role, talk: t ? { id: t.id, name: t.name } : null, birthday: p.birthday, spirthday: p.spirthday };
    }

    function matches(p, q) {
      if (!q) return true;
      const hay = [p.displayName, ...(p.aliases || [])].join(' ').toLowerCase();
      return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
    }

    function weekRange() {
      const s = T.startOfWeek(T.today());
      const e = T.shiftDay(s, 7);
      return [T.zonedToDate(s.y, s.m, s.d).toISOString(), T.zonedToDate(e.y, e.m, e.d).toISOString()];
    }

    return {
      mode: 'demo',
      catalog: () => db.catalog,

      auth: {
        isSignedIn: () => !!session(),
        async requestCode(phoneRaw) {
          const digits = String(phoneRaw).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
          if (digits.length !== 10) throw new ApiError('bad_phone', 'Enter a 10-digit phone number.', 400);
          const p = db.people.find((x) => x.type === 'disciple' && x.phone.endsWith(digits));
          if (!p) throw new ApiError('not_found', "That number isn't on the disciples list. Ask your ministry leader to add it in Martha.", 404);
          return wait({ sentTo: p.firstName, channel: 'telegram' }, 600);
        },
        async verifyCode(phoneRaw, code) {
          if (!/^\d{6}$/.test(code)) throw new ApiError('bad_code', 'Enter the 6-digit code from Martha.', 400);
          store.set('martha.demo.session', { token: 'demo', at: now() });
          return wait({ ok: true }, 400);
        },
        async signOut() { store.del('martha.demo.session'); return wait({ ok: true }, 100); },
        async devices() { requireSession(); return wait(db.devices); },
        async revokeDevice(id) { db.devices = db.devices.filter((d) => d.id !== id); return wait({ ok: true }); },
        async helpSignIn(personId) {
          const p = person(personId);
          return wait({ sentTo: p ? p.firstName : 'them', channel: 'telegram' }, 500);
        },
      },

      async me() {
        requireSession();
        const p = person(db.viewer.personId);
        return wait({ personId: p.personId, displayName: p.displayName, firstName: p.firstName, chapters: db.chapters.filter((c) => db.viewer.chapters.includes(c.id)).map((c) => ({ ...c, canSeeFallAways: true })), defaultChapter: db.viewer.defaultChapter });
      },

      async overview(ch) {
        requireSession(); requireChapter(ch);
        const chapter = db.chapters.find((c) => c.id === ch);
        const students = db.people.filter((p) => p.chapter === ch && p.type === 'student').map((p) => ({ p, a: activity(p) }));
        const active = students.filter((s) => s.a.active);
        const [ws, we] = weekRange();
        const week = db.events.filter((e) => e.chapter === ch && e.status !== 'cancelled' && e.startsAt >= ws && e.startsAt < we);
        const nowIso = now();
        const upcoming = db.events.filter((e) => e.chapter === ch && e.status !== 'cancelled' && e.endsAt > nowIso)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 6).map(eventDTO);
        const quiet = students.filter((s) => !s.a.active && s.a.lastStudy).map((s) => ({
          personId: s.p.personId, displayName: s.p.displayName, lastStudy: s.a.lastStudy,
          daysQuiet: T.daysBetween(T.dayOf(s.a.lastStudy.startsAt), T.today()),
        })).sort((a, b) => a.daysQuiet - b.daysQuiet);
        const talks = chapter.bibleTalksEnabled ? db.talks.filter((t) => t.chapter === ch).map((t) => ({
          id: t.id, name: t.name, tone: t.tone, leader: ref(t.leaderId), coLeader: ref(t.coLeaderId),
          activeStudents: active.filter((s) => s.a.talkId === t.id).length,
          men: active.filter((s) => s.a.talkId === t.id && s.p.gender === 'men').length,
          women: active.filter((s) => s.a.talkId === t.id && s.p.gender === 'women').length,
        })) : null;
        const t0 = T.today();
        const dates = [];
        for (const p of db.people.filter((x) => x.chapter === ch && x.type === 'disciple')) {
          for (const [kind, v] of [['Birthday', p.birthday], ['Spirthday', p.spirthday]]) {
            if (!v) continue;
            let y = t0.y; let n = T.daysBetween(t0, { y, m: v.m, d: v.d });
            if (n < 0) { y += 1; n = T.daysBetween(t0, { y, m: v.m, d: v.d }); }
            if (n <= 30) dates.push({ kind, personId: p.personId, displayName: p.displayName, m: v.m, d: v.d, inDays: n, years: kind === 'Spirthday' && v.y ? y - v.y : null });
          }
        }
        dates.sort((a, b) => a.inDays - b.inDays);
        const discOrder = db.catalog.find((c) => c.key === 'discipleship').order;
        const recent = new Date(Date.now() - 30 * 86400000).toISOString();
        const hot = students.filter((s) => {
          const evs = studentEvents(s.p.personId);
          const past = evs.some((e) => (db.catalog.find((c) => c.key === e.studyKey) || {}).order > discOrder);
          const isHot = db.hotIds.includes(s.p.personId);
          s.flags = { past, isHot };
          return (past || isHot) && (s.a.nextStudy || (s.a.lastStudy && s.a.lastStudy.startsAt >= recent));
        }).map((s) => {
          const t = talk(s.a.talkId);
          return { personId: s.p.personId, displayName: s.p.displayName, gender: s.p.gender, hot: s.flags.isHot, pastDiscipleship: s.flags.past, active: s.a.active,
            talk: t ? { id: t.id, name: t.name, tone: t.tone } : null, lastStudy: s.a.lastStudy, nextStudy: s.a.nextStudy, progress: progress(s.p.personId) };
        }).sort((a, b) => b.progress.filter((x) => x.state === 'done').length - a.progress.filter((x) => x.state === 'done').length);
        return wait({
          hot,
          chapter,
          activeStudies: { total: active.length, men: active.filter((s) => s.p.gender === 'men').length, women: active.filter((s) => s.p.gender === 'women').length },
          talks, weekCount: week.length, weekDone: week.filter((e) => e.startsAt <= nowIso).length, upcoming, quiet, dates,
          disciples: db.people.filter((p) => p.chapter === ch && p.type === 'disciple').length,
        });
      },

      async people(ch, { type, q = '' } = {}) {
        requireSession(); requireChapter(ch);
        const rows = db.people.filter((p) => p.chapter === ch && p.type === type && matches(p, q.trim()))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)).map((p) => {
            const r = personSummary(p);
            if (type === 'student') r.mine = studentEvents(p.personId).some((e) => e.leaderId === db.viewer.personId || e.organizerId === db.viewer.personId);
            return r;
          });
        return wait(rows, 90);
      },

      async person(ch, id) {
        requireSession(); requireChapter(ch);
        const p = person(id);
        if (!p || p.chapter !== ch) throw new ApiError('not_found', "We couldn't find that person in this chapter.", 404);
        const out = personSummary(p);
        out.email = p.email;
        if (p.type === 'student') {
          const evs = studentEvents(id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const first = evs[0];
          out.firstSetUpBy = first ? ref(first.organizerId) : null;
          out.firstStudyAt = first ? first.startsAt : null;
        out.summary = db.summaries[id] || null;
        } else {
          const nowIso = now();
          const mine = db.events.filter((e) => e.chapter === ch && e.status !== 'cancelled' && (e.leaderId === id || e.organizerId === id));
          out.upcoming = mine.filter((e) => e.endsAt > nowIso).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(eventDTO);
          const since = new Date(Date.now() - 30 * 86400000).toISOString();
          out.ledLast30 = mine.filter((e) => e.leaderId === id && e.startsAt >= since && e.startsAt <= nowIso).length;
          out.setUpLast30 = mine.filter((e) => e.organizerId === id && e.startsAt >= since && e.startsAt <= nowIso).length;
          const studentIds = [...new Set(mine.filter((e) => e.startsAt >= since || e.endsAt > nowIso).map((e) => e.studentId))];
          out.studyingWith = studentIds.map((sid) => personSummary(person(sid)));
          out.encouragements = [...(db.encouragements[id] || [])];
        }
        return wait(out);
      },

      async journey(ch, id) {
        requireSession(); requireChapter(ch);
        const p = person(id);
        if (!p || p.chapter !== ch) throw new ApiError('not_found', "We couldn't find that person in this chapter.", 404);
        const evs = studentEvents(id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        const next = suggestNext(db.catalog, evs);
        return wait({
          entries: evs.map(eventDTO),
          suggestion: next ? { ...next, title: studyLabel(db.catalog, next.key, next.part), minutes: db.catalog.find((c) => c.key === next.key).minutes } : null,
        });
      },

      async events(ch, fromIso, toIso) {
        requireSession(); requireChapter(ch);
        const rows = db.events.filter((e) => e.chapter === ch && e.status !== 'cancelled' && e.startsAt >= fromIso && e.startsAt < toIso)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(eventDTO);
        const talks = db.talks.filter((t) => t.chapter === ch).map((t) => ({ id: t.id, name: t.name, tone: t.tone }));
        return wait({ events: rows, talks });
      },

      async suggest(ch, studentId) {
        const evs = studentEvents(studentId);
        const n = suggestNext(db.catalog, evs);
        return n ? { ...n, title: studyLabel(db.catalog, n.key, n.part) } : null;
      },

      async leaderConflicts(ch, leaderId, startIso, endIso, ignoreId) {
        return db.events.filter((e) => e.chapter === ch && e.status !== 'cancelled' && e.leaderId === leaderId && e.id !== ignoreId && e.startsAt < endIso && e.endsAt > startIso).map(eventDTO);
      },

      async scheduleStudy(ch, f) {
        requireSession(); requireChapter(ch);
        let studentId = f.studentId;
        if (!studentId) {
          const parts = f.newStudent.name.trim().split(/\s+/);
          studentId = `s${db.people.length + 100}`;
          db.people.push({ personId: studentId, chapter: ch, type: 'student', firstName: parts[0], lastName: parts.slice(1).join(' '), displayName: f.newStudent.name.trim(), aliases: [], gender: f.newStudent.gender, phone: f.newStudent.phone || null, email: null, createdAt: now() });
        }
        const student = person(studentId);
        const org = person(f.organizerId);
        const e = {
          id: `e${db.events.length + 1000}`, chapter: ch, studyKey: f.studyKey, customTitle: f.customTitle || null, part: f.part || 1, startsAt: f.startsAt, endsAt: f.endsAt,
          status: 'pending_sync', audience: student.gender, studentId, leaderId: f.leaderId, organizerId: f.organizerId,
          talkId: org ? org.talkId : null, createdById: db.viewer.personId, location: f.location || null, source: 'martha', outcome: null,
        };
        db.events.push(e);
        setTimeout(() => { e.status = 'confirmed'; window.dispatchEvent(new CustomEvent('martha:changed', { detail: { eventId: e.id } })); }, 1800);
        return wait({ event: eventDTO(e), studentId }, 500);
      },

      async removeStudy(ch, eventId) {
        requireSession(); requireChapter(ch);
        const e = db.events.find((x) => x.id === eventId && x.chapter === ch);
        if (!e) throw new ApiError('not_found', 'That study no longer exists.', 404);
        e.status = 'cancelled';
        return wait({ ok: true }, 350);
      },

      async fallAways(ch) {
        requireSession(); requireChapter(ch);
        return wait(db.fallAways.filter((f) => f.chapter === ch));
      },
      async addFallAwayNote(ch, id, body) {
        const f = db.fallAways.find((x) => x.personId === id);
        if (!f) throw new ApiError('not_found', "That disciple isn't on the fall-away list.", 404);
        if (!String(body || '').trim()) throw new ApiError('bad_note', 'Write a note first.', 400);
        f.notes.push({ id: `n${Date.now()}`, body: body.trim(), createdAt: now(), author: ref(db.viewer.personId) });
        return wait({ ok: true }, 250);
      },
      async setStudyEnd(ch, id, reason) {
        requireSession(); requireChapter(ch);
        const p = person(id);
        if (!p || p.type !== 'student') throw new ApiError('not_found', 'Choose a student in this chapter.', 404);
        p.studyEnd = reason ? { reason, at: now() } : null;
        return wait({ studyEnd: p.studyEnd }, 250);
      },
      async addEncouragement(ch, id, item) {
        const it = String(item || '').trim().replace(/\s+/g, ' ');
        if (!it || it.length > 80) throw new ApiError('bad_item', 'Keep it short: up to 80 characters.', 400);
        const list = db.encouragements[id] || (db.encouragements[id] = []);
        const p = person(id);
        if (list.some((x) => x.toLowerCase() === it.toLowerCase())) return wait({ items: list, message: `Already on ${p.firstName}'s list` }, 200);
        list.push(it);
        return wait({ items: list, message: `Saved for ${p.firstName}: ${it}` }, 250);
      },
      async removeEncouragement(ch, id, item) {
        const list = db.encouragements[id] || [];
        db.encouragements[id] = list.filter((x) => x.toLowerCase() !== String(item).toLowerCase());
        return wait({ items: db.encouragements[id], message: `Removed: ${item}` }, 200);
      },

      async saveReport(ch, eventId, { outcome, body }) {
        requireSession(); requireChapter(ch);
        const e = db.events.find((x) => x.id === eventId && x.chapter === ch);
        if (!e) throw new ApiError('not_found', 'That study no longer exists.', 404);
        const prev = latestReport(eventId);
        e.outcome = outcome;
        let summaryUpdating = false;
        if (body && body.trim()) {
          db.reports.push({ id: `r${db.reports.length + 1000}`, eventId, body: body.trim(), authorId: db.viewer.personId, createdAt: now(), supersedesId: prev ? prev.id : null });
          // Demo stand-in for Martha rewriting the summary from every report on file.
          summaryUpdating = true;
          const sid = e.studentId;
          setTimeout(() => {
            const count = db.events.filter((x) => x.studentId === sid && latestReport(x.id)).length;
            const prevSummary = db.summaries[sid];
            const who = person(sid);
            db.summaries[sid] = {
              body: prevSummary ? prevSummary.body : `${who.firstName} is just getting started. ${body.trim().split(/(?<=[.!?])\s/)[0]}`,
              reportCount: count, generatedAt: now(),
            };
          }, 2600);
        }
        return wait({ event: eventDTO(e), summaryUpdating }, 350);
      },
    };
  }

  // ---------- Live adapter (martha-web Edge Function) ----------
  function LiveAPI() {
    const base = CFG.apiBase; // e.g. https://<ref>.supabase.co/functions/v1/martha-web
    let catalogCache = null;
    const token = () => (store.get('martha.session') || {}).token;

    async function call(path, { method = 'GET', body } = {}) {
      let res;
      try {
        res = await fetch(base + path, {
          method,
          headers: { 'content-type': 'application/json', ...(token() ? { authorization: `Bearer ${token()}` } : {}) },
          body: body ? JSON.stringify(body) : undefined,
          cache: 'no-store',
        });
      } catch {
        throw new ApiError('offline', "Can't reach Martha right now. Check your connection and try again.", 0);
      }
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) { store.del('martha.session'); window.dispatchEvent(new Event('martha:signedout')); }
      if (!res.ok) throw new ApiError(json.code || 'error', json.message || 'Something went wrong on the server.', res.status);
      return json;
    }
    const q = (o) => '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString();

    return {
      mode: 'live',
      catalog: () => catalogCache || [],
      auth: {
        isSignedIn: () => !!token(),
        requestCode: (phone) => call('/auth/request-code', { method: 'POST', body: { phone } }),
        async verifyCode(phone, code) {
          const r = await call('/auth/verify-code', { method: 'POST', body: { phone, code, device: navigator.userAgent } });
          store.set('martha.session', { token: r.token, at: new Date().toISOString() });
          return r;
        },
        async signOut() { try { await call('/auth/sign-out', { method: 'POST' }); } finally { store.del('martha.session'); } },
        devices: () => call('/auth/devices'),
        revokeDevice: (id) => call(`/auth/devices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        helpSignIn: (personId) => call('/auth/help-sign-in', { method: 'POST', body: { personId } }),
      },
      async me() { const r = await call('/me'); catalogCache = r.catalog; return r; },
      overview: (ch) => call(`/m/${ch}/overview`),
      people: (ch, o) => call(`/m/${ch}/people${q(o)}`),
      person: (ch, id) => call(`/m/${ch}/people/${encodeURIComponent(id)}`),
      journey: (ch, id) => call(`/m/${ch}/people/${encodeURIComponent(id)}/journey`),
      events: (ch, from, to) => call(`/m/${ch}/events${q({ from, to })}`),
      suggest: (ch, studentId) => call(`/m/${ch}/people/${encodeURIComponent(studentId)}/next-study`),
      leaderConflicts: (ch, leaderId, from, to, ignore) => call(`/m/${ch}/leader-conflicts${q({ leaderId, from, to, ignore })}`),
      scheduleStudy: (ch, f) => call(`/m/${ch}/studies`, { method: 'POST', body: f }),
      removeStudy: (ch, id) => call(`/m/${ch}/studies/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      saveReport: (ch, id, r) => call(`/m/${ch}/studies/${encodeURIComponent(id)}/report`, { method: 'POST', body: r }),
      fallAways: (ch) => call(`/m/${ch}/fall-aways`),
      addFallAwayNote: (ch, id, body) => call(`/m/${ch}/fall-aways/${encodeURIComponent(id)}/notes`, { method: 'POST', body: { body } }),
      setStudyEnd: (ch, id, reason) => call(`/m/${ch}/people/${encodeURIComponent(id)}/study-status`, { method: 'POST', body: { reason } }),
      addEncouragement: (ch, id, item) => call(`/m/${ch}/people/${encodeURIComponent(id)}/encouragements`, { method: 'POST', body: { item } }),
      removeEncouragement: (ch, id, item) => call(`/m/${ch}/people/${encodeURIComponent(id)}/encouragements${q({ item })}`, { method: 'DELETE' }),
    };
  }

  window.MarthaApiError = ApiError;
  window.MarthaStudyLabel = studyLabel;
  window.MarthaAPI = CFG.mode === 'live' ? LiveAPI() : DemoAPI();
})();
