# Klub Santa — Server Deployment Guide (Ubuntu, no Docker)

> 🇷🇺 Эта инструкция доступна на русском: [DEPLOY.md](DEPLOY.md)

A step-by-step guide written specifically for this project: Next.js 16 (standalone build) + Prisma + PostgreSQL (Supabase or self-hosted) + **Apache** + systemd + Let's Encrypt.

The examples use the domain `klubsanta.com` and the user `klubsanta` — replace them with your own.

---

## 0. What you need in advance

| What | Why | Where to get it |
|---|---|---|
| VPS: Ubuntu 22.04/24.04, 1 vCPU / 1 GB RAM / 20 GB | hosts the site | any provider |
| Domain with an A-record → server IP | HTTPS, webhooks | your domain registrar |
| Supabase account **or** your own Postgres | database | supabase.com |
| Stripe account | payment processing | dashboard.stripe.com |
| HeyGen account | AI video generation | app.heygen.com |
| Resend account | transactional email (confirmations, video links) | resend.com |

> ⚠️ Building Next.js on a 1 GB RAM VPS may run out of memory — step 1 adds swap. This is not optional; it is a necessity.

The site also runs without Stripe/HeyGen/Resend keys: payments fall back to the built-in sandbox, emails are written to the log instead of being sent, and videos queue up. So you can deploy an "empty" system first and connect providers later.

---

## 1. Server preparation

```bash
# SSH in as root
ssh root@SERVER_IP

# updates + base packages
apt update && apt upgrade -y
apt install -y git curl apache2 ufw

# a dedicated user for the app (not root)
adduser --disabled-password --gecos "" klubsanta
```

**Firewall:** only SSH (22), HTTP (80) and HTTPS (443) are exposed. The app port 3000 is NOT opened to the outside world — only Apache talks to it.

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

**Swap (mandatory on 1 GB RAM):**

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h   # should show Swap: 2.0Gi
```

---

## 2. Installing the runtime

The project uses **Bun** (the repo ships `bun.lock`, and the `build`/`start`/`db:push` scripts are written for it). Bun is a package manager, runtime and test runner in one: you do not need to install Node.js separately.

```bash
# install bun under the klubsanta user
sudo -iu klubsanta
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun -v   # expect 1.x
exit
```

> Alternative if you insist on Node.js: install Node 22 LTS (NodeSource), use `npm install` instead of `bun install`, use `npx tsx prisma/seed.ts` instead of `bun prisma/seed.ts`, and run `node .next/standalone/server.js` in systemd. Everything else is identical.

---

## 3. Code and environment variables

```bash
sudo -iu klubsanta
cd /opt 2>/dev/null || cd ~
git clone https://github.com/yaslavka/KlubSanta.git klubsanta
cd klubsanta
bun install
```

Create `.env` in the project root (it is in `.gitignore` and never reaches git):

```bash
nano .env
```

Contents — **this is the heart of the setup, fill it in carefully**:

```ini
# ── Database ─────────────────────────────────────────────────
# Supabase → Project Settings → Database → Connection string → URI
# (connection pool, port 6543 — session pooler)
DATABASE_URL="postgresql://postgres.XXXXXXXX:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# ── Site ─────────────────────────────────────────────────────
# Public URL WITHOUT a trailing slash. Stripe redirects and ALL links
# in emails (including the video download link) are built from it.
APP_URL="https://klubsanta.com"

# Signing secret: admin sessions, sandbox payments, JWT video links.
# GENERATE YOUR OWN:
SESSION_SECRET="OUTPUT_OF_THE_COMMAND_BELOW"
```

Generate the secret (run and paste into .env):

```bash
openssl rand -base64 48
```

> ⚠️ **Do NOT change SESSION_SECRET after go-live.** The moment it changes: every issued video download link dies, every admin session is logged out. Only rotate it deliberately.

Provider keys are added to the same `.env` as you connect them (step 9):

```ini
# Stripe: empty → built-in sandbox acquiring (test cards);
# sk_test_... → Stripe TEST; sk_live_... → live mode. The mode is detected AUTOMATICALLY.
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=

