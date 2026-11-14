# FINN — Build Plan

> **FINN** = Financial Investment Network Navigator
> **ENAM** Build Challenge · Founding AI Engineer · Deadline: 15 Nov 2026

---

## 1. What We're Building

A **mobile-first responsive web app** (works on phone browsers + desktop) that serves as an AI-powered investment intelligence layer. The app called **FINN** has three core modes:

| Mode        | Description                                                           |
| ----------- | --------------------------------------------------------------------- |
| **Push**    | Proactive alerts — what changed in my portfolio and why I should care |
| **Pull**    | On-demand research — deep analysis of any NSE/BSE company             |
| **Network** | Intelligence layer — who in my network can help me understand this    |

Plus: **Ask FINN** — a conversational AI interface that ties all three together.

---

## 2. Screens (from Figma Design)

The Figma design has **12 unique screens** (dark + light themes, iOS + Android variants):

| #   | Screen                | Route               | Description                                             |
| --- | --------------------- | ------------------- | ------------------------------------------------------- |
| 1   | **Launch**            | `/`                 | Splash screen with FINN logo animation                  |
| 2   | **Sign In**           | `/login`            | OTP-based auth (phone + 6-digit code) or passkey        |
| 3   | **Push Intelligence** | `/push`             | Main feed — intelligence cards, alerts, market overview |
| 4   | **Pull Research**     | `/research`         | Company deep-dive with financial analysis               |
| 5   | **Network**           | `/network`          | Investor's network graph + contacts intelligence        |
| 6   | **Portfolio**         | `/portfolio`        | Watchlist with live prices, gainers/losers              |
| 7   | **Profile**           | `/profile`          | User settings, sharing, notification prefs              |
| 8   | **Trent Dossier**     | `/research/:ticker` | Individual company dossier (deep research)              |
| 9   | **Ask FINN**          | `/ask`              | AI chat interface — type or voice                       |
| 10  | **Researching**       | `/ask` (state)      | Loading state while AI researches                       |
| 11  | **AI Answer**         | `/ask` (state)      | AI's structured response with citations                 |
| 12  | **Export Preview**    | `/export`           | Share/export research as formatted report               |

**Bottom navigation**: Home (Push) · Feed · Network · Portfolio

---

## 3. Tech Stack

### Frontend

- **Next.js 14** (React) with App Router — SSR + client components
- **Tailwind CSS** — dark/light theme system matching Figma
- **Framer Motion** — animations and transitions
- **Recharts** — financial charts and sparklines
- **React Query (TanStack)** — data fetching + caching + pagination
- **next-pwa** — installable PWA for mobile

### Backend (API Routes inside Next.js)

- **Next.js API Routes** (`/api/*`) — all backend logic
- **Prisma** + **SQLite** (dev) → PostgreSQL (prod) — database
- **Yahoo Finance API** (`yahoo-finance2` npm) — live stock data with pagination
- **Hyde Inference API** — primary LLM (for intelligent analysis)
- **Google Gemini API** — fallback LLM (free tier)

### Why Next.js over Django?

- Single deployment (frontend + API) → simpler Vercel hosting
- React is already on your laptop
- SSR gives SEO + fast mobile loads
- API routes handle all backend needs
- Vercel deployment is 1 command

---

## 4. Data Architecture

```
┌─────────────────────────────────────────────────┐
│                    FINN App                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Push     │  │  Pull    │  │  Network     │   │
│  │  Feed     │  │  Research│  │  Intelligence│   │
│  └─────┬────┘  └────┬─────┘  └──────┬───────┘   │
│        │            │                │            │
│  ┌─────┴────────────┴────────────────┴─────────┐ │
│  │          Next.js API Routes                  │ │
│  │  /api/stocks    /api/research   /api/network │ │
│  │  /api/alerts    /api/ask        /api/share   │ │
│  └──────┬──────────┬──────────────┬────────────┘ │
└─────────┼──────────┼──────────────┼──────────────┘
          │          │              │
   ┌──────┴───┐ ┌───┴────┐  ┌─────┴────────┐
   │ Yahoo    │ │ Hyde   │  │ SQLite/      │
   │ Finance  │ │ API    │  │ Prisma DB    │
   │ (stocks) │ │ +Gemini│  │ (network,    │
   └──────────┘ │(fallbk)│  │  portfolio,  │
                └────────┘  │  alerts)     │
                            └──────────────┘
```

### Data Sources

