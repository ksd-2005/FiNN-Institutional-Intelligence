import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { strToU8, zipSync } from "fflate";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownUp,
  Bell,
  BookOpen,
  CheckCircle2,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  CircleDot,
  Clock3,
  Command,
  Download,
  ExternalLink,
  FileText,
  Link2,
  MessageSquare,
  Mic,
  LockKeyhole,
  Menu,
  Moon,
  Network,
  Pause,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import "./styles.css";
import { companyDetails } from "./data";
import { tickerDirectory as bundledTickerDirectory } from "./ticker-directory";
import {
  accountAuthConfigured,
  loadAccountContacts,
  readAccountSession,
  refreshAccountSession,
  saveAccountSession,
  signInWithEmail,
  signOutAccount,
  signUpWithEmail,
  syncAccountContacts,
} from "./auth";

const portfolioCompanyMetadata = {
  ORIANA: { name: "Oriana Power Ltd", sector: "Renewable Energy" },
  ESPRIT: { name: "Esprit Stones Ltd", sector: "Engineered Stones" },
  FUSIONCX: { name: "Fusion CX Ltd", sector: "Business Services" },
};
const tickerAliases = { FUSION: "FUSIONCX", ZOMATO: "ETERNAL" };
const alertableCategories = [
  ["results", "Results"], ["M&A", "M&A"], ["management_change", "Management change"],
  ["fund_raise", "Fund raise"], ["litigation", "Litigation"], ["capex", "Capex"],
  ["credit_rating", "Credit rating"], ["insider_trading", "Insider trading"],
  ["dividend", "Dividend"], ["bonus_split", "Bonus / split"],
  ["investor_meetings", "Investor meetings"], ["earnings_call", "Earnings calls"],
  ["press_release", "Press releases"], ["postal_ballot", "Postal ballot"],
  ["agm_egm", "AGM / EGM"], ["pledging", "Pledging"],
];
const priorityCategories = new Set([
  "results", "M&A", "management_change", "fund_raise", "litigation",
  "capex", "credit_rating", "insider_trading", "pledging",
]);
const initialAlertPreferences = {
  thresholdDefaultsVersion: 2,
  enabled: true,
  marketMoves: true,
  priceMovePct: 0.5,
  volumeMultiple: 1,
  categories: ["results", "M&A", "management_change", "fund_raise", "litigation", "capex"],
};

function readAlertPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem("finn-push-alert-preferences") || "null");
    if (!saved) return initialAlertPreferences;
    const preferences = { ...initialAlertPreferences, ...saved };
    if (saved.thresholdDefaultsVersion !== initialAlertPreferences.thresholdDefaultsVersion) {
      if (Number(saved.priceMovePct) === 3) preferences.priceMovePct = initialAlertPreferences.priceMovePct;
      if (Number(saved.volumeMultiple) === 2) preferences.volumeMultiple = initialAlertPreferences.volumeMultiple;
    }
    preferences.thresholdDefaultsVersion = initialAlertPreferences.thresholdDefaultsVersion;
    return preferences;
  } catch { return initialAlertPreferences; }
}

function canonicalTicker(value = "") {
  const base = String(value)
    .toUpperCase()
    .replace(/\.(NS|BO)$/i, "");
  return tickerAliases[base] || base;
}

function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function xmlEscape(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );
}

