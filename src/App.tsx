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
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://luuadnzfxgwffbtqcxbv.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Y5UvIogHuWot6FLjx_RHBw_7HMiQ_Hv';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [transactions, setTransactions] = useState<SharedTransaction[]>([]);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<'dashboard' | 'transactions' | 'reports' | 'settings'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [selectedSubject, setSelectedSubject] = useState<string>('Semua');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'Income' | 'Expense' | 'Savings' | 'Transfer'>('Expense');
  const [formDate, setFormDate] = useState('2026-11-15');
  const [formSubject, setFormSubject] = useState<'Ivan' | 'Jessica' | 'Bersama'>('Ivan');
  const [formCategory, setFormCategory] = useState('Food');
  const [formAmount, setFormAmount] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formNote, setFormNote] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.warn('Supabase warning:', error.message);
        setIsSupabaseLive(false);
      } else if (data) {
        setTransactions(data as SharedTransaction[]);
        setIsSupabaseLive(true);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel('public:shared_transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_transactions' },
        () => {
          fetchTransactions();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSupabaseLive(true);
        }
      });

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
      setFormDate(`${selectedMonth}-15`);
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
    const id = editingId || `tx-${Date.now()}`;
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

    setIsModalOpen(false);

    try {
      const { error } = await supabase.from('shared_transactions').upsert(payload);
      if (error) {
        console.error('Supabase save error:', error.message);
        showToast('Gagal simpan ke Supabase: ' + error.message);
      } else {
        showToast('Berhasil disimpan & tersinkron ke Supabase!');
        await fetchTransactions();
      }
    } catch (err: any) {
      console.error('Save exception:', err);
      showToast('Terjadi kesalahan jaringan.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('shared_transactions').delete().eq('id', id);
      if (error) {
        console.error('Supabase delete error:', error.message);
        showToast('Gagal hapus di Supabase: ' + error.message);
      } else {
        showToast('Berhasil dihapus dari Supabase.');
        await fetchTransactions();
      }
    } catch (err: any) {
      console.error('Delete exception:', err);
      showToast('Gagal menghapus transaksi.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-800">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200/80 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm">Finance Tracker</h1>
              <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">IVAN & JESSICA</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
            <div className="flex -space-x-1.5">
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center ring-2 ring-white">I</span>
              <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center ring-2 ring-white">J</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">Shared space</div>
              <div className={`text-[11px] font-medium ${isSupabaseLive ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isSupabaseLive ? 'Supabase Realtime' : 'Mode Offline'}
              </div>
            </div>
          </div>

          <nav className="space-y-1">
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
                  onClick={() => setActivePage(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-2 py-2 text-xs text-slate-500 font-medium flex items-center gap-2">
          {isSupabaseLive ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
          <span>{isSupabaseLive ? 'Terkoneksi Supabase' : 'Offline Mode'}</span>
        </div>
      </aside>

      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 capitalize">{activePage}</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="2026-11">November 2026</option>
              <option value="2026-12">Desember 2026</option>
            </select>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="Semua">Semua</option>
              <option value="Ivan">Ivan</option>
              <option value="Jessica">Jessica</option>
              <option value="Bersama">Bersama</option>
            </select>
          </div>
        </div>

        {activePage === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs text-slate-400 font-medium">Total Pemasukan</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatIDR(metrics.income)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs text-slate-400 font-medium">Pengeluaran</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatIDR(metrics.expense)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs text-slate-400 font-medium">Tabungan</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatIDR(metrics.savings)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs text-slate-400 font-medium">Transfer</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatIDR(metrics.transfer)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Transaksi Terbaru</h3>
                <button onClick={() => openModal('Expense')} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold">
                  + Tambah Transaksi
                </button>
              </div>
              <div className="space-y-3">
                {periodTransactions.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Belum ada transaksi pada periode ini.</p>
                ) : (
                  periodTransactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{tx.title}</p>
                        <p className="text-xs text-slate-400">{tx.date} • {tx.subject} • {tx.category}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{formatIDR(tx.amount)}</p>
                          <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{tx.type}</span>
                        </div>
                        <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activePage === 'transactions' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Semua Transaksi</h3>
              <button onClick={() => openModal('Expense')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                + Tambah Transaksi
              </button>
            </div>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-semibold text-sm">{tx.title}</p>
                    <p className="text-xs text-slate-400">{tx.date} • {tx.subject} • {tx.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatIDR(tx.amount)}</span>
                    <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePage === 'reports' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h3 className="font-bold text-slate-900">Laporan Arus Kas</h3>
            <p className="text-sm text-slate-600">Selisih Pemasukan & Pengeluaran: <strong className="text-slate-900">{formatIDR(metrics.income - metrics.expense)}</strong></p>
          </div>
        )}

        {activePage === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h3 className="font-bold text-slate-900">Pengaturan Supabase</h3>
            <p className="text-xs text-slate-500">Aplikasi Ivan & Jessica Finance Tracker terhubung ke cloud Supabase secara real-time.</p>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900">Tambah Transaksi</h3>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="px-3 py-2 border rounded-xl text-xs" />
              <select value={formSubject} onChange={(e) => setFormSubject(e.target.value as any)} className="px-3 py-2 border rounded-xl text-xs">
                <option value="Ivan">Ivan</option>
                <option value="Jessica">Jessica</option>
                <option value="Bersama">Bersama</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="px-3 py-2 border rounded-xl text-xs">
                {['Home', 'Food', 'Gifts', 'Transportation', 'Utilities', 'For Fun', 'Personal', 'Salary', 'Investment', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input type="number" required placeholder="Nominal (Rp)" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="px-3 py-2 border rounded-xl text-xs font-semibold" />
            </div>
            <input type="text" required placeholder="Keterangan" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" />
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