| Source                 | What                                                      | How                                                         |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| **Yahoo Finance**      | Live stock prices, volume, historical data                | `yahoo-finance2` npm package. Paginated: 20 stocks per page |
| **Hyde Inference API** | AI analysis, filing summaries, narrative analysis         | Primary LLM. `.env` → `HYDE_API_KEY`                        |
| **Google Gemini API**  | Fallback LLM when Hyde is down/rate-limited               | Free tier. `.env` → `GEMINI_API_KEY`                        |
| **Mock Network Data**  | Investor contacts, relationships, LinkedIn-style profiles | JSON seed data in `/data/`                                  |
| **Mock Filings**       | Corporate announcements for demo                          | Realistic JSON seeds                                        |

### Mock Portfolio (20 NSE stocks — diverse sectors)

| Ticker        | Company             | Sector             |
| ------------- | ------------------- | ------------------ |
| RELIANCE.NS   | Reliance Industries | Conglomerate       |
| TCS.NS        | TCS                 | IT Services        |
| HDFCBANK.NS   | HDFC Bank           | Banking            |
| INFY.NS       | Infosys             | IT Services        |
| HINDUNILVR.NS | Hindustan Unilever  | FMCG               |
| TITAN.NS      | Titan Company       | Consumer           |
| BAJFINANCE.NS | Bajaj Finance       | NBFC               |
| TRENT.NS      | Trent               | Retail             |
| DIXON.NS      | Dixon Technologies  | Electronics        |
| UNOMINDA.NS   | Uno Minda           | Auto Components    |
| BHARTIARTL.NS | Bharti Airtel       | Telecom            |
| SUNPHARMA.NS  | Sun Pharma          | Pharma             |
| LT.NS         | Larsen & Toubro     | Engineering        |
| TATAMOTORS.NS | Tata Motors         | Auto               |
| ADANIENT.NS   | Adani Enterprises   | Conglomerate       |
| ASIANPAINT.NS | Asian Paints        | Paint/Chemical     |
| MARUTI.NS     | Maruti Suzuki       | Auto               |
| NESTLEIND.NS  | Nestle India        | FMCG               |
| COALINDIA.NS  | Coal India          | Mining             |
| PIDILITIND.NS | Pidilite Industries | Specialty Chemical |

### Additional Research Companies (5)

DMART.NS, ZOMATO.NS, PAYTM.NS, NYKAA.NS, POLICYBZR.NS

---

## 5. AI Integration

### Where LLMs are used:

| Feature                     | LLM Task                                                    | Model                           |
| --------------------------- | ----------------------------------------------------------- | ------------------------------- |
| **Push — Filing Summary**   | Classify + summarize corporate announcements                | Hyde (fast) → Gemini (fallback) |
| **Push — Alert Reasoning**  | Explain why a price/volume move matters                     | Hyde                            |
| **Pull — Company Analysis** | Business snapshot, financial analysis, narrative vs numbers | Hyde (reasoning)                |
| **Pull — Bull vs Bear**     | Generate balanced thesis                                    | Hyde                            |
| **Network — Match**         | Match filing names to network contacts                      | Hyde (fast)                     |
| **Ask FINN**                | Conversational Q&A over portfolio + research                | Hyde → Gemini                   |
| **Export**                  | Generate formatted report from analysis                     | Hyde                            |

### Model Routing Strategy (Cost Efficiency)

```
User query → Classify complexity
  ├── Simple (filing classification, name matching) → Gemini Free Tier
  ├── Medium (summaries, alerts) → Hyde (fast model)
  └── Complex (deep analysis, narrative vs numbers) → Hyde (reasoning model)
```

### Hyde Integration

```javascript
// Primary: Hyde Inference API
const hyde = new HydeClient({ apiKey: process.env.HYDE_API_KEY });
const response = await hyde.chat.completions.create({
  model: "hyde-fast",
  messages: [{ role: "user", content: prompt }],
});

// Fallback: Gemini Free Tier
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
```

---

## 6. Sharing Integration

### What's Possible:

| Channel           | Status     | Implementation                                                                         |
| ----------------- | ---------- | -------------------------------------------------------------------------------------- |
| **WhatsApp**      | ✅ Working | `https://wa.me/?text=...` (universal link — works on both iOS & Android per their FAQ) |
| **Telegram**      | ✅ Working | `https://t.me/share/url?url=...&text=...`                                              |
| **Gmail**         | ✅ Working | `mailto:?subject=...&body=...` (opens Gmail on mobile)                                 |
| **SMS/iMessage**  | ✅ Working | `sms:?body=...` (iOS) / Web Share API fallback                                         |
| **Web Share API** | ✅ Native  | `navigator.share()` — gives native share sheet on mobile                               |
| **LinkedIn**      | ⚠️ Dummy   | No official API — show profile cards with mock data                                    |
| **Copy Link**     | ✅ Working | Clipboard API                                                                          |

