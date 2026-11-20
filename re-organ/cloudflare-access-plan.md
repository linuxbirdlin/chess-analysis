# Cloudflare Access — Implementation Plan

**Goal:** Protect `chess.{domain}` with Cloudflare Zero Trust so only
Austin, Jian, and authorized emails can open the prep site.
No password to remember. First login per device = email OTP → 30-day
session cookie. Fully transparent on repeat visits.

**Cost:** $0 (Cloudflare Zero Trust free tier — up to 50 users)

---

## Architecture

```
Austin's browser
      │
      ▼
  chess.{domain}           ← custom subdomain, DNS proxied through CF
      │  (Cloudflare edge)
      │  Zero Trust → check session cookie
      │    ✓ valid  → proxy to GitHub Pages, transparent
      │    ✗ missing → email OTP screen (Cloudflare-hosted login page)
      ▼
linuxbirdlin.github.io/chess-analysis/
      │
      ▼
  HTML files (chess-auth-v1 token still present as a second layer)
```

---

## Prerequisites

| Item | Status |
|------|--------|
| Cloudflare account | ✓ exists |
| Domain in Cloudflare | ✓ confirmed |
| GitHub Pages live at `linuxbirdlin.github.io/chess-analysis/` | ✓ |

---

## Phase A — Custom Subdomain (GitHub Pages side)

### A1. Add the custom domain to GitHub Pages

```bash
# Replace chess.{domain} with your actual subdomain, e.g. chess.linuxbirdlin.com
gh api repos/linuxbirdlin/chess-analysis/pages \
  --method PUT \
  --input - <<'EOF'
{"cname": "chess.{domain}"}
EOF
```

This creates a `CNAME` file in the repo root. Commit it:

```bash
git add CNAME
git commit -m "Add custom domain chess.{domain} for GitHub Pages"
git push origin main
```

### A2. Add DNS record in Cloudflare

In the Cloudflare dashboard for `{domain}`:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | chess | linuxbirdlin.github.io | ✓ Proxied (orange cloud) |

**Critical:** The proxy must be ON (orange cloud). This is what routes traffic
through Cloudflare Access. If it's grey (DNS only), Access cannot intercept.

Via Cloudflare API:
```bash
# Get your zone ID first:
# Dashboard → {domain} → Overview → Zone ID (right sidebar)
ZONE_ID="your_zone_id_here"

curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "chess",
    "content": "linuxbirdlin.github.io",
    "proxied": true
  }'
```

### A3. Enable HTTPS in GitHub Pages

In GitHub repo Settings → Pages:
- Tick **Enforce HTTPS** (after the custom domain propagates — usually 10–30 min)

### A4. Verify

After DNS propagates, `https://chess.{domain}/austin-prep.html?key=chess2026`
should load the site (without CF Access yet — that's Phase B).

---

## Phase B — Cloudflare Zero Trust Access

### B1. Enable Zero Trust

1. Cloudflare dashboard → Left sidebar → **Zero Trust**
2. If first time: pick a team name (e.g. `linuxbirdlin`) → Free plan → Done

### B2. Create the Access Application

Zero Trust → Access → Applications → **Add an application** → **Self-hosted**

| Field | Value |
|-------|-------|
| Application name | Chess Prep |
| Session duration | 1 month (30 days) |
| Application domain | `chess.{domain}` |
| Path | `/` (leave blank or enter `*`) |

Click Next.

### B3. Create the Access Policy

| Field | Value |
|-------|-------|
| Policy name | Authorized Users |
| Action | Allow |
| Session duration | Same as app (1 month) |

Under **Configure rules → Include:**
- Rule type: **Emails**
- Emails: `austin@{email}`, `jilin@{email}` (add all authorized addresses)

Add a second rule block if needed (use "OR" logic for multiple emails):
- Or use rule type **Email domain** if you want anyone at a specific domain (less secure)

Click Next → Add application.

### B4. What the login experience looks like

First visit on a new device:
```
1. Austin visits chess.{domain}/austin-prep.html
2. Cloudflare intercepts → shows login page ("Cloudflare Access")
3. Austin enters: austin@gmail.com
4. Cloudflare sends a 6-digit code to that email (arrives in ~5 seconds)
5. Austin enters the code → access granted
6. 30-day session cookie set → no login needed for a month
```

Repeat visits (same device, within 30 days):
```
1. Austin visits any page under chess.{domain}/
2. Cloudflare checks session cookie → valid → transparent pass-through
3. Page loads normally, no prompt
```

### B5. Optional: Bypass rule for the chess2026 URL token

If you want the `?key=chess2026` URL to bypass the CF login screen
(so the old share links still work for a transition period):

Add a second policy with **Action: Bypass** and rule:
- Type: **Service Token** or leave as-is and just use email OTP everywhere

Recommendation: skip the bypass — email OTP is cleaner.

---

## Phase C — Cleanup (after CF Access is verified working)

Once Cloudflare Access is protecting the site, the `chess-auth-v1`
HTML token snippet becomes redundant. Remove it to simplify the HTML:

```bash
node scripts/inject-auth.js --revert
git add -A
git commit -m "Remove chess-auth-v1 token snippet (superseded by Cloudflare Access)"
git push origin main
```

Also update the shareable URL in all docs from:
```
https://linuxbirdlin.github.io/chess-analysis/austin-prep.html?key=chess2026
```
to:
```
https://chess.{domain}/austin-prep.html
```

---

## Phase D — Optional: Short URL for Austin

If you want an even simpler URL for Austin (e.g. `chess.{domain}` redirects
to the prep page automatically), add a Cloudflare Page Rule or Worker:

```
chess.{domain}/ → redirect to chess.{domain}/austin-prep.html
```

In Cloudflare: Rules → Redirect Rules → Add rule:
- When: URI path equals `/`
- Then: Static redirect to `/austin-prep.html`, status 302

---

## Implementation Checklist

- [ ] **A1** — Add custom domain to GitHub Pages via API
- [ ] **A2** — Add `chess` CNAME record in Cloudflare (proxied)
- [ ] **A3** — Enable HTTPS in GitHub Pages settings
- [ ] **A4** — Verify site loads at `https://chess.{domain}/`
- [ ] **B1** — Enable Zero Trust (free plan)
- [ ] **B2** — Create Self-hosted Application for `chess.{domain}`
- [ ] **B3** — Create Allow policy with authorized email list
- [ ] **B4** — Test login flow (new private window → email OTP → 30-day session)
- [ ] **C**  — After verification: revert chess-auth-v1 from HTML files, update share URL
- [ ] **D**  — (Optional) Add `/` → `/austin-prep.html` redirect rule

---

## Rollback

If something goes wrong:
1. In GitHub Pages settings → remove custom domain → site reverts to `linuxbirdlin.github.io/chess-analysis/`
2. The old `?key=chess2026` URL continues to work (tokens still in HTML until reverted)
3. Delete the CF Access application to disable the gate

---

## Notes

- Cloudflare Zero Trust free tier: unlimited applications, up to 50 users
- The email OTP is sent by Cloudflare — no SMTP setup needed
- Austin's session persists across browser restarts (it's a cookie, not in-memory)
- If Austin clears cookies, he just re-enters his email once → new 30-day session
- The CF Access login page is Cloudflare-branded; can be customized with a logo if desired
