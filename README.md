# Ivan & Jessica — Shared Finance Tracker (Vercel + Supabase)

Aplikasi pelacak keuangan bersama untuk **Ivan & Jessica** dengan sinkronisasi **Supabase Real-time** dan siap dideploy gratis ke **Vercel**.

## Langkah Deploy Cepat (3 Langkah)

### 1. Buat Database di Supabase (Gratis)
1. Buka [supabase.com](https://supabase.com) dan buat **New Project**.
2. Buka menu **SQL Editor** di sidebar kiri, lalu salin-tempel seluruh isi file `supabase/schema.sql` dan klik **Run**.
3. Buka **Project Settings -> API**, lalu catat **Project URL** dan **anon public key**.

### 2. Upload ke GitHub & Deploy ke Vercel (Gratis)
1. Ekstrak ZIP ini, lalu upload folder `finance-tracker` ke repository **GitHub** Anda.
2. Buka [vercel.com](https://vercel.com), klik **Add New -> Project**, pilih repository GitHub tersebut.
3. Pada bagian **Environment Variables**, tambahkan 2 variabel berikut:
   - `VITE_SUPABASE_URL` = *(Project URL dari Supabase)*
   - `VITE_SUPABASE_ANON_KEY` = *(anon public key dari Supabase)*
4. Klik **Deploy**. Dalam 1 menit Anda akan mendapatkan link web permanen (misalnya `ivan-jessica-finance.vercel.app`) yang bisa dipasang di layar utama HP Ivan & Jessica!