# Resend: empty → emails are recorded in the journal (admin → Email log) but not sent.
# RESEND_API_KEY=
EMAIL_FROM="Klub Santa <letters@klubsanta.com>"

# HeyGen: empty → paid orders pile up in the queue; dispatching starts on its own
# as soon as the key appears.
# HEYGEN_API_KEY=
# HEYGEN_SANTA_AVATAR_ID=
# HEYGEN_SANTA_VOICE_ID=
# HEYGEN_WEBHOOK_SECRET=

# Admin account created by the first seed run (see step 4)
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="STRONG_PASSWORD_min_6_chars"
```

---

## 4. Switching to PostgreSQL and creating the schema

The technical brief calls for Postgres — the schema is already fully portable, only one line changes:

```bash
nano prisma/schema.prisma
```

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

Apply the schema and populate the database (ritual catalog, "Sacred Questions", settings, admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`):

```bash
bun run db:generate    # generates the Prisma Client
bun run db:push        # creates the tables in Postgres
bun prisma/seed.ts     # catalog + FAQ + admin (idempotent, does not overwrite existing rows)
```

> ⚠️ **Warning: `db:push` can wipe your data.** After pulling schema changes on
> a live server, `prisma db push --accept-data-loss` silently **recreates
> tables** when a change is incompatible — taking bookings, orders and admin
> accounts with them. Back up first (`pg_dump`) before any schema update, then
> verify `adminUser`/`Product` afterwards and re-run the seed if the tables are
> empty. This is the exact trap behind "my admin login suddenly vanished".

If all is well you will see `✓ products: …`, `✓ admin user: …`, `Seed complete.`

> The seed sets the admin password **only on the first run**. Lost it? Reset it with a single command (as the klubsanta user, inside the project folder):
> ```bash
> bun -e "import {PrismaClient} from '@prisma/client'; import bcrypt from 'bcryptjs'; const db=new PrismaClient(); db.adminUser.update({where:{email:'admin@klubsanta.com'},data:{passwordHash:bcrypt.hashSync('NEW_PASSWORD',10)}}).then(()=>console.log('password updated')).finally(()=>db.\$disconnect())"
> ```

---

## 5. Build

```bash
bun run build
```

The script produces the standalone bundle (`.next/standalone/server.js`) and copies the static assets into it — nothing needs to be copied manually. On a 1 GB RAM VPS with swap enabled, the build takes ~1–2 minutes.

---

## 6. Running as a service (systemd)

Exit back from klubsanta (`exit`) and create the unit:

```bash
nano /etc/systemd/system/klubsanta.service
```

```ini
[Unit]
Description=Klub Santa — Next.js app
After=network.target

[Service]
Type=simple
User=klubsanta
WorkingDirectory=/home/klubsanta/klubsanta
EnvironmentFile=/home/klubsanta/klubsanta/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/home/klubsanta/.bun/bin/bun .next/standalone/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> If bun landed elsewhere, fix the path (`which bun` as the klubsanta user).
> `EnvironmentFile` and Next.js' own `.env` loading intentionally duplicate each other: it is a safety net.

Start it and enable autostart:

```bash
systemctl daemon-reload
systemctl enable --now klubsanta
systemctl status klubsanta          # should be active (running)
curl -s http://127.0.0.1:3000/api/products | head -c 300   # catalog JSON should come back
```

Application logs now live in journald:

```bash
journalctl -u klubsanta -f          # follow in real time
journalctl -u klubsanta --since today
```

---

## 7. Apache + HTTPS

Enable the required proxy modules:

```bash
a2enmod proxy proxy_http headers rewrite
systemctl restart apache2
```

Create the virtual host:

```bash
nano /etc/apache2/sites-available/klubsanta.conf
```

```apache
<VirtualHost *:80>
    ServerName klubsanta.com
    ServerAlias www.klubsanta.com

    ProxyRequests Off
    ProxyPreserveHost On
    Timeout 60

    # All traffic goes to Next.js on the internal port
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # So the app sees the real protocol (critical for Stripe redirects and email links)
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"

    # Next.js static assets are immutable — cache for a year
    <Location "/_next/static/">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </Location>

    ErrorLog ${APACHE_LOG_DIR}/klubsanta-error.log
    CustomLog ${APACHE_LOG_DIR}/klubsanta-access.log combined
