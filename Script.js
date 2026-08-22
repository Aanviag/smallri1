/* ==========================================================================
   SmallBizBoost RI — script.js (Corrected, Option A, GitHub‑safe)
   Plain vanilla JavaScript. No frameworks.
   ========================================================================== */

/* ------------------------------------------------------------------------
   data.js — static / curated data
   ------------------------------------------------------------------------ */

const STATE_FIPS = "44"; // Rhode Island

const COUNTY_FIPS = {
  bristol: "001",
  kent: "003",
  newport: "005",
  providence: "007",
  washington: "009",
};

const COUNTIES_META = [
  { id: "bristol", name: "Bristol County", note: "Smallest footprint in the state — tight-knit Main Street trade with limited backup capital nearby." },
  { id: "kent", name: "Kent County", note: "Middle-of-the-pack income with the cheapest commercial footprint on the list." },
  { id: "newport", name: "Newport County", note: "Fast-growing income and a high self-employed share, but seasonal and competitive." },
  { id: "providence", name: "Providence County", note: "Deepest labor market and the densest institutional support in the state, with the most direct competition." },
  { id: "washington", name: "Washington County", note: "Highest household income and lowest unemployment — the calmest labor market on the map." },
];

// Fallback snapshot if live fetch fails
const FALLBACK_ECONOMIC_DATA = {
  bristol: { income: 88100, priorIncome: 82400, population: 48500, establishments: 1840, selfEmployed: 10.5, wage: 1160, unemployment: 3.8 },
  kent: { income: 85200, priorIncome: 79100, population: 166000, establishments: 5230, selfEmployed: 9.1, wage: 1190, unemployment: 3.6 },
  newport: { income: 96700, priorIncome: 86800, population: 82900, establishments: 3010, selfEmployed: 14.2, wage: 1148, unemployment: 3.9 },
  providence: { income: 74700, priorIncome: 68400, population: 660700, establishments: 12450, selfEmployed: 8.4, wage: 1287, unemployment: 4.1 },
  washington: { income: 105400, priorIncome: 97100, population: 129800, establishments: 4560, selfEmployed: 12.7, wage: 1105, unemployment: 3.2 },
};

const BUSINESS_TYPES = [
  { id: "food", name: "Food & beverage", multiplier: 1.0 },
  { id: "retail", name: "Retail", multiplier: 0.9 },
  { id: "prof", name: "Professional services", multiplier: 1.2 },
  { id: "personal", name: "Personal care", multiplier: 0.85 },
  { id: "construction", name: "Construction & trades", multiplier: 1.3 },
  { id: "health", name: "Health & wellness", multiplier: 1.1 },
];

const METRICS = [
  { id: "income", label: "Median household income", fmt: (v) => `$${Math.round(v).toLocaleString()}` },
  { id: "growth", label: "5-year income growth (%)", fmt: (v) => `${v.toFixed(1)}%` },
  { id: "wage", label: "Est. average weekly wage ($)", fmt: (v) => `$${Math.round(v).toLocaleString()}` },
  { id: "unemployment", label: "Unemployment rate (%)", fmt: (v) => `${v.toFixed(1)}%`, lowerIsBetter: true },
  { id: "establishments", label: "Business establishments", fmt: (v) => Math.round(v).toLocaleString() },
  { id: "selfEmployed", label: "Self-employed share (%)", fmt: (v) => `${v.toFixed(1)}%` },
  { id: "population", label: "Population", fmt: (v) => Math.round(v).toLocaleString() },
];

