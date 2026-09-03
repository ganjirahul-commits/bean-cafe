# Updating Bean Cafe (checkout, cash, dues)

You already have the app live and the login working. This update adds the daily
**Check out**, **counter cash**, **dues ledger**, and **shelf carry-over**.
Two quick steps:

## 1. Upgrade the database (once)
In Supabase → SQL Editor → New query, paste all of **upgrade.sql** and Run.
Look for "Success". It only adds new tables — your products and login are untouched.

## 2. Re-upload the app
On Netlify, open your **beancafe12** site → **Deploys** tab → drag the new
`bean-cafe` folder (or the zip) onto the drop area at the bottom.
Then open beancafe12.netlify.app and hard-refresh (Ctrl/Cmd+Shift+R).

## How the day works now
- **Daily tab:** set the morning's **counter cash**, tap quantities of stock you
  **bought today**, and add any **dues** (name / amount / phone) as customers take credit.
- Tap **Check out** → count what's **left on the shelf** for each item (or tap *Sold out*).
  You must account for every item before it lets you close.
- You then see the **day summary**: profit, items sold, sales, cash that should be in the
  drawer, dues owed, and shelf value carried to tomorrow. Confirm to close the day.
- Leftover stock automatically becomes tomorrow's **opening shelf**.
- **Dues tab:** everyone who owes you, running total, and a *Mark paid* button.

Money ties together as:
`cash in drawer = cash loaded + (sales − dues) − stock bought`.