### WhatsApp Implementation (from their FAQ):

```javascript
// Universal — works on both platforms
const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
// With specific number
const shareToContact = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
```

---

## 7. Project Structure

```
ENAM_Hiring/
├── .env                          # API keys (gitignored)
├── .env.example                  # Template
├── next.config.js
├── tailwind.config.ts
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Mock data seeder
├── public/
│   ├── icons/                    # PWA icons
│   └── manifest.json             # PWA manifest
├── data/
│   ├── portfolio.json            # Mock portfolio config
│   ├── network.json              # Mock network contacts
│   ├── filings.json              # Mock corporate filings
│   └── announcements.json        # Mock announcements
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (dark/light theme)
│   │   ├── page.tsx              # Splash → redirect
│   │   ├── login/page.tsx        # Sign in screen
│   │   ├── push/page.tsx         # Push intelligence feed
│   │   ├── research/
│   │   │   ├── page.tsx          # Pull research overview
│   │   │   └── [ticker]/page.tsx # Company dossier
│   │   ├── network/page.tsx      # Network screen
│   │   ├── portfolio/page.tsx    # Portfolio screen
│   │   ├── profile/page.tsx      # Profile/settings
│   │   ├── ask/page.tsx          # Ask FINN AI chat
│   │   └── export/page.tsx       # Export preview
│   ├── api/
│   │   ├── stocks/route.ts       # Yahoo Finance — paginated
│   │   ├── stock/[ticker]/route.ts
│   │   ├── research/route.ts     # AI-powered research
│   │   ├── alerts/route.ts       # Push alerts
│   │   ├── network/route.ts      # Network queries
│   │   ├── ask/route.ts          # AI chat endpoint
│   │   └── share/route.ts        # Export/share
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx
│   │   │   ├── AppHeader.tsx
│   │   │   └── SafeArea.tsx
│   │   ├── push/
│   │   │   ├── IntelligenceCard.tsx
│   │   │   ├── AlertCard.tsx
│   │   │   └── InsightHeader.tsx
│   │   ├── research/
│   │   │   ├── FinancialMatrix.tsx
│   │   │   ├── NarrativeCard.tsx
│   │   │   └── CompanyHeader.tsx
│   │   ├── network/
│   │   │   ├── ContactCard.tsx
│   │   │   ├── NetworkGraph.tsx
│   │   │   └── RelationshipNode.tsx
│   │   ├── portfolio/
│   │   │   ├── StockRow.tsx
│   │   │   └── PortfolioSummary.tsx
│   │   ├── ai/
│   │   │   ├── ChatInput.tsx
│   │   │   ├── AiResponse.tsx
│   │   │   └── ResearchingState.tsx
│   │   └── ui/
│   │       ├── GlassCard.tsx     # Glassmorphism card
│   │       ├── SegmentedControl.tsx
│   │       ├── ShareSheet.tsx
│   │       └── ThemeToggle.tsx
│   ├── lib/
│   │   ├── hyde.ts               # Hyde API client
│   │   ├── gemini.ts             # Gemini fallback
│   │   ├── llm.ts                # Unified LLM with routing
│   │   ├── yahoo.ts              # Yahoo Finance wrapper
│   │   ├── db.ts                 # Prisma client
│   │   └── share.ts              # Share URL generators
│   ├── hooks/
│   │   ├── useStocks.ts
│   │   ├── useNetwork.ts
│   │   └── useTheme.ts
│   └── styles/
│       └── globals.css           # Tailwind + custom theme vars
└── vercel.json                   # Deployment config
```

---

## 8. Design System (from Figma)

### Theme

- **Dark mode** (primary): Deep black/charcoal backgrounds, glass-morphism cards, vibrant accent colors
- **Light mode**: Clean whites, subtle shadows, same accent system
- Toggle via button in header

### Colors (extracted from Figma)

```css
/* Dark theme */
--bg-primary: #0a0a0a;
--bg-card: rgba(255, 255, 255, 0.04);
--bg-glass: rgba(255, 255, 255, 0.06);
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.6);
--accent-green: #34c759; /* Gains, positive */
--accent-red: #ff3b30; /* Losses, negative */
--accent-blue: #007aff; /* Links, interactive */
--accent-orange: #ff9500; /* Alerts, warnings */
--border: rgba(255, 255, 255, 0.08);

/* Light theme */
--bg-primary: #f2f2f7;
--bg-card: #ffffff;
--text-primary: #000000;
--text-secondary: rgba(0, 0, 0, 0.5);
```

### Typography

- **Headings**: SF Pro Display / Inter — bold, tight letter-spacing
- **Body**: SF Pro Text / Inter — regular
- **Numbers**: SF Mono / JetBrains Mono — tabular figures
- **Sizes**: 11px labels, 14px body, 16px subhead, 20px heading, 24-32px hero

