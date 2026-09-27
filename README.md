# Tani Jaya

Sistem Informasi Manajemen Transaksi Hasil Pertanian berbasis web untuk mendukung operasional pengepul/collector hasil pertanian.

## Tentang Aplikasi

Tani Jaya membantu Admin mengelola Petani, Lahan, Siklus Panen, Jadwal Panen, Pembelian hasil pertanian, Stok, Penjualan, Pembayaran, Totalan Petani, Kasbon, Riwayat, dan Laporan Bulanan dalam satu aplikasi responsive berbahasa Indonesia.

## Alur Utama

```text
Petani → Lahan → Siklus Panen → Jadwal Panen → Pembelian → Stok → Penjualan → Pembayaran
Pembelian Petani Mitra → Totalan → Potongan Kasbon → Pembayaran Petani
```

- Stok berasal dari Pembelian yang tersimpan dan berkurang berdasarkan alokasi Penjualan aktif.
- Totalan bukan transaksi Pembelian baru.
- Kasbon dicatat sebagai ledger, bukan saldo yang dapat diubah langsung.

## Fitur Utama

### Dashboard

Ringkasan operasional dari data Supabase: jadwal panen, Pembelian, Penjualan, stok, dan piutang pembeli.

### Petani, Lahan, Siklus & Jadwal Panen

- Data Petani Mitra dengan status aktif/nonaktif dan banyak Lahan per Petani.
- Siklus per komoditas, Jadwal Panen, penundaan jadwal, dan relasi data berbasis UUID.

### Pembelian

- Petani Mitra dan Penjual Umum.
- Multi-item, grade SP/TG/BR, timbang langsung, per karung, dan per peti.
- Nota Digital dan Thermal.

### Stok

- Read-only dan derived dari berat fisik/gross Pembelian.
- Dikurangi alokasi Penjualan aktif, termasuk timbang langsung dan wadah individual.

### Penjualan

- Multi-item, multi-source, multi-grade, serta pembeli manual.
- Pengambilan pembeli atau pengiriman ekspedisi.
- Lunas, DP, utang, cicilan, pelunasan, koreksi, pembatalan, Nota Digital, dan Thermal.

### Totalan & Kasbon

- Totalan khusus Petani Mitra, mengelompokkan Pembelian eligible menjadi riwayat final dengan potongan Kasbon.
- Kasbon menggunakan ledger immutable untuk advance dan deduction melalui Totalan.

### Riwayat & Laporan

- Riwayat Pembelian dan Penjualan serta Laporan Bulanan.
- Memisahkan berat fisik gross, nilai finansial net, nilai invoice, dan pembayaran.

## Aturan Bisnis Penting

- Stok masuk memakai berat gross Pembelian; potongan Pembelian hanya memengaruhi nilai finansial.
- Stok keluar memakai berat gross Penjualan; potongan Penjualan hanya memengaruhi nilai invoice.
- Grade: SP, TG, dan BR. Karung/Peti memakai bobot wadah individual.
- Totalan hanya untuk Petani Mitra dan Kasbon memakai ledger, bukan saldo mutable.
- Penjualan yang dibatalkan melepaskan alokasi stok.
- Profit/COGS belum menjadi bagian P0.

## Teknologi

- Next.js 16, React 19, dan TypeScript
- Tailwind CSS 4, shadcn/ui, Lucide, dan Motion for React
- React Hook Form dan Zod
- Supabase: `@supabase/ssr` dan `@supabase/supabase-js`

## Arsitektur Data

- Supabase PostgreSQL adalah source-of-truth data operasional.
- Autentikasi memakai email/password Supabase Auth; `public.app_admins` adalah allowlist Admin.
- Row Level Security (RLS) melindungi data operasional.
- Mutasi finansial sensitif memakai controlled RPC.
- Role `public` dan `anon` tidak memiliki `EXECUTE` untuk RPC mutasi sensitif; `authenticated` hanya menjalankan RPC yang diizinkan.
- Fungsi sensitif tetap memeriksa status Admin di database.
- Stock bersifat derived, bukan tabel stok mutable.
- [`src/types/database.types.ts`](./src/types/database.types.ts) adalah canonical generated database type.

## Struktur Project

```text
tani-jaya/
├── src/
│   ├── app/          # Next.js App Router dan route aplikasi
│   ├── components/   # UI, layout, dan domain components
│   ├── config/       # Konfigurasi bisnis
│   ├── lib/          # Domain logic, Supabase, dan utilitas
│   └── types/        # Generated database types
├── docs/             # PRD dan dokumentasi database
├── public/           # Asset publik
├── supabase/
│   └── migrations/   # Riwayat migration database
├── AGENTS.md
├── package.json
└── README.md
```

## Menjalankan Project Lokal

1. Clone repository dan masuk ke direktori project.
2. Install dependency dengan `npm ci`.
3. Buat `.env.local` berdasarkan `.env.example`, lalu isi konfigurasi Supabase publik.
4. Jalankan:

```bash
npm run dev
```

5. Buka `http://localhost:3000`.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Jangan commit `.env.local`, credential, database password, atau key rahasia apa pun ke repository.

## Supabase

- Aplikasi membutuhkan project Supabase yang telah dikonfigurasi.
- Migration tersedia di [`supabase/migrations`](./supabase/migrations/) dan harus sinkron dengan project cloud.
- Generated database types berada di [`src/types/database.types.ts`](./src/types/database.types.ts).
- User Admin harus terdaftar di `public.app_admins`.
- RLS melindungi akses data operasional.

## Script Penting

```bash
npm run dev      # Development server dengan webpack
npm run build    # Production build
npm run start    # Menjalankan hasil production build
npm run lint     # ESLint
npx tsc --noEmit # Pemeriksaan TypeScript
```

## Validasi Sebelum Commit atau Deployment

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check
supabase db lint
```

Validasi tersebut memeriksa TypeScript, lint, production build, whitespace diff, dan schema database lokal melalui Supabase CLI.

## Dokumentasi

- [PRD utama](./docs/PRD.md): requirement dan aturan bisnis inti.
- [PRD Penjualan](./docs/PRD-PENJUALAN.md): domain Penjualan, Stok, dan Payment.
- [Dokumentasi database](./docs/database.md): schema, RLS, RPC, integrasi Supabase, dan deployment notes.
- [AGENTS.md](./AGENTS.md): panduan maintenance untuk coding agent dan developer.

## Status Project

- Core development, core Supabase integration, dan database/RLS/RPC security audit selesai.
- Production build lulus dan tanggal bisnis menggunakan Asia/Jakarta.
- Deployment belum dilakukan; final manual browser/device QA masih diperlukan sebelum production release.

## Catatan Keamanan

- Jangan menggunakan Supabase service-role key di browser.
- Jangan commit `.env.local` atau credential.
- Sensitive mutation RPC hanya tersedia untuk role yang diizinkan dan tetap melakukan validasi Admin.
- Aktifkan Supabase Auth Leaked Password Protection sebelum production release.

## Catatan Pengembangan

- Tanggal bisnis menggunakan timezone Asia/Jakarta.
- Historical date disimpan dan diperlakukan sebagai `YYYY-MM-DD` sesuai business date.
- Supabase adalah operational source-of-truth tanpa fixture/mock fallback.
- Stock merupakan data derived.
