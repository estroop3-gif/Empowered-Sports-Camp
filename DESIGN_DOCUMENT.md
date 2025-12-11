# Empowered Sports Camp - Product Design & Architecture Document

---

## Step 1: Brand and UX Translation

### Core Brand and Emotional Feel

Based on analysis of empoweredsportscamp.com, the brand conveys:

- **Confidence and Empowerment**: The entire experience centers on building girls' confidence through sports. Every touchpoint should reinforce that athletes leave camp feeling stronger, more capable, and more connected.
- **Inclusive Excellence**: Professional enough to signal quality coaching, yet warm and welcoming to first-time athletes and nervous parents alike.
- **Energy and Movement**: The brand feels active and dynamic—not static corporate. Girls in motion, team huddles, high-fives, and breakthrough moments.
- **Community and Belonging**: Beyond skills, the camp creates sisterhood and lasting connections among athletes.

### Key Design Cues

**Color Palette** (approximated from site analysis):
- **Primary Blue**: `#116DFF` - Used for CTAs, links, interactive elements. Conveys trust, energy, professionalism.
- **Deep Navy**: `#0D1E41` - Headers, navigation backgrounds, grounding elements.
- **Accent Coral/Orange**: `#FF6B35` - Energy highlights, badges, attention-grabbing moments.
- **Success Green**: `#10B981` - Confirmations, positive states, availability indicators.
- **Neutral White**: `#FFFFFF` - Clean backgrounds, breathing room.
- **Light Gray**: `#F5F7FA` - Section backgrounds, cards, subtle separation.
- **Dark Text**: `#1F2937` - Primary body text, high readability.

**Typography Vibes**:
- Clean, modern sans-serif (Inter, or similar)
- Strong hierarchy: bold, confident headings; readable body text
- Generous line height for easy scanning by busy parents

**Imagery Style**:
- Real girls playing sports (not stock photos)
- Action shots: mid-play, celebrating, coaching moments
- Diverse representation in age, skill level, and background
- Bright, natural lighting; outdoor and indoor settings
- Team huddles and leadership moments

**White Space and Layout**:
- Generous padding; nothing feels cramped
- Mobile-first responsive design
- Card-based content organization
- Clear visual hierarchy guiding users to CTAs

**Tone of Voice**:
- Empowering but not preachy: "Build confidence through every play"
- Direct and clear: Parents are busy; get to the point
- Warm and encouraging: "Every girl belongs here"
- Action-oriented: "Register now", "Find your camp", "Join the team"

### Best UX Patterns from i9 Sports

Borrowing intelligently from i9 Sports' franchise-scale UX:

1. **"Find a Program Near You" Hero Flow**: Prominent location-based search on homepage. Zip code entry with sport/age filters surfaces relevant camps immediately.

2. **Card-Based Program Browsing**: Clear visual cards showing: camp name, location, dates, age range, price, and prominent "Register" CTA.

3. **Progressive Disclosure**: Don't overwhelm parents upfront. Show essential info in cards; reveal details (schedule, what to bring, FAQs) on detail pages.

4. **Trust-Building Sections**: Testimonials from parents and athletes, "Why families choose us" blocks, coach credentials.

5. **Age-Appropriate Messaging**: Clear age ranges on every program card. Parents can quickly filter to relevant options.

6. **Member Portal**: After registration, parents access a dashboard with upcoming sessions, forms, receipts, and communication.

7. **Mobile-First Everything**: Parents browse and register on phones during soccer practice or lunch breaks.

### Product Design North Star

> **Empowered Sports Camp exists to transform how girls experience sports—building confidence, leadership, and lifelong skills through expertly coached, community-centered camp programs.**

**Who We Serve**:
- **Parents/Guardians**: Busy families seeking quality, safe, enriching summer and seasonal programming for their daughters
- **Girl Athletes (ages 5-16)**: From first-timers to experienced players, all seeking fun, growth, and belonging
- **Older Teen Athletes (14-17)**: CIT (Counselor-in-Training) programs building leadership and coaching skills
- **Coaches and Staff**: Passionate educators who need efficient tools to focus on athletes, not paperwork
- **Camp Administrators**: Small team running multiple locations who need visibility, control, and scalability

**Problems We Solve**:
- **For Parents**: "I need to find the right camp for my daughter, register easily, handle payments, and know she's in good hands."
- **For Athletes**: "I want to have fun, learn new sports, make friends, and feel like I belong."
- **For Coaches**: "I need to know who's coming, access rosters, track attendance, and communicate with families—without administrative headaches."
- **For Admins**: "I need to manage multiple camps, locations, staff, registrations, payments, waitlists, and reporting from one place."