const RESOURCES = [
  { tag: "SBA Counseling", name: "Rhode Island Small Business Development Center (RISBDC)", desc: "Free one-on-one business counseling, formation guidance and financial projection review.", addr: "URI Providence Campus, 80 Washington St, Providence", phone: "(401) 874-7232", county: "providence" },
  { tag: "SBA Counseling", name: "SBA Rhode Island District Office", desc: "Loan program guidance (7(a), 504, microloan) and lender matchmaking.", addr: "380 Westminster St, Providence", phone: "(401) 528-4561", county: "providence" },
  { tag: "Mentoring", name: "SCORE Rhode Island", desc: "Volunteer mentors, most retired operators, matched by industry at no cost.", addr: "Statewide, virtual and in-person", phone: "(401) 528-4561", county: "all" },
  { tag: "State Agency", name: "Rhode Island Commerce Corporation", desc: "Small Business Assistance Program, Innovation Vouchers and site selection help.", addr: "315 Iron Horse Way, Providence", phone: "(401) 278-9100", county: "providence" },
  { tag: "CDFI Lending", name: "Community Investment Corporation", desc: "Microloans and credit-building products for founders shut out of bank lending.", addr: "1265 Main St, Warwick", phone: "(401) 421-1105", county: "kent" },
  { tag: "Mentoring", name: "Center for Women & Enterprise RI", desc: "Coaching, capital access and a peer cohort for women-owned businesses.", addr: "10 Davol Sq, Providence", phone: "(401) 277-0800", county: "providence" },
  { tag: "Chamber", name: "Greater Providence Chamber of Commerce", desc: "Largest business network in the state, plus advocacy and B2B introductions.", addr: "30 Exchange Terrace, Providence", phone: "(401) 521-5000", county: "providence" },
  { tag: "Chamber", name: "Central RI Chamber of Commerce", desc: "Serves Warwick, West Warwick, Coventry and East Greenwich businesses.", addr: "3288 Post Rd, Warwick", phone: "(401) 732-1100", county: "kent" },
  { tag: "Chamber", name: "Newport County Chamber of Commerce", desc: "Tourism-season marketing co-ops and hospitality workforce referrals.", addr: "35 Valley Rd, Middletown", phone: "(401) 847-1608", county: "newport" },
  { tag: "Mentoring", name: "Aquidneck Island SCORE Chapter", desc: "Local chapter pairing seasonal and hospitality founders with retired mentors.", addr: "24 Mill St, Newport", phone: "(401) 846-1213", county: "newport" },
  { tag: "Chamber", name: "Bristol County Chamber of Commerce", desc: "Local networking, Main Street promotion and municipal permitting contacts.", addr: "400 Hope St, Bristol", phone: "(401) 245-0750", county: "bristol" },
  { tag: "CDFI Lending", name: "East Bay Community Loan Fund", desc: "Small-dollar loans for East Bay storefronts, with bilingual application support.", addr: "16 Gooding Ave, Bristol", phone: "(401) 253-9100", county: "bristol" },
  { tag: "Chamber", name: "South County Chamber of Commerce", desc: "Seasonal-business planning and shared marketing for the South County coast.", addr: "4808 Tower Hill Rd, Wakefield", phone: "(401) 783-2801", county: "washington" },
];

const TYPES_OF_HELP = ["Every type", "SBA Counseling", "Mentoring", "State Agency", "CDFI Lending", "Chamber"];

function resourceCountForCounty(countyId) {
  return RESOURCES.filter((r) => r.county === "all" || r.county === countyId).length;
}

/* ------------------------------------------------------------------------
   api.js — live data via CORS-safe proxy (AllOrigins RAW)
   ------------------------------------------------------------------------ */

const CENSUS_API_KEY = "47d157768272a26f195d448b5913630c15f1531f"; // your key
const ACS_YEAR = 2022;
const ACS_PRIOR_YEAR = ACS_YEAR - 5;
const CBP_YEAR = 2021;
const FETCH_TIMEOUT_MS = 9000;

// AllOrigins RAW endpoint (GitHub-safe)
const PROXY = "https://api.allorigins.win/raw?url=";

// Helper: attach key
function withKey(url) {
  return `${url}&key=${CENSUS_API_KEY}`;
}

// Safe JSON fetch with validation + retry
async function fetchJson(url, attempt = 1) {
  try {
    const proxied = PROXY + encodeURIComponent(url);
    const res = await fetch(proxied);
    const text = await res.text();

    // Validate JSON
    if (!text || text[0] !== "[" && text[0] !== "{") {
      throw new Error("Invalid JSON returned");
    }

    return JSON.parse(text);
  } catch (err) {
    if (attempt < 2) {
      console.warn("Retrying:", url);
      return fetchJson(url, attempt + 1);
    }
    throw err;
  }
}