</VirtualHost>
```

Enable the site and issue the certificate:

```bash
a2ensite klubsanta
a2dissite 000-default
apache2ctl configtest        # expect: Syntax OK
systemctl reload apache2

curl -s http://klubsanta.com/api/products | head -c 120   # JSON should already arrive through Apache

apt install -y certbot python3-certbot-apache
certbot --apache -d klubsanta.com -d www.klubsanta.com --redirect -m you@example.com --agree-tos
```

Certbot with the `--apache` plugin will add the HTTPS virtual host itself, install the HTTP→HTTPS redirect and set up certificate auto-renewal. Check: `curl -sI https://klubsanta.com | head -3` → `HTTP/2 200`.

> After the certificate is issued, open `/etc/apache2/sites-available/klubsanta.conf` — certbot will have added a `:443` block. Inside the HTTPS block the line `RequestHeader set X-Forwarded-Proto` must read `"https"` (certbot usually creates a separate ssl config `klubsanta-le-ssl.conf` — fix it there). This is critical: otherwise Next.js will believe it is serving http, and Stripe redirects / email links will be generated with the http protocol.

---

## 8. Post-launch checklist

1. Open `https://klubsanta.com` — the landing page renders, the catalog is served from the DB.
2. `https://klubsanta.com/admin` → log in with `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
3. Bookings: `https://klubsanta.com/admin` → the sidebar shows a **SANDBOX PAYMENTS** badge — normal until Stripe is connected.
4. Run a test order: "Begin Ritual" on the landing page → form → sandbox checkout → card `4242 4242 4242 4242` → a paid order and a queued job appear in the admin panel.
5. Make sure the admin panel's `Settings` page shows no red warnings.

---

## 9. Connecting providers (once you have accounts)

All keys go into `.env` on the server, followed by `systemctl restart klubsanta`. No code changes are needed anywhere.

### 9.1 Stripe — payments

1. `dashboard.stripe.com` → **Developers → API keys**:
   - for testing: `Secret key` (`sk_test_…`) → into `.env`: `STRIPE_SECRET_KEY=sk_test_…`
   - for live: flip the Live toggle and take `sk_live_…`
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://klubsanta.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`
   - Signing secret (`whsec_…`) → into `.env`: `STRIPE_WEBHOOK_SECRET=whsec_…`
3. `systemctl restart klubsanta` — the badge in the admin panel changes to **STRIPE·TEST** (or STRIPE·LIVE).
4. Test: a real payment with the test card `4242 4242 4242 4242` on the Stripe-hosted checkout → order becomes paid, the payment is visible in the Stripe Dashboard.

> The webhook is the source of truth; without it the payment still gets confirmed when the buyer returns to the site (the second, idempotent path), but the webhook is mandatory for production.

### 9.2 Resend — email

1. `resend.com` → **Domains → Add domain** → add the DNS records (SPF/DKIM) Resend shows you at your domain registrar. Wait for the Verified status.
2. **API Keys → Create** → `re_…` → into `.env`: `RESEND_API_KEY=re_…`
3. `EMAIL_FROM` must be an address on the **verified** domain (e.g. `letters@klubsanta.com`).
4. Check: a test order → admin panel **Email log**: status `sent` instead of `skipped_no_provider`.

### 9.3 HeyGen — AI video