**How It Should Feel**:
- **Visually**: Bright, active, confident—like the feeling of a winning play
- **Emotionally**: Welcoming, trustworthy, exciting—parents feel good about their choice; girls feel they belong
- **Functionally**: Fast, clear, frictionless—every task feels obvious and accomplishable

---

## Step 2: Feature Definition and User Journeys

### MVP Feature Scope (v1.0)

**Public-Facing**:
- Homepage with brand story, featured camps, testimonials
- Camp/program listing with filtering (location, age, date, sport/type)
- Individual camp detail pages with full info and registration CTA
- "Find a Camp Near You" search flow
- About/Philosophy page
- FAQ and Contact

**Registration & Payment**:
- Parent account creation and authentication
- Athlete profile management (add multiple children)
- Camp registration flow with session selection
- Stripe checkout integration
- Discount/coupon code support
- Waitlist functionality for full sessions
- Digital waiver signing
- Registration confirmation emails

**Parent Dashboard**:
- View registered camps and upcoming sessions
- Access receipts and payment history
- Complete/view required forms and waivers
- Update athlete and family information

**Admin Dashboard**:
- Metrics overview (registrations, revenue, capacity)
- Camp/session management (CRUD operations)
- Location management
- Staff/coach assignments
- Discount code management
- Registration management with filters and export
- Waitlist management

**Coach Tools**:
- View assigned sessions
- Access rosters with athlete details
- Attendance tracking
- Session notes

---

### User Stories by Role

#### Parent/Guardian

| ID | User Story | Priority |
|----|------------|----------|
| P1 | As a parent, I want to browse available camps by location so I can find options near me | Must Have |
| P2 | As a parent, I want to filter camps by my child's age so I only see relevant programs | Must Have |
| P3 | As a parent, I want to view detailed camp information (schedule, pricing, what to bring) before deciding | Must Have |
| P4 | As a parent, I want to create an account and add my children's profiles so I can register them for camps | Must Have |
| P5 | As a parent, I want to register my child for a camp and pay securely online | Must Have |
| P6 | As a parent, I want to apply a discount code during checkout | Should Have |
| P7 | As a parent, I want to join a waitlist if a session is full | Should Have |
| P8 | As a parent, I want to sign required waivers digitally during registration | Must Have |
| P9 | As a parent, I want to receive email confirmation after registration | Must Have |
| P10 | As a parent, I want to view my registrations and upcoming sessions in a dashboard | Must Have |
| P11 | As a parent, I want to access receipts for my payments | Should Have |
| P12 | As a parent, I want to update my child's information (allergies, emergency contacts) | Must Have |

#### Athlete (Older Teens)

| ID | User Story | Priority |
|----|------------|----------|
| A1 | As a teen athlete, I want to view my upcoming camp sessions | Nice to Have |
| A2 | As a teen athlete, I want to see information about what to bring and schedules | Nice to Have |
| A3 | As a CIT applicant, I want to apply for the counselor-in-training program | Should Have |

#### Coach/Staff

| ID | User Story | Priority |
|----|------------|----------|
| C1 | As a coach, I want to see which sessions I'm assigned to | Must Have |
| C2 | As a coach, I want to view the roster for my sessions with athlete details | Must Have |
| C3 | As a coach, I want to take attendance for each session | Should Have |
| C4 | As a coach, I want to add notes about individual athletes or sessions | Should Have |
| C5 | As a coach, I want to see emergency contact info for athletes | Must Have |
| C6 | As a coach, I want to print or export a roster | Should Have |

#### Admin/Owner

| ID | User Story | Priority |
|----|------------|----------|
| AD1 | As an admin, I want to see a dashboard with key metrics (registrations, revenue, capacity) | Must Have |
| AD2 | As an admin, I want to create and manage camp programs and sessions | Must Have |
| AD3 | As an admin, I want to manage locations where camps are held | Must Have |
| AD4 | As an admin, I want to assign coaches/staff to sessions | Must Have |
| AD5 | As an admin, I want to set capacity limits for sessions | Must Have |
| AD6 | As an admin, I want to create and manage discount codes | Should Have |
| AD7 | As an admin, I want to view and filter all registrations | Must Have |
| AD8 | As an admin, I want to export registration data to CSV | Should Have |
| AD9 | As an admin, I want to manage waitlists and convert to registrations | Should Have |
| AD10 | As an admin, I want to create and manage waiver templates | Should Have |
| AD11 | As an admin, I want to send email communications to registered families | Nice to Have |

---

### Key User Journeys

#### Journey 1: Parent Discovers and Registers for Camp

```
Homepage → "Find a Camp" search → Browse results → Select camp →
View details → Click "Register" → Sign in/Create account →
Add child profile → Select session → Apply discount (optional) →
Sign waiver → Checkout with Stripe → Confirmation page + email
```

#### Journey 2: Parent Manages Registrations

