# Audit Kesiapan Jena Medical Center

Tanggal audit: 26 Oktober 2026  
Metode: inspeksi read-only source code, TypeScript check, lint, dan Wrangler dry-run. Tidak ada data produksi yang diubah selama audit.

## Kesimpulan eksekutif

Status awal aplikasi: **belum siap untuk masuk tahap desain UI/UX penuh**.

Fondasi frontend sudah berjalan: route internal konsisten, SPA fallback Pages tersedia, TypeScript lulus, autentikasi bearer dasar tersedia, CORS tidak menunjukkan wildcard, dan tidak ditemukan secret aktif pada snapshot repository. Namun audit menemukan risiko serius pada integritas transaksi dan deployment.

Risiko utama yang ditemukan adalah mutation multi-langkah yang belum atomik, pembayaran yang belum cukup tervalidasi, stok yang dapat menjadi negatif, akses lintas record pada update invoice, constraint database yang belum lengkap, serta deployment full-stack yang belum sepenuhnya reproducible.

## Temuan prioritas awal

### P0 — keamanan dan integritas transaksi

`protectedProcedure` hanya memeriksa login. Pada keputusan owner-only, sistem role kompleks tidak akan dibangun; autentikasi login tetap dipertahankan.

Mutation pembayaran, posting stok/jurnal, invoice, PO, dan update detail sebelumnya berjalan tanpa transaksi database end-to-end. Kegagalan di tengah proses dapat meninggalkan header, item, status, stock, atau journal parsial.

Pembayaran sebelumnya dapat dibuat tanpa target valid, dengan arah yang salah, ke target draft, atau melebihi outstanding. Penerbitan invoice juga belum melindungi stok negatif atau posting bersamaan.

Update draft invoice sebelumnya mengubah item berdasarkan `item.id` tanpa selalu memastikan item tersebut milik invoice induk. Ini adalah risiko integritas data, bukan hanya masalah role.

### P1 — integritas schema dan deployment

Schema awal hampir hanya memiliki primary key. Foreign key, unique constraint untuk code/SKU/nomor, serta check constraint untuk qty/amount/reference belum lengkap.

Generator nomor SO/PO/Invoice memakai pola `max + 1`, sedangkan kode master data memakai `count() + 1`; keduanya rentan bentrok saat request bersamaan atau setelah penghapusan.

Jurnal posted belum sepenuhnya immutable, state transition PO/supplier invoice belum cukup ketat, dan migration customer pricing masih memakai sintaks MySQL pada repository PostgreSQL.

Konfigurasi Wrangler hanya mendaftarkan Worker API dan belum mengikat asset frontend/fallback secara utuh. Binding `SUPABASE_PUBLISHABLE_KEY` pada Worker juga belum terverifikasi pada dry-run.

### P2 — kualitas dan aksesibilitas

Beberapa query sekunder belum memiliki loading/error/retry state. Lint repository memiliki 16 error. Banyak field belum memiliki label programatik, dialog belum memiliki focus management lengkap, sebagian action button terlalu kecil untuk target sentuh, dan beberapa layout berpotensi overflow pada layar 320–360px.

## Bukti positif

`pnpm run check` dan build production berhasil. Route internal utama konsisten dan fallback SPA tersedia. CORS tidak menunjukkan wildcard, query memakai Drizzle builder, tidak ditemukan secret aktif pada snapshot repository, lockfile pnpm tersedia, dan Wrangler dry-run berhasil membaca binding Hyperdrive dasar.

## Status implementasi Fase 1 — owner-only

Perbaikan yang sudah diterapkan di repository adalah transaksi atomik untuk posting invoice customer, faktur supplier, dan pembayaran; validasi arah/referensi/status/overpayment; row lock pada header dan product saat posting; pencegahan stok negatif; validasi kepemilikan item saat update draft invoice; serta penghapusan retry otomatis untuk response server 5xx agar mutation tidak terkirim ulang.

Migration constraint integritas berhasil diterapkan ke Supabase project `hnkslpbifxqubcpzhihg`. Pemeriksaan data sebelum migration tidak menemukan orphan relation, duplicate business code/number, invalid payment reference, stok negatif, atau quantity negatif pada pemeriksaan yang dilakukan.

Migration lokal tersedia di [0002_transaction_integrity_constraints.sql](db/migrations/0002_transaction_integrity_constraints.sql). Foreign key dan check constraint memakai `NOT VALID`, sehingga data lama tidak diubah dan write baru tetap dijaga. Validasi penuh dapat dilakukan setelah histori lama direkonsiliasi.

Unique constraint untuk sumber posting jurnal sengaja belum diterapkan karena histori lama memiliki duplikasi jurnal pada invoice `2` dan supplier invoice `1` serta `2`. Histori tersebut tidak dihapus otomatis dan harus direkonsiliasi manual sebelum constraint anti-posting-ganda dapat ditambahkan.

## Validasi Fase 1

`pnpm run check` lulus dan `pnpm run build` lulus. `pnpm test` belum lulus karena repository belum memiliki file test dan Vitest mengembalikan `No test files found`; tidak ada regression test otomatis yang dapat diklaim lulus.

Perubahan sudah dicommit dan dipush ke GitHub pada commit `f75dcc3`. Working tree bersih.

Migration Supabase berhasil diterapkan dan health endpoint Worker production merespons HTTP 200. Deployment Worker untuk kode backend belum dapat dilakukan dari sandbox karena Wrangler meminta OAuth Cloudflare interaktif dan browser tidak tersedia. Karena itu, backend production belum boleh dianggap sudah menggunakan implementasi Fase 1 sampai deployment Worker dilakukan melalui sesi Cloudflare yang terautentikasi.

## Rencana lanjutan

Setelah deployment Worker berhasil, lakukan smoke test authenticated untuk pembayaran, invoice issue, posting faktur supplier, overpayment, stok tidak cukup, dan update draft invoice dengan item silang. Setelah histori jurnal duplikat direkonsiliasi, tambahkan unique constraint sumber posting dan validasi penuh semua constraint `NOT VALID`. Kemudian lanjutkan perbaikan P2 dan baru masuk ke desain UI/UX visual.
