# CRITICAL SETUP STEPS - MUST DO THESE FIRST

Your uploads and glass types won't work until you complete these manual Supabase setup steps.

## Step 1: Create the "media" Storage Bucket

**WITHOUT THIS, ALL IMAGE UPLOADS WILL FAIL**

1. Go to: https://app.supabase.com/
2. Sign in with your account
3. Select your project: "yeiafctyyaejsgpcojqu"
4. In the left sidebar, click **Storage**
5. Click **+ New bucket**
6. Name it: `media` (lowercase)
7. Uncheck "Private bucket" → Make it **PUBLIC**
8. Click **Create bucket**

✅ **Verify**: You should see a bucket named "media" in your storage list

---

## Step 2: Run the Database Schema

**WITHOUT THIS, YOU CAN'T SAVE GLASS TYPES OR OTHER DATA**

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **+ New query**
3. Open this file in VS Code: `/supabase/schema.sql`
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **Run** button (or Cmd+Enter)
7. Wait for completion - you should see a success message

✅ **Verify**: In Supabase, go to **Tables** and check you see:
- glass_types
- products
- gallery_items
- quote_requests
- custom_order_requests
- reviews
- ... and others

---

## Step 3: Test Image Upload

Once bucket is created:

1. Make sure dev server is running: `npm run dev`
2. Open browser to: http://localhost:5173
3. Navigate to Admin Dashboard
4. Go to **Glass Types** tab
5. Click **Add Glass Type**
6. Try uploading an image
7. Check browser console (F12) for logs starting with `[Upload]`

**Expected**:
- Toast says "Image uploaded!"
- Image appears in the form
- No errors in console

**If it fails**:
- Check console for `[Supabase Upload]` error details
- Verify "media" bucket exists and is PUBLIC
- Check network tab in DevTools

---

## Step 4: Test Glass Type Save

1. Fill the form:
   - Glass Name: "Test Mirror"
   - Category: "mirror" (select from dropdown)
   - Price per Sq Ft: "700"
   - Upload an image
2. Click **Add Glass Type**
3. Check for toast: "Glass type added!"

**Expected**:
- Modal closes
- Glass type appears in the list
- Entry shows in Supabase: go to Tables → glass_types → see new row

**If it fails**:
- Check console for errors
- Verify schema.sql was executed (check Tables in Supabase)
- Check browser DevTools Network tab for failed requests

---

## Step 5: Verify Category Dropdown Works

The dropdown should show:
- clear
- tinted
- frosted
- toughened
- laminated
- mirror
- one-way
- shower
- table-top
- office-partition
- window
- decorative

If dropdown doesn't appear or won't open:
1. Check browser console for errors
2. Open DevTools → Elements → inspect the Select component
3. Check if it's rendering (look for `role="combobox"`)

---

## Debugging Commands

If you hit issues, run these in terminal:

```bash
# Check if dev server is running
npm run dev

# Check for build errors
npm run build

# Clear cache and reinstall
npm cache clean --force
npm ci
```

---

## Critical Environment Variables

Make sure `.env.local` exists in root and `leader_glazier/` with:

```
VITE_SUPABASE_URL=https://yeiafctyyaejsgpcojqu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllaWFmY3R5eWFlanNncGNvanF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTQ3ODYsImV4cCI6MjA5NDk3MDc4Nn0.jcy7IT06TjZeIjFEJ-4Ogg_8e44EeL2jjVRO-KAlEeU
VITE_ADMIN_PASSWORD=admin2020
```

⚠️ **NOTE**: These are already set, but if env variables stop working, regenerate them from Supabase project settings.

---

## What Gets Blocked?

❌ **Image uploads fail** if "media" bucket doesn't exist → `[Supabase Upload] Error`

❌ **Glass types won't save** if schema.sql not run → database tables don't exist → 400/404 errors

❌ **Category dropdown issues** might be display bug OR state sync issue → check DevTools

❌ **Glass types won't display** without schema.sql → gallery and quote calculator won't work

---

**Next**: Complete Step 1 & 2, then message when you've done it and we'll test the full flow together.