```
Sign in → Parent Dashboard → View "My Registrations" →
Click registration → View details/receipt → Update child info →
View upcoming sessions calendar
```

#### Journey 3: Admin Creates New Camp Session

```
Sign in → Admin Dashboard → Camp Management → "Create New Session" →
Select program type → Set location → Set dates/times →
Set capacity and pricing → Assign staff → Publish → Session live
```

#### Journey 4: Coach Views Daily Roster

```
Sign in → Coach Dashboard → "Today's Sessions" →
Select session → View roster with athlete details →
Take attendance → Add session notes → Done
```

---

## Step 3: Data Model and Architecture

### Entity Relationship Overview

```
User (Supabase Auth)
  ├── ParentProfile (1:1)
  │     └── AthleteProfile (1:many)
  │           └── Registration (1:many)
  │                 ├── Payment (1:1)
  │                 ├── SignedWaiver (1:many)
  │                 └── WaitlistEntry (0:1)
  │
  ├── StaffProfile (1:1 for coaches/admins)
  │     └── StaffAssignment (1:many)
  │
  └── AdminProfile (1:1 for admins)

Location (standalone)
  └── CampSession (1:many)

ProgramType (standalone)
  └── CampSession (1:many)

CampSession
  ├── Registration (1:many)
  ├── StaffAssignment (1:many)
  ├── WaitlistEntry (1:many)
  └── Location (many:1)

DiscountCode (standalone)
  └── Registration (1:many - applied codes)

WaiverTemplate (standalone)
  └── SignedWaiver (1:many)
```

### Detailed Table Definitions

```sql
-- ENUMS
CREATE TYPE user_role AS ENUM ('parent', 'coach', 'admin', 'super_admin');
CREATE TYPE registration_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE session_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- USERS (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'parent',
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PARENT PROFILES (additional parent-specific data)
CREATE TABLE parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  how_heard_about_us TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ATHLETE PROFILES (children)
CREATE TABLE athlete_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  school TEXT,
  grade TEXT,
  shirt_size TEXT,
  allergies TEXT,
  medical_conditions TEXT,
  medications TEXT,
  special_needs TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOCATIONS
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  amenities TEXT[],
  parking_info TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROGRAM TYPES (e.g., "All Girls Sports Camp", "CIT Program", "Indoor Soccer & Strength")
CREATE TABLE program_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  min_age INT NOT NULL,
  max_age INT NOT NULL,
  sports TEXT[], -- e.g., ['soccer', 'basketball', 'volleyball']
  highlights TEXT[], -- key selling points
  what_to_bring TEXT[],
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAMP SESSIONS (specific instances of programs at locations)
CREATE TABLE camp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type_id UUID NOT NULL REFERENCES program_types(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  name TEXT NOT NULL, -- e.g., "Summer Week 1 - Lincoln Park"
  slug TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_start_time TIME NOT NULL,
  daily_end_time TIME NOT NULL,
  capacity INT NOT NULL,
  enrolled_count INT DEFAULT 0,
  waitlist_count INT DEFAULT 0,
  price_cents INT NOT NULL, -- stored in cents
  early_bird_price_cents INT,
  early_bird_deadline DATE,
  status session_status DEFAULT 'draft',
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REGISTRATIONS
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id),
  session_id UUID NOT NULL REFERENCES camp_sessions(id),
  parent_id UUID NOT NULL REFERENCES parent_profiles(id),
  status registration_status DEFAULT 'pending',
  amount_cents INT NOT NULL,
  discount_code_id UUID REFERENCES discount_codes(id),
  discount_amount_cents INT DEFAULT 0,
  stripe_payment_intent_id TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, session_id) -- one registration per athlete per session
);

-- PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id),
  amount_cents INT NOT NULL,
  status payment_status DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  payment_method TEXT, -- 'card', 'bank', etc.
  receipt_url TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount_cents INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DISCOUNT CODES
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INT NOT NULL, -- percentage (e.g., 10 for 10%) or cents
  max_uses INT,
  current_uses INT DEFAULT 0,
  min_purchase_cents INT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  applicable_program_types UUID[], -- null means all programs
  applicable_sessions UUID[], -- null means all sessions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WAIVER TEMPLATES
CREATE TABLE waiver_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL, -- markdown or HTML
  version INT DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  applicable_program_types UUID[], -- null means all
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIGNED WAIVERS
CREATE TABLE signed_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id),
  waiver_template_id UUID NOT NULL REFERENCES waiver_templates(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_ip TEXT,
  signature_data TEXT, -- could be typed name or drawn signature data
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WAITLIST ENTRIES
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id),
  session_id UUID NOT NULL REFERENCES camp_sessions(id),
  parent_id UUID NOT NULL REFERENCES parent_profiles(id),
  position INT NOT NULL,
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- deadline to complete registration after notification
  converted_to_registration_id UUID REFERENCES registrations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, session_id)
);

-- STAFF PROFILES
CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT, -- "Head Coach", "Assistant Coach", "Director"
  bio TEXT,
  certifications TEXT[],
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- STAFF ASSIGNMENTS
CREATE TABLE staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id),
  session_id UUID NOT NULL REFERENCES camp_sessions(id),
  role TEXT NOT NULL, -- 'lead_coach', 'assistant_coach', 'coordinator'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, session_id)
);

-- ATTENDANCE (for coaches)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id),
  session_id UUID NOT NULL REFERENCES camp_sessions(id),
  date DATE NOT NULL,
  present BOOLEAN,
  notes TEXT,
  recorded_by UUID REFERENCES staff_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(registration_id, date)
);

-- SESSION NOTES (for coaches)
CREATE TABLE session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES camp_sessions(id),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id),
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_camp_sessions_dates ON camp_sessions(start_date, end_date);
CREATE INDEX idx_camp_sessions_location ON camp_sessions(location_id);
CREATE INDEX idx_camp_sessions_program ON camp_sessions(program_type_id);
CREATE INDEX idx_camp_sessions_status ON camp_sessions(status);
CREATE INDEX idx_registrations_session ON registrations(session_id);
CREATE INDEX idx_registrations_athlete ON registrations(athlete_id);
CREATE INDEX idx_registrations_parent ON registrations(parent_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_athlete_profiles_parent ON athlete_profiles(parent_id);
CREATE INDEX idx_waitlist_session ON waitlist_entries(session_id);
CREATE INDEX idx_staff_assignments_session ON staff_assignments(session_id);
```