// Convert ACS rows to { countyFips: value }
function indexByCountyFips(rows, valueColIndex) {
  const out = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const countyFips = row[row.length - 1];
    out[countyFips] = Number(row[valueColIndex]);
  }
  return out;
}

/* ------------------------------------------------------------------------
   Corrected ACS + CBP + BLS endpoints
   ------------------------------------------------------------------------ */

// ACS income + population
async function fetchIncomeAndPopulation(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/acs/acs5?get=B19013_001E,B01003_001E&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return {
    income: indexByCountyFips(rows, 0),
    population: indexByCountyFips(rows, 1),
  };
}

// ACS prior income
async function fetchPriorIncome(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/acs/acs5?get=B19013_001E&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return indexByCountyFips(rows, 0);
}

// ACS self-employed share (stable endpoint)
async function fetchSelfEmployedShare(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/acs/acs5/profile?get=DP03_0026PE&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return indexByCountyFips(rows, 0);
}

// ACS median earnings → weekly wage
async function fetchMedianEarnings(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/acs/acs5?get=B20002_001E&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return indexByCountyFips(rows, 0);
}

// CBP establishments (corrected: NAICS2017=00 required)
async function fetchEstablishments(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/cbp?get=ESTAB&NAICS2017=00&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return indexByCountyFips(rows, 0);
}

// BLS unemployment (with safe fallback)
async function fetchUnemploymentRate(countyFips) {
  const seriesId = `LAUCN${STATE_FIPS}${countyFips}0000000003`;
  const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}`;
  const json = await fetchJson(url);

  const series = json?.Results?.series?.[0]?.data;
  if (!series || !series.length) return null;

  return Number(series[0].value);
}
/* ------------------------------------------------------------------------
   chart.js — Canvas charts
   ------------------------------------------------------------------------ */

const CHART_COLORS = {
  teal: "#207388",
  green: "#2F6A50",
  line: "rgba(17,33,44,0.14)",
  muted: "#5B6670",
  navy: "#11212C",
};

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  return { ctx, width, height };
}

function formatShortNumber(v) {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k`;
  return `${Math.round(v)}`;
}

function drawRoundedTopRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function renderCountyBarChart(canvas, labels, values, leaderLabel) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  const { ctx, width, height } = prepareCanvas(canvas);

  const padding = { top: 16, right: 12, bottom: 28, left: 52 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...values, 1) * 1.15;

  ctx.font = "12px Inter, sans-serif";
  ctx.strokeStyle = CHART_COLORS.line;
  ctx.fillStyle = CHART_COLORS.muted;
  ctx.lineWidth = 1;

  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const v = (maxVal / ticks) * i;
    const y = padding.top + chartH - (v / maxVal) * chartH;

    ctx.beginPath();
    ctx.moveTo(padding.left, y + 0.5);
    ctx.lineTo(padding.left + chartW, y + 0.5);
    ctx.stroke();

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatShortNumber(v), padding.left - 10, y);
  }

  const gap = 20;
  const barWidth = (chartW - gap * (values.length - 1)) / values.length;

  values.forEach((v, i) => {
    const x = padding.left + i * (barWidth + gap);
    const barH = (v / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = labels[i] === leaderLabel ? CHART_COLORS.green : CHART_COLORS.teal;
    drawRoundedTopRect(ctx, x, y, barWidth, barH, 4);
    ctx.fill();

    ctx.fillStyle = CHART_COLORS.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(labels[i], x + barWidth / 2, padding.top + chartH + 8);
  });
}

