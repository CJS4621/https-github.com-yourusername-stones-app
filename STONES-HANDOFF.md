# 🪨 STONES APP — DEVELOPMENT HANDOFF DOCUMENT

**For new session in Team account — paste this in first message**

---

## 📱 PROJECT OVERVIEW

**App:** Stones — faith community iOS app where believers drop "stones" (testimonies) and prayer requests, inspired by 1 Samuel 7:12 — "Thus far the Lord has helped us."

**Developer:** Cliff McAuley (cliff@cjsdigital.ca)
**Co-developer/Tester:** Jacqueline McAuley
**Website:** stonesapp.ca

---

## 🛠️ TECH STACK

| Component | Service | Details |
|-----------|---------|---------|
| Mobile App | Expo / React Native | `c:\PROJECTS\stones-app` |
| Backend | Node-RED on Render | `https://node-red-latest-gghc.onrender.com` |
| Database | Supabase | `https://oyqdunlqqjtahlqsbxbw.supabase.co` |
| Photos | Cloudinary | Cloud: `dbrc95bup` |
| Emails | Resend | DNS verified for stonesapp.ca |
| Payments | Stripe | Live keys, custom donations working |
| Notifications | Expo Push | Production tokens |

**Bundle IDs:**
- Production: `ca.stonesapp.stones`
- Dev: `ca.stonesapp.stones.dev`

**Key User IDs:**
- Cliff: `c846327b-d066-4caf-b6c4-4d172a530051`
- Jacqueline: `e1f301eb-4b46-4b28-9eef-63c5728b99d0`