### Backend Architecture

#### Supabase Auth & Row-Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Example RLS Policies

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Parent profiles: parents can manage their own
CREATE POLICY "Parents can view own parent profile"
  ON parent_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Athlete profiles: parents can manage their children
CREATE POLICY "Parents can view own athletes"
  ON athlete_profiles FOR SELECT
  USING (parent_id IN (
    SELECT id FROM parent_profiles WHERE user_id = auth.uid()
  ));

-- Registrations: parents see their own, coaches see their sessions, admins see all
CREATE POLICY "Parents can view own registrations"
  ON registrations FOR SELECT
  USING (parent_id IN (
    SELECT id FROM parent_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Coaches can view assigned session registrations"
  ON registrations FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM staff_assignments sa
    JOIN staff_profiles sp ON sa.staff_id = sp.id
    WHERE sp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all registrations"
  ON registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Public data: locations and published sessions are publicly readable
CREATE POLICY "Anyone can view active locations"
  ON locations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view published sessions"
  ON camp_sessions FOR SELECT
  USING (status = 'published');

CREATE POLICY "Anyone can view active program types"
  ON program_types FOR SELECT
  USING (is_active = true);
```

#### Next.js Server Architecture

```
app/
├── (public)/              # Public routes (no auth required)
│   ├── page.tsx           # Home
│   ├── camps/
│   ├── about/
│   └── contact/
├── (auth)/                # Auth routes
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── dashboard/
│   ├── layout.tsx         # Protected layout with auth check
│   ├── parent/            # Parent dashboard routes
│   ├── admin/             # Admin dashboard routes
│   └── coach/             # Coach dashboard routes
├── api/
│   ├── stripe/
│   │   └── webhook/route.ts
│   └── ... other API routes
└── actions/               # Server Actions
    ├── auth.ts
    ├── registrations.ts
    ├── camps.ts
    ├── payments.ts
    └── admin.ts
```

#### Server Actions Pattern

```typescript
// app/actions/registrations.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createRegistration(data: RegistrationInput) {
  const supabase = createServerClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Start transaction-like operations
  // 1. Validate session has capacity
  // 2. Create registration record
  // 3. Create Stripe checkout session
  // 4. Return checkout URL

  revalidatePath('/dashboard/parent')
  return { checkoutUrl }
}
```

#### Stripe Integration

```typescript
// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed':
      // Update registration status to 'confirmed'
      // Update payment record
      // Increment session enrolled_count
      // Trigger confirmation email
      break

    case 'payment_intent.payment_failed':
      // Update registration status
      // Trigger failure notification
      break

    case 'charge.refunded':
      // Update payment and registration records
      // Decrement enrolled_count
      // Trigger refund confirmation email
      break
  }

  return Response.json({ received: true })
}
```

#### Email Triggers (using Resend)

```typescript
// lib/email/index.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRegistrationConfirmation(data: {
  parentEmail: string
  parentName: string
  athleteName: string
  sessionName: string
  sessionDates: string
  locationName: string
  amount: number
}) {
  await resend.emails.send({
    from: 'Empowered Sports Camp <noreply@empoweredsportscamp.com>',
    to: data.parentEmail,
    subject: `Registration Confirmed: ${data.athleteName} - ${data.sessionName}`,
    react: RegistrationConfirmationEmail(data),
  })
}

