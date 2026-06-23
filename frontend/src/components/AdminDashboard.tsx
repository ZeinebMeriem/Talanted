import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Folder as FolderIcon, CheckCircle as CheckCircleIcon, Users as UsersIcon, TrendingUp as TrendingUpIcon } from 'lucide-react';

// Types
interface StatCard {
  label: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'neutral' | 'negative';
  icon: React.ReactNode;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  avatar: string;
}

interface ChartDataPoint {
  day: string;
  value: number;
}

// Données demo
const STAT_CARDS: StatCard[] = [
  {
    label: 'Total Projects',
    value: 24,
    change: '+12%',
    changeType: 'positive',
    icon: <FolderIcon className="w-8 h-8 text-blue-500" />,
  },
  {
    label: 'Active Tasks',
    value: 148,
    change: '+5%',
    changeType: 'positive',
    icon: <CheckCircleIcon className="w-8 h-8 text-green-500" />,
  },
  {
    label: 'Team Members',
    value: 12,
    change: '0%',
    changeType: 'neutral',
    icon: <UsersIcon className="w-8 h-8 text-purple-500" />,
  },
  {
    label: 'Completion Rate',
    value: '87%',
    change: '+2.4%',
    changeType: 'positive',
    icon: <TrendingUpIcon className="w-8 h-8 text-orange-500" />,
  },
];

const WEEKLY_DATA: ChartDataPoint[] = [
  { day: 'Mon', value: 300 },
  { day: 'Tue', value: 280 },
  { day: 'Wed', value: 400 },
  { day: 'Thu', value: 450 },
  { day: 'Fri', value: 500 },
  { day: 'Sat', value: 380 },
  { day: 'Sun', value: 320 },
];

const RECENT_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    user: 'Sarah Johnson',
    action: 'completed task Homepage Redesign',
    timestamp: '2h ago',
    avatar: 'S',
  },
  {
    id: '2',
    user: 'Marcus Chen',
    action: 'commented on API Integration',
    timestamp: '4h ago',
    avatar: 'M',
  },
  {
    id: '3',
    user: 'Priya Patel',
    action: 'uploaded file Design Assets.zip',
    timestamp: '5h ago',
    avatar: 'P',
  },
  {
    id: '4',
    user: 'James Wilson',
    action: 'created project Q4 Marketing Campaign',
    timestamp: '1d ago',
    avatar: 'J',
  },
];

const MENU_ITEMS = [
  { icon: '📊', label: 'Overview', active: true },
  { icon: '📁', label: 'Projects', active: false },
  { icon: '📈', label: 'Analytics', active: false },
  { icon: '👥', label: 'Team', active: false },
  { icon: '⚙️', label: 'Settings', active: false },
];

// Composant StatCard
const StatCard: React.FC<{ card: StatCard }> = ({ card }) => (
  <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
    <div className="flex items-start justify-between mb-4">
      <div>{card.icon}</div>
      <span
        className={`text-sm font-semibold ${
          card.changeType === 'positive'
            ? 'text-green-600'
            : card.changeType === 'negative'
            ? 'text-red-600'
            : 'text-gray-600'
        }`}
      >
        {card.change}
      </span>
    </div>
    <h3 className="text-3xl font-bold text-gray-900 mb-1">{card.value}</h3>
    <p className="text-sm text-gray-600">{card.label}</p>
  </div>
);

// Composant ActivityItem
const ActivityItemComponent: React.FC<{ item: ActivityItem }> = ({ item }) => (
  <div className="flex items-start py-4 border-b border-gray-100 last:border-b-0">
    <div
      className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500
                 flex items-center justify-center text-white text-sm font-semibold mr-3 flex-shrink-0"
    >
      {item.avatar}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">
        {item.user}{' '}
        <span className="font-normal text-gray-600">{item.action}</span>
      </p>
      <p className="text-xs text-gray-500 mt-1">{item.timestamp}</p>
    </div>
  </div>
);

// Composant Principal
export const AdminDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('Overview');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-48 bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg">
            P
          </div>
          <span className="text-xl font-bold">ProManage</span>
        </div>

        {/* Menu Items */}
        <nav className="space-y-2">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveMenu(item.label)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                activeMenu === item.label
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-slate-700'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search projects, tasks..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>

            {/* Notifications */}
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
              🔔
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                A
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">Alex Morgan</p>
                <p className="text-xs text-gray-500">Product Manager</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {STAT_CARDS.map((card, index) => (
              <StatCard key={index} card={card} />
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Activity Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Weekly Activity</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={WEEKLY_DATA}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
              <div className="space-y-0">
                {RECENT_ACTIVITIES.map((activity) => (
                  <ActivityItemComponent key={activity.id} item={activity} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
