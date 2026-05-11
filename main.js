'use strict';

/* ══════════════════════════════════════════════════════
   ACCESSIBILITY — honour prefers-reduced-motion
══════════════════════════════════════════════════════ */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════ */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function onView(el, cb, threshold = 0.05) {
  if (!el) return;
  const io = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    cb();
  }, { threshold, rootMargin: '0px 0px -20px 0px' });
  io.observe(el);
}

/* ══════════════════════════════════════════════════════
   SECTION PROMPT — types each text node one char at a time
══════════════════════════════════════════════════════ */
async function typeSectionPrompt(prompt) {
  if (!prompt || REDUCED) return;
  const walker = document.createTreeWalker(prompt, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) {
    if (n.textContent.trim()) nodes.push(n);
  }
  for (const tn of nodes) {
    const orig = tn.textContent;
    tn.textContent = '';
    for (const ch of orig) {
      tn.textContent += ch;
      await sleep(16 + Math.random() * 8);
    }
  }
}

/* ══════════════════════════════════════════════════════
   HERO BOOT SEQUENCE
══════════════════════════════════════════════════════ */
async function bootHero() {
  const logo    = document.querySelector('.ascii-logo');
  const section = document.getElementById('hero');
  const items   = document.querySelectorAll('.hero-item');

  section.classList.add('visible');

  if (REDUCED) {
    items.forEach(el => el.classList.add('in'));
    return;
  }

  await sleep(100);
  if (logo) { logo.classList.add('boot'); logo.classList.add('in'); }
  await sleep(620);

  for (const el of Array.from(items).filter(e => e !== logo)) {
    el.classList.add('in');
    await sleep(90);
  }
}

/* ══════════════════════════════════════════════════════
   TERMINAL PLAYER — line-by-line playback
══════════════════════════════════════════════════════ */
function classifyRow(row) {
  if (row.classList.contains('tl-spacer'))   return 'spacer';
  if (row.classList.contains('tl-cmd'))      return 'cmd';
  if (row.classList.contains('tl-skip'))     return 'skip';
  if (row.classList.contains('tl-err'))      return 'err';
  if (row.classList.contains('tl-ok'))       return 'ok';
  if (row.classList.contains('tl-stop'))     return 'stop';
  if (row.classList.contains('tl-saved'))    return 'saved';
  if (row.classList.contains('tl-call-hdr')) return 'callhdr';
  if (row.classList.contains('tl-err-line')) return 'errline';
  if (row.classList.contains('tl-indent'))   return 'indent';
  return 'info';
}

const GAPS = {
  spacer: 18, cmd: 220, info: 90, callhdr: 260,
  indent: 65, skip: 0,  err: 200, errline: 140,
  ok: 160,   stop: 200, saved: 170,
};

async function playTerminal(termBody) {
  const rows = Array.from(termBody.querySelectorAll('.tl-row'));

  if (REDUCED) {
    rows.forEach(r => r.classList.add('tl-in'));
    return;
  }

  let cursor = 200;
  const timeline = rows.map(row => {
    const type = classifyRow(row);
    cursor += GAPS[type] ?? 120;
    return { row, type, at: cursor };
  });

  // Give skip rows a loading-dots phase
  timeline.forEach((item, idx) => {
    if (item.type !== 'skip') return;
    const skipDur = 1100;
    const rest = timeline.slice(idx + 1);
    rest.forEach(r => { r.at += skipDur; });
  });

  timeline.forEach(({ row, type, at }) => {

    if (type === 'cmd') {
      setTimeout(async () => {
        row.classList.add('tl-in');
        const cur    = row.querySelector('.tl-cursor');
        const cmdSpan = row.querySelector('.cmd-text');
        if (cmdSpan) {
          const orig = cmdSpan.getAttribute('data-orig') || 'python agent.py';
          cmdSpan.textContent = '';
          for (const ch of orig) {
            cmdSpan.textContent += ch;
            await sleep(52 + Math.random() * 20);
          }
        }
        await sleep(180);
        if (cur) cur.style.display = 'none';
      }, at);

    } else if (type === 'skip') {
      const dots   = row.querySelector('.skip-dots');
      const skipTx = row.querySelector('.skip-text');
      setTimeout(() => {
        row.classList.add('tl-in');
        if (skipTx) skipTx.style.visibility = 'hidden';
        if (dots)   dots.classList.add('loading');
      }, at);
      setTimeout(() => {
        if (dots)   { dots.classList.remove('loading'); dots.textContent = ''; }
        if (skipTx) skipTx.style.visibility = 'visible';
      }, at + 1000);

    } else {
      setTimeout(() => {
        row.classList.add('tl-in');
        if (type === 'err' || type === 'errline') row.classList.add('flash-err');
        if (type === 'ok')   row.classList.add('flash-ok');
        if (type === 'stop') row.classList.add('flash-stop');
        if (type === 'saved')row.classList.add('flash-save');
      }, at);
    }
  });
}

