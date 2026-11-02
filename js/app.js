(function () {
  const API = window.MarthaAPI;
  const T = window.MarthaTime;
  const CFG = window.MARTHA_CONFIG;
  const label = window.MarthaStudyLabel;

  // ---------- utilities ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };
  const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const prettyPhone = (p) => {
    const d = String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (p || '');
  };
  const genderLabel = (g) => (g === 'men' ? "Men's" : g === 'women' ? "Women's" : 'Group not confirmed');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
  const myId = () => (state.me && state.me.personIdByChapter && state.me.personIdByChapter[state.chapter]) || (state.me && state.me.personId);
  const tz = () => (state.chapterInfo && state.chapterInfo.timezone) || T.DEFAULT_TZ;

  const I = {
    home: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>',
    students: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.3c1.6.7 2.6 2.3 3 4.7"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    disciples: '<path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z"/>',
    schedule: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M12 12.5v5M9.5 15h5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    chevron: '<path d="m7 10 5 5 5-5"/>',
    left: '<path d="m14.5 6-6 6 6 6"/>',
    right: '<path d="m9.5 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z"/>',
    send: '<path d="M20 4 3.5 10.6l6.4 2.6 2.6 6.4z"/><path d="m9.9 13.2 4-4"/>',
    device: '<rect x="7" y="3.5" width="10" height="17" rx="2.5"/><path d="M11 17.5h2"/>',
    out: '<path d="M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h9"/>',
    chat: '<path d="M5 18.5V6.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  };
  const icon = (n) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  function catalog() { return API.catalog(); }
  function studyColor(key) {
    // First light to sunrise: pre-dawn indigo -> magenta -> coral -> tangerine -> gold
    const s = catalog().find((x) => x.key === key);
    if (!s) return { c: 'oklch(0.52 0.09 320)', on: '#ffffff' }; // "Other" studies: muted dusk plum
    const t = (s.order - 1) / 11;
    const L = 0.42 + 0.43 * t;
    const C = 0.16 + 0.06 * Math.sin(Math.PI * t);
    const H = (285 + 160 * t) % 360;
    return { c: `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`, on: L < 0.64 ? '#ffffff' : '#2a1626' };
  }
  const toneVar = (tone) => (tone === 'rose' ? 'var(--rose)' : tone === 'green' ? 'var(--green)' : 'var(--slate)');

  function toast(msg) {
    $$('.toast').forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); if (btn) { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500); } }
    catch { toast(`Copy didn't work here. The number is ${text}`); }
  }

  // ---------- state & routing ----------
  const state = {
    me: null, chapter: null, chapterInfo: null,
    pendingOpen: null,
    journey: null,
    cal: { week: null, men: true, women: true, hiddenTalks: new Set() },
    students: { q: '', gender: 'all', status: 'all' },
    disciples: { q: '' },
    signin: { step: 'phone', phone: '', error: '', busy: false },
  };

  function parseRoute() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    for (const [prefix, name] of [['student-', 'student'], ['disciple-', 'disciple'], ['schedule-', 'schedule']]) {
      if (h.startsWith(prefix)) return { name, id: h.slice(prefix.length) };
    }
    if (['students', 'disciples', 'calendar', 'schedule'].includes(h)) return { name: h };
    return { name: 'home' };
  }
  const go = (hash) => { if (location.hash === '#' + hash) render(); else location.hash = hash; };

  // ---------- shell ----------
  const NAV = [['home', 'Home', 'home'], ['students', 'Students', 'students'], ['calendar', 'Calendar', 'calendar'], ['disciples', 'Disciples', 'disciples'], ['schedule', 'Schedule', 'schedule']];
  function navSection(route) {
    if (route.name === 'student') return 'students';
    if (route.name === 'disciple') return 'disciples';
    return route.name;
  }

  function chapterControl() {
    const chs = state.me.chapters;
    if (chs.length < 2) return `<span class="chapter-static">${esc(state.chapterInfo.name)}</span>`;
    return `<button class="chapter-switch" data-action="chapters" aria-label="Switch chapter, current ${esc(state.chapterInfo.name)}">${esc(state.chapterInfo.name)}${icon('swap')}</button>`;
  }

  function renderShell(route) {
    const cur = navSection(route);
    const links = (cls) => NAV.map(([id, text, ic]) => `<a href="#${id}" ${cur === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${text}</span></a>`).join('');
    const demo = API.mode === 'demo' ? `<div class="demo-banner" role="note"><strong>Demo mode.</strong> <span>Sample people and studies only. Nothing is saved to Martha.</span></div>` : '';
    document.getElementById('app').innerHTML = `
      ${demo}
      <div class="shell">
        <aside class="rail">
          <a class="wordmark" href="#home"><i></i>Martha</a>
          <nav class="nav" aria-label="Main">${links()}</nav>
          <div class="rail-foot">
            <div>${chapterControl()}</div>
            <button class="account-btn" data-action="account"><span class="avatar">${esc(initials(state.me.displayName))}</span><span>${esc(state.me.displayName)}</span></button>
          </div>
        </aside>
        <div style="min-width:0">
          <header class="topbar">
            <a class="wordmark" href="#home"><i></i>Martha</a>
            <div class="topbar-right">${chapterControl()}<button class="avatar" data-action="account" aria-label="Account">${esc(initials(state.me.displayName))}</button></div>
          </header>
          <main class="main" id="main"><div class="container" id="view"></div></main>
        </div>
      </div>
      <nav class="tabbar" aria-label="Main">${links()}</nav>`;
  }

  // ---------- loading / error ----------
  function skeleton(rows = 4) {
    return `<div class="section"><div class="skeleton" style="height:40px;width:min(320px,70%)"></div>${Array.from({ length: rows }, () => '<div class="skeleton" style="height:72px"></div>').join('')}</div>`;
  }
  function errorBox(err, retry = true) {
    const msg = err && err.message ? err.message : "Couldn't load this. Check your connection and try again.";
    return `<div class="state-box" role="alert"><h3>This didn't load</h3><p class="muted">${esc(msg)}</p>${retry ? '<button class="btn ghost sm" data-action="retry">Try again</button>' : ''}</div>`;
  }

  // ---------- main render ----------
  let renderSeq = 0;
  async function render() {
    const seq = ++renderSeq;
    if (!API.auth.isSignedIn()) { state.me = null; return renderSignIn(); }
    if (!state.me) {
      document.getElementById('app').innerHTML = `<div class="signin"><div class="skeleton" style="width:200px;height:40px"></div></div>`;
      try { state.me = await API.me(); }
      catch (e) {
        if (e.status === 401) return renderSignIn();
        document.getElementById('app').innerHTML = `<div class="signin"><div class="signin-card">${errorBox(e)}</div></div>`;
        return;
      }
      const saved = ls.get('martha.chapter');
      state.chapter = state.me.chapters.some((c) => c.id === saved) ? saved : state.me.defaultChapter || state.me.chapters[0].id;
    }
    state.chapterInfo = state.me.chapters.find((c) => c.id === state.chapter);
    const route = parseRoute();
    renderShell(route);
    window.scrollTo(0, 0);
    const view = $('#view');
    view.innerHTML = skeleton();
    const views = { home: viewHome, students: viewStudents, student: viewStudent, disciples: viewDisciples, disciple: viewDisciple, calendar: viewCalendar, schedule: viewSchedule };
    try {
      await views[route.name](view, route, () => seq === renderSeq);
    } catch (e) {
      if (seq !== renderSeq) return;
      if (e.status === 401) return render();
      view.innerHTML = errorBox(e);
    }
    const titleBits = { home: 'Home', students: 'Students', student: 'Student', disciples: 'Disciples', disciple: 'Disciple', calendar: 'Calendar', schedule: 'Schedule' };
    document.title = `${titleBits[route.name]} · Martha`;
  }

  // ---------- Home ----------
  function greeting() {
    const h = T.zonedParts(new Date(), tz()).h;
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function evRow(e, opts = {}) {
    const col = studyColor(e.studyKey);
    const who = opts.showLeader === false ? '' : `<span class="small muted">${e.leader ? esc(e.leader.name.split(' ')[0]) : 'No leader yet'}</span>`;
    const pending = e.status === 'pending_sync' ? '<span class="chip warn">Adding to calendar</span>' : e.status === 'sync_error' ? '<span class="chip bad">Calendar problem</span>' : '';
    return `<a class="ev-row" href="#student-${encodeURIComponent(e.student ? e.student.personId : '')}" data-open="${esc(e.id)}">
      <span class="ev-when"><b>${esc(T.relativeDay(e.startsAt, tz()))}</b>${esc(T.formatTime(e.startsAt, tz()))}</span>
      <span style="min-width:0;display:grid;gap:2px">
        <span class="ev-title"><i class="ev-dot" style="--c:${col.c}"></i><span>${esc(e.student ? e.student.name : 'Student not recorded')}</span></span>
        <span class="row-sub">${esc(e.title)}${e.talk ? ' · ' + esc(e.talk.name) : ''}</span>
      </span>
      <span class="row-end">${pending}${who}</span>
    </a>`;
  }

  function installTip() {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (!ios || standalone || ls.get('martha.installTipDismissed')) return '';
    return `<div class="install-tip"><p><b>Add Martha to your Home Screen</b> so it opens like an app and keeps you signed in. Tap Share, then Add to Home Screen.</p><button class="icon-btn" data-action="dismiss-tip" aria-label="Dismiss">${icon('x')}</button></div>`;
  }

  async function viewHome(view, route, live) {
    const o = await API.overview(state.chapter);
    if (!live()) return;
    const a = o.activeStudies;
    const pct = (n) => (a.total ? (n / a.total) * 100 : 0);
    const maxTalk = o.talks ? Math.max(1, ...o.talks.map((t) => t.activeStudents)) : 1;
    const todayLong = new Intl.DateTimeFormat('en-US', { timeZone: tz(), weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

    const hero = `<section class="panel stat-hero w5" aria-labelledby="h-active">
      <h2 id="h-active">Active Bible studies</h2>
      <div class="big-row"><span class="big num">${a.total}</span><span class="big-label muted">${a.total === 1 ? 'student' : 'students'} studying</span></div>
      <div class="split">
        <div class="split-bar" role="img" aria-label="${a.men} men, ${a.women} women">
          ${a.men ? `<span class="men" style="width:${pct(a.men)}%"></span>` : ''}${a.women ? `<span class="women" style="width:${pct(a.women)}%"></span>` : ''}
        </div>
        <div class="split-legend">
          <div><b class="num">${a.men}</b><span><i style="background:var(--men)"></i>Men</span></div>
          <div><b class="num">${a.women}</b><span><i style="background:var(--women)"></i>Women</span></div>
        </div>
      </div>
      <p class="def">Students with a study in the last 14 days or one on the calendar.</p>
    </section>`;

    const talks = o.talks ? `<section class="panel w7" aria-labelledby="h-talks">
      <div class="section">
        <div class="section-head"><h2 id="h-talks">By Bible Talk</h2></div>
        <div class="talk-rows">
          ${o.talks.map((t) => `<div class="talk-row" style="--tone:${toneVar(t.tone)}">
            <div class="talk-row-top">
              <span class="talk-name"><i></i>${esc(t.name)}</span>
              <span><b class="num">${t.activeStudents}</b> <span class="muted small">active</span></span>
            </div>
            <div class="bar"><span style="width:${(t.activeStudents / maxTalk) * 100}%"></span></div>
            <p class="small muted">${t.men} men · ${t.women} women · Led by ${t.leader ? esc(t.leader.name) : 'Not assigned'}${t.coLeader ? ' and ' + esc(t.coLeader.name) : ''}</p>
          </div>`).join('')}
        </div>
        <p class="def">Counted by the Bible Talk of whoever set up each student's latest study.</p>
      </div>
    </section>` : '';

    const upcoming = `<section class="panel ${o.talks ? 'w7' : 'w7'}" style="padding:0" aria-labelledby="h-week">
      <div style="padding:20px 20px 8px" class="section">
        <div class="section-head"><h2 id="h-week">This week</h2><a href="#calendar">Open calendar</a></div>
        <div class="week-count"><b class="num">${o.weekCount}</b><span class="muted">${o.weekCount === 1 ? 'study' : 'studies'} this week, ${o.weekDone} done so far</span></div>
      </div>
      ${o.upcoming.length ? `<div>${o.upcoming.map((e) => evRow(e)).join('')}</div>` : `<div class="empty"><strong>Nothing coming up</strong><span>Schedule a study and it will show here.</span><a class="btn sm" href="#schedule">Schedule a study</a></div>`}
    </section>`;

    const quiet = `<section class="panel w5" aria-labelledby="h-quiet">
      <div class="section">
        <div class="section-head"><h2 id="h-quiet">Gone quiet</h2></div>
        <p class="small muted">No study in 14+ days and nothing scheduled.</p>
        ${o.quiet.length ? `<div class="list" style="border:0;border-radius:0;background:none">${o.quiet.map((q) => `
          <div class="row" style="padding-inline:0">
            <a href="#student-${encodeURIComponent(q.personId)}" class="row-main" style="text-decoration:none">
              <span class="row-title">${esc(q.displayName)}</span>
              <span class="row-sub">Last: ${esc(q.lastStudy.title)}, ${q.daysQuiet} days ago</span>
            </a>
            <a class="btn ghost sm" href="#schedule-${encodeURIComponent(q.personId)}">Schedule</a>
          </div>`).join('')}</div>` : `<div class="notice ok">${icon('info')}<span>Everyone studying has something recent or scheduled.</span></div>`}
      </div>
    </section>`;

    const dates = `<section class="panel ${o.talks ? 'w12' : 'w6'}" aria-labelledby="h-dates" style="${o.talks ? '' : ''}">
      <div class="section">
        <div class="section-head"><h2 id="h-dates">Birthdays and spirthdays</h2><span class="small muted">Next 30 days</span></div>
        ${o.dates.length ? `<div class="date-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:4px 20px">${o.dates.map((d) => `
          <a class="date-item" href="#disciple-${encodeURIComponent(d.personId)}" style="text-decoration:none">
            <span class="date-badge"><small>${T.MONTHS[d.m - 1].slice(0, 3)}</small><b class="num">${d.d}</b></span>
            <span style="min-width:0"><span class="row-title" style="display:block">${esc(d.displayName)}</span>
            <span class="row-sub" style="display:block">${d.kind === 'Spirthday' ? `Spirthday${d.years ? `, ${plural(d.years, 'year')}` : ''}` : 'Birthday'} · ${d.inDays === 0 ? 'today' : d.inDays === 1 ? 'tomorrow' : `in ${d.inDays} days`}</span></span>
          </a>`).join('')}</div>` : '<p class="muted">None in the next 30 days.</p>'}
      </div>
    </section>`;

    view.innerHTML = `
      <div class="page-head"><div><h1>${greeting()}, ${esc(state.me.firstName)}</h1><p class="sub">${esc(todayLong)} · ${esc(o.chapter.name)} · ${plural(o.disciples, 'disciple')}</p></div>
      <a class="btn" href="#schedule">${icon('plus')}Schedule a study</a></div>
      ${installTip()}
      <div class="dash">
        ${hero}${talks || upcoming}
        ${talks ? upcoming : ''}${o.talks ? quiet : quiet.replace('panel w5', 'panel w6')}
        ${dates}
      </div>`;
  }

  // ---------- Students ----------
  function miniPath(progress) {
    return `<span class="mini-path" aria-hidden="true">${progress.map((p) => `<i class="${p.state}${p.optional ? ' optional' : ''}" style="--c:${studyColor(p.key).c}"></i>`).join('')}</span>`;
  }
  function coreDone(progress) {
    const core = progress.filter((p) => !p.optional);
    return { done: core.filter((p) => p.state === 'done').length, total: core.length };
  }

  async function viewStudents(view, route, live) {
    const s = state.students;
    view.innerHTML = `
      <div class="page-head"><div><h1>Students</h1><p class="sub" id="count-line">People studying the Bible in ${esc(state.chapterInfo.name)}</p></div>
        <a class="btn ghost" href="#schedule">${icon('plus')}New student</a></div>
      <div class="search">${icon('search')}<input class="input" id="student-search" type="search" placeholder="Search students by name" value="${esc(s.q)}" autocomplete="off" aria-label="Search students"></div>
      <div class="toggle-row">
        <div class="seg" role="group" aria-label="Men or women">${[['all', 'All'], ['men', 'Men'], ['women', 'Women']].map(([v, t]) => `<button data-sgender="${v}" aria-pressed="${s.gender === v}">${t}</button>`).join('')}</div>
        <div class="seg" role="group" aria-label="Activity">${[['all', 'Everyone'], ['active', 'Active'], ['quiet', 'Gone quiet']].map(([v, t]) => `<button data-sstatus="${v}" aria-pressed="${s.status === v}">${t}</button>`).join('')}</div>
      </div>
      <div id="student-list">${skeleton(5)}</div>`;
    let rows = await API.people(state.chapter, { type: 'student', q: s.q });
    if (!live()) return;

    const draw = () => {
      const filtered = rows.filter((r) => (s.gender === 'all' || r.gender === s.gender) && (s.status === 'all' || (s.status === 'active' ? r.active : !r.active)));
      $('#count-line').textContent = `${plural(rows.filter((r) => r.active).length, 'active student')} in ${state.chapterInfo.name}`;
      $('#student-list').innerHTML = filtered.length ? `<div class="list">${filtered.map((r) => {
        const sub = r.nextStudy ? `Next: ${r.nextStudy.title}, ${T.relativeDay(r.nextStudy.startsAt, tz())} ${T.formatTime(r.nextStudy.startsAt, tz())}`
          : r.lastStudy ? `Last: ${r.lastStudy.title}, ${T.relativeDay(r.lastStudy.startsAt, tz()).toLowerCase()}` : 'No studies yet';
        return `<a class="row" href="#student-${encodeURIComponent(r.personId)}">
          <span class="avatar ${r.gender || ''}">${esc(initials(r.displayName))}</span>
          <span class="row-main"><span class="row-title">${esc(r.displayName)}</span><span class="row-sub">${esc(sub)}</span></span>
          <span class="row-end">${miniPath(r.progress)}${r.active ? '' : '<span class="chip warn">Gone quiet</span>'}</span>
        </a>`;
      }).join('')}</div>` : `<div class="list"><div class="empty"><strong>${s.q ? `No students match "${esc(s.q)}"` : 'No students here'}</strong><span>${s.q ? 'Check the spelling, or add them as a new student when you schedule their first study.' : 'Try a different filter.'}</span>${s.q ? `<a class="btn sm" href="#schedule">Schedule a first study</a>` : ''}</div></div>`;
    };
    draw();

    let timer;
    $('#student-search').addEventListener('input', (ev) => {
      s.q = ev.target.value;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try { rows = await API.people(state.chapter, { type: 'student', q: s.q }); if (live()) draw(); }
        catch (e) { $('#student-list').innerHTML = errorBox(e); }
      }, 180);
    });
    view.addEventListener('click', (ev) => {
      const g = ev.target.closest('[data-sgender]'); const st = ev.target.closest('[data-sstatus]');
      if (g) { s.gender = g.dataset.sgender; $$('[data-sgender]').forEach((b) => b.setAttribute('aria-pressed', b === g)); draw(); }
      if (st) { s.status = st.dataset.sstatus; $$('[data-sstatus]').forEach((b) => b.setAttribute('aria-pressed', b === st)); draw(); }
    });
  }

  // ---------- Student detail + Journey ----------
  async function viewStudent(view, route, live) {
    const [p, j] = await Promise.all([API.person(state.chapter, route.id), API.journey(state.chapter, route.id)]);
    if (!live()) return;
    const open = state.pendingOpen || (state.journey && state.journey.personId === p.personId ? state.journey.open : null);
    state.pendingOpen = null;
    state.journey = { personId: p.personId, person: p, data: j, open, editing: new Set(), confirming: null };
    const cd = coreDone(p.progress);

    view.innerHTML = `
      <a class="back" href="#students">${icon('left')}Students</a>
      <div class="person-head">
        <span class="avatar lg ${p.gender || ''}">${esc(initials(p.displayName))}</span>
        <div style="min-width:0">
          <h1>${esc(p.displayName)}</h1>
          <div class="person-meta">
            <span class="chip">${esc(genderLabel(p.gender))}</span>
            ${p.active ? '<span class="chip ok"><span class="dot"></span>Active</span>' : '<span class="chip warn">Gone quiet</span>'}
            ${p.talk ? `<span class="chip">${esc(p.talk.name)}</span>` : ''}
          </div>
        </div>
      </div>
      <dl class="facts">
        <div class="fact"><dt>Phone</dt><dd>${p.phone ? `<span class="num">${esc(prettyPhone(p.phone))}</span><button class="copy-btn" data-copy="${esc(prettyPhone(p.phone))}">Copy</button>` : '<span class="muted">Not recorded</span>'}</dd></div>
        <div class="fact"><dt>First study set up by</dt><dd>${p.firstSetUpBy ? `<a href="#disciple-${encodeURIComponent(p.firstSetUpBy.personId)}">${esc(p.firstSetUpBy.name)}</a>` : '<span class="muted">Not recorded</span>'}</dd></div>
        <div class="fact"><dt>Studying since</dt><dd>${p.firstStudyAt ? esc(T.formatDate(p.firstStudyAt, tz(), 'medium')) : '<span class="muted">No studies yet</span>'}</dd></div>
        <div class="fact"><dt>Progress</dt><dd class="num">${cd.done} of ${cd.total} core studies</dd></div>
      </dl>
      <section class="about" id="about" aria-labelledby="h-about">${aboutHTML(p)}</section>
      <section class="journey-panel" aria-labelledby="h-journey">
        <div class="journey-top">
          <div class="path-summary"><h2 id="h-journey">Study journey</h2>${miniPath(p.progress)}</div>
          <div class="journey-nav"><button class="icon-btn" data-scroll="-1" aria-label="Scroll back">${icon('left')}</button><button class="icon-btn" data-scroll="1" aria-label="Scroll forward">${icon('right')}</button></div>
        </div>
        <div class="journey-scroll" id="journey-scroll" tabindex="0" aria-label="Study journey. Scroll sideways to see every study.">
          <div class="journey-track" id="journey-track"></div>
        </div>
      </section>`;
    drawJourney(true);
  }

  function aboutHTML(p, updating) {
    const S = p.summary;
    const head = `<div class="about-head"><h2 id="h-about">Who ${esc(p.firstName)} is</h2>${S ? `<span class="meta">Written by Martha from ${plural(S.reportCount, 'report')}</span>` : ''}</div>`;
    if (updating) return `${head}<p class="text">${S ? esc(S.body) : ''}</p><p class="meta">Martha is updating this with the new report…</p>`;
    if (!S) return `${head}<p class="muted">Martha writes a short summary of ${esc(p.firstName)} once the first study report is in. It updates every time a new report is added.</p>`;
    const long = S.body.length > 220;
    return `${head}<p class="text${long ? ' clamp' : ''}">${esc(S.body)}</p>${long ? '<button class="linkish small" style="justify-self:start" data-more>Read more</button>' : ''}<p class="meta">Updated ${esc(T.formatDate(S.generatedAt, tz(), 'medium'))}</p>`;
  }

  function nodeState(e) {
    const now = new Date().toISOString();
    if (e.source === 'imported') return { cls: 'imported', badge: 'Imported' };
    if (e.status === 'pending_sync') return { cls: 'pending', badge: 'Adding to calendar' };
    if (e.status === 'sync_error') return { cls: 'pending', badge: 'Calendar problem' };
    if (e.startsAt > now) return { cls: 'scheduled', badge: 'Scheduled' };
    if (e.outcome === 'partial') return { cls: 'partial', badge: 'Got partway' };
    if (e.outcome === 'completed') return { cls: 'completed', badge: e.report ? 'Completed' : 'No report' };
    return { cls: 'completed noreport', badge: 'No report yet' };
  }

  function nodeHTML(e, i) {
    const J = state.journey;
    const col = studyColor(e.studyKey);
    const st = nodeState(e);
    const s = catalog().find((c) => c.key === e.studyKey);
    const open = J.open === e.id;
    const pos = i % 2 === 0 ? 'up' : 'down';
    const step = s ? `Study ${s.order}${s.auto ? '' : ' · optional'}` : 'Other study';
    const title = s ? (s.short || s.title) : (e.customTitle || e.title);
    return `<article class="node ${pos} ${st.cls}${s ? '' : ' custom'}${open ? ' open' : ''}" data-node="${esc(e.id)}" style="--c:${col.c};--on:${col.on}">
      <div class="node-card">
        <button class="node-head" data-toggle="${esc(e.id)}" aria-expanded="${open}" aria-controls="body-${esc(e.id)}">
          <span class="node-step"><span>${esc(step)}</span>${icon('chevron')}</span>
          <span class="node-title">${esc(title)}${e.part > 1 ? `<small>Part ${e.part}</small>` : ''}</span>
          <span class="node-foot"><span class="num">${esc(T.formatDate(e.startsAt, tz()))}</span><span class="node-badge">${esc(st.badge)}</span></span>
        </button>
        ${open ? `<div class="node-body" id="body-${esc(e.id)}">${nodeBody(e, st)}</div>` : ''}
      </div>
    </article>`;
  }

  function personLink(r) {
    return r ? `<a href="#disciple-${encodeURIComponent(r.personId)}">${esc(r.name)}</a>` : '<span class="muted">Not recorded</span>';
  }

  function nodeBody(e, st) {
    const J = state.journey;
    const now = new Date().toISOString();
    const future = e.startsAt > now;
    const when = `${T.formatDate(e.startsAt, tz(), 'long')} · ${T.formatRange(e.startsAt, e.endsAt, tz())}`;
    const facts = `<dl class="node-facts">
      <dt>When</dt><dd>${esc(when)}</dd>
      <dt>Led by</dt><dd>${personLink(e.leader)}</dd>
      <dt>Set up by</dt><dd>${personLink(e.organizer)}</dd>
      ${e.talk ? `<dt>Bible Talk</dt><dd>${esc(e.talk.name)}</dd>` : ''}
      ${e.location ? `<dt>Where</dt><dd>${esc(e.location)}</dd>` : ''}
    </dl>`;

    let report = '';
    if (e.source === 'imported') {
      report = `<div class="notice">${icon('info')}<span>Imported from Martha's earlier records. Whether this study was finished wasn't recorded.</span></div>`;
    } else if (future) {
      report = e.status === 'pending_sync' ? `<div class="notice warn">${icon('info')}<span>Martha is adding this to the ${esc(genderLabel(e.audience))} Google Calendar.</span></div>` : '';
    } else if (e.report && !J.editing.has(e.id)) {
      report = `<div class="report">
        <div class="report-head"><h3>Report</h3><button class="btn quiet sm" data-edit="${esc(e.id)}">Edit</button></div>
        <p class="report-body">${esc(e.report.body)}</p>
        <p class="report-meta">${e.report.author ? esc(e.report.author.name) : 'Author not recorded'} · ${esc(T.formatDate(e.report.createdAt, tz(), 'medium'))}${e.report.edited ? ' · edited' : ''}</p>
      </div>`;
    } else {
      const outcome = e.outcome || 'completed';
      const first = J.person.firstName || 'them';
      report = `<form class="form" data-report="${esc(e.id)}">
        <div class="field"><span class="label">How far did you get?</span>
          <div class="outcome-pick">
            <label><input type="radio" name="outcome" value="completed" ${outcome === 'completed' ? 'checked' : ''}>Finished it<small>Next study is the next in the series</small></label>
            <label><input type="radio" name="outcome" value="partial" ${outcome === 'partial' ? 'checked' : ''}>Got partway<small>Next is ${esc(e.studyKey === 'other' ? `${e.customTitle || 'this study'} part ${(e.part || 1) + 1}` : label(catalog(), e.studyKey, (e.part || 1) + 1))}</small></label>
          </div>
        </div>
        <div class="field"><label for="rep-${esc(e.id)}">Report</label>
          <textarea class="input" id="rep-${esc(e.id)}" name="body" required maxlength="8000" placeholder="What did you study? How is ${esc(first)} doing? Anything the next person should know?">${esc(e.report ? e.report.body : '')}</textarea>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" type="submit">Save report</button>
          ${e.report ? `<button class="btn ghost" type="button" data-cancel-edit="${esc(e.id)}">Cancel</button>` : ''}
        </div>
      </form>`;
    }

    let remove = '';
    if (e.source !== 'imported' && (future || (!e.outcome && !e.report))) {
      remove = J.confirming === e.id
        ? `<div class="confirm" role="alert"><span>Remove this study? It comes off ${esc(J.person.firstName)}'s journey and the Google Calendar.</span><div class="btns"><button class="btn danger sm" data-remove="${esc(e.id)}">Remove study</button><button class="btn ghost sm" data-keep>Keep it</button></div></div>`
        : `<button class="btn quiet sm" style="justify-self:start;color:var(--bad)" data-confirm-remove="${esc(e.id)}">${future ? 'Cancel this study' : "Didn't happen? Remove it"}</button>`;
    }
    return facts + report + remove;
  }

  function nextNodeHTML(i) {
    const J = state.journey;
    const sug = J.data.suggestion;
    const open = J.open === 'next';
    const pos = i % 2 === 0 ? 'up' : 'down';
    if (!sug && !open) {
      return `<article class="node ${pos} next done-all" data-node="next"><div class="node-card"><button class="node-head" data-toggle="next" aria-expanded="false">
        <span class="node-step"><span>Series complete</span></span><span class="node-title">All studies done</span><span class="node-foot"><span>Schedule another anyway</span></span></button></div></article>`;
    }
    return `<article class="node ${pos} next${open ? ' open' : ''}" data-node="next" style="--c:var(--accent);--on:var(--accent-ink)">
      <div class="node-card">
        <button class="node-head" data-toggle="next" aria-expanded="${open}" aria-controls="body-next">
          <span class="node-step"><span>Next</span>${icon('chevron')}</span>
          <span class="node-title">${open ? 'Schedule next study' : `<span class="plus">${icon('plus')}</span>`}</span>
          <span class="node-foot"><span>${open ? '' : 'Schedule next study'}</span></span>
        </button>
        ${open ? `<div class="node-body" id="body-next">${scheduleForm({ compact: true, studentId: J.person.personId, studentName: J.person.displayName, suggestion: sug })}</div>` : ''}
      </div>
    </article>`;
  }

  function drawJourney(initial) {
    const J = state.journey;
    const track = $('#journey-track');
    if (!track) return;
    const entries = J.data.entries;
    track.innerHTML = `<svg class="journey-arrows" aria-hidden="true"></svg>${entries.map(nodeHTML).join('')}${nextNodeHTML(entries.length)}`;
    const scroller = $('#journey-scroll');
    const nodes = $$('.node', track);

    const paint = () => drawArrows(track);
    if (J.ro) J.ro.disconnect();
    J.ro = new ResizeObserver(() => requestAnimationFrame(paint));
    J.ro.observe(track); nodes.forEach((n) => J.ro.observe(n));
    track.addEventListener('transitionend', paint);
    paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);

    if (J.open) bindScheduleForm($('#body-next'), { onDone: afterSchedule });

    if (initial) {
      const now = new Date().toISOString();
      let target = J.open ? nodes.find((n) => n.dataset.node === J.open) : null;
      if (!target) {
        const lastPast = entries.map((e, k) => [e, k]).filter(([e]) => e.startsAt <= now).pop();
        target = lastPast ? nodes[lastPast[1]] : nodes[0];
      }
      const prev = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = 'auto';
      scroller.scrollLeft = Math.max(0, target.offsetLeft - scroller.clientWidth * (J.open ? 0.08 : 0.32));
      scroller.style.scrollBehavior = prev;
    }
  }

  function drawArrows(track) {
    const svg = track.querySelector('.journey-arrows');
    if (!svg) return;
    const nodes = $$('.node', track);
    const W = track.scrollWidth, H = track.scrollHeight;
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const colorOf = (n) => {
      if (n.classList.contains('imported')) return 'var(--faint)';
      if (n.classList.contains('next')) return 'var(--accent)';
      return n.style.getPropertyValue('--c') || 'var(--accent)';
    };
    let defs = '', paths = '';
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const A = { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
      const B = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
      const ex = B.x - 9, ey = B.y + Math.min(B.h / 2, 75);
      let sx, sy, d;
      if (Math.abs(A.y - B.y) < 6) {
        sx = A.x + A.w + 6; sy = A.y + Math.min(A.h / 2, 75);
        d = `M${sx},${sy} C${sx + 30},${sy} ${ex - 30},${ey} ${ex},${ey}`;
      } else {
        const aHigher = A.y < B.y;
        sx = A.x + A.w / 2; sy = aHigher ? A.y + A.h + 6 : A.y - 6;
        if (aHigher && sy > ey - 10) { sx = A.x + A.w + 6; sy = A.y + Math.min(A.h / 2, 75); }
        d = `M${sx},${sy} C${sx},${sy + (ey - sy) * 0.75} ${sx + (ex - sx) * 0.45},${ey} ${ex},${ey}`;
      }
      const future = b.classList.contains('scheduled') || b.classList.contains('pending') || b.classList.contains('next');
      defs += `<linearGradient id="jg${i}" gradientUnits="userSpaceOnUse" x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}"><stop offset="0" style="stop-color:${colorOf(a)}"/><stop offset="1" style="stop-color:${colorOf(b)}"/></linearGradient>
        <marker id="jm${i}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:${colorOf(b)}"/></marker>`;
      paths += `<path d="${d}" class="${future ? 'future' : ''}" style="stroke:url(#jg${i})" marker-end="url(#jm${i})"/>`;
    }
    svg.innerHTML = `<defs>${defs}</defs>${paths}`;
  }

  async function watchSummary(personId) {
    const box = $('#about');
    if (!box || !state.journey) return;
    const before = state.journey.person.summary;
    box.classList.add('updating'); box.innerHTML = aboutHTML(state.journey.person, true);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, i < 5 ? 1500 : 4000));
      if (!state.journey || state.journey.personId !== personId || !$('#about')) return;
      let p;
      try { p = await API.person(state.chapter, personId); } catch { break; }
      if (p.summary && (!before || p.summary.generatedAt !== before.generatedAt)) {
        state.journey.person = p;
        const b = $('#about'); b.classList.remove('updating'); b.innerHTML = aboutHTML(p);
        return;
      }
    }
    const b = $('#about'); if (b) { b.classList.remove('updating'); b.innerHTML = aboutHTML(state.journey.person); }
  }

  async function refreshJourney(keepOpen) {
    const J = state.journey;
    try {
      const [p, j] = await Promise.all([API.person(state.chapter, J.personId), API.journey(state.chapter, J.personId)]);
      if (!state.journey || state.journey.personId !== J.personId) return;
      J.person = p; J.data = j; if (keepOpen !== undefined) J.open = keepOpen;
      const mp = $('.path-summary .mini-path'); if (mp) mp.outerHTML = miniPath(p.progress);
      const prog = $$('.fact dd.num')[0]; if (prog) { const cd = coreDone(p.progress); prog.textContent = `${cd.done} of ${cd.total} core studies`; }
      drawJourney(false);
    } catch (e) { toast(e.message); }
  }

  function afterSchedule(res) {
    toast(res.overlapWarning || 'Study scheduled and added to Google Calendar.');
    refreshJourney(res.event.id).then(() => {
      const n = $(`[data-node="${CSS.escape(res.event.id)}"]`);
      if (n) setTimeout(() => $('#journey-scroll').scrollTo({ left: n.offsetLeft - 24 }), 60);
    });
  }

  // ---------- Disciples ----------
  async function viewDisciples(view, route, live) {
    const s = state.disciples;
    view.innerHTML = `
      <div class="page-head"><div><h1>Disciples</h1><p class="sub" id="d-count">${esc(state.chapterInfo.name)}</p></div></div>
      <div class="search">${icon('search')}<input class="input" id="disciple-search" type="search" placeholder="Search disciples by name or nickname" value="${esc(s.q)}" autocomplete="off" aria-label="Search disciples"></div>
      <div id="disciple-list">${skeleton(5)}</div>`;
    const draw = (rows) => {
      $('#d-count').textContent = `${plural(rows.length, 'disciple')} in ${state.chapterInfo.name}${s.q ? ' match' : ''}`;
      $('#disciple-list').innerHTML = rows.length ? `<div class="list">${rows.map((r) => `
        <a class="row" href="#disciple-${encodeURIComponent(r.personId)}">
          <span class="avatar ${r.gender || ''}">${esc(initials(r.displayName))}</span>
          <span class="row-main"><span class="row-title">${esc(r.displayName)}${r.aliases && r.aliases.length ? ` <span class="muted" style="font-weight:450">"${esc(r.aliases[0])}"</span>` : ''}</span>
          <span class="row-sub">${[genderLabel(r.gender), r.talk ? r.talk.name : null, roleLabel(r.role)].filter(Boolean).map(esc).join(' · ')}</span></span>
          <span class="row-end">${r.canLead === false ? '<span class="chip">Not on Martha yet</span>' : ''}${icon('right').replace('<svg', '<svg width="18" height="18" style="color:var(--faint)"')}</span>
        </a>`).join('')}</div>` : `<div class="list"><div class="empty"><strong>No disciples match "${esc(s.q)}"</strong><span>Try a first name or a nickname.</span></div></div>`;
    };
    let rows = await API.people(state.chapter, { type: 'disciple', q: s.q });
    if (!live()) return;
    draw(rows);
    let timer;
    $('#disciple-search').addEventListener('input', (ev) => {
      s.q = ev.target.value; clearTimeout(timer);
      timer = setTimeout(async () => { try { rows = await API.people(state.chapter, { type: 'disciple', q: s.q }); if (live()) draw(rows); } catch (e) { $('#disciple-list').innerHTML = errorBox(e); } }, 160);
    });
  }
  function roleLabel(r) { return { coordinator: 'Coordinator', admin: 'Admin', leader: 'Leader' }[r] || null; }

  async function viewDisciple(view, route, live) {
    const p = await API.person(state.chapter, route.id);
    if (!live()) return;
    if (p.type !== 'disciple') { location.replace(`#student-${encodeURIComponent(p.personId)}`); return; }
    const t0 = T.today(tz());
    const spirYears = p.spirthday && p.spirthday.y ? (t0.y - p.spirthday.y - ((t0.m < p.spirthday.m || (t0.m === p.spirthday.m && t0.d < p.spirthday.d)) ? 1 : 0)) : null;
    view.innerHTML = `
      <a class="back" href="#disciples">${icon('left')}Disciples</a>
      <div class="person-head">
        <span class="avatar lg ${p.gender || ''}">${esc(initials(p.displayName))}</span>
        <div style="min-width:0"><h1>${esc(p.displayName)}</h1>
          <div class="person-meta">
            ${p.aliases && p.aliases.length ? `<span class="chip">Goes by ${esc(p.aliases.join(', '))}</span>` : ''}
            <span class="chip">${esc(genderLabel(p.gender))}</span>
            ${roleLabel(p.role) ? `<span class="chip accent">${esc(roleLabel(p.role))}</span>` : ''}
          </div>
        </div>
      </div>
      <dl class="facts">
        <div class="fact"><dt>Birthday</dt><dd>${p.birthday ? esc(T.monthDay(p.birthday.m, p.birthday.d)) : '<span class="muted">Not recorded</span>'}</dd></div>
        <div class="fact"><dt>Spirthday</dt><dd>${p.spirthday ? `${esc(T.monthDay(p.spirthday.m, p.spirthday.d, p.spirthday.y))}${spirYears !== null && spirYears >= 0 ? ` <span class="muted" style="font-weight:450">· ${plural(spirYears, 'year')}</span>` : ''}` : '<span class="muted">Not recorded</span>'}</dd></div>
        <div class="fact"><dt>Phone</dt><dd>${p.phone ? `<span class="num">${esc(prettyPhone(p.phone))}</span><button class="copy-btn" data-copy="${esc(prettyPhone(p.phone))}">Copy</button>` : '<span class="muted">Not recorded</span>'}</dd></div>
        <div class="fact"><dt>Email</dt><dd>${p.email ? esc(p.email) : '<span class="muted">Not recorded</span>'}</dd></div>
        ${state.chapterInfo.bibleTalksEnabled ? `<div class="fact"><dt>Bible Talk</dt><dd>${p.talk ? esc(p.talk.name) : '<span class="muted">Not assigned</span>'}</dd></div>` : ''}
        <div class="fact"><dt>Last 30 days</dt><dd class="num">Led ${p.ledLast30}, set up ${p.setUpLast30}</dd></div>
      </dl>
      <div class="dash">
        <section class="panel w7" style="padding:0">
          <div style="padding:20px 20px 8px"><h2>Upcoming studies</h2></div>
          ${p.upcoming.length ? p.upcoming.map((e) => evRow(e)).join('') : `<div class="empty" style="padding-top:16px"><span>Nothing scheduled with ${esc(p.firstName)} leading or setting up.</span></div>`}
        </section>
        <section class="panel w5" style="padding:0">
          <div style="padding:20px 20px 8px"><h2>Studying with</h2><p class="small muted">Students ${esc(p.firstName)} has led or set up lately</p></div>
          ${p.studyingWith.length ? p.studyingWith.map((r) => `<a class="row" href="#student-${encodeURIComponent(r.personId)}">
            <span class="row-main"><span class="row-title">${esc(r.displayName)}</span><span class="row-sub">${r.nextStudy ? 'Next: ' + esc(r.nextStudy.title) : r.lastStudy ? 'Last: ' + esc(r.lastStudy.title) : ''}</span></span>
            <span class="row-end">${miniPath(r.progress).replace('class="mini-path"', 'class="mini-path" style="width:96px"')}</span></a>`).join('') : '<div class="empty" style="padding-top:16px"><span>No recent studies.</span></div>'}
        </section>
      </div>
      <div><button class="btn ghost" data-action="help-signin" data-person="${esc(p.personId)}" data-name="${esc(p.firstName)}">${icon('send')}Help ${esc(p.firstName)} sign in</button></div>`;
  }

  // ---------- Calendar ----------
  async function viewCalendar(view, route, live) {
    const C = state.cal;
    if (!C.week) C.week = T.startOfWeek(T.today(tz()));
    const start = C.week, end = T.shiftDay(C.week, 7);
    const from = T.zonedToDate(start.y, start.m, start.d, 0, 0, tz()).toISOString();
    const to = T.zonedToDate(end.y, end.m, end.d, 0, 0, tz()).toISOString();
    const lastDay = T.shiftDay(start, 6);
    const rangeLabel = start.m === lastDay.m ? `${T.MONTHS[start.m - 1]} ${start.d}–${lastDay.d}` : `${T.MONTHS[start.m - 1].slice(0, 3)} ${start.d} – ${T.MONTHS[lastDay.m - 1].slice(0, 3)} ${lastDay.d}`;
    view.innerHTML = `
      <div class="page-head"><div><h1>Calendar</h1><p class="sub">Every Bible study in ${esc(state.chapterInfo.name)}, week by week</p></div><a class="btn" href="#schedule">${icon('plus')}Schedule a study</a></div>
      <div class="cal-controls">
        <div class="cal-nav"><h2 class="num">${esc(rangeLabel)}</h2>
          <button class="icon-btn" data-week="-1" aria-label="Previous week">${icon('left')}</button>
          <button class="btn ghost sm" data-week="0">This week</button>
          <button class="icon-btn" data-week="1" aria-label="Next week">${icon('right')}</button>
        </div>
        <div class="toggle-row" id="cal-toggles"></div>
      </div>
      <div id="cal-body">${skeleton(2)}</div>
      <p class="def">Shows the studies Martha has recorded. Changes made directly in Google Calendar may not appear here.</p>`;
    const { events, talks } = await API.events(state.chapter, from, to);
    if (!live()) return;
    const hasTalks = state.chapterInfo.bibleTalksEnabled && talks.length;

    const drawToggles = () => {
      $('#cal-toggles').innerHTML = `
        <span class="toggle-label">Show</span>
        <button class="toggle" data-ctog="men" aria-pressed="${C.men}" style="--sw:var(--men)"><span class="swatch"></span>Men</button>
        <button class="toggle" data-ctog="women" aria-pressed="${C.women}" style="--sw:var(--women)"><span class="swatch"></span>Women</button>
        ${hasTalks ? `<span class="toggle-label" style="margin-left:10px">Bible Talks</span>
          ${talks.map((t) => `<button class="toggle" data-ttog="${esc(t.id)}" aria-pressed="${!C.hiddenTalks.has(t.id)}" style="--sw:${toneVar(t.tone)}"><span class="swatch"></span>${esc(t.name)}</button>`).join('')}
          ${events.some((e) => !e.talk) ? `<button class="toggle" data-ttog="none" aria-pressed="${!C.hiddenTalks.has('none')}" style="--sw:var(--slate)"><span class="swatch"></span>No Bible Talk</button>` : ''}` : ''}`;
    };
    const drawGrid = () => {
      const shown = events.filter((e) => (e.audience === 'men' ? C.men : e.audience === 'women' ? C.women : true) && !(hasTalks && C.hiddenTalks.has(e.talk ? e.talk.id : 'none')));
      const today = T.dayKey(T.today(tz()));
      const days = Array.from({ length: 7 }, (_, k) => T.shiftDay(start, k));
      $('#cal-body').innerHTML = `<div class="cal-grid">${days.map((d) => {
        const key = T.dayKey(d);
        const evs = shown.filter((e) => T.dayKey(T.dayOf(e.startsAt, tz())) === key);
        const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(d.y, d.m - 1, d.d)));
        return `<div class="cal-day${key === today ? ' today' : key < today ? ' past' : ''}">
          <div class="cal-day-head"><span>${wd}</span><b class="num">${d.d}</b></div>
          <div class="cal-day-events">${evs.length ? evs.map((e) => `
            <a class="cal-ev${e.status === 'pending_sync' ? ' pending' : ''}" href="#student-${encodeURIComponent(e.student ? e.student.personId : '')}" data-open="${esc(e.id)}" style="--tone:${e.talk ? toneVar(e.talk.tone) : 'var(--slate)'}">
              <span class="t"><span class="num">${esc(T.formatTime(e.startsAt, tz()))}</span><span>${e.audience === 'men' ? 'Men' : e.audience === 'women' ? 'Women' : ''}</span></span>
              <span class="s">${esc(e.student ? e.student.name : 'Student not recorded')}</span>
              <span class="k">${esc(e.title)}${e.leader ? ' · ' + esc(e.leader.name.split(' ')[0]) : ''}</span>
            </a>`).join('') : '<span class="cal-empty">No studies</span>'}</div>
        </div>`;
      }).join('')}</div>
      ${!shown.length && events.length ? '<p class="muted">Every study this week is hidden by the filters above.</p>' : ''}`;
    };
    drawToggles(); drawGrid();
    $('#cal-toggles').addEventListener('click', (ev) => {
      const g = ev.target.closest('[data-ctog]'); const t = ev.target.closest('[data-ttog]');
      if (g) C[g.dataset.ctog] = !C[g.dataset.ctog];
      if (t) { const id = t.dataset.ttog; C.hiddenTalks.has(id) ? C.hiddenTalks.delete(id) : C.hiddenTalks.add(id); }
      if (g || t) { drawToggles(); drawGrid(); }
    });
  }

  // ---------- Schedule form (shared by Schedule page and the journey's last node) ----------
  let disciplesCache = { chapter: null, rows: null };
  async function disciples() {
    if (disciplesCache.chapter !== state.chapter || !disciplesCache.rows) {
      disciplesCache = { chapter: state.chapter, rows: await API.people(state.chapter, { type: 'disciple' }) };
    }
    return disciplesCache.rows;
  }

  function lenLabel(m) { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} hr${h > 1 ? 's' : ''}${r ? ' ' + r + ' min' : ''}` : `${m} min`; }

  function defaultDate() {
    const d = T.shiftDay(T.today(tz()), 1);
    return T.dayKey(d);
  }

  function studyOptions(sug) {
    const opts = [];
    if (sug && sug.part > 1) opts.push(`<option value="${esc(sug.key)}|${sug.part}" selected>${esc(sug.title)}</option>`);
    for (const c of catalog()) {
      const sel = sug && sug.part === 1 && sug.key === c.key ? 'selected' : '';
      opts.push(`<option value="${esc(c.key)}|1" ${sel}>${c.order}. ${esc(c.title)}${c.auto ? '' : ' (optional)'}</option>`);
    }
    opts.push('<option value="other|1">Other study…</option>');
    return opts.join('');
  }

  function scheduleForm({ compact, studentId, studentName, suggestion }) {
    const sug = suggestion;
    const minutes = sug ? (catalog().find((c) => c.key === sug.key) || {}).minutes || 60 : 45;
    return `<form class="form" data-schedule ${studentId ? `data-student="${esc(studentId)}"` : ''}>
      ${compact ? '' : `<div class="field"><label for="sf-student">Student</label>
        <div class="combo" id="sf-combo">
          ${studentId ? `<div class="picked"><span class="avatar">${esc(initials(studentName))}</span><b>${esc(studentName)}</b><button type="button" class="btn quiet sm" data-unpick>Change</button></div>`
            : `<input class="input" id="sf-student" placeholder="Start typing a name" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="sf-options"><div class="combo-list" id="sf-options" role="listbox" hidden></div>`}
        </div>
      </div>
      <div class="form-grid" id="sf-new" hidden>
        <div class="field"><label for="sf-new-name">New student's full name</label><input class="input" id="sf-new-name" autocomplete="off"></div>
        <div class="field"><label for="sf-new-gender">Men or women</label><select class="input" id="sf-new-gender"><option value="">Choose</option><option value="men">Men</option><option value="women">Women</option></select></div>
        <div class="field span"><label for="sf-new-phone">Phone <span class="muted" style="font-weight:450">(optional)</span></label><input class="input" id="sf-new-phone" type="tel" autocomplete="off"></div>
      </div>`}
      <div class="field"><label for="sf-study-${compact ? 'c' : 'p'}">Study</label>
        <select class="input" id="sf-study-${compact ? 'c' : 'p'}" name="study">${studyOptions(sug)}</select>
        <span class="suggest" data-suggest>${sug ? `Suggested next: <b>${esc(sug.title)}</b>` : ''}</span>
      </div>
      <div class="field" data-other hidden><label for="sf-other-${compact ? 'c' : 'p'}">Name of the study</label>
        <input class="input" id="sf-other-${compact ? 'c' : 'p'}" name="customTitle" maxlength="80" placeholder="For example: Prayer, Repentance, Follow-up" autocomplete="off">
        <span class="hint">Other studies show on the journey but don't change which study Martha suggests next.</span>
      </div>
      <div class="form-grid">
        <div class="field"><label for="sf-date-${compact ? 'c' : 'p'}">Date</label><input class="input" type="date" id="sf-date-${compact ? 'c' : 'p'}" name="date" value="${defaultDate()}" required></div>
        <div class="field"><label for="sf-time-${compact ? 'c' : 'p'}">Start time</label><input class="input" type="time" id="sf-time-${compact ? 'c' : 'p'}" name="time" value="19:00" step="900" required></div>
        <div class="field"><label for="sf-len-${compact ? 'c' : 'p'}">Length</label>
          <select class="input" id="sf-len-${compact ? 'c' : 'p'}" name="minutes">${[30, 45, 60, 75, 90, 105, 120, 150, 180].map((m) => `<option value="${m}" ${m === minutes ? 'selected' : ''}>${lenLabel(m)}</option>`).join('')}</select></div>
        <div class="field"><label for="sf-loc-${compact ? 'c' : 'p'}">Where <span class="muted" style="font-weight:450">(optional)</span></label><input class="input" id="sf-loc-${compact ? 'c' : 'p'}" name="location" placeholder="Bell Tower, HUB…" autocomplete="off"></div>
        <div class="field"><label for="sf-lead-${compact ? 'c' : 'p'}">Led by</label><select class="input" id="sf-lead-${compact ? 'c' : 'p'}" name="leader" required><option value="">Loading…</option></select></div>
        <div class="field"><label for="sf-org-${compact ? 'c' : 'p'}">Set up by</label><select class="input" id="sf-org-${compact ? 'c' : 'p'}" name="organizer" required><option value="">Loading…</option></select></div>
      </div>
      <div data-conflict></div>
      <div data-error></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">Schedule study</button></div>
    </form>`;
  }

  function bindScheduleForm(root, { onDone }) {
    const form = root && root.querySelector('form[data-schedule]');
    if (!form) return;
    let studentId = form.dataset.student || null;
    let rosterCache = null;
    const f = (name) => form.elements[name];

    disciples().then((rows) => {
      const opts = (sel) => `<option value="">Choose a disciple</option>${rows.map((r) => `<option value="${esc(r.personId)}" ${r.personId === sel ? 'selected' : ''}>${esc(r.displayName)}</option>`).join('')}`;
      rows = rows.filter((r) => r.canLead !== false);
      f('leader').innerHTML = opts(myId());
      f('organizer').innerHTML = opts(myId());
      checkConflict();
    }).catch((e) => { form.querySelector('[data-error]').innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; });

    const times = () => {
      const [y, m, d] = (f('date').value || '').split('-').map(Number);
      const [h, min] = (f('time').value || '').split(':').map(Number);
      if (!y || isNaN(h)) return null;
      const s = T.zonedToDate(y, m, d, h, min || 0, tz());
      return { startsAt: s.toISOString(), endsAt: new Date(s.getTime() + Number(f('minutes').value) * 60000).toISOString() };
    };

    async function checkConflict() {
      const box = form.querySelector('[data-conflict]');
      const t = times();
      if (!t || !f('leader').value) { box.innerHTML = ''; return; }
      const list = await API.leaderConflicts(state.chapter, f('leader').value, t.startsAt, t.endsAt);
      box.innerHTML = list.length ? `<div class="notice warn">${icon('info')}<span>${esc(f('leader').selectedOptions[0].textContent)} is already leading ${esc(list[0].student ? list[0].student.name : 'a study')}'s ${esc(list[0].title)} at ${esc(T.formatTime(list[0].startsAt, tz()))} that day. You can still schedule it.</span></div>` : '';
    }

    async function applySuggestion() {
      if (!studentId) return;
      const sug = await API.suggest(state.chapter, studentId);
      const sel = form.querySelector('select[name="study"]');
      sel.innerHTML = studyOptions(sug);
      form.querySelector('[data-suggest]').innerHTML = sug ? `Suggested next: <b>${esc(sug.title)}</b>` : 'This student has finished the series.';
      syncLength();
    }
    function syncLength() {
      const [key] = f('study').value.split('|');
      const other = form.querySelector('[data-other]');
      other.hidden = key !== 'other';
      if (key === 'other') { f('minutes').value = '60'; if (document.activeElement === f('study')) setTimeout(() => f('customTitle').focus(), 0); }
      const c = catalog().find((x) => x.key === key);
      if (c) f('minutes').value = String(c.minutes);
      checkConflict();
    }

    form.addEventListener('change', (ev) => {
      if (ev.target.name === 'study') syncLength();
      if (['date', 'time', 'minutes', 'leader'].includes(ev.target.name)) checkConflict();
    });

    // Student combobox (Schedule page only)
    const input = form.querySelector('#sf-student');
    const list = form.querySelector('#sf-options');
    const newBox = root.querySelector('#sf-new');
    if (input) {
      let hl = 0, items = [];
      const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
      const show = async () => {
        const q = input.value.trim();
        if (!rosterCache) rosterCache = await API.people(state.chapter, { type: 'student' });
        const matches = rosterCache.filter((r) => !q || r.displayName.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
        items = matches.map((r) => ({ type: 'pick', r }));
        if (q.length > 1) items.push({ type: 'new', q });
        hl = 0;
        list.innerHTML = items.map((it, k) => it.type === 'pick'
          ? `<button type="button" class="combo-opt${k === hl ? ' hl' : ''}" role="option" data-k="${k}"><span class="avatar ${it.r.gender || ''}">${esc(initials(it.r.displayName))}</span><span style="min-width:0"><b>${esc(it.r.displayName)}</b><br><span class="small muted">${it.r.nextStudy ? 'Next: ' + esc(it.r.nextStudy.title) : it.r.lastStudy ? 'Last: ' + esc(it.r.lastStudy.title) : 'No studies yet'}</span></span></button>`
          : `<button type="button" class="combo-opt${k === hl ? ' hl' : ''}" role="option" data-k="${k}"><span class="avatar">${icon('plus').replace('<svg', '<svg width="14" height="14"')}</span><span>Add a new student: <b>${esc(it.q)}</b></span></button>`).join('');
        list.hidden = !items.length; input.setAttribute('aria-expanded', String(!!items.length));
      };
      const choose = (k) => {
        const it = items[k]; if (!it) return;
        close();
        if (it.type === 'pick') {
          studentId = it.r.personId; newBox.hidden = true;
          form.querySelector('#sf-combo').innerHTML = `<div class="picked"><span class="avatar ${it.r.gender || ''}">${esc(initials(it.r.displayName))}</span><b>${esc(it.r.displayName)}</b><button type="button" class="btn quiet sm" data-unpick>Change</button></div>`;
          applySuggestion();
        } else {
          studentId = null; newBox.hidden = false; root.querySelector('#sf-new-name').value = it.q; root.querySelector('#sf-new-gender').focus();
          const sel = form.querySelector('select[name="study"]'); sel.innerHTML = studyOptions({ key: 'intro', part: 1, title: 'Intro' });
          form.querySelector('[data-suggest]').innerHTML = 'Suggested first study: <b>Intro</b>'; syncLength();
        }
      };
      input.addEventListener('input', show);
      input.addEventListener('focus', show);
      input.addEventListener('keydown', (ev) => {
        if (list.hidden) return;
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); hl = (hl + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; $$('.combo-opt', list).forEach((b, k) => b.classList.toggle('hl', k === hl)); }
        if (ev.key === 'Enter') { ev.preventDefault(); choose(hl); }
        if (ev.key === 'Escape') close();
      });
      list.addEventListener('mousedown', (ev) => { const b = ev.target.closest('[data-k]'); if (b) { ev.preventDefault(); choose(+b.dataset.k); } });
      input.addEventListener('blur', () => setTimeout(close, 120));
    }
    form.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-unpick]')) { go('schedule'); }
    });
    if (studentId && !form.closest('#body-next')) applySuggestion();

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const err = form.querySelector('[data-error]');
      err.innerHTML = '';
      const t = times();
      const [studyKey, part] = f('study').value.split('|');
      const customTitle = studyKey === 'other' ? f('customTitle').value.trim() : null;
      if (studyKey === 'other' && !customTitle) { err.innerHTML = `<div class="notice bad">Type the name of the study.</div>`; f('customTitle').focus(); return; }
      const payload = { studentId, studyKey, customTitle, part: Number(part), leaderId: f('leader').value, organizerId: f('organizer').value, location: f('location').value.trim() || null, ...(t || {}) };
      if (!studentId) {
        const name = root.querySelector('#sf-new-name') ? root.querySelector('#sf-new-name').value.trim() : '';
        const gender = root.querySelector('#sf-new-gender') ? root.querySelector('#sf-new-gender').value : '';
        if (!name) { err.innerHTML = `<div class="notice bad">Choose a student, or type a name to add a new one.</div>`; return; }
        if (!gender) { err.innerHTML = `<div class="notice bad">Choose men or women for the new student so Martha uses the right calendar.</div>`; return; }
        payload.newStudent = { name, gender, phone: root.querySelector('#sf-new-phone').value.trim() || null };
      }
      if (!t) { err.innerHTML = `<div class="notice bad">Pick a date and start time.</div>`; return; }
      if (!payload.leaderId || !payload.organizerId) { err.innerHTML = `<div class="notice bad">Choose who is leading and who set it up.</div>`; return; }
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Scheduling…';
      try {
        const res = await API.scheduleStudy(state.chapter, payload);
        rosterCache = null;
        onDone(res);
      } catch (e) {
        err.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`;
        btn.disabled = false; btn.textContent = 'Schedule study';
      }
    });
  }

  async function viewSchedule(view, route, live) {
    let pre = null;
    if (route.id) { try { pre = await API.person(state.chapter, route.id); } catch { pre = null; } }
    if (!live()) return;
    const sug = pre ? await API.suggest(state.chapter, pre.personId) : null;
    view.innerHTML = `
      <div class="page-head"><div><h1>Schedule a study</h1><p class="sub">Book the next study for someone already studying, or start a new student with Intro.</p></div></div>
      <div class="schedule-layout">
        <section class="panel" id="sched-root">${scheduleForm({ compact: false, studentId: pre ? pre.personId : null, studentName: pre ? pre.displayName : '', suggestion: sug })}</section>
        <aside class="panel section">
          <h3>What happens next</h3>
          <div class="date-list" style="gap:12px">
            <p class="small"><b>Martha adds it to Google Calendar.</b> <span class="muted">Men's studies go on the men's calendar and women's on the women's.</span></p>
            <p class="small"><b>It shows on the student's journey</b> <span class="muted">and on this week's calendar here.</span></p>
            <p class="small"><b>After the study,</b> <span class="muted">add a report from the student's journey. If it didn't happen, remove it there.</span></p>
          </div>
        </aside>
      </div>`;
    bindScheduleForm($('#sched-root'), {
      onDone: (res) => { toast(res.overlapWarning || 'Study scheduled and added to Google Calendar.'); state.pendingOpen = res.event.id; go(`student-${res.studentId}`); },
    });
  }

  // ---------- Sheets (account, chapters, help sign-in) ----------
  function openSheet(html, onBind) {
    closeSheet();
    const scrim = document.createElement('div');
    scrim.className = 'scrim'; scrim.id = 'sheet';
    scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(scrim);
    scrim.addEventListener('click', (ev) => { if (ev.target === scrim || ev.target.closest('[data-close]')) closeSheet(); });
    const f = scrim.querySelector('button, select, input, a'); if (f) f.focus();
    if (onBind) onBind(scrim);
  }
  function closeSheet() { const s = $('#sheet'); if (s) s.remove(); }

  function sheetHead(title) { return `<div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>`; }

  function accountSheet() {
    openSheet(`${sheetHead(state.me.displayName)}
      <div class="menu-list">
        <button class="menu-item" data-action="help-signin">${icon('send')}<span>Help a disciple sign in<small>Martha sends them a code on Telegram</small></span></button>
        <button class="menu-item" data-action="devices">${icon('device')}<span>My devices<small>See where you're signed in</small></span></button>
        <a class="menu-item" href="${esc(CFG.telegramBot)}" target="_blank" rel="noopener">${icon('chat')}<span>Open Martha on Telegram<small>@martha_management_bot</small></span></a>
        <button class="menu-item" data-action="signout">${icon('out')}<span>Sign out of this device</span></button>
      </div>`);
  }

  function chapterSheet() {
    openSheet(`${sheetHead('Switch chapter')}
      <div class="menu-list">${state.me.chapters.map((c) => `<button class="menu-item" data-chapter="${esc(c.id)}">${c.id === state.chapter ? icon('right') : '<span style="width:20px"></span>'}<span>${esc(c.name)}</span></button>`).join('')}</div>`);
  }

  async function helpSheet(personId, name) {
    const rows = await disciples();
    openSheet(`${sheetHead('Help a disciple sign in')}
      <p class="muted">Martha sends them a sign-in code on Telegram. They open this site, enter their phone number and type the code.</p>
      <div class="field"><label for="help-who">Disciple</label><select class="input" id="help-who">${rows.filter((r) => r.personId !== myId() && r.canLead !== false).map((r) => `<option value="${esc(r.personId)}" ${r.personId === personId ? 'selected' : ''}>${esc(r.displayName)}</option>`).join('')}</select></div>
      <div class="field"><span class="label">Site link to send them</span><div class="picked"><b class="small" style="font-weight:500">${esc(location.href.split('#')[0])}</b><button class="copy-btn" data-copy="${esc(location.href.split('#')[0])}">Copy</button></div></div>
      <div data-help-msg></div>
      <button class="btn block" data-action="send-help">${icon('send')}Send sign-in code</button>`);
  }

  async function devicesSheet() {
    openSheet(`${sheetHead('My devices')}<div id="dev-list">${skeleton(2)}</div>`);
    try {
      const list = await API.auth.devices();
      $('#dev-list').innerHTML = `<div class="menu-list">${list.map((d) => `<div class="row" style="padding-inline:4px">${icon('device').replace('<svg', '<svg width="20" height="20" style="color:var(--muted);flex:none"')}
        <span class="row-main"><span class="row-title">${esc(d.label)}</span><span class="row-sub">${d.current ? 'This device' : 'Last used ' + esc(T.relativeDay(d.lastSeen, tz()).toLowerCase())}</span></span>
        ${d.current ? '' : `<button class="btn ghost sm" data-revoke="${esc(d.id)}">Sign out</button>`}</div>`).join('')}</div>
        <p class="small muted">Lost a phone? Sign it out here and it loses access right away.</p>`;
    } catch (e) { $('#dev-list').innerHTML = errorBox(e, false); }
  }

  // ---------- Sign-in ----------
  function renderSignIn() {
    const S = state.signin;
    document.title = 'Sign in · Martha';
    const demo = API.mode === 'demo' ? `<div class="notice">${icon('info')}<span>Demo: use <b class="num">(951) 555-0100</b> and any 6 digits.</span></div>` : '';
    const err = S.error ? `<div class="notice bad" role="alert">${S.errorHtml || esc(S.error)}</div>` : '';
    const body = S.step === 'phone' ? `
      <form class="panel" id="signin-form">
        <div><h1>Sign in</h1><p class="muted" style="margin-top:6px">Enter your phone number. Martha will send you a sign-in code on Telegram.</p></div>
        ${demo}
        <div class="field"><label for="si-phone">Phone number</label><input class="input num" id="si-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(951) 555-0123" value="${esc(S.phone)}" required></div>
        ${err}
        <button class="btn block" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Sending…' : 'Send me a code'}</button>
      </form>
      <p class="signin-foot">You'll stay signed in on this device until you sign out.</p>`
      : `
      <form class="panel" id="code-form">
        <div><h1>Enter your code</h1><p class="muted" style="margin-top:6px">Martha sent a 6-digit code to your Telegram${S.sentTo ? `, ${esc(S.sentTo)}` : ''}. Open the chat with Martha to see it.</p></div>
        ${demo}
        <div class="code-boxes" role="group" aria-label="6-digit code">${Array.from({ length: 6 }, (_, k) => `<input class="input num" inputmode="numeric" autocomplete="${k === 0 ? 'one-time-code' : 'off'}" maxlength="6" aria-label="Digit ${k + 1}" data-digit="${k}">`).join('')}</div>
        ${err}
        <button class="btn block" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Checking…' : 'Sign in'}</button>
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap" class="small">
          <button type="button" class="linkish" data-action="resend">Send a new code</button>
          <button type="button" class="linkish" data-action="change-number">Use a different number</button>
        </div>
      </form>
      <p class="signin-foot"><a class="linkish" href="${esc(CFG.telegramBot)}" target="_blank" rel="noopener">Open Martha on Telegram</a></p>`;
    document.getElementById('app').innerHTML = `${API.mode === 'demo' ? `<div class="demo-banner" role="note"><strong>Demo mode.</strong> Everyone and everything here is sample data.</div>` : ''}
      <div class="signin"><div class="signin-card"><div class="signin-mark"><span class="wordmark"><i></i>Martha</span></div>${body}</div></div>`;

    if (S.step === 'phone') {
      const inp = $('#si-phone'); inp.focus();
      $('#signin-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        S.phone = inp.value; S.busy = true; S.error = ''; S.errorHtml = ''; renderSignIn();
        try { const r = await API.auth.requestCode(S.phone); S.step = 'code'; S.sentTo = r.sentTo; }
        catch (e) {
          S.error = e.message;
          if (e.code === 'telegram_not_connected') S.errorHtml = `${esc(e.message)} <a href="${esc(CFG.telegramBot)}" target="_blank" rel="noopener">Open Martha on Telegram</a>`;
        }
        S.busy = false; renderSignIn();
      });
    } else {
      const boxes = $$('[data-digit]');
      boxes[0].focus();
      const fill = (str, from = 0) => { str.replace(/\D/g, '').slice(0, 6 - from).split('').forEach((ch, k) => { boxes[from + k].value = ch; }); const next = boxes.find((b) => !b.value); (next || boxes[5]).focus(); if (!next) $('#code-form').requestSubmit(); };
      boxes.forEach((b, k) => {
        b.addEventListener('input', () => { const v = b.value.replace(/\D/g, ''); if (v.length > 1) { b.value = ''; fill(v, k); return; } b.value = v; if (v && k < 5) boxes[k + 1].focus(); if (boxes.every((x) => x.value)) $('#code-form').requestSubmit(); });
        b.addEventListener('keydown', (ev) => { if (ev.key === 'Backspace' && !b.value && k > 0) boxes[k - 1].focus(); });
        b.addEventListener('paste', (ev) => { ev.preventDefault(); fill((ev.clipboardData || window.clipboardData).getData('text'), k); });
      });
      $('#code-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const code = boxes.map((b) => b.value).join('');
        S.busy = true; S.error = ''; renderSignIn();
        try { await API.auth.verifyCode(S.phone, code); state.signin = { step: 'phone', phone: '', error: '', busy: false }; render(); return; }
        catch (e) { S.error = e.message; }
        S.busy = false; renderSignIn();
      });
    }
  }

  // ---------- global events ----------
  document.addEventListener('click', async (ev) => {
    const t = ev.target;
    const openLink = t.closest('[data-open]');
    if (openLink) state.pendingOpen = openLink.dataset.open;

    const more = t.closest('[data-more]');
    if (more) { const txt = more.parentElement.querySelector('p.text'); txt.classList.toggle('clamp'); more.textContent = txt.classList.contains('clamp') ? 'Read more' : 'Show less'; return; }
    const copy = t.closest('[data-copy]');
    if (copy) { ev.preventDefault(); copyText(copy.dataset.copy, copy); return; }

    const act = t.closest('[data-action]');
    if (act) {
      const a = act.dataset.action;
      if (a === 'account') accountSheet();
      if (a === 'chapters') chapterSheet();
      if (a === 'retry') render();
      if (a === 'dismiss-tip') { ls.set('martha.installTipDismissed', true); act.closest('.install-tip').remove(); }
      if (a === 'signout') { closeSheet(); await API.auth.signOut(); state.me = null; render(); }
      if (a === 'devices') devicesSheet();
      if (a === 'help-signin') helpSheet(act.dataset.person, act.dataset.name).catch((e) => toast(e.message));
      if (a === 'send-help') {
        const who = $('#help-who'); const msg = $('[data-help-msg]');
        act.disabled = true;
        try { const r = await API.auth.helpSignIn(who.value); msg.innerHTML = `<div class="notice ok">${icon('info')}<span>Code sent to ${esc(r.sentTo)} on Telegram. It works for 10 minutes.</span></div>`; }
        catch (e) { msg.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; }
        act.disabled = false;
      }
      if (a === 'resend') { state.signin.error = ''; try { await API.auth.requestCode(state.signin.phone); toast('New code sent on Telegram.'); } catch (e) { state.signin.error = e.message; renderSignIn(); } }
      if (a === 'change-number') { state.signin = { step: 'phone', phone: '', error: '', busy: false }; renderSignIn(); }
      return;
    }
    const ch = t.closest('[data-chapter]');
    if (ch) { state.chapter = ch.dataset.chapter; ls.set('martha.chapter', state.chapter); state.cal.hiddenTalks.clear(); closeSheet(); go('home'); render(); return; }
    const rv = t.closest('[data-revoke]');
    if (rv) { await API.auth.revokeDevice(rv.dataset.revoke); devicesSheet(); toast('Device signed out.'); return; }

    const wk = t.closest('[data-week]');
    if (wk) {
      const n = Number(wk.dataset.week);
      state.cal.week = n === 0 ? T.startOfWeek(T.today(tz())) : T.shiftDay(state.cal.week, 7 * n);
      render(); return;
    }

    // Journey interactions
    const J = state.journey;
    if (!J || !$('#journey-track')) return;
    const sc = t.closest('[data-scroll]');
    if (sc) { const s = $('#journey-scroll'); s.scrollBy({ left: Number(sc.dataset.scroll) * s.clientWidth * 0.7 }); return; }
    const tog = t.closest('[data-toggle]');
    if (tog) {
      const id = tog.dataset.toggle;
      J.open = J.open === id ? null : id; J.confirming = null;
      drawJourney(false);
      if (J.open) {
        const node = $(`[data-node="${CSS.escape(id)}"]`);
        const s = $('#journey-scroll');
        setTimeout(() => { const left = node.offsetLeft - 24; if (left < s.scrollLeft || node.offsetLeft + node.offsetWidth > s.scrollLeft + s.clientWidth) s.scrollTo({ left }); }, 340);
        const h = node.querySelector('.node-head'); if (h) h.focus({ preventScroll: true });
      }
      return;
    }
    const ed = t.closest('[data-edit]');
    if (ed) { J.editing.add(ed.dataset.edit); drawJourney(false); const ta = $(`#rep-${CSS.escape(ed.dataset.edit)}`); if (ta) ta.focus(); return; }
    const ce = t.closest('[data-cancel-edit]');
    if (ce) { J.editing.delete(ce.dataset.cancelEdit); drawJourney(false); return; }
    const cr = t.closest('[data-confirm-remove]');
    if (cr) { J.confirming = cr.dataset.confirmRemove; drawJourney(false); return; }
    if (t.closest('[data-keep]')) { J.confirming = null; drawJourney(false); return; }
    const rm = t.closest('[data-remove]');
    if (rm) {
      rm.disabled = true;
      try { await API.removeStudy(state.chapter, rm.dataset.remove); toast('Study removed.'); J.confirming = null; await refreshJourney(null); }
      catch (e) { toast(e.message); rm.disabled = false; }
    }
  });

  document.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('form[data-report]');
    if (!form) return;
    ev.preventDefault();
    const id = form.dataset.report;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res = await API.saveReport(state.chapter, id, { outcome: form.elements.outcome.value, body: form.elements.body.value });
      state.journey.editing.delete(id);
      toast('Report saved.');
      await refreshJourney(id);
      if (res.summaryUpdating) watchSummary(state.journey.personId);
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Save report'; }
  });

  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeSheet(); });
  window.addEventListener('hashchange', render);
  window.addEventListener('martha:signedout', () => { state.me = null; render(); });
  window.addEventListener('martha:changed', () => {
    const r = parseRoute();
    if (r.name === 'student' && state.journey && !$('#journey-track form:focus-within')) refreshJourney();
  });

  render();
})();
