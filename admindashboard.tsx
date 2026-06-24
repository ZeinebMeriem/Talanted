import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Folder as FolderIcon, 
  CheckCircle as CheckCircleIcon, 
  Users as UsersIcon, 
  TrendingUp as TrendingUpIcon, 
  Bell, 
  Search, 
  RefreshCw, 
  FileSpreadsheet, 
  LogOut, 
  Plus, 
  Trash2, 
  Shield, 
  Activity, 
  Check, 
  AlertCircle, 
  Loader2, 
  Lock, 
  Unlock, 
  GitPullRequest, 
  Sparkles, 
  Cpu, 
  Database,
  Globe,
  Settings,
  X,
  Sliders,
  ChevronRight
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface User {
  id: string;
  name: string;
  role: 'Super Admin' | 'Admin' | 'Developer';
  email: string;
  status: 'Active' | 'Inactive';
  avatarColor: string;
  generationsCount: number;
  avgQuality: number;
  lastActive: string;
}

interface Generation {
  id: string;
  user: string;
  type: string;
  status: 'Completed' | 'Processing' | 'Failed';
  duration: string;
  qualityScore: number;
  timestamp: string;
}

// ============================================================================
// CONSTANTS & INITIAL DATA
// ============================================================================
const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'nouha chine',
    role: 'Super Admin',
    email: 'nouha.chine@talented.ai',
    status: 'Active',
    avatarColor: 'from-fuchsia-500 to-pink-600',
    generationsCount: 18,
    avgQuality: 85,
    lastActive: 'Active now'
  },
  {
    id: 'u2',
    name: 'Developpeur PFE',
    role: 'Developer',
    email: 'pfe.dev@talented.ai',
    status: 'Active',
    avatarColor: 'from-blue-500 to-indigo-600',
    generationsCount: 11,
    avgQuality: 78,
    lastActive: '5m ago'
  },
  {
    id: 'u3',
    name: 'Alex Morgan',
    role: 'Admin',
    email: 'alex.morgan@talented.ai',
    status: 'Active',
    avatarColor: 'from-emerald-500 to-teal-600',
    generationsCount: 7,
    avgQuality: 79,
    lastActive: '1h ago'
  }
];

const INITIAL_GENERATIONS: Generation[] = [
  { id: 'g1', user: 'nouha chine', type: 'SaaS Client Dashboard', status: 'Completed', duration: '4.2s', qualityScore: 84, timestamp: '2m ago' },
  { id: 'g2', user: 'Developpeur PFE', type: 'Database Schema Mapper', status: 'Completed', duration: '6.1s', qualityScore: 81, timestamp: '12m ago' },
  { id: 'g3', user: 'Developpeur PFE', type: 'Tailwind Bento Grid', status: 'Completed', duration: '3.8s', qualityScore: 79, timestamp: '25m ago' },
  { id: 'g4', user: 'Alex Morgan', type: 'OAuth Gateway Wrapper', status: 'Completed', duration: '5.4s', qualityScore: 80, timestamp: '1h ago' },
  { id: 'g5', user: 'nouha chine', type: 'Multi-Agent LLM Router', status: 'Completed', duration: '7.8s', qualityScore: 89, timestamp: '2h ago' },
  { id: 'g6', user: 'Developpeur PFE', type: 'Canvas Drawing Engine', status: 'Completed', duration: '5.9s', qualityScore: 74, timestamp: '4h ago' },
  { id: 'g7', user: 'Alex Morgan', type: 'Figma Token Sync API', status: 'Completed', duration: '4.9s', qualityScore: 77, timestamp: '1d ago' },
  { id: 'g8', user: 'nouha chine', type: 'Admin Analytics Portal', status: 'Processing', duration: 'Pending', qualityScore: 0, timestamp: 'Just now' },
  { id: 'g9', user: 'Developpeur PFE', type: 'GitLab Push Webhook', status: 'Processing', duration: 'Pending', qualityScore: 0, timestamp: '2m ago' },
  { id: 'g10', user: 'Developpeur PFE', type: 'W3C Standard Compiler', status: 'Processing', duration: 'Pending', qualityScore: 0, timestamp: '5m ago' },
  { id: 'g11', user: 'Alex Morgan', type: 'CSV Exporter Utility', status: 'Processing', duration: 'Pending', qualityScore: 0, timestamp: '12m ago' },
  { id: 'g12', user: 'Developpeur PFE', type: 'Stripe Subscription Route', status: 'Failed', duration: '12.4s', qualityScore: 0, timestamp: '1h ago' },
  { id: 'g13', user: 'nouha chine', type: 'Real-time Canvas Sync', status: 'Failed', duration: '15.1s', qualityScore: 0, timestamp: '3h ago' },
  { id: 'g14', user: 'Developpeur PFE', type: 'D3 Chart Wrapper Class', status: 'Failed', duration: '10.2s', qualityScore: 0, timestamp: '1d ago' },
];