function initTerminals() {
  document.querySelectorAll('.tl-cmd .cmd-text').forEach(s => { s.textContent = ''; });

  const bad  = document.getElementById('term-bad');
  const good = document.getElementById('term-good');

  const incident = document.getElementById('incident');
  if (incident) incident.classList.add('visible');

  if (bad)  onView(bad,  () => playTerminal(bad.querySelector('.term-body')),  0.1);
  if (good) onView(good, () => setTimeout(() => playTerminal(good.querySelector('.term-body')), 400), 0.1);
}

/* ══════════════════════════════════════════════════════
   CODE SECTION — tabs slide in, code reveals on each switch
══════════════════════════════════════════════════════ */
function revealCodePane(pane) {
  if (!pane) return;
  const pre = pane.querySelector('.code');
  if (!pre) return;
  pre.classList.remove('code-reveal');
  void pre.offsetWidth;           // force reflow so animation restarts
  pre.classList.add('code-reveal');
}

async function animateCode(section) {
  if (REDUCED) {
    const tabs = section.querySelector('.tabs');
    if (tabs) tabs.classList.add('tabs-in');
    return;
  }
  await sleep(60);
  const tabs = section.querySelector('.tabs');
  if (tabs) {
    tabs.classList.add('tabs-in');
    await sleep(180);
    revealCodePane(tabs.querySelector('.tab-pane.active'));
  }
}

/* ══════════════════════════════════════════════════════
   COMPARE TABLE — stagger rows after prompt finishes
══════════════════════════════════════════════════════ */
async function animateCompare(section) {
  if (REDUCED) {
    section.querySelectorAll('.compare-table tbody tr').forEach(r => r.classList.add('row-in'));
    return;
  }
  await sleep(180);
  section.querySelectorAll('.compare-table tbody tr').forEach((row, i) => {
    setTimeout(() => row.classList.add('row-in'), i * 52);
  });
}

/* ══════════════════════════════════════════════════════
   FEATURE FLAGS — stagger after prompt
══════════════════════════════════════════════════════ */
async function animateFeatures(section) {
  if (REDUCED) {
    section.querySelectorAll('.flag-row').forEach(r => r.classList.add('flag-in'));
    return;
  }
  await sleep(100);
  section.querySelectorAll('.flag-row').forEach((row, i) => {
    setTimeout(() => row.classList.add('flag-in'), i * 48);
  });
}

/* ══════════════════════════════════════════════════════
   PRE LINE-BY-LINE REVEAL
   Splits a <pre>'s innerHTML by \n, wraps each line in a
   span, then fades them in sequentially.
══════════════════════════════════════════════════════ */
function animatePreLines(pre, lineGap = 48) {
  if (!pre) return;

  if (REDUCED) {
    pre.style.opacity = '1';   // undo any inline hide from DOMContentLoaded
    return;
  }

  const lines = pre.innerHTML.trim().split('\n');
  pre.innerHTML = lines
    .map(l => `<span class="anim-line">${l}</span>`)
    .join('\n');

  // The pre itself stays opacity:0 until the first line fires
  const els = Array.from(pre.querySelectorAll('.anim-line'));
  els.forEach(el => { el.style.opacity = '0'; });

  // Show the container on the first tick, then stream lines
  pre.style.transition = 'none';
  pre.style.opacity    = '1';

  els.forEach((el, i) => {
    setTimeout(() => {
      el.style.transition = 'opacity .14s ease';
      el.style.opacity    = '1';
    }, i * lineGap);
  });
}

/* ══════════════════════════════════════════════════════
   HOW IT WORKS — reveal flow diagram line by line
══════════════════════════════════════════════════════ */
async function animateHowItWorks(section) {
  await sleep(60);
  animatePreLines(section.querySelector('.flow'), 52);
}

