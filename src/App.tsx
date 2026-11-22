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
  { id: 'tx-105', date: '2026-11-08', title: 'Kado Ulang Tahun Keluarga', note: 'Unspecified', category: 'Gifts', subject: 'Ivan', type: 'Expense', amount: 1140150 }
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
      if (data) setTransactions(data as SharedTransaction[]);
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
    </div>
  );
}
