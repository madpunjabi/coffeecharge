☕  ⚡

**Coffee & A Charge**

Product Requirements Document

*Find your charge. Find your coffee. All at once.*

Version 1.2  ·  February 2026  ·  CONFIDENTIAL

# **1\. The Story Behind Coffee & A Charge**

It started on a drive from Lake Tahoe to San Francisco.

The battery was at 60%. We needed to charge within the next 50 miles. Simple enough. Except we also wanted a Starbucks — a real coffee, not a vending machine. What should have taken 10 seconds took 10 minutes.

Open Google Maps. Find charging stations along the route. Pick one. Now open a second tab and search for Starbucks near that address. Cross-reference. The Starbucks is half a mile away with no sidewalk. Go back. Try the next station. Repeat.

We eventually found a stop that worked. But by the time we got there, the frustration had already settled in. This is a solved problem for gas cars. Pull off the highway, the gas station and the coffee are right there. For EV drivers, that basic convenience — charge the car, grab a coffee, use a real bathroom — requires triangulating two completely separate apps that were never designed to talk to each other.

That is the problem Coffee & A Charge was built to solve. One search. One result. A charging stop that works for your car and for you.

| 💡  THE INSIGHT Every EV driver has a version of this story. The gap isn't charging infrastructure — chargers exist. The gap is discovery: finding the stop that has both a working charger AND the amenities that make a 20-minute wait feel like a break instead of a penalty. |
| :---- |

# **2\. Problem Statement**

## **2.1 The Multi-App Tax**

The average informed EV road tripper uses 2–4 apps simultaneously: ABRP to calculate energy, PlugShare to verify charger status, Google Maps to navigate, and a network-specific app to pay. None of these apps share data with each other. None of them can answer the single most common question on any EV road trip: “Where should I stop that has a working charger AND somewhere I actually want to be for 20 minutes?”

## **2.2 What the Research Shows**

Analysis of EV driver communities and published research surfaces a consistent pattern of frustration:

* Current EV owners estimate only a 41% chance that a given public charger will be working and available when they arrive — based on first-hand experience, not speculation.

* No existing app supports brand-level amenity search. You can filter for “restaurant” but not for “Starbucks.” You can find a charger near food, but not near your food.

* Charger reliability data is stale by hours or days in most apps. “Last updated” timestamps are absent or buried.

* Discovering a charger is broken on arrival — at an unfamiliar location, with no fallback shown — is the worst moment in EV travel. No app addresses this proactively.

* PlugShare was built on a crowdsourced model that predates real-time APIs. ABRP is a powerful tool that requires significant expertise to use. Neither was designed for the casual question: “Where’s the best stop in the next 50 miles?”

| 🎯  THE CORE OPPORTUNITY Coffee & A Charge is the synthesis layer that doesn't exist yet: a single, consumer-grade experience that combines real-time charger reliability with walkable amenity discovery — and surfaces it as a simple, ranked answer. |
| :---- |

# **3\. Target Users**

| 🚗 PERSONA 1 | Sarah, 38 — takes 3–4 road trips/year in her Tesla Model Y. Comfortable with tech but hates context-switching between apps while driving. Her core question on every trip: “Where should I stop that isn’t miserable?” Core Need: A stop that’s seamless — great charger, great coffee, no friction. |
| :---: | :---- |

| 👨‍👩‍👧 PERSONA 2 | Marcus & Jen, 42/40 — Rivian R1S with two kids. Charging stops are family events requiring restrooms, food options, and a safe environment. An empty parking lot charger is not an option. Core Need: Confidence that the stop works for everyone — food, bathrooms, and a charger that actually charges. |
| :---: | :---- |

| 💼 PERSONA 3 | Kevin, 47 — Polestar 2, regional sales travel. Needs charging to happen while he eats or works. Predictability above all — no broken chargers, no wasted detours. Core Need: Reliable stops with wifi and food. Time is money. |
| :---: | :---- |

