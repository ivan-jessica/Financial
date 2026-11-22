# Pemetaan Kolom Transaksi Ivan & Jessica

| Field JSON / DB | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `date` | `DATE` (YYYY-MM-DD) | Tanggal transaksi |
| `title` | `TEXT` | Keterangan utama transaksi |
| `note` | `TEXT` | Catatan tambahan (default: `Unspecified`) |
| `category` | `TEXT` | Home, Food, Gifts, Transportation, Utilities, For Fun, Personal, Salary, Investment, Other |
| `subject` | `TEXT` | Pelaku transaksi: `Ivan`, `Jessica`, atau `Bersama` |
| `type` | `TEXT` | `Income`, `Expense`, `Savings`, atau `Transfer` |
| `amount` | `NUMERIC(15,2)` | Nominal transaksi dalam Rupiah (IDR) |
