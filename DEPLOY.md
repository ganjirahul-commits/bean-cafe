# Bean Cafe — setup guide

Four things make this work: a free database (Supabase), the app hosted online (Netlify),
connecting them once per phone, then adding it to the home screen.

## 1. Database (Supabase)  — you have already done this
- Create a free project at supabase.com.
- Open SQL Editor → paste `schema.sql` → Run (once). Look for "Success".
- Project Settings → API Keys: copy the **publishable key** (starts `sb_publishable_…`).
- Your **Project URL** is `https://<project-id>.supabase.co`.

## 2. Host the app (Netlify Drop)
- Go to app.netlify.com/drop and drag the whole `bean-cafe` folder (or its zip) on.
- You get a live link like `https://yourname.netlify.app`.

## 3. Connect (once per phone)
- Open the link. On the "Connect your database" screen, paste the Project URL + publishable key.
- Create the shared login (email + password). Use the SAME login on both phones.
- If Supabase asks to confirm the email: Supabase → Authentication → Users → confirm, then sign in.

## 4. Make it app-like
- Android Chrome: menu ⋮ → Add to Home screen.
- iPhone Safari: Share → Add to Home Screen.

## Everyday use
- Products tab: set each item's buy/sell once → see profit per unit.
- Daily tab: tap quantities bought → see what the day's stock will make you, by category.
- Change on one phone → shows on the other within a second.

Needs internet to sync. Free limits are far beyond one cafe.