# **4\. The Scoring System**

Coffee & A Charge rates every charging stop on two independent dimensions, combined into a single headline score. The system is inspired by Booking.com’s approach: a precise headline number built from transparent subscores that users can drill into.

## **4.1 The Two Scores**

| ⚡ Charge Confidence Score 4.2 / 5 *Charger availability & reliability* |  | ☕ Brew Score 4.6 / 5 *Walkable amenities & stop quality* |
| :---: | :---- | :---: |

**Charge Confidence Score**  measures how reliably the charger works and whether it’s likely to be available when you arrive. It is built from 30-day uptime history, real-time availability from network APIs, community check-in recency, and network-level reliability benchmarks. Visualized as ⚡ bolts out of 5\.

**Brew Score**  is the walk-score equivalent for charging stops. It measures the quality of the stop environment — how many amenities are within walking distance, what types they are, how highly rated they are, and whether they’re open during typical charging hours. Visualized as ☕ cups out of 5\.

## **4.2 The Combined C\&C Score**

The two subscores are averaged and displayed on a 10-point scale as the headline C\&C Score — giving enough granularity to feel meaningful, borrowing the consumer familiarity of hotel and restaurant rating systems.

| C\&C Score   8.8  / 10 EXCELLENT STOP |
| :---: |

| C\&C Score | Label | What It Means |
| :---- | :---- | :---- |
| 9.0 – 10.0 | Perfect Stop | Exceptional charger reliability \+ outstanding amenities. Rare. |
| 8.0 – 8.9 | Excellent Stop | High confidence charger \+ great walkable options. Recommended. |
| 7.0 – 7.9 | Great Stop | Solid on both dimensions. A dependable choice. |
| 6.0 – 6.9 | Good Stop | Works fine. May have one weaker dimension. |
| 5.0 – 5.9 | Decent Stop | Acceptable. Worth knowing the weak point before committing. |
| Below 5.0 | Proceed with Caution | Significant concern on at least one dimension. Use as a last resort. |

## **4.3 Score Transparency**

Both subscores are tappable. Tapping the Charge Confidence Score reveals its breakdown:

| Sub-component | Weight | Data Source |
| :---- | :---- | :---- |
| 30-day uptime history | 35% | Network API pings \+ community check-ins |
| Real-time availability | 30% | OCPI / network API live status |
| Community verification recency | 20% | In-app check-in timestamp |
| Network reliability benchmark | 15% | Historical performance by charging network |

Tapping the Brew Score reveals:

| Sub-component | Weight | Data Source |
| :---- | :---- | :---- |
| Food options within 5-min walk | 30% | Google Places API |
| Restroom access | 20% | Google Places \+ community tags |
| Retail / shopping nearby | 15% | Google Places API |
| Venue quality (ratings) | 15% | Google Places rating data |
| Environment type (indoor/outdoor) | 10% | Google Places \+ community photos |
| Hours coverage during charge window | 10% | Google Places hours data |

# **5\. Core Use Cases**

## **Use Case 1: The Brand-Specific Stop (Founding Story)**

| 📍  SCENARIO Driving Tahoe → SF, battery at 60%, need to charge within 50 miles. Passenger wants a Starbucks. Find the best stop in under 30 seconds. |
| :---- |

**Today:**  Open Google Maps → find chargers → pick one → search Starbucks nearby → cross-reference → repeat. \~10 minutes of frustration.

**Coffee & A Charge:**  Set 50-mile range → tap Starbucks filter → see ranked results with C\&C Scores. \~15 seconds.

## **Use Case 2: Real-Time Reroute**

| 🔄  SCENARIO Planned stop is showing 4/4 stalls occupied with a 45-minute queue. User is 20 miles out. App proactively surfaces the next-best option. |
| :---- |

The app monitors occupancy on planned stops and pushes a proactive alert when the stop is likely to be overcrowded, with a single-tap reroute to the next option that still meets the original amenity criteria.