// Trigger points:
// 1. Registration confirmation - after successful payment (Stripe webhook)
// 2. Payment receipt - same as above
// 3. Waitlist notification - when spot opens (admin action or cron)
// 4. Pre-camp info email - 3 days before start (scheduled job)
// 5. Waitlist joined - immediate after joining waitlist
```

---

## Step 4: Information Architecture and Page Map

### Public Pages

```
/                                    # Home
├── /camps                           # Camps listing with filters
│   ├── /camps?location=chicago      # Filtered by location
│   ├── /camps?age=8-10              # Filtered by age
│   └── /camps/[slug]                # Single camp details
├── /find-a-camp                     # "Find near you" flow with zip search
├── /programs                        # Program types overview
│   └── /programs/[slug]             # Single program type details
├── /about                           # About / Philosophy
├── /testimonials                    # Stories and testimonials
├── /faq                             # Frequently asked questions
├── /contact                         # Contact form
├── /login                           # Sign in
├── /register                        # Create account
└── /forgot-password                 # Password reset
```

### Authenticated Pages - Parent

```
/dashboard/parent                     # Parent dashboard home
├── /dashboard/parent/registrations   # My registrations list
│   └── /dashboard/parent/registrations/[id]  # Registration details
├── /dashboard/parent/athletes        # Manage children profiles
│   ├── /dashboard/parent/athletes/new
│   └── /dashboard/parent/athletes/[id]/edit
├── /dashboard/parent/payments        # Payment history / receipts
├── /dashboard/parent/forms           # Waivers and forms
└── /dashboard/parent/settings        # Account settings
```

### Authenticated Pages - Admin

```
/dashboard/admin                      # Admin dashboard (metrics overview)
├── /dashboard/admin/camps            # Camp session management
│   ├── /dashboard/admin/camps/new
│   └── /dashboard/admin/camps/[id]/edit
├── /dashboard/admin/programs         # Program type management
├── /dashboard/admin/locations        # Location management
├── /dashboard/admin/registrations    # All registrations (filters, export)
├── /dashboard/admin/waitlists        # Waitlist management
├── /dashboard/admin/staff            # Staff management
├── /dashboard/admin/discounts        # Discount code management
├── /dashboard/admin/waivers          # Waiver template management
├── /dashboard/admin/reports          # Reports and analytics
└── /dashboard/admin/settings         # System settings
```

### Authenticated Pages - Coach

```
/dashboard/coach                      # Coach dashboard home
├── /dashboard/coach/sessions         # My assigned sessions
│   └── /dashboard/coach/sessions/[id]  # Session detail with roster
├── /dashboard/coach/roster/[sessionId]  # Full roster view
├── /dashboard/coach/attendance/[sessionId]  # Attendance tracking
└── /dashboard/coach/notes            # Session notes
```

### Registration Flow Pages

```
/register-for-camp/[sessionSlug]      # Registration flow
├── /register-for-camp/[sessionSlug]/athlete  # Select/add athlete
├── /register-for-camp/[sessionSlug]/details  # Confirm details
├── /register-for-camp/[sessionSlug]/waivers  # Sign waivers
├── /register-for-camp/[sessionSlug]/checkout # Payment
└── /register-for-camp/[sessionSlug]/confirmation  # Success
```

---

## Step 5: UI and Layout System

### Color System (Tailwind Config)

```javascript
// tailwind.config.js colors
colors: {
  // Primary - Energetic Blue
  primary: {
    50: '#EEF4FF',
    100: '#D9E5FF',
    200: '#BCD0FF',
    300: '#8EB0FF',
    400: '#5985FF',
    500: '#116DFF',  // Main primary
    600: '#0052DB',
    700: '#0041B0',
    800: '#003691',
    900: '#002D78',
  },
  // Secondary - Deep Navy
  secondary: {
    50: '#F0F4F8',
    100: '#D9E2EC',
    200: '#BCCCDC',
    300: '#9FB3C8',
    400: '#829AB1',
    500: '#627D98',
    600: '#486581',
    700: '#334E68',
    800: '#243B53',
    900: '#0D1E41',  // Main secondary (dark nav)
  },
  // Accent - Energetic Coral
  accent: {
    50: '#FFF5F2',
    100: '#FFE8E1',
    200: '#FFD0C2',
    300: '#FFAB94',
    400: '#FF8361',
    500: '#FF6B35',  // Main accent
    600: '#E54E1B',
    700: '#BF3D14',
    800: '#992F10',
    900: '#7A250D',
  },
  // Success - Confident Green
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',  // Main success
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  // Warning
  warning: {
    500: '#F59E0B',
  },
  // Error
  error: {
    500: '#EF4444',
  },
  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F5F7FA',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
}
```

### Typography System

```javascript
// Text styles mapping to Tailwind classes