function downloadPortfolioCsv(rows) {
  const lines = [
    [
      "Company",
      "Ticker",
      "Price",
      "Daily change",
      "Sector",
      "Volume",
      "Price source",
      "As of",
    ],
    ...rows.map((row) => [
      row.name,
      row.symbol,
      row.price,
      row.change,
      row.sector,
      row.volume ?? "",
      row.priceSource || "Sample preview",
      row.asOf || "",
    ]),
  ];
  const csv = lines
    .map((line) =>
      line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
  saveDownload(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    "FINN-portfolio.csv",
  );
}

function downloadPortfolioXlsx(rows) {
  const data = [
    [
      "Company",
      "Ticker",
      "Price",
      "Daily change",
      "Sector",
      "Volume",
      "Price source",
      "As of",
    ],
    ...rows.map((row) => [
      row.name,
      row.symbol,
      row.price,
      row.change,
      row.sector,
      row.volume ?? "",
      row.priceSource || "Sample preview",
      row.asOf || "",
    ]),
  ];
  const colName = (number) => {
    let name = "";
    while (number) {
      const mod = (number - 1) % 26;
      name = String.fromCharCode(65 + mod) + name;
      number = Math.floor((number - mod) / 26);
    }
    return name;
  };
  const sheetRows = data
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row.map((value, colIndex) => `<c r="${colName(colIndex + 1)}${rowIndex + 1}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`).join("")}</row>`,
    )
    .join("");
  const files = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Portfolio" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    ),
  };
  saveDownload(
    new Blob([zipSync(files, { level: 6 })], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "FINN-portfolio.xlsx",
  );
}

const market = [
  {
    symbol: "TITAN",
    name: "Titan Company",
    sector: "Consumer",
    price: "3,912.40",
    change: "+2.84%",
    tone: "positive",
    volume: "2.4×",
    note: "CFO transition · network match",
  },
  {
    symbol: "DIXON",
    name: "Dixon Technologies",
    sector: "Electronics",
    price: "11,842.10",
    change: "+1.26%",
    tone: "positive",
    volume: "1.3×",
    note: "Q2 results · narrative vs numbers",
  },
  {
    symbol: "UNOMINDA",
    name: "Uno Minda",
    sector: "Auto ancillaries",
    price: "1,128.65",
    change: "-0.42%",
    tone: "negative",
    volume: "3.1×",
    note: "Volume anomaly · capex signal",
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    sector: "Diversified",
    price: "2,946.30",
    change: "+0.71%",
    tone: "positive",
    volume: "0.9×",
    note: "Routine filing",
  },
  {
    symbol: "INFY",
    name: "Infosys",
    sector: "IT Services",
    price: "1,544.20",
    change: "-1.05%",
    tone: "negative",
    volume: "1.8×",
    note: "Investor meet scheduled",
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    sector: "Financials",
    price: "1,744.80",
    change: "+0.38%",
    tone: "positive",
    volume: "1.1×",
    note: "Credit rating reaffirmed",
  },
];

const people = [
  {
    name: "Arjun Mehta",
    role: "Ex-Titan · Consumer strategy",
    initials: "AM",
    strength: "Warm · worked together",
    tag: "Titan",
  },
  {
    name: "Maya Krishnan",
    role: "CFO, Northstar Capital",
    initials: "MK",
    strength: "2nd degree · Priya knows her",
    tag: "Financials",
  },
  {
    name: "Rohan Shah",
    role: "Product, Auto components",
    initials: "RS",
    strength: "Warm · 4 shared connections",
    tag: "Auto",
  },
  {
    name: "Devika Rao",
    role: "Ex-Dixon · Operations",
    initials: "DR",
    strength: "Cold · studied together",
    tag: "Electronics",
  },
];

function Logo() {
  return (
    <div className="logo-mark">
      <img src="/assets/finn-logo.svg" alt="FINN" />
    </div>
  );
}
function IconButton({ children, label, onClick }) {
  return (
    <button className="icon-button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
function Header({ active, dark, setDark, setActive, profileInitials = "AS" }) {
  return (
    <header className="topbar">
      <div className="brand" onClick={() => setActive("push")}>
        <Logo />
        <div>
          <div className="brand-line">
            FINN <i></i>
          </div>
          <div className="brand-sub">
            {active === "ask"
              ? "Ask FINN"
              : active === "profile"
                ? "Executive Profile"
                : active[0].toUpperCase() + active.slice(1)}
          </div>
        </div>
      </div>
      <div className="header-actions">
        <IconButton label="Toggle theme" onClick={() => setDark(!dark)}>
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </IconButton>
        <button
          className="avatar"
          onClick={() => setActive("profile")}
          aria-label="Open executive profile"
        >
          {profileInitials}
        </button>
      </div>
    </header>
  );
}
function BottomNav({ active, setActive }) {
  const items = [
    ["push", Bell],
    ["pull", Search],
    ["network", Network],
    ["portfolio", WalletCards],
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([key, I]) => (
        <button
          key={key}
          className={active === key ? "active" : ""}
          onClick={() => setActive(key)}
        >
          <I size={17} />
          <span>{key[0].toUpperCase() + key.slice(1)}</span>
        </button>
      ))}
    </nav>
  );
}
function SectionKicker({ children, right }) {
  return (
    <div className="section-kicker">
      <span>{children}</span>
      {right && <span className="kicker-right">{right}</span>}
    </div>
  );
}
function Push({ setActive }) {
  const [range, setRange] = useState("24H");
  const [notice, setNotice] = useState("");
  const notify = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  return (
    <main className="content push-view">
      <div className="hero-row">
        <div>
          <SectionKicker right="LIVE · 09:41 IST">FINN TERMINAL</SectionKicker>
          <h1>
            What matters
            <br />
            <em>right now.</em>
          </h1>
          <p className="lede">
            A quiet advantage across your portfolio, filings and people.
          </p>
        </div>
        <div className="signal-orb">
          <Sparkles size={18} />
          <b>08</b>
          <span>signals</span>
        </div>
      </div>
      <div className="range-tabs">
        {["24H", "3D", "7D", "30D"].map((v) => (
          <button
            className={range === v ? "selected" : ""}
            onClick={() => setRange(v)}
            key={v}
          >
            {v}
          </button>
        ))}
        <button
          className="filter-button"
          onClick={() => notify("Digest filters are ready for configuration")}
        >
          <Settings2 size={15} />
        </button>
      </div>
      <div className="digest-head">
        <div>
          <span className="eyebrow">PRIORITISED DIGEST</span>
          <h2>Across your portfolio</h2>
        </div>
        <span className="live-dot">● 08 live</span>
      </div>
      <div className="insight-card featured">
        <div className="card-top">
          <span className="tag blue">MANAGEMENT CHANGE</span>
          <span className="muted">12m ago</span>
        </div>
        <div className="card-title-row">
          <div>
            <h3>Titan's incoming CFO has a familiar path.</h3>
            <p>
              Neeraj Sethi joins from Asian Paints after 9 years in consumer
              finance.
            </p>
          </div>
          <div className="priority">P1</div>
        </div>
        <div className="dossier">
          <div className="person-avatar">NS</div>
          <div>
            <strong>Neeraj Sethi</strong>
            <span>Incoming CFO · Titan Company</span>
          </div>
          <button onClick={() => setActive("network")} className="inline-link">
            View dossier <ChevronRight size={14} />
          </button>
        </div>
        <div className="network-callout">
          <div className="connection-icon">
            <Link2 size={15} />
          </div>
          <div>
            <span className="eyebrow">WARM RELATIONSHIP FOUND</span>
            <p>Arjun Mehta worked with Neeraj at Asian Paints.</p>
          </div>
          <button onClick={() => setActive("network")}>
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="card-actions">
          <button onClick={() => notify("Opening Titan primary filing")}>
            <BookOpen size={15} /> Open filing
          </button>
          <button onClick={() => setActive("network")}>
            <Send size={15} /> Ask a connection
          </button>
        </div>
      </div>
      <div className="insight-card">
        <div className="card-top">
          <span className="tag green">AUDITED RESULTS</span>
          <span className="muted">1h ago</span>
        </div>
        <h3>Dixon delivered the quarter. The story is more mixed.</h3>
        <p>
          Revenue accelerated YoY, but margin expansion is below the guidance
          range.
        </p>
        <div className="metrics">
          {[
            ["Revenue", "₹1,253 cr", "+16.2%"],
            ["EBITDA", "₹78 cr", "+9.1%"],
            ["PAT", "₹44 cr", "+4.8%"],
          ].map(([a, b, c]) => (
            <div key={a}>
              <span>{a}</span>
              <strong>{b}</strong>
              <small className="positive-text">{c}</small>
            </div>
          ))}
        </div>
        <div className="card-footer">
          <span>
            <FileText size={14} /> Q2 FY27 results · primary source
          </span>
          <button onClick={() => setActive("pull")}>
            Deep research <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="insight-card compact-card">
        <div className="card-top">
          <span className="tag amber">ANOMALY RADAR</span>
          <span className="muted">3h ago</span>
        </div>
        <div className="compact-grid">
          <div>
            <h3>Uno Minda volume is 3.1× its 20-day average.</h3>
            <p>New capex approval may explain the move. Worth a closer look.</p>
          </div>
          <div className="bars">
            {[26, 35, 42, 30, 58, 72, 54, 82, 91].map((h, i) => (
              <i key={i} style={{ height: h + "%" }} />
            ))}
          </div>
        </div>
      </div>
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
function Pull({ setActive }) {
  const [ticker, setTicker] = useState("DIXON");
  const [submitted, setSubmitted] = useState(false);
  const [exported, setExported] = useState(false);
  const detail = companyDetails[ticker] || companyDetails.DIXON;
  return (
    <main className="content pull-view">
      <SectionKicker right="PRIMARY SOURCES ONLY">
        PULL · RESEARCH
      </SectionKicker>
      <h1>
        Ask a better
        <br />
        <em>question.</em>
      </h1>
      <p className="lede">
        Research the business, then pressure-test the narrative against its
        numbers.
      </p>
      <div className="research-box">
        <Search size={18} />
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter NSE ticker"
        />
        <button aria-label="Run research" onClick={() => setSubmitted(true)}>
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="suggestion-row">
        {["DIXON", "TITAN", "RELIANCE", "UNOMINDA"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTicker(t);
              setSubmitted(true);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {submitted && (
        <div className="research-result">
          <div className="result-header">
            <div>
              <span className="tag blue">RESEARCH BRIEF</span>
              <h2>{detail.name} · numbers vs narrative</h2>
              <small className="ticker-label">
                {detail.exchange} · {detail.sector}
              </small>
            </div>
            <span className="fresh">
              <span />
              Fresh · 2 min ago
            </span>
          </div>
          <p className="result-summary">
            {detail.snapshot} {detail.trajectory}
          </p>
          <div className="research-grid">
            {[
              ["Business", detail.snapshot],
              ["Trajectory", detail.trajectory],
              ["Cash quality", detail.cash],
              ["Guidance", detail.guidance],
            ].map(([a, b]) => (
              <div key={a}>
                <span>{a}</span>
                <strong>{b}</strong>
              </div>
            ))}
          </div>
          <div className="metrics">
            {detail.metrics.map(([a, b, c]) => (
              <div key={a}>
                <span>{a}</span>
                <strong>{b}</strong>
                <small className="positive-text">{c}</small>
              </div>
            ))}
          </div>
          <div className="source-row">
            {detail.sources.map((source) => (
              <span key={source}>
                <FileText size={14} /> {source}
              </span>
            ))}
          </div>
          <div className="result-actions">
            <button className="primary" onClick={() => setActive("ask")}>
              <Sparkles size={15} /> Ask FINN about this
            </button>
            <button className="secondary" onClick={() => setExported(true)}>
              Export brief <ExternalLink size={14} />
            </button>
          </div>
          {exported && (
            <div className="export-note">
              Brief queued for export. Connect a document destination to
              download it.
            </div>
          )}
        </div>
      )}
      <div className="network-strip">
        <div className="strip-icon">
          <Users size={18} />
        </div>
        <div>
          <span className="eyebrow">NETWORK CONTEXT</span>
          <p>
            <strong>4 people</strong> in your network have relevant operating
            context on {detail.sector.toLowerCase()}.
          </p>
        </div>
        <button onClick={() => setActive("network")}>
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="recent-research">
        <div className="section-title">
          <span>Recent research</span>
          <span className="muted">3 briefs</span>
        </div>
        {[
          ["TITAN", "CFO transition · network overlap", "12 min ago"],
          ["DIXON", "Q2 results · cash conversion", "Yesterday"],
          ["UNOMINDA", "Capex signal · volume anomaly", "2 days ago"],
        ].map(([symbol, title, time]) => (
          <button
            className="recent-item"
            key={symbol}
            onClick={() => {
              setTicker(symbol);
              setSubmitted(true);
            }}
          >
            <span className="recent-symbol">{symbol.slice(0, 2)}</span>
            <span>
              <strong>{title}</strong>
              <small>
                {symbol} · {time}
              </small>
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
      </div>
    </main>
  );
}
function NetworkView({ setActive }) {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("For you");
  const [notice, setNotice] = useState("");
  return (
    <main className="content network-view">
      <SectionKicker right="PRIVATE TO YOU">NETWORK · SIGNALS</SectionKicker>
      <div className="network-heading">
        <div>
          <h1>
            Your quiet
            <br />
            <em>advantage.</em>
          </h1>
          <p className="lede">People, patterns and the right person to call.</p>
        </div>
        <div className="network-count">
          <strong>128</strong>
          <span>people</span>
        </div>
      </div>
      <div className="network-search">
        <Search size={17} />
        <input placeholder="Search people, companies, sectors" />
        <Command size={14} />
      </div>
      <div className="network-tabs">
        {["For you", "People", "Expertise map"].map((label) => (
          <button
            key={label}
            className={tab === label ? "active" : ""}
            onClick={() => setTab(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="network-feature">
        <div className="card-top">
          <span className="tag green">BEST NEXT CALL</span>
          <span className="muted">For Titan</span>
        </div>
        <h3>Arjun has lived through this exact transition.</h3>
        <p>
          He worked with the incoming CFO at Asian Paints and has 7 years across
          consumer businesses.
        </p>
        <div className="person-row">
          <div className="person-avatar large">AM</div>
          <div>
            <strong>Arjun Mehta</strong>
            <span>Consumer strategy · Mumbai</span>
          </div>
          <button
            className="call-button"
            onClick={() =>
              setNotice(
                "Messaging will connect after Telegram/Gmail OAuth is enabled",
              )
            }
          >
            <Send size={15} /> Message
          </button>
        </div>
      </div>
      {selected && (
        <div className="person-detail">
          <div className="person-avatar large">{selected.initials}</div>
          <div>
            <span className="eyebrow">SELECTED CONTACT</span>
            <h3>{selected.name}</h3>
            <p>
              {selected.role}. {selected.strength}. Relevant overlap:{" "}
              {selected.tag}.
            </p>
          </div>
          <button className="icon-button" onClick={() => setSelected(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="section-title">
        <span>Network matches</span>
        <button onClick={() => setTab("People")}>
          See all <ChevronRight size={14} />
        </button>
      </div>
      <div className="people-list">
        {people.map((p) => (
          <button
            className="person-list-item"
            key={p.name}
            onClick={() => setSelected(p)}
          >
            <div className="person-avatar">{p.initials}</div>
            <div className="person-meta">
              <strong>{p.name}</strong>
              <span>{p.role}</span>
              <small>
                <span /> {p.strength}
              </small>
            </div>
            <span className="person-tag">{p.tag}</span>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
function Portfolio() {
  const [page, setPage] = useState(1);
  const visible = market.slice((page - 1) * 3, page * 3);
  return (
    <main className="content portfolio-view">
      <SectionKicker right="YAHOO FINANCE · EOD">
        PORTFOLIO · MARKET
      </SectionKicker>
      <div className="portfolio-heading">
        <div>
          <h1>
            Market,
            <br />
            <em>filtered.</em>
          </h1>
          <p className="lede">Your 18 holdings, one view of what changed.</p>
        </div>
        <div className="portfolio-total">
          <span>Total value</span>
          <strong>₹42.8L</strong>
          <small className="positive-text">+1.82% today</small>
        </div>
      </div>
      <div className="market-summary">
        <div>
          <span>Portfolio</span>
          <strong>+₹76,420</strong>
        </div>
        <div>
          <span>Advancers</span>
          <strong>
            12 <i className="positive-text">of 18</i>
          </strong>
        </div>
        <div>
          <span>Last sync</span>
          <strong>
            09:38 <i>IST</i>
          </strong>
        </div>
      </div>
      <div className="section-title">
        <span>Holdings</span>
        <span className="muted">Page {page} of 2</span>
      </div>
      <div className="holdings-list">
        {visible.map((s, i) => (
          <div className="holding" key={s.symbol}>
            <div className="holding-symbol">{s.symbol.slice(0, 2)}</div>
            <div className="holding-name">
              <strong>{s.name}</strong>
              <span>
                {s.sector} · {s.volume} vol
              </span>
            </div>
            <div className="holding-price">
              <strong>₹{s.price}</strong>
              <span
                className={
                  s.tone === "positive" ? "positive-text" : "negative-text"
                }
              >
                {s.change}
              </span>
            </div>
            <ChevronRight size={16} />
          </div>
        ))}
      </div>
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(1)}>
          ‹
        </button>
        <span>{page}</span>
        <button disabled={page === 2} onClick={() => setPage(2)}>
          ›
        </button>
      </div>
    </main>
  );
}
function Profile({ setActive }) {
  const [notice, setNotice] = useState("");
  return (
    <main className="content profile-view">
      <SectionKicker right="PRIVATE WORKSPACE">EXECUTIVE PROFILE</SectionKicker>
      <div className="profile-hero">
        <div className="profile-avatar">KS</div>
        <div>
          <h1>Karan Sharma</h1>
          <p className="lede">Public markets · Mumbai</p>
        </div>
        <button
          className="icon-button"
          onClick={() =>
            setNotice("Profile editing will be connected to workspace settings")
          }
          aria-label="Edit profile"
        >
          <Settings2 size={16} />
        </button>
      </div>
      <div className="profile-stats">
        <div>
          <span>Portfolio</span>
          <strong>18 companies</strong>
        </div>
        <div>
          <span>Network</span>
          <strong>128 people</strong>
        </div>
        <div>
          <span>Last active</span>
          <strong>09:41 IST</strong>
        </div>
      </div>
      <div className="profile-section">
        <div className="section-title">
          <span>Alert preferences</span>
          <span className="muted">3 active</span>
        </div>
        {[
          [
            "Material announcements",
            "Results, M&A and management change",
            Bell,
          ],
          [
            "Unusual market moves",
            "Price ±3% or volume 2× average",
            TrendingUp,
          ],
          ["Network context", "Surface warm relationships in Push", Users],
        ].map(([title, description, Icon]) => (
          <button
            className="setting-row"
            key={title}
            onClick={() =>
              setNotice(`${title} settings are ready for configuration`)
            }
          >
            <span className="setting-icon">
              <Icon size={16} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <span className="setting-toggle">ON</span>
          </button>
        ))}
      </div>
      <div className="profile-section">
        <div className="section-title">
          <span>Connected sources</span>
        </div>
        <div className="source-setting">
          <span className="setting-icon">
            <FileText size={16} />
          </span>
          <span>
            <strong>Primary company documents</strong>
            <small>Annual reports · filings · concalls</small>
          </span>
          <span className="connected">READY</span>
        </div>
        <div className="source-setting">
          <span className="setting-icon">
            <ShieldCheck size={16} />
          </span>
          <span>
            <strong>Network privacy</strong>
            <small>Private to this workspace</small>
          </span>
          <span className="connected">PROTECTED</span>
        </div>
      </div>
      <div className="profile-cta">
        <div>
          <span className="eyebrow">FINN TERMINAL</span>
          <p>Manage integrations and export controls from your workspace.</p>
        </div>
        <button onClick={() => setActive("ask")}>
          <Sparkles size={15} /> Ask FINN
        </button>
      </div>
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

function Ask({ setActive }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [answer, setAnswer] = useState("");
  const [provider, setProvider] = useState("");
  const submit = async () => {
    if (!query.trim() || status === "loading") return;
    setStatus("loading");
    setAnswer("");
    try {
      const upper = query.toUpperCase();
      const context = askContext.filter(
        (item) =>
          upper.includes(item.ticker) ||
          upper.includes(item.company.split(" ")[0].toUpperCase()),
      );
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          context: context.length ? context : askContext,
          network: [
            {
              name: "Arjun Mehta",
              relationship: "worked with Neeraj Sethi at Asian Paints",
            },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "FINN is unavailable");
      const text =
        data.answer ||
        data.choices?.[0]?.message?.content ||
        data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text)
          .join("\n") ||
        "FINN returned no answer.";
      setAnswer(text);
      setProvider(data.provider || "FINN");
      setStatus("done");
    } catch (error) {
      setAnswer(
        `${error.message}. Check the API environment variables or try again.`,
      );
      setProvider("Unavailable");
      setStatus("error");
    }
  };
  return (
    <main className="content ask-view">
      <div className="ask-hero">
        <div className="ask-orb">
          <Sparkles size={24} />
        </div>
        <SectionKicker>ASK FINN</SectionKicker>
        <h1>
          What are you
          <br />
          <em>curious about?</em>
        </h1>
        <p className="lede">
          Ask about a company, a signal or who you should call. FINN will show
          its work.
        </p>
      </div>
      <div className="prompt-chips">
        {[
          "What changed at Titan?",
          "Who knows Dixon?",
          "Explain the cash quality",
        ].map((q) => (
          <button key={q} onClick={() => setQuery(q)}>
            {q}
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
      <div className="ask-input">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask FINN anything…"
        />
        <div>
          <span>
            <LockKeyhole size={13} /> Grounded in primary sources
          </span>
          <button
            aria-label="Ask FINN"
            disabled={!query.trim() || status === "loading"}
            onClick={submit}
          >
            {status === "loading" ? <Clock3 size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>
      {status !== "idle" && (
        <div
          className={`answer-card ${status === "error" ? "answer-error" : ""}`}
        >
          <div className="card-top">
            <span className="tag blue">
              {status === "loading" ? "RESEARCHING" : "FINN ANSWER"}
            </span>
            <span className="muted">
              {status === "loading" ? "Working…" : provider}
            </span>
          </div>
          {status === "loading" ? (
            <>
              <h3>Reading the relevant sources.</h3>
              <p>
                FINN is matching your question to company filings, reports,
                transcripts and network context.
              </p>
            </>
          ) : (
            <>
              <h3>Here’s the short version.</h3>
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {answer}
                </ReactMarkdown>
              </div>
              <div className="source-row">
                <span>
                  <FileText size={14} /> Primary-source context
                </span>
                <span>
                  <Link2 size={14} /> Network context
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
function DraftShareDialog({ recipient, email = "", initialText, onClose }) {
  const [text, setText] = useState(initialText);
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const shareWhatsApp = () => {
    if (busyAction) return;
    setBusyAction("whatsapp");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    window.setTimeout(() => setBusyAction(""), 900);
  };
  return (
    <div className="share-backdrop">
      <section
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Draft message to ${recipient}`}
      >
        <h2>Draft message</h2>
        <p>
          To {recipient}. Review and edit before sharing; FINN will not send it
          for you. {email ? "This is a synthetic sample recipient; the example.com address will not deliver mail." : ""}
        </p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="share-actions">
          <button
            className="secondary"
            disabled={Boolean(busyAction)}
            onClick={async () => {
              if (busyAction) return;
              setBusyAction("copy");
              try {
                await navigator.clipboard.writeText(text);
                setMessage("Copied to clipboard");
              } catch {
                setMessage("Clipboard is unavailable in this browser");
              } finally {
                setBusyAction("");
              }
            }}
          >
            {busyAction === "copy" ? "Copying…" : "Copy text"}
          </button>
          <button
            className="secondary"
            disabled={Boolean(busyAction)}
            onClick={async () => {
              if (navigator.share) {
                setBusyAction("share");
                try {
                  await navigator.share({
                    title: `Message for ${recipient}`,
                    text,
                  });
                } catch {} finally { setBusyAction(""); }
              } else shareWhatsApp();
            }}
          >
            {busyAction === "share" ? "Opening…" : "Share…"}
          </button>
          <button className="primary" disabled={Boolean(busyAction)} onClick={shareWhatsApp}>
            {busyAction === "whatsapp" ? "Opening…" : "WhatsApp"}
          </button>
          {email && (
            <button className="secondary" disabled={Boolean(busyAction)} onClick={() => window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("A question from FINN")}&body=${encodeURIComponent(text)}`}>
              Open email draft
            </button>
          )}
          <button className="text-button dialog-close" disabled={Boolean(busyAction)} onClick={onClose}>
            Close
          </button>
        </div>
        {message && <p role="status">{message}</p>}
      </section>
    </div>
  );
}

function ContactCallDialog({ onClose, contact, company, phoneContacts = [] }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [callNote, setCallNote] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const phoneHref = phone.trim().replace(/[^+\d]/g, "");
  const whatsappNumber = phone.trim().replace(/\D/g, "");
  const chooseContact = async () => {
    if (!navigator.contacts?.select) {
      setMessage(
        "Contact picking is not supported here. Choose a phone contact imported on Network, or enter a number below.",
      );
      return;
    }
    try {
      const picked = await navigator.contacts.select(["name", "tel"], {
        multiple: false,
      });
      const selected = picked?.[0];
      const number = Array.isArray(selected?.tel)
        ? selected.tel[0]
        : selected?.tel;
      if (number) {
        setPhone(String(number));
        setMessage("");
      } else {
        setMessage("That contact did not include a phone number.");
      }
    } catch (error) {
      if (error?.name !== "AbortError")
        setMessage("Could not open contacts. You can enter the number below.");
    }
  };
  const saveNote = () => {
    try {
      const prior = JSON.parse(localStorage.getItem("finn-call-log") || "[]");
      prior.unshift({ contact, company, note, at: new Date().toISOString() });
      localStorage.setItem(
        "finn-call-log",
        JSON.stringify(prior.slice(0, 100)),
      );
      setSaved(true);
    } catch {
      setMessage("Could not save a note in this browser.");
    }
  };
  return (
    <div className="share-backdrop">
      <section
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Contact ${contact}`}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">CONTACT {contact.toUpperCase()}</span>
            <h2>Reach {contact}</h2>
            <p>
              About {company}. This illustrative demo profile has no phone
              number attached. Choose or enter the real person’s number to open
              your phone or WhatsApp.
            </p>
          </div>
          <button className="text-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <button
          className="secondary contact-picker-action"
          onClick={chooseContact}
        >
          <Users size={15} /> Choose from phone contacts
        </button>
        {phoneContacts.some((person) => person.tel) && (
          <label className="contact-phone-field">
            Imported contacts
            <select
              aria-label="Choose an imported phone contact"
              defaultValue=""
              onChange={(event) => setPhone(event.target.value)}
            >
              <option value="">Choose a contact with a phone number</option>
              {phoneContacts
                .filter((person) => person.tel)
                .map((person, index) => (
                  <option
                    key={`${person.name}-${person.tel}-${index}`}
                    value={person.tel}
                  >
                    {person.name} · {person.tel}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="contact-phone-field">
          Phone number
          <input
            aria-label="Phone number"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="Include country code for WhatsApp (e.g. +91…)"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <div className="share-actions">
          <a
            className={`primary ${!phoneHref ? "disabled-link" : ""}`}
            href={phoneHref ? `tel:${phoneHref}` : undefined}
            aria-disabled={!phoneHref}
          >
            <PhoneCall size={15} /> Call
          </a>
          <a
            className={`secondary ${!whatsappNumber ? "disabled-link" : ""}`}
            href={
              whatsappNumber
                ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi ${contact}, I’m looking into ${company}. Could I ask for your perspective?`)}`
                : undefined
            }
            target="_blank"
            rel="noreferrer"
            aria-disabled={!whatsappNumber}
          >
            WhatsApp chat
          </a>
        </div>
        {message && (
          <p role="status" className="contact-action-status">
            {message}
          </p>
        )}
        <button
          className="text-button optional-note-toggle"
          onClick={() => setCallNote(!callNote)}
        >
          {callNote ? "Hide call note" : "Add an optional call note"}
        </button>
        {callNote && (
          <>
            <textarea
              aria-label="Optional call note"
              placeholder="Add a short summary after your conversation"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            {saved && <p role="status">Call note saved on this device.</p>}
          </>
        )}
        <div className="share-actions">
          {callNote && (
            <button
              className="secondary"
              disabled={!note.trim()}
              onClick={saveNote}
            >
              {saved ? "Saved" : "Save note"}
            </button>
          )}
          <button className="text-button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

const sampleCompanyExperts = {
  TRENT: [
    {
      name: "Kavya Rao",
      role: "Retail operations advisor",
      detail:
        "Former regional lead at a national apparel retailer · store rollout and productivity",
    },
    {
      name: "Nikhil Desai",
      role: "Consumer analyst",
      detail:
        "Tracks Indian fashion retail · inventory turns and same-store sales",
    },
    {
      name: "Mira Shah",
      role: "Retail supply-chain operator",
      detail: "Experience across sourcing and multi-format distribution",
    },
  ],
  TITAN: [
    {
      name: "Dev Malhotra",
      role: "Jewellery retail operator",
      detail:
        "Former merchandising leader · gold working capital and store economics",
    },
    {
      name: "Rhea Menon",
      role: "Consumer analyst",
      detail: "Tracks premiumisation, watches and jewellery demand",
    },
    {
      name: "Arvind Iyer",
      role: "Retail expansion advisor",
      detail: "Experience with omnichannel and store network planning",
    },
  ],
  DIXON: [
    {
      name: "Sanjay Batra",
      role: "EMS operations advisor",
      detail: "Former electronics manufacturing leader · utilisation and yield",
    },
    {
      name: "Aditi Kulkarni",
      role: "Semiconductor supply-chain analyst",
      detail: "Tracks component sourcing and working-capital cycles",
    },
    {
      name: "Rahul Khanna",
      role: "Consumer electronics operator",
      detail: "Experience across mobile and appliance contract manufacturing",
    },
  ],
  UNOMINDA: [
    {
      name: "Neha Kapoor",
      role: "Auto components operator",
      detail: "Former program manager · customer nominations and ramp-up",
    },
    {
      name: "Vivek Nair",
      role: "Automotive analyst",
      detail: "Tracks content per vehicle, capacity and capex returns",
    },
    {
      name: "Kabir Sethi",
      role: "Manufacturing advisor",
      detail: "Experience with plant commissioning and supplier quality",
    },
  ],
  RELIANCE: [
    {
      name: "Ishita Mehra",
      role: "Energy and retail analyst",
      detail: "Tracks conglomerate segment economics and capital allocation",
    },
    {
      name: "Rohan Sood",
      role: "Digital infrastructure advisor",
      detail: "Experience across telecom, data centres and platform investment",
    },
    {
      name: "Farah Khan",
      role: "New-energy operator",
      detail: "Tracks renewable capacity build-out and project funding",
    },
  ],
};

function getStoredSampleNetworkContacts() {
  try { return JSON.parse(localStorage.getItem("finn-sample-network-contacts") || "[]"); }
  catch { return []; }
}

function getSampleCompanyExperts(ticker, company) {
  const sampleContacts = getStoredSampleNetworkContacts();
  const sector = companyDetails[ticker]?.sector || "";
  const terms = [ticker, company, ...sector.split(/[^a-z0-9]+/i).filter((word) => word.length > 5)]
    .filter(Boolean).map((word) => word.toLowerCase());
  const matched = sampleContacts.filter((person) =>
    terms.some((term) => `${person.company} ${person.sector} ${person.expertise}`.toLowerCase().includes(term)),
  ).slice(0, 3);
  if (matched.length) return matched.map((person) => ({
    name: person.name,
    role: `${person.role} · ${person.company}`,
    detail: `${person.relationship} · ${person.expertise}`,
    email: person.email,
    synthetic: true,
  }));
  return (
    sampleCompanyExperts[ticker] || [
      {
        name: "Aarav Shah",
        role: `${company} industry advisor`,
        detail: "Illustrative operator profile · business model and execution",
      },
      {
        name: "Ira Menon",
        role: "Sector analyst",
        detail:
          "Illustrative profile · demand, competitors and market structure",
      },
      {
        name: "Kabir Rao",
        role: "Former supplier-side executive",
        detail: "Illustrative profile · customers, supply chain and capacity",
      },
    ]
  );
}

function WhoCanExplainDialog({ company, ticker, onClose, onDraft, onCall }) {
  const experts = getSampleCompanyExperts(ticker, company);
  return (
    <div
      className="share-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="share-dialog expert-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Who can explain ${company}`}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">SAMPLE NETWORK CONTEXT</span>
            <h2>Who can explain {company}?</h2>
          </div>
          <button className="text-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p>
          Illustrative demo profiles only. These are not verified people or real
          connections. Load the 120 sample contacts on Network to use the demo directory in Push and Pull.
        </p>
        <div className="expert-list">
          {experts.map((expert) => (
            <article className="expert-row" key={expert.name}>
              <div className="person-avatar">
                {expert.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>
              <div>
                <strong>{expert.name}</strong>
                <span>{expert.role}</span>
                <small>{expert.detail}</small>
                {expert.email && <small>Synthetic email: {expert.email}</small>}
              </div>
              <div className="expert-actions">
                <button className="secondary" onClick={() => onDraft(expert)}>
                  Draft message
                </button>
                <button className="text-button" onClick={() => onCall(expert)}>
                  Call
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function normalizeCompanyKey(name = "") {
  return name
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(
      /\b(?:limited|ltd\.?|incorporated|inc\.?|corporation|corp\.?)\b/gi,
      " ",
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseAnnouncementDate(timestamp) {
  if (!timestamp) return null;
  const indiaDate = String(timestamp).match(
    /^(\d{1,2})[-/ ]([A-Za-z]{3}|\d{1,2})[-/ ](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (indiaDate) {
    const month = /^[A-Za-z]/.test(indiaDate[2])
      ? new Date(`${indiaDate[2]} 1, 2000`).getMonth()
      : Number(indiaDate[2]) - 1;
    const utc = Date.UTC(
      Number(indiaDate[3]),
      month,
      Number(indiaDate[1]),
      Number(indiaDate[4] || 0),
      Number(indiaDate[5] || 0),
      Number(indiaDate[6] || 0),
    );
    return new Date(utc - 330 * 60_000);
  }
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function localDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DetailedPush({ setActive, setSelectedTicker, setSelectedFilingContext, phoneContacts }) {
  const [range, setRange] = useState("7D");
  const [customStart, setCustomStart] = useState(() =>
    localDateInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    localDateInputValue(new Date()),
  );
  const [announcements, setAnnouncements] = useState([]);
  const [announcementError, setAnnouncementError] = useState("");
  const [announcementLoaded, setAnnouncementLoaded] = useState(false);
  const [announcementRefreshing, setAnnouncementRefreshing] = useState(false);
  const [announcementMeta, setAnnouncementMeta] = useState(null);
  const [portfolioOnly, setPortfolioOnly] = useState(true);
  const [sortOrder, setSortOrder] = useState("newest");
  const [showRoutine, setShowRoutine] = useState(true);
  const [alertPreferences, setAlertPreferences] = useState(readAlertPreferences);
  const [priceMoveDraft, setPriceMoveDraft] = useState(() => String(alertPreferences.priceMovePct));
  const [volumeMultipleDraft, setVolumeMultipleDraft] = useState(() => String(alertPreferences.volumeMultiple));
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false);
  const [alertStatus, setAlertStatus] = useState("");
  const [marketWatch, setMarketWatch] = useState([]);
  const initialAnnouncementScan = useRef(false);
  const seenAlertIds = useRef(null);
  const [expandedCompanies, setExpandedCompanies] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [contactCompany, setContactCompany] = useState(null);
  const [draftContact, setDraftContact] = useState(null);
  const [callContact, setCallContact] = useState(null);
  const selectedDates = (() => {
    if (range === "CUSTOM") return { from: customStart, to: customEnd };
    const days = range === "24H" ? 1 : range === "48H" ? 2 : 7;
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - days);
    return { from: localDateInputValue(from), to: localDateInputValue(to) };
  })();
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (active) setAnnouncementRefreshing(true);
      try {
        const query = new URLSearchParams({
          from: selectedDates.from,
          to: selectedDates.to,
          includeUnclassified: "true",
        });
        const response = await fetch(`/api/announcements?${query}`);
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            [payload.error, payload.detail].filter(Boolean).join(": ") ||
              "Exchange feed unavailable",
          );
        if (!active) return;
        setAnnouncements(payload.data || []);
        setAnnouncementMeta(payload);
        setAnnouncementError("");
      } catch (error) {
        if (active) setAnnouncementError(error.message);
      } finally {
        if (active) {
          setAnnouncementLoaded(true);
          setAnnouncementRefreshing(false);
        }
      }
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedDates.from, selectedDates.to]);
  const refreshAnnouncements = async () => {
    setAnnouncementRefreshing(true);
    try {
      const query = new URLSearchParams({
        from: selectedDates.from,
        to: selectedDates.to,
        includeUnclassified: "true",
        refresh: "true",
      });
      const response = await fetch(`/api/announcements?${query}`);
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          [payload.error, payload.detail].filter(Boolean).join(": ") ||
            "Exchange feed unavailable",
        );
      setAnnouncements(payload.data || []);
      setAnnouncementMeta(payload);
      setAnnouncementError("");
    } catch (error) {
      setAnnouncementError(error.message);
    } finally {
      setAnnouncementLoaded(true);
      setAnnouncementRefreshing(false);
    }
  };
  const cutoffHours = range === "24H" ? 24 : range === "48H" ? 48 : 168;
  const isInSelectedRange = (timestamp) => {
    const date = parseAnnouncementDate(timestamp);
    if (!date) return false;
    if (range === "CUSTOM") {
      if (customStart > customEnd) return false;
      return (
        date >= new Date(`${customStart}T00:00:00`) &&
        date <= new Date(`${customEnd}T23:59:59`)
      );
    }
    const ageMs = Date.now() - date.getTime();
    return ageMs >= 0 && ageMs <= cutoffHours * 3600000;
  };
  const savedHoldings = loadPortfolioHoldings();
  const portfolioKeys = new Set(
    savedHoldings.map((holding) =>
      normalizeCompanyKey(
        portfolioCompanyMetadata[canonicalTicker(holding.symbol)]?.name ||
          holding.name,
      ),
    ),
  );
  const portfolioTickers = new Set(
    savedHoldings.map((holding) => canonicalTicker(holding.symbol)),
  );
  const holdingsSymbols = savedHoldings.map((holding) => canonicalTicker(holding.symbol)).filter(Boolean);
  const holdingsKey = holdingsSymbols.join(",");
  const commitAlertThreshold = (field, draft, minimum, maximum, setDraft) => {
    if (!draft.trim()) {
      setDraft(String(alertPreferences[field]));
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(alertPreferences[field]));
      return;
    }
    const value = Math.min(maximum, Math.max(minimum, parsed));
    setAlertPreferences((current) => ({ ...current, [field]: value }));
    setDraft(String(value));
  };
  useEffect(() => {
    localStorage.setItem("finn-push-alert-preferences", JSON.stringify(alertPreferences));
  }, [alertPreferences]);
  useEffect(() => {
    let cancelled = false;
    const loadMarketWatch = async () => {
      if (!holdingsKey || !alertPreferences.enabled || !alertPreferences.marketMoves) return;
      try {
        const chunks = [];
        for (let index = 0; index < holdingsSymbols.length; index += 4)
          chunks.push(holdingsSymbols.slice(index, index + 4));
        const payloads = await Promise.all(chunks.map(async (chunk) => {
          const response = await fetch(`/api/market?symbols=${encodeURIComponent(chunk.join(","))}`);
          return response.ok ? response.json() : null;
        }));
        if (!cancelled) setMarketWatch(payloads.flatMap((payload) => payload?.data || []));
      } catch {
        if (!cancelled) setMarketWatch([]);
      }
    };
    loadMarketWatch();
    const timer = window.setInterval(loadMarketWatch, 5 * 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [holdingsKey, alertPreferences.enabled, alertPreferences.marketMoves]);
  useEffect(() => {
    if (!announcementLoaded) return;
    const fire = (title, body, key) => {
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body, tag: key });
        else setAlertStatus(`${title}: ${body} (Enable browser notifications in Filter rules.)`);
      } catch {
        setAlertStatus(`${title}: ${body}`);
      }
    };
    const allIds = announcements.map((item) => item.id || `${item.ticker}-${item.filedAt}-${item.headline}`);
    if (!initialAnnouncementScan.current) {
      initialAnnouncementScan.current = true;
      seenAlertIds.current = new Set(allIds);
      return;
    }
    if (!seenAlertIds.current) {
      try { seenAlertIds.current = new Set(JSON.parse(localStorage.getItem("finn-seen-push-alerts") || "[]")); }
      catch { seenAlertIds.current = new Set(); }
    }
    const newlySeen = [];
    for (const item of announcements) {
      const id = item.id || `${item.ticker}-${item.filedAt}-${item.headline}`;
      if (seenAlertIds.current.has(id)) continue;
      seenAlertIds.current.add(id);
      const filedAt = parseAnnouncementDate(item.filedAt)?.getTime() || 0;
      if (Date.now() - filedAt <= 3 * 60_000 && filedAt <= Date.now() + 60_000) newlySeen.push(item);
    }
    try { localStorage.setItem("finn-seen-push-alerts", JSON.stringify([...seenAlertIds.current].slice(-1200))); } catch {}
    if (!alertPreferences.enabled) return;
    for (const item of newlySeen) {
      const matchesPortfolio = portfolioKeys.has(item.companyKey || normalizeCompanyKey(item.company)) || portfolioTickers.has(canonicalTicker(item.ticker || ""));
      if (!matchesPortfolio || !alertPreferences.categories.includes(item.category)) continue;
      fire(`FINN · ${item.company}`, `${item.category.replaceAll("_", " ")}: ${item.headline}`, item.id || item.headline);
    }
  }, [announcements, announcementLoaded, alertPreferences, holdingsKey]);
  useEffect(() => {
    if (!alertPreferences.enabled || !alertPreferences.marketMoves) return;
    if (!marketWatch.length) return;
    let seen;
    try { seen = new Set(JSON.parse(localStorage.getItem("finn-seen-market-alerts-v2") || "[]")); }
    catch { seen = new Set(); }
    const dateTag = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
    const nextSeen = new Set(seen);
    for (const quote of marketWatch) {
      const symbol = canonicalTicker(quote.symbol || "");
      const movement = Math.abs(Number(quote.changePct));
      const unusualVolume = Number(quote.volumeMultiple) >= Number(alertPreferences.volumeMultiple);
      const unusualPrice = movement >= Number(alertPreferences.priceMovePct);
      const conditions = [unusualPrice && "price", unusualVolume && "volume"].filter(Boolean);
      for (const condition of conditions) {
        const key = `${symbol}-${dateTag}-${condition}`;
        if (nextSeen.has(key)) continue;
        nextSeen.add(key);
        const company = savedHoldings.find((holding) => canonicalTicker(holding.symbol) === symbol)?.name || symbol;
        const body = condition === "price"
          ? `${quote.changePct > 0 ? "+" : ""}${Number(quote.changePct).toFixed(2)}% daily move crossed your ±${alertPreferences.priceMovePct}% rule.`
          : `Volume is ${Number(quote.volumeMultiple).toFixed(1)}× its recent average (your threshold: ${alertPreferences.volumeMultiple}×).`;
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification(`FINN · ${company}`, { body, tag: key }); } catch {}
        } else setAlertStatus(`${company}: ${body}`);
      }
    }
    try { localStorage.setItem("finn-seen-market-alerts-v2", JSON.stringify([...nextSeen].slice(-500))); } catch {}
  }, [marketWatch, alertPreferences, holdingsKey]);
  const belongsToPortfolio = (item) => {
    const ticker = canonicalTicker(item.ticker || "");
    if (ticker && portfolioTickers.has(ticker)) return true;
    const company = normalizeCompanyKey(item.companyKey || item.company || "");
    if (portfolioKeys.has(company)) return true;
    if (company.length < 4) return false;
    const matches = savedHoldings.filter((holding) => {
      const holdingName = normalizeCompanyKey(
        portfolioCompanyMetadata[canonicalTicker(holding.symbol)]?.name || holding.name,
      );
      return holdingName.length >= 4 && (company.includes(holdingName) || holdingName.includes(company));
    });
    return matches.length === 1;
  };
  const visibleLiveAnnouncements = announcements
    .filter((item) => isInSelectedRange(item.filedAt))
    .filter((item) => showRoutine || priorityCategories.has(item.category))
    .filter(
      (item) =>
        !portfolioOnly || belongsToPortfolio(item),
    );
  const hiddenRoutineExists = !showRoutine && announcements.some((item) =>
    isInSelectedRange(item.filedAt) && !priorityCategories.has(item.category) &&
    (!portfolioOnly || portfolioKeys.has(item.companyKey || normalizeCompanyKey(item.company)) || portfolioTickers.has(canonicalTicker(item.ticker || ""))),
  );
  const companyGroups = [];
  const groupsByKey = new Map();
  for (const item of visibleLiveAnnouncements) {
    const key = item.companyKey || normalizeCompanyKey(item.company);
    if (!groupsByKey.has(key)) {
      const group = {
        key,
        name: item.company,
        ticker: "",
        filings: [],
        sources: new Set(),
        latestAt: 0,
        priorityRank: priorityCategories.has(item.category) ? 0 : 1,
      };
      groupsByKey.set(key, group);
      companyGroups.push(group);
    }
    const group = groupsByKey.get(key);
    group.priorityRank = Math.min(group.priorityRank, priorityCategories.has(item.category) ? 0 : 1);
    if (item.company.length > group.name.length) group.name = item.company;
    if (item.ticker && !/^\d+$/.test(item.ticker)) group.ticker = item.ticker;
    group.sources.add(item.source);
    const filedAt = parseAnnouncementDate(item.filedAt)?.getTime() || 0;
    group.latestAt = Math.max(group.latestAt, filedAt);
    const cleanHeadline = (item.headline || "")
      .replace(/\s*\|\s*SUBJECT:.*$/i, "")
      .replace(/^[A-Z][A-Z0-9&.-]{1,19}:\s*/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const filingKey = `${item.category}:${cleanHeadline}`;
    let filing = group.filings.find((candidate) => candidate.key === filingKey);
    const stopwords = new Set([
      "company",
      "limited",
      "exchange",
      "informed",
      "submitted",
      "please",
      "refer",
      "enclosed",
      "herewith",
      "attachment",
      "board",
      "meeting",
      "held",
      "under",
      "regulation",
      "sebi",
      "quarter",
      "period",
      "year",
      "about",
      "regarding",
      "that",
      "this",
      "with",
      "from",
      "has",
      "have",
      "for",
      "the",
      "and",
      "its",
      "was",
      "are",
      "to",
    ]);
    const tokens = new Set(
      cleanHeadline
        .split(" ")
        .filter((token) => token.length > 3 && !stopwords.has(token)),
    );
    const tokenSimilarity = (left, right) => {
      const union = new Set([...left, ...right]);
      return union.size
        ? [...left].filter((token) => right.has(token)).length / union.size
        : 0;
    };
    if (!filing && item.category !== "unclassified") {
      filing = group.filings.find(
        (candidate) =>
          candidate.category === item.category &&
          Math.abs(candidate.time - filedAt) <= 6 * 60 * 60 * 1000 &&
          candidate.sourceNames.some((source) => source !== item.source) &&
          tokenSimilarity(candidate.tokens, tokens) >= 0.22,
      );
    }
    if (!filing) {
      filing = {
        key: filingKey,
        category: item.category,
        headline: item.headline.replace(/\s*\|\s*SUBJECT:.*$/i, ""),
        filedAt: item.filedAt,
        time: filedAt,
        links: [],
        sourceNames: [],
        tokens,
      };
      group.filings.push(filing);
    }
    if (item.headline.length > filing.headline.length)
      filing.headline = item.headline.replace(/\s*\|\s*SUBJECT:.*$/i, "");
    if (!filing.sourceNames.includes(item.source))
      filing.sourceNames.push(item.source);
    if (
      item.sourceUrl &&
      !filing.links.some((link) => link.url === item.sourceUrl)
    ) {
      filing.links.push({ source: item.source, url: item.sourceUrl });
    }
    if (filedAt > filing.time) {
      filing.time = filedAt;
      filing.filedAt = item.filedAt;
    }
  }
  for (const group of companyGroups) {
    if (group.ticker) continue;
    const holding = savedHoldings.find((row) =>
      normalizeCompanyKey(row.name) === group.key ||
      normalizeCompanyKey(portfolioCompanyMetadata[canonicalTicker(row.symbol)]?.name || "") === group.key ||
      (group.key.length >= 4 && [row.name, portfolioCompanyMetadata[canonicalTicker(row.symbol)]?.name || ""].some((name) => {
        const normalized = normalizeCompanyKey(name);
        return normalized.length >= 4 && (normalized.includes(group.key) || group.key.includes(normalized));
      })),
    );
    if (holding) group.ticker = canonicalTicker(holding.symbol);
  }
  companyGroups.sort((a, b) => a.priorityRank - b.priorityRank ||
    (sortOrder === "newest" ? b.latestAt - a.latestAt : a.latestAt - b.latestAt));
  for (const group of companyGroups)
    group.filings.sort((a, b) =>
      Number(!priorityCategories.has(a.category)) - Number(!priorityCategories.has(b.category)) ||
      (sortOrder === "newest" ? b.time - a.time : a.time - b.time),
    );
  return (
    <main className="content figma-screen push-detail">
      <div className="figma-notice">LIVE EXCHANGE FILINGS · NSE</div>
      <div className="figma-horizon">
        {[
          ["24H", "24H"],
          ["48H", "48H"],
          ["7D", "7D"],
          ["CUSTOM", "CUSTOM⌄"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={range === value ? "selected" : ""}
            onClick={() => setRange(value)}
            aria-pressed={range === value}
          >
            {label}
          </button>
        ))}
        <button
          className={portfolioOnly ? "selected" : ""}
          onClick={() => setPortfolioOnly(!portfolioOnly)}
          aria-pressed={portfolioOnly}
        >
          Portfolio only
        </button>
        <span className="alert-pill">
          <CircleDot size={10} /> {companyGroups.length} COMPANIES
        </span>
      </div>
      <div className="feed-sort-row">
        <div className="push-feed-filters">
          <span>Priority filings first</span>
          <button type="button" className={`routine-toggle ${showRoutine ? "selected" : ""}`} aria-pressed={showRoutine} onClick={() => setShowRoutine(!showRoutine)}>
            {showRoutine ? "Routine filings shown" : "Show routine filings"}
          </button>
        </div>
        <button
          type="button"
          className="feed-sort-button"
          onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
          aria-label={`Currently ${sortOrder === "newest" ? "newest" : "oldest"} first. Change sort order`}
        >
          <ArrowDownUp size={14} />
          {sortOrder === "newest" ? "Newest first" : "Oldest first"}
        </button>
      </div>
      <details className="push-alert-rules" open={alertSettingsOpen} onToggle={(event) => setAlertSettingsOpen(event.currentTarget.open)}>
        <summary><Bell size={13} /> Filter rules <span>{alertPreferences.enabled ? "Alerts On" : "Alerts Off"}</span></summary>
        <div className="push-alert-settings">
          <label className="alert-enable-row"><input type="checkbox" checked={alertPreferences.enabled} onChange={(event) => setAlertPreferences((current) => ({ ...current, enabled: event.target.checked }))} /> Watch my portfolio</label>
          <div className="alert-thresholds">
            <label>Daily price move (%)<input type="text" inputMode="decimal" value={priceMoveDraft} onChange={(event) => setPriceMoveDraft(event.target.value)} onBlur={() => commitAlertThreshold("priceMovePct", priceMoveDraft, 0.5, 50, setPriceMoveDraft)} /></label>
            <label>Volume vs. average (×)<input type="text" inputMode="decimal" value={volumeMultipleDraft} onChange={(event) => setVolumeMultipleDraft(event.target.value)} onBlur={() => commitAlertThreshold("volumeMultiple", volumeMultipleDraft, 1, 20, setVolumeMultipleDraft)} /></label>
          </div>
          <label className="alert-enable-row"><input type="checkbox" checked={alertPreferences.marketMoves} onChange={(event) => setAlertPreferences((current) => ({ ...current, marketMoves: event.target.checked }))} /> Alert on Yahoo Finance daily moves and volume</label>
          <span className="alert-category-label">Alert me about filings in</span>
          <div className="alert-category-grid">
            {alertableCategories.map(([category, label]) => (
              <label key={category}><input type="checkbox" checked={alertPreferences.categories.includes(category)} onChange={(event) => setAlertPreferences((current) => ({ ...current, categories: event.target.checked ? [...new Set([...current.categories, category])] : current.categories.filter((item) => item !== category) }))} /> {label}</label>
            ))}
          </div>
          <button className="text-button" type="button" onClick={async () => {
            if (!("Notification" in window)) { setAlertStatus("This browser does not support desktop notifications."); return; }
            const permission = await Notification.requestPermission();
            setAlertStatus(permission === "granted" ? "Browser notifications enabled." : "Notifications were not enabled; alerts will appear in this page while it is open.");
          }}>Enable browser notifications</button>
          <button className="text-button" type="button" onClick={async () => {
            const title = "FINN · Test alert";
            const body = "Alerts are working while this page is open.";
            try {
              if (typeof Notification !== "undefined") {
                let permission = Notification.permission;
                if (permission === "default") permission = await Notification.requestPermission();
                if (permission === "granted") new Notification(title, { body, tag: "finn-test-alert" });
              }
            } catch {}
            setAlertStatus("Test alert: Alerts are working while this page is open. If browser notifications are unavailable, this message confirms the in-app alert path.");
          }}>Send test alert</button>
          <small>Price and volume checks use Yahoo Finance daily bars and refresh every five minutes while this page is open. For alerts when the app is closed, a server push service is still required.</small>
        </div>
      </details>
      {alertStatus && <p className="push-alert-status" role="status">{alertStatus}</p>}
      {range === "CUSTOM" && (
        <div className="custom-date-filter">
          <label>
            From{" "}
            <input
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
            />
          </label>
          <label>
            To{" "}
            <input
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
            />
          </label>
        </div>
      )}
      <section className="live-announcements">
        <div className="section-title">
          <span>Exchange announcements</span>
          <span className="muted">
            NSE ·{" "}
            {selectedDates.from} to {selectedDates.to}
          </span>
          <button
            className="feed-refresh"
            type="button"
            onClick={refreshAnnouncements}
            disabled={announcementRefreshing}
            aria-label="Refresh exchange announcements"
            title="Refresh exchange announcements"
          >
            <RefreshCw
              size={15}
              className={announcementRefreshing ? "spin" : ""}
            />
          </button>
        </div>
        {announcementError ? (
          <p className="muted">Live exchange feed unavailable. Refresh to try again.</p>
        ) : visibleLiveAnnouncements.length ? (
          <>
            <p className="feed-summary">
              {visibleLiveAnnouncements.length} filings across{" "}
              {companyGroups.length} companies in the selected time range
              {announcementMeta?.fetchedAt && (
                <>
                  {" "}
                  · refreshed{" "}
                  {new Date(announcementMeta.fetchedAt).toLocaleTimeString()}
                </>
              )}
            </p>
            {companyGroups
              .slice(0, expandedCompanies ? undefined : 5)
              .map((group) => (
                <article className="live-company" key={group.key}>
                  <div className="live-company-heading">
                    <div>
                      <strong>{group.name}</strong>
                      <small>
                        {group.filings.length} filing
                        {group.filings.length === 1 ? "" : "s"} ·{" "}
                        {[...group.sources].join(" + ")}
                      </small>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setContactCompany(group)}
                    >
                      Who to ask
                    </button>
                    {group.ticker && (
                      <button className="text-button" onClick={() => {
                        const filing = group.filings.find((entry) => entry.category === "results") || group.filings[0];
                        setSelectedTicker(canonicalTicker(group.ticker));
                        setSelectedFilingContext({
                          company: group.name,
                          ticker: canonicalTicker(group.ticker),
                          title: filing?.headline || `${group.name} exchange filing`,
                          category: filing?.category || "unclassified",
                          filedAt: filing?.filedAt || "",
                          sources: filing?.links || [],
                        });
                        setActive("ask");
                      }}>
                        Results brief
                      </button>
                    )}
                  </div>
                  {group.filings
                    .slice(0, expandedCompany === group.key ? undefined : 3)
                    .map((filing) => (
                      <div className="live-filing" key={filing.key}>
                        <span
                          className={`event-tag ${filing.category === "unclassified" ? "neutral" : "green"}`}
                        >
                          {filing.category.replaceAll("_", " ")}
                        </span>
                        <div className="live-filing-copy">
                          <p title={filing.headline}>{filing.headline}</p>
                          <small>{filing.filedAt || "Date not supplied"}</small>
                        </div>
                        <div className="filing-links">
                          {filing.links.map((link) => (
                            <a
                              key={`${link.source}-${link.url}`}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${link.source} filing`}
                              title={`Open ${link.source} filing`}
                            >
                              {link.source.startsWith("BSE") ? "BSE" : "NSE"}{" "}
                              <ExternalLink size={11} />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  {group.filings.length > 3 && (
                    <button
                      className="text-button more-filings"
                      onClick={() =>
                        setExpandedCompany(
                          expandedCompany === group.key ? null : group.key,
                        )
                      }
                    >
                      {expandedCompany === group.key
                        ? "Show fewer filings"
                        : `Show all ${group.filings.length} filings`}
                    </button>
                  )}
                </article>
              ))}
            {companyGroups.length > 5 && (
              <button
                className="text-button"
                onClick={() => setExpandedCompanies(!expandedCompanies)}
              >
                {expandedCompanies
                  ? "Show fewer companies"
                  : `Show all ${companyGroups.length} companies`}
              </button>
            )}
          </>
        ) : announcementLoaded ? (
          <div className="feed-empty-state">
            <p>
              {hiddenRoutineExists
                ? "Only routine or unclassified filings are available for this selection; they are hidden to keep material items prominent."
                : portfolioOnly
                ? "No filings for your holdings were returned in the selected date range."
                : "No exchange announcements were returned for this time range."}
            </p>
            {hiddenRoutineExists && <button className="secondary" onClick={() => setShowRoutine(true)}>Show routine filings</button>}
            <p className="muted">
              Dated exchange data is available for recent filing history. RSS
              fallback data, when used, is only a latest-items snapshot.
            </p>
            <div className="share-actions">
              {portfolioOnly && (
                <button
                  className="secondary"
                  onClick={() => setPortfolioOnly(false)}
                >
                  Show all companies
                </button>
              )}
              <button
                className="text-button"
                onClick={() => setActive("portfolio")}
              >
                Review portfolio
              </button>
            </div>
            {portfolioOnly && (
              <div className="portfolio-feed-empty-list">
                <h3>Your portfolio companies</h3>
                <p>No matching filing in the current exchange RSS snapshot.</p>
                {savedHoldings.map((holding) => {
                  const ticker = holding.symbol.replace(/\.(NS|BO)$/i, "");
                  return (
                    <div
                      className="portfolio-feed-empty-row"
                      key={holding.symbol}
                    >
                      <div>
                        <strong>{holding.name}</strong>
                        <small>{holding.symbol}</small>
                      </div>
                      <span>No latest filing</span>
                      <button
                        className="text-button"
                        onClick={() => {
                          setSelectedTicker(ticker);
                          setActive("pull");
                        }}
                      >
                        Research
                      </button>
                      <button className="text-button" onClick={() => {
                        setSelectedTicker(ticker);
                        setSelectedFilingContext(null);
                        setActive("ask");
                      }}>Results brief</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="muted">Loading NSE filings…</p>
        )}
      </section>
      {contactCompany && (
        <WhoCanExplainDialog
          company={contactCompany.name}
          ticker={contactCompany.ticker}
          onClose={() => setContactCompany(null)}
          onDraft={(expert) => {
            setDraftContact({ expert, company: contactCompany.name });
            setContactCompany(null);
          }}
          onCall={(expert) => {
            setCallContact({ expert, company: contactCompany.name });
            setContactCompany(null);
          }}
        />
      )}
      {draftContact && (
        <DraftShareDialog
          key={`${draftContact.company}-${draftContact.expert.name}`}
          recipient={draftContact.expert.name}
          email={draftContact.expert.email}
          initialText={`Hi ${draftContact.expert.name}, I’m researching ${draftContact.company}. Could I ask you a few questions about your experience in this area?`}
          onClose={() => setDraftContact(null)}
        />
      )}
      {callContact && (
        <ContactCallDialog
          contact={callContact.expert.name}
          company={callContact.company}
          phoneContacts={phoneContacts}
          onClose={() => setCallContact(null)}
        />
      )}
    </main>
  );
}

function DetailedPull({
  setActive,
  selectedTicker,
  setSelectedTicker,
  setSelectedFilingContext,
  phoneContacts,
  remoteTickerDirectory = [],
}) {
  const [ticker, setTicker] = useState(selectedTicker || "TRENT");
  const [lookupTicker, setLookupTicker] = useState(selectedTicker || "TRENT");
  const [tickerSuggestionsOpen, setTickerSuggestionsOpen] = useState(false);
  const [dbTickerSuggestions, setDbTickerSuggestions] = useState([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [draftContact, setDraftContact] = useState(null);
  const [callContact, setCallContact] = useState(null);
  const [liveFundamentals, setLiveFundamentals] = useState(null);
  const [liveQuote, setLiveQuote] = useState(null);
  const [fundamentalsError, setFundamentalsError] = useState("");
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false);
  const portfolioHoldings = loadPortfolioHoldings();
  const tickerDirectory = useMemo(() => {
    const rows = [...bundledTickerDirectory, ...remoteTickerDirectory, ...dbTickerSuggestions];
    for (const holding of portfolioHoldings) {
      const symbol = canonicalTicker(holding.symbol);
      if (!rows.some((row) => row.ticker === symbol))
        rows.push({ ticker: symbol, name: holding.name, sector: holding.sector || "Portfolio" });
    }
    return [...new Map(rows.map((row) => [row.ticker, row])).values()];
  }, [remoteTickerDirectory, dbTickerSuggestions, portfolioHoldings.length]);
  const matchingTickers = useMemo(() => {
    const query = ticker.trim().toLowerCase();
    if (!query) return [];
    return tickerDirectory
      .filter((row) => row.ticker.toLowerCase().includes(query) || row.name.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.ticker.toLowerCase().startsWith(query) || a.name.toLowerCase().startsWith(query);
        const bStarts = b.ticker.toLowerCase().startsWith(query) || b.name.toLowerCase().startsWith(query);
        return Number(bStarts) - Number(aStarts) || a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [ticker, tickerDirectory]);
  useEffect(() => {
    const nextTicker = canonicalTicker(selectedTicker || "TRENT");
    if (nextTicker !== ticker) {
      setTicker(nextTicker);
      setLookupTicker(nextTicker);
    }
  }, [selectedTicker]);
  useEffect(() => {
    const query = ticker.trim();
    if (!query) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/tickers?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          if (Array.isArray(payload?.data)) setDbTickerSuggestions(payload.data);
        })
        .catch(() => {});
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [ticker]);
  useEffect(() => {
    let cancelled = false;
    setFundamentalsLoading(true);
    setFundamentalsError("");
    setLiveFundamentals(null);
    fetch(`/api/fundamentals?ticker=${encodeURIComponent(lookupTicker)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            [payload.error, payload.detail].filter(Boolean).join(": ") ||
              "Source unavailable",
          );
        if (!cancelled) setLiveFundamentals(payload);
      })
      .catch((error) => {
        if (!cancelled) {
          setLiveFundamentals(null);
          setFundamentalsError(error.message);
        }
      })
      .finally(() => !cancelled && setFundamentalsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lookupTicker]);
  useEffect(() => {
    let cancelled = false;
    setLiveQuote(null);
    fetch(`/api/market?symbols=${encodeURIComponent(canonicalTicker(lookupTicker))}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => { if (!cancelled) setLiveQuote(payload?.data?.[0] || null); })
      .catch(() => { if (!cancelled) setLiveQuote(null); });
    return () => { cancelled = true; };
  }, [lookupTicker]);
  const selectedTickerCode = canonicalTicker(lookupTicker);
  const companyMeta = portfolioCompanyMetadata[selectedTickerCode] ||
    tickerDirectory.find((row) => row.ticker === selectedTickerCode);
  const detail = companyDetails[selectedTickerCode] || {
    name: companyMeta?.name || `${selectedTickerCode} Ltd`,
    sector: companyMeta?.sector || "Company lookup",
    exchange: `NSE · ${selectedTickerCode}`,
    snapshot:
      "Company facts are not loaded for this ticker yet. Open the linked source to review its published financials.",
    trajectory: "Not available in this preview.",
    cash: "Not available in this preview.",
    guidance: "Not available in this preview.",
    metrics: [],
    sources: [],
  };
  const screenerTicker = /^[A-Z0-9.&-]{1,20}$/.test(selectedTickerCode)
    ? selectedTickerCode
    : "";
  const displayName = liveFundamentals?.name || detail.name;
  const experts = getSampleCompanyExperts(ticker, displayName);
  const selectResearchTicker = (value) => {
    const query = value.trim().toLowerCase();
    const match = tickerDirectory.find(
      (row) => row.ticker.toLowerCase() === query || row.name.toLowerCase() === query,
    ) || matchingTickers[0];
    const nextTicker = canonicalTicker(match?.ticker || value.trim());
    setTicker(nextTicker);
    setLookupTicker(nextTicker);
    setSelectedTicker(nextTicker);
    setTickerSuggestionsOpen(false);
  };
  return (
    <main className="content figma-screen pull-detail">
      <div className="figma-notice">COMPANY RESEARCH · LIVE LOOKUP</div>
      <div className="research-search-wrap">
        <div className="research-search">
          <Search size={16} />
          <input
            value={ticker}
            aria-label="Search a company by name or ticker"
            placeholder="Search a company or ticker (e.g. OLA)"
            onFocus={() => setTickerSuggestionsOpen(true)}
            onChange={(event) => {
              setTicker(event.target.value);
              setTickerSuggestionsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") selectResearchTicker(event.currentTarget.value);
              if (event.key === "Escape") setTickerSuggestionsOpen(false);
            }}
          />
          <button aria-label="Search company" onClick={() => selectResearchTicker(ticker)}>
            <Search size={16} />
          </button>
        </div>
        {tickerSuggestionsOpen && matchingTickers.length > 0 && (
          <div className="ticker-suggestions" role="listbox" aria-label="Company suggestions">
            {matchingTickers.map((row) => (
              <button
                key={row.ticker}
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectResearchTicker(row.ticker)}
              >
                <span><strong>{row.name}</strong><small>{row.sector}</small></span>
                <b>{row.ticker}</b>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="pull-actions pull-single-action">
        <button
          className="primary"
          onClick={() => {
            selectResearchTicker(ticker);
            setSelectedFilingContext(null);
            setActive("ask");
          }}
        >
          <Sparkles size={15} /> Ask FINN about {canonicalTicker(ticker) || "company"}
        </button>
      </div>
      <section
        className="pull-portfolio-shortcuts"
        aria-label="Portfolio companies"
      >
        <div>
          <strong>From your portfolio</strong>
          <span>Select a holding to research</span>
        </div>
        <div className="pull-portfolio-chips">
          {portfolioHoldings.map((holding) => {
            const holdingTicker = canonicalTicker(holding.symbol);
            return (
              <button
                key={holding.symbol}
                className={
                  canonicalTicker(ticker) === holdingTicker ? "selected" : ""
                }
                onClick={() => selectResearchTicker(holdingTicker)}
                title={`Research ${holding.name}`}
              >
                {holding.name} <span>{holdingTicker}</span>
              </button>
            );
          })}
        </div>
      </section>
      <div className="forensic-chips">
        <span>FORENSICS</span>
        <button
          onClick={() => {
            setTicker("DIXON");
            setLookupTicker("DIXON");
          }}
        >
          <CircleDot size={9} /> Dixon Q2 guidance
        </button>
        <button
          onClick={() => {
            setTicker("UNOMINDA");
            setLookupTicker("UNOMINDA");
          }}
        >
          <CircleDot size={9} /> Tata Motors capex
        </button>
        <button
          onClick={() => {
            setTicker("TITAN");
            setLookupTicker("TITAN");
          }}
        >
          <CircleDot size={9} /> Titan gross margin
        </button>
      </div>
      {canonicalTicker(ticker) !== selectedTickerCode ? (
        <div className="company-selection-hint">Choose a company suggestion or press search to load its data.</div>
      ) : <>
      <section className="pull-company-card">
        <div className="company-title">
          <div className="ticker-badge blue-badge">{ticker.slice(0, 2)}</div>
          <div>
            <h2>{displayName}</h2>
            <span>
              {detail.sector} · {detail.exchange}
            </span>
          </div>
          <strong>
            {liveQuote?.price != null
              ? new Intl.NumberFormat("en-IN", { style: "currency", currency: liveQuote.currency || "INR", maximumFractionDigits: 2 }).format(liveQuote.price)
              : liveFundamentals?.currentPrice || "—"}
            <small className="muted"> {liveQuote?.price != null ? "Yahoo Finance · delayed/EOD" : "Screener snapshot"}</small>
          </strong>
        </div>
        <div className="metric-row four-col">
          {(liveFundamentals?.keyMetrics || []).map(({ label, value }) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value || "—"}</strong>
              <span>Screener · latest period</span>
            </div>
          ))}
          <div>
            <small>MKT CAP</small>
            <strong>{liveFundamentals?.marketCap || "—"}</strong>
            <span>{liveFundamentals ? "Screener snapshot" : "Unavailable"}</span>
          </div>
          <div>
            <small>P/E LTM</small>
            <strong>{liveFundamentals?.stockPE || "—"}</strong>
            <span>{liveFundamentals ? "Screener snapshot" : "Unavailable"}</span>
          </div>
        </div>
      </section>
      {liveFundamentals?.quarterlyHeadline?.length > 0 && (
        <section className="quarterly-metrics">
          <div className="section-title"><span>Latest quarter · QoQ and YoY</span><small>{liveFundamentals.quarterlyHeadline.find((item) => item.period)?.period || "Screener quarterly table"}</small></div>
          <div className="quarterly-metric-grid">
            {liveFundamentals.quarterlyHeadline.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.current || "Unavailable"}</strong>
                <small>QoQ {item.qoq || "unavailable"} · YoY {item.yoy || "unavailable"}</small>
              </article>
            ))}
          </div>
          <small className="muted">Aggregated quarterly values from Screener. Verify against the linked exchange filing before relying on them.</small>
        </section>
      )}
      <section className="network-research-card">
        <div className="network-research-heading">
          <h3>Who can explain {displayName}?</h3>
          <span className="tier-pill">SAMPLE PROFILES</span>
        </div>
        <p>
          Three illustrative company and industry profiles for a demo outreach
          workflow.
        </p>
        <div className="contact-strip">
          <div className="avatar-stack">
            {experts.map((expert) => (
              <span key={expert.name}>
                {expert.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
            ))}
          </div>
          <div>
            <strong>{experts[0].name} and two others</strong>
            <span>{experts[0].role}</span>
          </div>
          <button
            className="primary"
            onClick={() => setContactDialogOpen(true)}
          >
            Who to ask <ChevronRight size={13} />
          </button>
        </div>
      </section>
      <section className="research-sections">
        <div className="section-title">
          <span>Business snapshot</span>
          <span className="muted">{companyDetails[selectedTickerCode] ? "Illustrative company notes" : liveFundamentals ? "Screener source" : "Source status"}</span>
        </div>
        <p>{companyDetails[selectedTickerCode]
          ? "The overview and operating commentary below are illustrative demo notes, not live filings. Figures are live only when retrieved from Screener or Yahoo Finance."
          : detail.snapshot}</p>
        <div className="research-grid detailed-grid">
          <div>
            <span>Trajectory</span>
            <strong>{detail.trajectory}</strong>
          </div>
          <div>
            <span>Cash quality</span>
            <strong>{detail.cash}</strong>
          </div>
          <div>
            <span>Guidance</span>
            <strong>{detail.guidance}</strong>
          </div>
          <div>
            <span>Sources</span>
            <strong>
              {liveFundamentals?.source || "No source data loaded for this company"}
            </strong>
            {screenerTicker && (
              <a
                href={`https://www.screener.in/company/${encodeURIComponent(screenerTicker)}/consolidated/`}
                target="_blank"
                rel="noreferrer"
              >
                Open {ticker} on Screener.in <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
        <div className="fundamentals-source-state">
          {fundamentalsLoading || (!liveFundamentals && !fundamentalsError) ? (
            <p>Loading Screener company tables…</p>
          ) : fundamentalsError ? (
            <p>Live fundamentals unavailable: {fundamentalsError}</p>
          ) : (
            <p>
              Source data retrieved{" "}
              {new Date(liveFundamentals.fetchedAt).toLocaleString()} · cached
              for 15 minutes.
            </p>
          )}
          {[
            ["Quarterly results", liveFundamentals?.tables?.quarterlyResults, liveFundamentals?.tables?.quarterlyPeriods],
            ["Profit & Loss", liveFundamentals?.tables?.profitLoss, []],
            ["Balance sheet", liveFundamentals?.tables?.balanceSheet, []],
            ["Cash flow", liveFundamentals?.tables?.cashFlow, []],
            ["Ratios", liveFundamentals?.tables?.ratios, []],
          ].filter(([, rows]) => rows?.length > 0).map(([title, rows, periods]) => (
            <div className="fundamentals-table-wrap" key={title}>
              <h3>{title} · source table</h3>
              <table>
                <thead><tr><th>Line item</th>{rows[0].values.map((_, index) => <th key={index}>{periods?.[index] || `Period ${index + 1}`}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 12).map((row) => <tr key={row.label}><td>{row.label}</td>{row.values.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
      </>}
      {contactDialogOpen && (
        <WhoCanExplainDialog
          company={displayName}
          ticker={ticker}
          onClose={() => setContactDialogOpen(false)}
          onDraft={(expert) => {
            setDraftContact({ expert, company: displayName });
            setContactDialogOpen(false);
          }}
          onCall={(expert) => {
            setCallContact({ expert, company: displayName });
            setContactDialogOpen(false);
          }}
        />
      )}
      {draftContact && (
        <DraftShareDialog
          key={`${draftContact.company}-${draftContact.expert.name}`}
          recipient={draftContact.expert.name}
          email={draftContact.expert.email}
          initialText={`Hi ${draftContact.expert.name}, I’m researching ${draftContact.company}. Could I ask you a few questions about your experience in this area?`}
          onClose={() => setDraftContact(null)}
        />
      )}
      {callContact && (
        <ContactCallDialog
          contact={callContact.expert.name}
          company={callContact.company}
          phoneContacts={phoneContacts}
          onClose={() => setCallContact(null)}
        />
      )}
    </main>
  );
}

function DetailedNetwork({ setActive, phoneContacts, setPhoneContacts, authSession }) {
  const [notice, setNotice] = useState("");
  const [phoneContactStatus, setPhoneContactStatus] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftRecipient, setDraftRecipient] = useState({ name: "Ananya Sen", email: "" });
  const [sampleContacts, setSampleContacts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("finn-sample-network-contacts") || "[]"); }
    catch { return []; }
  });
  const [sampleContactsLoading, setSampleContactsLoading] = useState(false);
  const [sampleContactsExpanded, setSampleContactsExpanded] = useState(false);
  const [draftText, setDraftText] = useState(
    "Hi Ananya, I saw the latest update on the specialty fluoro-polymer capex cycle and thought of our earlier conversation. Would you have time for a quick catch-up this week?",
  );
  const [draftActionBusy, setDraftActionBusy] = useState("");
  const contactPickerAvailable =
    typeof navigator !== "undefined" &&
    typeof navigator.contacts?.select === "function";
  const loadSampleContacts = async () => {
    setSampleContactsLoading(true);
    try {
      const response = await fetch("/api/sample-contacts");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Sample contacts are unavailable.");
      setSampleContacts(payload.data || []);
      localStorage.setItem("finn-sample-network-contacts", JSON.stringify(payload.data || []));
      setNotice(`Loaded ${(payload.data || []).length} synthetic sample contacts.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSampleContactsLoading(false);
    }
  };
  const hideSampleContacts = () => {
    setSampleContacts([]);
    localStorage.removeItem("finn-sample-network-contacts");
    setSampleContactsExpanded(false);
    setNotice("Sample contacts hidden. The demo dataset remains in the database.");
  };
  const prepareContactDraft = (person, company = person.sector || "your industry") => {
    setDraftRecipient({ name: person.name, email: person.email || "" });
    setDraftText(`Hi ${person.name.split(" ")[0]}, I’m looking into ${company}. Given your experience in ${person.expertise || person.role}, would you be open to sharing your perspective?`);
    setDraftOpen(true);
  };
  const choosePhoneContacts = async () => {
    if (!contactPickerAvailable) return;
    try {
      const available = await navigator.contacts.getProperties();
      const fields = ["name", "email", "tel"].filter((field) =>
        available.includes(field),
      );
      const selected = await navigator.contacts.select(fields, {
        multiple: true,
      });
      const imported = selected.map((person) => ({
        name: person.name?.[0] || "Unnamed contact",
        email: person.email?.[0] || "",
        tel: person.tel?.[0] || "",
      }));
      setPhoneContacts((current) => [
        ...new Map(
          [...current, ...imported].map((person) => [
            `${person.name}-${person.tel}-${person.email}`,
            person,
          ]),
        ).values(),
      ]);
      setPhoneContactStatus(
        `${imported.length} selected contact${imported.length === 1 ? "" : "s"} added for this session.`,
      );
    } catch (error) {
      setPhoneContactStatus(
        error.name === "AbortError"
          ? "Contact selection cancelled."
          : "Contact picker is unavailable. Try importing a .vcf contact file.",
      );
    }
  };
  const importVCard = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    const records = text.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [];
    const imported = records
      .map((record) => {
        const field = (key) =>
          record
            .match(
              new RegExp(
                `(?:^|\\n)(?:item\\d+\\.)?${key}(?:;[^:]*)?:(.*)`,
                "im",
              ),
            )?.[1]
            ?.trim()
            .replace(/\\[nN]/g, " ")
            .replace(/\\,/g, ",") || "";
        const structuredName = field("N")
          .split(";")
          .filter(Boolean)
          .reverse()
          .join(" ");
        return {
          name: field("FN") || structuredName || "Unnamed contact",
          email: field("EMAIL"),
          tel: field("TEL"),
        };
      })
      .filter(
        (person) =>
          person.name !== "Unnamed contact" || person.email || person.tel,
      );
    setPhoneContacts((current) => [
      ...new Map(
        [...current, ...imported].map((person) => [
          `${person.name}-${person.tel}-${person.email}`,
          person,
        ]),
      ).values(),
    ]);
    setPhoneContactStatus(
      `${imported.length} contact${imported.length === 1 ? "" : "s"} imported locally from ${file.name}.`,
    );
    input.value = "";
  };
  return (
    <main className="content figma-screen network-detail">
      <div className="figma-notice">NETWORK · CONTACTS &amp; INTRODUCTIONS</div>
      <SectionKicker>INTELLIGENCE FABRIC</SectionKicker>
      <div className="network-title-row">
        <div>
          <h1>
            Network
            <br />
            <em>Layer</em>
          </h1>
        </div>
      </div>
      <section className="phone-contact-card">
        <div>
          <strong>Bring in your contacts</strong>
          <p>Works only on Chrome or Safari browsers.</p>
        </div>
        <div className="phone-contact-actions">
          <button
            className="secondary"
            onClick={choosePhoneContacts}
            disabled={!contactPickerAvailable}
            title={contactPickerAvailable ? "Choose selected contacts from your phone" : "Use the vCard import on this browser"}
          >
            Choose from phone
          </button>
          <label className="secondary vcard-picker">
            Import .vcf
            <input
              type="file"
              accept=".vcf,text/vcard"
              onChange={importVCard}
            />
          </label>
        </div>
        {!contactPickerAvailable && (
          <small className="muted">
            This browser does not expose the web contact picker. Importing a
            .vcf file works on iOS and Android browsers.
          </small>
        )}
        {phoneContactStatus && <p role="status">{phoneContactStatus}</p>}
        {phoneContacts.length > 0 && (
          <ul className="phone-contact-list">
            {phoneContacts.map((person, index) => (
              <li key={`${person.name}-${person.tel}-${index}`}>
                <strong>{person.name}</strong>
                <span>
                  {[person.email, person.tel].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="sample-contact-toolbar">
          <div>
            <strong>Sample contacts</strong>
            <small>120 invented profiles for trying network search and outreach.</small>
          </div>
          {sampleContacts.length ? (
            <button className="secondary" type="button" onClick={hideSampleContacts}>Hide samples</button>
          ) : (
            <button className="secondary" type="button" onClick={loadSampleContacts} disabled={sampleContactsLoading}>
              {sampleContactsLoading ? "Loading…" : "Load sample contacts"}
            </button>
          )}
        </div>
        {sampleContacts.length > 0 && (
          <>
            <p className="sample-contact-status" role="status">Loaded {sampleContacts.length} synthetic contacts. Sample profiles and email addresses are fictional.</p>
            <ul className="sample-contact-list">
              {sampleContacts.slice(0, sampleContactsExpanded ? undefined : 8).map((person) => (
                <li key={person.id}>
                  <div className="sample-contact-copy">
                    <strong>{person.name}</strong>
                    <span>{person.role}, {person.company} · last spoke {new Date(`${person.last_spoke}T12:00:00`).toLocaleString("en", { month: "short", year: "numeric" })}</span>
                    <small>{person.relationship} · {person.expertise}</small>
                    {sampleContactsExpanded && <small className="sample-contact-bio">{person.bio}</small>}
                  </div>
                  <div className="sample-contact-actions">
                    <button type="button" className="text-button" onClick={() => prepareContactDraft(person)}>Draft message</button>
                    <a className="text-button" href={`mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent("A question about " + person.sector)}`} title="Opens a draft addressed to a reserved sample email">Email</a>
                  </div>
                </li>
              ))}
            </ul>
            {sampleContacts.length > 8 && (
              <button className="text-button" type="button" onClick={() => setSampleContactsExpanded(!sampleContactsExpanded)}>
                {sampleContactsExpanded ? "Show fewer contacts" : `Show all ${sampleContacts.length} contacts`}
              </button>
            )}
          </>
        )}
      </section>
      <div className="network-stats">
        <div>
          <strong>412</strong>
          <span>Active Ties</span>
        </div>
        <div>
          <strong>64</strong>
          <span>Portfolio Overlaps</span>
        </div>
        <div>
          <strong>18</strong>
          <span>Warm Triggers</span>
        </div>
      </div>
      <div className="network-section-head">
        <h2>
          <CircleDot size={10} className="green-icon" /> Keeping The Network
          Warm
        </h2>
        <span>1 Actionable</span>
      </div>
      <section className="warm-card">
        <div className="warm-card-top">
          <div className="avatar-stack">
            <span>AS</span>
            <span>VS</span>
          </div>
          <div>
            <strong>Ananya Sen</strong>
            <span>VP Strategy · Aditya Birla Group</span>
          </div>
          <b>◌ 7m silent</b>
        </div>
        <div className="warm-signal">
          <strong>↗ Q3 EBITDA +24% Beat</strong>
          <span>SEC Filing 14h ago</span>
          <p>
            <b>FINN Prompt:</b> Last spoke 214 days ago. Natural reason to
            reconnect on specialty fluoro-polymer capex cycle.
          </p>
        </div>
        <div className="warm-card-footer">
          <em>Draft aligned with 2024 syndicate memo</em>
          <button className="primary" onClick={() => prepareContactDraft({ name: "Ananya Sen", expertise: "specialty fluoro-polymer capex cycle" }, "the specialty fluoro-polymer capex cycle")}>
            ☷ Draft Note
          </button>
        </div>
      </section>
      {draftOpen && (
        <div className="share-backdrop" role="presentation">
          <section
            className="share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-title"
          >
            <h2 id="draft-title">Draft message to {draftRecipient.name}</h2>
            <p>
              Review and edit before sharing. FINN does not send it for you.
            </p>
            <textarea
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
            />
            <div className="share-actions">
              <button
                className="secondary"
                disabled={Boolean(draftActionBusy)}
                onClick={async () => {
                  if (draftActionBusy) return;
                  setDraftActionBusy("copy");
                  try {
                    await navigator.clipboard.writeText(draftText);
                    setNotice("Draft copied to clipboard");
                  } catch {
                    setNotice("Clipboard access unavailable");
                  } finally {
                    setDraftActionBusy("");
                  }
                }}
              >
                {draftActionBusy === "copy" ? "Copying…" : "Copy text"}
              </button>
              <button
                className="secondary"
                disabled={Boolean(draftActionBusy)}
                onClick={async () => {
                  if (navigator.share) {
                    setDraftActionBusy("share");
                    try {
                      await navigator.share({ text: draftText });
                    } catch {} finally { setDraftActionBusy(""); }
                  } else {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(draftText)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
              >
                {draftActionBusy === "share" ? "Opening…" : "Share…"}
              </button>
              <button
                className="primary"
                disabled={Boolean(draftActionBusy)}
                onClick={() => {
                  if (draftActionBusy) return;
                  setDraftActionBusy("whatsapp");
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(draftText)}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                  window.setTimeout(() => setDraftActionBusy(""), 900);
                }}
              >
                {draftActionBusy === "whatsapp" ? "Opening…" : "WhatsApp"}
              </button>
              <button
                className="secondary"
                disabled={Boolean(draftActionBusy)}
                onClick={() => {
                  if (!draftRecipient.email) {
                    setNotice("No email address is available for this contact.");
                    return;
                  }
                  window.location.href = `mailto:${encodeURIComponent(draftRecipient.email)}?subject=${encodeURIComponent("A question from FINN")}&body=${encodeURIComponent(draftText)}`;
                }}
              >
                Open email draft
              </button>
              <button
                className="text-button dialog-close"
                disabled={Boolean(draftActionBusy)}
                onClick={() => setDraftOpen(false)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="network-section-head">
        <h2>⌘ Second-Degree Diligence</h2>
        <span>Live Pathing</span>
      </div>
      <section className="diligence-card">
        <div className="diligence-row">
          <div className="mini-avatar">MK</div>
          <div>
            <strong>Maya Krishnan</strong>
            <span>2nd degree · Priya knows her · CFO, Northstar Capital</span>
          </div>
          <button onClick={() => setActive("profile")}>
            <ChevronRight size={15} />
          </button>
        </div>
        <p>
          Relevant overlap with Dixon's finance leadership and electronics
          operating network.
        </p>
      </section>
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

const defaultPortfolioHoldings = [
  {
    name: "Trent Limited",
    symbol: "TRENT.NS",
    samplePrice: 6890,
    sampleChangePct: -0.47,
    sector: "Retail Hypergrowth",
  },
  {
    name: "Titan Company",
    symbol: "TITAN.NS",
    samplePrice: 3912.4,
    sampleChangePct: 2.84,
    sector: "Consumer Discretionary",
  },
  {
    name: "Dixon Technologies",
    symbol: "DIXON.NS",
    samplePrice: 11842.1,
    sampleChangePct: 1.12,
    sector: "Electronics Manufacturing",
  },
  {
    name: "Uno Minda",
    symbol: "UNOMINDA.NS",
    samplePrice: 1128.65,
    sampleChangePct: -0.64,
    sector: "Auto Components",
  },
  {
    name: "Reliance Industries",
    symbol: "RELIANCE.NS",
    samplePrice: 2946.3,
    sampleChangePct: 0.83,
    sector: "Diversified",
  },
];

function loadPortfolioHoldings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("finn-portfolio-holdings") || "null",
    );
    if (Array.isArray(saved) && saved.length)
      return saved.map((holding) => {
        const currentSymbol = String(holding.symbol || "").toUpperCase();
        const exchange = currentSymbol.endsWith(".BO") ? ".BO" : ".NS";
        const ticker = canonicalTicker(currentSymbol);
        const metadata = portfolioCompanyMetadata[ticker];
        return {
          ...holding,
          name: metadata?.name || holding.name,
          symbol: `${ticker}${exchange}`,
          sector: metadata?.sector || holding.sector,
        };
      });
  } catch {}
  return defaultPortfolioHoldings;
}

function demoPriceForTicker(ticker) {
  const key = canonicalTicker(ticker);
  const hash = [...key].reduce((value, char) => value + char.charCodeAt(0), 0);
  return Math.round((700 + (hash * 83) % 5200) * 100) / 100;
}

function demoChangeForTicker(ticker) {
  const key = canonicalTicker(ticker);
  const hash = [...key].reduce((value, char) => value + char.charCodeAt(0), 0);
  return (hash % 401 - 200) / 100;
}

function DetailedPortfolio({ setActive, setSelectedTicker }) {
  const [holdings, setHoldings] = useState(loadPortfolioHoldings);
  const [newTicker, setNewTicker] = useState("");
  const [tickerSuggestions, setTickerSuggestions] = useState([]);
  const [tickerSuggestionsOpen, setTickerSuggestionsOpen] = useState(false);
  const [addHoldingError, setAddHoldingError] = useState("");
  const [page, setPage] = useState(1);
  const [quotes, setQuotes] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
  const [marketError, setMarketError] = useState("");
  const pageSize = 2;
  useEffect(() => {
    const query = newTicker.trim();
    if (!query) { setTickerSuggestions([]); return; }
    const local = bundledTickerDirectory
      .filter((row) => row.ticker.toLowerCase().includes(query.toLowerCase()) || row.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6);
    setTickerSuggestions(local);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/tickers?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          if (!Array.isArray(payload?.data)) return;
          setTickerSuggestions((current) => [...new Map([...current, ...payload.data].map((row) => [row.ticker, row])).values()].slice(0, 6));
        })
        .catch(() => {});
    }, 150);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [newTicker]);
  const refreshQuotes = async () => {
    setRefreshing(true);
    setMarketError("");
    try {
      const symbols = holdings.map((holding) => holding.symbol).join(",");
      const requestedPages = Math.max(1, Math.ceil(holdings.length / 4));
      const pages = await Promise.all(
        Array.from({ length: requestedPages }, (_, index) => index + 1).map(
          async (pageNum) => {
            const response = await fetch(
              `/api/market?page=${pageNum}&symbols=${encodeURIComponent(symbols)}`,
            );
            if (!response.ok)
              throw new Error(
                `Yahoo quote request failed (${response.status})`,
              );
            return response.json();
          },
        ),
      );
      const nextQuotes = Object.fromEntries(
        pages
          .flatMap((item) => item.data || [])
          .map((quote) => [quote.symbol, quote]),
      );
      setQuotes(nextQuotes);
      setUpdatedAt(new Date().toISOString());
      if (!Object.values(nextQuotes).some((quote) => quote.price != null))
        setMarketError(
          "Yahoo Finance did not return live quotes. Sample prices are shown.",
        );
    } catch (error) {
      setMarketError(`${error.message}. Sample prices are shown.`);
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    refreshQuotes();
  }, [holdings]);
  useEffect(() => {
    localStorage.setItem("finn-portfolio-holdings", JSON.stringify(holdings));
  }, [holdings]);
  const addHolding = (event) => {
    event.preventDefault();
    const typed = newTicker.trim();
    const exactCompany = tickerSuggestions.find((row) => row.ticker.toLowerCase() === typed.toLowerCase() || row.name.toLowerCase() === typed.toLowerCase());
    const match = exactCompany || tickerSuggestions[0];
    const rawTicker = String(match?.ticker || typed).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9.&-]{0,19}$/.test(rawTicker)) {
      setAddHoldingError(
        "Choose a company suggestion or enter its listed ticker, for example INFY.",
      );
      return;
    }
    const exchange = rawTicker.endsWith(".BO") ? ".BO" : ".NS";
    const baseTicker = canonicalTicker(rawTicker);
    const symbol = `${baseTicker}${exchange}`;
    if (holdings.some((holding) => holding.symbol === symbol)) {
      setAddHoldingError(`${symbol} is already in your portfolio.`);
      return;
    }
    const detail = companyDetails[baseTicker];
    const metadata = portfolioCompanyMetadata[baseTicker];
    const fallbackName = match?.name || baseTicker.replace(/[.-]/g, " ");
    const demoPrice = demoPriceForTicker(baseTicker);
    const demoChange = demoChangeForTicker(baseTicker);
    setHoldings((current) => [
      ...current,
      {
        name: metadata?.name || detail?.name || fallbackName,
        symbol,
        samplePrice: demoPrice,
        sampleChangePct: demoChange,
        sector: metadata?.sector || detail?.sector || "Sector not loaded",
      },
    ]);
    setPage(Math.ceil((holdings.length + 1) / pageSize));
    setNewTicker("");
    setAddHoldingError("");
  };
  const allRows = holdings.map((holding) => {
    const quote = quotes[holding.symbol];
    const live = quote?.price != null;
    return {
      ...holding,
      price: live
        ? `₹${Number(quote.price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
        : `₹${(holding.samplePrice || demoPriceForTicker(holding.symbol)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      changePct: live && quote.changePct != null ? Number(quote.changePct) : Number(holding.sampleChangePct ?? demoChangeForTicker(holding.symbol)),
      change:
        live && quote.changePct != null
          ? `${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%`
          : `Sample ${Number(holding.sampleChangePct ?? demoChangeForTicker(holding.symbol)) >= 0 ? "+" : ""}${Number(holding.sampleChangePct ?? demoChangeForTicker(holding.symbol)).toFixed(2)}%`,
      volume: live ? quote.volume : "",
      dayOpen: live ? quote.open : null,
      dayHigh: live ? quote.high : null,
      dayLow: live ? quote.low : null,
      priceSource: live ? quote.source : "Demo sample",
      asOf: live ? quote.asOf : "",
      freshness: live ? quote.freshness : "sample",
    };
  });
  const visibleRows = allRows.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.ceil(allRows.length / pageSize);
  const formatQuoteStat = (value) => value == null || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return (
    <main className="content figma-screen portfolio-detail">
      <div className="figma-notice">
        FINN · PORTFOLIO{" "}
        <span className="live-pill">● EOD · YAHOO FINANCE</span>
      </div>
      <section className="mandate-card">
        <div className="mandate-head">
          <div>
            <h2>FINN · Portfolio</h2>
            <p>Aditya Singhania Mandate · Class Alpha</p>
          </div>
          <div className="mandate-icons">
            <button
              aria-label="Refresh market data"
              title="Refresh market data"
              onClick={refreshQuotes}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            </button>
          </div>
        </div>
        <div className="export-book">
          <div>
            <span>EXPORT MANDATE BOOK</span>
            <small>
              {updatedAt
                ? `Yahoo Finance · updated ${new Date(updatedAt).toLocaleTimeString()}`
                : "Yahoo Finance · loading quotes"}
            </small>
          </div>
          <div>
            <button onClick={() => downloadPortfolioXlsx(allRows)}>
              <Download size={14} /> Excel (.xlsx)
            </button>
            <button onClick={() => downloadPortfolioCsv(allRows)}>
              <Download size={14} /> CSV (.csv)
            </button>
          </div>
        </div>
      </section>
      {marketError && (
        <p className="market-status" role="status">
          {marketError}
        </p>
      )}
      {!marketError && (
        <p className="market-status">
          {refreshing
            ? "Updating Yahoo Finance quotes…"
            : updatedAt
              ? "Yahoo Finance end-of-day prices · delayed data may apply"
              : "Loading quote data…"}
        </p>
      )}
      <section className="nav-card">
        <div className="nav-head">
          <div>
            <span>SAMPLE BOOK NAV</span>
            <strong>
              ₹420.80 <small>Cr</small>
            </strong>
          </div>
          <b className="gain-pill">↗ +₹3.42 Cr (+0.82%)</b>
        </div>
        <div className="sparkline">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="allocation">
          <span>● Retail 44%</span>
          <span>● EMS 26%</span>
          <span>● Semicon 18%</span>
          <span>● Cash 12%</span>
        </div>
      </section>
      <div className="portfolio-section-title">
        <strong>◉ My portfolio ({allRows.length})</strong>
        <span>PORTFOLIO · {allRows.length} HOLDINGS</span>
      </div>
      <form className="add-holding-form" onSubmit={addHolding}>
        <div className="portfolio-company-search-wrap">
          <input
            aria-label="Company name or ticker to add"
            placeholder="Search company name or ticker (e.g. Mahindra)"
            value={newTicker}
            autoComplete="off"
            onFocus={() => setTickerSuggestionsOpen(true)}
            onChange={(event) => { setNewTicker(event.target.value); setTickerSuggestionsOpen(true); }}
            onKeyDown={(event) => { if (event.key === "Escape") setTickerSuggestionsOpen(false); }}
          />
          {tickerSuggestionsOpen && tickerSuggestions.length > 0 && (
            <div className="portfolio-ticker-suggestions">
              {tickerSuggestions.map((row) => (
                <button key={row.ticker} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setNewTicker(row.ticker); setTickerSuggestionsOpen(false); }}>
                  <span><strong>{row.name}</strong><small>{row.sector}</small></span><b>{row.ticker}</b>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="primary" type="submit">
          <Plus size={14} /> Add
        </button>
        {addHoldingError && <p role="status">{addHoldingError}</p>}
      </form>
      <div className="holding-cards">
        {visibleRows.map((row) => (
          <button
            className="holding-card"
            key={row.symbol}
            onClick={() => {
              setSelectedTicker(row.symbol.replace(/\.NS$/, ""));
              setActive("pull");
            }}
          >
            <div className="holding-card-top">
              <div>
                <strong>{row.name}</strong>
                <span>{row.symbol}</span>
              </div>
              <div>
                <b>{row.price}</b>
                <small className={row.changePct < 0 ? "negative-text" : "green-text"}>
                  {row.changePct < 0 ? <ArrowDownRight size={13} aria-hidden="true" /> : <TrendingUp size={13} aria-hidden="true" />}{row.change}
                </small>
              </div>
            </div>
            <span className="holding-chip">{row.sector}</span>
            {row.freshness === "eod" || row.freshness === "live" ? (
              <span className="quote-detail">
                Open {formatQuoteStat(row.dayOpen)} · High {formatQuoteStat(row.dayHigh)} · Low{" "}
                {formatQuoteStat(row.dayLow)} · Volume{" "}
                {row.volume?.toLocaleString("en-IN") ?? "—"}
              </span>
            ) : (
              <span className="quote-detail">
                Demo sample price · Yahoo Finance EOD quote unavailable
              </span>
            )}
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(1)}>
          ‹
        </button>
        <span>
          {page} / {pageCount}
        </span>
        <button
          disabled={page === pageCount}
          onClick={() => setPage(Math.min(page + 1, pageCount))}
        >
          ›
        </button>
      </div>
    </main>
  );
}

function AccountPanel({ authSession, setAuthSession, phoneContacts, setPhoneContacts }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!accountAuthConfigured) {
      setMessage("Add the Supabase URL and publishable key to enable accounts.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "sign-up") {
        const result = await signUpWithEmail(email, password);
        if (result.access_token) {
          saveAccountSession(result);
          setAuthSession(result);
          setMessage("Account created and signed in.");
        } else {
          setMessage("Check your email to confirm the account, then sign in here.");
        }
      } else {
        const session = await signInWithEmail(email, password);
        saveAccountSession(session);
        setAuthSession(session);
        setMessage("Signed in. Your selected contacts will sync to this account.");
      }
      setPassword("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const signOut = async () => {
    await signOutAccount(authSession);
    setAuthSession(null);
    setMessage("Signed out. Contacts remain in this tab until it closes.");
  };
  const emailAddress = authSession?.user?.email || authSession?.email;
  return (
    <section className="profile-section account-panel">
      <div className="section-title"><span>Account &amp; contact sync</span></div>
      {authSession ? (
        <div className="account-signed-in">
          <div><strong>{emailAddress}</strong><small>{phoneContacts.length} selected contacts available in this workspace</small></div>
          <button className="secondary" type="button" onClick={signOut}>Sign out</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p>Create an account to keep contacts you choose across visits and devices. Without an account, contacts stay in this browser tab.</p>
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <div className="account-actions">
            <button className="primary" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}</button>
            <button className="text-button" type="button" onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}>{mode === "sign-up" ? "I already have an account" : "Create an account"}</button>
          </div>
        </form>
      )}
      {message && <p className="account-message" role="status">{message}</p>}
      {!accountAuthConfigured && <small className="muted">Account sync isn’t configured yet.</small>}
    </section>
  );
}

function DetailedProfile({ setActive, authSession, setAuthSession, phoneContacts, setPhoneContacts, profileName, profileInitials }) {
  return (
    <main className="content figma-screen profile-detail">
      <div className="figma-notice">PROFILE · ACCOUNT &amp; CONTACT SYNC</div>
      <AccountPanel authSession={authSession} setAuthSession={setAuthSession} phoneContacts={phoneContacts} setPhoneContacts={setPhoneContacts} />
      <div className="profile-principal">
        <div className="profile-photo">{profileInitials}</div>
        <div>
          <span className="principal-pill">
            <CircleDot size={8} /> MANAGING PRINCIPAL · ₹420.8 CR BOOK
          </span>
          <h1>{profileName}</h1>
          <h2>Senior Partner &amp; Fund Manager</h2>
          <p>♧ IIT Bombay '12 · IIM Ahmedabad '14</p>
        </div>
        <button className="icon-button" type="button" aria-label="Account settings" title="Account settings" onClick={() => document.querySelector(".account-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <Settings2 size={16} />
        </button>
      </div>
      <div className="profile-metrics">
        <div>
          <span>Active Ties</span>
          <strong>412</strong>
          <small className="green-text">↗ +14%</small>
        </div>
        <div>
          <span>Portco Overlaps</span>
          <strong>64</strong>
          <small>♧ 8 Lead</small>
        </div>
        <div>
          <span>Warm Routes</span>
          <strong className="green-text">18</strong>
          <small>Verified</small>
        </div>
      </div>
      <div className="source-heading">
        <h2>♧ Connected Intelligence Sources</h2>
        <span>5 Active</span>
      </div>
      {[
        [
          "LinkedIn Pro / Sales Navigator",
          "Connected · 1,840 Connections synced",
          "Active",
        ],
        [
          "Google Contacts / Workspace",
          "Connected · 920 Work Contacts, calendar",
          "Active",
        ],
        [
          "Apple Mail & iMessage",
          "Local Device Bridge · Extractors",
          "Private Device",
        ],
      ].map(([title, sub, status]) => (
        <button
          className="source-card"
          key={title}
          onClick={() => setActive("network")}
        >
          <span className="source-icon">□</span>
          <span>
            <strong>{title}</strong>
            <small>{sub}</small>
          </span>
          <b>{status}</b>
          <ChevronRight size={14} />
        </button>
      ))}
    </main>
  );
}

function DetailedAsk({ setActive, selectedTicker, selectedFilingContext }) {
  const selectedRecord = bundledTickerDirectory.find(
    (row) => row.ticker === canonicalTicker(selectedTicker),
  );
  const selectedCompany = companyDetails[canonicalTicker(selectedTicker)] || {
    name: selectedRecord?.name || `${canonicalTicker(selectedTicker)} Ltd`,
    sector: selectedRecord?.sector || "Company lookup",
    metrics: [],
    sources: [],
  };
  const [companyResearch, setCompanyResearch] = useState(null);
  const researchPrompt = `Research ${selectedCompany.name} using only supplied filings, annual reports, and earnings-call transcripts. Compare the latest quarter with the prior quarter (QoQ) and the same quarter last year (YoY) for Revenue, EBITDA, PBT, and PAT. Also cover business segments and revenue mix, multi-year trajectory, balance sheet and working-capital cycle, cash flow/FCF/cash conversion, management narrative versus reported numbers, explicitly stated guidance, and a concise bull case versus bear case. Mark every unavailable metric and cite only supplied primary sources.`;
  const filingPrompt = selectedFilingContext
    ? `Prepare a concise results brief for ${selectedFilingContext.company}. Use the selected exchange filing link as the source. Extract Revenue, EBITDA, PBT, and PAT, plus QoQ and YoY comparisons only when the filing supports them. Identify what is missing; do not infer figures.`
    : researchPrompt;
  const [query, setQuery] = useState(filingPrompt);
  const [status, setStatus] = useState("idle");
  const [answer, setAnswer] = useState("");
  useEffect(() => {
    let cancelled = false;
    setCompanyResearch(null);
    fetch(`/api/fundamentals?ticker=${encodeURIComponent(canonicalTicker(selectedTicker))}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (!cancelled) setCompanyResearch(payload); })
      .catch(() => { if (!cancelled) setCompanyResearch(null); });
    return () => { cancelled = true; };
  }, [selectedTicker]);
  useEffect(() => {
    setQuery(filingPrompt);
    setAnswer("");
    setStatus("idle");
  }, [selectedTicker, selectedFilingContext]);
  const submit = async () => {
    if (!query.trim()) return;
    setStatus("loading");
    try {
      if (selectedFilingContext?.sources?.[0]?.url) {
        const response = await fetch("/api/filing-brief", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: selectedFilingContext.sources[0].url,
            title: selectedFilingContext.title,
            company: selectedFilingContext.company,
            ticker: selectedFilingContext.ticker,
          }),
        });
        const responseText = await response.text();
        let data;
        try { data = JSON.parse(responseText); }
        catch {
          const detail = responseText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 260);
          throw new Error(`Filing service returned ${response.status}${detail ? `: ${detail}` : " without a readable response"}.`);
        }
        if (!response.ok) throw new Error(data.error || `Could not read the filing (HTTP ${response.status}).`);
        setAnswer(data.answer || "No brief returned.");
        setStatus("done");
        return;
      }
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          ticker: canonicalTicker(selectedTicker),
          company: {
            name: selectedCompany.name,
            sector: selectedCompany.sector,
            liveFundamentals: selectedFilingContext ? null : companyResearch,
            networkContext: people.filter((person) =>
              JSON.stringify(person).toLowerCase().includes(canonicalTicker(selectedTicker).toLowerCase()),
            ),
          },
          context: selectedFilingContext ? selectedFilingContext.sources.map((source) => ({
            title: selectedFilingContext.title,
            type: selectedFilingContext.category,
            date: selectedFilingContext.filedAt,
            company: selectedFilingContext.company,
            ticker: selectedFilingContext.ticker,
            source: source.source,
            url: source.url,
          })) : [],
          network: selectedFilingContext ? [] : [
            ...people,
            ...getStoredSampleNetworkContacts().filter((person) => {
              const searchContext = `${selectedCompany.name} ${selectedCompany.sector} ${canonicalTicker(selectedTicker)}`.toLowerCase();
              return `${person.company} ${person.sector} ${person.expertise}`.toLowerCase()
                .split(/[^a-z0-9&]+/).some((word) => word.length > 4 && searchContext.includes(word));
            }).slice(0, 12),
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "FINN unavailable");
      setAnswer(data.answer || "No answer returned.");
      setStatus("done");
    } catch (error) {
      setAnswer(error.message);
      setStatus("error");
    }
  };
  return (
    <main className="content figma-screen ask-detail">
      <div className="figma-notice">FINN · COMPANY RESEARCH</div>
      {status === "idle" && (
        <>
          <h1>
            Ask a better
            <br />
            <em>question.</em>
          </h1>
          <p className="lede">
            Start with a question. FINN brings the numbers and the supporting
            context together.
          </p>
          <section className="example-question">
            <span>{selectedFilingContext ? "SELECTED FILING · " : "YOUR QUESTION · "}{selectedFilingContext?.company?.toUpperCase() || selectedCompany.name.toUpperCase()}</span>
            <textarea
              className="ask-query-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Ask FINN a question"
            />
            <p>
              FINN will answer using this company’s available context and
              identify missing evidence.
            </p>
            {selectedFilingContext?.sources?.[0]?.url && (
              <a className="ask-filing-source" href={selectedFilingContext.sources[0].url} target="_blank" rel="noreferrer">
                Open selected {selectedFilingContext.sources[0].source || "exchange"} filing
              </a>
            )}
          </section>
          <button className="primary ask-cta" disabled={status === "loading"} aria-busy={status === "loading"} onClick={submit}>
            {status === "loading" ? "Researching…" : "Ask FINN"} <ArrowUpRight size={16} />
          </button>
          <section className="context-card">
            <h3>A clearer view, with context</h3>
            <p>
              Compare guidance with results
              <br />
              Check cash conversion and leverage
              <br />
              Trace an answer back to its sources
            </p>
          </section>
        </>
      )}
      {status === "loading" && (
        <>
          <h1>
            Reading the evidence<span className="ellipsis">…</span>
          </h1>
          <p className="lede">
            FINN is checking the available research service. A backup is tried automatically if the first one times out.
          </p>
          <section className="researching-card">
            <h3>Comparing guidance and results</h3>
            <p>
              01&nbsp;&nbsp;Reading management commentary
              <br />
              02&nbsp;&nbsp;Reviewing reported results
              <br />
              03&nbsp;&nbsp;Summarizing the differences
            </p>
            <div className="progress-line">
              <i />
            </div>
          </section>
          <button
            className="secondary cancel-button"
            onClick={() => setStatus("idle")}
          >
            <Pause size={14} /> Cancel
          </button>
        </>
      )}
      {status === "done" && (
        <>
          <h1>
            Promises vs.
            <br />
            <em>delivery.</em>
          </h1>
          <p className="lede">{selectedCompany.name} · company research</p>
          <section className="example-question">
            <span>EXAMPLE QUESTION</span>
            <strong>{query}</strong>
          </section>
          <section className="answer-detail">
            <div className="markdown-content answer-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answer}
              </ReactMarkdown>
            </div>
          </section>
          <div className="answer-source-row">
            <span>
              <FileText size={14} /> Primary sources
            </span>
            <button onClick={() => setActive("export")}>
              <ExternalLink size={14} /> Export preview
            </button>
          </div>
        </>
      )}
      {status === "error" && (
        <section className="answer-detail">
          <h2>FINN is unavailable.</h2>
          <p>{answer}</p>
          <button className="primary" onClick={submit}>
            Retry <RefreshCw size={14} />
          </button>
        </section>
      )}
    </main>
  );
}

function ExportPreview({ setActive }) {
  const rows = [
    {
      name: "Trent Limited",
      symbol: "TRENT.NS",
      price: "₹6,890.00",
      change: "+1.8%",
      sector: "Retail Hypergrowth",
    },
    {
      name: "Titan Company",
      symbol: "TITAN.NS",
      price: "₹3,912.40",
      change: "+2.84%",
      sector: "Consumer Discretionary",
    },
  ];
  return (
    <main className="content figma-screen export-detail">
      <div className="figma-notice">EXPORT PREVIEW · SAMPLE DATA</div>
      <h1>
        Review your
        <br />
        <em>export.</em>
      </h1>
      <p className="lede">
        A clear handoff from your research to a portable report.
      </p>
      <section className="export-preview-card">
        <h2>Portfolio book</h2>
        <p>FINN-portfolio.xlsx</p>
        <span>Excel workbook · XLSX</span>
        <small>
          The selected report uses the sample figures shown in this preview.
        </small>
      </section>
      <section className="export-note-card">
        <h3>Download the sample portfolio</h3>
        <p>
          Choose a format. Your browser will download a file to your device.
        </p>
        <div className="share-actions">
          <button
            className="secondary"
            onClick={() => downloadPortfolioCsv(rows)}
          >
            <Download size={14} /> Download CSV
          </button>
          <button
            className="primary"
            onClick={() => downloadPortfolioXlsx(rows)}
          >
            <Download size={14} /> Download Excel
          </button>
        </div>
      </section>
      <button
        className="primary back-button"
        onClick={() => setActive("portfolio")}
      >
        Back to where I was
      </button>
    </main>
  );
}

function LaunchSplash({ onComplete, dark = false }) {
  return (
    <main className={`launch-splash ${dark ? "dark" : "light"}`} aria-label="FINN is loading">
      <div className="launch-statusbar"><span>9:41</span><span>•••　 Wi-Fi　▰</span></div>
      <div className="launch-center">
        <div className="launch-mark"><img src="/assets/finn-logo.svg" alt="" /></div>
        <h1>FINN</h1>
        <p>INVESTMENT AGENT</p>
        <div className="launch-connection"><i /> Direct Market Link <span>•</span> NSE filings</div>
      </div>
      <div className="launch-footer">
        <div className="launch-progress"><span /></div>
        <div><span>Routing encrypted mandates…</span><b>96%</b></div>
        <button onClick={onComplete}>Skip initialization <ArrowUpRight size={12} /></button>
      </div>
    </main>
  );
}

function App() {
  const [active, setActive] = useState("push");
  const [selectedTicker, setSelectedTicker] = useState("TRENT");
  const [selectedFilingContext, setSelectedFilingContext] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem("finn-theme") === "dark");
  const [phoneContacts, setPhoneContacts] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("finn-phone-contacts") || "[]"); }
    catch { return []; }
  });
  const [authSession, setAuthSession] = useState(() => readAccountSession());
  const profileName = authSession?.user?.user_metadata?.full_name || authSession?.user?.user_metadata?.name || "Aditya Singhania";
  const profileInitials = profileName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AS";
  const [remoteTickerDirectory, setRemoteTickerDirectory] = useState([]);
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    localStorage.setItem("finn-theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#090a0d" : "#f6f7fa");
  }, [dark]);
  useEffect(() => {
    sessionStorage.setItem("finn-phone-contacts", JSON.stringify(phoneContacts));
  }, [phoneContacts]);
  useEffect(() => {
    const userId = authSession?.user?.id;
    if (!userId) return;
    let cancelled = false;
    refreshAccountSession(authSession)
      .then(async (session) => {
        if (!session) throw new Error("Session expired");
        if (cancelled) return;
        saveAccountSession(session);
        setAuthSession(session);
        const savedContacts = await loadAccountContacts(session);
        if (cancelled) return;
        setPhoneContacts((current) => [...new Map(
          [...savedContacts, ...current].map((person) => [`${person.name}-${person.tel}-${person.email}`, person]),
        ).values()]);
      })
      .catch(() => {
        if (!cancelled) {
          saveAccountSession(null);
          setAuthSession(null);
        }
      });
    return () => { cancelled = true; };
  }, [authSession?.user?.id]);
  useEffect(() => {
    if (authSession?.access_token && phoneContacts.length)
      syncAccountContacts(authSession, phoneContacts).catch(() => {});
  }, [authSession?.access_token, phoneContacts]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/tickers")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.data))
          setRemoteTickerDirectory(payload.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) window.setTimeout(() => setBooting(false), 950);
      });
    const fallback = window.setTimeout(() => setBooting(false), 1300);
    return () => { cancelled = true; window.clearTimeout(fallback); };
  }, []);
  if (booting) return <LaunchSplash dark={dark} onComplete={() => setBooting(false)} />;
  const view =
    active === "push" ? (
      <DetailedPush
        setActive={setActive}
        setSelectedTicker={setSelectedTicker}
        setSelectedFilingContext={setSelectedFilingContext}
        phoneContacts={phoneContacts}
      />
    ) : active === "pull" ? (
      <DetailedPull
        setActive={setActive}
        selectedTicker={selectedTicker}
        setSelectedTicker={setSelectedTicker}
        setSelectedFilingContext={setSelectedFilingContext}
        phoneContacts={phoneContacts}
        remoteTickerDirectory={remoteTickerDirectory}
      />
    ) : active === "network" ? (
      <DetailedNetwork
        setActive={setActive}
        phoneContacts={phoneContacts}
        setPhoneContacts={setPhoneContacts}
        authSession={authSession}
      />
    ) : active === "portfolio" ? (
      <DetailedPortfolio
        setActive={setActive}
        setSelectedTicker={setSelectedTicker}
      />
    ) : active === "profile" ? (
      <DetailedProfile
        setActive={setActive}
        authSession={authSession}
        setAuthSession={setAuthSession}
        phoneContacts={phoneContacts}
        setPhoneContacts={setPhoneContacts}
        profileName={profileName}
        profileInitials={profileInitials}
      />
    ) : active === "export" ? (
      <ExportPreview setActive={setActive} />
    ) : (
      <DetailedAsk setActive={setActive} selectedTicker={selectedTicker} selectedFilingContext={selectedFilingContext} />
    );
  return (
    <div className={dark ? "app dark" : "app light"}>
      <div className="shell">
        <Header
          active={active === "ask-answer" ? "ask" : active}
          dark={dark}
          setDark={setDark}
          setActive={setActive}
          profileInitials={profileInitials}
        />
        {view}
      </div>
      <BottomNav
        active={active === "ask-answer" ? "ask" : active}
        setActive={setActive}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
