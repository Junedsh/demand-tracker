# Demand Tracker — Store Execution & Ownership System

A web app for collecting, assigning, reviewing and tracking store demands across monthly cycles.

---

## Roles

| Role | What they can do |
|------|-----------------|
| **Admin** | Full access — add demands, review, manage all |
| **LM (Line Manager)** | Add & edit demands, view all demands |
| **Owner** | See demands assigned to them, accept/reject, update status |
| **Store** | Submit demands, view read-only status of their store's demands |

---

## Setup: Step by Step

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g. `demand-tracker`), set a strong DB password, pick a region close to Mumbai (Singapore is closest)
3. Wait ~2 minutes for the project to be ready

### Step 2 — Run the Database Schema

1. In your Supabase dashboard → **SQL Editor** → **New Query**
2. Paste the entire contents of `supabase-setup.sql`
3. Click **Run**
4. You should see "Success" — this creates the tables, triggers, and RLS policies

### Step 3 — Get your API keys

1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public key** (long JWT token)

### Step 4 — Configure the app

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Fill in your values:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 5 — Create Users

For each person who needs access:

1. Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Enter their email + a temporary password
3. After they're created, go to **SQL Editor** and run:
   ```sql
   update public.profiles
   set role = 'lm', full_name = 'Vaseem Khan'
   where email = 'vaseem@zenohealth.in';
   ```
   Roles: `admin`, `lm`, `owner`, `store`

   For store users, also set store_name:
   ```sql
   update public.profiles
   set role = 'store', full_name = 'Store Manager', store_name = '7 Rasta Byculla'
   where email = 'byculla@zenohealth.in';
   ```

### Step 6 — Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy to GitHub Pages

1. Create a GitHub repo
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/demand-tracker.git
   git push -u origin main
   ```
3. In `vite.config.js`, add your base path:
   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/demand-tracker/',  // your repo name
   })
   ```
4. Install the deploy package:
   ```bash
   npm install --save-dev gh-pages
   ```
5. Add to `package.json` scripts:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
6. Add env vars — since GitHub Pages is public, use GitHub Actions secrets. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 18
         - run: npm install
         - run: npm run build
           env:
             VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
             VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```
7. In GitHub repo → **Settings** → **Secrets** → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
8. Push — GitHub Actions will auto-deploy to `https://YOUR_USERNAME.github.io/demand-tracker/`

---

## Project Structure

```
src/
  context/      AuthContext — login state, user profile
  lib/          supabase.js — client setup
  components/
    AppShell    Sidebar + layout
    DemandModal Add/edit demand form
    ReviewModal Owner accept/reject form
    Icons       SVG icons + Badge component
  pages/
    LoginPage
    DashboardPage   Stats + recent demands (LM/Admin)
    DemandsPage     Full table with filters (LM/Admin)
    MyActionsPage   Assigned demands to review (Owner)
    StoreViewPage   Store's own demands read-only (Store)
    ProfilePage     Name, role info
  hooks/
    useToast    Toast notifications
```

---

## How the Monthly Cycle Works

1. **Mid-month**: Stores/LMs submit demands via "Add Demand" / "Submit Demand"
2. **LM** assigns department, owner, and polishes the ask
3. **Owner** gets notified (or checks "My Actions"), accepts/rejects, sets promise date
4. **Store** can log in any time to see the status of all their demands
5. Filter by Month to see April vs May vs June cycles

---

## Notes

- The `supabase-setup.sql` includes Row Level Security so users only see what they're allowed to
- Owners only see demands where `action_owner` contains their name — so name must match exactly
- The `store_name` field in profiles must exactly match the `store_name` in demands for store users to see their demands