## **Use Case 3: Pre-Trip Planning**

| 🗺️  SCENARIO Planning a 400-mile drive tomorrow. Build a full stop itinerary, confirm amenities at each, share with travel companion. |
| :---- |

The Trip Planner lets users sequence charging stops for long drives, estimate charge time at each, verify Brew Score and Charge Confidence before departing, and export the itinerary to Apple or Google Maps for in-car navigation.

# **6\. Feature Requirements**

## **P0 — Launch (MVP)**

### **Smart Stop Search**

* Range-constrained map view: input current battery %, vehicle model, and destination to define the charging corridor

* Brand-level amenity filter: search for specific chains (Starbucks, McDonald’s, Panera, Whole Foods, Target, Walmart)

* Multi-filter combinations: Fast Charger (150kW+) \+ Starbucks \+ Restrooms \+ Open Now in a single search

* Results ranked by composite C\&C Score with route deviation penalty applied

### **Charge Confidence Score (Live)**

* NEVI-compliant station real-time data via OCPI — federally mandated open data, available immediately

* ChargePoint API integration for live stall availability

* Community check-in system: one-tap “Is this charger working?” on arrival

* Reliability badge: Green (90%+ uptime), Amber (70–90%), Red (\<70% or recent failure reports)

* “Last verified” timestamp prominently displayed on every stop card

### **Brew Score (Calculated)**

* Google Places API integration: pull all amenities within 400m of every station

* Score calculated server-side and cached weekly (not computed live — controls API costs)

* Walking distance from charger to each amenity shown explicitly, not just “nearby”

* Amenity hours cross-referenced with typical charge duration

### **Stop Detail View**

* Both scores displayed with one-tap drill-down to sub-components

* Charger specs: power level (kW), connector type, network, price per kWh

* Amenity list with brand logos, walking time, current hours, and rating

* Community photos of the actual stop environment

* Fallback station always shown: “If this stop fails, your next option is X miles away”

### **Vehicle Profile**

* Supports all major EV models with accurate range and charging curve data

* Connector type auto-filters incompatible chargers from all results

* Temperature and elevation adjustments to range estimate

## **P1 — Version 1.1**

### **Trip Planner**

* Full route planning for trips 200+ miles with sequential charging stops

* Energy model incorporating weather, elevation, and driving speed

* Export to Apple Maps / Google Maps for in-car navigation

* Shareable trip links; save and re-use frequent routes

### **Proactive Alerts**

* Push notification if planned stop charger goes offline en route

* “Station getting busy” alert when occupancy at planned stop exceeds threshold

* One-tap “Reroute to next best” action from notification

### **Preference Profiles**

* Save favorite filter combinations (“I always want: fast charger \+ Starbucks \+ restrooms”)

* Minimum C\&C Score threshold setting

* Deal-breaker filters: minimum kW, max detour distance, minimum stall count

## **P2 — Version 2.0+**

* In-app charging session start/monitor/stop for supported networks

* Hotel integration: verify EV charger availability when booking lodging

* Carbon offset tracker: CO2 avoided vs. equivalent ICE vehicle

* Brand loyalty integration: earn Starbucks Stars for charging at partner stops

* Fleet/corporate product: bulk subscriptions for EV fleet managers

# **7\. Data & API Architecture**

## **7.1 Data Sources by Score**

| Score | Data Source | Type | Cost | Priority |
| :---- | :---- | :---- | :---- | :---- |
| Charge Confidence | NREL Alternative Fuels API | Station registry | Free | Day 1 |
| Charge Confidence | NEVI OCPI feeds (federal mandate) | Real-time status | Free | Day 1 |
| Charge Confidence | ChargePoint Developer API | Real-time availability | Free (gated) | Apply now |
| Charge Confidence | Open Charge Map (OCM) | Station fallback registry | Free | Day 1 |
| Charge Confidence | Community check-ins (proprietary) | Verification layer | Internal | Beta |
| Charge Confidence | EVgo API | Real-time status | Partnership | V1.1 |
| Brew Score | Google Places API | Amenity discovery | Paid (cache) | Day 1 |
| Brew Score | Foursquare Places API | Supplemental POI | Cheaper alt. | V1.1 |
| Brew Score | Walk Score API | Walkability proxy | Licensed | MVP shortcut |