// Headings
h1: 'text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900'
h2: 'text-3xl md:text-4xl font-bold tracking-tight text-gray-900'
h3: 'text-2xl md:text-3xl font-semibold text-gray-900'
h4: 'text-xl md:text-2xl font-semibold text-gray-900'
h5: 'text-lg font-semibold text-gray-900'
h6: 'text-base font-semibold text-gray-900'

// Body
body-lg: 'text-lg text-gray-600 leading-relaxed'
body: 'text-base text-gray-600 leading-relaxed'
body-sm: 'text-sm text-gray-600'

// Special
lead: 'text-xl text-gray-600 leading-relaxed' // Intro paragraphs
label: 'text-sm font-medium text-gray-700'
caption: 'text-xs text-gray-500'
overline: 'text-xs font-semibold uppercase tracking-wider text-gray-500'
```

### Core Reusable Components

#### Navigation Bar
```tsx
<Navbar>
  <NavbarBrand />           // Logo + wordmark
  <NavbarLinks />           // Main nav items
  <NavbarActions>           // CTA + auth buttons
    <Button variant="ghost">Sign In</Button>
    <Button variant="primary">Find a Camp</Button>
  </NavbarActions>
  <NavbarMobile />          // Mobile menu trigger
</Navbar>
```

#### Hero Section
```tsx
<Hero
  title="Build Confidence Through Every Play"
  subtitle="Empowering girls through sports, leadership, and community"
  image="/hero-girls-sports.jpg"
  cta={{ label: "Find Your Camp", href: "/camps" }}
  secondaryCta={{ label: "Learn More", href: "/about" }}
/>
```

#### CTA Buttons
```tsx
// Primary - main actions
<Button variant="primary" size="lg">Register Now</Button>

// Secondary - supporting actions
<Button variant="secondary">Learn More</Button>

// Ghost - tertiary actions
<Button variant="ghost">View Details</Button>

// Sizes: sm, md, lg
// States: default, hover, active, disabled, loading
```

#### Camp Cards
```tsx
<CampCard
  image="/camp-image.jpg"
  programType="All Girls Sports Camp"
  title="Summer Week 1 - Lincoln Park"
  location="Chicago, IL"
  dates="June 10-14, 2024"
  ageRange="6-10"
  price={299}
  spotsLeft={5}
  href="/camps/summer-week-1-lincoln-park"
/>
```

#### Feature Cards
```tsx
<FeatureCard
  icon={<TrophyIcon />}
  title="Expert Coaching"
  description="All coaches are certified and background-checked professionals"
/>
```

#### Tables (Admin)
```tsx
<DataTable
  columns={columns}
  data={registrations}
  searchable
  filterable
  pagination
  onExport={handleExport}
/>
```

#### Forms
```tsx
<Form onSubmit={handleSubmit}>
  <FormField
    label="Email"
    name="email"
    type="email"
    required
    error={errors.email}
  />
  <FormSelect
    label="Select Session"
    options={sessions}
    placeholder="Choose a session..."
  />
  <FormTextarea
    label="Special Instructions"
    name="notes"
  />
  <Button type="submit" loading={isSubmitting}>
    Submit
  </Button>
