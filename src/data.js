export const companyDetails = {
  TRENT: {
    name: "Trent Ltd",
    sector: "Retail · Westside and Zudio",
    exchange: "NSE · TRENT",
    snapshot:
      "A high-growth Indian retail platform spanning Westside, Zudio and adjacent fashion formats.",
    trajectory:
      "Store additions and format productivity are the primary growth levers; same-store sales growth is shown at +19.4% in this connected preview.",
    cash: "Track store-rollout capex, lease-adjusted operating cash conversion and inventory intensity as the footprint expands.",
    guidance:
      "Q3 management guidance called for 45–50 store openings and an 11.0% EBITDA margin; the connected preview records 48 openings and a 10.6% actual margin.",
    metrics: [
      ["Revenue", "₹4,201 cr", "+39.2% YoY"],
      ["EBITDA", "₹428 cr", "+36.4% YoY"],
      ["PAT", "₹250 cr", "+34.1% YoY"],
    ],
    sources: ["Q3 FY27 results", "FY26 annual report", "Q3 concall transcript"],
  },
  DIXON: {
    name: "Dixon Technologies",
    sector: "Electronics manufacturing",
    exchange: "NSE · DIXON",
    snapshot:
      "India-focused electronics manufacturing across mobile, consumer, lighting and strategic design services.",
    trajectory:
      "Revenue +23% 3Y CAGR; mobile and EMS remain the core growth engines.",
    cash: "Watch working capital: inventory and receivables are the key cash-conversion swing factors.",
    guidance:
      "Management is targeting an 18–20% margin range as mix shifts toward higher-value programs.",
    metrics: [
      ["Revenue", "₹1,253 cr", "+16.2% YoY"],
      ["EBITDA", "₹78 cr", "+9.1% YoY"],
      ["PAT", "₹44 cr", "+4.8% YoY"],
    ],
    sources: [
      "Q2 FY27 results",
      "FY26 annual report",
      "Q1 FY27 concall transcript",
    ],
  },
  TITAN: {
    name: "Titan Company",
    sector: "Consumer discretionary",
    exchange: "NSE · TITAN",
    snapshot:
      "Consumer platform spanning jewellery, watches, eyewear and emerging lifestyle categories.",
    trajectory:
      "Jewellery growth is the primary earnings driver; store additions and premiumisation support the next leg.",
    cash: "Cash quality is supported by operating cash generation; inventory turns and gold working capital remain important.",
    guidance:
      "Management continues to emphasise calibrated store growth, premium mix and disciplined capital allocation.",
    metrics: [
      ["Revenue", "₹13,112 cr", "+21.4% YoY"],
      ["EBITDA", "₹1,265 cr", "+18.7% YoY"],
      ["PAT", "₹916 cr", "+17.2% YoY"],
    ],
    sources: [
      "Titan exchange filing",
      "FY26 annual report",
      "Q2 FY27 concall transcript",
    ],
  },
  RELIANCE: {
    name: "Reliance Industries",
    sector: "Diversified · energy, retail and digital",
    exchange: "NSE · RELIANCE",
    snapshot:
      "Diversified Indian platform with energy, consumer retail, digital services and new-energy investments.",
    trajectory:
      "Retail and digital services are the structural growth legs while energy remains cyclical and cash generative.",
    cash: "Cash conversion is diversified; capex intensity and new-energy funding are the main balance-sheet watchpoints.",
    guidance:
      "Management has outlined continued investment in consumer platforms and new-energy capacity.",
    metrics: [
      ["Revenue", "₹2.48L cr", "+11.0% YoY"],
      ["EBITDA", "₹49,100 cr", "+4.2% YoY"],
      ["PAT", "₹18,540 cr", "+7.6% YoY"],
    ],
    sources: [
      "Quarterly results filing",
      "FY26 annual report",
      "Investor presentation",
    ],
  },
  UNOMINDA: {
    name: "Uno Minda",
    sector: "Auto components",
    exchange: "NSE · UNOMINDA",
    snapshot:
      "Automotive supplier focused on switches, lighting, acoustics, castings and electronic systems.",
    trajectory:
      "Content-per-vehicle and premium product mix are driving growth faster than the underlying auto cycle.",
    cash: "Capex is elevated as new programs ramp; monitor free cash flow and working-capital absorption.",
    guidance:
      "Management expects new capacity and nominated programs to expand the addressable content per vehicle.",
    metrics: [
      ["Revenue", "₹4,101 cr", "+18.1% YoY"],
      ["EBITDA", "₹498 cr", "+20.4% YoY"],
      ["PAT", "₹247 cr", "+22.8% YoY"],
    ],
    sources: [
      "Capex announcement",
      "FY26 annual report",
      "Q2 FY27 concall transcript",
    ],
  },
};

export const askContext = Object.values(companyDetails).map((company) => ({
  ticker: company.exchange.split("·")[1]?.trim(),
  company: company.name,
  primarySources: company.sources,
  facts: [
    company.snapshot,
    company.trajectory,
    company.cash,
    company.guidance,
    ...company.metrics.map((metric) => metric.join(" ")),
  ],
}));
