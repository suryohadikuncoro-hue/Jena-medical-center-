# Panduan Deployment Jena Medical

## Arsitektur yang disarankan

Gunakan satu aplikasi full-stack di Cloudflare Workers:

- React + Vite untuk frontend.
- Hono + tRPC untuk API backend.
- Cloudflare Workers untuk menjalankan frontend dan backend.
- Supabase PostgreSQL untuk database.
- GitHub sebagai repository dan sumber CI/CD.

Cloudflare merekomendasikan Workers dengan Workers Assets untuk static site, SPA, dan aplikasi full-stack. Cloudflare juga menyediakan integrasi Vite dan panduan Hono + React SPA. [1] [2]

## Catatan kompatibilitas project saat ini

Project yang diterima masih menggunakan:

```text
Drizzle MySQL
mysql2
Hono Node server
api/boot.ts yang menjalankan @hono/node-server
```

Supabase menggunakan PostgreSQL, bukan MySQL. Karena itu `mysqlTable`, `mysqlEnum`, `mysql-core`, `drizzle-orm/mysql2`, dan `mysql2` perlu diganti ke PostgreSQL. Supabase menyediakan contoh resmi Drizzle dengan `pgTable`, `drizzle-orm/postgres-js`, dan package `postgres`. [3]

`@hono/node-server` juga tidak dipakai sebagai server utama ketika aplikasi dijalankan di Cloudflare Workers. Hono perlu diekspor sebagai Worker handler, misalnya melalui `fetch: app.fetch`, dan konfigurasi `wrangler.jsonc` atau plugin Vite Cloudflare.

## Langkah 1 — Siapkan project lokal

Ambil ZIP hasil perubahan lalu ekstrak. Pastikan folder repository adalah folder `app`, bukan folder yang membungkus ZIP.

```bash
cd app
cp .env.example .env
npm install
```

Jangan commit `.env`. GitHub secara eksplisit memperingatkan agar password, API key, dan secret tidak pernah di-push ke repository. [4]

Tambahkan atau pastikan `.gitignore` memuat:

```gitignore
.env
.env.*
!.env.example
node_modules
 dist
.wrangler
```

## Langkah 2 — Buat repository GitHub

Cara dengan GitHub CLI:

```bash
git init -b main
git add .
git commit -m "Initial Jena Medical application"
gh repo create jena-medical --private --source=. --remote=origin --push
```

Jika tidak memakai GitHub CLI:

1. Buat repository kosong di GitHub. Jangan centang README, license, atau `.gitignore` karena file project sudah tersedia.
2. Jalankan:

```bash
git init -b main
git add .
git commit -m "Initial Jena Medical application"
git remote add origin https://github.com/USERNAME/jena-medical.git
git push -u origin main
```

Panduan GitHub resmi menjelaskan alur `git init`, `git add`, `git commit`, `git remote add`, dan `git push`. [4]

## Langkah 3 — Buat project Supabase

1. Buka Supabase Dashboard.
2. Buat project baru.
3. Simpan database password di password manager.
4. Buka tombol **Connect**.
5. Ambil connection string dari **Shared Pooler — Transaction mode** untuk backend edge/serverless.
6. Gunakan format seperti:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres
```

Supabase menyatakan bahwa transaction pooler digunakan untuk serverless/edge function, sedangkan migration sebaiknya memakai direct connection atau session connection. Pada transaction mode, prepared statements harus dimatikan. [5]

## Langkah 4 — Migrasikan Drizzle dari MySQL ke PostgreSQL

Ubah dependency:

```bash
npm uninstall mysql2
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

Perintah yang benar tanpa typo adalah:

```bash
npm uninstall mysql2
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

Ubah import schema dari:

```ts
import { mysqlTable, mysqlEnum, serial, bigint, varchar, text, timestamp, int, boolean } from "drizzle-orm/mysql-core";
```

menjadi PostgreSQL, misalnya:

```ts
import { pgTable, pgEnum, serial, bigint, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
```

Perubahan utama yang diperlukan:

- `mysqlTable` menjadi `pgTable`.
- `mysqlEnum` menjadi `pgEnum` yang didefinisikan di luar table.
- `int` menjadi `integer`.
- Review `serial` dan `bigint` untuk tipe ID PostgreSQL.
- Review `.onUpdateNow()` karena perilakunya berbeda di PostgreSQL.
- Review query SQL mentah yang memakai sintaks atau tipe MySQL.
- Ubah koneksi dari `drizzle-orm/mysql2` ke `drizzle-orm/postgres-js`.

Contoh koneksi yang cocok untuk Workers/Supabase transaction pooler:

```ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 1,
  ssl: "require",
});

