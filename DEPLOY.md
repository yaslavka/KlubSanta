# Klub Santa — развёртывание на сервере (Ubuntu, без Docker)

Пошаговая инструкция для конкретно этого проекта: Next.js 16 (standalone-сборка) + Prisma + PostgreSQL (Supabase или локальный) + **Apache** + systemd + Let's Encrypt.

Примеры используют домен `klubsanta.com` и пользователя `klubsanta` — замените на свои.

---

## 0. Что понадобится заранее

| Что | Зачем | Где взять |
|---|---|---|
| VPS: Ubuntu 22.04/24.04, 1 vCPU / 1 ГБ RAM / 20 ГБ | сам сайт | любой провайдер |
| Домен, A-запись → IP сервера | HTTPS, вебхуки | регистратор домена |
| Аккаунт Supabase **или** свой Postgres | база данных | supabase.com |
| Аккаунт Stripe | приём платежей | dashboard.stripe.com |
| Аккаунт HeyGen | генерация ИИ-видео | app.heygen.com |
| Аккаунт Resend | письма (подтверждения, ссылки на видео) | resend.com |

> ⚠️ Сборка Next.js на VPS с 1 ГБ RAM может упасть по памяти — в шаге 2 добавляем swap. Это не опция, а необходимость.

Без ключей Stripe/HeyGen/Resend сайт тоже запустится: платежи уйдут во встроенный sandbox, письма будут записываться в лог, видео — копиться в очереди. Поэтому можно развернуть «пустую» систему и подключать провайдеров позже.

---

## 1. Подготовка сервера

```bash
# зайти по SSH под root
ssh root@IP_СЕРВЕРА

# обновления + базовый набор
apt update && apt upgrade -y
apt install -y git curl apache2 ufw

# отдельный пользователь под приложение (не root)
adduser --disabled-password --gecos "" klubsanta
```

**Файрвол:** наружу открываем только SSH (22), HTTP (80), HTTPS (443). Порт приложения 3000 наружу НЕ открываем — к нему будет ходить только Apache.

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

**Swap (обязательно при 1 ГБ RAM):**

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h   # должно показать Swap: 2.0Gi
```

---

## 2. Установка окружения

Проект использует **Bun** (в репозитории `bun.lock`, скрипты `build`/`start`/`db:push` написаны под него). Bun — это одновременно пакетный менеджер, среда исполнения и тест-раннер: Node.js отдельно ставить не нужно.

```bash
# ставим bun под пользователя klubsanta
sudo -iu klubsanta
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun -v   # ожидаем 1.x
exit
```

> Альтернатива, если принципиально Node.js: поставить Node 22 LTS (NodeSource), вместо `bun install` — `npm install`, вместо `bun prisma/seed.ts` — `npx tsx prisma/seed.ts`, а в systemd запускать `node .next/standalone/server.js`. Всё остальное идентично.

---

## 3. Код и переменные окружения

```bash
sudo -iu klubsanta
cd /opt 2>/dev/null || cd ~
git clone https://github.com/yaslavka/KlubSanta.git klubsanta
cd klubsanta
bun install
```

Создаём `.env` в корне проекта (он в `.gitignore`, в git не попадает):

```bash
nano .env
```

Содержимое — **это сердце настройки, заполняйте внимательно**:

```ini
# ── База данных ──────────────────────────────────────────────
# Supabase → Project Settings → Database → Connection string → URI (пул соединений, порт 6543 — session pooler)
DATABASE_URL="postgresql://postgres.XXXXXXXX:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# ── Сайт ─────────────────────────────────────────────────────
# Публичный адрес БЕЗ слэша на конце. От него зависят редиректы Stripe
# и ВСЕ ссылки в письмах (в т.ч. ссылка на скачание видео).
APP_URL="https://klubsanta.com"

# Секрет подписи: админ-сессии, sandbox-платежи, JWT-ссылки на видео.
# СГЕНЕРИРУЙТЕ СВОЙ:
SESSION_SECRET="ВЫВОД_КОМАНДЫ_НИЖЕ"
```

Сгенерировать секрет (выполнить и вставить в .env):

```bash
openssl rand -base64 48
```

> ⚠️ **SESSION_SECRET не меняйте после запуска в бой.** При его смене мгновенно протухнут: все выданные ссылки на скачивание видео, все админ-сессии. Меняется только осознанно.

Ключи провайдеров добавляются в этот же `.env` по мере подключения (шаг 9):

```ini
# Stripe: пусто → встроенный sandbox-эквайринг (тестовые карты);
# sk_test_... → Stripe TEST; sk_live_... → боевой режим. Режим определяется АВТОМАТИЧЕСКИ.
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=