**API Keys:**
- Supabase publishable: `sb_publishable_8LzKecsn-rZls8rs4HS7gw_WNa7xOvZ`
- Supabase anon legacy: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cWR1bmxxcWp0YWhscXNieGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTc3NDYsImV4cCI6MjA5MDQ3Mzc0Nn0.6TqOXsBOrMOIdk2658pSBiiJ0pt5Drxtdl8lOK_8C5k`
- EmailJS service: `service_z5z6fnj`
- EmailJS template: `template_zcy5yk3`
- EmailJS public key: `AsoZDDC9uX1_V_qCs`

---

## 📦 CURRENT BUILD STATUS

**TestFlight:** Build 26 (v1.0.3) — in tester hands as of May 6, 2026
**Next Build:** V27 (in development)
**App.json next:** `version: "1.0.4"`, `buildNumber: "27"`

**Dev build setup:**
- `Stones (Dev)` installed alongside TestFlight
- Run via `npx expo start --dev-client` (LAN mode)
- Separate bundle ID prevents overwriting

---

## ✅ COMPLETED FEATURES (V26)

### Core Features
- ✅ Stripe donations (4 buttons in 2x2 grid: $5/$10/$25/Other)
- ✅ Custom donation amount via in-app modal → Stripe Checkout
- ✅ Scripture verse picker (18 topics, 3 verses each)
- ✅ Scripture verse inline display (full verse via bible-api.com WEB translation)
- ✅ Photo upload (expo-file-system legacy base64 + Cloudinary)
- ✅ Prayer icon persistence with batch query
- ✅ Date labels correct (Today/Yesterday/Xd ago via calendar date comparison)
- ✅ Push notifications via Expo Push API

### Wall & Stones
- ✅ Prayer Request type — toggle in DropStoneScreen, blue tag on Wall
- ✅ Prayer Request → Answered → converts to Stone testimony
- ✅ Wall filter (All / Stones / Prayer Requests)
- ✅ Wall rollups — current month expanded, past months collapsed with count, past years collapsed at year level
- ✅ Edit Stone — full screen scrollable modal with scripture picker and photo
- ✅ Answered button (creator-only)
- ✅ Scripture UX hint (write stone first before adding verse)

### Encouragement
- ✅ 💌 Encourage button on stones
- ✅ Push notification to stone owner
- ✅ `encouragements` Supabase table

### Circles
- ✅ Create/Edit/Delete circles
- ✅ Admin can edit name + logo
- ✅ Public/Private circle toggle (NEW V27)
- ✅ Discover Circles screen with search (NEW V27)
- ✅ Request to Join flow (NEW V27)
- ✅ Admin Approve/Deny pending requests (NEW V27)
- ✅ 12 member limit on FREE tier
- ✅ Compact card layout

### Auth & Account
- ✅ Sign Up with email confirmation (branded landing at stonesapp.ca/email-confirmed.html)
- ✅ Sign In with friendly error: "Credentials Not Recognised"
- ✅ Forgot Password flow with branded reset page (stonesapp.ca/reset-password.html)
- ✅ Password reset using publishable Supabase key
- ✅ Eye toggle to show password on reset page
- ✅ Auto-create public.users record via handle_new_user() trigger
- ✅ Notifications toggle with AppState listener (updates from iPhone Settings)

### Email
- ✅ Resend DNS verified
- ✅ Monthly Prayer Reminder (1st of month at 9am via cron `0 9 1 * *`)
- ✅ get_prayer_reminders RPC includes ALL users via LEFT JOIN

### Bug Fixes
- ✅ Prayer Queue — excludes user's own stones (.neq filter)
- ✅ Journey duplicates fixed — type=eq.stone filter excludes prayer requests
- ✅ Sign in error message reworked with Forgot Password link

### Test Plan
- ✅ V25/V26 test plans deployed (stonesapp.ca/stonesV26.html)
- ✅ Backlog dashboard (stonesapp.ca/backlog.html)
- ✅ How To Use updated with Forgot Password section

---

## 🚧 IN PROGRESS — PHASE 1 BADGES

**Status:** Database ready, code not started

**What's done:**
- ✅ `badges` table (catalog of 10 badge definitions)
- ✅ `user_badges` table with `earned_for_month` column
- ✅ Unique constraint on (user_id, badge_key, earned_for_month)
- ✅ RLS enabled with "Anyone can view badges" policy

**Existing badge catalog (10):**
1. `answered_prayer` — Mark 5 prayers as answered
2. `community_pillar` — Follow 10 others
3. `intercessor` — Pray for 25 others
4. `ebenezer` 🪨 — Receive 10 encouragements (monthly)
5. `first_stone` 🪨 — Drop your first stone
6. `altar_of_fire` 🔥 — Drop 10 stones
7. `faithful_witness` 📅 — Drop stones 7 days in a row
8. `barnabas` 🤝 — Send 10 encouragements in a month (NEW)
9. `faithful_ebenezer` 🌟 — Earn Ebenezer 3 months in a row (NEW)
10. `faithful_barnabas` 🌟 — Earn Barnabas 3 months in a row (NEW)

**Next steps for badges:**
1. Build Node-RED endpoint to check + award badges after each encouragement
2. Build Badges screen for the app
3. Build celebration modal when badge earned
4. Profile badge display
5. Push notification when earned

---

## 📋 BACKLOG (23 features)

**HIGH PRIORITY (V27 candidates):**
- 🫂 Circle Posts — Drop private stone/prayer to a Circle
- 📨 Invite Friends — Email/SMS invite with App Store link
- 📖 Scripture verse inline (✅ DONE)
- 🔑 Forgot Password (✅ DONE)
- 🗺️ Journey duplicates (✅ DONE)
- 🙏 Prayer Queue own stones (✅ DONE)
- 💝 Donate buttons (✅ DONE)
- 🫂 Public/Private circles (✅ DONE)
- 🙏 Prayer Wall rollups (✅ DONE)

**MEDIUM PRIORITY:**
- 🏅 Badge System Phase 1 (in progress)
- 🏅 Badge System Phase 2 — Tiered/expanded badges (YouVersion inspired)
- 🎂 User Birthday in Profile (suggested by Jacqueline)

**Backlog URL:** `https://stonesapp.ca/backlog.html`

---

## 👥 BETA TESTER STATUS

**5 testers total** — 3 active, 2 dormant

**Round 3 Results (V26):**
- ✅ Cliff McAuley — May 6, 2026 (most issues fixed in V27 dev)
  - Standout feedback: "Like to see Prayer request option to post to wall or privately into a circle"
- ⏳ Jacqueline McAuley — pending
- ⏳ 1 new tester — recently added
- ⏳ 2 dormant testers — nudged

---

## 🗄️ KEY DATABASE TABLES

### users
- id (UUID), display_name, email, avatar_url, bio, push_token, is_public, created_at

### stones  
- id, user_id, text, category, photo_url, scripture_ref, type ('stone'/'prayer_request'), answered, answered_at, is_public, created_at

### prayers
- id, user_id, stone_id, created_at

### encouragements
- id, sender_id, stone_id, created_at (UNIQUE)

### circles
- id, name, logo_url, owner_id, is_active, is_public, created_at

### circle_members
- id, circle_id, user_id, role ('admin'/'member'), status ('pending'/'approved'/'denied'), joined_at

### badges (catalog)
- id, key, name, emoji, description, requirement, category