export const db = drizzle(client);
```

Jangan menjalankan koneksi database baru untuk setiap request. Buat client pada module scope agar dapat dipakai ulang oleh warm Worker instance.

## Langkah 5 — Generate dan apply schema Supabase

Setelah schema sudah PostgreSQL:

```bash
npx drizzle-kit generate
```

Untuk migration dari komputer lokal, gunakan connection string direct/session sesuai jaringan Anda:

```bash
DATABASE_URL="postgresql://..." npx drizzle-kit migrate
```

Setelah migration berhasil, cek tabel melalui Supabase Table Editor atau SQL Editor. Migration SQL lama untuk MySQL tidak boleh dijalankan mentah di Supabase karena sintaksnya memakai tipe dan aturan MySQL.

## Langkah 6 — Sesuaikan entrypoint Cloudflare Workers

Jangan menjalankan pola production Node berikut pada Worker:

```ts
serve({ fetch: app.fetch, port });
```

Buat entrypoint Worker, misalnya `src/worker.ts` atau `worker/index.ts`, yang mengekspor handler Hono:

```ts
import app from "../api/boot";

export default {
  fetch: app.fetch,
};
```

Idealnya pisahkan middleware API dari logic `if (env.isProduction) { ... @hono/node-server ... }` agar file API tidak mengimpor Node-only server saat dibundle ke Workers.

Cloudflare Vite plugin akan membangun asset frontend dan Worker bersama-sama. Konfigurasi minimal perlu memuat `main`, asset directory hasil build, dan SPA fallback. Bentuk final tergantung versi plugin yang dipakai, sehingga ikuti template resmi Cloudflare Vite/Hono saat menambahkan `wrangler.jsonc`. [1] [2]

## Langkah 7 — Tambahkan script deployment

Contoh arah script:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "deploy": "npm run build && wrangler deploy",
    "typecheck": "tsc -b"
  }
}
```

Sebelum deploy:

```bash
npm run typecheck
npm run build
npx wrangler dev
```

Tes endpoint:

```bash
curl http://localhost:8787/api/trpc/ping
```

## Langkah 8 — Deploy pertama ke Cloudflare

Install Wrangler dan login:

```bash
npm install -D wrangler
npx wrangler login
```

Tambahkan secret ke Worker. Jangan masukkan password Supabase ke `wrangler.jsonc` atau GitHub:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put APP_ID
npx wrangler secret put APP_SECRET
```

Untuk local development, simpan nilai di `.dev.vars` atau `.env` yang masuk `.gitignore`.

Deploy manual:

```bash
npm run deploy
```

Cloudflare akan memberi URL `*.workers.dev`. Setelah itu tambahkan custom domain dari Cloudflare Dashboard jika diperlukan.

## Langkah 9 — Hubungkan GitHub ke Cloudflare

Di Cloudflare Dashboard:

1. Masuk ke **Workers & Pages**.
2. Pilih **Create application** lalu **Workers**.
3. Pilih koneksi repository GitHub.
4. Pilih repository `jena-medical` dan branch `main`.
5. Atur build command sesuai project, misalnya `npm run build`.
6. Atur deploy command sesuai konfigurasi Workers, misalnya `npx wrangler deploy`.
7. Tambahkan environment variables non-rahasia pada Settings.
8. Tambahkan `DATABASE_URL`, `APP_SECRET`, dan credential lain sebagai secret, bukan variable biasa.

Cloudflare GitHub integration dapat otomatis membangun dan deploy setiap kali ada push. Untuk pull request, integrasi ini juga dapat memberikan preview URL jika konfigurasi preview build digunakan. [6]

Batasi akses GitHub App Cloudflare hanya ke repository ini, bukan seluruh account, bila memungkinkan. Cloudflare juga merekomendasikan pembatasan repository access. [6]

## Urutan kerja yang aman

```text
1. Migrasikan schema dan query ke PostgreSQL.
2. Jalankan migration di Supabase.
3. Jalankan seed data versi PostgreSQL.
4. Uji lokal dengan wrangler dev.
5. Push branch feature ke GitHub.
6. Cek preview deployment Cloudflare.
7. Uji login, pelanggan, harga khusus, pesanan, invoice, faktur, dan laporan.
8. Merge ke main.
9. Cloudflare deploy production.
```

## Hal yang perlu diperbaiki sebelum production

Project ini belum boleh langsung diarahkan ke production sebelum tiga hal berikut selesai:

1. **Migrasi MySQL ke PostgreSQL.** Supabase tidak kompatibel langsung dengan driver `mysql2`.
2. **Pemisahan Node server dan Worker runtime.** `@hono/node-server` bukan entrypoint untuk Cloudflare Workers.
3. **Autentikasi dan authorization.** Source saat ini menggunakan `publicQuery`, sehingga endpoint bisnis belum aman untuk aplikasi production.

Untuk aplikasi keuangan/medis, tambahkan Supabase Auth atau sistem session yang jelas, lalu lindungi mutation dan query berdasarkan role pengguna.

## Referensi resmi

[1]: https://developers.cloudflare.com/workers/vite-plugin/ "Cloudflare Vite plugin"
[2]: https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/ "Cloudflare Hono and React SPA"
[3]: https://supabase.com/docs/guides/database/drizzle "Supabase Drizzle ORM"
[4]: https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github "GitHub adding locally hosted code"
[5]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase database connection methods"
[6]: https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/ "Cloudflare GitHub integration"
