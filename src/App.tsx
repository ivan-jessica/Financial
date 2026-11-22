import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
Wallet,
LayoutGrid,
Activity,
BarChart2,
Settings,
ArrowDownLeft,
ArrowUpRight,
ArrowLeftRight,
Calendar,
Plus,
Search,
Trash2,
Sparkles,
CheckCircle2
} from 'lucide-react';
import initialData from '../source-workbook-transactions.json';

export interface SharedTransaction {
id: string;
date: string;
title: string;
note: string;
category: string;
subject: 'Ivan' | 'Jessica' | 'Bersama';
type: 'Income' | 'Expense' | 'Savings' | 'Transfer';
amount: number;
}

const supabaseUrl = 'https://luuadnzfxgwffbtqcxbv.supabase.co';
const supabaseKey = 'sb_publishable_Y5UvIogHuWot6FLjx_RHBw_7HMiQ_Hv';
const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORIES = [
'Home', 'Food', 'Gifts', 'Transportation', 'Utilities',
'For Fun', 'Personal', 'Salary', 'Investment', 'Other'
];

export default function App() {
const [transactions, setTransactions] = useState<SharedTransaction[]>(initialData as SharedTransaction[]);
const [isSupabaseLive, setIsSupabaseLive] = useState(true);
const [activePage, setActivePage] = useState<'dashboard' | 'transactions' | 'reports' | 'settings'>('dashboard');
const [selectedMonth, setSelectedMonth] = useState('2026-11');
const [selectedSubject, setSelectedSubject] = useState('Semua');
const [txTypeFilter, setTxTypeFilter] = useState('ALL');
const [searchQuery, setSearchQuery] = useState('');

// Modal Form State
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const [formType, setFormType] = useState<'Income' | 'Expense' | 'Savings' | 'Transfer'>('Expense');
const [formDate, setFormDate] = useState('2026-11-15');
const [formSubject, setFormSubject] = useState<'Ivan' | 'Jessica' | 'Bersama'>('Ivan');
const [formCategory, setFormCategory] = useState('Food');
const [formAmount, setFormAmount] = useState('');
const [formTitle, setFormTitle] = useState('');
const [formNote, setFormNote] = useState('');

// Load & Subscribe Realtime ke Supabase
useEffect(() => {
const fetchTransactions = async () => {
const { data, error } = await supabase
.from('shared_transactions')
.select('*')
.order('date', { ascending: false });

  if (!error && data) {
    setTransactions(data as SharedTransaction[]);
    setIsSupabaseLive(true);
  }
};

fetchTransactions();

const channel = supabase
  .channel('shared_transactions_changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'shared_transactions' },
    () => {
      fetchTransactions();
    }
  )
  .subscribe();

return () => {
  supabase.removeChannel(channel);
};


}, []);

const formatIDR = (val: number) => 'Rp ' + Number(val || 0).toLocaleString('id-ID');

const periodTransactions = useMemo(() => {
return transactions
.filter((tx) => {
const matchMonth = !selectedMonth || tx.date.startsWith(selectedMonth);
const matchSubj = selectedSubject === 'Semua' || tx.subject === selectedSubject;
return matchMonth && matchSubj;
})
.sort((a, b) => b.date.localeCompare(a.date));
}, [transactions, selectedMonth, selectedSubject]);

const metrics = useMemo(() => {
let income = 0, expense = 0, savings = 0, transfer = 0;
const catMap: Record<string, number> = {};

periodTransactions.forEach((tx) => {
  const amt = Number(tx.amount) || 0;
  if (tx.type === 'Income') income += amt;
  else if (tx.type === 'Expense') {
    expense += amt;
    catMap[tx.category] = (catMap[tx.category] || 0) + amt;
  } else if (tx.type === 'Savings') savings += amt;
  else if (tx.type === 'Transfer') transfer += amt;
});

const sortedCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
return { income, expense, savings, transfer, sortedCategories };


}, [periodTransactions]);

const openModal = (type: 'Income' | 'Expense' | 'Savings' | 'Transfer' = 'Expense', tx?: SharedTransaction) => {
if (tx) {
setEditingId(tx.id);
setFormType(tx.type);
setFormDate(tx.date);
setFormSubject(tx.subject);
setFormCategory(tx.category);
setFormAmount(String(tx.amount));
setFormTitle(tx.title);
setFormNote(tx.note === 'Unspecified' ? '' : tx.note);
} else {
setEditingId(null);
setFormType(type);
setFormDate(${selectedMonth}-15);
setFormSubject('Ivan');
setFormCategory(type === 'Income' ? 'Salary' : type === 'Savings' ? 'Investment' : 'Food');
setFormAmount('');
setFormTitle('');
setFormNote('');
}
setIsModalOpen(true);
};

const handleSave = async (e: React.FormEvent) => {
e.preventDefault();
const id = editingId || tx-${Date.now()};
const payload: SharedTransaction = {
id,
date: formDate,
subject: formSubject,
category: formCategory,
type: formType,
amount: Number(formAmount),
title: formTitle.trim(),
note: formNote.trim() || 'Unspecified'
};

await supabase.from('shared_transactions').upsert(payload);
setIsModalOpen(false);


};

const handleDelete = async (id: string) => {
await supabase.from('shared_transactions').delete().eq('id', id);
};

return (

{/* Sidebar */}







Finance Tracker
IVAN & JESSICA



      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
        <div className="flex -space-x-1.5">
          <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center ring-2 ring-white">I</span>
          <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center ring-2 ring-white">J</span>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800">Shared space</div>
          <div className="text-[11px] font-medium text-emerald-600">Supabase Cloud Realtime</div>
        </div>
      </div>

      <nav className="grid grid-cols-4 lg:grid-cols-1 gap-1">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
          { id: 'transactions', label: 'Transactions', icon: Activity },
          { id: 'reports', label: 'Reports', icon: BarChart2 },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as typeof activePage)}
              className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>

    <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 px-2 pt-4">
      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      <span>Tersinkronisasi Online</span>
    </div>
  </aside>

  {/* Main Area */}
  <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">SHARED FINANCES</p>
        <h2 className="text-2xl font-bold text-slate-900 capitalize mt-0.5">{activePage}</h2>
      </div>

      <div className="flex items-center gap-2.5">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700"
        >
          <option value="2026-12">Desember 2026</option>
          <option value="2026-11">November 2026</option>
          <option value="2026-10">Oktober 2026</option>
        </select>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700"
        >
          <option value="Semua">Semua</option>
          <option value="Ivan">Ivan</option>
          <option value="Jessica">Jessica</option>
          <option value="Bersama">Bersama</option>
        </select>
      </div>
    </div>

    {activePage === 'dashboard' && (
      <>
        <section className="hero-banner rounded-2xl p-6 sm:p-8 text-white shadow-sm flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ringkasan keuangan bersama</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold">Kelola uang dengan lebih jelas.</h3>
            <p className="text-xs sm:text-sm text-blue-100 mt-1">
              Pantau pemasukan, pengeluaran, dan tabungan Ivan & Jessica dalam satu tempat.
            </p>
          </div>
          <Wallet className="hidden sm:block w-12 h-12 text-white/30" />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total pemasukan</p>
              <p className="text-lg font-bold text-slate-900">{formatIDR(metrics.income)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Pengeluaran</p>
              <p className="text-lg font-bold text-slate-900">{formatIDR(metrics.expense)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Tabungan</p>
              <p className="text-lg font-bold text-slate-900">{formatIDR(metrics.savings)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Transfer</p>
              <p className="text-lg font-bold text-slate-900">{formatIDR(metrics.transfer)}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Pengeluaran per kategori</h3>
                <p className="text-xs text-slate-400">Distribusi expense bulan terpilih</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                {metrics.sortedCategories.length} kategori
              </span>
            </div>

            <div className="space-y-4">
              {metrics.sortedCategories.map(([cat, total]) => {
                const maxVal = metrics.sortedCategories[0]?.[1] || 1;
                const pct = Math.max(4, Math.round((total / maxVal) * 100));
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{cat}</span>
                      <span className="font-bold text-slate-900">{formatIDR(total)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Aktivitas bulan ini</h3>
                <p className="text-xs text-slate-400">Jumlah transaksi tercatat</p>
              </div>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>

            <div className="my-8">
              <div className="text-4xl font-bold text-slate-900">{periodTransactions.length}</div>
              <p className="text-xs text-slate-400 mt-2">transaksi untuk Ivan & Jessica</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['Expense', 'Income', 'Savings'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => openModal(t)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t === 'Expense' ? 'Pengeluaran' : t === 'Income' ? 'Pemasukan' : 'Tabungan'}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </>
    )}

    {(activePage === 'dashboard' || activePage === 'transactions') && (
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {activePage === 'dashboard' ? 'Transaksi terbaru' : 'Semua Transaksi'}
            </h3>
            <p className="text-xs text-slate-400">Catatan keuangan pada periode ini</p>
          </div>
          {activePage === 'dashboard' ? (
            <button
              onClick={() => setActivePage('transactions')}
              className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Lihat semua &rarr;
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari transaksi..."
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <button
                onClick={() => openModal('Expense')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                + Tambah
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-400">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Subjek</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {periodTransactions
                .filter((tx) =>
                  activePage === 'dashboard'
                    ? true
                    : (txTypeFilter === 'ALL' || tx.type === txTypeFilter) &&
                      tx.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .slice(0, activePage === 'dashboard' ? 5 : 100)
                .map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-xs text-slate-500">{tx.date}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{tx.title}</div>
                      <div className="text-[11px] text-slate-400">{tx.note}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{tx.category}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                        {tx.subject}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      <div className="inline-flex items-center gap-3">
                        <span>{formatIDR(tx.amount)}</span>
                        <button onClick={() => openModal(tx.type, tx)} className="text-xs font-medium text-slate-400 hover:text-blue-600">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    )}

    {activePage === 'reports' && (
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Ringkasan Arus Kas Ivan & Jessica</h3>
        <p className="text-sm text-slate-600">
          Selisih Pemasukan & Pengeluaran bulan ini:{' '}
          <strong className="text-slate-900">{formatIDR(metrics.income - metrics.expense)}</strong>
        </p>
      </section>
    )}

    {activePage === 'settings' && (
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3">
        <h3 className="text-base font-bold text-slate-900">Status Koneksi Supabase</h3>
        <p className="text-xs text-slate-500">
          Aplikasi terhubung secara online dengan Supabase Cloud. Perubahan akan langsung tersinkronisasi antar perangkat.
        </p>
      </section>
    )}
  </main>

  {/* Modal Form */}
  {isModalOpen && (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-slate-900">{editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}</h3>
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {(['Expense', 'Income', 'Savings', 'Transfer'] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setFormType(t)}
              className={`py-2 rounded-lg ${formType === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="px-3 py-2 border rounded-xl text-xs" />
          <select value={formSubject} onChange={(e) => setFormSubject(e.target.value as 'Ivan' | 'Jessica' | 'Bersama')} className="px-3 py-2 border rounded-xl text-xs">
            <option value="Ivan">Ivan</option>
            <option value="Jessica">Jessica</option>
            <option value="Bersama">Bersama</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="px-3 py-2 border rounded-xl text-xs">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" required placeholder="Nominal (Rp)" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="px-3 py-2 border rounded-xl text-xs font-semibold" />
        </div>
        <input type="text" required placeholder="Keterangan" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" />
        <input type="text" placeholder="Catatan tambahan (opsional)" value={formNote} onChange={(e) => setFormNote(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-semibold">Batal</button>
          <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">Simpan</button>
        </div>
      </form>
    </div>
  )}
</div>


);
}