function renderScoreRadarChart(canvas, score) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  const { ctx, width, height } = prepareCanvas(canvas);

  const cx = width / 2;
  const cy = height / 2 + 4;
  const radius = Math.max(Math.min(width, height) / 2 - 34, 10);

  const axes = [
    { label: "Household", value: score.household },
    { label: "Labor cost", value: score.labor },
    { label: "Market", value: score.market },
    { label: "Institutional", value: score.institutional },
    { label: "Stability", value: score.stability },
  ];

  const n = axes.length;
  const angleStep = (Math.PI * 2) / n;
  const startAngle = -Math.PI / 2;

  const angleFor = (i) => startAngle + i * angleStep;

  ctx.strokeStyle = CHART_COLORS.line;
  ctx.lineWidth = 1;

  const rings = 4;
  for (let r = 1; r <= rings; r++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = angleFor(i % n);
      const rr = radius * (r / rings);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.font = "11px Inter, sans-serif";
  ctx.fillStyle = CHART_COLORS.muted;

  axes.forEach((ax, i) => {
    const a = angleFor(i);
    const x2 = cx + Math.cos(a) * radius;
    const y2 = cy + Math.sin(a) * radius;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const lx = cx + Math.cos(a) * (radius + 14);
    const ly = cy + Math.sin(a) * (radius + 14);

    ctx.textAlign =
      Math.abs(Math.cos(a)) < 0.3 ? "center" : Math.cos(a) > 0 ? "left" : "right";
    ctx.textBaseline =
      Math.abs(Math.sin(a)) < 0.3 ? "middle" : Math.sin(a) > 0 ? "top" : "bottom";

    ctx.fillText(ax.label, lx, ly);
  });

  ctx.beginPath();
  axes.forEach((ax, i) => {
    const a = angleFor(i);
    const rr = radius * (Math.min(Math.max(ax.value, 0), 100) / 100);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.closePath();
  ctx.fillStyle = "rgba(32,115,136,0.35)";
  ctx.strokeStyle = CHART_COLORS.teal;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = CHART_COLORS.teal;
  axes.forEach((ax, i) => {
    const a = angleFor(i);
    const rr = radius * (Math.min(Math.max(ax.value, 0), 100) / 100);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ------------------------------------------------------------------------
   Improved Scoring Model (as requested)
   ------------------------------------------------------------------------ */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function computeScore(county, businessType, employees, rent, annualRent, annualPayroll) {
  // ⭐ Improved Household Score
  const household =
    clamp(
      ((county.income - 60000) / 60000) * 65 +
        clamp(county.growth, -5, 15) * 2.2,
      0,
      100
    );

  // ⭐ Improved Labor Score
  const wagePressure = (county.wage - 950) / 3.5;
  const businessTypePressure = (businessType.multiplier - 1) * 50;
  const marketFit = clamp(100 - wagePressure - businessTypePressure, 0, 100);

  const rentPerHead = annualRent / Math.max(employees, 1);
  const occupancyPressure = clamp((rentPerHead - 8500) / 280, -15, 55);
  const staffingPressure = clamp((employees - 2) * 3.5, -10, 28);

  const planFit = clamp(100 - occupancyPressure - staffingPressure, 0, 100);

  const labor = Math.round(marketFit * 0.5 + planFit * 0.5);

  // ⭐ Improved Market Score
  const market = clamp((county.establishments / 14000) * 100, 0, 100);

  // ⭐ Improved Institutional Score
  const resources = resourceCountForCounty(county.id);
  const institutional = clamp((resources / 10) * 100, 0, 100);

  // ⭐ Improved Stability Score
  const stability = clamp(100 - county.unemployment * 12, 0, 100);

  // ⭐ Final Weighted Score
  const weights = {
    household: 0.28,
    labor: 0.22,
    market: 0.18,
    institutional: 0.20,
    stability: 0.12,
  };

  const overall = Math.round(
    household * weights.household +
      labor * weights.labor +
      market * weights.market +
      institutional * weights.institutional +
      stability * weights.stability
  );

  return {
    household: Math.round(household),
    labor: clamp(labor, 0, 100),
    market: Math.round(market),
    institutional: Math.round(institutional),
    stability: Math.round(stability),
    overall,
    resources,
  };
}
/* ------------------------------------------------------------------------
   app.js — state, rendering, events
   ------------------------------------------------------------------------ */

const state = {
  page: "home",
  countyId: "providence",
  businessId: "food",
  rent: 3000,
  employees: 2,
  metric: "income",
  filterCounty: "all",
  filterType: "Every type",
  economicData: null,
  dataSources: null,
  dataStatus: "loading", // loading | live | partial | fallback
};

function getCounty(id) {
  const meta = COUNTIES_META.find((c) => c.id === id);
  const econ = state.economicData[id];
  return { ...meta, ...econ };
}

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/* ------------------------------------------------------------------------
   Data status badge
   ------------------------------------------------------------------------ */

function renderDataStatusBadge() {
  const el = $("#data-status");
  if (!el) return;

  const map = {
    loading: { text: "Loading live Census & BLS data…", cls: "status-loading" },
    live: { text: "Live Census & BLS data", cls: "status-live" },
    partial: { text: "Some figures are cached — live fetch partially unavailable", cls: "status-partial" },
    fallback: { text: "Showing cached data — live fetch unavailable", cls: "status-fallback" },
  };

  const s = map[state.dataStatus];
  el.textContent = s.text;
  el.className = `data-status ${s.cls}`;
}

/* ------------------------------------------------------------------------
   Navigation
   ------------------------------------------------------------------------ */

function renderNav() {
  $all(".nav-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === state.page);
  });

  $all("main > section").forEach((sec) => {
    sec.classList.toggle("hidden", sec.id !== `page-${state.page}`);
  });

  window.scrollTo({ top: 0, behavior: "auto" });
}

/* ------------------------------------------------------------------------
   Home page rendering
   ------------------------------------------------------------------------ */

function renderHome() {
  const county = getCounty(state.countyId);
  const bt = BUSINESS_TYPES.find((b) => b.id === state.businessId);

  const annualPayroll = Math.round(county.wage * state.employees * 52 * bt.multiplier);
  const annualRent = state.rent * 12;
  const costFloor = annualPayroll + annualRent + 18000;

  const score = computeScore(county, bt, state.employees, state.rent, annualRent, annualPayroll);

  const verdict =
    score.overall < 40
      ? { label: "Proceed carefully", cls: "badge-rust", note: "Costs or demand are working against you here. Compare a neighbouring county before committing." }
      : score.overall < 70
      ? { label: "Workable, with tradeoffs", cls: "badge-gold", note: "The fundamentals are mixed. Lean on local resources to help close the gap." }
      : { label: "Strong formation climate", cls: "badge-green", note: "Demand, labor cost and institutional support are aligned in your favor." };

  $("#county-select").value = state.countyId;
  $("#business-select").value = state.businessId;

  $("#rent-slider").value = state.rent;
  $("#rent-value").textContent = `$${state.rent.toLocaleString()}`;

  $("#employees-slider").value = state.employees;
  $("#employees-value").textContent = state.employees;

  $("#row-payroll").textContent = `$${annualPayroll.toLocaleString()}`;
  $("#row-rent").textContent = `$${annualRent.toLocaleString()}`;
  $("#row-costfloor").textContent = `$${costFloor.toLocaleString()}`;

  $("#payroll-note").textContent =
    `Payroll uses an ACS-derived average weekly wage ($${Math.round(county.wage).toLocaleString()}/week) adjusted for the labor intensity of your business type. The cost floor adds $18,000 for licensing, insurance and utilities.`;

  $("#score-eyebrow").textContent = `FORMATION CLIMATE SCORE · ${county.name.toUpperCase()}`;
  $("#score-number").textContent = score.overall;

  const badge = $("#score-badge");
  badge.textContent = verdict.label;
  badge.className = `badge ${verdict.cls}`;

  $("#score-note").textContent = verdict.note;
  $("#county-note").textContent = county.note;

  $("#bar-household").style.width = `${score.household}%`;
  $("#bar-labor").style.width = `${score.labor}%`;
  $("#bar-market").style.width = `${score.market}%`;
  $("#bar-institutional").style.width = `${score.institutional}%`;
  $("#bar-stability").style.width = `${score.stability}%`;

  $("#val-household").textContent = `${score.household}/100`;
  $("#val-labor").textContent = `${score.labor}/100`;
  $("#val-market").textContent = `${score.market}/100`;
  $("#val-institutional").textContent = `${score.institutional}/100`;
  $("#val-stability").textContent = `${score.stability}/100`;

  const radarCanvas = $("#radar-chart");
  if (radarCanvas) renderScoreRadarChart(radarCanvas, score);

  $("#resources-cta").textContent = `${score.resources} local resources`;
}

/* ------------------------------------------------------------------------
   Metric pills
   ------------------------------------------------------------------------ */

function renderMetricPills() {
  const container = $("#metric-pills");
  container.innerHTML = "";

  METRICS.forEach((m) => {
    const btn = document.createElement("button");
    btn.className = "metric-pill";
    btn.dataset.metric = m.id;
    btn.textContent = m.label;

    if (m.id === state.metric) btn.classList.add("active");

    btn.addEventListener("click", () => {
      state.metric = m.id;
      renderCounties();
    });

    container.appendChild(btn);
  });
}

/* ------------------------------------------------------------------------
   County comparison page
   ------------------------------------------------------------------------ */

function renderCounties() {
  const metric = METRICS.find((m) => m.id === state.metric);

  const labels = COUNTIES_META.map((c) => c.name.split(" ")[0]);
  const values = COUNTIES_META.map((c) => state.economicData[c.id][metric.id]);

  let leaderIndex = 0;

  if (metric.lowerIsBetter) {
    let min = Infinity;
    values.forEach((v, i) => {
      if (v < min) {
        min = v;
        leaderIndex = i;
      }
    });
  } else {
    let max = -Infinity;
    values.forEach((v, i) => {
      if (v > max) {
        max = v;
        leaderIndex = i;
      }
    });
  }

  const leaderLabel = labels[leaderIndex];

  $("#metric-title").textContent = metric.label;
  $("#metric-leader").textContent =
    `Leader: ${COUNTIES_META[leaderIndex].name} (${metric.fmt(values[leaderIndex])})`;

  const canvas = $("#bar-chart");
  if (canvas) renderCountyBarChart(canvas, labels, values, leaderLabel);
}

/* ------------------------------------------------------------------------
   Resources page
   ------------------------------------------------------------------------ */

function renderResources() {
  const countyFilter = state.filterCounty;
  const typeFilter = state.filterType;

  const grid = $("#resources-grid");
  const emptyCard = $("#resources-empty");

  const filtered = RESOURCES.filter((r) => {
    const countyOk =
      countyFilter === "all" || r.county === "all" || r.county === countyFilter;
    const typeOk = typeFilter === "Every type" || r.tag === typeFilter;
    return countyOk && typeOk;
  });

  $("#resources-count").textContent = `${filtered.length} organizations`;

  grid.innerHTML = "";

  if (filtered.length === 0) {
    emptyCard.classList.remove("hidden");
  } else {
    emptyCard.classList.add("hidden");

    filtered.forEach((r) => {
      const card = document.createElement("div");
      card.className = "card resource-card";

      card.innerHTML = `
        <span class="tag">${r.tag}</span>
        <h3>${r.name}</h3>
        <p>${r.desc}</p>
        <div class="resource-meta">
          <span>${r.addr}</span>
          <span>${r.phone}</span>
          <span>${
            r.county === "all"
              ? "Serves all counties"
              : COUNTIES_META.find((c) => c.id === r.county)?.name || ""
          }</span>
        </div>
        <div class="resource-footer">
          <span class="small muted">Independent listing · verify details before relying on them.</span>
        </div>
      `;

      grid.appendChild(card);
    });
  }
}

/* ------------------------------------------------------------------------
   Filters
   ------------------------------------------------------------------------ */

function renderFilters() {
  const countySelect = $("#filter-county");
  const typeSelect = $("#filter-type");

  const countyOptions = [{ value: "all", label: "All counties" }].concat(
    COUNTIES_META.map((c) => ({ value: c.id, label: c.name }))
  );

  countySelect.innerHTML = countyOptions
    .map((o) => `<option value="${o.value}">${o.label}</option>`)
    .join("");

  countySelect.value = state.filterCounty;

  typeSelect.innerHTML = TYPES_OF_HELP.map(
    (t) => `<option value="${t}">${t}</option>`
  ).join("");

  typeSelect.value = state.filterType;
}

/* ------------------------------------------------------------------------
   Ticker
   ------------------------------------------------------------------------ */

function renderTicker() {
  const el = $("#ticker");
  if (!el) return;

  const parts = COUNTIES_META.map((c) => {
    const econ = state.economicData[c.id];
    return `${c.name.toUpperCase()}: $${Math.round(econ.income).toLocaleString()} income · ${econ.growth.toFixed(
      1
    )}% 5-year growth · ${econ.unemployment.toFixed(1)}% unemployment`;
  });

  el.innerHTML = parts.map((p) => `<span>${p}</span>`).join("");
}

/* ------------------------------------------------------------------------
   Events
   ------------------------------------------------------------------------ */

function wireEvents() {
  $all(".nav-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page) {
        state.page = page;
        renderNav();

        if (page === "home") renderHome();
        if (page === "counties") renderCounties();
        if (page === "resources") renderResources();
      }
    });
  });

  $("#logo-link").addEventListener("click", () => {
    state.page = "home";
    renderNav();
    renderHome();
  });

  $("#mobile-menu-toggle").addEventListener("click", () => {
    $("#mobile-menu").classList.toggle("hidden");
  });

  $("#county-select").addEventListener("change", (e) => {
    state.countyId = e.target.value;
    renderHome();
  });

  $("#business-select").addEventListener("change", (e) => {
    state.businessId = e.target.value;
    renderHome();
  });

  $("#rent-slider").addEventListener("input", (e) => {
    state.rent = Number(e.target.value);
    $("#rent-value").textContent = `$${state.rent.toLocaleString()}`;
    renderHome();
  });

  $("#employees-slider").addEventListener("input", (e) => {
    state.employees = Number(e.target.value);
    $("#employees-value").textContent = state.employees;
    renderHome();
  });

  $("#compare-counties-btn").addEventListener("click", () => {
    state.page = "counties";
    renderNav();
    renderCounties();
  });

  $("#compare-counties-btn-2").addEventListener("click", () => {
    state.page = "counties";
    renderNav();
    renderCounties();
  });

  $("#resources-cta").addEventListener("click", () => {
    state.page = "resources";
    renderNav();
    renderResources();
  });

  $("#filter-county").addEventListener("change", (e) => {
    state.filterCounty = e.target.value;
    renderResources();
  });

  $("#filter-type").addEventListener("change", (e) => {
    state.filterType = e.target.value;
    renderResources();
  });
}

