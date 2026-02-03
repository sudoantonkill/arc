# Interview Ace - Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to **[supabase.com](https://supabase.com)** and sign in
2. Click **"New Project"**
3. Configure:
   - **Organization**: Select or create one
   - **Name**: `interview-ace`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** (takes ~2 minutes)

---

## Step 2: Get Your API Keys

Once your project is ready:

1. In the Supabase dashboard, go to **Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: Starts with `eyJ...`

---

## Step 3: Configure the App

### Option A: Using Environment Variables (Recommended)

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```

3. Restart the dev server:
   ```bash
   npm run dev
   ```

### Option B: Using the In-App Setup Page

1. Navigate to **http://localhost:8080/setup**
2. Paste your URL and anon key
3. Click "Save & Continue"

---

## Step 4: Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/20260130000000_sync_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Cmd+Enter)

You should see: "Success. No rows returned"

---

## Step 5: Enable Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled (it is by default)
3. Optional: Enable Google/GitHub OAuth:
   - Click the provider
   - Add your OAuth credentials
   - Save

---

## Step 6: Configure Row Level Security (RLS)

The schema already includes RLS policies. Verify they're enabled:

1. Go to **Authentication** → **Policies**
2. You should see policies for each table

---

## Step 7: Test the Setup

1. Go to **http://localhost:8080**
2. Click **"Create an account"**
3. Sign up with email
4. Complete the role setup (student or interviewer)
5. You should now see the dashboard!

---

## Troubleshooting

### "Backend not configured" error
- Make sure your `.env` file is in the project root
- Restart the dev server after adding the file
- Try the `/setup` page to configure via browser

### "Invalid API key"
- Double-check you're using the **anon public** key (not the secret key)
- Make sure there are no extra spaces in your `.env` file

### Tables not found
- Run the SQL schema again
- Check the SQL Editor for any error messages

### Can't sign up
- Check **Authentication** → **Users** for any error logs
- Verify Email provider is enabled

---

## Database Tables Created

After running the schema, you'll have these tables:

| Table | Purpose |
|-------|---------|
| `user_roles` | User role assignments (student/interviewer/admin) |
| `student_profiles` | Student profile data |
| `interviewer_profiles` | Interviewer profile data with rates |
| `availability_slots` | Weekly availability calendar |
| `bookings` | Interview session bookings |
| `interview_feedback` | Detailed feedback from interviews |
| `wallets` | Interviewer earnings tracking |
| `wallet_transactions` | Payout history |
| `platform_settings` | App configuration |
| `notifications` | In-app notifications |
| `interviewer_reviews` | Student reviews for interviewers |
| `chat_messages` | Real-time chat history for interviews |
| `code_sessions` | Real-time shared code editor state |

---

## Next Steps

Once Supabase is configured:

1. **Test the student flow**: Browse interviewers, book a session
2. **Test the interviewer flow**: Set availability, accept bookings
3. **Test the admin flow**: Approve interviewers
4. **Configure Stripe** for real payments (optional)
5. **Deploy to production** with Vercel/Netlify
