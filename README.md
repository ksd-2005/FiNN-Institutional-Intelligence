# FINN terminal

Mobile-first React/Vite prototype for the FINN investment intelligence challenge.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser. Do not double-click `index.html`; browsers block Vite's module loader for `file://` pages. On macOS, you can also double-click `open-finn.command`.

The UI works without credentials in demo mode. Copy `.env.example` to `.env` and add `HYDE_API_KEY` and/or `GEMINI_API_KEY` to enable the `/api/ask` adapter. Provider keys stay server-side.

The Push screen requests `/api/announcements?from=YYYY-MM-DD&to=YYYY-MM-DD`. It tries NSE's date-filtered corporate-announcements JSON route and BSE's paginated `AnnSubCategoryGetData` endpoint, then falls back to each exchange's latest-items RSS feed if the dated route fails. Results are cached for 60 seconds per server instance, categorized, and grouped into company cards with filing links. BSE pagination is capped at eight pages by default (set `BSE_ANNOUNCEMENTS_MAX_PAGES` to adjust, maximum 20); the UI identifies partial results. These exchange JSON routes are undocumented and can change or deny server requests. RSS fallback results are only a latest-items snapshot and are not represented as complete date archives. Unclassified notices stay labeled so their source links are not silently discarded.

Portfolio holdings can be added by exchange ticker and are saved in this browser's local storage. The portfolio-only Push filter matches by normalized company name and, when available, ticker. Contact suggestions are illustrative demo profiles, not verified people. No npm package is needed for the RSS feeds or portfolio additions.

Pull requests `/api/fundamentals?ticker=SYMBOL` on demand, parses Screener's public consolidated page into market snapshot fields and P&L, balance-sheet, and cash-flow tables, and caches each symbol for 15 minutes. This is intended for the user's single-user demo only. The page structure can change or access can be rate-limited; no login or access-control bypass is attempted. Before a public or commercial launch, replace this adapter with a licensed feed or obtain the required permission.

## Deploy on Vercel

1. Push this folder to GitHub.
2. Import the repository in Vercel. Vercel detects Vite automatically.
3. Add `HYDE_API_KEY`, optionally `GEMINI_API_KEY`, and any exchange endpoint overrides under Project Settings → Environment Variables.
4. Deploy. The static app serves from Vite and `/api/market`, `/api/announcements`, `/api/fundamentals` + `/api/ask` run as Vercel Functions.

## Current product boundary

Push, Pull, Network and Portfolio combine live exchange/quote sources with clearly labeled demo data. Yahoo Finance is wired through a paginated server adapter. Hyde is the primary LLM provider and Gemini is the fallback. LinkedIn profiles and company-contact suggestions are synthetic by design. On supported Android browsers, the Network page can open the system Contact Picker after the user selects the button; elsewhere, users can import a vCard (.vcf). Only chosen/imported contacts are read into the current page session; there is no background address-book sync, SMS access, or automatic upload.