/* ------------------------------------------------------------------------
   Select initialization
   ------------------------------------------------------------------------ */

function initSelects() {
  const countySelect = $("#county-select");
  countySelect.innerHTML = COUNTIES_META.map(
    (c) => `<option value="${c.id}">${c.name}</option>`
  ).join("");
  countySelect.value = state.countyId;

  const businessSelect = $("#business-select");
  businessSelect.innerHTML = BUSINESS_TYPES.map(
    (b) => `<option value="${b.id}">${b.name}</option>`
  ).join("");
  businessSelect.value = state.businessId;
}

/* ------------------------------------------------------------------------
   Initialization
   ------------------------------------------------------------------------ */

async function init() {
  renderNav();
  renderDataStatusBadge();
  initSelects();
  renderMetricPills();
  renderFilters();

  try {
    const { records, sources, allLive } = await fetchAllEconomicData();
    state.economicData = records;
    state.dataSources = sources;
    state.dataStatus = allLive ? "live" : "partial";
  } catch (err) {
    console.warn("Live fetch failed, using fallback:", err);
    state.economicData = FALLBACK_ECONOMIC_DATA;
    state.dataStatus = "fallback";
  }

  renderDataStatusBadge();
  renderTicker();
  renderHome();
}

/* ------------------------------------------------------------------------
   DOM Ready
   ------------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  wireEvents();
  init();
});
