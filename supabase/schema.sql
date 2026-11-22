-- Skema Database Supabase untuk Ivan & Jessica Shared Finance Tracker
-- Jalankan skrip ini pada SQL Editor di Dashboard Supabase Anda

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.shared_transactions (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    note TEXT DEFAULT 'Unspecified',
    category TEXT NOT NULL,
    subject TEXT NOT NULL CHECK (subject IN ('Ivan', 'Jessica', 'Bersama')),
    type TEXT NOT NULL CHECK (type IN ('Income', 'Expense', 'Savings', 'Transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aktifkan Realtime agar perubahan di HP Ivan langsung muncul di HP Jessica
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_transactions;

-- Izinkan akses baca/tulis untuk ruang bersama (Shared Space)
ALTER TABLE public.shared_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared space full access" ON public.shared_transactions
    FOR ALL USING (true) WITH CHECK (true);

-- Data contoh awal (November 2026)
INSERT INTO public.shared_transactions (id, date, title, note, category, subject, type, amount) VALUES
    ('tx-101', '2026-11-13', 'traktiran ayah', 'Unspecified', 'Other', 'Ivan', 'Income', 800000),
    ('tx-102', '2026-11-12', 'Sewa & Kebutuhan Apartemen', 'Bulanan', 'Home', 'Bersama', 'Expense', 2500000),
    ('tx-103', '2026-11-11', 'Tabungan Dana Darurat Bersama', 'Auto-debit', 'Investment', 'Bersama', 'Savings', 8101990),
    ('tx-104', '2026-11-10', 'Groceries & Makan Malam', 'Supermarket', 'Food', 'Jessica', 'Expense', 1339050),
    ('tx-105', '2026-11-08', 'Kado Ulang Tahun Keluarga', 'Unspecified', 'Gifts', 'Ivan', 'Expense', 1140150),
    ('tx-106', '2026-11-06', 'BBM, Tol & Parkir', 'Operasional', 'Transportation', 'Ivan', 'Expense', 433500),
    ('tx-107', '2026-11-04', 'Listrik, Air & Internet', 'Tagihan rutin', 'Utilities', 'Bersama', 'Expense', 408949),
    ('tx-108', '2026-11-03', 'Nonton Bioskop & Kopi', 'Weekend', 'For Fun', 'Jessica', 'Expense', 187000),
    ('tx-109', '2026-11-02', 'Perawatan & Keperluan Pribadi', 'Unspecified', 'Personal', 'Jessica', 'Expense', 145000)
ON CONFLICT (id) DO NOTHING;
