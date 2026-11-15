# FINN terminal

Mobile-first React/Vite prototype for the FINN investment intelligence challenge.

## How to brief someone about FINN

FINN is a mobile-first investment intelligence terminal for public-markets investors. It combines three workflows in one responsive web app:

- **Push** surfaces portfolio-relevant exchange filings, price/volume anomalies, and configurable alerts.
- **Pull** researches a company using fundamentals, filings, cash-flow context, and AI-assisted analysis.
- **Network** identifies relevant people and relationship context for the next conversation.

The key architecture is a React/Vite client backed by Vercel serverless APIs. NSE and BSE provide primary filings and announcements, Yahoo Finance provides end-of-day market data, Screener provides prototype fundamentals, Supabase is optional for persistence and authentication, and Hyde is the primary LLM with Gemini fallback. AI keys remain server-side, filing links are validated against exchange domains, and synthetic network data is clearly labelled.

The Push workflow also supports an article/filing brief flow. A user can select an NSE or BSE announcement, open its primary source, and request a concise AI brief. The server validates that the link belongs to an official exchange-owned domain, follows only validated redirects, downloads the filing PDF within a fixed size limit, extracts the document text, and sends only that extracted text to the selected AI provider. The resulting brief can cover Revenue, EBITDA, PBT, PAT, standalone versus consolidated results, QoQ and YoY comparisons, reporting periods, units, management guidance, and a short evidence-based interpretation. The brief preserves the official source link and clearly says when a metric or comparison is not present in the filing.

This is separate from the general company-research flow: the filing brief is grounded in one selected primary exchange document, while company research combines selected fundamentals, relevant filings, and explicitly marked network context. The app also distinguishes exchange announcements from market data: Yahoo Finance is used for EOD price/volume signals, not as the source of corporate filings.

For the full architecture, security decisions, data pipelines, AI boundaries, prototype tradeoffs, and next steps, read [architecture.md](architecture.md). The standalone diagram is in [architecture-diagram.md](architecture-diagram.md).

## Product design

The detailed product design is available in [Figma](https://www.figma.com/design/fYqIquheHOla9eO2nF6oS7/ENAM?node-id=0-1\&m=dev). It includes the Android and iOS reference designs, light and dark themes, responsive states, and interaction animations that informed the web implementation.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser. Do not double-click `index.html`; browsers block Vite's module loader for `file://` pages. On macOS, you can also double-click `open-finn.command`.

For a production-style local preview:

```bash
npm run build
npm run preview
```

The API functions are designed for Vercel. Vite serves the client locally; external API-backed features require the relevant environment variables and a deployment/runtime that serves the `api/` functions.

The UI works without credentials in demo mode. Copy `.env.example` to `.env` and add `HYDE_API_KEY` and/or `GEMINI_API_KEY` to enable the `/api/ask` adapter. Provider keys stay server-side.

### Environment variables

Create a local `.env` file from `.env.example` when you want live integrations. Never commit it.

```text
HYDE_API_KEY=...
HYDE_MODEL=hyde/glm-5.3-flash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Hyde is tried first and Gemini is used as a fallback. Supabase is optional; without it, bundled ticker data, local browser storage, and demo contacts keep the prototype usable.

The Push screen requests `/api/announcements?from=YYYY-MM-DD&to=YYYY-MM-DD`. It tries NSE's date-filtered corporate-announcements JSON route and BSE's paginated `AnnSubCategoryGetData` endpoint, then falls back to each exchange's latest-items RSS feed if the dated route fails. Results are cached for 60 seconds per server instance, categorized, and grouped into company cards with filing links. BSE pagination is capped at eight pages by default (set `BSE_ANNOUNCEMENTS_MAX_PAGES` to adjust, maximum 20); the UI identifies partial results. These exchange JSON routes are undocumented and can change or deny server requests. RSS fallback results are only a latest-items snapshot and are not represented as complete date archives. Unclassified notices stay labeled so their source links are not silently discarded.

Portfolio holdings can be added by exchange ticker and are saved in this browser's local storage. The portfolio-only Push filter matches by normalized company name and, when available, ticker. Contact suggestions are illustrative demo profiles, not verified people. No npm package is needed for the RSS feeds or portfolio additions.

Pull requests `/api/fundamentals?ticker=SYMBOL` on demand, parses Screener's public consolidated page into market snapshot fields and P&L, balance-sheet, and cash-flow tables, and caches each symbol for 15 minutes. This is intended for the user's single-user demo only. The page structure can change or access can be rate-limited; no login or access-control bypass is attempted. Before a public or commercial launch, replace this adapter with a licensed feed or obtain the required permission.

## Deploy on Vercel

1. Push this folder to GitHub.
2. Import the repository in Vercel. Vercel detects Vite automatically.
3. Add `HYDE_API_KEY`, optionally `GEMINI_API_KEY`, and any exchange endpoint overrides under Project Settings → Environment Variables.
4. Deploy. The static app serves from Vite and `/api/market`, `/api/announcements`, `/api/fundamentals` + `/api/ask` run as Vercel Functions.

After deployment, verify these flows from a phone:

1. Open Push and confirm the responsive shell and filing feed.
2. Open Portfolio, add a ticker, refresh quotes, and test pagination.
3. Open Pull, select a company, and run a research request.
4. Open a filing and try Results brief if an AI key is configured.
5. Open Network and test sample contacts, `.vcf` import, and permissioned contact selection.
6. Open Profile and confirm that account features are either configured or clearly marked unavailable.

## Useful checks

```bash
npm run build
git diff --check
node --check api/announcements.js
node --check api/ask.js
node --check api/filing-brief.js
node --check api/fundamentals.js
node --check api/market.js
```

The build is the main validation command for the client. The `node --check` commands validate the server functions without making provider requests.

## Current product boundary

Push, Pull, Network and Portfolio combine live exchange/quote sources with clearly labeled demo data. Yahoo Finance is wired through a paginated server adapter. Hyde is the primary LLM provider and Gemini is the fallback. LinkedIn profiles and company-contact suggestions are synthetic by design. On supported Android browsers, the Network page can open the system Contact Picker after the user selects the button; elsewhere, users can import a vCard (.vcf). Only chosen/imported contacts are read into the current page session; there is no background address-book sync, SMS access, or automatic upload.