/* ══════════════════════════════════════════════════════
   BENCHMARKS — reveal bench table line by line, then count-up
══════════════════════════════════════════════════════ */
function countUp(el, target, suffix, duration = 900) {
  const start = performance.now();
  const tick  = now => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function animateBenchmarks(section) {
  await sleep(60);
  const bench = section.querySelector('.bench');
  const lineCount = bench ? bench.innerHTML.trim().split('\n').length : 0;
  const lineGap   = 42;
  animatePreLines(bench, lineGap);

  const tableDelay = REDUCED ? 0 : lineCount * lineGap + 160;
  setTimeout(() => {
    section.querySelectorAll('.stat-num[data-count]').forEach(el => {
      countUp(el, parseInt(el.dataset.count, 10), el.dataset.suffix || '');
    });
  }, tableDelay);
}

/* ══════════════════════════════════════════════════════
   MASTER SECTION ORCHESTRATOR
   One observer per section → visible → prompt types → content
══════════════════════════════════════════════════════ */
const SECTION_HANDLERS = {
  'how-it-works': animateHowItWorks,
  'benchmarks':   animateBenchmarks,
  'code':         animateCode,
  'compare':      animateCompare,
  'features':     animateFeatures,
  'footer':       null,
};

function initAllSections() {
  Object.entries(SECTION_HANDLERS).forEach(([id, handler]) => {
    const section = document.getElementById(id);
    if (!section) return;

    onView(section, async () => {
      section.classList.add('visible');

      if (REDUCED) {
        // Show everything at once — no waiting
        if (handler) await handler(section);
        return;
      }

      await sleep(120);
      await typeSectionPrompt(section.querySelector('.section-prompt'));
      if (handler) await handler(section);
    }, 0.05);
  });
}

/* ══════════════════════════════════════════════════════
   CODE TABS — switch + re-animate code block
══════════════════════════════════════════════════════ */
function showTab(event, name) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  event.currentTarget.classList.add('active');
  event.currentTarget.setAttribute('aria-selected', 'true');

  const pane = document.getElementById('tab-' + name);
  if (!pane) return;
  pane.classList.add('active');
  // Animate the code block of the newly shown tab
  requestAnimationFrame(() => revealCodePane(pane));
}

/* ══════════════════════════════════════════════════════
   COPY INSTALL COMMAND
══════════════════════════════════════════════════════ */
function copyInstall() {
  navigator.clipboard.writeText('pip install baar-core').then(() => {
    const btn   = document.getElementById('copy-btn');
    const label = document.getElementById('copy-label');
    btn.classList.add('copied');
    label.textContent = 'copied!';
    setTimeout(() => { btn.classList.remove('copied'); label.textContent = 'copy'; }, 2000);
  });
}

/* ══════════════════════════════════════════════════════
   SMOOTH SCROLL
══════════════════════════════════════════════════════ */
function smoothScroll(event, id) {
  event.preventDefault();
  const el   = document.getElementById(id);
  if (!el) return;
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 44;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH - 16, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════
   GITHUB STARS
══════════════════════════════════════════════════════ */
async function fetchStars() {
  try {
    const res = await fetch('https://api.github.com/repos/orvi2014/Baar-Core');
    if (!res.ok) return;
    const { stargazers_count: n } = await res.json();
    if (typeof n === 'number') {
      document.querySelectorAll('.github-stars').forEach(el => {
        el.textContent = '★ ' + n.toLocaleString();
      });
    }
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════
   PYPI VERSION — auto-updates from the published package
   Fallback: whatever is hardcoded in the HTML
══════════════════════════════════════════════════════ */
async function fetchVersion() {
  try {
    const res = await fetch('https://pypi.org/pypi/baar-core/json');
    if (!res.ok) return;
    const { info: { version } } = await res.json();
    if (!version) return;
    const el = document.getElementById('pkg-version');
    if (el) el.textContent = 'v' + version;
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Hide pre blocks so animatePreLines is the sole revealer
  if (!REDUCED) {
    document.querySelectorAll('.flow, .bench').forEach(el => {
      el.style.opacity = '0';
    });
  }

  // Hide tabs widget so it can slide in
  const tabsWidget = document.querySelector('#code .tabs');
  if (tabsWidget) {
    tabsWidget.style.opacity = '0';
    tabsWidget.style.transform = 'translateY(14px)';
    tabsWidget.style.transition = 'opacity .4s ease, transform .4s ease';
  }

  bootHero();
  initTerminals();
  initAllSections();
  fetchStars();
  fetchVersion();
});