1. `app.heygen.com` → **Settings → API** → create an API key → `HEYGEN_API_KEY`.
2. Pick/create a Santa avatar: **Avatars** → copy the avatar's `avatar_id` → `HEYGEN_SANTA_AVATAR_ID`.
3. Voice: **Voice** (or the avatar's voice) → copy the `voice_id` → `HEYGEN_SANTA_VOICE_ID`.
4. Completion webhook: in HeyGen set `https://klubsanta.com/api/webhooks/heygen`, secret → `HEYGEN_WEBHOOK_SECRET`.
   (the same fields can be entered right in the admin panel → **API & Integrations** — they are stored in the DB and picked up without a restart).

How it all works together: an order is paid → a durable job with an auto-generated script is created → the dispatcher submits it to HeyGen → HeyGen hits the webhook when finished → the site verifies completion and emails the buyer a signed link to the video. If the site was down at the moment of payment, the jobs are dispatched on startup — nothing is lost.

---

## 10. Going live (accepting real money)

Checklist before enabling `sk_live_…`:

- [ ] Domain with HTTPS, `APP_URL=https://klubsanta.com` (not localhost!)
- [ ] No plans to change `SESSION_SECRET` anymore (otherwise you kill all issued links)
- [ ] Stripe LIVE webhook created, `STRIPE_WEBHOOK_SECRET` is the live one (`whsec_…` from LIVE mode)
- [ ] Domain verified in Resend, emails actually arrive
- [ ] HeyGen keys are live ones, a test video generated and reached the buyer
- [ ] Run **one small real order** and verify the chain: payment → email → video → email with the link

Switching: in `.env` replace `sk_test_…` → `sk_live_…` and `whsec_…` → the live one, `systemctl restart klubsanta`. Badge in the admin panel: **STRIPE·LIVE**. Rolling back to test — reverse the substitution, restart again.

---

## 11. Updating the site

```bash
sudo -iu klubsanta
cd ~/klubsanta
git pull
bun install                 # if dependencies changed
bun run db:generate && bun run db:push   # if the schema changed (db:push carefully: see note)
bun run build
exit
systemctl restart klubsanta
```

> `db:push --accept-data-loss` syncs the schema as is. Before schema-changing updates, take a dump (step 12).

A short 2–3 second pause on restart — the downtime is barely noticeable.

---

## 12. Backups

**Database (Supabase):** a cron dump on the server:

```bash
sudo -iu klubsanta
crontab -e
```

```cron
0 3 * * * pg_dump "postgresql://postgres.XXXXXXXX:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -Fc -f /home/klubsanta/backups/klubsanta-$(date +\%F).dump
```

(`apt install -y postgresql-client` for the pg_dump utility; create the backups folder; copy dumps off-site — to another server/cloud; dumps on the same VPS are not a backup.)

**Config:** once and for all — store `.env` in a password manager. Without it, recovery is impossible.

**Supabase** also provides snapshots on the Pro plan — you can duplicate with those.

Restore: `pg_restore -d "$DATABASE_URL" --clean klubsanta-2026-12-01.dump`.

---

## 13. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `502 Bad Gateway` | the app crashed: `journalctl -u klubsanta -n 50`; most often an error in `.env` |
| Build dies, `Killed` / `out of memory` | no swap — step 1 (`free -h` must show Swap: 2G) |
| Payment went through, order not paid | `APP_URL` does not match the real domain, or the webhook points to http instead of https |
| Emails with status `skipped_no_provider` | `RESEND_API_KEY` not set (normal while testing) |
| Orders stuck `queued` in Generation jobs | no `HEYGEN_API_KEY` — the dispatcher is waiting for the key; add it and it picks the jobs up itself |
| Video links "Invalid or expired" | you changed `SESSION_SECRET` — old links are dead; a link can be re-issued from the admin panel (Generation jobs) |
| Stripe webhook replies 400 | wrong-mode `whsec_` (test/live); also make sure Apache proxies the request body unchanged (do not enable mod_proxy body filters/re-encoding) |
| `certbot` fails to issue a certificate | the domain's A-record does not point to the server, or port 80 is closed (`ufw allow 80/tcp`) |

---

## Architecture overview (what runs where)

```
Browser ──HTTPS──> Apache :443 ──> Next.js standalone :3000 (systemd: klubsanta)
                                        │
                                        ├─> Supabase Postgres (catalog, bookings, orders, jobs, emails, settings)
                                        ├─> Stripe API (checkout)  <── webhook ── Stripe
                                        ├─> Resend API (email)
                                        └─> HeyGen API (AI video) <── webhook ── HeyGen
```

External dependencies are exactly three, all cloud APIs: Stripe, Resend, HeyGen. No self-hosted Redis/worker/Docker needed — the database provides persistence (the durable `GenerationJob` queue), and background steps run inside the Next.js process.
