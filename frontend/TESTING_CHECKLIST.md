# Parent Signup & Dashboard Testing Checklist

## Overview
This checklist covers testing for the parent signup workflow, athlete management, and role-based features implemented for Empowered Sports Camp.

---

## 1. Parent Signup Flow

### 1.1 Signup Page (`/signup`)
- [ ] Form displays all required fields:
  - [ ] First Name (required)
  - [ ] Last Name (required)
  - [ ] Email (required)
  - [ ] Mobile Phone (required)
  - [ ] City (optional)
  - [ ] State dropdown (optional)
  - [ ] ZIP Code (optional)
  - [ ] "How did you hear about us?" dropdown (optional)
  - [ ] Password (required, 8+ characters)
  - [ ] Confirm Password (required)
- [ ] Validation works:
  - [ ] Shows error if passwords don't match
  - [ ] Shows error if password is less than 8 characters
  - [ ] Shows error if required fields are empty
  - [ ] Shows auth errors (duplicate email, etc.)
- [ ] Submit button shows loading state during submission
- [ ] "Already have an account?" link goes to `/login`
- [ ] Terms and Privacy Policy links work

### 1.2 Email Confirmation (`/signup/confirm`)
- [ ] Page displays when email confirmation is required
- [ ] Shows the user's email address
- [ ] "Back to Login" button works
- [ ] User receives confirmation email (if email confirmation is enabled)

### 1.3 Auth Callback
- [ ] Email confirmation link redirects to `/onboarding`
- [ ] User is logged in after confirming email

---

## 2. Onboarding Page (`/onboarding`)

### 2.1 Profile Summary Card
- [ ] Shows user's first name in welcome message
- [ ] Displays email correctly
- [ ] Displays phone if provided
- [ ] Displays location (city, state, ZIP) if provided
- [ ] "Edit" link goes to `/dashboard/settings`
- [ ] Shows completion warning if phone/location missing

### 2.2 Athletes Section
- [ ] Shows "No Athletes Yet" empty state for new users
- [ ] "Add Your First Athlete" button links to `/dashboard/athletes/new?from=onboarding`

### 2.3 Action Buttons
- [ ] "Add an Athlete" button works
- [ ] "Skip for Now, Go to Dashboard" button goes to `/dashboard`

---

## 3. Add Athlete Page (`/dashboard/athletes/new`)

### 3.1 Form Fields
- [ ] All fields display correctly:
  - [ ] First Name (required)
  - [ ] Last Name (required)
  - [ ] Date of Birth (required)
  - [ ] Gender dropdown (optional)
  - [ ] Grade dropdown (optional)
  - [ ] School Name (optional)
  - [ ] T-Shirt Size dropdown (optional)
  - [ ] Preferred Sports multi-select (optional)
  - [ ] Medical Notes textarea (optional)

### 3.2 Form Behavior
- [ ] Submit button disabled while loading
- [ ] Shows error messages for validation failures
- [ ] Success redirects to `/dashboard` (normal flow)
- [ ] Success redirects to `/dashboard` with ?from=onboarding (onboarding flow)
- [ ] "Cancel" button returns to previous page

### 3.3 Data Storage
- [ ] Athlete record created in `athletes` table
- [ ] `parent_id` correctly set to current user's ID
- [ ] All fields saved correctly

---

## 4. Parent Dashboard (`/dashboard`)

### 4.1 Data Loading
- [ ] Loading spinner shows while fetching data
- [ ] Redirects to `/login` if not authenticated
- [ ] Profile data loads from `profiles` table
- [ ] Athletes load from `athletes` table
- [ ] Registrations load with camp and athlete details

### 4.2 Header Section
- [ ] Logo and navigation links work
- [ ] "Find Camps" link goes to `/camps`
- [ ] Notification bell shows indicator for pending payments
- [ ] User menu dropdown works

### 4.3 Athletes Section
- [ ] Shows empty state when no athletes exist
- [ ] "Add Athlete" link in header works
- [ ] Each athlete card shows:
  - [ ] First name initial avatar
  - [ ] Full name
  - [ ] Calculated age from DOB
  - [ ] T-shirt size (if set)
  - [ ] Upcoming camps count
  - [ ] Completed camps count
- [ ] Clicking athlete card goes to athlete detail page

### 4.4 Registrations Section
- [ ] Tab toggle between "Upcoming" and "Past" works
- [ ] Shows count in tab labels
- [ ] Empty state shows when no registrations
- [ ] Upcoming registrations show:
  - [ ] Camp name
  - [ ] Status badge (Confirmed/Payment Due)
  - [ ] Athlete name
  - [ ] Date range
  - [ ] Location
  - [ ] Price
  - [ ] "Pay Now" button for pending payments
