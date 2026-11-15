# FINN Architecture Diagram

This is the standalone architecture diagram for the FINN mobile-first investment intelligence prototype.

```mermaid
flowchart LR
    user["Investor on phone or desktop"] --> client["React + Vite client<br/>responsive FINN shell"]

    subgraph product["FINN product experience"]
        push["Push<br/>portfolio signals and alerts"]
        pull["Pull<br/>company research"]
        network["Network<br/>people and relationship context"]
        portfolio["Portfolio<br/>holdings and exports"]
        profile["Profile<br/>account and privacy controls"]
    end

    client --> push
    client --> pull
    client --> network
    client --> portfolio
    client --> profile

    push --> apiAnnouncements["/api/announcements<br/>NSE/BSE adapters"]
    push --> apiMarket["/api/market<br/>quote adapter and alert inputs"]
    pull --> apiFundamentals["/api/fundamentals<br/>financial-data adapter"]
    pull --> apiAsk["/api/ask<br/>grounded research assistant"]
    pull --> apiFiling["/api/filing-brief<br/>PDF extraction and briefing"]
    portfolio --> apiMarket
    portfolio --> apiTickers["/api/tickers<br/>ticker search"]
    network --> apiContacts["/api/sample-contacts<br/>synthetic demo directory"]

    apiAnnouncements --> nse["NSE<br/>RSS and corporate filings"]
    apiAnnouncements --> bse["BSE<br/>RSS and announcements API"]
    apiMarket --> yahoo["Yahoo Finance<br/>EOD chart data"]
    apiFundamentals --> screener["Screener.in<br/>public fundamentals page"]
    apiFiling --> exchangePdf["NSE/BSE<br/>official filing PDF"]

    apiAsk --> hyde["Hyde<br/>primary LLM"]
    apiAsk --> gemini["Gemini<br/>fallback LLM"]
    apiFiling --> hyde
    apiFiling --> gemini

    apiAnnouncements --> cache["In-memory cache<br/>optional Supabase cache"]
    apiFundamentals --> fundamentalsCache["15-minute server cache"]
    apiFiling --> filingCache["15-minute PDF-text cache"]
    apiTickers --> directory["Bundled ticker directory<br/>or Supabase companies"]

    network --> browserContacts["Permissioned Contact Picker<br/>or .vcf import"]
    profile --> supabaseAuth["Supabase Auth<br/>optional email auth"]
    browserContacts --> supabaseData["Supabase user_contacts<br/>RLS-protected"]
    supabaseAuth --> supabaseData

    client --> localState["Browser storage<br/>portfolio, theme, alert rules, seen alerts"]
```

## Reading the diagram

- The client owns presentation, user interaction, local preferences, and safe contact-selection flows.
- Vercel server functions normalize external data and keep provider credentials private.
- NSE and BSE are the primary source for filings.
- Yahoo Finance provides end-of-day market quotes and volume inputs.
- Hyde is the primary LLM; Gemini is the fallback.
- Supabase is optional for search, caching, authentication, and user-owned contacts.
- The application labels synthetic or fallback data instead of presenting it as verified live data.