### Key UI Patterns

- **Glass cards** with backdrop-blur (Intelligence Cards)
- **Segmented controls** (iOS-style tabs)
- **Bottom sheet navigation** (4-tab bar)
- **Pill tags** for classification (M&A, Results, etc.)
- **Sparkline charts** inline with stock data
- **Avatar + relationship badges** on network contacts

---

## 9. Build Order (Execution Plan)

### Phase 1: Scaffold (30 min)

1. Create Next.js project with TypeScript + Tailwind
2. Set up project structure
3. Create `.env` with placeholders
4. Install all dependencies
5. Set up Prisma schema + seed data

### Phase 2: Design System + Layout (1 hr)

1. Implement dark/light theme system
2. Build `BottomNav`, `AppHeader`, `SafeArea` components
3. Create `GlassCard`, `SegmentedControl` reusable components
4. Set up all routes with basic page shells

### Phase 3: Portfolio + Stocks (1 hr)

1. Yahoo Finance API integration with pagination
2. Build `Portfolio` page with stock list
3. Real-time prices with React Query polling
4. Sparkline charts per stock

### Phase 4: Push Intelligence (1.5 hr)

1. Mock filing/announcement data seeder
2. AI-powered filing classification + summarization
3. Build Push feed with Intelligence Cards
4. Alert threshold system (configurable)
5. Network overlays on relevant cards

### Phase 5: Pull Research (1.5 hr)

1. Company dossier page with financial matrix
2. AI deep analysis (business snapshot, financials, bull/bear)
3. Narrative vs Numbers analysis
4. Network integration ("who can help")

### Phase 6: Network (1 hr)

1. Mock network data (contacts with career paths)
2. Network visualization (contact cards + relationships)
3. Expertise map
4. Second-degree reach
5. "Keep warm" suggestions

### Phase 7: Ask FINN (1 hr)

1. Chat interface with streaming responses
2. AI routing (simple → Gemini, complex → Hyde)
3. Research state with animated loading
4. Structured AI responses with citations

### Phase 8: Profile + Sharing (45 min)

1. Profile page with settings
2. Share sheet (WhatsApp, Telegram, Gmail, Web Share API)
3. Export preview — formatted report
4. Theme toggle

### Phase 9: Polish + Deploy (45 min)

1. PWA manifest + service worker
2. Responsive tweaks
3. Loading states + error handling
4. Deploy to Vercel

---

## 10. Hosting on Vercel

### Steps:

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "FINN v1"
git remote add origin https://github.com/YOUR_USERNAME/finn.git
git push -u origin main

# 2. Deploy to Vercel
npx vercel --prod

# 3. Set environment variables in Vercel dashboard:
#    HYDE_API_KEY=...
#    GEMINI_API_KEY=...
```

### Vercel gives you:

- Automatic HTTPS
- Global CDN (fast on phones)
- Serverless API routes (no server management)
- Custom domain (optional)
- Preview deployments per git push

---

## 11. What Will Look Like a "Real App" vs "Demo"

### ✅ Real / Working

- Live stock prices from Yahoo Finance (paginated)
- AI-powered analysis using Hyde + Gemini
- WhatsApp/Telegram/Gmail sharing
- Dark/light theme toggle
- Responsive mobile-first design matching Figma
- PWA installable on phone home screen

### ⚠️ Demo / Simulated

- **Sign-in** — simulated OTP (no real SMS provider)
- **LinkedIn profiles** — mock data (no official API)
- **Corporate filings** — realistic mock data (real BSE/NSE APIs need scraping which is fragile)
- **Network contacts** — seeded mock data
- **Push notifications** — in-app only (no real push without service like Firebase)
- **Face ID / biometric** — shown in UI but browser can't access (would need native app)

### 🔮 What I'd Add With More Time

- Real BSE/NSE filing scraper
- Firebase push notifications
- Voice input for Ask FINN
- Interactive network graph visualization (D3.js)
- Concall transcript parser
- Real-time WebSocket stock updates

---

## 12. `.env` File

```env
# Primary LLM — Hyde Inference API
HYDE_API_KEY=your_hyde_api_key_here
HYDE_API_URL=https://api.hyde.tech/v1

# Fallback LLM — Google Gemini (free tier)
GEMINI_API_KEY=your_gemini_api_key_here

# Database
DATABASE_URL=file:./dev.db

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

> [!IMPORTANT]
> **Ready to build.** Hit **Proceed** to start coding. I'll build it phase by phase, starting with the scaffold and design system, then layer in each feature.