- [ ] Past registrations show completed camps

### 4.5 Sidebar
- [ ] Quick Actions links work:
  - [ ] Find Camps → `/camps`
  - [ ] Add Athlete → `/dashboard/athletes/new`
  - [ ] Payment History → `/dashboard/payments`
- [ ] Account section shows:
  - [ ] Full name
  - [ ] Email
  - [ ] Phone (if set)
  - [ ] Location (if set)
- [ ] Settings link works
- [ ] Logout button works

---

## 5. View-As-Role System (HQ Admin Only)

### 5.1 Role Switcher UI
- [ ] Eye icon appears in admin header for hq_admin users
- [ ] Icon hidden for non-hq_admin users
- [ ] Dropdown shows all 5 roles:
  - [ ] HQ Admin
  - [ ] Licensee Owner
  - [ ] Director
  - [ ] Coach
  - [ ] Parent
- [ ] Current role is highlighted

### 5.2 Viewing As Banner
- [ ] Purple banner appears at top when viewing as another role
- [ ] Banner shows which role is being viewed
- [ ] "Exit Preview" button clears the viewing-as state
- [ ] Banner not visible when viewing as self (hq_admin)

### 5.3 Role Behavior
- [ ] Viewing as Parent:
  - [ ] Navigation shows parent dashboard
  - [ ] Admin features hidden
- [ ] Viewing as Coach:
  - [ ] Can view camp rosters
  - [ ] Limited management access
- [ ] Viewing as Director:
  - [ ] Can manage camps
  - [ ] Cannot access licensee admin
- [ ] Viewing as Licensee Owner:
  - [ ] Full portal access
  - [ ] Cannot access HQ admin

### 5.4 Session Persistence
- [ ] Selected role persists on page refresh (sessionStorage)
- [ ] Clears on logout
- [ ] Clears on session end

---

## 6. Role-Based Navigation

### 6.1 Parent Users
- [ ] Dashboard link → `/dashboard`
- [ ] Cannot access `/admin` routes
- [ ] Cannot access `/portal` routes

### 6.2 Coach Users
- [ ] Dashboard link → `/portal`
- [ ] Can view camp rosters
- [ ] Cannot create/edit camps

### 6.3 Director Users
- [ ] Dashboard link → `/portal`
- [ ] Can manage camps
- [ ] Can view staff

### 6.4 Licensee Owner Users
- [ ] Dashboard link → `/portal`
- [ ] Full portal access
- [ ] Can manage staff and settings

### 6.5 HQ Admin Users
- [ ] Dashboard link → `/admin`
- [ ] Full system access
- [ ] Can use view-as-role feature

---

## 7. Database & Security

### 7.1 Row Level Security
- [ ] Parents can only see their own profile
- [ ] Parents can only see their own athletes
- [ ] Parents can only see registrations for their athletes
- [ ] Admins can see all data

### 7.2 Data Integrity
- [ ] User signup creates profile in `profiles` table
- [ ] User signup creates role in `user_roles` table
- [ ] Athletes linked to parent via `parent_id` foreign key
- [ ] Registrations linked to athletes via `athlete_id`

---

## 8. Mobile Responsiveness

- [ ] Signup page responsive on mobile
- [ ] Onboarding page responsive on mobile
- [ ] Dashboard responsive on mobile:
  - [ ] Grid collapses to single column
  - [ ] Cards stack vertically
  - [ ] Navigation adapts
- [ ] Add athlete form usable on mobile

---

## Known Issues / Notes

1. Payment processing not yet implemented (Pay Now button is placeholder)
2. Athlete detail page (`/dashboard/athletes/[id]`) needs to be created
3. Email notifications not yet configured
4. Password reset flow uses AWS Cognito defaults

---

## Test Data Cleanup

After testing, clean up test data:
```sql
-- Delete test registrations
DELETE FROM registrations WHERE athlete_id IN (
  SELECT id FROM athletes WHERE parent_id IN (
    SELECT id FROM profiles WHERE email LIKE '%test%'
  )
);

-- Delete test athletes
DELETE FROM athletes WHERE parent_id IN (
  SELECT id FROM profiles WHERE email LIKE '%test%'
);

-- Delete test user roles
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM profiles WHERE email LIKE '%test%'
);

-- Delete test profiles
DELETE FROM profiles WHERE email LIKE '%test%';

-- Delete test auth users (run in AWS Cognito console)
```
