/**
 * dataWave: a dynamic analytical synthesis visualization tool for regional data
 * =============================================================================
 *
 * This script manages the rendering and interaction of a wave-based visualization
 * that represents various data metrics across Pacific states and territories.
 * The visualization dynamically updates based on user input and animates over time.
 *
 * @author 36.270
 * @version "1.0"
 * @date 2025-07-29
 * @listen Yorros by Andrew Rothschild
 *
 * @license "Unlicense"
 *
 * @description This script is part of a visualization project submission for the
 * Pacific DataViz 2025 challenge. It visualizes data across multiple categories
 * including political leadership, development, security, resources, climate change,
 * ocean health, and technology connectivity. The visualization uses a unique
 * wave-based representation to translate data point as pearls, allowing
 * users to interactively explore global trends across the Pacific region.
 * It displays complex datasets as concise representations (high-level overview).
 * enabling to transform diverse data into meaningful narratives.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) DATA PREPARATION
// ─────────────────────────────────────────────────────────────────────────────

// Constants and lookups
import data from './data.json';
import './styles.scss';
import faviconURL from './favicon.ico';

// qualitative color palette by state code
const STATE_COLORS = {
  FJ: '#fdae6b', PG: '#e6550d', SB: '#7f2704', VU: '#fd8d3c',
  NC: '#cb181d', KI: '#3182bd', MH: '#9ecae1', FM: '#225ea8',
  NR: '#6baed6', PW: '#bcbddc', NU: '#f7fcb9', WS: '#74c476',
  TO: '#006d2c', TV: '#addd8e', PF: '#87a96b', CK: '#00a550'
};

// human‐readable class labels
const CLASS_LABELS = {
  1: "Political Leadership and Regionalism",
  2: "People-Centred Development",
  3: "Peace and Security",
  4: "Resources and Economic Development",
  5: "Climate Change and Disasters",
  6: "Ocean and Environment",
  7: "Technology and Connectivity"
};

const WAVE_COUNT = 100;
const DFLT_BG = 'rgba(255,255,255,0.05)';

function aggregateAndNormalize(raw) {
  const byYearClassState = {};
  const yearsSet = new Set();
  const classesSet = new Set();

  raw.forEach(d => {
    const {
      year, class_num: cls, state_code: sc,
      state_name: sn, subregion_name: sub,
      value_contribution_to_class: val,
      state_rank_per_class: rank,
      pct_missing_values: miss
    } = d;

    yearsSet.add(year);
    classesSet.add(cls);

    byYearClassState[year] ||= {};
    const bucket = (byYearClassState[year][cls] ||= {});

    bucket[sc] ||= { stateName: sn, subregion: sub, rawSum: 0, rank, missing: miss };
    bucket[sc].rawSum += val;
    bucket[sc].rank = rank;
    bucket[sc].missing = miss;
  });

  // Normalize to shares
  const byYearClass = {};
  Object.entries(byYearClassState).forEach(([yr, classes]) => {
    Object.entries(classes).forEach(([cls, states]) => {
      const key = `${yr}|${cls}`;
      const total = Object.values(states).reduce((s, st) => s + st.rawSum, 0) || 1;
      byYearClass[key] = Object.fromEntries(
        Object.entries(states).map(([sc, s]) => [
          sc,
          {
            stateName: s.stateName,
            subregion: s.subregion,
            share: s.rawSum / total,
            rank: s.rank,
            missing: s.missing
          }
        ])
      );
    });
  });

  return {
    byYearClass,
    years: [...yearsSet].sort((a, b) => a - b),
    classes: [...classesSet].sort((a, b) => a - b)
  };
}

function distributeWaves(entries, totalWaves) {
  // Fair‐rounding algorithm: compute exact, floor (≥1), then distribute remainders
  const ideal = entries.map(e => ({ ...e, exact: e.share * totalWaves }));
  let assigned = 0;
  const floored = ideal.map(item => {
    const base = item.share > 0 ? Math.max(1, Math.floor(item.exact)) : 0;
    assigned += base;
    return { ...item, count: base, rem: item.exact - Math.floor(item.exact) };
  });

  let delta = totalWaves - assigned;
  floored.sort((a, b) => b.rem - a.rem);

  for (let i = 0; delta !== 0; i = (i + 1) % floored.length) {
    const it = floored[i];
    if (it.share === 0) continue;
    if (delta > 0) { it.count++; delta--; }
    else if (it.count > 1) { it.count--; delta++; }
  }

  return Object.fromEntries(floored.map(x => [x.stateCode, x.count]));
}


// ─────────────────────────────────────────────────────────────────────────────
// 2) WAVE‐CHART RENDERER & CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

const sea = document.getElementById('sea');
const classPicker = document.getElementById('class-picker');
const toggleBtn = document.getElementById('toggle-animation');
const tooltip = document.getElementById('tooltip');
const warning = document.getElementById('no-data-warning');
const yearToggle = document.getElementById('year-toggle-btn');

let animationsPaused = false;

// Initialize data
const { byYearClass, years, classes } = aggregateAndNormalize(data);
let currentYear = years[0];

function populateControls() {
  // Year toggle
  yearToggle.textContent = currentYear;
  yearToggle.addEventListener('click', () => {
    currentYear = years[(years.indexOf(currentYear) + 1) % years.length];
    yearToggle.textContent = currentYear;
    renderChart();
  });

  // Class picker
  classes.forEach(c => {
    const label = CLASS_LABELS[c] || `Class ${c}`;
    classPicker.appendChild(new Option(`${c}: ${label}`, c));
  });
  classPicker.addEventListener('change', renderChart);

  // Animation toggle
  toggleBtn.addEventListener('click', () => {
    animationsPaused = !animationsPaused;
    setAnimationState(animationsPaused);
  });

  // Spacebar toggle
  window.addEventListener('keydown', e => {
    const el = document.activeElement;
    if (['INPUT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable) return;
    if (e.code === 'Space') {
      e.preventDefault();
      animationsPaused = !animationsPaused;
      setAnimationState(animationsPaused);
    }
  });

  // Tooltip interactions
  sea.addEventListener('mouseover', onWaveHover);
  sea.addEventListener('mouseout', onWaveOut);
  sea.addEventListener('mousemove', onWaveMove);
}

function setAnimationState(paused) {
  sea.querySelectorAll('.wave_fade, .wave_translate, .wave_skew')
    .forEach(el => el.style.animationPlayState = paused ? 'paused' : 'running');
  toggleBtn.textContent = paused ? '➲' : '❙❙';
}

function renderChart() {
  sea.innerHTML = '';
  const cls = classPicker.value;
  const key = `${currentYear}|${cls}`;
  const info = byYearClass[key] || {};
  const entries = Object.entries(info).map(([sc, i]) => ({
    stateCode: sc,
    stateName: i.stateName,
    subregion: i.subregion,
    share: i.share,
    rank: i.rank,
    missing: i.missing
  }));

  if (!entries.length) {
    warning.hidden = false;
    sea.classList.add('no-data');
    return;
  }
  warning.hidden = true;
  sea.classList.remove('no-data');

  // sort by subregion then stateName
  entries.sort((a, b) => {
    const d = a.subregion.localeCompare(b.subregion);
    return d !== 0 ? d : a.stateName.localeCompare(b.stateName);
  });

  const counts = distributeWaves(entries, WAVE_COUNT);

  // place actual waves
  let placed = 0;
  entries.forEach(e => {
    const color = STATE_COLORS[e.stateCode] || DFLT_BG;
    const cnt = counts[e.stateCode] || 0;

    for (let i = 0; i < cnt; i++, placed++) {
      const wave = createWaveElement(color, e);
      sea.appendChild(wave);
    }
  });

  // fill remainder
  for (; placed < WAVE_COUNT; placed++) {
    const wave = createWaveElement(DFLT_BG, {});
    sea.appendChild(wave);
  }

  setAnimationState(animationsPaused);
}

function createWaveElement(bg, dataAttrs) {
  const wave = document.createElement('div');
  wave.className = 'wave';
  wave.innerHTML = `
    <div class="wave_fade">
      <div class="wave_translate">
        <div class="wave_skew">
          <div class="wave_graphic"></div>
        </div>
      </div>
    </div>`;
  const g = wave.querySelector('.wave_graphic');
  g.style.background = bg;

  if (dataAttrs.stateName) {
    wave.dataset.state = dataAttrs.stateName;
    wave.dataset.subregion = dataAttrs.subregion;
    wave.dataset.share = (dataAttrs.share * 100).toFixed(1) + '/100';
    wave.dataset.rank = dataAttrs.rank;
    wave.dataset.missing = dataAttrs.missing.toFixed(1) + '%';
  }
  return wave;
}

function onWaveHover(e) {
  const w = e.target.closest('.wave');
  if (!w?.dataset.state) return;
  const s = w.dataset.state;
  sea.querySelectorAll(`.wave[data-state="${s}"]`)
    .forEach(x => x.classList.add('hover-effect'));

  tooltip.textContent =
    `${w.dataset.state} (${w.dataset.subregion})\n` +
    `Score: ${w.dataset.share}\n` +
    `Rank: ${w.dataset.rank}\n` +
    `Missing data: ${w.dataset.missing}`;
  tooltip.classList.add('show');
}

function onWaveOut(e) {
  const w = e.target.closest('.wave');
  if (!w?.dataset.state) return;
  const s = w.dataset.state;
  sea.querySelectorAll(`.wave[data-state="${s}"]`)
    .forEach(x => x.classList.remove('hover-effect'));
  tooltip.classList.remove('show');
}

function onWaveMove(e) {
  const tw = tooltip.offsetWidth,
    th = tooltip.offsetHeight,
    vw = window.innerWidth,
    edge = vw * 0.05;

  let left = e.pageX - tw / 2,
    top = e.pageY - th;

  if (left < edge) left = edge;
  if (left + tw > vw - edge) left = vw - tw - edge;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) TITLE MORPHING
// ─────────────────────────────────────────────────────────────────────────────

const morphElts = {
  text1: document.getElementById("morph-text1"),
  text2: document.getElementById("morph-text2")
};
const morphTexts = [
  "PACIFIC DATAVIZ 2025", "data waves", "tides of tomorrow",
  "oceans of opportunity", "future currents", "2050 is now."
];
const MORPH_TIME = 2,    // seconds
  COOLDOWN = 0.35,
  MAX_LOOPS = 2;

let mi = morphTexts.length - 1,
  morph = 0,
  cooldown = COOLDOWN,
  loops = 0,
  last = performance.now() / 1000,
  isMorphPaused = false;

function initMorph() {
  morphElts.text1.textContent = morphTexts[mi];
  morphElts.text2.textContent = morphTexts[(mi + 1) % morphTexts.length];

  const cont = document.getElementById("morph-container");
  cont.addEventListener("mouseenter", () => isMorphPaused = true);
  cont.addEventListener("mouseleave", () => isMorphPaused = false);

  requestAnimationFrame(tickMorph);
}

function setMorph(frac) {
  const blurIn = Math.min(8 / frac - 8, 100);
  const blurOut = Math.min(8 / (1 - frac) - 8, 100);
  morphElts.text2.style.filter = `blur(${blurIn}px)`;
  morphElts.text2.style.opacity = Math.pow(frac, 0.4);
  morphElts.text1.style.filter = `blur(${blurOut}px)`;
  morphElts.text1.style.opacity = Math.pow(1 - frac, 0.4);
  morphElts.text1.textContent = morphTexts[mi];
  morphElts.text2.textContent = morphTexts[(mi + 1) % morphTexts.length];
}

function doCooldown() {
  morphElts.text2.style.filter = '';
  morphElts.text2.style.opacity = '1';
  morphElts.text1.style.filter = '';
  morphElts.text1.style.opacity = '0';
  morph = 0;
}

function tickMorph(nowMs) {
  const now = nowMs / 1000, dt = now - last;
  last = now;

  if (isMorphPaused || loops >= MAX_LOOPS) {
    cooldown = COOLDOWN;
    doCooldown();
  }
  else if (cooldown > 0) {
    cooldown -= dt;
    if (cooldown <= 0) {
      mi++;
      if (mi % morphTexts.length === 0) {
        loops++;
        if (loops >= MAX_LOOPS) {
          doCooldown();
          return;
        }
      }
    }
    doCooldown();
  } else {
    morph += dt;
    let frac = morph / MORPH_TIME;
    if (frac >= 1) {
      frac = 1;
      cooldown = COOLDOWN;
    }
    setMorph(frac);
  }

  requestAnimationFrame(tickMorph);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) INFO‐PANEL
// ─────────────────────────────────────────────────────────────────────────────

function getTextNodes(root) {
  const w = document.createTreeWalker(
    root, NodeFilter.SHOW_TEXT,
    {
      acceptNode: n => /\S/.test(n.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    }
  );
  const a = [];
  while (w.nextNode()) a.push(w.currentNode);
  return a;
}

function wrapAllCharacters(container, step = 0.04) {
  let count = 0;
  getTextNodes(container).forEach(node => {
    const parts = node.nodeValue.match(/(\s+|[^\s]+)/g);
    if (!parts) return;
    const frag = document.createDocumentFragment();
    parts.forEach(p => {
      if (/^\s+$/.test(p)) {
        frag.appendChild(document.createTextNode(p));
      } else {
        const sp = document.createElement('span');
        sp.textContent = p;
        sp.style.animationDelay = (count * step) + 's';
        frag.appendChild(sp);
        count++;
      }
    });
    node.parentNode.replaceChild(frag, node);
  });
}

function initInfoPanel() {
  const btn = document.getElementById("info-button");
  const container = document.getElementById("info-container");
  const pnl = document.getElementById("info-panel");
  const ov = document.getElementById("page-overlay");
  const content = pnl.querySelector('.info-content');

  if (content) wrapAllCharacters(content);

  let wasPaused = false;
  btn.addEventListener('mouseenter', () => {
    wasPaused = animationsPaused;
    animationsPaused = true;
    setAnimationState(true);
    container.classList.add('active');
  });

  function closePanel() {
    container.classList.remove('active');
    animationsPaused = wasPaused;
    setAnimationState(wasPaused);
  }

  btn.addEventListener('mouseleave', e => {
    if (!pnl.contains(e.relatedTarget)) {
      closePanel();
    }
  });

  ov.addEventListener('mouseenter', closePanel);

  container.addEventListener("wheel", e => {
    e.preventDefault();
    pnl.scrollTop += e.deltaY;
  }, { passive: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // attach favicon
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = faviconURL;
  document.head.append(link);

  populateControls();
  renderChart();
  initMorph();
  initInfoPanel();
});
