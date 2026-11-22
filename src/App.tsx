import { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import workbookSeed from "../source-workbook-transactions.json";
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChartNoAxesCombined,
  Download, FileSpreadsheet, Filter, LayoutDashboard, LogIn, LogOut, Plus, Search,
  Settings, ShieldCheck, Sparkles, Trash2, Upload, Wallet, X
} from "lucide-react";

type TxType = "income" | "expense" | "saving" | "transfer";
type Person = "Ivan" | "Jessica";
type Tx = {
  id: string; date: string; type: TxType; amount: number; description: string;
  category: string; subject: Person; account: string; notes?: string;
};
const expenseCategories = ["Food","Gifts","Health/medical","Home","Transportation","Personal","Pets","Utilities","Travel","Debt","Other","Skincare","For Fun"];
const incomeCategories = ["Savings","Paycheck","Bonus","Interest","Other"];
const savingCategories = ["Emergency Fund","Gold","Foreign Currency","Bank Savings","Investment","Other"];
const transferCategories = ["Between own accounts"];
const money = (n: number) => new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n || 0);
const today = new Date().toISOString().slice(0,10);
const seed: Tx[] = (workbookSeed as Tx[]).map((t, i) => ({...t, id:`workbook-${i+1}`}));
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const householdId = import.meta.env.VITE_HOUSEHOLD_ID as string | undefined;
const cloudReady = Boolean(supabaseUrl && supabaseKey && householdId);
const supabase: SupabaseClient | null = cloudReady ? createClient(supabaseUrl!, supabaseKey!) : null;

