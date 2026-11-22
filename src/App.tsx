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

const SUPABASE_URL = 'https://luuadnzfxgwffbtqcxbv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Y5UvIogHuWot6FLjx_RHBw_7HMiQ_Hv';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = [
  'Home', 'Food', 'Gifts', 'Transportation', 'Utilities',
  'For Fun', 'Personal', 'Salary', 'Investment', 'Other'
];

const DEFAULT_TRANSACTIONS: SharedTransaction[] = [
  { id: 'tx-101', date: '2026-11-13', title: 'traktiran ayah', note: 'Unspecified', category: 'Other', subject: 'Ivan', type: 'Income', amount: 800000 },
  { id: 'tx-102', date: '2026-11-12', title: 'Sewa & Kebutuhan Apartemen', note: 'Bulanan', category: 'Home', subject: 'Bersama', type: 'Expense', amount: 2500000 },
  { id: 'tx-103', date: '2026-11-11', title: 'Tabungan Dana Darurat Bersama', note: 'Auto-debit', category: 'Investment', subject: 'Bersama', type: 'Savings', amount: 8101990 },
  { id: 'tx-104', date: '2026-11-10', title: 'Groceries & Makan Malam', note: 'Supermarket', category: 'Food', subject: 'Jessica', type: 'Expense', amount: 1339050 },
  { id: 'tx-105', date: '2026-11-08', title: 'Kado Ulang Tahun Keluarga', note: 'Unspecified', category: 'Gifts', subject: 'Ivan', type: 'Expense', amount: 1140150 },
  { id: 'tx-106', date: '2026-11-06', title: 'BBM, Tol & Parkir', note: 'Operasional', category: 'Transportation', subject: 'Ivan', type: 'Expense', amount: 433500 }
];

export default function App() {
  const [transactions, setTransactions] = useState<SharedTransaction[]>(DEFAULT_TRANSACTIONS);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(true);
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

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('shared_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        setIsSupabaseLive(false);
      } else if (data && data.length > 0) {
        setTransactions(data as SharedTransaction[]);
        setIsSupabaseLive(true);
      }
    };

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

    // Optimistic update
    setTransactions((prev) =>
      editingId ? prev.map((item) => (item.id === editingId ? payload : item)) : [payload, ...prev]
    );
    setIsModalOpen(false);

    const { error } = await supabase.from('shared_transactions').upsert(payload);
    if (error) {
      console.error('Gagal simpan ke Supabase:', error);
      showToast('Gagal menyimpan ke Supabase Cloud!');
    } else {
      showToast('Berhasil disimpan & disinkronkan ke Supabase!');
      const { data } = await supabase.from('shared_transactions').select('*').order('date', { ascending: false });
      if (data) setTransactions(data as SharedTransaction[]);
    }
  };

  const handleDelete = async (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));

    const { error } = await supabase.from('shared_transactions').delete().eq('id', id);
    if (error) {
      console.error('Gagal hapus dari Supabase:', error);
      showToast('Gagal menghapus dari Supabase Cloud!');
    } else {
      showToast('Transaksi berhasil dihapus dari cloud.');
      const { data } = await supabase.from('shared_transactions').select('*').order('date', { ascending: false });
      if (data && data.length > 0) setTransactions(data as SharedTransaction[]);
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

      {/* Sidebar Nav */}
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
              <div className="text-[11px] font-medium text-emerald-600">Supabase Realtime</div>
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

        <div className="px-2 py-2 text-xs text-emerald-600 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Terhubung ke Cloud</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 capitalize">{activePage}</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700"
          >
            <option value="2026-11">November 2026</option>
            <option value="2026-12">Desember 2026</option>
          </select>
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
                <button onClick={() => openModal('Expense')} className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                  + Tambah Transaksi
                </button>
              </div>
              <div className="space-y-3">
                {periodTransactions.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Belum ada transaksi pada periode ini.</p>
                ) : (
                  periodTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{tx.title}</p>
                        <p className="text-xs text-slate-400">{tx.date} • {tx.subject} • {tx.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatIDR(tx.amount)}</p>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{tx.type}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