# Resend: пусто → письма пишутся в журнал (админка → Email log), но не отправляются.
# RESEND_API_KEY=
EMAIL_FROM="Klub Santa <letters@klubsanta.com>"

# HeyGen: пусто → оплаченные заказы копятся в очереди, диспетчинг стартует сам, как только ключ появится.
# HEYGEN_API_KEY=
# HEYGEN_SANTA_AVATAR_ID=
# HEYGEN_SANTA_VOICE_ID=
# HEYGEN_WEBHOOK_SECRET=

# Админ, который будет создан при первом seed (см. шаг 4)
ADMIN_EMAIL="vasha@pochta.ru"
ADMIN_PASSWORD="СЛОЖНЫЙ_ПАРОЛЬ_минимум_6"
```

---

## 4. Переключение на PostgreSQL и создание схемы

В ТЗ заявлен Postgres — схема уже полностью портируема, меняется одна строка:

```bash
nano prisma/schema.prisma
```

```prisma
datasource db {
  provider = "postgresql"   // было "sqlite"
  url      = env("DATABASE_URL")
}
```

Применяем схему и наполняем базу (каталог ритуалов, «Священные вопросы», настройки, админ из `ADMIN_EMAIL`/`ADMIN_PASSWORD`):

```bash
bun run db:generate    # генерация Prisma Client
bun run db:push        # создание таблиц в Postgres
bun prisma/seed.ts     # каталог + FAQ + админ (идемпотентен, существующее не перезаписывает)
```

Если всё хорошо, увидите `✓ products: …`, `✓ admin user: …`, `Seed complete.`

> Пароль админа seed создаёт **только при первом запуске**. Забыли/утеряли — сброс одной командой (под пользователем klubsanta в папке проекта):
> ```bash
> bun -e "import {PrismaClient} from '@prisma/client'; import bcrypt from 'bcryptjs'; const db=new PrismaClient(); db.adminUser.update({where:{email:'admin@klubsanta.com'},data:{passwordHash:bcrypt.hashSync('НОВЫЙ_ПАРОЛЬ',10)}}).then(()=>console.log('password updated')).finally(()=>db.\$disconnect())"
> ```

---

## 5. Сборка

```bash
bun run build
```

Скрипт собирает standalone-бандл (`.next/standalone/server.js`) и копирует в него статику — отдельно ничего копировать не нужно. На VPS с 1 ГБ RAM при включённом swap сборка проходит ~1–2 минуты.

---

## 6. Запуск как сервис (systemd)

Выходим из-под klubsanta (`exit`) и создаём юнит:

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

> Если ставили bun в другое место — поправьте путь (`which bun` под пользователем klubsanta).
> `EnvironmentFile` + собственная загрузка `.env` в Next.js дублируют друг друга намеренно: это страховка.

Запуск и автостарт:

```bash
systemctl daemon-reload
systemctl enable --now klubsanta
systemctl status klubsanta          # должно быть active (running)
curl -s http://127.0.0.1:3000/api/products | head -c 300   # должен прийти JSON каталога
```

Логи приложения теперь живут в journald:

```bash
journalctl -u klubsanta -f          # смотреть в реальном времени
journalctl -u klubsanta --since today
```

---

## 7. Apache + HTTPS

Включаем нужные модули прокси:

```bash
a2enmod proxy proxy_http headers rewrite
systemctl restart apache2
```

Создаём виртуальный хост:

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

    # Весь трафик — в Next.js на внутреннем порту
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # Чтобы приложение видело реальный протокол (важно для редиректов Stripe и ссылок в письмах)
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"

    # Статика Next.js — неизменяемая, кэш на год
    <Location "/_next/static/">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </Location>

    ErrorLog ${APACHE_LOG_DIR}/klubsanta-error.log
    CustomLog ${APACHE_LOG_DIR}/klubsanta-access.log combined
</VirtualHost>
```

Включаем сайт и выпускаем сертификат:

```bash
a2ensite klubsanta
a2dissite 000-default
apache2ctl configtest        # ожидаем: Syntax OK
systemctl reload apache2

curl -s http://klubsanta.com/api/products | head -c 120   # уже должен прийти JSON через Apache

apt install -y certbot python3-certbot-apache
certbot --apache -d klubsanta.com -d www.klubsanta.com --redirect -m vasha@pochta.ru --agree-tos
```

