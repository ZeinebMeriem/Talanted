import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Folder as FolderIcon, CheckCircle as CheckCircleIcon, Users as UsersIcon,
  TrendingUp as TrendingUpIcon, Search, RefreshCw, FileSpreadsheet, LogOut,
  Plus, Trash2, Activity, Check, AlertCircle, Loader2, Sparkles, Cpu, Database,
  X, ChevronRight, Shield, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  getAdminUsers, getAdminStats, getAdminActivity, getAdminDailyChart,
  getAdminServiceHealth, deleteAdminUser, setAdminUserEnabled, setAdminUserRole,
  type AdminUser, type AdminStats, type GenerationListItem, type DailyChartItem,
  type ServiceHealth,
} from '../api';

// ─── helpers ──────────────────────────────────────────────────────────────────

function userName(u: AdminUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '—';
}

function userRole(u: AdminUser): 'Super Admin' | 'Admin' | 'Developer' {
  if (u.username === 'superadmin') return 'Super Admin';
  if (u.roles?.includes('admin')) return 'Admin';
  return 'Developer';
}

function avatarColor(role: string): string {
  if (role === 'Super Admin') return 'from-fuchsia-500 to-pink-600';
  if (role === 'Admin') return 'from-emerald-500 to-teal-600';
  return 'from-blue-500 to-indigo-600';
}