function readLocal(): Tx[] {
  try { const saved = localStorage.getItem("finance-tracker-transactions"); return saved ? JSON.parse(saved) : seed; } catch { return seed; }
}
function App() {
  const [txs, setTxs] = useState<Tx[]>(() => readLocal());
  const [page, setPage] = useState("Dashboard");
  const [person, setPerson] = useState("Semua");
  const [month, setMonth] = useState(today.slice(0,7));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [toast, setToast] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sessionReady, setSessionReady] = useState(!cloudReady);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Tx>({id:"",date:today,type:"expense",amount:0,description:"",category:"Food",subject:"Ivan",account:"Cash",notes:""});
  const demo = !cloudReady;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => {
      setUserEmail(data.session?.user.email || "");
      setSessionReady(true);
      if (data.session) loadCloud();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email || "");
      if (session) loadCloud();
      else setTxs([]);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadCloud() {
    if (!supabase || !householdId) return;
    const {data,error} = await supabase.from("transactions").select("*").eq("household_id", householdId).order("date",{ascending:false});
    if (error) { notify("Gagal memuat data: " + error.message); return; }
    setTxs((data || []).map((r:any) => ({id:r.id,date:r.date,type:r.type,amount:Number(r.amount),description:r.description || "",category:r.category || "Other",subject:r.subject || "Ivan",account:r.account || "Cash",notes:r.notes || ""})));
  }
  function notify(s:string) { setToast(s); window.setTimeout(()=>setToast(""),3500); }
  useEffect(() => { if (demo) localStorage.setItem("finance-tracker-transactions", JSON.stringify(txs)); }, [txs,demo]);

  const filtered = useMemo(() => txs.filter(t => t.date.startsWith(month) && (person==="Semua" || t.subject===person) &&
    (typeFilter==="all" || t.type===typeFilter) &&
    (t.description+" "+t.category+" "+t.account+" "+t.subject).toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>b.date.localeCompare(a.date)), [txs,month,person,typeFilter,search]);
  const summary = useMemo(() => {
    const m = txs.filter(t=>t.date.startsWith(month) && (person==="Semua" || t.subject===person));
    return {
      income:m.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0),
      expense:m.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0),
      saving:m.filter(t=>t.type==="saving").reduce((a,t)=>a+t.amount,0),
      transfer:m.filter(t=>t.type==="transfer").reduce((a,t)=>a+t.amount,0),
      count:m.length
    };
  },[txs,month,person]);
  const categories = useMemo(() => {
    const map = new Map<string,number>();
    txs.filter(t=>t.date.startsWith(month) && t.type==="expense" && (person==="Semua" || t.subject===person))
      .forEach(t=>map.set(t.category,(map.get(t.category)||0)+t.amount));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7);
  },[txs,month,person]);
  const maxCat = Math.max(1,...categories.map(c=>c[1]));

  function openNew(type:TxType="expense") {
    setEditing(null); setForm({id:"",date:today,type,amount:0,description:"",category:type==="income"?"Paycheck":type==="saving"?"Emergency Fund":type==="transfer"?"Between own accounts":"Food",subject:"Ivan",account:"Cash",notes:""}); setShowForm(true);
  }
  function openEdit(t:Tx) { setEditing(t); setForm({...t}); setShowForm(true); }
  async function saveTx(e:React.FormEvent) {
    e.preventDefault();
    if (!form.amount || form.amount<=0 || !form.date || !form.description.trim()) { notify("Isi tanggal, nominal, dan keterangan terlebih dahulu."); return; }
    const record = {...form,id:editing?.id || crypto.randomUUID()};
    if (supabase && householdId) {
      const payload = {household_id:householdId,date:record.date,type:record.type,amount:record.amount,description:record.description,category:record.category,subject:record.subject,account:record.account,notes:record.notes};
      const q = editing ? supabase.from("transactions").update(payload).eq("id",record.id) : supabase.from("transactions").insert(payload);
      const {error} = await q;
      if (error) { notify("Gagal menyimpan: "+error.message); return; }
      await loadCloud();
    } else {
      setTxs(old=>editing?old.map(t=>t.id===record.id?record:t):[record,...old]);
    }
    setShowForm(false); notify(editing?"Transaksi diperbarui.":"Transaksi disimpan.");
  }
  async function removeTx(id:string) {
    if (!confirm("Hapus transaksi ini?")) return;
    if (supabase) {
      const {error}=await supabase.from("transactions").delete().eq("id",id);
      if(error){notify("Gagal menghapus: "+error.message);return;}
      await loadCloud();
    } else setTxs(old=>old.filter(t=>t.id!==id));
    notify("Transaksi dihapus.");
  }
  async function authenticate(e:React.FormEvent) {
    e.preventDefault(); if(!supabase)return; setBusy(true);
    const result = authMode==="login"
      ? await supabase.auth.signInWithPassword({email:authEmail,password:authPassword})
      : await supabase.auth.signUp({email:authEmail,password:authPassword});
    setBusy(false);
    if(result.error) notify(result.error.message);
    else if(authMode==="signup") notify("Periksa email untuk konfirmasi akun, jika konfirmasi diaktifkan.");
  }
  async function signOut(){ if(supabase) await supabase.auth.signOut(); }

  function exportExcel() {
    const rows = txs.map(t=>({Date:t.date,Type:t.type,Amount:t.amount,Description:t.description,Category:t.category,Subject:t.subject,Account:t.account,Notes:t.notes||""}));
    const byType = ["income","expense","saving","transfer"].map(type=>({Type:type,Total:txs.filter(t=>t.type===type).reduce((s,t)=>s+t.amount,0)}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Transactions");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(byType),"Summary");
    XLSX.writeFile(wb,`Finance-Tracker-${month}.xlsx`);
    notify("File Excel berhasil diekspor.");
  }
  async function importExcel(file?:File) {
    if(!file)return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data,{type:"array",cellDates:true});
      const sheet = wb.Sheets["Transactions"] || wb.Sheets[wb.SheetNames[0]];
      const aoa:any[][] = XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:""});
      const imported:Tx[] = [];
      const isoDate = (v:any) => {
        if (v instanceof Date) return v.toISOString().slice(0,10);
        if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}` : ""; }
        const text = String(v || "").slice(0,10); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
      };
      const add = (date:any, amount:any, description:any, category:any, subject:any, type:TxType) => {
        const d=isoDate(date), n=Number(amount);
        if(d && n>0 && String(description||"").trim()) imported.push({id:crypto.randomUUID(),date:d,type,amount:n,description:String(description),category:String(category||"Other").trim(),subject:String(subject||"Ivan")==="Jessica"?"Jessica":"Ivan",account:"Unspecified",notes:""});
      };
      // Supports the original workbook layout: expenses in B:F and income in H:L.
      const originalLayout = aoa.some((r:any[]) => String(r?.[1]).trim()==="Date" && String(r?.[2]).trim()==="Amount");
      if(originalLayout) {
        for(let i=3;i<aoa.length;i++) { const r=aoa[i]||[]; add(r[1],r[2],r[3],r[4],r[5],String(r[4]).trim().toLowerCase()==="saving"?"saving":"expense"); add(r[7],r[8],r[9],r[10],r[11],"income"); }
      } else {
        const rows:any[] = XLSX.utils.sheet_to_json(sheet,{defval:""});
        rows.forEach((r:any)=> { const typeText=String(r.Type||r.type||"expense").toLowerCase(); const type=( ["income","expense","saving","transfer"].includes(typeText)?typeText:"expense") as TxType; add(r.Date||r.date,r.Amount??r.amount,r.Description??r.description,r.Category??r.category,r.Subject??r.subject,type); });
      }
      if(!imported.length){notify("Tidak ada baris transaksi valid. Gunakan kolom Date, Type, Amount, Description, Category, Subject, Account, Notes.");return;}
      if(!confirm(`Impor ${imported.length} transaksi? Data yang ada tidak akan dihapus.`))return;
      if(supabase && householdId) {
        const payload=imported.map(t=>({household_id:householdId,date:t.date,type:t.type,amount:t.amount,description:t.description,category:t.category,subject:t.subject,account:t.account,notes:t.notes}));
        const {error}=await supabase.from("transactions").insert(payload);
        if(error){notify("Gagal impor: "+error.message);return;}
        await loadCloud();
      } else setTxs(old=>[...imported,...old]);
      notify(`${imported.length} transaksi berhasil diimpor.`);
    } catch { notify("File tidak bisa dibaca. Pastikan format .xlsx atau .xls."); }
  }

  if (!sessionReady) return <div className="center">Memuat Finance Tracker…</div>;
  if (cloudReady && !userEmail) return <div className="auth-wrap"><form className="auth-card" onSubmit={authenticate}>
    <div className="brand-mark"><Wallet/></div><p className="eyebrow">IVAN & JESSICA</p><h1>Finance Tracker</h1><p className="muted">Masuk untuk mengakses buku keuangan bersama.</p>
    <label>Email<input type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} /></label>
    <label>Password<input type="password" required minLength={6} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} /></label>
    <button className="primary full" disabled={busy}>{busy?"Memproses…":authMode==="login"?"Masuk":"Buat akun"}</button>
    <button type="button" className="link-button" onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"Belum punya akun? Daftar":"Sudah punya akun? Masuk"}</button>
  </form></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Wallet size={20}/></div><div><b>Finance Tracker</b><small>IVAN & JESSICA</small></div></div>
      <div className="workspace"><span className="avatar">I</span><span className="avatar pink">J</span><div><b>Shared space</b><small>{demo?"Mode lokal":"Cloud workspace"}</small></div></div>
      <nav>
        {[["Dashboard",LayoutDashboard],["Transactions",Activity],["Reports",ChartNoAxesCombined],["Settings",Settings]].map(([name,Icon]:any)=><button key={name} className={page===name?"nav-item active":"nav-item"} onClick={()=>setPage(name)}><Icon size={18}/>{name}</button>)}
      </nav>
      <div className="side-bottom"><ShieldCheck size={16}/><span>{demo?"Data tersimpan di browser ini":"Akses bersama berbasis akun"}</span></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">SHARED FINANCES</p><h1>{page}</h1></div><div className="top-actions">
        <select value={month} onChange={e=>setMonth(e.target.value)} aria-label="Pilih bulan"><option value="2026-11">November 2026</option>{Array.from(new Set(txs.map(t=>t.date.slice(0,7)))).sort().reverse().filter(m=>m!=="2026-11").map(m=><option key={m} value={m}>{new Date(m+"-01").toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</option>)}</select>
        <select value={person} onChange={e=>setPerson(e.target.value)} aria-label="Filter pengguna"><option>Semua</option><option>Ivan</option><option>Jessica</option></select>
        {!demo && <button className="icon-btn" onClick={signOut} title="Keluar"><LogOut size={18}/></button>}
      </div></header>
      {page==="Dashboard" && <>
        <section className="welcome"><div><span className="pill"><Sparkles size={13}/> Ringkasan keuangan bersama</span><h2>Kelola uang dengan lebih jelas.</h2><p>Pantau pemasukan, pengeluaran, dan tabungan Ivan & Jessica dalam satu tempat.</p></div><div className="welcome-icon"><Wallet size={46}/></div></section>
        <section className="stats-grid">
          <Stat icon={<ArrowDownLeft/>} label="Total pemasukan" value={money(summary.income)} tone="green" />
          <Stat icon={<ArrowUpRight/>} label="Pengeluaran" value={money(summary.expense)} tone="orange" />
          <Stat icon={<Wallet/>} label="Tabungan" value={money(summary.saving)} tone="blue" />
          <Stat icon={<ArrowLeftRight/>} label="Transfer" value={money(summary.transfer)} tone="purple" />
        </section>
        <section className="content-grid">
          <div className="panel"><div className="panel-head"><div><h3>Pengeluaran per kategori</h3><p>Distribusi expense bulan terpilih</p></div><span className="soft-tag">{categories.length} kategori</span></div>
            {categories.length? <div className="bars">{categories.map(([name,value])=><div className="bar-row" key={name}><div className="bar-label"><span>{name}</span><b>{money(value)}</b></div><div className="bar-track"><div className="bar-fill" style={{width:`${value/maxCat*100}%`}}/></div></div>)}</div>:<Empty text="Belum ada data pengeluaran pada bulan ini."/>}
          </div>
          <div className="panel"><div className="panel-head"><div><h3>Aktivitas bulan ini</h3><p>Jumlah transaksi tercatat</p></div><CalendarDays size={18}/></div><div className="activity-number">{summary.count}</div><p className="muted">transaksi untuk {person==="Semua"?"Ivan & Jessica":person}</p><div className="quick-actions"><button onClick={()=>openNew("expense")}><Plus size={16}/> Pengeluaran</button><button onClick={()=>openNew("income")}><Plus size={16}/> Pemasukan</button><button onClick={()=>openNew("saving")}><Plus size={16}/> Tabungan</button></div></div>
        </section>
        <section className="panel"><div className="panel-head"><div><h3>Transaksi terbaru</h3><p>Catatan keuangan terbaru pada periode ini</p></div><button className="text-btn" onClick={()=>setPage("Transactions")}>Lihat semua →</button></div><TransactionTable rows={filtered.slice(0,6)} onEdit={openEdit} onDelete={removeTx}/></section>
      </>}
      {page==="Transactions" && <section className="panel"><div className="panel-head"><div><h3>Semua transaksi</h3><p>{filtered.length} transaksi ditemukan</p></div><button className="primary" onClick={()=>openNew()}><Plus size={16}/> Tambah transaksi</button></div>
        <div className="toolbar"><div className="search"><Search size={16}/><input placeholder="Cari keterangan, kategori, rekening…" value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">Semua jenis</option><option value="income">Income</option><option value="expense">Expense</option><option value="saving">Saving</option><option value="transfer">Transfer</option></select></div>
        <TransactionTable rows={filtered} onEdit={openEdit} onDelete={removeTx}/>
      </section>}
      {page==="Reports" && <section className="panel"><div className="panel-head"><div><h3>Laporan bulanan</h3><p>Ringkasan berdasarkan jenis transaksi</p></div><button className="primary" onClick={exportExcel}><Download size={16}/> Export Excel</button></div><div className="report-grid">
        {[["Pemasukan",summary.income],["Pengeluaran",summary.expense],["Tabungan",summary.saving],["Transfer",summary.transfer]].map(([label,value]:any)=><div className="report-card"><span>{label}</span><b>{money(value)}</b></div>)}
      </div><h3 className="subheading">Expense per kategori</h3>{categories.map(([name,value])=><div className="report-line"><span>{name}</span><b>{money(value)}</b></div>)}</section>}
      {page==="Settings" && <section className="panel"><h3>Pengaturan Finance Tracker</h3><p className="muted">Pengguna: Ivan dan Jessica · Keduanya dapat melihat serta mengelola seluruh transaksi.</p><div className="settings-row"><div><b>Impor dari Excel</b><p>Gunakan sheet Transactions dengan kolom Date, Type, Amount, Description, Category, Subject, Account, Notes.</p></div><label className="secondary file-label"><Upload size={16}/> Pilih file<input type="file" accept=".xlsx,.xls" onChange={e=>importExcel(e.target.files?.[0])}/></label></div><div className="settings-row"><div><b>Ekspor ke Excel</b><p>Unduh transaksi dan ringkasan jenis transaksi.</p></div><button className="secondary" onClick={exportExcel}><FileSpreadsheet size={16}/> Export .xlsx</button></div><div className="settings-row"><div><b>Status penyimpanan</b><p>{demo?"Mode demo: data tersimpan di browser/perangkat ini saja. Untuk sinkronisasi dua akun, hubungkan Supabase.":"Cloud: data disimpan pada database bersama."}</p></div><span className={demo?"status-warn":"status-ok"}>{demo?"Lokal":"Terhubung"}</span></div></section>}
      <footer>Finance Tracker · Dibuat untuk Ivan & Jessica <span>{demo?"Demo lokal":"Cloud sync aktif"}</span></footer>
    </main>
    {showForm && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><form className="modal" onSubmit={saveTx}><div className="modal-head"><div><p className="eyebrow">{editing?"EDIT TRANSACTION":"NEW TRANSACTION"}</p><h2>{editing?"Ubah transaksi":"Tambah transaksi"}</h2></div><button type="button" className="icon-btn" onClick={()=>setShowForm(false)}><X/></button></div>
      <label>Jenis transaksi<select value={form.type} onChange={e=>setForm({...form,type:e.target.value as TxType,category:e.target.value==="income"?"Paycheck":e.target.value==="saving"?"Emergency Fund":e.target.value==="transfer"?"Between own accounts":"Food"})}><option value="expense">Expense</option><option value="income">Income</option><option value="saving">Saving</option><option value="transfer">Transfer</option></select></label>
      <div className="form-row"><label>Tanggal<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></label><label>Nominal (Rp)<input type="number" min="1" step="1" value={form.amount||""} onChange={e=>setForm({...form,amount:Number(e.target.value)})} required/></label></div>
      <label>Keterangan<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Contoh: belanja bulanan" required/></label>
      <div className="form-row"><label>Kategori<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{(form.type==="income"?incomeCategories:form.type==="saving"?savingCategories:form.type==="transfer"?transferCategories:expenseCategories).map(c=><option key={c}>{c}</option>)}</select></label><label>Dicatat oleh<select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value as Person})}><option>Ivan</option><option>Jessica</option></select></label></div>
      <label>Rekening / sumber dana<input value={form.account} onChange={e=>setForm({...form,account:e.target.value})} placeholder="Cash, BCA, e-wallet…"/></label>
      <label>Catatan (opsional)<textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Batal</button><button className="primary">Simpan transaksi</button></div>
    </form></div>}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
function Stat({icon,label,value,tone}:{icon:React.ReactNode,label:string,value:string,tone:string}) {return <div className="stat-card"><div className={"stat-icon "+tone}>{icon}</div><div><span>{label}</span><b>{value}</b></div></div>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}
function TransactionTable({rows,onEdit,onDelete}:{rows:Tx[],onEdit:(t:Tx)=>void,onDelete:(id:string)=>void}) {
  if(!rows.length)return <Empty text="Belum ada transaksi. Tambahkan transaksi atau impor file Excel."/>
  return <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Subjek</th><th>Jenis</th><th className="right">Nominal</th><th></th></tr></thead><tbody>{rows.map(t=><tr key={t.id}><td>{new Date(t.date+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</td><td className="description">{t.description}<small>{t.account}</small></td><td>{t.category}</td><td><span className="person-chip">{t.subject}</span></td><td><span className={"type-chip "+t.type}>{t.type}</span></td><td className="right amount">{money(t.amount)}</td><td><div className="row-actions"><button title="Edit" onClick={()=>onEdit(t)}>Edit</button><button title="Hapus" onClick={()=>onDelete(t.id)}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div>
}
export default App;