Certbot с плагином `--apache` сам добавит HTTPS-virtualhost, поставит редирект HTTP→HTTPS и повесит автообновление сертификата. Проверка: `curl -sI https://klubsanta.com | head -3` → `HTTP/2 200`.

> После выпуска сертификата загляните в `/etc/apache2/sites-available/klubsanta.conf` — certbot добавит туда блок `:443`. Строка `RequestHeader set X-Forwarded-Proto` должна внутри HTTPS-блока иметь значение `"https"` (certbot обычно создаёт отдельный ssl-конфиг `klubsanta-le-ssl.conf` — поправьте там). Это критично: иначе Next.js будет считать, что работает по http, и Stripe-редиректы/ссылки в письмах получат протокол http.

---

## 8. Первичный чек-лист после запуска

1. Открыть `https://klubsanta.com` — лендинг рендерится, каталог берётся из БД.
2. `https://klubsanta.com/admin` → войти под `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
3. В брони: `https://klubsanta.com/admin` → в сайдбаре горит бейдж **SANDBOX PAYMENTS** — это нормально до подключения Stripe.
4. Прогнать тестовый заказ: «Begin Ritual» на лендинге → форма → песочный чекаут → карта `4242 4242 4242 4242` → в админке появился paid-заказ и job в очереди.
5. Убедиться, что в `Settings` админки нет красных предупреждений.

---

## 9. Подключение провайдеров (когда будут аккаунты)

Все ключи добавляются в `.env` на сервере, затем `systemctl restart klubsanta`. Код менять не нужно нигде.

### 9.1 Stripe — платежи

1. `dashboard.stripe.com` → **Developers → API keys**:
   - для тестов: `Secret key` (`sk_test_…`) → в `.env`: `STRIPE_SECRET_KEY=sk_test_…`
   - для боя: включить тумблер Live и взять `sk_live_…`
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://klubsanta.com/api/webhooks/stripe`
   - События: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`
   - Signing secret (`whsec_…`) → в `.env`: `STRIPE_WEBHOOK_SECRET=whsec_…`
3. `systemctl restart klubsanta` — бейдж в админке сменится на **STRIPE·TEST** (или STRIPE·LIVE).
4. Тест: реальная оплата тестовой картой `4242 4242 4242 4242` на Stripe-hosted чекауте → заказ paid, в Stripe Dashboard платёж виден.

> Вебхук — источник истины; без него оплата всё равно подтвердится при возврате покупателя на сайт (второй, идемпотентный путь), но вебхук обязателен для боя.

### 9.2 Resend — письма

1. `resend.com` → **Domains → Add domain** → добавить DNS-записи (SPF/DKIM), которые покажет Resend, у регистратора домена. Дождаться статуса Verified.
2. **API Keys → Create** → `re_…` → в `.env`: `RESEND_API_KEY=re_…`
3. `EMAIL_FROM` должен быть адресом на **проверенном** домене (например `letters@klubsanta.com`).
4. Проверка: тестовый заказ → админка **Email log**: статус `sent` вместо `skipped_no_provider`.

### 9.3 HeyGen — ИИ-видео

1. `app.heygen.com` → **Settings → API** → создать API key → `HEYGEN_API_KEY`.
2. Выбрать/создать Санта-аватар: **Avatars** → у карточки аватара скопировать `avatar_id` → `HEYGEN_SANTA_AVATAR_ID`.
3. Голос: **Voice** (или голос аватара) → скопировать `voice_id` → `HEYGEN_SANTA_VOICE_ID`.
4. Вебхук завершения: в HeyGen указать `https://klubsanta.com/api/webhooks/heygen`, секрет → `HEYGEN_WEBHOOK_SECRET`.
   (те же поля можно вписать прямо в админке → **API & Integrations** — они сохранятся в БД и подхватятся без рестарта).

Как это работает вместе: оплачен заказ → создаётся durable-задание с автоскриптом → диспетчер отправляет его в HeyGen → HeyGen по завершении бьёт в вебхук → сайт проверяет завершение и отправляет покупателю письмо с подписанной ссылкой на видео. Если сайт был выключен в момент оплаты — задания додиспетчатся при старте, ничего не теряется.

---