</Form>
```

### Component Tree for Key Pages

#### Home Page
```
HomePage
├── Navbar
├── HeroSection
│   ├── HeroContent
│   │   ├── Heading
│   │   ├── Subheading
│   │   └── CTAButtons
│   └── HeroImage
├── FeaturedCampsSection
│   ├── SectionHeader
│   └── CampCardGrid
│       └── CampCard (×3-4)
├── FindCampSection
│   ├── SectionHeader
│   └── ZipSearchForm
├── WhyEmpoweredSection
│   ├── SectionHeader
│   └── FeatureCardGrid
│       └── FeatureCard (×4)
├── TestimonialsSection
│   ├── SectionHeader
│   └── TestimonialCarousel
│       └── TestimonialCard
├── CTABanner
└── Footer
```

#### Camps Listing Page
```
CampsPage
├── Navbar
├── PageHeader
│   ├── Breadcrumbs
│   ├── Heading
│   └── FilterBar
│       ├── LocationFilter
│       ├── AgeFilter
│       ├── DateFilter
│       └── ClearFilters
├── CampsGrid
│   └── CampCard (×n)
├── Pagination
└── Footer
```

#### Camp Details Page
```
CampDetailPage
├── Navbar
├── Breadcrumbs
├── CampHero
│   ├── CampImage
│   ├── CampMeta (dates, location, age)
│   └── PriceAndCTA
├── CampContent
│   ├── TabNavigation
│   ├── OverviewTab
│   │   ├── Description
│   │   ├── Highlights
│   │   └── SportsIncluded
│   ├── ScheduleTab
│   ├── WhatToBringTab
│   └── FAQTab
├── LocationCard
│   ├── MapEmbed
│   └── LocationDetails
├── StickyRegisterBar (mobile)
└── Footer
```

#### Parent Dashboard
```
ParentDashboard
├── DashboardLayout
│   ├── DashboardSidebar
│   │   ├── UserInfo
│   │   └── SidebarNav
│   └── DashboardContent
│       ├── WelcomeHeader
│       ├── UpcomingSessionsCard
│       │   └── SessionRow (×n)
│       ├── QuickActionsCard
│       │   └── ActionButton (×4)
│       ├── RecentRegistrationsCard
│       │   └── RegistrationRow (×n)
│       └── ActionItemsCard
│           └── ActionItem (×n)
```

#### Admin Dashboard
```
AdminDashboard
├── DashboardLayout
│   ├── AdminSidebar
│   └── DashboardContent
│       ├── MetricsGrid
│       │   ├── MetricCard (Total Registrations)
│       │   ├── MetricCard (Revenue)
│       │   ├── MetricCard (Upcoming Sessions)
│       │   └── MetricCard (Waitlist)
│       ├── RecentActivityFeed
│       ├── CapacityOverview
│       │   └── SessionCapacityBar (×n)
│       └── QuickActions
```

---

## Step 6: Next.js Project Scaffolding

### Directory Structure

```
empowered-sports-camp/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Home
│   ├── globals.css
│   ├── (public)/
│   │   ├── camps/
│   │   │   ├── page.tsx                  # Camps listing
│   │   │   └── [slug]/
│   │   │       └── page.tsx              # Camp details
│   │   ├── find-a-camp/
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── faq/
│   │   │   └── page.tsx
│   │   └── contact/
│   │       └── page.tsx
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx                    # Protected layout
│   │   ├── parent/
│   │   │   ├── page.tsx
│   │   │   ├── registrations/
│   │   │   │   └── page.tsx
│   │   │   ├── athletes/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── camps/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   ├── registrations/
│   │   │   │   └── page.tsx
│   │   │   ├── locations/
│   │   │   │   └── page.tsx
│   │   │   └── discounts/
│   │   │       └── page.tsx
│   │   └── coach/
│   │       ├── page.tsx
│   │       └── sessions/
│   │           └── [id]/
│   │               └── page.tsx
│   ├── register-for-camp/
│   │   └── [slug]/
│   │       └── page.tsx                  # Registration flow
│   └── api/
│       └── stripe/
│           └── webhook/
│               └── route.ts
├── components/
│   ├── ui/                               # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── tabs.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── navbar.tsx
│   │   ├── footer.tsx
│   │   ├── mobile-menu.tsx
│   │   ├── dashboard-layout.tsx
│   │   └── dashboard-sidebar.tsx
│   ├── camps/
│   │   ├── camp-card.tsx
│   │   ├── camp-grid.tsx
│   │   ├── camp-filters.tsx
│   │   ├── camp-hero.tsx
│   │   └── camp-details-tabs.tsx
│   ├── home/
│   │   ├── hero-section.tsx
│   │   ├── featured-camps.tsx
│   │   ├── find-camp-section.tsx
│   │   ├── why-empowered.tsx
│   │   ├── testimonials.tsx
│   │   └── cta-banner.tsx
│   ├── dashboard/
│   │   ├── metrics-card.tsx
│   │   ├── registrations-table.tsx
│   │   ├── upcoming-sessions.tsx
│   │   └── quick-actions.tsx
│   └── forms/
│       ├── registration-form.tsx
│       ├── athlete-form.tsx
│       ├── waiver-form.tsx
│       └── contact-form.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── admin.ts
│   │   └── middleware.ts
│   ├── stripe/
│   │   └── index.ts
│   ├── email/
│   │   └── index.ts
│   ├── utils.ts
│   └── constants.ts
├── actions/
│   ├── auth.ts
│   ├── camps.ts
│   ├── registrations.ts
│   ├── athletes.ts
│   └── admin.ts
├── types/
│   ├── database.ts                       # Generated from Supabase
│   └── index.ts
├── hooks/
│   ├── use-user.ts
│   └── use-camps.ts
├── middleware.ts
├── tailwind.config.ts
├── next.config.js
├── package.json
└── .env.local.example
```

See the `/frontend` directory for implementation code.

---

## Step 7: Next Steps and Development Milestones

### Milestone 1: Production-Ready Registration & Payment (4-6 weeks)

**Goal**: Complete end-to-end registration flow from camp discovery to payment confirmation.

**Deliverables**:

1. **Supabase Setup**
   - Create Supabase project and apply database schema
   - Configure Row-Level Security policies
   - Set up database triggers for `enrolled_count` updates

2. **Authentication Flow**
   - Implement Supabase Auth with email/password
   - Create sign-up flow with parent profile creation
   - Add password reset and email verification
   - Protected route middleware

3. **Registration Flow**
   - Multi-step registration form
   - Athlete profile creation/selection
   - Session selection with real-time availability
   - Digital waiver signing component
   - Discount code validation and application

4. **Stripe Integration**
   - Stripe Checkout session creation
   - Webhook handling for payment events
   - Success/failure redirect pages
   - Receipt generation and storage

5. **Email Notifications (Resend)**
   - Registration confirmation email
   - Payment receipt email
   - Welcome email with camp details

**Definition of Done**: A parent can browse camps, create an account, add their child, complete registration with payment, sign waivers, and receive confirmation email.

---

### Milestone 2: Parent & Admin Dashboards (3-4 weeks)

**Goal**: Provide parents visibility into their registrations and give admins tools to manage camp operations.

**Deliverables**:

1. **Parent Dashboard**
   - Registrations list with status indicators
   - Upcoming sessions calendar view
   - Registration detail pages with receipts
   - Athlete profile management (add/edit children)
   - Account settings (update profile, change password)

2. **Admin Dashboard - Overview**
   - Key metrics: total registrations, revenue, capacity utilization
   - Upcoming sessions widget
   - Recent activity feed
   - Quick action buttons

3. **Admin - Camp Management**
   - Camp session CRUD (create, read, update, delete)
   - Batch session creation for recurring weeks
   - Capacity and pricing management
   - Session status management (draft → published → completed)

4. **Admin - Registration Management**
   - Filterable/searchable registrations table
   - Registration detail view
   - Manual registration creation (phone orders)
   - Cancellation and refund processing
   - CSV export functionality

5. **Admin - Location & Program Management**
   - Location CRUD with address/coordinates
   - Program type configuration
   - Discount code management

**Definition of Done**: Parents can view and manage all their registration data. Admins can create/manage camp sessions, view all registrations, and export data.

---

### Milestone 3: Coach Tools & Waitlist System (2-3 weeks)

**Goal**: Equip coaches with the tools they need for camp operations and implement waitlist functionality.

**Deliverables**:

1. **Coach Dashboard**
   - Assigned sessions overview
   - Today's sessions quick view
   - Session roster with athlete details

2. **Roster Management**
   - Detailed roster view with athlete info
   - Emergency contact quick access
   - Print-friendly roster format
   - Attendance tracking by day

3. **Session Notes**
   - Per-session notes for coaches
   - Per-athlete notes (visible to team)

4. **Waitlist System**
   - Join waitlist flow for full sessions
   - Automatic position tracking
   - Admin waitlist management
   - Notification when spot opens
   - Time-limited registration window for notified parents

5. **Email Notifications**
   - Waitlist confirmation
   - Spot available notification
   - Pre-camp information email (3 days before)

**Definition of Done**: Coaches can access rosters, take attendance, and add notes. Parents can join waitlists and get notified automatically when spots open.

---

### Future Considerations (Post-MVP)

**Enhanced Features**:
- Multiple payment options (payment plans, deposits)
- Sibling discounts (automatic multi-child pricing)
- Recurring registration for returning families
- Photo/video gallery for parents
- Parent-coach messaging system
- Mobile app (React Native)

**Analytics & Reporting**:
- Registration trends dashboard
- Revenue forecasting
- Capacity optimization insights
- Marketing attribution tracking

**Integrations**:
- Calendar sync (Google Calendar, iCal)
- Accounting software (QuickBooks, Xero)
- CRM integration (HubSpot, Salesforce)
- Background check services

**Operational Tools**:
- Staff scheduling and availability
- Equipment/supply tracking
- Incident report management
- Automated post-camp surveys

---

## Summary

This document provides a comprehensive blueprint for building Empowered Sports Camp's web platform. The architecture is designed to be:

- **Scalable**: Supabase + Next.js can grow with the organization
- **Maintainable**: Clean separation of concerns, typed with TypeScript
- **User-Focused**: Every feature solves a real problem for parents, athletes, coaches, or admins
- **Brand-Aligned**: UI/UX reflects Empowered Sports Camp's mission of confidence and empowerment

The three development milestones are scoped to deliver incremental value:
1. First, enable registration and revenue
2. Second, provide visibility and management tools
3. Third, complete operational capabilities

Each milestone builds on the previous, allowing for iterative testing and feedback while moving toward a fully-featured platform.