const WEEKLY_COMPILATION_DATA = [
  { day: 'Mon', completed: 15, failed: 2, processing: 4 },
  { day: 'Tue', completed: 22, failed: 1, processing: 2 },
  { day: 'Wed', completed: 18, failed: 3, processing: 5 },
  { day: 'Thu', completed: 29, failed: 4, processing: 3 },
  { day: 'Fri', completed: 35, failed: 2, processing: 6 },
  { day: 'Sat', completed: 12, failed: 0, processing: 1 },
  { day: 'Sun', completed: 19, failed: 1, processing: 2 },
];

// Status Colors for Donut
const STATUS_COLORS = {
  Completed: '#10b981', // Emerald
  Processing: '#6366f1', // Indigo / Purple
  Failed: '#ef4444', // Red
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const AdminDashboard: React.FC<{ onBackToWorkspace?: () => void }> = ({ onBackToWorkspace }) => {
  // Session / Auth States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('admin@talented.ai');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');
  const [loginError, setLoginError] = useState<string>('');
  
  // Navigation
  const [activeMenu, setActiveMenu] = useState<string>('Overview');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [generations, setGenerations] = useState<Generation[]>(INITIAL_GENERATIONS);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New User Form Modal
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Developer'>('Developer');

  // Trigger non-intrusive notification toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'admin@talented.ai' && loginPassword === 'admin123') {
      setIsAuthenticated(true);
      showToast('Welcome back, Administrator!');
      setLoginError('');
    } else {
      setLoginError('Invalid administrator credentials.');
    }
  };

  // Handle Quick Demo Login
  const handleQuickLogin = () => {
    setIsAuthenticated(true);
    showToast('Authenticated as Super Admin');
  };

  // Simulate Refresh Data
  const handleRefresh = () => {
    setIsRefreshing(true);
    showToast('Refreshing core compiler statistics...');
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('All pipeline node metrics synced successfully.');
    }, 1200);
  };

  // Add User Handler
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      showToast('Please fill out all fields.');
      return;
    }

    const newUser: User = {
      id: 'u' + (users.length + 1),
      name: newUserName,
      role: newUserRole,
      email: newUserEmail,
      status: 'Active',
      avatarColor: newUserRole === 'Admin' ? 'from-teal-500 to-emerald-600' : 'from-indigo-500 to-purple-600',
      generationsCount: 0,
      avgQuality: 80,
      lastActive: 'Just registered'
    };

    setUsers([newUser, ...users]);
    setNewUserName('');
    setNewUserEmail('');
    setShowAddUserModal(false);
    showToast(`Registered ${newUserName} successfully.`);
  };

  // Delete User Handler
  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`Are you sure you want to revoke access for ${name}?`)) {
      setUsers(users.filter(u => u.id !== id));
      showToast(`User ${name} removed from registry.`);
    }
  };

  // Export CSV Data simulator
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeMenu === 'Users') {
      csvContent += "ID,Name,Role,Email,Status,Generations,AvgQuality,LastActive\n";
      users.forEach(u => {
        csvContent += `${u.id},"${u.name}",${u.role},${u.email},${u.status},${u.generationsCount},${u.avgQuality}%,${u.lastActive}\n`;
      });
    } else {
      csvContent += "ID,User,Type,Status,Duration,QualityScore,Timestamp\n";
      generations.forEach(g => {
        csvContent += `${g.id},"${g.user}","${g.type}",${g.status},${g.duration},${g.qualityScore}%,${g.timestamp}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `talented_${activeMenu.toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`CSV file for ${activeMenu} downloaded!`);
  };

  // Dynamic filter for search queries
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGenerations = generations.filter(gen =>
    gen.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gen.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gen.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Core platform calculations
  const totalUsers = users.length;
  const totalProjects = 11; 
  const aveGenTime = '5.4s';
  const aveQualityScore = 79; 

  // Success stats breakdown
  const completedCount = generations.filter(g => g.status === 'Completed').length; 
  const processingCount = generations.filter(g => g.status === 'Processing').length; 
  const failedCount = generations.filter(g => g.status === 'Failed').length; 
  const totalGenerationsCount = completedCount + processingCount + failedCount;
  const successRate = Math.round((completedCount / (completedCount + failedCount)) * 100); 

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 flex items-stretch justify-center selection:bg-indigo-500 selection:text-white font-sans antialiased relative">
      
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold text-white">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================================
          1. OUT-OF-SESSION AUTHENTICATION GATE (LOGIN SCREEN)
          ============================================================================ */}
      {!isAuthenticated ? (
        <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-50 relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
          
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-[0_15px_40px_rgba(15,23,42,0.06)] relative overflow-hidden group z-10">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-indigo-600" />
            
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center font-black text-xl text-white mx-auto shadow-md mb-4">
                T
              </div>
              <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-sans">Talented Admin Control</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Authenticate via secure key signature to access the operational multi-agent pipeline and team dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Admin Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@talented.ai"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Security Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.25)] transition-all cursor-pointer active:scale-98 mt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verify Signature & Connect</span>
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mb-3">Or quick bypass for reviewers</p>
              <button
                type="button"
                onClick={handleQuickLogin}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs border border-slate-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Login as Guest Administrator</span>
              </button>
              {onBackToWorkspace && (
                <button
                  type="button"
                  onClick={onBackToWorkspace}
                  className="w-full mt-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-medium py-2.5 px-4 rounded-xl text-xs border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>← Back to Main Page</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (

        /* ============================================================================
            2. IN-SESSION PREMIUM ADMIN DASHBOARD
            ============================================================================ */
        <div className="w-full min-h-screen bg-slate-50 flex flex-col md:flex-row items-stretch">
          
          {/* ==========================================
              SIDEBAR NAVIGATION (LEFT)
              ========================================== */}
          <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between shrink-0 relative overflow-hidden">
            {/* Ambient background accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              {/* BRAND IDENTIFIER */}
              <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-100">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md shadow-indigo-500/10">
                  T
                </div>
                <div>
                  <span className="text-sm font-extrabold tracking-wider uppercase text-slate-900 leading-none block font-sans">talented.</span>
                  <span className="text-[10px] font-mono text-indigo-600 tracking-widest uppercase mt-1 block">ADMIN PORTAL</span>
                </div>
              </div>
 
              {onBackToWorkspace && (
                <button
                  type="button"
                  onClick={onBackToWorkspace}
                  className="w-full mb-6 text-left px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100/70 hover:text-indigo-700 border border-indigo-100/60 cursor-pointer"
                >
                  <span className="text-sm">←</span>
                  <span>Exit Admin Panel</span>
                </button>
              )}
 
              {/* NAVIGATION MENU ITEMS */}
              <p className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-bold mb-3 pl-3">DASHBOARDS</p>
              <nav className="space-y-1 mb-8">
                {[
                  { id: 'Overview', icon: '📊', label: 'Vue d\'ensemble' },
                  { id: 'Users', icon: '👥', label: 'Utilisateurs' },
                  { id: 'Generations', icon: '⚡', label: 'Compilations' },
                  { id: 'System', icon: '🛠️', label: 'Paramètres' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl transition-all text-xs font-bold flex items-center justify-between cursor-pointer group ${
                      activeMenu === item.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-sm group-hover:scale-110 transition-transform">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all ${activeMenu === item.id ? 'opacity-100 translate-x-0.5' : ''}`} />
                  </button>
                ))}
              </nav>
 
              {/* LIVE SERVICE LOGS ACCENT */}
              <p className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-bold mb-3 pl-3">LIVE CHANNELS</p>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-[10px] space-y-2 font-mono text-slate-500">
                <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-200">
                  <span>Channel</span>
                  <span>Status</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">● Gemini 2.0 Router</span>
                  <span className="text-emerald-600 font-semibold">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">● GitLab Webhooks</span>
                  <span className="text-indigo-600 font-semibold">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">● D2C Compiler</span>
                  <span className="text-emerald-600 font-semibold">Idle</span>
                </div>
              </div>
            </div>
 
            {/* USER ACCREDITATION BADGE FOOTER */}
            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-sm">
                  N
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-bold text-slate-900 leading-tight truncate">nouha chine</p>
                  <p className="text-[9px] text-slate-400 font-mono tracking-wide">Super Admin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  showToast('Logged out of Admin Session');
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer"
                title="Disconnect Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </aside>
 
          {/* ==========================================
              MAIN CONTENT CONTAINER (RIGHT)
              ========================================== */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50/50">
            
            {/* HEADER AREA */}
            <header className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-20">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 font-sans">
                  <span>{activeMenu === 'Overview' ? "Vue d'ensemble" : activeMenu === 'Users' ? 'Platform Users Management' : activeMenu === 'Generations' ? 'AI Generations Logging' : 'System Engine Controls'}</span>
                  <span className="text-[9.5px] font-mono uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">ADMIN PANEL</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">Platform overview, user accounts, and AI code generation audits.</p>
              </div>
 
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Search in ${activeMenu.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-2 bg-slate-100 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 w-44 sm:w-56"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
 
                {/* Refresh Database Action */}
                <button
                  onClick={handleRefresh}
                  className="p-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all text-slate-500 hover:text-slate-800 cursor-pointer group"
                  title="Force Refresh Metrics"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : 'group-hover:rotate-45 transition-transform'}`} />
                </button>
              </div>
            </header>

            {/* MAIN CONTENT CANVAS */}
            <div className="p-6 space-y-6">

              {/* ============================================================================
                  TAB 1: OVERVIEW DASHBOARD (VUE D'ENSEMBLE)
                  ============================================================================ */}
              {activeMenu === 'Overview' && (
                <div className="space-y-6 text-left">
                  
                  {/* TOP ROW STAT CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { 
                        label: 'Total Users', 
                        value: totalUsers, 
                        change: `+${users.length - 3} this week`, 
                        changeType: 'positive',
                        icon: <UsersIcon className="w-5 h-5 text-blue-600" /> 
                      },
                      { 
                        label: 'Ave. Gen. Time', 
                        value: aveGenTime, 
                        change: '-0.4s compile delta', 
                        changeType: 'positive',
                        icon: <CheckCircleIcon className="w-5 h-5 text-emerald-600" /> 
                      },
                      { 
                        label: 'Total Projects', 
                        value: totalProjects, 
                        change: 'Active workspaces', 
                        changeType: 'neutral',
                        icon: <FolderIcon className="w-5 h-5 text-indigo-600" /> 
                      },
                      { 
                        label: 'Ave. Quality Score', 
                        value: `${aveQualityScore}/100`, 
                        change: 'Highly compilable code', 
                        changeType: 'positive',
                        icon: <TrendingUpIcon className="w-5 h-5 text-amber-600" /> 
                      }
                    ].map((card, i) => (
                      <div 
                        key={i} 
                        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_12px_rgba(15,23,42,0.02)] relative group overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-3xl pointer-events-none group-hover:scale-110 transition-transform" />
                        <div className="flex items-center justify-between mb-3.5">
                          <span className="text-xs text-slate-500 font-medium font-sans">{card.label}</span>
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">{card.icon}</div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">{card.value}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wide">{card.change}</p>
                      </div>
                    ))}
                  </div>

                  {/* MAIN ANALYTICS SECTION */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    
                    {/* AREA LINE CHART */}
                    <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-sm font-bold text-slate-900 font-sans">Weekly Multi-Agent Activity</h2>
                          <p className="text-[11px] text-slate-500 mt-0.5">Continuous analysis of compilation events throughout the week.</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Processing</span>
                        </div>
                      </div>

                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={WEEKLY_COMPILATION_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorProc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '10px',
                                color: '#0f172a',
                                boxShadow: '0 4px 12px rgba(15,23,42,0.05)'
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="completed"
                              stroke="#10b981"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorComp)"
                            />
                            <Area
                              type="monotone"
                              dataKey="processing"
                              stroke="#6366f1"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorProc)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
 
                    {/* STATUS AUDIT */}
                    <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 font-sans">Audit des statuts</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Breakdown of AI code compilation success rates.</p>
                      </div>
 
                      {/* Donut and metrics */}
                      <div className="my-4 flex items-center justify-around gap-2">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <div className="absolute text-center">
                            <span className="text-2xl font-black text-slate-900">{successRate}%</span>
                            <span className="text-[8px] font-mono text-slate-400 uppercase block mt-0.5 font-bold">Success Rate</span>
                          </div>
                          <svg className="w-full h-full -rotate-90">
                            <circle
                              cx="56"
                              cy="56"
                              r="48"
                              className="stroke-slate-100 fill-none"
                              strokeWidth="10"
                            />
                            <circle
                              cx="56"
                              cy="56"
                              r="48"
                              className="stroke-emerald-500 fill-none transition-all duration-1000"
                              strokeWidth="10"
                              strokeDasharray={`${2 * Math.PI * 48}`}
                              strokeDashoffset={`${2 * Math.PI * 48 * (1 - successRate / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
 
                        <div className="space-y-2">
                          <div className="text-left">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono tracking-wider">GitLab Pushes</span>
                            <span className="text-sm font-extrabold text-slate-900">11 webhook triggers</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Active Queue</span>
                            <span className="text-xs font-semibold text-slate-600">4 compilers pending</span>
                          </div>
                        </div>
                      </div>

                      {/* Stat bars */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed</span>
                          <span className="font-bold text-slate-800">{completedCount} tasks ({Math.round(completedCount/totalGenerationsCount*100)}%)</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Processing</span>
                          <span className="font-bold text-slate-800">{processingCount} compiling ({Math.round(processingCount/totalGenerationsCount*100)}%)</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Failed</span>
                          <span className="font-bold text-slate-800">{failedCount} errors ({Math.round(failedCount/totalGenerationsCount*100)}%)</span>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* ACTIVE OPERATORS & RECENT ACTIONS */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    
                    {/* ACTIVE SYSTEM OPERATORS */}
                    <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Operators</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Authenticated developers with compiler pipeline authority.</p>
                        </div>
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase font-mono">Registry Active</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {users.slice(0, 3).map((user) => (
                          <div key={user.id} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-bold text-xs text-white`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <h4 className="text-xs font-bold text-slate-800">{user.name}</h4>
                                <p className="text-[10px] text-slate-400 leading-none mt-1">{user.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                                user.role === 'Super Admin' 
                                  ? 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100' 
                                  : user.role === 'Admin'
                                  ? 'bg-teal-50 text-teal-600 border border-teal-100'
                                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              }`}>
                                {user.role}
                              </span>
                              <span className="block text-[9px] text-emerald-600 font-mono mt-1 font-bold">● {user.lastActive}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* RECENT PIPELINE COMPILES */}
                    <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Logs Overview</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Real-time compilation tracking within workspace.</p>
                        </div>
                        <button 
                          onClick={() => setActiveMenu('Generations')}
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          View Logs →
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {generations.slice(0, 4).map((g) => (
                          <div key={g.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-left">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate font-sans">{g.type}</p>
                              <p className="text-[9px] text-slate-500 leading-none mt-1">Generated by <span className="text-slate-700 font-semibold">{g.user}</span> • {g.timestamp}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {g.status === 'Completed' ? (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Success ({g.qualityScore}%)</span>
                              ) : g.status === 'Processing' ? (
                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 animate-pulse">Running</span>
                              ) : (
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">Failed</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* ============================================================================
                  TAB 2: USERS MANAGEMENT (UTILISATEURS)
                  ============================================================================ */}
              {activeMenu === 'Users' && (
                <div className="space-y-6 text-left">
                  
                  {/* Actions Header bar */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div className="text-left">
                      <h2 className="text-sm font-bold text-slate-900 font-sans">Operator Registry</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">Control permission scopes and system credentials of human developers.</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleExportCSV}
                        className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={() => setShowAddUserModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Developer</span>
                      </button>
                    </div>
                  </div>

                  {/* USER LIST REGISTRY */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/75 uppercase text-[10px] font-mono tracking-wider text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-4 px-6">Developer</th>
                            <th className="py-4 px-6">Role / Scope</th>
                            <th className="py-4 px-6">Generations</th>
                            <th className="py-4 px-6">Avg Quality Code</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm`}>
                                      {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 font-sans">{user.name}</p>
                                      <p className="text-[10px] text-slate-400 mt-1">{user.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex flex-col items-start gap-1">
                                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                                      user.role === 'Super Admin' 
                                        ? 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100' 
                                        : user.role === 'Admin'
                                        ? 'bg-teal-50 text-teal-600 border border-teal-100'
                                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                    }`}>
                                      {user.role}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono">Last online: {user.lastActive}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-800 font-mono">{user.generationsCount} builds</div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 font-mono">{user.avgQuality}%</span>
                                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                                      <div 
                                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500"
                                        style={{ width: `${user.avgQuality}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  {user.role !== 'Super Admin' ? (
                                    <button
                                      onClick={() => handleDeleteUser(user.id, user.name)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                      title="Revoke operator scope"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span className="text-[9px] font-mono text-slate-400 uppercase pr-1.5 font-bold">Immune</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-mono">
                                No operators match the query "{searchQuery}".
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ADD DEVELOPER MODAL */}
                  {showAddUserModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative">
                        <button
                          onClick={() => setShowAddUserModal(false)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-base font-extrabold text-slate-900 mb-2 font-sans">Register Platform Operator</h3>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">Add a developer credentials file to grant secure API generation privileges.</p>

                        <form onSubmit={handleAddUser} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Operator Name</label>
                            <input
                              type="text"
                              value={newUserName}
                              onChange={(e) => setNewUserName(e.target.value)}
                              placeholder="e.g. John Doe"
                              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-4 py-3 text-xs focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Operator Email</label>
                            <input
                              type="email"
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              placeholder="e.g. john.doe@talented.ai"
                              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-4 py-3 text-xs focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Permission Scope</label>
                            <select
                              value={newUserRole}
                              onChange={(e) => setNewUserRole(e.target.value as 'Admin' | 'Developer')}
                              className="w-full bg-slate-50 px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer"
                            >
                              <option value="Developer">Developer (Generate & Push only)</option>
                              <option value="Admin">Admin (Full Control)</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 transition-all cursor-pointer mt-2"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Authenticate Operator</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ============================================================================
                  TAB 3: AI GENERATIONS LOGGING
                  ============================================================================ */}
              {activeMenu === 'Generations' && (
                <div className="space-y-6 text-left">
                  
                  {/* Summary Bar */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div className="text-left">
                      <h2 className="text-sm font-bold text-slate-900 font-sans">Active Queue Monitor</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">Real-time listing of design-to-code compiler processes and safety outcomes.</p>
                    </div>

                    <button
                      onClick={handleExportCSV}
                      className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export CSV Log</span>
                    </button>
                  </div>

                  {/* GENERATIONS INDEX */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/75 uppercase text-[10px] font-mono tracking-wider text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-4 px-6">Source Target</th>
                            <th className="py-4 px-6">Compiler Operator</th>
                            <th className="py-4 px-6">Latency Time</th>
                            <th className="py-4 px-6">Status / State</th>
                            <th className="py-4 px-6 text-right">Audit Quality</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredGenerations.length > 0 ? (
                            filteredGenerations.map((gen) => (
                              <tr key={gen.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                                      <GitPullRequest className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 font-sans">{gen.type}</p>
                                      <p className="text-[10px] text-slate-400 mt-1">Ref ID: {gen.id.toUpperCase()}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="font-semibold text-slate-700 font-sans">{gen.user}</span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="font-mono text-slate-500 font-medium">{gen.duration}</span>
                                </td>
                                <td className="py-4 px-6">
                                  {gen.status === 'Completed' ? (
                                    <span className="text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-md">
                                      Completed
                                    </span>
                                  ) : gen.status === 'Processing' ? (
                                    <span className="text-[9px] font-mono font-bold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-md animate-pulse">
                                      Processing
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono font-bold uppercase bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-md">
                                      Failed
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  {gen.qualityScore > 0 ? (
                                    <span className="font-bold font-mono text-emerald-600">{gen.qualityScore}/100</span>
                                  ) : gen.status === 'Processing' ? (
                                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin ml-auto" />
                                  ) : (
                                    <span className="font-bold font-mono text-red-600">0/100</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-mono">
                                No logs match "{searchQuery}".
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ============================================================================
                  TAB 4: SYSTEM PARAMETERS
                  ============================================================================ */}
              {activeMenu === 'System' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  
                  {/* ROUTER CONFIGURATION */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-sans">
                        <Cpu className="w-4 h-4 text-indigo-600" />
                        <span>LLM Compiler Settings</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Adjust active router values for UI style generation.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">Generation Temperature</span>
                          <span className="font-mono text-indigo-600 font-bold">0.2 (Optimized)</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          defaultValue="20"
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                        <span className="text-[10px] text-slate-400 block leading-tight">Lower temperature forces stricter compliance with corporate style guides.</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">Strict Type Safety Filter</span>
                          <span className="font-mono text-indigo-600 font-bold">95% (Safe)</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          defaultValue="95"
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => showToast('Compiler settings updated in system cache.')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply Engine Config</span>
                      </button>
                    </div>
                  </div>

                  {/* PLATFORM WEBHOOK STATUS */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-sans">
                        <Database className="w-4 h-4 text-indigo-600" />
                        <span>Integrations & Webhooks</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Manage continuous delivery and auto-commit webhooks.</p>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">GitLab Push Integration</p>
                          <p className="text-[10px] text-slate-400 mt-1">Branch target: main</p>
                        </div>
                        <span className="text-[9px] font-mono font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Connected</span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">Vercel Auto-Deployment</p>
                          <p className="text-[10px] text-slate-400 mt-1">Webhook triggered on build completion</p>
                        </div>
                        <span className="text-[9px] font-mono font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Connected</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </main>

        </div>
      )}

    </div>
  );
};

export default AdminDashboard;