# Booking SaaS

A production-ready, multi-tenant appointment booking platform with three distinct portals — **Business**, **Staff**, and **Super Admin** — plus a public customer booking flow. Built with React, Vite, Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions, Storage, Realtime), Stripe for subscriptions, and Resend for transactional email.

Fully bilingual (English and French), with light/dark theming, responsive layouts, and per-user preferences persisted to the database.

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Edge Functions](#edge-functions)
- [Security model](#security-model)
- [Manual test plan](#manual-test-plan)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [License](#license)

---

## What it does

### Public customer booking

Visitors open a business's public link (`/book/{slug}`), browse services, choose a professional (or "no preference"), pick a slot, and confirm — with or without creating an account, depending on the business's setting. Booking is race-safe; a slot disappears the moment someone else takes it.

### Business portal

A private dashboard for each business, isolated from every other tenant:

- **Overview** — today's bookings, KPIs, charts, plan banner
- **Calendar** — day / week / month views, appointment management, real-time updates
- **Appointments** — full list, search, filter, paginate, confirm / decline / complete / no-show / cancel
- **Services** — CRUD with price, duration, buffers, deposit, online-booking toggle
- **Staff** — CRUD with photo upload, service and location assignment, per-staff time off, invite login
- **Locations** — CRUD with structured address
- **Availability** — weekly opening hours, one-off closures
- **Analytics** — bookings, revenue, top services, staff performance, cancellation and no-show rates
- **Settings** — profile, logo upload, timezone, currency, booking policies, notification preferences
- **Billing** — plan overview, upgrade/downgrade, Stripe Checkout, Stripe Customer Portal
- **Notifications** — real-time bell with the last notification rows

### Staff portal

Each staff member the owner invites gets their own login at `/staff/login` and a dedicated shell:

- **Overview** — today's and upcoming bookings
- **Schedule** — read-only list of their assigned bookings
- **Working hours** — self-service editor, constrained by the business's opening hours
- **Time off** — submit requests, cancel pending ones, view history
- **My profile** — view account info, change password

Time-off requests flow to the business owner for approval; approved requests automatically block those windows from new bookings.

### Super admin portal

A dark, distinct shell for platform operations:

- **Overview** — platform stats, revenue, plan breakdown, recent activity
- **Businesses** — searchable directory, suspend / activate / close, per-business detail
- **Plans** — CRUD for subscription plans; changes reflect on the public pricing page in real time
- **Support requests** — list, filter, resolve
- **Audit log** — every privileged action
- **Administrators** — list of super admin accounts
- **My profile** — admin's own account settings

### Public marketing site

Landing page, dedicated pricing page that reads live from the database, how-it-works guide for businesses, and a searchable help center with FAQ and troubleshooting topics.

### Cross-cutting

- **Authentication** — email + password via Supabase Auth, separate login pages for each portal, role-specific guards
- **Password reset** — self-service for every role (business, staff, customer, admin)
- **Profiles** — every signed-in user can update name, phone, preferred language, email, and password from `/profile`
- **Session timeout** — auto sign-out after inactivity (15 min business/staff, 5 min admin) with a warning modal and cross-tab coordination
- **Multi-tenancy** — enforced at the database layer with Row Level Security
- **i18n** — English (default) and French, per-user preference persisted to the profile
- **Theming** — light and dark, per-portal color identity
- **Image uploads** — business logos and staff photos via Supabase Storage

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                    │
│                                                             │
│  Public /          Business       Staff         Super       │
│  Customer          Portal         Portal        Admin       │
│  Portal            /dashboard     /staff        /admin      │
│  /book/:slug                                                │
└────────┬─────────────────┬──────────────┬───────────────────┘
         │                 │              │
         │     Supabase JS Client (anon key only)
         │                 │              │
         ▼                 ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                             │
│                                                             │
│  Auth (JWT)      Postgres + RLS       Edge Functions        │
│  - email + pwd   - 20+ tables         - admin-create-staff  │
│  - password      - row policies       - send-email          │
│    reset         - triggers           - stripe-checkout     │
│                  - helper funcs       - stripe-portal       │
│                  - realtime           - stripe-webhook      │
│                  - storage                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
        ┌──────────┐              ┌──────────┐
        │  Stripe  │              │  Resend  │
        │  Subs    │              │  Email   │
        └──────────┘              └──────────┘
```

**Key principles**

- The React app holds only the **anon key**. Service-role operations run in **Edge Functions** or in Postgres functions marked `security definer`.
- Every sensitive operation is validated on the server. The client never supplies price, duration, tenant ID, customer ID, or appointment status.
- Row Level Security is enabled on every table, with policies that derive tenant access from `business_members`.
- Booking concurrency is guaranteed by a Postgres `EXCLUDE USING gist` constraint on time ranges plus a per-business advisory lock inside the booking RPC.

---

## Tech stack

**Frontend**

- React 18 + Vite
- React Router
- Recharts (dashboard charts)
- Lucide React (icons)
- date-fns + date-fns-tz
- Zod (validation)
- Plain CSS with a design-token system (no Tailwind)

**Backend**

- Supabase (PostgreSQL, Auth, RLS, Edge Functions, Storage, Realtime)
- PL/pgSQL for business logic and `security definer` RPCs
- `pg_net` for HTTP calls from triggers
- `pgcrypto`, `citext`, `btree_gist` extensions

**Integrations**

- Stripe (Checkout, Customer Portal, Webhooks)
- Resend (transactional email)

---

## Project structure

```
booking-saas/
├── public/
│   └── favicon.svg
│
├── src/
│   ├── app/
│   │   └── (app shell and providers)
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Alert.jsx
│   │   │
│   │   ├── common/
│   │   │   ├── AuthPage.jsx
│   │   │   ├── BackButton.jsx
│   │   │   ├── FloatingLanguageSwitcher.jsx
│   │   │   ├── ImagePicker.jsx
│   │   │   ├── LanguageSwitcher.jsx
│   │   │   ├── MobileDrawer.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── SessionTimer.jsx
│   │   │   └── ThemeToggle.jsx
│   │   │
│   │   ├── business/
│   │   │   ├── InviteStaffModal.jsx
│   │   │   ├── KpiCard.jsx
│   │   │   ├── MiniBarChart.jsx
│   │   │   ├── MiniLineChart.jsx
│   │   │   ├── PlanLimitBanner.jsx
│   │   │   └── TimeOffRequests.jsx
│   │   │
│   │   ├── calendar/
│   │   │   ├── AppointmentDrawer.jsx
│   │   │   ├── AppointmentFormModal.jsx
│   │   │   ├── CalendarToolbar.jsx
│   │   │   ├── DayView.jsx
│   │   │   ├── MonthView.jsx
│   │   │   └── WeekView.jsx
│   │   │
│   │   ├── admin/
│   │   │   ├── AdminCharts.jsx
│   │   │   ├── AdminKpiCard.jsx
│   │   │   └── AdminTopBar.jsx
│   │   │
│   │   ├── marketing/
│   │   │   ├── MarketingFooter.jsx
│   │   │   ├── MarketingHeader.jsx
│   │   │   └── PricingSection.jsx
│   │   │
│   │   └── public/
│   │       ├── BusinessHero.jsx
│   │       ├── HowItWorks.jsx
│   │       ├── ServiceCard.jsx
│   │       ├── StaffAvatar.jsx
│   │       ├── StaffStrip.jsx
│   │       └── StickyBookBar.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useBusiness.js
│   │   ├── useBusinessContext.js
│   │   ├── useMediaQuery.js
│   │   ├── usePlanLimits.js
│   │   ├── useRealtimeAppointments.js
│   │   └── useTheme.js
│   │
│   ├── i18n/
│   │   ├── I18nContext.jsx
│   │   └── strings.js
│   │
│   ├── layouts/
│   │   ├── AdminLayout.jsx
│   │   ├── BusinessLayout.jsx
│   │   ├── PublicLayout.jsx
│   │   └── StaffLayout.jsx
│   │
│   ├── lib/
│   │   ├── constants.js
│   │   ├── session.js
│   │   ├── supabaseClient.js
│   │   └── theme.js
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── BusinessOnboarding.jsx
│   │   │   ├── CustomerLogin.jsx
│   │   │   ├── CustomerRegister.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── StaffLogin.jsx
│   │   │
│   │   ├── business/
│   │   │   ├── Analytics.jsx
│   │   │   ├── Appointments.jsx
│   │   │   ├── Availability.jsx
│   │   │   ├── Billing.jsx
│   │   │   ├── Calendar.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Locations.jsx
│   │   │   ├── Placeholder.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Services.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── Staff.jsx
│   │   │
│   │   ├── staff/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Hours.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Schedule.jsx
│   │   │   └── TimeOff.jsx
│   │   │
│   │   ├── customer/
│   │   │   ├── Dashboard.jsx
│   │   │   └── Profile.jsx
│   │   │
│   │   ├── admin/
│   │   │   ├── Admins.jsx
│   │   │   ├── AuditLogs.jsx
│   │   │   ├── BusinessDetail.jsx
│   │   │   ├── Businesses.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Plans.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Support.jsx
│   │   │
│   │   └── public/
│   │       ├── BusinessAccount.jsx
│   │       ├── BusinessLogin.jsx
│   │       ├── BusinessRegister.jsx
│   │       ├── GetStarted.jsx
│   │       ├── Help.jsx
│   │       ├── HowItWorks.jsx
│   │       ├── Landing.jsx
│   │       ├── Pricing.jsx
│   │       ├── PublicBooking.jsx
│   │       ├── PublicConfirmation.jsx
│   │       ├── PublicServiceBooking.jsx
│   │       └── RescheduleBooking.jsx
│   │
│   ├── routes/
│   │   ├── AdminRoute.jsx
│   │   ├── AppRoutes.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── StaffRoute.jsx
│   │
│   ├── schemas/
│   │   ├── business.js
│   │   ├── location.js
│   │   ├── service.js
│   │   └── staff.js
│   │
│   ├── services/
│   │   ├── admin.js
│   │   ├── billing.js
│   │   ├── businesses.js
│   │   ├── businessHours.js
│   │   ├── businessSearch.js
│   │   ├── calendar.js
│   │   ├── closures.js
│   │   ├── customer.js
│   │   ├── locations.js
│   │   ├── planLimits.js
│   │   ├── plans.js
│   │   ├── profile.js
│   │   ├── publicBooking.js
│   │   ├── publicCustomer.js
│   │   ├── roles.js
│   │   ├── services.js
│   │   ├── staff.js
│   │   ├── staffInvite.js
│   │   ├── staffPortal.js
│   │   └── uploads.js
│   │
│   ├── styles/
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── index.css
│   │   └── tokens.css
│   │
│   ├── utils/
│   │   ├── calendar.js
│   │   ├── datetime.js
│   │   ├── format.js
│   │   ├── ics.js
│   │   ├── reference.js
│   │   └── slugify.js
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── supabase/
│   ├── functions/
│   │   ├── admin-create-staff-user/
│   │   │   ├── deno.json
│   │   │   └── index.ts
│   │   │
│   │   ├── send-email/
│   │   │   ├── deno.json
│   │   │   └── index.ts
│   │   │
│   │   ├── stripe-create-checkout/
│   │   │   ├── deno.json
│   │   │   └── index.ts
│   │   │
│   │   ├── stripe-portal/
│   │   │   ├── deno.json
│   │   │   └── index.ts
│   │   │
│   │   └── stripe-webhook/
│   │       ├── deno.json
│   │       └── index.ts
│   │
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   ├── 0003_views.sql
│   │   ├── 0004_functions.sql
│   │   ├── 0005_fix_businesses_select.sql
│   │   ├── 0006_create_business_rpc.sql
│   │   ├── 0007_booking_functions.sql
│   │   ├── 0008_booking_concurrency_fix.sql
│   │   ├── 0009_availability_null_staff_fix.sql
│   │   ├── 0010_reschedule_cancel_policies.sql
│   │   ├── 0011_admin_functions.sql
│   │   ├── 0012_calendar_analytics.sql
│   │   ├── 0013_user_roles.sql
│   │   ├── 0014_require_account.sql
│   │   ├── 0015_next_slots.sql
│   │   ├── 0016_storage_and_staff_photo.sql
│   │   ├── 0017_public_staff_photo.sql
│   │   ├── 0018_booking_reference_staff_photo.sql
│   │   ├── 0019_availability_no_preference.sql
│   │   ├── 0020_fix_set_updated_at.sql
│   │   ├── 0021_fix_business_appointments_range.sql
│   │   ├── 0022_business_plan.sql
│   │   ├── 0023_plans_public_rls.sql
│   │   ├── 0024_fix_list_public_plans.sql
│   │   ├── 0025_realtime_plans.sql
│   │   ├── 0026_add_trial_days.sql
│   │   ├── 0027_current_plan_lookup.sql
│   │   ├── 0028_plans_rpc_volatile.sql
│   │   ├── 0029_plan_limits.sql
│   │   ├── 0030_graceful_downgrade.sql
│   │   ├── 0031_locked_rows.sql
│   │   ├── 0032_admin_analytics.sql
│   │   ├── 0033_preferred_locale.sql
│   │   ├── 0034_staff_accounts.sql
│   │   ├── 0035_profile_self_service.sql
│   │   ├── 0036_notification_matrix.sql
│   │   ├── 0037_pg_net_webhook.sql
│   │   └── 0038_stripe.sql
│   │
│   └── config.toml
│
├── .env.example
├── .env.local
├── .gitignore
├── index.html
├── package.json
├── README.md
└── vite.config.js
```

---

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase account and project
- A Resend account (for email)
- A Stripe account in test mode (for billing)
- Supabase CLI installed globally: `npm install -g supabase`

### Install

```bash
git clone <your-repo-url>
cd booking-saas
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Never** put the service-role key or Stripe secret key in `.env.local`. Those go into Supabase Edge Function secrets via `supabase secrets set`.

### Link to Supabase and apply migrations

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### Deploy Edge Functions

```bash
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy admin-create-staff-user
supabase functions deploy stripe-create-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook --no-verify-jwt
```

### Set Edge Function secrets

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set FROM_EMAIL=onboarding@resend.dev
supabase secrets set FROM_NAME="Booking SaaS"
supabase secrets set APP_URL=http://localhost:5173

supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase.

### Bootstrap the first super admin

In Supabase → SQL Editor, after the user has registered via `/signup`:

```sql
insert into public.admin_users (user_id, notes)
select id, 'Initial super admin'
from auth.users
where email = 'you@yourdomain.com'
on conflict (user_id) do nothing;
```

### Run locally

```bash
npm run dev
```

App runs at http://localhost:5173.

---

## Environment variables

### Frontend (`.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `VITE_APP_URL` | Base URL of the app (used in emails and links) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (safe to expose) |

### Edge Function secrets

| Secret | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL` | All functions | Auto-injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions | Auto-injected by Supabase |
| `RESEND_API_KEY` | `send-email` | Resend API access |
| `FROM_EMAIL` | `send-email` | Sender address |
| `FROM_NAME` | `send-email` | Sender display name |
| `APP_URL` | `send-email`, Stripe functions | Base URL for email links |
| `STRIPE_SECRET_KEY` | Stripe functions | Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Webhook signature verification |

---

## Database

The schema lives in `supabase/migrations/`. Migrations are applied in numeric order.

**Identity and tenancy**

- `profiles` — mirrors `auth.users`, holds `preferred_locale`
- `admin_users` — super admin allow-list (SQL-managed only, no client writes)
- `businesses` — tenant root: booking rules, notification prefs, plan pointer
- `business_members` — maps users to businesses with role (`owner`, `manager`, `staff`)

**Subscriptions**

- `subscription_plans` — Free / Starter / Pro with feature limits
- `subscriptions` — synced from Stripe webhooks
- `stripe_events` — webhook idempotency

**Catalog**

- `locations`, `services`, `staff`, `staff_services`, `staff_locations`

**Availability**

- `business_hours`, `staff_hours`, `staff_time_off`, `business_closures`

**Booking**

- `customers` — per-business, optionally linked to `auth.users`
- `appointments` — protected by an `EXCLUDE USING gist` constraint preventing overlapping bookings per staff
- `appointment_events` — full status history

**Operations**

- `payments`, `notifications`, `time_off_requests`, `rate_limits`, `audit_logs`, `support_requests`

**Helper functions (security definer)**

- `is_business_member(business_id)`, `is_business_owner(business_id)`, `is_super_admin()`
- `my_roles()` — returns the current user's roles for portal routing
- `get_public_business(slug)` — safe public profile payload
- `get_availability(...)`, `get_next_slots_for_service(...)`
- `create_public_booking(...)`, `create_business_appointment(...)`
- `reschedule_booking_by_reference(...)`, `cancel_booking_by_reference(...)`
- `business_plan_limits(business_id)`, `switch_business_plan(...)`
- `business_analytics(...)`, `business_dashboard_summary(...)`
- `staff_my_bookings(...)`, `staff_my_hours()`, `staff_request_time_off(...)`
- `admin_*` RPCs for the super admin portal

**Triggers**

- `set_updated_at` on every table with an `updated_at` column
- `appointment_notify` and `appointment_notify_business`
- `time_off_notify_business`
- `new_business_notify_admins`
- `support_notify_admins`
- `notifications_call_send_email` — `pg_net` POST to the send-email Edge Function

---

## Edge Functions

**`admin-create-staff-user`**

Called by a business owner. Verifies ownership, generates a temp password, creates the auth user via the service role, links `staff.user_id`, inserts a `business_members` row, and queues a `staff_invite` notification.

**`send-email`**

Triggered by `pg_net` from the `notifications_call_send_email` trigger. Renders one of several templates and sends via Resend. Updates the notification row's `status` to `sent` or `failed`.

Templates: `booking_confirmed`, `booking_pending`, `booking_cancelled`, `booking_rescheduled`, `booking_completed`, `booking_no_show`, `booking_declined`, `staff_invite`, `business_new_booking`, `business_booking_cancelled`, `business_booking_rescheduled`, `business_time_off_request`, `admin_new_business`, `admin_support_request`.

**`stripe-create-checkout`**

Called by a business owner. Creates a Stripe Checkout Session for the selected plan and returns the URL.

**`stripe-portal`**

Called by a business owner. Creates a Stripe Customer Portal session so they can manage their card, view invoices, and cancel.

**`stripe-webhook`**

Receives Stripe events, verifies the signature, checks `stripe_events` for idempotency, and syncs `subscriptions` accordingly.

---

## Security model

**Row Level Security is enabled on every table. No exceptions.** Policies derive access from `auth.uid()` and, for tenant-scoped tables, from `business_members`.

**Portal separation**

- Public routes require no session
- Customer routes require an authenticated user
- Business routes require a `business_members` row with `status = 'active'`
- Staff routes require a `staff.user_id` link plus an active membership
- Admin routes require a row in `admin_users`

**Client never supplies trusted data.** Price, duration, tenant ID, customer ID, appointment status, plan, and Stripe identifiers are resolved server-side.

**Concurrency**

- Booking: `EXCLUDE USING gist` + per-business advisory lock inside the booking RPC
- Plan changes: `switch_business_plan` runs in a single transaction and gracefully deactivates excess resources

**Service-role key never touches the browser.** All privileged operations run in Edge Functions or in Postgres `SECURITY DEFINER` functions.

**Idempotency**

- Stripe webhook events are de-duplicated via `stripe_events.id`
- Booking references are unique and generated server-side

**Rate limiting**

- `check_rate_limit` throttles public booking by email + business slug

---

## Manual test plan

Two browsers or two Chrome profiles are recommended (one for the owner, one for a customer/staff member), because Supabase Auth holds a single session per browser.

1. **Public marketing site** — open `/`, click Pricing, verify plan cards load from the database and reflect admin changes in real time.
2. **Sign up a business** — `/signup`, complete the onboarding wizard.
3. **Configure** — add one service, one location, and one staff member with a photo.
4. **Public booking** — in a second browser, open `/book/{your-slug}`, book an appointment. Confirm the customer email and business email arrive (Starter plan required).
5. **Business dashboard** — the appointment appears in `/dashboard/calendar` and `/dashboard/appointments` in real time.
6. **Staff invite** — on `/dashboard/staff`, click the key icon, invite the staff member, copy the temp password.
7. **Staff portal** — in the second browser, sign in at `/staff/login`. Set working hours. Submit a time-off request.
8. **Owner approves** — on `/dashboard/staff`, approve the request.
9. **Admin portal** — sign in at `/admin/login` in a third browser. Verify the business appears in `/admin/businesses`.
10. **Plan changes** — in `/admin/plans`, edit Starter's name and price. Watch `/pricing` update in the first browser without a refresh.
11. **Downgrade** — as the business owner, downgrade to Free. Verify excess staff/services are gracefully deactivated and marked "Locked".
12. **Language** — toggle EN/FR on any page. The choice persists per user.

---

## Deployment

### Frontend

Any static host works — Vercel, Netlify, Cloudflare Pages, GitHub Pages.

Vercel:

```bash
npm install -g vercel
vercel
```

Set the same environment variables in the Vercel dashboard.

Then update Supabase Auth:

- **Site URL** = `https://yourapp.com`
- Add `https://yourapp.com/**` to **Redirect URLs**

### Backend

Supabase is already hosted. Just make sure:

- Migrations are pushed (`supabase db push`)
- Edge Functions are deployed
- Secrets are set with production values (in particular `APP_URL`)

### Stripe webhook

Point a webhook at `https://your-project.supabase.co/functions/v1/stripe-webhook`. Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Copy the signing secret to Supabase:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Roadmap

**Shipped**

- Multi-tenant architecture with RLS
- Three portals + public booking + customer accounts
- Race-safe booking engine
- Bilingual EN/FR with per-user preference
- Dark and light theming
- Session timeouts (15 min business/staff, 5 min admin)
- Plan limits with graceful downgrades
- Transactional email (Resend)
- Stripe subscriptions with feature gating

**Planned**

- Automated test suite (Vitest unit, pgTAP SQL, Playwright E2E)
- Stripe customer appointment deposits (for services with `deposit_cents > 0`)
- Business photo gallery
- Customer reviews
- Recurring bookings
- Waitlist

---

## License

Proprietary. All rights reserved.

---

Built with [React](https://react.dev), [Vite](https://vitejs.dev), [Supabase](https://supabase.com), [Stripe](https://stripe.com), and [Resend](https://resend.com).