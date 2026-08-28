/* ==========================================================================
   SmallBizBoost RI — script.js (rewritten)
   Plain vanilla JavaScript. No frameworks, no external libraries.
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

// Used only when a live fetch fails. Roughly representative, NOT live.
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
   api.js — live data fetching
   ------------------------------------------------------------------------ */

const CENSUS_API_KEY = "47d157768272a26f195d448b5913630c15f1531f"; // your key

const ACS_YEAR = 2023;
const ACS_PRIOR_YEAR = ACS_YEAR - 5;
const CBP_YEAR = 2023;
const FETCH_TIMEOUT_MS = 9000;

function withKey(url) {
  return CENSUS_API_KEY ? `${url}&key=${CENSUS_API_KEY}` : url;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function indexByCountyFips(rows, valueColIndex) {
  const out = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const countyFips = row[row.length - 1];
    out[countyFips] = Number(row[valueColIndex]);
  }
  return out;
}

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

async function fetchPriorIncome(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/acs/acs5?get=B19013_001E&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return indexByCountyFips(rows, 0);
}

async function fetchSelfEmployedShare(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/acs/acs5/profile?get=DP03_0026PE&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return indexByCountyFips(rows, 0);
}

async function fetchMedianEarnings(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/acs/acs5?get=B20002_001E&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return indexByCountyFips(rows, 0);
}

async function fetchEstablishments(year) {
  const url = withKey(
    `https://api.census.gov/data/${year}/cbp?get=ESTAB&for=county:*&in=state:${STATE_FIPS}`
  );
  const rows = await fetchJson(url);
  return indexByCountyFips(rows, 0);
}

