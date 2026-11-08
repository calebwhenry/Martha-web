// Martha motion layer. Pure enhancement: the app works the same without it.
// - The field: a fixed dot grid that gathers ember light around the cursor, drifts with scroll,
//   and ripples with every click, tap, keystroke and page change.
// - Surfaces catch light on their edges where the cursor is; buttons carry a warm glow and a little magnetism;
//   journey cards and the hero ring tilt toward the pointer; nav and segmented controls get sliding indicators;
//   headlines exhale in word by word; numbers count up.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------------- The field ----------------
  const canvas = document.createElement('canvas');
  canvas.className = 'm-field'; canvas.setAttribute('aria-hidden', 'true');
  const grain = document.createElement('div');
  grain.className = 'grain'; grain.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas); document.body.appendChild(grain);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1, GAP = 26, cols = 0, rows = 0;
  let dotRGB = '24,22,18', glowRGB = '212,82,28', dark = false;
  const pointer = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false, energy: 0 };
  const ripples = [];
  let scrollOff = 0, scrollTarget = 0, running = false, lastMove = 0;

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    dotRGB = (cs.getPropertyValue('--dot') || '24,22,18').trim();
    glowRGB = (cs.getPropertyValue('--glow') || '212,82,28').trim();
    dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' || document.documentElement.dataset.theme === 'dark';
  }
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    GAP = W < 600 ? 22 : 26;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    cols = Math.ceil(W / GAP) + 2; rows = Math.ceil(H / GAP) + 3;
    readTheme(); draw(performance.now());
  }

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const baseA = dark ? 0.11 : 0.12;
    const sigma2 = 2 * 120 * 120;
    const off = -(scrollOff % GAP);
    const px = pointer.sx, py = pointer.sy, pe = pointer.energy;
    // Live ripples
    const live = [];
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; const age = now - r.t;
      if (age > r.life) { ripples.splice(i, 1); continue; }
      live.push({ x: r.x, y: r.y, R: age * r.speed, k: r.amp * (1 - age / r.life) ** 1.6, w2: 2 * r.width * r.width });
    }
    // Base dots in one path; energised dots drawn individually on top.
    ctx.fillStyle = `rgba(${dotRGB},${baseA})`;
    ctx.beginPath();
    const hot = [];
    for (let j = 0; j < rows; j++) {
      const y0 = j * GAP + off;
      for (let i = 0; i < cols; i++) {
        const x0 = i * GAP + (j % 2 ? GAP / 2 : 0) - GAP / 2;
        let e = 0, dx = 0, dy = 0;
        if (pe > 0.001) {
          const ddx = x0 - px, ddy = y0 - py; const d2 = ddx * ddx + ddy * ddy;
          if (d2 < 90000) { const f = Math.exp(-d2 / sigma2) * pe; e += f; const d = Math.sqrt(d2) || 1; dx += (ddx / d) * f * 7; dy += (ddy / d) * f * 7; }
        }
        for (let k = 0; k < live.length; k++) {
          const r = live[k]; const ddx = x0 - r.x, ddy = y0 - r.y; const d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const band = d - r.R; if (band > 90 || band < -90) continue;
          const f = Math.exp(-(band * band) / r.w2) * r.k; e += f; dx += (ddx / d) * f * 5; dy += (ddy / d) * f * 5;
        }
        if (e < 0.03) { ctx.moveTo(x0 + 0.95, y0); ctx.arc(x0, y0, 0.95, 0, 6.2832); }
        else hot.push(x0 + dx, y0 + dy, Math.min(1, e));
      }
    }
    ctx.fill();
    for (let n = 0; n < hot.length; n += 3) {
      const e = hot[n + 2];
      ctx.fillStyle = `rgba(${glowRGB},${(baseA + e * 0.75).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(hot[n], hot[n + 1], 0.95 + e * 1.7, 0, 6.2832); ctx.fill();
    }
    return live.length > 0;
  }

  function tick(now) {
    const k = reduce.matches ? 1 : 0.12;
    pointer.sx = lerp(pointer.sx, pointer.x, k); pointer.sy = lerp(pointer.sy, pointer.y, k);
    const targetE = pointer.active && now - lastMove < 2600 ? 1 : 0;
    pointer.energy = lerp(pointer.energy, targetE, targetE ? 0.08 : 0.03);
    scrollOff = lerp(scrollOff, scrollTarget, reduce.matches ? 1 : 0.1);
    const rippling = draw(now);
    const settling = Math.abs(pointer.sx - pointer.x) > 0.3 || Math.abs(pointer.sy - pointer.y) > 0.3 || Math.abs(scrollOff - scrollTarget) > 0.3 || (pointer.energy > 0.004 && targetE === 0) || (targetE && pointer.energy < 0.995);
    if (rippling || settling || (targetE && now - lastMove < 120)) requestAnimationFrame(tick);
    else running = false;
  }
  function wake() { if (!running && !document.hidden) { running = true; requestAnimationFrame(tick); } }

  function ripple(x, y, amp = 1, opts = {}) {
    if (reduce.matches) return;
    ripples.push({ x, y, t: performance.now(), amp, speed: opts.speed || 0.55, width: opts.width || 26, life: opts.life || 1500 });
    if (ripples.length > 12) ripples.shift();
    wake();
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', () => { scrollTarget = window.scrollY * 0.35; wake(); }, { passive: true });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readTheme(); wake(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  // ---------------- Pointer-driven surfaces ----------------
  const SURFACES = '.panel, .list, .facts, .journey-panel, .about, .cal-day, .state-box';
  let litEl = null, magEl = null, tiltEl = null;

  function setLit(el, e) {
    if (litEl && litEl !== el) litEl.classList.remove('lit');
    litEl = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`);
    el.classList.add('lit');
  }
  function releaseMag() { if (magEl) { magEl.style.transform = ''; magEl.classList.remove('mag-on'); magEl = null; } }
  function releaseTilt() {
    if (!tiltEl) return;
    tiltEl.style.transform = '';
    tiltEl = null;
  }

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; lastMove = performance.now();
    if (pointer.sx < -999) { pointer.sx = pointer.x; pointer.sy = pointer.y; }
    wake();
    const t = e.target instanceof Element ? e.target : null;
    // Edge light on the hovered surface (innermost that shows it).
    let s = t && t.closest(SURFACES);
    if (s && s.matches('.panel .list') ) s = s.parentElement.closest(SURFACES);
    setLit(s, e);
    if (reduce.matches) return;
    // Button glow + magnetism
    const b = t && t.closest('[data-mag]');
    if (b !== magEl) releaseMag();
    if (b && !b.disabled) {
      const r = b.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      b.style.setProperty('--bx', `${cx}px`); b.style.setProperty('--by', `${cy}px`);
      const mx = clamp((cx - r.width / 2) * 0.22, -8, 8), my = clamp((cy - r.height / 2) * 0.3, -6, 6);
      b.style.transform = `translate(${mx.toFixed(1)}px, ${my.toFixed(1)}px)`;
      b.classList.add('mag-on'); magEl = b;
    }
    // Tilt
    const tl = t && t.closest('[data-tilt]');
    if (tl !== tiltEl) releaseTilt();
    if (tl && !tl.closest('.node.open')) {
      const r = tl.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      const max = Number(tl.dataset.tilt) || 6;
      tl.style.transform = `perspective(900px) rotateX(${(-ny * max).toFixed(2)}deg) rotateY(${(nx * max).toFixed(2)}deg) translateZ(0)`;
      const head = tl.querySelector('.node-head');
      if (head) { head.style.setProperty('--tx', `${(nx + 0.5) * 100}%`); head.style.setProperty('--ty', `${(ny + 0.5) * 100}%`); }
      tiltEl = tl;
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; setLit(null); releaseMag(); releaseTilt(); wake(); });
  document.documentElement.addEventListener('mouseleave', () => { pointer.active = false; setLit(null); releaseMag(); releaseTilt(); wake(); });

  document.addEventListener('pointerdown', (e) => {
    ripple(e.clientX, e.clientY, e.pointerType === 'mouse' ? 1 : 0.9);
    if (e.pointerType !== 'mouse') { pointer.x = pointer.sx = e.clientX; pointer.y = pointer.sy = e.clientY; }
  }, { passive: true });

  // Keystrokes ripple from the field you are typing in.
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || !el.matches('input, textarea')) return;
    const r = el.getBoundingClientRect();
    const len = (el.value || '').length;
    const x = el.tagName === 'TEXTAREA' ? r.left + r.width / 2 : Math.min(r.right - 12, r.left + 18 + len * 9);
    ripple(x, r.top + Math.min(r.height, 60) / 2, 0.55, { width: 18, life: 1100, speed: 0.5 });
  }, true);

  addEventListener('hashchange', () => { ripple(innerWidth < 860 ? innerWidth / 2 : 260, 140, 1.2, { speed: 0.9, width: 40, life: 1900 }); });

  // ---------------- Enhancements applied to whatever the app renders ----------------
  function navIndicators(root) {
    root.querySelectorAll('.nav').forEach((nav) => {
      if (nav.dataset.mo) return; nav.dataset.mo = '1';
      const ind = document.createElement('span'); ind.className = 'nav-ind';
      const hov = document.createElement('span'); hov.className = 'nav-hover';
      nav.prepend(hov, ind);
      const place = (el, target, show = true) => {
        if (!el) return;
        if (!target) { el.style.opacity = '0'; return; }
        el.style.transform = `translateY(${target.offsetTop}px)`; el.style.height = `${target.offsetHeight}px`; el.style.opacity = show ? '1' : '0';
      };
      const cur = nav.querySelector('a[aria-current="page"]');
      const prev = Number(sessionStorage.getItem('martha.navY') || -1);
      if (cur && prev >= 0 && !reduce.matches) {
        ind.style.transition = 'none'; ind.style.transform = `translateY(${prev}px)`; ind.style.height = `${cur.offsetHeight}px`;
        requestAnimationFrame(() => requestAnimationFrame(() => { ind.style.transition = ''; place(ind, cur); }));
      } else place(ind, cur);
      if (cur) try { sessionStorage.setItem('martha.navY', String(cur.offsetTop)); } catch { /* ignore */ }
      nav.addEventListener('pointerover', (e) => { const a = e.target.closest('a'); if (a) place(hov, a, a !== cur); });
      nav.addEventListener('pointerleave', () => { hov.style.opacity = '0'; });
    });
  }

  function placeThumb(seg) {
    const thumb = seg.querySelector(':scope > .seg-thumb');
    const on = seg.querySelector(':scope > button[aria-pressed="true"]');
    if (!thumb) return;
    if (!on) { thumb.style.width = '0px'; return; }
    thumb.style.width = `${on.offsetWidth}px`;
    thumb.style.transform = `translateX(${on.offsetLeft}px)`;
  }
  function segThumbs(root) {
    root.querySelectorAll('.seg').forEach((seg) => {
      if (seg.querySelector(':scope > .seg-thumb')) { placeThumb(seg); return; }
      const thumb = document.createElement('span'); thumb.className = 'seg-thumb'; thumb.setAttribute('aria-hidden', 'true');
      thumb.style.transition = 'none';
      seg.prepend(thumb); seg.classList.add('has-thumb');
      placeThumb(seg);
      requestAnimationFrame(() => { thumb.style.transition = ''; });
    });
  }

  function splitHeadlines(root) {
    root.querySelectorAll('.page-head h1, .person-head h1, .signin-intro h1, .signin .panel h1').forEach((h) => {
      if (h.dataset.split || h.children.length) return;
      const text = h.textContent;
      if (!text.trim()) return;
      h.dataset.split = '1';
      h.setAttribute('aria-label', text);
      const comma = text.indexOf(', ');
      let i = 0;
      const words = (part) => part.split(/(\s+)/).filter(Boolean).map((w) => (/^\s+$/.test(w) ? ' ' : `<span class="w" aria-hidden="true" style="--i:${i++}">${w.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])}</span>`)).join('');
      h.innerHTML = comma > 0 ? `${words(text.slice(0, comma + 1))} <em>${words(text.slice(comma + 2))}</em>` : words(text);
    });
  }

  function countUps(root) {
    if (reduce.matches) return;
    root.querySelectorAll('.stat-hero .big, .split-legend b, .talk-row-top b, .week-count b').forEach((el) => {
      if (el.dataset.counted) return;
      const n = Number(el.textContent.trim());
      el.dataset.counted = '1';
      if (!Number.isFinite(n) || n <= 0 || n > 9999) return;
      const t0 = performance.now(), dur = 1100 + Math.min(700, n * 12);
      el.textContent = '0';
      const step = (t) => {
        const p = clamp((t - t0) / dur, 0, 1); const e = 1 - Math.pow(1 - p, 4);
        el.textContent = String(Math.round(n * e));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function marks(root) {
    root.querySelectorAll('.btn:not(.block):not(.quiet), .icon-btn, .avatar[data-action], .account-btn .avatar').forEach((b) => { if (!b.hasAttribute('data-mag')) b.setAttribute('data-mag', ''); });
    root.querySelectorAll('.node:not(.next) .node-card').forEach((c) => { if (!c.hasAttribute('data-tilt')) c.setAttribute('data-tilt', '7'); });
    root.querySelectorAll('.stat-hero').forEach((c) => { if (!c.hasAttribute('data-tilt')) c.setAttribute('data-tilt', '3'); });
    root.querySelectorAll('.journey-track > .node').forEach((n, k) => n.style.setProperty('--n', k));
    root.querySelectorAll('.journey-arrows path:not(.future)').forEach((p) => {
      if (p.dataset.len) return;
      try { const L = Math.ceil(p.getTotalLength()); p.dataset.len = L; p.style.setProperty('--len', L); } catch { /* not laid out */ }
    });
  }

  function enhance() {
    const root = document.getElementById('app');
    if (!root) return;
    navIndicators(root); segThumbs(root); splitHeadlines(root); countUps(root); marks(root);
  }

  let queued = false;
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; enhance(); }); };
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'attributes' && m.target.parentElement && m.target.parentElement.classList.contains('seg')) { placeThumb(m.target.parentElement); continue; }
      if (m.type === 'childList') { queue(); }
    }
  });
  function start() {
    const app = document.getElementById('app');
    if (app) mo.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
    resize(); enhance();
    // A first wave so the page arrives with light.
    setTimeout(() => ripple(innerWidth < 860 ? innerWidth / 2 : innerWidth * 0.3, innerHeight * 0.35, 1.1, { speed: 0.7, width: 44, life: 2200 }), 250);
  }
  addEventListener('resize', () => document.querySelectorAll('.seg').forEach(placeThumb), { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  if (!finePointer.matches) pointer.energy = 0;
})();