## **7.2 The NEVI Advantage**

The National Electric Vehicle Infrastructure (NEVI) program — federal EV charging funding — requires any station receiving federal money to publish real-time OCPI data publicly as a condition of the grant. This regulatory tailwind is recent (2023–2024) and most existing apps have not fully capitalized on it. NEVI-funded stations represent a rapidly growing share of the US fast-charging network and are Coffee & A Charge’s “high confidence” tier from day one — no partnership negotiation required.

## **7.3 Why Existing Apps Don’t Have Live Data**

Understanding this is important for competitive positioning. The fragmentation is real and structural:

* **API access is gated.**  Networks treat real-time data as a competitive asset. ChargePoint requires application approval. Electrify America has been historically closed. Tesla only began opening data with NEVI compliance requirements.

* **Standards are fragmented.**  OCPI is the open standard, but implementations vary enough between networks that every integration breaks in slightly different ways.

* **"Live" data isn’t always live.**  Some networks push status every 30 seconds; others batch-update every 4 hours. A charger that’s broken but not actively erroring can show as “available” indefinitely.

* **PlugShare’s DNA is crowdsourced.**  Built in 2012 before APIs existed. Retrofitting a real-time data architecture onto a crowdsourced model is hard and misaligned with their incentives.

This fragmentation is Coffee & A Charge’s moat. If real-time charger \+ amenity synthesis were easy, Google would have done it. The complexity is the barrier.

# **8\. UI Direction**

## **8.1 Design Principles**

* **Decisions in 2 taps.**  The primary flow (set range → add amenity filter → see ranked results) must complete in no more than 2 user interactions from app launch. Non-negotiable.

* **Calm confidence.**  EV travel is already anxiety-inducing. The design should feel settled and trustworthy — never busy or alarming.

* **Map-first, list-second.**  Spatial orientation is the primary mental model. List view is secondary.

* **Show the walk, not just the distance.**  0.2 miles means nothing if there’s no sidewalk. Walkability context is a core data point, not a nice-to-have.

* **Scores over stars.**  C\&C Score (x/10) and subscores (x/5) everywhere. Never generic star ratings, which carry no EV-specific meaning.

## **8.2 Reference Apps & What to Borrow**

| App | What to Borrow | What to Improve |
| :---- | :---- | :---- |
| Apple Maps | Bottom sheet interaction (collapsed / half / full states); clean typography | Add EV-specific data density without cluttering the map |
| Booking.com | Headline score \+ subscores; score label system (Excellent, Great, etc.) | Make scores EV-specific and more visually distinctive |
| Airbnb | Category filter pills at top (Beaches, Farms...) → adapt for amenity brands | Make filters combinable; show brand logos not text labels |
| Yelp | Photo-led stop cards; distance \+ walking metadata front and center | Replace star ratings with C\&C Score; EV-specific data layer |
| Walk Score | Walkability as a first-class metric with a numerical score | Apply to charging stops specifically; combine with charger data |

## **8.3 Key UI Components**

### **Filter Bar**

Horizontally scrolling brand pills at the top of the map screen. Brand logos (not text) for major chains — instantly recognizable at a glance. Examples:

|   FILTER BAR EXAMPLE \[ ⚡ Fast 150kW+ \]  \[ Starbucks logo \]  \[ McDonald’s logo \]  \[ 🚹 Restrooms \]  \[ 📶 Wifi \]  \[ 🛒 Grocery \]  \[ 🏨 Hotel \] |
| :---- |

### **Stop Card**

