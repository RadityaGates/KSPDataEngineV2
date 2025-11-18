# KSP Data Engine V2

Instagram scraper untuk Kantor Staf Presiden (KSP) dengan integrasi Google Sheets.

## Fitur

- ✅ Scraping otomatis postingan Instagram
- ✅ Update Google Sheets tanpa menghapus data lama
- ✅ Pencegahan duplikasi (0% duplikat)
- ✅ Preservasi postingan lama
- ✅ Optimized untuk Vercel deployment
- ✅ Scheduled scraping dengan Vercel Cron

## Teknologi

- Next.js 13+ (App Router)
- Apify API untuk Instagram scraping
- Google Sheets API
- Vercel Serverless Functions

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set environment variables di Vercel:
- `APIFY_TOKEN` - Token untuk Apify API
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Service account JSON untuk Google Sheets
- `GOOGLE_SHEET_ID` - ID Google Sheet yang akan diupdate

## Deployment

Project ini di-deploy di Vercel dengan konfigurasi:
- Runtime: Node.js (Serverless Functions)
- Max Duration: 20 detik
- Scheduled: Setiap hari jam 17:00 WIB

## API Routes

- `/api/scrape` - Scrape Instagram posts dan update Google Sheets
- `/api/update-sheet` - Update Google Sheets dengan data baru

## Fitur Utama

### 1. Tidak Ada Baris yang Terhapus
Semua postingan lama tetap tersimpan di Google Sheets.

### 2. Hanya Postingan Baru yang Ditambah
Sistem hanya menambahkan postingan yang belum ada sebelumnya.

### 3. Duplikasi 0%
Menggunakan URL sebagai identifier unik untuk mencegah duplikasi.

### 4. Sheet Tetap Bersih dan Rapi
Data diorganisir dengan baik, postingan lama diikuti postingan baru.

### 5. Posting Lama Tidak Ikut Hilang
Semua data historis tetap terjaga.
