# Audit Kesiapan Jena Medical Center

Tanggal audit: 26 Oktober 2026  
Metode: inspeksi read-only source code, TypeScript check, lint, dan Wrangler dry-run. Tidak ada data produksi yang diubah.

## Kesimpulan eksekutif

Status aplikasi saat ini: **BELUM SIAP untuk masuk tahap desain UI/UX penuh**.

Fondasi frontend sudah berjalan dan beberapa bagian sudah baik: route internal konsisten, SPA fallback Pages tersedia, TypeScript lulus, autentikasi bearer dasar tersedia, CORS tidak menunjukkan wildcard, dan tidak ditemukan secret aktif pada snapshot repository.

Namun terdapat blocker keamanan dan integritas transaksi yang harus diselesaikan lebih dahulu. Risiko terbesar adalah seluruh user yang sudah login dapat memanggil seluruh mutation backend, mutation finansial dan stok tidak atomik, pembayaran dapat dibuat tanpa target valid atau melebihi saldo, serta konfigurasi deployment belum terdokumentasi sebagai full-stack yang reproducible.

## Prioritas perbaikan

### P0 — wajib sebelum aplikasi dianggap aman

1. **Terapkan authorization berbasis role/capability di backend.**
   `protectedProcedure` saat ini hanya memeriksa user sudah login. Role viewer, sales, warehouse, finance, dan admin belum membatasi mutation. Mutation pembayaran, posting, hapus data, issue invoice, dan konfirmasi PO dapat dipanggil oleh user terautentikasi mana pun.
   - Area: `api/middleware.ts`, seluruh router di `api/routers/`
   - Tindakan: buat `requireRole`/`requirePermission`, pasang eksplisit pada setiap procedure, lalu buat matriks role.

2. **Perbaiki boundary RLS dan koneksi database.**
   RLS didefinisikan di migration, tetapi API memakai koneksi PostgreSQL/Hyperdrive langsung tanpa meneruskan identity claims. RLS belum terbukti menjadi enforcement boundary dan berpotensi dilewati jika koneksi memakai owner/service role.
   - Area: `api/context.ts`, `api/queries/connection.ts`, migration RLS
   - Tindakan: verifikasi grants dan current role di Supabase; tetap lakukan server-side authorization walaupun RLS aktif.

3. **Hentikan retry otomatis untuk mutation.**
   `fetchWithAuth` mengulang request dengan status 5xx, termasuk POST yang memiliki side effect. Timeout setelah server berhasil dapat membuat pembayaran, order, invoice, PO, atau jurnal ganda.
   - Area: `src/providers/trpc.tsx`
   - Tindakan: retry hanya query/idempotent request; untuk mutation gunakan idempotency key dan unique constraint.

4. **Bungkus mutation multi-langkah dalam transaksi database.**
   Posting stok, jurnal, pembayaran, invoice, PO, dan update detail saat ini memakai banyak query tanpa `db.transaction`. Kegagalan di tengah proses dapat meninggalkan header/item/status/stock/journal parsial.
   - Area: `api/queries/business.ts`, `api/routers/orders.ts`, `api/routers/invoices.ts`, `api/routers/payments.ts`
   - Tindakan: gunakan transaksi end-to-end, row lock/conditional update, dan rollback test.

5. **Kunci integritas pembayaran.**
   Pembayaran saat ini dapat disimpan tanpa referensi, dengan arah yang salah, ke target yang belum issued/posted, atau melebihi outstanding. Insert bahkan dilakukan sebelum validasi target selesai.
   - Area: `api/routers/payments.ts`, `api/queries/business.ts`
   - Tindakan: discriminated input berdasarkan direction, tepat satu target, validasi status, hitung outstanding dalam transaksi, tolak overpayment.

6. **Cegah stok negatif dan posting ganda.**
   Penerbitan invoice mengurangi stok tanpa cek ketersediaan dan tanpa locking. Status draft juga belum dilindungi dari dua request concurrent.
   - Area: `api/queries/business.ts`, `db/schema.ts`, migration
   - Tindakan: atomic update stock dengan syarat cukup, `CHECK stock_qty >= 0` bila kebijakan bisnis melarang stok negatif, row lock, dan unique source posting.

### P1 — wajib sebelum go-live operasional

1. **Tambahkan foreign key, unique, dan check constraint PostgreSQL.**
   Schema bisnis hampir hanya memiliki primary key. Tidak ada FK untuk relasi transaksi, unique untuk code/SKU/nomor dokumen, dan check untuk qty/amount/debit-credit/payment reference.

2. **Ganti generator nomor yang race-prone.**
   SO/PO/INV memakai `max+1`; code master memakai `count()+1`. Gunakan sequence/atomic counter atau unique index dengan retry conflict.

3. **Perbaiki IDOR/cross-record update pada invoice.**
   `updateDraft` meng-update `invoiceItems` berdasarkan `item.id` saja tanpa membatasi `invoiceId`. Item invoice lain dapat diubah oleh request terautentikasi.