function fmtLastActive(ts?: number | null): string {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Active now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTs(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function normaliseStatus(s?: string): 'Completed' | 'Processing' | 'Failed' {
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'PROCESSING') return 'Processing';
  return 'Failed';
}

function buildWeeklyChart(activity: GenerationListItem[]): { day: string; completed: number; processing: number; failed: number }[] {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const map: Record<string, { completed: number; processing: number; failed: number }> = {};
  days.forEach(d => { map[d] = { completed: 0, processing: 0, failed: 0 }; });
  activity.forEach(g => {
    const day = g.createdAt?.slice(0, 10);
    if (day && map[day]) {
      const st = normaliseStatus(g.status);
      if (st === 'Completed') map[day].completed++;
      else if (st === 'Processing') map[day].processing++;
      else map[day].failed++;
    }
  });
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map(d => ({ day: labels[new Date(d).getDay()], ...map[d] }));
}

// ─── component ────────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC<{
  onBackToWorkspace?: () => void;
  activeMenu?: string;
  onMenuChange?: (menu: string) => void;
  accessToken?: string;
}> = ({ onBackToWorkspace, activeMenu: externalActiveMenu, onMenuChange, accessToken }) => {
  const embedded = externalActiveMenu !== undefined;

  // nav
  const [internalActiveMenu, setInternalActiveMenu] = useState('Overview');
  const activeMenu = embedded ? externalActiveMenu! : internalActiveMenu;
  const setActiveMenu = (m: string) => { if (embedded) onMenuChange?.(m); else setInternalActiveMenu(m); };

  const [searchQuery, setSearchQuery] = useState('');

  // real data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminActivity, setAdminActivity] = useState<GenerationListItem[]>([]);
  const [adminHealth, setAdminHealth] = useState<ServiceHealth | null>(null);
  const [adminDailyChart, setAdminDailyChart] = useState<DailyChartItem[]>([]);

  // ui state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '', username: '', password: '', role: 'Developer' as 'Admin' | 'Developer' });
  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [users, stats, activity, chart, health] = await Promise.all([
        getAdminUsers(accessToken),
        getAdminStats(accessToken),
        getAdminActivity(accessToken),
        getAdminDailyChart(accessToken, 30),
        getAdminServiceHealth(accessToken),
      ]);
      setAdminUsers(users);
      setAdminStats(stats);
      setAdminActivity(activity);
      setAdminDailyChart(chart);
      setAdminHealth(health);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleRefresh = () => { setIsRefreshing(true); showToast('Refreshing data…'); void loadData(true); };

  // ── delete user ──
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Revoke access for ${name}?`)) return;
    setActionLoading(p => ({ ...p, [userId + '_del']: true }));
    try {
      await deleteAdminUser(userId, accessToken);
      setAdminUsers(prev => prev.filter(u => u.userId !== userId));
      showToast(`${name} removed.`);
    } catch { showToast('Delete failed.'); }
    finally { setActionLoading(p => ({ ...p, [userId + '_del']: false })); }
  };

  // ── toggle enabled ──
  const handleToggleEnabled = async (u: AdminUser) => {
    if (!u.userId) return;
    const newVal = !u.enabled;
    setActionLoading(p => ({ ...p, [u.userId! + '_en']: true }));
    try {
      await setAdminUserEnabled(u.userId, newVal, accessToken);
      setAdminUsers(prev => prev.map(x => x.userId === u.userId ? { ...x, enabled: newVal } : x));
      showToast(`${userName(u)} ${newVal ? 'enabled' : 'disabled'}.`);
    } catch { showToast('Action failed.'); }
    finally { setActionLoading(p => ({ ...p, [u.userId! + '_en']: false })); }
  };

  // ── toggle admin role ──
  const handleToggleRole = async (u: AdminUser) => {
    if (!u.userId) return;
    const isAdmin = u.roles?.includes('admin');
    setActionLoading(p => ({ ...p, [u.userId! + '_role']: true }));
    try {
      await setAdminUserRole(u.userId, 'admin', !isAdmin, accessToken);
      setAdminUsers(prev => prev.map(x => {
        if (x.userId !== u.userId) return x;
        const roles = isAdmin ? (x.roles ?? []).filter(r => r !== 'admin') : [...(x.roles ?? []), 'admin'];
        return { ...x, roles };
      }));
      showToast(`${userName(u)} role updated.`);
    } catch { showToast('Role update failed.'); }
    finally { setActionLoading(p => ({ ...p, [u.userId! + '_role']: false })); }
  };

  // ── add user ──
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email || !addForm.username || !addForm.password) { showToast('All fields are required.'); return; }
    setAddLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BFF_BASE_URL || 'http://localhost:8081'}/api/users/public/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: addForm.firstName, lastName: addForm.lastName, email: addForm.email, username: addForm.username, password: addForm.password }),
      });
      const data = await res.json().catch(() => ({})) as Record<string, string>;
      if (!res.ok) { showToast(data.error || 'Registration failed.'); return; }
      // If admin role requested, assign it after creation
      if (addForm.role === 'Admin') {
        // Re-load users to get the new user's ID, then assign role
        const updated = await getAdminUsers(accessToken);
        const newUser = updated.find(u => u.email === addForm.email);
        if (newUser?.userId) await setAdminUserRole(newUser.userId, 'admin', true, accessToken);
        setAdminUsers(updated);
      } else {
        void loadData(true);
      }
      setAddForm({ firstName: '', lastName: '', email: '', username: '', password: '', role: 'Developer' });
      setShowAddUserModal(false);
      showToast(`${addForm.email} registered — verification email sent.`);
    } catch { showToast('Registration failed.'); }
    finally { setAddLoading(false); }
  };

  // ── export CSV ──
  const handleExportCSV = () => {
    let csv = '';
    if (activeMenu === 'Users') {
      csv = 'Name,Username,Email,Role,Status,Projects,LastLogin\n';
      adminUsers.forEach(u => {
        csv += `"${userName(u)}","${u.username || ''}","${u.email || ''}","${userRole(u)}","${u.enabled !== false ? 'Active' : 'Inactive'}",${u.projectCount ?? 0},"${fmtLastActive(u.lastLoginAt)}"\n`;
      });
    } else {
      csv = 'ID,User,Prompt,Status,Created\n';
      adminActivity.forEach(g => {
        const u = adminUsers.find(x => x.userId === g.userId);
        csv += `"${g.generationId || ''}","${u ? userName(u) : '—'}","${(g.prompt || '').replace(/"/g, "'")}}","${normaliseStatus(g.status)}","${g.createdAt || ''}"\n`;
      });
    }
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `admin_${activeMenu.toLowerCase()}.csv`;
    a.click();
    showToast(`CSV downloaded.`);
  };

  // ── derived ──
  const weeklyChart = buildWeeklyChart(adminActivity);
  const totalUsers = adminStats?.totalUsers ?? adminUsers.length;
  const totalProjects = adminStats?.totalProjects ?? 0;
  const aveGenTime = adminStats?.avgGenerationSeconds != null ? `${adminStats.avgGenerationSeconds}s` : '—';
  const aveQuality = adminStats?.avgQualityScore != null ? `${adminStats.avgQualityScore}/100` : '—';
  const completedCount = adminStats?.completedProjects ?? 0;
  const processingCount = adminStats?.processingProjects ?? 0;
  const failedCount = adminStats?.failedProjects ?? 0;
  const totalCount = completedCount + processingCount + failedCount;
  const successRate = adminStats?.successRate ?? (totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0);

  const filteredUsers = adminUsers.filter(u =>
    userName(u).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    userRole(u).toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredGenerations = adminActivity.filter(g => {
    const u = adminUsers.find(x => x.userId === g.userId);
    const name = u ? userName(u) : '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.prompt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      normaliseStatus(g.status).toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 flex items-stretch justify-center selection:bg-indigo-500 selection:text-white font-sans antialiased relative">

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold text-white">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full min-h-screen bg-slate-50 flex flex-col md:flex-row items-stretch">

        {/* ── Internal sidebar (only when not embedded) ── */}
        {!embedded && (
          <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-100">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md">T</div>
                <div>
                  <span className="text-sm font-extrabold tracking-wider uppercase text-slate-900 leading-none block">talented.</span>
                  <span className="text-[10px] font-mono text-indigo-600 tracking-widest uppercase mt-1 block">ADMIN PORTAL</span>
                </div>
              </div>
              {onBackToWorkspace && (
                <button onClick={onBackToWorkspace} className="w-full mb-6 text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-100/60 cursor-pointer">
                  <span>←</span><span>Exit Admin Panel</span>
                </button>
              )}
              <p className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-bold mb-3 pl-3">DASHBOARDS</p>
              <nav className="space-y-1 mb-8">
                {[
                  { id: 'Overview', icon: '📊', label: "Vue d'ensemble" },
                  { id: 'Users', icon: '👥', label: 'Utilisateurs' },
                  { id: 'Generations', icon: '⚡', label: 'Compilations' },
                  { id: 'System', icon: '🛠️', label: 'Paramètres' },
                ].map(item => (
                  <button key={item.id} onClick={() => { setActiveMenu(item.id); setSearchQuery(''); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer group transition-all ${activeMenu === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <span className="flex items-center gap-3"><span className="text-sm">{item.icon}</span><span>{item.label}</span></span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-all ${activeMenu === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50/50">

          {/* Header */}
          <header className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{activeMenu === 'Overview' ? "Vue d'ensemble" : activeMenu === 'Users' ? 'Platform Users' : activeMenu === 'Generations' ? 'AI Generations' : 'System'}</span>
                <span className="text-[9.5px] font-mono uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">ADMIN PANEL</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">Real-time platform data from Keycloak, MongoDB and FastAPI.</p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="relative">
                <input type="text" placeholder={`Search…`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-4 py-2 bg-slate-100 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs focus:outline-none transition-all w-44 sm:w-56" />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <button onClick={handleRefresh} className="p-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer group" title="Refresh">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : 'group-hover:rotate-45 transition-transform'}`} />
              </button>
            </div>
          </header>

          {/* Loading / Error */}
          {loading && (
            <div className="flex-1 flex items-center justify-center gap-3 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /><span>Loading admin data…</span>
            </div>
          )}
          {!loading && error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
              <button onClick={() => void loadData()} className="ml-auto text-xs font-bold underline cursor-pointer">Retry</button>
            </div>
          )}

          {!loading && !error && (
            <div className="p-6 space-y-6">

              {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
              {activeMenu === 'Overview' && (
                <div className="space-y-6 text-left">

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Users', value: totalUsers, sub: `${adminUsers.filter(u => u.enabled !== false).length} active`, icon: <UsersIcon className="w-5 h-5 text-blue-600" /> },
                      { label: 'Ave. Gen. Time', value: aveGenTime, sub: 'completed generations', icon: <CheckCircleIcon className="w-5 h-5 text-emerald-600" /> },
                      { label: 'Total Projects', value: totalProjects, sub: 'all workspaces', icon: <FolderIcon className="w-5 h-5 text-indigo-600" /> },
                      { label: 'Ave. Quality Score', value: aveQuality, sub: 'audited builds', icon: <TrendingUpIcon className="w-5 h-5 text-amber-600" /> },
                    ].map((c, i) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_12px_rgba(15,23,42,0.02)] relative group overflow-hidden hover:scale-[1.02] hover:shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-3xl pointer-events-none group-hover:scale-110 transition-transform" />
                        <div className="flex items-center justify-between mb-3.5">
                          <span className="text-xs text-slate-500 font-medium">{c.label}</span>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">{c.icon}</div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{c.value}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{c.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart + donut */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-sm font-bold text-slate-900">Weekly Activity (last 7 days)</h2>
                          <p className="text-[11px] text-slate-500 mt-0.5">Compilation events by day.</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Processing</span>
                        </div>
                      </div>
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={weeklyChart} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="cComp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="cProc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 10 }} />
                            <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cComp)" />
                            <Area type="monotone" dataKey="processing" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#cProc)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Audit des statuts</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Compilation success breakdown.</p>
                      </div>
                      <div className="my-4 flex items-center justify-around gap-2">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <div className="absolute text-center">
                            <span className="text-2xl font-black text-slate-900">{successRate}%</span>
                            <span className="text-[8px] font-mono text-slate-400 uppercase block mt-0.5 font-bold">Success</span>
                          </div>
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="56" cy="56" r="48" className="stroke-slate-100 fill-none" strokeWidth="10" />
                            <circle cx="56" cy="56" r="48" className="stroke-emerald-500 fill-none transition-all duration-1000" strokeWidth="10"
                              strokeDasharray={`${2 * Math.PI * 48}`}
                              strokeDashoffset={`${2 * Math.PI * 48 * (1 - successRate / 100)}`}
                              strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="space-y-2">
                          <div className="text-left">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">GitLab Pushes</span>
                            <span className="text-sm font-extrabold text-slate-900">{adminStats?.gitlabCount ?? 0} webhooks</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Deployed</span>
                            <span className="text-xs font-semibold text-slate-600">{adminStats?.deployedCount ?? 0} live</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {[
                          { label: 'Completed', color: 'bg-emerald-500', count: completedCount },
                          { label: 'Processing', color: 'bg-indigo-500', count: processingCount },
                          { label: 'Failed', color: 'bg-red-500', count: failedCount },
                        ].map(s => (
                          <div key={s.label} className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                            <span className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />{s.label}</span>
                            <span className="font-bold text-slate-800">{s.count} ({totalCount > 0 ? Math.round(s.count / totalCount * 100) : 0}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Operators + Recent */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Operators</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Registered users with platform access.</p>
                        </div>
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase font-mono">{adminUsers.length} total</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {adminUsers.slice(0, 4).map(u => (
                          <div key={u.userId} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarColor(userRole(u))} flex items-center justify-center font-bold text-xs text-white`}>
                                {userName(u).charAt(0).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <h4 className="text-xs font-bold text-slate-800">{userName(u)}</h4>
                                <p className="text-[10px] text-slate-400 leading-none mt-1">{u.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${userRole(u) === 'Super Admin' ? 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100' : userRole(u) === 'Admin' ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                {userRole(u)}
                              </span>
                              <span className="block text-[9px] text-emerald-600 font-mono mt-1 font-bold">● {fmtLastActive(u.lastLoginAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Generations</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Latest compilation activity.</p>
                        </div>
                        <button onClick={() => setActiveMenu('Generations')} className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer">View all →</button>
                      </div>
                      <div className="space-y-2.5">
                        {adminActivity.slice(0, 5).map(g => {
                          const u = adminUsers.find(x => x.userId === g.userId);
                          const st = normaliseStatus(g.status);
                          return (
                            <div key={g.generationId} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-left">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{g.prompt || g.name || 'Untitled'}</p>
                                <p className="text-[9px] text-slate-500 leading-none mt-1">by <span className="text-slate-700 font-semibold">{u ? userName(u) : '—'}</span> · {fmtTs(g.createdAt)}</p>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ml-2 shrink-0 ${st === 'Completed' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : st === 'Processing' ? 'text-indigo-600 bg-indigo-50 border-indigo-100 animate-pulse' : 'text-red-600 bg-red-50 border-red-100'}`}>
                                {st}
                              </span>
                            </div>
                          );
                        })}
                        {adminActivity.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No activity yet.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ USERS ═════════════════════════════════════════════════════════ */}
              {activeMenu === 'Users' && (
                <div className="space-y-6 text-left">
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Operator Registry</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">{adminUsers.length} registered users · {adminUsers.filter(u => u.enabled !== false).length} active</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={handleExportCSV} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /><span>Export CSV</span>
                      </button>
                      <button onClick={() => setShowAddUserModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /><span>Add User</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/75 uppercase text-[10px] font-mono tracking-wider text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-4 px-6">User</th>
                            <th className="py-4 px-6">Role</th>
                            <th className="py-4 px-6">Projects</th>
                            <th className="py-4 px-6">Last Login</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.length > 0 ? filteredUsers.map(u => {
                            const role = userRole(u);
                            const isSuper = role === 'Super Admin';
                            const delLoading = actionLoading[u.userId! + '_del'];
                            const enLoading = actionLoading[u.userId! + '_en'];
                            const roleLoading = actionLoading[u.userId! + '_role'];
                            return (
                              <tr key={u.userId} className={`hover:bg-slate-50/50 transition-colors ${u.enabled === false ? 'opacity-60' : ''}`}>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(role)} flex items-center justify-center font-bold text-white text-xs shrink-0`}>
                                      {userName(u).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900">{userName(u)}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{u.email}</p>
                                      {!u.emailVerified && <span className="text-[9px] text-amber-600 font-mono">⚠ unverified</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${role === 'Super Admin' ? 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100' : role === 'Admin' ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                    {role}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="font-bold text-slate-800 font-mono">{u.projectCount ?? 0}</span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="text-slate-500 font-mono text-[10px]">{fmtLastActive(u.lastLoginAt)}</span>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center justify-end gap-1">
                                    {!isSuper && (
                                      <>
                                        {/* Toggle admin role */}
                                        <button title={u.roles?.includes('admin') ? 'Remove admin' : 'Make admin'}
                                          disabled={roleLoading}
                                          onClick={() => void handleToggleRole(u)}
                                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all cursor-pointer">
                                          {roleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                        </button>
                                        {/* Toggle enabled */}
                                        <button title={u.enabled !== false ? 'Disable' : 'Enable'}
                                          disabled={enLoading}
                                          onClick={() => void handleToggleEnabled(u)}
                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer">
                                          {enLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : u.enabled !== false ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                        </button>
                                        {/* Delete */}
                                        <button title="Delete user" disabled={delLoading}
                                          onClick={() => void handleDeleteUser(u.userId!, userName(u))}
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer">
                                          {delLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                      </>
                                    )}
                                    {isSuper && <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Protected</span>}
                                  </div>
                                </td>
                              </tr>
                            );
                          }) : (
                            <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-mono">No users match "{searchQuery}".</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add user modal */}
                  {showAddUserModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative">
                        <button onClick={() => setShowAddUserModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        <h3 className="text-base font-extrabold text-slate-900 mb-1">Register New User</h3>
                        <p className="text-xs text-slate-500 mb-5">A verification email will be sent automatically.</p>
                        <form onSubmit={e => void handleAddUser(e)} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] uppercase font-mono text-slate-500 font-bold">First Name</label>
                              <input value={addForm.firstName} onChange={e => setAddForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Jane" className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none mt-1" />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-mono text-slate-500 font-bold">Last Name</label>
                              <input value={addForm.lastName} onChange={e => setAddForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Doe" className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none mt-1" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-mono text-slate-500 font-bold">Email</label>
                            <input type="email" required value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none mt-1" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-mono text-slate-500 font-bold">Username</label>
                            <input required value={addForm.username} onChange={e => setAddForm(p => ({ ...p, username: e.target.value }))} placeholder="janedoe" className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none mt-1" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-mono text-slate-500 font-bold">Password</label>
                            <input type="password" required value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none mt-1" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-mono text-slate-500 font-bold">Role</label>
                            <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value as 'Admin' | 'Developer' }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none mt-1 cursor-pointer">
                              <option value="Developer">Developer</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </div>
                          <button type="submit" disabled={addLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer mt-2">
                            {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>{addLoading ? 'Creating…' : 'Create User'}</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ GENERATIONS ═══════════════════════════════════════════════════ */}
              {activeMenu === 'Generations' && (
                <div className="space-y-6 text-left">
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Active Queue Monitor</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">{adminActivity.length} recent generations across all users.</p>
                    </div>
                    <button onClick={handleExportCSV} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 cursor-pointer">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /><span>Export CSV</span>
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/75 uppercase text-[10px] font-mono tracking-wider text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-4 px-6">Prompt / Project</th>
                            <th className="py-4 px-6">User</th>
                            <th className="py-4 px-6">Created</th>
                            <th className="py-4 px-6">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredGenerations.length > 0 ? filteredGenerations.map(g => {
                            const u = adminUsers.find(x => x.userId === g.userId);
                            const st = normaliseStatus(g.status);
                            return (
                              <tr key={g.generationId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6 max-w-xs">
                                  <p className="font-bold text-slate-900 truncate">{g.name || g.prompt || 'Untitled'}</p>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{g.generationId?.slice(0, 14)}…</p>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${u ? avatarColor(userRole(u)) : 'from-slate-400 to-slate-500'} flex items-center justify-center text-white font-bold text-[10px]`}>
                                      {u ? userName(u).charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span className="font-semibold text-slate-700">{u ? userName(u) : '—'}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="font-mono text-slate-500 text-[10px]">{fmtTs(g.createdAt)}</span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded-md ${st === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : st === 'Processing' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                    {st}
                                  </span>
                                </td>
                              </tr>
                            );
                          }) : (
                            <tr><td colSpan={4} className="py-8 text-center text-xs text-slate-400 font-mono">No results for "{searchQuery}".</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ SYSTEM ════════════════════════════════════════════════════════ */}
              {activeMenu === 'System' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">

                  {/* Service Health */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Database className="w-4 h-4 text-indigo-600" /><span>Service Health</span></h3>
                      <p className="text-xs text-slate-500 mt-1">Live status of all platform services.</p>
                    </div>
                    {adminHealth ? (
                      <div className="space-y-3">
                        {(Object.entries(adminHealth) as [string, { status: string; responseMs: number }][]).map(([svc, e]) => {
                          const up = e.status === 'UP';
                          const msColor = e.responseMs < 100 ? '#10b981' : e.responseMs < 500 ? '#f59e0b' : '#ef4444';
                          return (
                            <div key={svc} className={`p-4 rounded-2xl flex items-center gap-4 border ${up ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'}`}>
                              <div className={`w-3 h-3 rounded-full shrink-0 ${up ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ boxShadow: up ? '0 0 8px #34d399' : '0 0 8px #f87171' }} />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800 capitalize">{svc}</p>
                                <p className={`text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>{e.status}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black" style={{ color: msColor }}>{e.responseMs}<span className="text-[10px] font-normal text-slate-400 ml-0.5">ms</span></p>
                                <p className="text-[10px] text-slate-400">{e.responseMs < 100 ? 'Excellent' : e.responseMs < 500 ? 'Normal' : 'Slow'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /><span>Loading…</span></div>
                    )}
                    <button onClick={() => { setIsRefreshing(true); void loadData(true); }}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Refresh health
                    </button>
                  </div>

                  {/* Platform stats */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Cpu className="w-4 h-4 text-indigo-600" /><span>Platform Statistics</span></h3>
                      <p className="text-xs text-slate-500 mt-1">Aggregated metrics from MongoDB.</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Total Users', value: String(adminStats?.totalUsers ?? adminUsers.length) },
                        { label: 'Total Projects', value: String(adminStats?.totalProjects ?? 0) },
                        { label: 'Success Rate', value: `${successRate}%` },
                        { label: 'Avg. Gen. Time', value: aveGenTime },
                        { label: 'Avg. Quality', value: aveQuality },
                        { label: 'GitLab Integrations', value: String(adminStats?.gitlabCount ?? 0) },
                        { label: 'Deployed Projects', value: String(adminStats?.deployedCount ?? 0) },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <span className="text-xs text-slate-500 font-medium">{r.label}</span>
                          <span className="text-xs font-bold text-slate-900 font-mono">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
