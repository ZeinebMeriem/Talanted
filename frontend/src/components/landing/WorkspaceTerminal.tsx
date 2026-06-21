import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  Download,
  Sparkles,
  Flame,
  TrendingUp,
  Edit2,
  Check,
  Monitor,
  ArrowUp,
  MousePointer,
  Lock
} from 'lucide-react';

interface Task {
  id: string;
  text: string;
  tag: 'Design' | 'Build' | 'Learn' | 'Refuel';
  priority: 'high' | 'medium' | 'low';
  category: 'Focus' | 'In Progress' | 'Accomplished';
  createdAt: string;
}

interface WorkspaceStats {
  completedToday: number;
  focusMinutes: number;
  streakDays: number;
}

const QUOTES = [
  "Simplicity is the soul of efficiency.",
  "Focus on being productive instead of busy.",
  "Your mind is for having ideas, not holding them.",
  "Make each day your masterpiece.",
  "Continuous improvement is better than delayed perfection."
];

interface WorkspaceTerminalProps {
  showToast: (msg: string) => void;
}

export default function WorkspaceTerminal({ showToast }: WorkspaceTerminalProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showCursors, setShowCursors] = useState(true);

  const [tasks, setTasks] = useState<Task[]>(() => {
    return [
      { id: '1', text: 'Unify workspace user interfaces into a streamlined single-view layout', tag: 'Design', priority: 'high', category: 'Focus', createdAt: new Date().toISOString() },
      { id: '2', text: 'Integrate dynamic SVG diagnostic wave and completed goals tracker', tag: 'Build', priority: 'medium', category: 'In Progress', createdAt: new Date().toISOString() },
      { id: '3', text: 'Audit performance metrics & establish local storage state pipeline', tag: 'Learn', priority: 'low', category: 'Accomplished', createdAt: new Date().toISOString() }
    ];
  });

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTag, setNewTaskTag] = useState<'Design' | 'Build' | 'Learn' | 'Refuel'>('Build');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newTaskCategory, setNewTaskCategory] = useState<'Focus' | 'In Progress' | 'Accomplished'>('Focus');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');

  const [stats, setStats] = useState<WorkspaceStats>({
    completedToday: 4,
    focusMinutes: 90,
    streakDays: 6
  });

  const [timerPreset, setTimerPreset] = useState<'Focus' | 'Brainstorm' | 'Refuel'>('Focus');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [totalTimerDuration, setTotalTimerDuration] = useState<number>(25 * 60);

  const [notes, setNotes] = useState<string>(
    `### Interactive Sandbox Notes\n- Design mockup parameters matched perfectly\n- Local variables sync immediately\n- Instant file downloads as markdown files (.md)`
  );

  const [taskTagFilter, setTaskTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          setStats((s) => ({ ...s, completedToday: s.completedToday + 1, focusMinutes: s.focusMinutes + Math.round(totalTimerDuration / 60) }));
          showToast("⏰ Timing session completed perfectly!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, totalTimerDuration]);

  const applyPreset = (preset: 'Focus' | 'Brainstorm' | 'Refuel') => {
    setTimerPreset(preset);
    let seconds = 25 * 60;
    if (preset === 'Brainstorm') seconds = 15 * 60;
    if (preset === 'Refuel') seconds = 5 * 60;
    setTimeLeft(seconds);
    setTotalTimerDuration(seconds);
    setIsTimerRunning(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) {
      showToast("⚠️ Please provide task description!");
      return;
    }
    const newTask: Task = {
      id: `task_${Date.now()}`,
      text: newTaskText.trim(),
      tag: newTaskTag,
      priority: newTaskPriority,
      category: newTaskCategory,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTaskText('');

    if (newTaskCategory === 'Accomplished') {
      setStats(prev => ({ ...prev, completedToday: prev.completedToday + 1 }));
    }
    showToast(`📝 Saved task: "${newTask.text.substring(0, 18)}..."`);
  };

  const handleDeleteTask = (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    if (targetTask.category === 'Accomplished') {
      setStats(prev => ({ ...prev, completedToday: Math.max(0, prev.completedToday - 1) }));
    }
    showToast(`🗑️ Task removed from local index.`);
  };

  const handleMoveTask = (id: string, newCategory: 'Focus' | 'In Progress' | 'Accomplished') => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (t.category !== 'Accomplished' && newCategory === 'Accomplished') {
          setStats(s => ({ ...s, completedToday: s.completedToday + 1 }));
          showToast(`✨ Completed! Milestone logged beautifully in live chart.`);
        } else if (t.category === 'Accomplished' && newCategory !== 'Accomplished') {
          setStats(s => ({ ...s, completedToday: Math.max(0, s.completedToday - 1) }));
        }
        return { ...t, category: newCategory };
      }
      return t;
    }));
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const saveEditing = () => {
    if (!editingTaskText.trim() || !editingTaskId) return;
    setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, text: editingTaskText.trim() } : t));
    setEditingTaskId(null);
    showToast(`✏️ Task updated successfully.`);
  };

  const handleDownloadNotes = () => {
    const blob = new Blob([notes], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Workspace_Audit_Notes.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 Note downloaded instantly to your system!`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressValue = timeLeft / totalTimerDuration;
  const strokeDashoffset = 282.74 * (1 - progressValue);
  const activeTasksCount = tasks.filter(t => t.category !== 'Accomplished').length;
  const completedPercent = tasks.length > 0 ? Math.round((tasks.filter(t => t.category === 'Accomplished').length / tasks.length) * 105) : 0;

  const filteredTasks = tasks.filter(t => {
    const matchesTag = taskTagFilter === 'All' || t.tag === taskTagFilter;
    const matchesSearch = t.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  function renderBacklogCard(task: Task) {
    const isCompleted = task.category === 'Accomplished';

    const formats = {
      Design: 'bg-violet-50 text-violet-700 border-violet-100',
      Build: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      Learn: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      Refuel: 'bg-rose-50 text-rose-700 border-rose-100'
    };

    const priorities = {
      high: 'bg-red-500',
      medium: 'bg-amber-500',
      low: 'bg-neutral-300'
    };

    return (
      <div
        key={task.id}
        className="bg-white p-3 rounded-xl border border-neutral-200/80 hover:border-violet-300 transition-all font-sans relative flex flex-col gap-2.5 group shadow-sm text-left"
      >
        <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${priorities[task.priority]}`} />

        <div className="flex items-start justify-between gap-1.5 pl-1">
          {editingTaskId === task.id ? (
            <textarea
              value={editingTaskText}
              onChange={(e) => setEditingTaskText(e.target.value)}
              className="flex-grow bg-neutral-50 border border-neutral-200 text-xs p-1.5 rounded outline-none focus:ring-1 focus:ring-violet-400 text-neutral-850"
              rows={2}
            />
          ) : (
            <p className={`text-[11.5px] leading-normal font-semibold transition-colors ${
              isCompleted ? 'text-neutral-400 line-through' : 'text-neutral-800'
            }`}>
              {task.text}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-[9.5px] border-t border-neutral-100/60 pt-2 pl-1 select-none font-medium">
          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded border font-extrabold text-[8.5px] uppercase ${formats[task.tag]}`}>
              {task.tag}
            </span>
            <span className="text-neutral-400 font-mono">
              {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150">

            {task.category !== 'Focus' && (
              <button
                type="button"
                onClick={() => handleMoveTask(task.id, 'Focus')}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-1 py-0.5 rounded border border-neutral-200 cursor-pointer text-[8px] font-bold font-sans"
              >
                Focus
              </button>
            )}

            {task.category !== 'In Progress' && (
              <button
                type="button"
                onClick={() => handleMoveTask(task.id, 'In Progress')}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-1 py-0.5 rounded border border-neutral-200 cursor-pointer text-[8px] font-bold font-sans"
              >
                Work
              </button>
            )}

            {task.category !== 'Accomplished' && (
              <button
                type="button"
                onClick={() => handleMoveTask(task.id, 'Accomplished')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded border border-emerald-150 cursor-pointer text-[8px] font-extrabold font-sans"
              >
                Done
              </button>
            )}

            {editingTaskId === task.id ? (
              <button
                type="button"
                onClick={saveEditing}
                className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startEditing(task)}
                className="p-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded cursor-pointer"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDeleteTask(task.id)}
              className="p-1 bg-neutral-100 hover:bg-rose-100 text-neutral-500 hover:text-rose-600 rounded cursor-pointer"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>

          </div>
        </div>

      </div>
    );
  }

  return (
    <section className="px-4 md:px-8 py-16 max-w-7xl mx-auto flex flex-col gap-8 scroll-mt-20 z-10" id="sandbox-terminal">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-violet-600 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-violet-600 rounded-full animate-pulse"></span>
            Live Interactive Playground
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
            Test Workspace Hub directly inside our canvas
          </h2>
          <p className="text-neutral-500 text-xs md:text-sm mt-1 max-w-2xl">
            This is the fully integrated workspace demo. Try adding active priorities, timing pomodoro countdown, moving task category states, and recording technical Markdown memos!
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setShowCursors(!showCursors);
              showToast(`Collaborative cursors: ${!showCursors ? 'Shown' : 'Hidden'}`);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <MousePointer className="w-3.5 h-3.5" />
            {showCursors ? 'Hide cursors' : 'Show team cursors'}
          </button>

          <button
            onClick={() => {
              setTasks([
                { id: '1', text: 'Define modular design specs', tag: 'Design', priority: 'high', category: 'Focus', createdAt: new Date().toISOString() },
                { id: '2', text: 'Structure backend API integration parameters', tag: 'Build', priority: 'medium', category: 'In Progress', createdAt: new Date().toISOString() },
                { id: '3', text: 'Read workspace tutorial codes', tag: 'Learn', priority: 'low', category: 'Accomplished', createdAt: new Date().toISOString() }
              ]);
              showToast("♻️ Task indexes reset to clean parameters!");
            }}
            className="px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
          >
            Reset demo
          </button>
        </div>
      </div>

      {/* Browser Bezel */}
      <div className="w-full bg-white rounded-3xl border-8 border-neutral-900/10 shadow-2xl relative overflow-hidden">

        {showCursors && (
          <>
            <div className="absolute top-28 left-1/4 z-30 pointer-events-none select-none animate-bounce">
              <div className="flex items-center gap-1">
                <MousePointer className="w-4 h-4 text-violet-600 fill-violet-600" />
                <span className="bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md">
                  Roi (Backlog)
                </span>
              </div>
            </div>

            <div className="absolute bottom-32 right-1/4 z-30 pointer-events-none select-none animate-pulse">
              <div className="flex items-center gap-1">
                <MousePointer className="w-4 h-4 text-pink-500 fill-pink-500" />
                <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md">
                  Zainab (Timer)
                </span>
              </div>
            </div>
          </>
        )}

        {/* Bezel chrome URL bar */}
        <div className="w-full bg-neutral-100 flex items-center justify-between px-4 py-3 border-b border-stone-200 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <div className="bg-white px-3 py-1 rounded-md border border-stone-200 text-[10px] font-mono flex items-center gap-1.5 w-60 sm:w-96 select-all ml-3">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>workspacehub-developer-container:3000</span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-770 font-bold">PORT: 3000</span>
            <span className="hidden sm:inline text-neutral-400 font-sans font-medium">• CLIENT ENVIRONMENT</span>
          </div>
        </div>

        {/* Embedded studio contents */}
        <div className="bg-white p-4 md:p-8 flex flex-col gap-6">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

            {/* Clocks Panel */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between gap-5 shadow-sm relative group">
              <div className="absolute top-0 right-0 p-2 pr-3 mt-1.5 pointer-events-none opacity-10">
                <Sparkles className="w-12 h-12 text-[#019cda]" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-[#019cda]/5 text-[#019cda]">
                    <Monitor className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">Workspace Hub</h4>
                    <p className="text-[10px] text-neutral-400 font-mono tracking-tight">Active Client Sandbox</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  LIVE STATE
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-3xl font-mono font-bold tracking-tight text-neutral-900 block font-sans">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-neutral-500 text-[11px] font-semibold mt-0.5 font-sans">
                    {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-neutral-400 font-mono font-medium">TIMEZONE</div>
                  <div className="text-[10px] font-bold text-neutral-700 font-mono uppercase tracking-wider">
                    {Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'UTC'}
                  </div>
                </div>
              </div>
            </div>

            {/* Scoreboard */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 grid grid-cols-3 gap-4 items-center justify-between shadow-sm">

              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 hover:border-violet-200 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-violet-100/40 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Flame className="w-4 h-4 text-violet-600" />
                </div>
                <span className="text-[10px] text-neutral-500 font-bold tracking-wide">Daily Streak</span>
                <span className="text-base font-bold text-neutral-900 mt-0.5 font-mono tracking-tight">{stats.streakDays} <span className="text-[9px] text-neutral-400 font-sans">Days</span></span>
              </div>

              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 hover:border-emerald-200 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-emerald-100/40 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] text-neutral-500 font-bold tracking-wide">Completed</span>
                <span className="text-base font-bold text-neutral-900 mt-0.5 font-mono tracking-tight">{stats.completedToday} <span className="text-[9px] text-neutral-400 font-sans">Tasks</span></span>
              </div>

              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 hover:border-cyan-200 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-cyan-100/40 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-[10px] text-neutral-500 font-bold tracking-wide">Focus Mins</span>
                <span className="text-base font-bold text-neutral-900 mt-0.5 font-mono tracking-tight">{stats.focusMinutes} <span className="text-[9px] text-neutral-400 font-sans">Mins</span></span>
              </div>

            </div>

            {/* Wisdom Engine */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <Sparkles className="w-16 h-16 text-violet-500" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-spin" /> Wisdom Engine
              </div>

              <div className="my-2 min-h-[3rem] flex items-center">
                <p className="text-neutral-700 italic text-xs leading-relaxed font-semibold text-left">
                  &ldquo;{QUOTES[quoteIndex]}&rdquo;
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-[9px] text-neutral-400 font-mono">
                <span>Rotation interval active</span>
                <button
                  onClick={() => {
                    setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
                    showToast("🌟 Wisdom Engine updated!");
                  }}
                  className="hover:text-neutral-800 font-bold tracking-wide transition-colors flex items-center gap-0.5"
                >
                  ROTATE &rarr;
                </button>
              </div>
            </div>

          </div>

          {/* Bento Grid: Timer + Kanban */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* Timer column */}
            <div className="lg:col-span-5 flex flex-col gap-6">

              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between relative">
                <div className="w-full flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                  <span className="text-xs font-bold text-neutral-800 tracking-wide flex items-center gap-2 font-display">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    Focus Timing Presets
                  </span>
                  <div className="flex items-center gap-1">
                    {(['Focus', 'Brainstorm', 'Refuel'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => applyPreset(preset)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          timerPreset === preset
                            ? 'bg-neutral-100 text-neutral-800 ring-1 ring-violet-250'
                            : 'text-neutral-400 hover:text-neutral-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative my-3 flex items-center justify-center">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle cx="72" cy="72" r="45" className="stroke-neutral-100 fill-none" strokeWidth="4" />
                    <circle
                      cx="72" cy="72" r="45"
                      className="stroke-violet-600 fill-none transition-all duration-300"
                      strokeWidth="4"
                      strokeDasharray="282.74"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="absolute text-center">
                    <div className={`text-2xl font-mono font-bold tracking-tight text-neutral-950 ${isTimerRunning ? 'animate-pulse' : ''} font-sans`}>
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-[8px] text-gray-400 tracking-widest font-bold uppercase mt-0.5">
                      {isTimerRunning ? 'ACTIVE FLOW' : 'PAUSED'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 w-full mt-2 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => {
                      setIsTimerRunning(!isTimerRunning);
                      showToast(isTimerRunning ? "⏸️ Session paused" : "🚀 Focus countdown started!");
                    }}
                    className="flex-grow py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs tracking-wider uppercase transition-all shadow active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isTimerRunning ? 'Pause timer' : 'Trigger space'}
                  </button>
                  <button
                    onClick={() => {
                      setIsTimerRunning(false);
                      applyPreset(timerPreset);
                      showToast("🕐 Timing block restarted to defaults.");
                    }}
                    className="p-2 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SVG Productivity Wave */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-stone-100 pb-3 mb-4">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-800 text-left">Diagnostics Amplitude Wave</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5 text-left">Plots coordinates dynamically based on task goals ratio</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-violet-600" />
                </div>

                <div className="h-28 w-full mt-1 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="45" x2="100" y2="45" className="stroke-stone-200/80" strokeWidth="0.75" strokeDasharray="2,2" />
                    <line x1="0" y1="21" x2="100" y2="21" className="stroke-stone-200/40" strokeWidth="0.5" />
                    <path
                      d={`M 0,45 L 20,${Math.max(12, 40 - stats.completedToday * 0.8)} L 45,28 L 70,${Math.max(8, 36 - stats.completedToday * 2)} L 100,5 L 100,45 Z`}
                      fill="url(#curveGradient)"
                    />
                    <path
                      d={`M 0,45 L 20,${Math.max(12, 40 - stats.completedToday * 0.8)} L 45,28 L 70,${Math.max(8, 36 - stats.completedToday * 2)} L 100,5`}
                      fill="none"
                      className="stroke-violet-600"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mt-2 font-medium">
                  <span>MON</span>
                  <span>WED</span>
                  <span>FRI</span>
                  <span className="text-violet-600 font-extrabold uppercase font-sans">LIVE DIAGNOSTICS</span>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-medium">
                  <span>Completed Tasks Ratio:</span>
                  <span className="font-mono font-bold text-neutral-850">{completedPercent}% achieved</span>
                </div>
              </div>

            </div>

            {/* Kanban Board */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center justify-start gap-2">
                      MILESTONES BACKLOG
                      <span className="text-[10px] bg-neutral-150 text-neutral-700 py-0.5 px-2 rounded-full font-sans font-bold">
                        {activeTasksCount} PENDING
                      </span>
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5 font-medium text-left">Prioritize projects backlog and tag deliverables</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={taskTagFilter}
                      onChange={(e) => setTaskTagFilter(e.target.value)}
                      className="bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-[11px] text-neutral-700 outline-none cursor-pointer font-bold font-sans"
                    >
                      <option value="All">All tags</option>
                      <option value="Design">Design</option>
                      <option value="Build">Build</option>
                      <option value="Learn">Learn</option>
                      <option value="Refuel">Refuel</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Search workspace..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-[11px] text-neutral-700 outline-none placeholder-neutral-400 font-bold font-sans w-28 sm:w-36"
                    />
                  </div>
                </div>

                {/* Task Form */}
                <form onSubmit={handleAddTask} className="bg-neutral-50/60 border border-neutral-100 p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex items-stretch gap-2">
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      placeholder="Capture rapid tasks... (e.g. Design access tags)"
                      className="flex-grow bg-white border border-neutral-200 text-xs px-3 py-2 rounded-lg text-neutral-850 placeholder-stone-400 outline-none focus:ring-1 focus:ring-violet-400 font-semibold"
                    />
                    <button
                      type="submit"
                      className="bg-[#18181b] hover:bg-neutral-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Save task
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] pt-1.5 border-t border-neutral-250/45 text-neutral-400">
                    <div className="flex flex-wrap items-center gap-4">

                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-[9px] uppercase">Tag:</span>
                        {(['Design', 'Build', 'Learn', 'Refuel'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewTaskTag(t)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                              newTaskTag === t
                                ? 'bg-neutral-900 text-white font-sans font-bold'
                                : 'text-neutral-400 hover:text-neutral-700'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-[9px] uppercase">Priority:</span>
                        {(['high', 'medium', 'low'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewTaskPriority(p)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer transition-colors ${
                              newTaskPriority === p
                                ? 'bg-violet-50 text-violet-600 border border-violet-100 font-bold'
                                : 'text-neutral-400 hover:text-neutral-700 font-medium'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-[9px] uppercase">State:</span>
                      <select
                        value={newTaskCategory}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTaskCategory(e.target.value as 'Focus' | 'In Progress' | 'Accomplished')}
                        className="bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-[9px] text-neutral-600 focus:outline-none cursor-pointer font-bold font-sans"
                      >
                        <option value="Focus">Focus Today</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Accomplished">Accomplished</option>
                      </select>
                    </div>
                  </div>
                </form>

                {/* Kanban Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">

                  <div className="bg-neutral-50/40 border border-neutral-100 p-3 rounded-xl flex flex-col gap-2 min-h-[260px]">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                      <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
                        Focus Today
                      </span>
                      <span className="text-[9px] font-mono font-bold bg-white border border-neutral-200 text-neutral-400 px-1.5 py-0.5 rounded-full">
                        {filteredTasks.filter(t => t.category === 'Focus').length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 flex-grow overflow-y-auto max-h-[285px]">
                      {filteredTasks.filter(t => t.category === 'Focus').length === 0 ? (
                        <span className="text-center text-[10px] text-neutral-400 my-auto italic font-medium font-sans">No focus items.</span>
                      ) : (
                        filteredTasks.filter(t => t.category === 'Focus').map(t => renderBacklogCard(t))
                      )}
                    </div>
                  </div>

                  <div className="bg-neutral-50/40 border border-neutral-100 p-3 rounded-xl flex flex-col gap-2 min-h-[260px]">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                        In Progress
                      </span>
                      <span className="text-[9px] font-mono font-bold bg-white border border-neutral-200 text-neutral-400 px-1.5 py-0.5 rounded-full">
                        {filteredTasks.filter(t => t.category === 'In Progress').length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 flex-grow overflow-y-auto max-h-[285px]">
                      {filteredTasks.filter(t => t.category === 'In Progress').length === 0 ? (
                        <span className="text-center text-[10px] text-neutral-400 my-auto italic font-medium font-sans">No items running.</span>
                      ) : (
                        filteredTasks.filter(t => t.category === 'In Progress').map(t => renderBacklogCard(t))
                      )}
                    </div>
                  </div>

                  <div className="bg-neutral-50/40 border border-neutral-100 p-3 rounded-xl flex flex-col gap-2 min-h-[260px]">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Accomplished
                      </span>
                      <span className="text-[9px] font-mono font-bold bg-white border border-neutral-200 text-neutral-400 px-1.5 py-0.5 rounded-full">
                        {filteredTasks.filter(t => t.category === 'Accomplished').length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 flex-grow overflow-y-auto max-h-[285px]">
                      {filteredTasks.filter(t => t.category === 'Accomplished').length === 0 ? (
                        <span className="text-center text-[10px] text-neutral-400 my-auto italic font-medium font-sans">Tackle milestones!</span>
                      ) : (
                        filteredTasks.filter(t => t.category === 'Accomplished').map(t => renderBacklogCard(t))
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* Markdown Notes */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-stone-100 pb-2.5">
                  <span className="text-xs font-bold text-neutral-800 tracking-wide flex items-center justify-start gap-2 font-display">
                    <FileText className="w-4 h-4 text-violet-600" />
                    Continuous Markdown Drafts
                  </span>
                  <div className="text-[10px] font-mono text-neutral-400 font-medium">
                    <span>{notes.length} characters</span>
                  </div>
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-24 bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl p-3 text-xs font-mono text-neutral-750 placeholder-stone-400 leading-relaxed resize-none outline-none focus:ring-1 focus:ring-violet-400 transition-all font-medium"
                  placeholder="Log technical ideas or workflow blueprints..."
                />

                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-[11px] text-neutral-400 italic flex items-center gap-1.5 select-none text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Directly synced to browser storage
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadNotes}
                    className="bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 border border-neutral-200 py-1.5 px-3 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors select-none font-sans"
                  >
                    <Download className="w-3.5 h-3.5" /> Download (.md)
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Bezel footer */}
        <div className="w-full bg-neutral-100 flex flex-col sm:flex-row items-center justify-between px-6 py-3 border-t border-stone-200 text-xs text-stone-500">
          <span>&copy; {new Date().getFullYear()} Workspace Hub. Securely compiled offline studio framework.</span>
          <div className="flex items-center gap-3 font-mono text-[10px] text-stone-400 mt-2 sm:mt-0 font-medium">
            <span>Vite v5.x</span>
            <span>React v19.x</span>
            <span>Tailwind v4.x</span>
          </div>
        </div>

      </div>

    </section>
  );
}