async function fetchUnemploymentRate(countyFips) {
  const seriesId = `LAUCN${STATE_FIPS}${countyFips}0000000003`;
  const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}`;
  const json = await fetchJson(url);
  const series = json?.Results?.series?.[0]?.data?.[0];
  if (!series) throw new Error(`No BLS data for ${seriesId}`);
  return Number(series.value);
}

async function fetchAllEconomicData() {
  const countyIds = Object.keys(COUNTY_FIPS);
  const records = {};
  const sources = {};
  countyIds.forEach((id) => {
    records[id] = { ...FALLBACK_ECONOMIC_DATA[id] };
    sources[id] = {
      income: "fallback", priorIncome: "fallback", growth: "fallback",
      population: "fallback", establishments: "fallback",
      selfEmployed: "fallback", wage: "fallback", unemployment: "fallback",
    };
  });

  const results = await Promise.allSettled([
    fetchIncomeAndPopulation(ACS_YEAR),
    fetchPriorIncome(ACS_PRIOR_YEAR),
    fetchSelfEmployedShare(ACS_YEAR),
    fetchMedianEarnings(ACS_YEAR),
    fetchEstablishments(CBP_YEAR),
    ...countyIds.map((id) => fetchUnemploymentRate(COUNTY_FIPS[id])),
  ]);

  const [incomePopRes, priorIncomeRes, selfEmpRes, earningsRes, estabRes, ...unemploymentRes] = results;

  if (incomePopRes.status === "fulfilled") {
    countyIds.forEach((id) => {
      const fips = COUNTY_FIPS[id];
      const income = incomePopRes.value.income[fips];
      const population = incomePopRes.value.population[fips];
      if (Number.isFinite(income)) { records[id].income = income; sources[id].income = "live"; }
      if (Number.isFinite(population)) { records[id].population = population; sources[id].population = "live"; }
    });
  }

  if (priorIncomeRes.status === "fulfilled") {
    countyIds.forEach((id) => {
      const v = priorIncomeRes.value[COUNTY_FIPS[id]];
      if (Number.isFinite(v)) { records[id].priorIncome = v; sources[id].priorIncome = "live"; }
    });
  }

  if (selfEmpRes.status === "fulfilled") {
    countyIds.forEach((id) => {
      const v = selfEmpRes.value[COUNTY_FIPS[id]];
      if (Number.isFinite(v)) { records[id].selfEmployed = v; sources[id].selfEmployed = "live"; }
    });
  }

  if (earningsRes.status === "fulfilled") {
    countyIds.forEach((id) => {
      const v = earningsRes.value[COUNTY_FIPS[id]];
      if (Number.isFinite(v)) { records[id].wage = v / 52; sources[id].wage = "live"; }
    });
  }

  if (estabRes.status === "fulfilled") {
    countyIds.forEach((id) => {
      const v = estabRes.value[COUNTY_FIPS[id]];
      if (Number.isFinite(v)) { records[id].establishments = v; sources[id].establishments = "live"; }
    });
  }

  unemploymentRes.forEach((r, i) => {
    const id = countyIds[i];
    if (r.status === "fulfilled" && Number.isFinite(r.value)) {
      records[id].unemployment = r.value;
      sources[id].unemployment = "live";
    }
  });

  countyIds.forEach((id) => {
    const { income, priorIncome } = records[id];
    if (Number.isFinite(income) && Number.isFinite(priorIncome) && priorIncome !== 0) {
      records[id].growth = ((income - priorIncome) / priorIncome) * 100;
      sources[id].growth = (sources[id].income === "live" && sources[id].priorIncome === "live") ? "live" : "fallback";
    } else {
      records[id].growth = 0;
      sources[id].growth = "fallback";
    }
  });

  const allLive = countyIds.every((id) =>
    Object.values(sources[id]).every((s) => s === "live")
  );

  return { records, sources, allLive };
}

/* ------------------------------------------------------------------------
   chart rendering — Canvas 2D
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
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? "center" : Math.cos(a) > 0 ? "left" : "right";
    ctx.textBaseline = Math.abs(Math.sin(a)) < 0.3 ? "middle" : Math.sin(a) > 0 ? "top" : "bottom";
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
   app.js — state, scoring, rendering
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
  dataStatus: "loading",
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function getCounty(id) {
  const meta = COUNTIES_META.find((c) => c.id === id);
  const econ = (state.economicData || FALLBACK_ECONOMIC_DATA)[id] || {};
  return { ...meta, ...econ };
}

function computeScore(county, businessType, employees, rent) {
  const effectiveHeadcount = Math.max(employees, 1);
  const annualRent = Math.max(rent, 0) * 12;
  const baseWage = Number.isFinite(county.wage) ? county.wage : 1100;
  const annualPayroll = Math.round(baseWage * effectiveHeadcount * 52 * (businessType.multiplier || 1));

  const allIncomes = Object.values(state.economicData || FALLBACK_ECONOMIC_DATA)
    .map((c) => c.income)
    .filter((v) => Number.isFinite(v));
  let incomeScore = 50;
  if (allIncomes.length >= 2) {
    const minIncome = Math.min(...allIncomes);
    const maxIncome = Math.max(...allIncomes);
    if (Number.isFinite(county.income) && maxIncome > minIncome) {
      incomeScore = ((county.income - minIncome) / (maxIncome - minIncome)) * 100;
    }
  }

  let growthScore = 50;
  if (Number.isFinite(county.growth)) {
    growthScore = clamp(((county.growth + 5) / 20) * 100, 0, 100);
  }

  const household = Math.round(incomeScore * 0.75 + growthScore * 0.25);

  const wagePressure = (baseWage - 1000) / 3.2;
  const businessTypePressure = (businessType.multiplier - 1) * 55;
  const marketFit = clamp(100 - wagePressure - businessTypePressure, 0, 100);

  const rentPerHead = annualRent / effectiveHeadcount;
  const occBase = (rentPerHead - 8000) / 250;
  let occRaw = Math.pow(Math.abs(occBase), 1.25) * (occBase < 0 ? -1 : 1) - 10;
  const occupancyPressure = clamp(occRaw, -10, 55);

  const staffingBase = employees - 2;
  let staffRaw = Math.pow(Math.abs(staffingBase), 1.3) * (staffingBase > 0 ? 1 : -1) * 5;
  const staffingPressure = clamp(staffRaw, -10, 45);

  const planFit = clamp(100 - occupancyPressure - staffingPressure, 0, 100);
  const labor = Math.round(marketFit * 0.55 + planFit * 0.45);

  const market = clamp((county.establishments / 13000) * 100, 0, 100);
  const resources = resourceCountForCounty(county.id);
  const institutional = clamp((resources / 8) * 100, 0, 100);
  const unemployment = Number.isFinite(county.unemployment) ? county.unemployment : 4;
  const stability = clamp(100 - unemployment * 15, 0, 100);

  const weights = { household: 0.28, labor: 0.22, market: 0.18, institutional: 0.2, stability: 0.12 };
  const overall = Math.round(
    household * weights.household +
    labor * weights.labor +
    market * weights.market +
    institutional * weights.institutional +
    stability * weights.stability
  );

  return {
    household: clamp(Math.round(household), 0, 100),
    labor: clamp(Math.round(labor), 0, 100),
    market: clamp(Math.round(market), 0, 100),
    institutional: clamp(Math.round(institutional), 0, 100),
    stability: clamp(Math.round(stability), 0, 100),
    overall: clamp(overall, 0, 100),
    resources,
    annualRent,
    annualPayroll,
    costFloor: annualRent + annualPayroll + 18000,
  };
}

function verdict(score) {
  if (score < 40) return { label: "Proceed carefully", cls: "badge-rust", note: "Costs or demand are working against you here. Compare a neighbouring county before committing." };
  if (score < 70) return { label: "Workable, with tradeoffs", cls: "badge-gold", note: "The fundamentals are mixed. Lean on local resources to help close the gap." };
  return { label: "Strong formation climate", cls: "badge-green", note: "Demand, labor cost and institutional support are aligned in your favor." };
}

/* ---------------------------- rendering ------------------------------- */

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function renderNav() {
  $all(".nav-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === state.page);
  });
  $all("main > section").forEach((sec) => {
    sec.classList.toggle("hidden", sec.id !== `page-${state.page}`);
  });
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

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

function fillSelect(selectEl, options, value) {
  selectEl.innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
  selectEl.value = value;
}

function renderHome() {
  const countySelect = $("#county-select");
  const businessSelect = $("#business-select");
  if (!countySelect || !businessSelect) return;

  if (!state.economicData) {
    $("#score-number") && ($("#score-number").textContent = "--");
    $("#score-eyebrow") && ($("#score-eyebrow").textContent = "Loading live data…");
    return;
  }

  const county = getCounty(state.countyId);
  const bt = BUSINESS_TYPES.find((b) => b.id === state.businessId) || BUSINESS_TYPES[0];

  const score = computeScore(county, bt, state.employees, state.rent);
  const v = verdict(score.overall);

  countySelect.value = state.countyId;
  businessSelect.value = state.businessId;
  $("#rent-slider").value = state.rent;
  $("#rent-value").textContent = `$${state.rent.toLocaleString()}`;
  $("#employees-slider").value = state.employees;
  $("#employees-value").textContent = state.employees;

  $("#row-payroll").textContent = `$${score.annualPayroll.toLocaleString()}`;
  $("#row-rent").textContent = `$${score.annualRent.toLocaleString()}`;
  $("#row-costfloor").textContent = `$${score.costFloor.toLocaleString()}`;
  $("#payroll-note").textContent =
    `Payroll uses an ACS-derived average weekly wage ($${Math.round(county.wage).toLocaleString()}/week) adjusted for the labor intensity of your business type. The cost floor adds $18,000 for licensing, insurance and utilities.`;

  $("#score-eyebrow").textContent = `FORMATION CLIMATE SCORE · ${county.name.toUpperCase()}`;
  $("#score-number").textContent = score.overall;
  const badgeEl = $("#score-badge");
  if (badgeEl) {
    badgeEl.textContent = v.label;
    badgeEl.className = `badge ${v.cls}`;
  }
  $("#score-note").textContent = v.note;

  $("#score-household").textContent = `${score.household}`;
  $("#score-labor").textContent = `${score.labor}`;
  $("#score-market").textContent = `${score.market}`;
  $("#score-institutional").textContent = `${score.institutional}`;
  $("#score-stability").textContent = `${score.stability}`;

  $("#bar-household").style.width = `${score.household}%`;
  $("#bar-labor").style.width = `${score.labor}%`;
  $("#bar-market").style.width = `${score.market}%`;
  $("#bar-institutional").style.width = `${score.institutional}%`;
  $("#bar-stability").style.width = `${score.stability}%`;

  const radarCanvas = $("#radar-canvas");
  if (radarCanvas) {
    renderScoreRadarChart(radarCanvas, score);
  }
}

function renderCountyPage() {
  if (!state.economicData) return;
  const county = getCounty(state.countyId);
  const metric = METRICS.find((m) => m.id === state.metric) || METRICS[0];

  $("#county-metric-label") && ($("#county-metric-label").textContent = metric.label);
  $("#county-metric-value") && ($("#county-metric-value").textContent = metric.fmt(county[metric.id]));

  const labels = COUNTIES_META.map((c) => c.name.replace(" County", ""));
  const values = COUNTIES_META.map((c) => {
    const econ = (state.economicData || FALLBACK_ECONOMIC_DATA)[c.id];
    return econ ? econ[metric.id] : 0;
  });
  const canvas = $("#county-bar-canvas");
  if (canvas) {
    renderCountyBarChart(canvas, labels, values, county.name.replace(" County", ""));
  }
}

function renderResourcesPage() {
  const grid = $("#resources-grid");
  const countEl = $("#resources-count");
  if (!grid || !countEl) return;

  const filtered = RESOURCES.filter((r) => {
    const countyOk = state.filterCounty === "all" || r.county === "all" || r.county === state.filterCounty;
    const typeOk = state.filterType === "Every type" || r.tag === state.filterType;
    return countyOk && typeOk;
  });

  countEl.textContent = `${filtered.length} MATCHED RESOURCES`;
  grid.innerHTML = filtered.map((r) => `
    <div class="card resource-card">
      <div class="tag">${r.tag}</div>
      <h3>${r.name}</h3>
      <p>${r.desc}</p>
      <div class="resource-meta">
        <div>${r.addr}</div>
        <div>${r.phone}</div>
      </div>
      <div class="resource-footer">
        <span class="small muted">County: ${r.county === "all" ? "Statewide" : COUNTIES_META.find(c => c.id === r.county)?.name || r.county}</span>
      </div>
    </div>
  `).join("");
}

/* ---------------------------- wiring ------------------------------- */

function attachEvents() {
  $all(".nav-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = btn.dataset.page;
      renderNav();
      if (state.page === "home") renderHome();
      if (state.page === "county") renderCountyPage();
      if (state.page === "resources") renderResourcesPage();
    });
  });

  const countySelect = $("#county-select");
  const businessSelect = $("#business-select");
  const rentSlider = $("#rent-slider");
  const employeesSlider = $("#employees-slider");

  if (countySelect) {
    countySelect.addEventListener("change", (e) => {
      state.countyId = e.target.value;
      renderHome();
      if (state.page === "county") renderCountyPage();
      if (state.page === "resources") renderResourcesPage();
    });
  }

  if (businessSelect) {
    businessSelect.addEventListener("change", (e) => {
      state.businessId = e.target.value;
      renderHome();
    });
  }

  if (rentSlider) {
    rentSlider.addEventListener("input", (e) => {
      state.rent = Number(e.target.value) || 0;
      $("#rent-value").textContent = `$${state.rent.toLocaleString()}`;
      renderHome();
    });
  }

  if (employeesSlider) {
    employeesSlider.addEventListener("input", (e) => {
      state.employees = Number(e.target.value) || 0;
      $("#employees-value").textContent = state.employees;
      renderHome();
    });
  }

  const metricPills = $all(".metric-pill");
  metricPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      state.metric = pill.dataset.metric;
      metricPills.forEach((p) => p.classList.toggle("active", p === pill));
      renderCountyPage();
    });
  });

  const filterCountySelect = $("#filter-county");
  const filterTypeSelect = $("#filter-type");
  if (filterCountySelect) {
    filterCountySelect.addEventListener("change", (e) => {
      state.filterCounty = e.target.value;
      renderResourcesPage();
    });
  }
  if (filterTypeSelect) {
    filterTypeSelect.addEventListener("change", (e) => {
      state.filterType = e.target.value;
      renderResourcesPage();
    });
  }
}

/* ---------------------------- boot ------------------------------- */

async function boot() {
  renderNav();
  renderDataStatusBadge();

  try {
    const { records, sources, allLive } = await fetchAllEconomicData();
    state.economicData = records;
    state.dataSources = sources;
    state.dataStatus = allLive ? "live" : "partial";
  } catch (e) {
    console.warn("Live data fetch failed, using fallback only:", e);
    state.economicData = FALLBACK_ECONOMIC_DATA;
    state.dataSources = null;
    state.dataStatus = "fallback";
  }

  renderDataStatusBadge();
  renderHome();
  renderCountyPage();
  renderResourcesPage();
}

document.addEventListener("DOMContentLoaded", () => {
  attachEvents();
  boot();
});