Each card shows: charger network logo, power level badge (e.g. “150 kW”), stall count / available stalls, Charge Confidence Score (⚡ bolts), top 3 amenities as brand logos with walking time, Brew Score (☕ cups), C\&C Score headline, detour distance from route.

### **Stop Detail Screen**

Full-screen view with: C\&C Score headline at top, tappable Charge Confidence \+ Brew Score subscores, charger grid diagram showing stall availability, amenity list with logos / walking time / hours / rating, community photo gallery, fallback station callout (“If this stop fails → \[Next Best\] is 8 miles away”).

## **8.4 Color System**

| Name | Hex | Usage |
| :---- | :---- | :---- |
| Charge Blue | \#1565C0 | Primary brand; CTA buttons; Charge Confidence Score |
| Brew Green | \#2E7D32 | Brew Score; success states; charger available |
| Caution Amber | \#E65100 | Busy chargers; mild reliability warnings; alerts |
| Alert Red | \#C62828 | Broken charger; out of range; critical failures |
| Warm Cream | \#FFF8E1 | Card backgrounds; warm, coffee-shop feel |
| Deep Charcoal | \#212121 | Primary text; maximum readability |

# **9\. Platform Strategy & Technical Stack**

## **9.1 The Decision: Web First, Mobile Always in Mind**

Coffee & A Charge will launch as a Next.js web app — but it will be built mobile-first in design, and architected as a Progressive Web App (PWA) from day one so it bridges naturally to native mobile without a rebuild.

| 📱  THE HONEST TRADEOFF This product is ultimately an in-car, in-the-moment experience. The founding use case happens on a phone mounted to a dashboard, not on a laptop. Web-first is a tactical decision to ship faster — not a permanent platform choice. The path to native mobile is built into the plan from the start. |
| :---- |

## **9.2 Why Web First**

* **Speed to market.**  Next.js is already familiar. Shipping something real in 8 weeks on a known stack beats shipping nothing in 6 months learning Swift or React Native. The first job is to prove the concept works — that combining charger reliability \+ amenity scoring into one ranked result is genuinely useful.

* **Pre-trip planning is desktop-native.**  A significant share of EV trip planning happens the night before or morning of, on a laptop. A web app serves this use case perfectly and generates real usage data while mobile is being built.

* **Avoid split focus.**  Learning React Native or Swift while simultaneously building a new product means doing two hard things at once. Web-first removes that tax entirely during the most critical early phase.

* **PWA closes the gap.**  A Progressive Web App can be installed on a phone’s home screen, access GPS, send push notifications, and work offline — covering roughly 80% of the mobile use case with zero additional build cost if architected correctly from the start.

## **9.3 The PWA Bridge Strategy**

Building as a PWA from day one means the web app gains near-native mobile capabilities without an App Store submission or a new codebase. This is the bridge between web launch and native mobile.

| PWA Capability | What It Enables | Status |
| :---- | :---- | :---- |
| Home screen install | Users add app to phone home screen; feels native | Free with Next.js PWA config |
| GPS / Geolocation | Real-time ‘Near Me Now’ stop finding while driving | Browser API; works on mobile web |
| Push notifications | Proactive reroute alerts when planned stop goes down | Requires service worker setup |
| Offline mode | Cached stop data accessible without signal | Service worker \+ local cache |
| Full-screen mode | Hides browser chrome; feels like a native app | PWA manifest setting |

PWA limitations to be aware of: no CarPlay or Android Auto integration (requires native app), limited background processing, and iOS Safari has historically had more PWA restrictions than Android Chrome. These gaps are real but acceptable for the first 6–12 months.

## **9.4 Mobile-First Design Requirement**

| 🎨  NON-NEGOTIABLE DESIGN RULE Every screen must be designed for a 390px wide phone screen first. Desktop layout scales up from mobile — never the other way around. If a screen is designed desktop-first and squeezed into mobile later, the UI gets rebuilt twice. Design for the dashboard mount from day one. |
| :---- |