4. **Validasi state transition supplier dan invoice.**
   Pastikan supplier invoice hanya berasal dari PO yang valid/confirmed, item dan qty berada dalam PO, confirm hanya dari status yang benar, dan order/produk/supplier/customer benar-benar ada.

5. **Perbaiki posting faktur supplier dari halaman detail.**
   Server harus menolak `printedTotal` yang berbeda dari total computed; jangan hanya mengandalkan tombol UI.

6. **Perbaiki partial invoice untuk produk yang sama.**
   Billed quantity saat ini diagregasikan berdasarkan `productId`, bukan `salesOrderItemId`, dan qty berlebih di-clamp diam-diam. Gunakan source line dan tolak qty berlebih secara eksplisit.

7. **Migrasi customer pricing yang masih memakai sintaks MySQL.**
   `db/migrations/0001_customer_pricing_manual_tax.sql` memakai backtick dan `AUTO_INCREMENT`, tidak kompatibel dengan PostgreSQL. Buat migration PostgreSQL baru yang idempotent dan verifikasi migration history Supabase.

8. **Jadikan jurnal dan periode immutable.**
   Jurnal yang sudah posted tidak boleh diubah/hapus; gunakan reversal journal. Enforce periode closed di database/application transaction, bukan hanya di UI.

9. **Perbaiki konfigurasi deployment full-stack.**
   `wrangler.jsonc` saat ini hanya mendaftarkan Worker API, tanpa asset frontend/fallback. `SUPABASE_PUBLISHABLE_KEY` yang dibutuhkan Worker tidak muncul pada konfigurasi dry-run.
   - Pilih satu arsitektur: Pages terpisah + Worker API, atau Workers Assets.
   - Lengkapi secret/binding dan dokumentasikan `VITE_API_URL`.
   - Tambahkan script build/deploy/dry-run/smoke test yang benar-benar memvalidasi entrypoint production.

### P2 — penting untuk kualitas dan kesiapan UI/UX

1. Tambahkan loading/error/retry pada query sekunder di Buku Besar, Pembayaran, Pesanan Baru, modal supplier, dan mode edit pesanan.
2. Perbaiki 16 error lint; khususnya error pada `InvoiceDetail.tsx`, `PesananBaru.tsx`, komponen UI bersama, dan `db/seed.ts`.
3. Tambahkan label programatik `id`/`htmlFor` untuk field master data, pembayaran, pesanan, laporan, dan price row.
4. Perbaiki dialog/menu mobile: Escape, focus trap, initial focus, return focus, `aria-expanded`, dan `aria-controls`.
5. Naikkan action button yang memakai `!min-h-[36px]` ke target sentuh minimal 44px.
6. Perbaiki potensi overflow pada baris Pelanggan/Supplier dan grid modal faktur pada viewport 320–360px.
7. Sediakan alternatif tekstual untuk chart, serta `role=alert`/`aria-live` untuk error dan `role=status` untuk loading.
8. Tambahkan input tanggal faktur supplier; saat ini UI selalu mengirim tanggal hari ini.

## Bukti positif yang sudah terverifikasi

- `pnpm run check` / TypeScript project references lulus.
- Build frontend dan bundle server berhasil.
- Route internal utama memiliki padanan route React dan fallback SPA Pages.
- CORS worker memakai origin konfigurasi, bukan wildcard.
- Query memakai Drizzle builder; tidak ditemukan bukti SQL injection langsung.
- Tidak ditemukan secret aktif pada snapshot repository yang diaudit.
- Lockfile pnpm tersedia dan package manager dipin.
- Wrangler dry-run berhasil membaca konfigurasi Hyperdrive dan binding dasar.

## Rencana perbaikan yang disarankan

### Fase 1 — keamanan dan integritas

Role/capability middleware, object-level authorization, mutation retry policy, transaksi database, validasi payment, locking stock/status, FK/unique/check constraint, dan perbaikan IDOR invoice.

### Fase 2 — state bisnis dan deployment

Validasi state transition PO/invoice, posted journal protection, migrasi customer pricing PostgreSQL, allocator nomor dokumen, konfigurasi asset/deployment yang deterministik, serta smoke test authenticated production-like.

### Fase 3 — quality gate dan UI/UX

Error/loading state, lint bersih, accessibility dialog/form, responsive overflow, chart alternative, dan regression tests.

## Keputusan

Sebelum desain UI/UX visual dilanjutkan, minimal seluruh item **P0** harus diperbaiki dan diverifikasi. Setelah itu item **P1** diselesaikan atau diberi keputusan bisnis tertulis untuk setiap pengecualian. UI/UX sebaiknya dilakukan setelah state bisnis dan hak akses stabil agar desain tidak perlu dirombak akibat perubahan alur transaksi.