## 10. Переход в боевой режим (приём реальных денег)

Чек-лист перед включением `sk_live_…`:

- [ ] Домен с HTTPS, `APP_URL=https://klubsanta.com` (не localhost!)
- [ ] Смена `SESSION_SECRET` уже НЕ планируется (иначе убьёте выданные ссылки)
- [ ] Stripe LIVE-вебхук создан, `STRIPE_WEBHOOK_SECRET` боевой (`whsec_…` из LIVE-режима)
- [ ] Домен в Resend верифицирован, письма реально доходят
- [ ] HeyGen ключи боевые, тестовое видео сгенерировалось и пришло покупателю
- [ ] Прогнать **один маленький реальный заказ** и убедиться в цепочке: оплата → письмо → видео → письмо со ссылкой

Переключение: заменить в `.env` `sk_test_…` → `sk_live_…` и `whsec_…` → боевой, `systemctl restart klubsanta`. Бейдж в админке: **STRIPE·LIVE**. Откат в тест — обратная замена, снова рестарт.

---

## 11. Обновление сайта

```bash
sudo -iu klubsanta
cd ~/klubsanta
git pull
bun install                 # если менялись зависимости
bun run db:generate && bun run db:push   # если менялась схема (db:push аккуратно: см. примечание)
bun run build
exit
systemctl restart klubsanta
```

> `db:push --accept-data-loss` синхронизирует схему как есть. Перед обновлениями с изменением схемы делайте дамп (шаг 12).

Короткая пауза 2–3 секунды на рестарте — простой практически незаметен.

---

## 12. Бэкапы

**База (Supabase):** дамп по cron на сервере:

```bash
sudo -iu klubsanta
crontab -e
```

```cron
0 3 * * * pg_dump "postgresql://postgres.XXXXXXXX:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -Fc -f /home/klubsanta/backups/klubsanta-$(date +\%F).dump
```

(`apt install -y postgresql-client` для утилиты pg_dump; папку backups создать; копировать дампы офсайт — на другой сервер/в облако, локально на той же VPS — не бэкап.)

**Конфиг:** раз и навсегда — сохранить `.env` в менеджер паролей. Без него восстановление невозможно.

**Supabase** также даёт снапшоты в Pro-плане — можно дублировать ими.

Восстановление: `pg_restore -d "$DATABASE_URL" --clean klubsanta-2026-12-01.dump`.

---

## 13. Типовые проблемы

| Симптом | Причина / лечение |
|---|---|
| `502 Bad Gateway` | приложение упало: `journalctl -u klubsanta -n 50`; чаще всего ошибка в `.env` |
| Сборка падает, `Killed` / `out of memory` | нет swap — шаг 1 (`free -h` должен показывать Swap: 2G) |
| Оплата прошла, заказ не оплачен | не совпадает `APP_URL` с реальным доменом, или вебхук смотрит на http, а не https |
| Письма со статусом `skipped_no_provider` | не задан `RESEND_API_KEY` (для тестов это норма) |
| Заказы висят `queued` в Generation jobs | нет `HEYGEN_API_KEY` — диспетчер ждёт ключ; добавите — расхватает сам |
| Ссылки на видео «Invalid or expired» | меняли `SESSION_SECRET` — старые ссылки убиты; ссылку можно перевыпустить из админки (Generation jobs) |
| Вебхук Stripe отвечает 400 | взят `whsec_` не того режима (test/live); также проверьте, что Apache проксирует тело запроса без изменений (не включайте mod_proxy_body-фильтры/перекодирование) |
| `certbot` не выпускает сертификат | A-запись домена не смотрит на сервер, или порт 80 закрыт (`ufw allow 80/tcp`) |

---

## Архитектурная справка (что где крутится)

```
Браузер ──HTTPS──> Apache :443 ──> Next.js standalone :3000 (systemd: klubsanta)
                                        │
                                        ├─> Supabase Postgres (каталог, брони, заказы, jobs, письма, настройки)
                                        ├─> Stripe API (чекаут)  <── вебхук ── Stripe
                                        ├─> Resend API (письма)
                                        └─> HeyGen API (ИИ-видео) <── вебхук ── HeyGen
```

Внешние зависимости ровно три, все — облачные API: Stripe, Resend, HeyGen. Свой Redis/воркер/Docker не нужны — постоянство обеспечивает БД (durable-очередь `GenerationJob`), а фоновые шаги выполняются в процессе Next.js.