Practical implications of mobile-first design:

* Touch targets minimum 44px × 44px — no tiny filter chips that require a stylus to tap

* Bottom sheet navigation pattern (Apple Maps style) — thumb-reachable on large phones

* Filter pills scrollable horizontally with a single swipe, not a multi-row grid

* Stop cards designed for one-thumb scrolling in portrait orientation

* Map occupies full screen with overlaid UI — never split with a sidebar

## **9.5 The Path to Native Mobile**

The PWA buys 6–12 months of real-world usage data before committing to a native build. By then the team will know exactly which features drive retention, which routes users actually drive, and what the core in-car interactions need to be. That data makes the native app dramatically better and more focused.

| Phase | Platform | Timeline | Trigger to Move Forward |
| :---- | :---- | :---- | :---- |
| 1 — Prove the concept | Next.js web app | Months 1–3 | Core search flow works; founding use case validated |
| 2 — Mobile parity | PWA (web, installable) | Months 3–6 | GPS, push notifications, offline mode live; 500+ active users |
| 3 — Native decision point | Evaluate native build | Month 6–8 | Traction justifies investment; CarPlay/Android Auto demand confirmed |
| 4 — Native app | React Native (Expo) or Swift | Months 9–18 | CarPlay, Android Auto, background processing, App Store presence |

When native does happen, React Native with Expo is the recommended path given the existing JavaScript/React codebase. Much of the business logic, API integrations, and scoring algorithms can be shared. The UI layer gets rebuilt for native, but the hard parts — the data architecture and scoring engine — carry over directly.

## **9.6 Technology Stack**

| Layer | Technology | Rationale |
| :---- | :---- | :---- |
| Frontend | Next.js \+ TypeScript \+ Tailwind | Familiar stack; PWA-ready; mobile-first responsive design |
| Maps | Mapbox GL JS | Cheaper than Google Maps JS; highly customizable; touch-optimized; generous free tier |
| Database | Supabase (Postgres) | Familiar from TimeBlock; real-time subscriptions; built-in auth |
| Backend functions | Supabase Edge Functions | Score calculation, API polling, cron jobs — all in one place |
| PWA layer | next-pwa | Service worker, offline caching, push notifications via Next.js |
| Station registry | NREL API \+ Open Charge Map | Free; complete US coverage; seeds database on day one |
| Amenity data | Google Places API (cached) | Most complete dataset; cache weekly to control costs |
| Live status | ChargePoint API \+ NEVI OCPI | Real-time availability; apply for ChargePoint access now |
| Hosting | Vercel | Free tier; instant deployments; PWA-compatible; perfect for Next.js |

## **9.7 Implementation Roadmap**

| Phase | Timeline | Goal | Key Deliverables |
| :---- | :---- | :---- | :---- |
| Foundation | Weeks 1–2 | Stations on a map | Seed DB from NREL; Mapbox map rendering all US chargers; mobile-first layout |
| Brew Score | Weeks 3–4 | Every stop scored for amenities | Google Places integration; Brew Score calculation; cached weekly |
| Charge Score | Weeks 5–6 | Every stop has a Charge Score | NEVI OCPI \+ ChargePoint API; community check-in flow |
| Core Search | Weeks 7–8 | Founding use case works end-to-end | Filter pills; range constraint; stop detail screen; full C\&C Score |
| PWA upgrade | Weeks 9–10 | Mobile-installable with GPS \+ notifications | PWA manifest; service worker; GPS location; push notification setup |
| Soft Launch | Weeks 11–12 | 100 real users, real check-in data | EV community seeding (Reddit, Facebook groups); analytics; iteration |

## **9.8 Budget Reality**

Early-stage monthly infrastructure costs are lean and fully bootstrappable:

* **Vercel:**  Free tier covers early stage comfortably. Scales gracefully.

* **Supabase:**  Free tier handles the load well into beta.