### user_badges (earned)
- id, user_id, badge_key, earned_for_month, earned_at

### follows
- follower_id, following_id, created_at

### wall_feed (view)
- Joins stones with users, includes type and scripture_ref

---

## 📂 KEY FILES & STRUCTURE

```
c:\PROJECTS\stones-app\
├── App.js
├── app.config.js (APP_VARIANT env for dev/prod)
├── eas.json
├── package.json
└── src\
    ├── context\
    │   └── AuthContext.js
    ├── lib\
    │   ├── api.js (Node-RED API wrappers)
    │   └── supabase.js
    ├── navigation\
    │   └── AppNavigator.js
    ├── theme\
    │   └── index.js
    ├── components\
    │   └── StoneCard.js
    └── screens\
        ├── AuthScreen.js
        ├── WallScreen.js (with rollups)
        ├── DropStoneScreen.js
        ├── StoneDetailScreen.js (with inline verses)
        ├── JourneyScreen.js
        ├── PrayerQueueScreen.js
        ├── ProfileScreen.js
        ├── PublicProfileScreen.js
        ├── CirclesScreen.js (Discover button)
        ├── CircleDetailScreen.js (with Public/Private + pending requests)
        ├── DiscoverCirclesScreen.js (NEW)
        ├── AnsweredWallScreen.js
        ├── DiscoverScreen.js (legacy people discover)
        ├── HowToScreen.js
        └── SettingsScreen.js (custom donation modal)
```

---

## 🔗 STATIC HTML FILES on stonesapp.ca

- `/email-confirmed.html` — Sign up confirmation landing
- `/reset-password.html` — Password reset with eye toggle
- `/stonesV26.html` — Beta test plan V26
- `/backlog.html` — Feature backlog dashboard (23 features)
- `/launch-plan.html` — July 2026 launch plan
- `/how-to.html` — How To Use guide

---

## ⚙️ NODE-RED FLOWS

**Tabs:**
- 🪨 Stones API (Wall, Drop, Journey, Edit, Answered, Encourage)
- 🫂 Circles (organized with comments — 5 sections)
- 📧 Reminders (Monthly Prayer Reminder cron 0 9 1 * *)
- 🌐 Globals (_00 Global Init Flow)

**Key globals:**
- SUPABASE_URL
- SUPABASE_KEY (service role)
- CLOUDINARY_CLOUD/KEY/SECRET
- STRIPE_SECRET_KEY (sk_live_...)

**Important endpoints:**
- POST /stripe/checkout — Custom donations
- POST /encourage/:stone_id — Send encouragement
- GET /circles/discover — All circles
- POST /circles/:id/request — Request to join
- POST /circles/:id/approve — Admin approve
- POST /circles/:id/deny — Admin deny
- GET /circles/:id/pending — Get pending requests
- All standard CRUD on stones, circles, members

---

## 🚨 CRITICAL RULES & LESSONS LEARNED

1. **Pre-build checklist:** Confirm TestFlight build number BEFORE building, name test plan stonesV{n}.html to match
2. **Use Stones (Dev) for development testing** — TestFlight for tester builds — separate bundle IDs prevent overwriting
3. **Strict compliance to backlog ordering** — no deviations
4. **All `circle.` references must use `currentCircle` state** for live updates after edit
5. **Render free tier cold starts** — first request can take 30-60 seconds after idle
6. **Stripe Payment Links don't support customer-chosen prices** — must use Checkout Sessions for custom amounts
7. **Supabase anon key migrated to publishable format** (`sb_publishable_...`) — legacy anon doesn't work for setSession in browser
8. **WEB Bible translation used for inline verses** (waiting on Tyndale NLT permission)

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Continue with Phase 1 Badges:**
   - Build Node-RED endpoint to award badges after encouragement
   - Build Badges screen
   - Build celebration modal
   - Add badges to Profile screen

2. **Then move through remaining HIGH priority backlog items**

3. **When V27 backlog complete:**
   - Build V27 (bump to v1.0.4, buildNumber 27)
   - Create V27 test plan (stonesV27.html)
   - Send to testers

---

## 💬 FIRST MESSAGE FOR NEW SESSION

Copy this and paste in your first message to the new Team account:

> "I'm continuing the Stones app project. Please read my handoff document below to get all context. Once you've reviewed it we'll continue with Phase 1 Badges — specifically building the Node-RED endpoint to check + award badges after each encouragement. The database is already prepared with badges and user_badges tables."

Then paste this entire document.

---

🙏 **Thus far the Lord has helped us.** — 1 Samuel 7:12 🪨
