# FINN implementation design

This is the working implementation contract for FINN. It translates the Figma screens and the challenge brief into product, data, and AI behavior.

## Product promise

FINN is a private, mobile-first investment intelligence terminal with three woven modes:

1. **Push** tells the investor what changed across the portfolio and why it matters.
2. **Pull** answers an on-demand company or sector question using primary sources.
3. **Network** identifies the best person in the investor's own network to add context.

The Network must appear inside Push and Pull whenever a relationship is relevant, and it must also be directly queryable.

## Figma screen map

The Figma file contains separate iPhone and Android references for the same responsive product shell. The web implementation uses one semantic layout with fluid widths and runtime safe areas rather than device-specific hardcoded offsets.

### Shared shell

- Dark and light themes with the same information hierarchy and readable contrast.
- FINN mark and section title in a frosted top header.
- Push, Pull, Network and Portfolio in persistent bottom navigation.
- Ask FINN opens from research/insight actions and keeps the same shell.
- Content uses a compact reading column on large screens and expands to the viewport on phones.
- Browser/system status bars and camera cutouts are not drawn as app content.
- Bottom content remains reachable above safe areas and keyboards.

### Push

- Time horizon control: 24H, 3D, 7D, 30D.
- Prioritised digest count and freshness indicator.
- Management-change dossier: incoming executive, professional background, and warm relationship match.
- Results card: Revenue, EBITDA, PBT and PAT with QoQ/YoY context.
- Anomaly card: unusual EOD price/volume movement and a catalyst explainer.
- Actions: open primary filing, view dossier, ask a connection, and deep research.

### Pull

- Search by any NSE/BSE ticker, not just the demo companies.
- Business snapshot, financial snapshot, trajectory, balance sheet, cash quality, narrative vs numbers, guidance, and bull/bear framing.
- Source strip with annual report, quarterly results and concall transcript.
- Research states: idle, researching, answer, unavailable, stale source, and retry.
- Network context for relevant operators and second-degree connections.

### Network

- For you: best next call and the reason it is useful now.
- People: searchable profiles and relationship strength.
- Expertise map: sector/theme coverage across the network.
- Contact dossier: role history, company overlap, education/employer overlap, last touch, and suggested outreach context.
- Synthetic LinkedIn data must be labelled as demo data until consented data sources exist.

### Portfolio

- Holdings view with exchange symbol, sector, price, daily move, volume/freshness and relevant signal.
- Paginated server data; do not fetch all symbols in one client request.
- Live, stale, unavailable-symbol, rate-limit and retry states.

### Profile / settings

- Theme, data freshness, notification thresholds, connected accounts, network privacy and export controls.
- This screen exists in the Figma page and is the next implementation slice to wire fully.

## Source and data contracts

### Market data

`/api/market?page=1&pageSize=4` returns normalized quote objects:

```json
{
  "page": 1,
  "pageSize": 4,
  "total": 18,
  "data": [
    {
      "symbol": "TITAN.NS",
      "exchange": "NSE",
      "currency": "INR",
      "price": 3912.4,
      "changePct": 2.84,
      "asOf": "2026-11-12T09:38:00+05:30",
      "source": "Yahoo Finance",
      "freshness": "live"
    }
  ]
}
```

Yahoo Finance is an EOD/quote provider, not a filings provider. Exchange announcements and primary documents need separate adapters and storage.

### Company research context

Each company context is normalized before it reaches the model:

- ticker, company name, sector and exchange;
- business snapshot and segment/revenue mix;
- latest Revenue, EBITDA, PBT and PAT;
- QoQ and YoY comparisons;
- multi-year trajectory;
- debt/leverage and working-capital observations;
- operating cash flow, FCF and cash-conversion observations;
- management guidance with the reporting period;
- narrative-vs-numbers observations;
- bull case, bear case and open diligence questions;
- primary-source IDs, URLs, periods and timestamps.

Pull prompts receive only the selected company's annual reports, results filings and concall transcripts, plus explicitly marked market data. Network profiles are a separate enrichment layer and cannot silently become financial evidence.

### Network context

Network context contains synthetic demo people now and will later be consented/imported data. Each match includes why it matched: former employer, current employer, education, shared contact, sector expertise or second-degree path. The model receives only the minimum relevant profile fields.

## AI routing and behavior

`/api/ask` is the only browser-facing AI endpoint. Provider keys never go into the client.

1. Classify the question: company research, market signal, network lookup, or navigation.
2. Resolve the ticker/company and retrieve relevant primary-source chunks.
3. Add relevant network matches only when the question asks who to call or a filing has a people overlap.
4. Call Hyde through its OpenAI-compatible gateway using `hyde/glm-5.3-flash` by default.
5. Fall back to Gemini Flash when Hyde is missing/unavailable.
6. Return answer text, provider, source IDs, timestamps, uncertainty and retryable error state.

The model must not invent financial facts, treat synthetic profiles as real, or use broker/news commentary for Pull analysis. Every answer should distinguish source fact, model inference and unknown.

## Push prioritisation

Push ranking should combine materiality, portfolio relevance, unusual price/volume, freshness, event type and network relevance. Initial event categories follow the challenge reference: results, M&A, fund raise, management change, litigation, insider trading, earnings call, investor meetings, credit rating, dividend, bonus/split, capex, press release, postal ballot, AGM/EGM, pledging and unclassified.

## Integrations and privacy

- LinkedIn: synthetic data for this prototype; real deployment requires legitimate access, consent and platform terms compliance.
- WhatsApp: mobile deep links/share flows only; no web API for reading a user's private WhatsApp network.
- Gmail: explicit Google OAuth with least-privilege scopes and server-side refresh-token storage.
- Telegram: bot connection with explicit user action and chat authorization.
- Contacts/SMS: browsers cannot silently read device contacts or SMS; use a permissioned native wrapper or manual import.
- Network data is tenant-scoped, encrypted at rest, auditable, deletable and retained only as long as the investor chooses.

## Deployment

- Vite React client deployed on Vercel.
- `/api/*` deployed as Vercel Functions.
- Environment variables: `HYDE_API_KEY`, `HYDE_MODEL`, `GEMINI_API_KEY`, market-provider settings and later database credentials.
- Persistent production data should use managed Postgres/pgvector; the current prototype keeps demo context in source files.

## Prototype limits

This slice proves the interaction model and AI/data boundaries. It still needs the full filing ingestion pipeline, document chunking/indexing, real authentication, consented network import, profile/settings screen, and production-grade caching/rate limiting before it is a live investment product.