* **Google Places API:**  The main variable cost. Budget $200–$300/month for development; aggressive caching cuts this significantly at scale.

* **Mapbox:**  Free up to 50,000 map loads/month — more than enough for early traction.

* **Total early stage:**  $300–$500/month. Well within bootstrapped territory through the first 500 users.

# **10\. Competitive Positioning**

Coffee & A Charge is not a route energy calculator (ABRP) or a charger database (PlugShare). It is the decision layer on top of both — purpose-built for the question neither app can answer.

| Capability | C\&C | PlugShare | ABRP | Google Maps EV |
| :---- | :---- | :---- | :---- | :---- |
| Brand-level amenity filter (e.g. Starbucks) | ✅ Core feature | ❌ Category only | ❌ Generic POI | ❌ None |
| Proprietary stop quality score | ✅ C\&C Score | ❌ None | ❌ None | ❌ None |
| Walkability / amenity scoring | ✅ Brew Score | ❌ None | ❌ None | ❌ None |
| Charger reliability scoring | ✅ Confidence Score | ⚠️ Community only | ⚠️ Premium tier | ❌ None |
| Real-time charger status | ✅ API \+ community | ✅ Community-driven | ⚠️ Premium | ⚠️ Limited |
| Route energy calculation | ✅ Integrated (P1) | ⚠️ Basic | ✅ Best-in-class | ⚠️ Simple |
| Consumer-grade UX | ✅ Designed for this | ⚠️ Complex filters | ❌ Power-user only | ✅ Familiar |

# **11\. Monetization Strategy**

## **Phase 1 — Freemium**

* **Free:**  Core stop finder, standard filters, basic scores, 3 saved preference profiles.

* **Premium ($4.99/mo):**  Full brand-level filters, Trip Planner, proactive alerts, real-time occupancy, unlimited profiles, CarPlay / Android Auto.

## **Phase 2 — B2B2C**

* **Brand partnerships:**  Starbucks, Panera, and other chains pay for promoted placement — with a quality gate. A stop must have a Brew Score above 4.0 to be eligible. No pay-to-win.

* **Network partnerships:**  Charging networks with high Confidence Scores get premium placement and can use the data for their own marketing. Networks with poor scores have financial incentive to maintain hardware.

* **Fleet & corporate:**  Bulk subscriptions for EV fleet managers planning multi-driver road trips.

# **12\. Risks & Mitigations**

| Risk | Likelihood | Mitigation |
| :---- | :---- | :---- |
| Google Places API cost at scale | High | Cache Brew Scores weekly server-side; evaluate Foursquare as cheaper alternative early |
| Charging network API access gating | Medium | Lead with NEVI/NREL (free, open); apply for ChargePoint now; use community check-ins as fallback |
| Stale data eroding trust | High | 'Last verified' timestamps everywhere; community check-in incentive program from day one |
| ABRP or PlugShare adds brand filters | Low-Medium | Move fast; consumer positioning and UX are differentiated even if features are matched |
| Tesla users staying in native Nav | Medium | Focus initial audience on non-Tesla EVs (Rivian, Ford, Hyundai, Polestar) where native Nav is weaker |

# **13\. Success Metrics**

| Metric | Definition | 6-Month Target |
| :---- | :---- | :---- |
| Time to First Stop | Seconds from app open to stop selection | \< 30 seconds |
| Search Success Rate | % of searches resulting in a stop selection (not abandoned) | \> 70% |
| Charge Score Accuracy | Predicted vs. actual charger status, verified via community check-ins | \> 85% |
| Day-30 Retention | % of users who open app again 30 days after install | \> 40% |
| App Store Rating | iOS \+ Android average | \> 4.5 stars |
| Net Promoter Score | Post-trip survey NPS | \> 50 |
| Community Check-ins | Total check-ins submitted by users | 5,000 in first 90 days |

Coffee & A Charge  ·  Confidential  ·  v1.0  ·  February 2026

*The stop that works for your car and for you.*