// ... existing code ...
  // Load & Subscribe Realtime ke Supabase
  useEffect(() => {
    if (!supabase) return;

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

    if (supabase) {
      await supabase.from('shared_transactions').upsert(payload);
    } else {
      setTransactions((prev) =>
        editingId ? prev.map((item) => (item.id === editingId ? payload : item)) : [payload, ...prev]
      );
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (supabase) {
      await supabase.from('shared_transactions').delete().eq('id', id);
    } else {
      setTransactions((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
// ... existing code ...
