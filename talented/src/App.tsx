import { useState, ChangeEvent, FormEvent, ReactNode } from "react";
import { 
  Sparkles, 
  ArrowLeftRight, 
  Menu, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  X, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Zap, 
  ChevronDown, 
  Lock, 
  ArrowRight, 
  Shield, 
  HelpCircle, 
  Check, 
  CreditCard, 
  Home,
  Monitor,
  Smartphone,
  Info,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ==========================================
// TYPES & INTERFACES
  return (
    <div className="relative w-full h-[280px] sm:h-[360px] lg:h-[400px] lg:my-10 flex items-center justify-center select-none overflow-visible">
      <div className="absolute top-1/4 right-1/4 w-[320px] h-[320px] bg-[#7c3aed]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[260px] h-[260px] bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative w-full max-w-[480px] h-full flex items-center justify-center overflow-visible">
        <motion.div
          initial={{ opacity: 0, x: -25, y: -40, scale: 0.94, rotate: -8 }}
          animate={{ opacity: 1, x: -45, y: -75, scale: 0.98, rotate: -8 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.1 }}
          whileHover={{ y: -85, rotate: -5, transition: { duration: 0.2 } }}
          className="absolute bg-[#070b19] w-[210px] h-[420px] sm:w-[275px] sm:h-[550px] rounded-[42px] sm:rounded-[48px] shadow-[0_25px_60px_rgba(2,4,12,0.7)] border-[5px] sm:border-[7px] border-slate-900 overflow-hidden z-10"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[14px] bg-slate-950 rounded-b-2xl z-40 flex items-center justify-center">
            <span className="w-8 h-0.5 bg-slate-800 rounded-full" />
          </div>

          <div className="h-full pt-6 px-4 pb-4 overflow-y-auto text-[#e2e8f0] flex flex-col font-sans text-left bg-[#070b19] scrollbar-none">
            <div className="flex items-center justify-between mt-2 mb-4">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-black text-white tracking-tight">talented</span>
                <span className="w-2.5 h-0.5 bg-[#7c3aed] rounded-sm mt-0.5" />
              </div>
              <span className="text-slate-400 text-xs">● ●</span>
            </div>

            <h3 className="text-base font-black text-white tracking-tight leading-none mb-4">Dashboard</h3>

            <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2">Credit Cards</p>

            <div className="relative mb-4 w-full h-[105px] sm:h-[120px] shrink-0">
              <div className="absolute left-0 top-0 w-[84%] h-full rounded-2xl p-3 sm:p-3.5 bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white shadow-xl z-20 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-0.5">
                    <span className="text-[7px] uppercase font-mono tracking-widest text-purple-200 font-bold">talented</span>
                    <span className="w-1.5 h-[3px] bg-[#00f3a4] rounded-sm" />
                  </div>
                  <span className="text-[5.5px] text-purple-200 bg-purple-900/40 px-1.5 py-0.5 rounded font-mono font-bold tracking-widest">BUSINESS</span>
                </div>
                <p className="text-[11px] sm:text-xs font-mono tracking-widest text-slate-50 font-bold mt-2">5412 5682 3025 2456</p>
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-[8px] font-medium uppercase text-purple-150">Jessica Pierce</span>
                  <span className="text-[8px] font-semibold text-purple-150 font-mono">10/28</span>
                </div>
              </div>

              <div className="absolute right-0 top-1 w-[28%] h-[92%] rounded-2xl p-2.5 bg-[#12162a]/90 border border-slate-800 text-slate-400 shadow-md z-10 flex flex-col justify-between opacity-80">
                <div className="flex items-center gap-0.5">
                  <span className="text-[5px] uppercase font-mono tracking-widest text-slate-400 font-bold">tal</span>
                </div>
                <p className="text-[8px] font-mono tracking-widest text-slate-500 font-bold">3025</p>
              </div>
            </div>

            <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2">Accounts</p>
            <div className="flex gap-2 overflow-visible mb-4 w-full shrink-0">
              <div className="relative overflow-hidden bg-[#131929] p-3 rounded-xl border border-slate-800/80 w-[72%] shrink-0">
                <p className="text-[6.5px] uppercase tracking-wider text-slate-400 font-bold">private</p>
                <p className="text-[9px] font-bold text-white mt-0.5">Jessica Pierce</p>
                <p className="text-[7px] text-slate-500 font-mono">27485138652</p>
                <p className="text-[11px] font-bold text-[#00f3a4] font-mono mt-1">$16,542.76</p>
              </div>
              <div className="relative overflow-[#131929]/50 p-3 rounded-xl border border-slate-800/40 w-[45%] shrink-0 opacity-60">
                <p className="text-[6.5px] uppercase tracking-wider text-slate-500 font-bold">savings</p>
                <p className="text-[11px] font-bold text-slate-300 font-mono mt-1">$8,254.12</p>
              </div>
            </div>

            <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2">Latest transactions</p>
            <div className="space-y-1.5 flex-1">
              {[
                { name: "Webflow", desc: "27485138652", amt: "-$485.25", bg: "bg-blue-600/25 text-blue-400" },
                { name: "Automation", desc: "27485138652", amt: "-$32.50", bg: "bg-red-500/20 text-red-400" },
                { name: "Relate", desc: "27485138652", amt: "-$352.25", bg: "bg-emerald-500/20 text-emerald-400" }
              ].map((tx, i) => (
                <div key={i} className="flex justify-between items-center bg-[#101424] p-2 rounded-xl border border-slate-800/40 text-[8.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5.5 h-5.5 rounded-full ${tx.bg} flex items-center justify-center font-bold font-mono text-[9px]`}>
                      {tx.name[0]}
                    </span>
                    <div>
                      <p className="font-bold text-slate-200 leading-none">{tx.name}</p>
                      <p className="text-[7px] text-slate-500 mt-0.5 font-mono">{tx.desc}</p>
                    </div>
                  </div>
                  <span className="font-bold font-mono text-slate-200">{tx.amt}</span>
                </div>
              ))}
            </div>

          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20, y: 35, scale: 0.96, rotate: -8 }}
          animate={{ opacity: 1, x: 45, y: 75, scale: 1, rotate: -8 }}
          transition={{ duration: 0.8, delay: 0.15, type: "spring", bounce: 0.1 }}
          whileHover={{ y: 64, scale: 1.02, rotate: -5, transition: { duration: 0.2 } }}
          className="absolute bg-white w-[210px] h-[420px] sm:w-[275px] sm:h-[550px] rounded-[42px] sm:rounded-[48px] shadow-[0_30px_70px_rgba(2,4,12,0.45)] border-[5px] sm:border-[7px] border-slate-900 overflow-hidden z-20 pb-1"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[14px] bg-slate-950 rounded-b-2xl z-40 flex items-center justify-center">
            <span className="w-8 h-0.5 bg-slate-800 rounded-full" />
          </div>

          <div className="h-full pt-6 px-4 pb-4 overflow-y-auto text-slate-800 flex flex-col font-sans text-left bg-slate-50 scrollbar-none">
            <div className="flex items-center justify-between mt-2 mb-4">
              <div className="flex items-center gap-1 text-[#7c3aed]">
                <span className="text-[11px] font-black tracking-tight text-slate-900 font-sans">talented</span>
                <span className="w-2.5 h-0.5 bg-[#7c3aed] rounded-sm mt-0.5" />
              </div>
              <span className="text-slate-500 text-xs">● ●</span>
            </div>

            <h3 className="text-base font-black text-slate-950 tracking-tight leading-none mb-3.5">Account details</h3>

            <div className="rounded-2xl p-3.5 bg-[#0d1430] text-white shadow-md relative mb-4 shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[5.5px] uppercase font-mono tracking-wider text-slate-350 bg-slate-800 px-1.5 py-0.5 rounded font-bold">Private</span>
                  <p className="text-[9px] font-bold mt-1 text-slate-200">Jessica Pierce</p>
                  <p className="text-[6.5px] text-slate-450 font-mono mt-0.5">27485138652</p>
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-[#00f3a4]" />
              </div>
              <div className="flex justify-between items-end mt-3">
                <span className="text-sm font-black text-white">$16,542.76</span>
                <div className="w-16 h-6">
                  <svg className="w-full h-full" viewBox="0 0 50 18" preserveAspectRatio="none">
                    <path d="M 2,13 C 8,10 14,16 20,9 C 26,3 34,5 48,2" fill="none" stroke="#00f3a4" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-[7px] text-slate-400 uppercase font-black tracking-widest mb-1.5 px-0.5">
              <span>Transaction</span>
              <span>Amount</span>
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5.5 h-5.5 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold font-mono shrink-0">W</span>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold text-slate-900 leading-none truncate font-sans">Webflow</p>
                    <p className="text-[6.5px] text-slate-400 font-mono leading-none mt-0.5">27485138652</p>
                  </div>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-slate-800 leading-none">- $485.25</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-5.5 h-5.5 rounded-full shrink-0" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="12" fill="#fed7aa" />
                    <circle cx="9" cy="11" r="1.2" fill="#312e81" />
                    <circle cx="15" cy="11" r="1.2" fill="#312e81" />
                    <path d="M 8,14 Q 12,17 16,14" stroke="#312e81" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold text-slate-900 leading-none truncate font-sans">Jeremy May</p>
                    <p className="text-[6.5px] text-slate-400 font-mono leading-none mt-0.5">27485138652</p>
                  </div>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-slate-800 leading-none">- $32.85</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5.5 h-5.5 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center font-bold font-mono shrink-0">R</span>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold text-slate-900 leading-none truncate font-sans">Relate</p>
                  </div>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-slate-800 leading-none">- $352.25</span>
              </div>
            </div>

            <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider mb-2 mt-4">Credit cards</p>
            <div className="relative flex items-center justify-between shrink-0">
              <div className="flex gap-2 w-full overflow-hidden select-none">
                <div className="w-[50%] bg-[#0d1430] py-2 px-3 rounded-xl text-white text-[8px] font-mono shrink-0">
                  <div className="flex justify-between items-center opacity-70">
                    <span className="text-[5px]">talented—</span>
                  </div>
                  <p className="text-[7.5px] mt-1 tracking-widest text-slate-200">5412 ****</p>
                </div>
                <div className="w-[50%] bg-[#1e1b4b] py-2 px-3 rounded-xl text-white text-[8px] font-mono shrink-0 select-none opacity-40">
                  <p className="text-[7.5px] mt-1 tracking-widest">3025 ****</p>
                </div>
              </div>
              <div className="absolute right-1 w-7 h-7 bg-[#7c3aed] text-white flex items-center justify-center rounded-full shadow-lg border border-white/20">
                <ArrowLeftRight className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  );
}
              </div>

              {/* Row 2: Jeremy May with custom cute vector Memoji */}
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-5.5 h-5.5 rounded-full shrink-0" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="12" fill="#fed7aa" />
                    <circle cx="9" cy="11" r="1.2" fill="#312e81" />
                    <circle cx="15" cy="11" r="1.2" fill="#312e81" />
                    <path d="M 8,14 Q 12,17 16,14" stroke="#312e81" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    <path d="M 6,8 Q 12,4 18,8" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold text-slate-900 leading-none truncate">Jeremy May</p>
                    <p className="text-[6.5px] text-slate-400 font-mono leading-none mt-0.5">27485138652</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8.5px] font-mono font-bold text-slate-800 leading-none">- $32.85</span>
                </div>
              </div>

              {/* Row 3: Relate */}
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5.5 h-5.5 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center font-bold font-mono shrink-0">R</span>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold text-slate-900 leading-none truncate">Relate</p>
                    <p className="text-[6.5px] text-slate-400 font-mono leading-none mt-0.5">27485138652</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8.5px] font-mono font-bold text-slate-800 leading-none">- $352.25</span>
                </div>
              </div>

              {/* Row 4: Olivia Green with cute custom Memoji */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-5.5 h-5.5 rounded-full shrink-0" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="12" fill="#fbcfe8" />
                    <circle cx="9" cy="10" r="1.2" fill="#4d1b33" />
                    <circle cx="15" cy="10" r="1.2" fill="#4d1b33" />
                    <path d="M 10,14 Q 12,16 14,14" stroke="#4d1b33" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    <path d="M 4,11 C 4,8 8,5 12,5 C 16,5 20,8 20,11" stroke="#f472b6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold text-slate-900 leading-none truncate">Olivia Green</p>
                    <p className="text-[6.5px] text-slate-400 font-mono leading-none mt-0.5">27485138652</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8.5px] font-mono font-bold text-emerald-600 leading-none">+ $32.85</span>
                </div>
              </div>
              
            </div>

            {/* Bottom Swipe Card segment exactly mirroring user screenshot slider with double-arrow transfer overlay */}
            <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider mb-2 mt-4">Credit cards</p>
            <div className="relative flex items-center justify-between shrink-0">
              <div className="flex gap-2 w-full overflow-hidden select-none">
                <div className="w-[45%] bg-[#0d1430] py-2 px-3 rounded-xl text-white text-[8px] font-mono shrink-0">
                  <div className="flex justify-between items-center opacity-70">
                    <span className="text-[5px]">talented—</span>
                    <span className="text-[4px]">PREMIUM</span>
                  </div>
                  <p className="text-[7.5px] mt-1 tracking-widest text-slate-200">5412 ****</p>
                </div>
                <div className="w-[45%] bg-[#1e1b4b] py-2 px-3 rounded-xl text-white text-[8px] font-mono shrink-0 select-none opacity-40">
                  <div className="flex justify-between items-center">
                    <span className="text-[5px]">talented—</span>
                  </div>
                  <p className="text-[7.5px] mt-1 tracking-widest">3025 ****</p>
                </div>
              </div>
              {/* Swipe/transfer button overlay */}
              <div className="absolute right-1 w-7 h-7 bg-[#7c3aed] text-white flex items-center justify-center rounded-full shadow-lg border border-white/20 select-none hover:scale-110 active:scale-95 transition-all cursor-pointer">
                <ArrowLeftRight className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  );
}

// ==========================================
// REPRESENTATION B: PC WINDOW SHOWCASE OVERLAPPING PORTRAIT PHONE
// ==========================================
function PcMobileShowcase() {
  return (
    <div className="relative w-full h-[520px] sm:h-[580px] flex items-center justify-center select-none overflow-visible">
      
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%) opacity-20 pointer-events-none" />
      
      <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[280px] h-[280px] bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center">
        
        {/* DESKTOP PC WINDOW CARD */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: -10, scale: 0.98 }}
          transition={{ duration: 0.7, type: "spring" }}
          className="w-full max-w-[580px] rounded-xl bg-[#0e1324] border border-slate-800 shadow-[0_30px_80px_rgba(3,6,15,0.7)] overflow-hidden mr-16"
        >
          {/* Safari Window Header */}
          <div className="bg-[#181f33] px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 block" />
            </div>
            
            <div className="w-1/2 bg-[#0e1324] border border-slate-800 text-[9px] text-slate-400 font-mono py-0.5 rounded-lg text-center">
              dashboard.talented.ai/overview
            </div>

            <div className="flex gap-1">
              <span className="w-1 h-1 bg-slate-500 rounded-full" />
              <span className="w-1 h-1 bg-slate-500 rounded-full" />
              <span className="w-1 h-1 bg-slate-500 rounded-full" />
            </div>
          </div>

          {/* PC Dashboard Desktop Content Canvas */}
          <div className="p-5 text-left grid grid-cols-12 gap-4 font-sans min-h-[260px]">
            {/* Sidebar Left Rail */}
            <div className="col-span-3 space-y-4 border-r border-slate-800 pr-3 hidden sm:block">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-4 h-4 rounded bg-[#7c3aed] flex items-center justify-center text-[8px] font-bold text-white">T</span>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Talented</span>
              </div>
              <div className="space-y-1">
                {["Overview", "Transactions", "Team Velocity", "Developer API"].map((lbl, idx) => (
                  <div key={idx} className={`text-[9px] py-1 px-1.5 rounded font-semibold ${idx === 0 ? "bg-[#7c3aed]/10 text-[#a78bfa] border-l-2 border-[#7c3aed]" : "text-slate-450"}`}>
                    {lbl}
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Content Panel Grid */}
            <div className="col-span-12 sm:col-span-9 space-y-3.5">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-white tracking-tight">Financial Hub</h4>
                <div className="text-[8px] font-mono text-emerald-400 bg-emerald-900/20 border border-emerald-900 px-1.5 py-0.5 rounded">
                  STABLE
                </div>
              </div>

              {/* Stat Boxes */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { title: "Ballance", val: "$16,542.76", growth: "+14.8%" },
                  { title: "Sprints", val: "148 Runs", growth: "+25.1%" },
                  { title: "Efficiency", val: "99.8%", growth: "Optimal" }
                ].map((stat, i) => (
                  <div key={i} className="bg-[#181f33] p-2.5 rounded-lg border border-slate-800/85">
                    <p className="text-[7px] text-slate-450 font-mono uppercase leading-none">{stat.title}</p>
                    <p className="text-xs font-black text-white mt-1 leading-none">{stat.val}</p>
                    <span className="text-[7px] text-[#00f3a4] block font-semibold font-mono mt-1">{stat.growth}</span>
                  </div>
                ))}
              </div>

              {/* Sparkline chart */}
              <div className="bg-[#181f33]/40 border border-slate-800/40 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[8px] font-mono text-slate-400 font-semibold uppercase">Platform live velocity cycle</span>
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="w-full h-12">
                  <svg viewBox="0 0 100 30" width="100%" height="100%">
                    <path
                      d="M 5,25 Q 15,10 25,18 T 45,8 T 65,22 T 85,12 T 95,5"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 5,25 Q 15,10 25,18 T 45,8 T 65,22 T 85,12 T 95,5 L 100,30 L 0,30 Z"
                      fill="url(#gradientGlow2)"
                      opacity="0.1"
                    />
                    <defs>
                      <linearGradient id="gradientGlow2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* OVERLAPPING MOBILE PHONE FRAME */}
        <motion.div
          initial={{ opacity: 0, x: 50, y: 20, rotate: 2 }}
          animate={{ opacity: 1, x: 190, y: 70, rotate: 2 }}
          transition={{ duration: 0.8, delay: 0.25, type: "spring" }}
          whileHover={{ y: 55, rotate: 0, scale: 1.04, transition: { duration: 0.2 } }}
          className="absolute bg-white w-[180px] h-[340px] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.65)] border-[4px] border-slate-950 overflow-hidden z-30"
        >
          {/* Notch cover */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-2.5 bg-slate-950 rounded-b-xl z-50 pointer-events-none" />

          {/* Canvas details */}
          <div className="h-full pt-5 px-2.5 pb-2.5 overflow-hidden text-slate-900 flex flex-col font-sans text-left bg-slate-50">
            <h3 className="text-[10px] font-black text-slate-950 tracking-tight leading-none mb-2 mt-1">Account details</h3>
            
            <div className="rounded-lg p-2 bg-[#111625] text-white relative mb-2">
              <span className="text-[5px] uppercase font-mono tracking-wider text-slate-400">Private</span>
              <p className="text-[8px] font-bold text-white mt-0.5 leading-none">Jessica Pierce</p>
              <p className="text-[9px] font-black text-white mt-2 leading-none">$16,542.76</p>
            </div>

            <p className="text-[7px] font-bold uppercase text-slate-400 tracking-wider mb-1">Latest logs</p>
            <div className="space-y-1">
              {[
                { name: "Webflow", amt: "-$485.25" },
                { name: "Jeremy May", amt: "-$32.85" },
                { name: "Relate", amt: "-$352.25" }
              ].map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200/50 text-[7px]">
                  <span className="font-bold text-slate-800">{tx.name}</span>
                  <span className="font-mono font-bold text-slate-900">{tx.amt}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-2">
              <div className="w-full bg-[#1e1e2d] py-1 rounded text-white text-center text-[7px] font-bold font-mono">
                5412 5682 ****
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

// ==========================================
// THE CORE APP COMPONENT
// ==========================================
export default function App() {
  const [modalView, setModalView] = useState<null | "signin" | "signup" | "section-preview">(null);
  
  // Custom Representation toggle: 'twin-phones' | 'pc-mobile'
  const [mockupType, setMockupType] = useState<"twin-phones" | "pc-mobile">("twin-phones");

  // Multi-Section Demo preview modals (since they live exclusively in Header now)
  const [sectionPreviewTitle, setSectionPreviewTitle] = useState<string>("");
  const [sectionPreviewDesc, setSectionPreviewDesc] = useState<string>("");
  const [previewComponent, setPreviewComponent] = useState<ReactNode | null>(null);

  // Sign In Form States
  const [signInEmail, setSignInEmail] = useState<string>("");
  const [signInPassword, setSignInPassword] = useState<string>("");
  const [keepMeSigned, setKeepMeSigned] = useState<boolean>(false);

  // Sign Up Form States
  const [signUpData, setSignUpData] = useState<Required<SignUpData>>({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  // UI States
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const triggerToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSignUpChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSignUpData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSignInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!signInEmail) {
      triggerToast("error", "Email is required to access your account.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signInEmail)) {
      triggerToast("error", "Please provide a valid email format.");
      return;
    }
    if (!signInPassword) {
      triggerToast("error", "Password is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      triggerToast("success", `Securely logged in as ${signInEmail}!`);
      setModalView(null);
    } catch {
      triggerToast("error", "Database link expired. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateSignUpForm = (): boolean => {
    const tempErrors: FormErrors = {};
    if (!signUpData.firstName.trim()) tempErrors.firstName = "First name is required";
    if (!signUpData.lastName.trim()) tempErrors.lastName = "Last name is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signUpData.email) {
      tempErrors.email = "Email address is required";
    } else if (!emailRegex.test(signUpData.email)) {
      tempErrors.email = "Specify a valid email address";
    }
    if (!signUpData.username.trim()) tempErrors.username = "Username is required";
    if (!signUpData.password) {
      tempErrors.password = "Password is required";
    } else if (signUpData.password.length < 8) {
      tempErrors.password = "Minimum length is 8 characters";
    }
    if (signUpData.password !== signUpData.confirmPassword) {
      tempErrors.confirmPassword = "Passwords do not match";
    }
    if (!signUpData.agreeTerms) {
      tempErrors.agreeTerms = "Check to agree to terms";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateSignUpForm()) {
      triggerToast("error", "Please fix form errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      triggerToast("success", "Welcome inside Talented AI Generator!");
      setModalView("signin");
      setSignInEmail(signUpData.email);
    } catch {
      triggerToast("error", "Failed to compile your secure profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Triggers real-time interactive preview of navbar items to make the App incredibly amazing!
  const showSectionPreview = (section: string) => {
    setModalView("section-preview");
    if (section === "core-features") {
      setSectionPreviewTitle("Core Features Template preview");
      setSectionPreviewDesc("Modular, responsive components rendered using custom Tailwind classes and Lucide icons.");
      setPreviewComponent(
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            { icon: <Shield className="w-5 h-5 text-indigo-400" />, t: "Secure Port", d: "Isolated API routes" },
            { icon: <Zap className="w-5 h-5 text-[#00f3a4]" />, t: "HMR Express", d: "Zero bundle overheads" },
            { icon: <ArrowLeftRight className="w-5 h-5 text-blue-400" />, t: "Sync Ledgers", d: "State remains pure" },
            { icon: <CheckCircle className="w-5 h-5 text-purple-400" />, t: "Clean Specs", d: "Production ready" }
          ].map((itm, idx) => (
            <div key={idx} className="bg-[#181f33] p-3 rounded-lg border border-slate-800 text-left">
              <div className="flex items-center gap-2 mb-1">
                {itm.icon}
                <h5 className="text-xs font-bold text-white leading-none">{itm.t}</h5>
              </div>
              <p className="text-[10px] text-slate-450 leading-tight">{itm.d}</p>
            </div>
          ))}
        </div>
      );
    } else if (section === "team-efficiency") {
      setSectionPreviewTitle("Team Efficiency Calculator");
      setSectionPreviewDesc("Dynamic analytics metrics for measuring developer iteration saving ratios.");
      setPreviewComponent(
        <div className="bg-[#181f33] p-4 rounded-lg border border-indigo-950 text-left space-y-3">
          <div className="flex justify-between items-center bg-[#070b19] p-3 rounded border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Calculated Sprint Saving:</span>
            <span className="text-sm font-black text-[#00f3a4] font-mono">$29,600 USD</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            💡 This sandbox calculation assumes 8 active devs simulating UI pages bypass standard node-modules load hierarchies. High performance output yields immediate ROI results.
          </p>
        </div>
      );
    } else if (section === "pricing-plans") {
      setSectionPreviewTitle("Pricing & Plans Layout preview");
      setSectionPreviewDesc("Uncompressed enterprise, studio and independent design tiers prepared for Stripe integrations.");
      setPreviewComponent(
        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { n: "Sandbox", p: "$0", color: "border-slate-800 bg-[#181f33]/40" },
            { n: "Pro Studio", p: "$49", color: "border-purple-600 bg-purple-950/20" },
            { n: "Elite", p: "$249", color: "border-slate-800 bg-[#181f33]/40" }
          ].map((plan, i) => (
            <div key={i} className={`p-3 rounded-lg border text-center ${plan.color}`}>
              <span className="text-[8px] tracking-wider uppercase font-bold text-slate-400 block">{plan.n}</span>
              <span className="text-sm font-extrabold text-white block mt-1.5">{plan.p}</span>
              <span className="text-[7.5px] text-slate-500 block leading-tight mt-1">/ month</span>
            </div>
          ))}
        </div>
      );
    } else if (section === "support-qa") {
      setSectionPreviewTitle("Support Q&A Center");
      setSectionPreviewDesc("Rigorous documentation, API references, token configurations, and manual zip exports.");
      setPreviewComponent(
        <div className="space-y-2 pt-1 text-left text-xs text-slate-350">
          <div className="bg-[#181f33] p-2.5 rounded border border-slate-800">
            <p className="font-bold text-slate-200">Q: Can I use this code commercially?</p>
            <p className="text-[10px] text-slate-450 mt-1">Yes, the layout generated supports full integration under standard MIT permissions.</p>
          </div>
          <div className="bg-[#181f33] p-2.5 rounded border border-slate-800">
            <p className="font-bold text-slate-200">Q: How can I change the branding?</p>
            <p className="text-[10px] text-slate-450 mt-1">Logo, styling, and color structures can be easily overridden instantly directly in your CSS files.</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* BACKGROUND GRAPHICS & BLUR LABELS */}
      <div className="absolute top-0 left-0 right-0 h-[650px] bg-gradient-to-b from-slate-50 via-white to-white pointer-events-none" />
      <div className="absolute top-[20%] left-[-100px] w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
      
      {/* GLOBAL HUD TOAST ALERTS */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs max-w-sm w-[90%] font-semibold"
            style={{
              backgroundColor: toast.type === "success" ? "#064e3b" : "#451a03",
              borderColor: toast.type === "success" ? "#065f46" : "#78350f",
              color: toast.type === "success" ? "#d1fae5" : "#fef3c7"
            }}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="flex-1 text-left">{toast.text}</span>
            <button 
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:bg-black/10 rounded-lg text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 animate-spin" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ULTRA-POLISHED HEADER/NAVBAR EDGE-TO-EDGE */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-100 shadow-xs">
        <div className="w-full px-6 sm:px-12 h-20 flex items-center justify-between">
          
          {/* Logo brand (Absolute Left edge alignment with lowercase talented & purple bar) */}
          <div 
            onClick={() => setModalView(null)}
            className="flex items-center gap-1.5 cursor-pointer select-none group"
            id="brand-logo"
          >
            <span className="text-2xl font-black tracking-tight text-slate-900 font-sans group-hover:text-[#7c3aed] transition-colors">
              talented
            </span>
            <span className="w-4 h-1 bg-[#7c3aed] rounded-sm mt-1.5 transition-transform duration-300 group-hover:scale-x-125" />
          </div>

          {/* Links for quick sections - centers gracefully, exact same labels as Pic 3 */}
          <nav className="hidden lg:flex items-center gap-8 text-[15px] font-semibold">
            <button 
              onClick={() => showSectionPreview("core-features")}
              className="text-slate-600 hover:text-[#7c3aed] transition-colors cursor-pointer font-medium"
            >
              Intro
            </button>
            <button 
              onClick={() => showSectionPreview("core-features")}
              className="text-slate-600 hover:text-[#7c3aed] transition-colors cursor-pointer flex items-center gap-1 font-medium"
            >
              Landings
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
            </button>
            <button 
              onClick={() => showSectionPreview("pricing-plans")}
              className="text-slate-600 hover:text-[#7c3aed] transition-colors cursor-pointer flex items-center gap-1 font-medium"
            >
              Pages
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
            </button>
            <button 
              onClick={() => showSectionPreview("support-qa")}
              className="text-slate-600 hover:text-[#7c3aed] transition-colors cursor-pointer flex items-center gap-1 font-medium"
            >
              CMS
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
            </button>
          </nav>

          {/* Auth buttons (Absolute Right edge alignment) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalView("signin")}
              className="px-6 py-2.5 text-sm font-semibold text-[#7c3aed] hover:text-[#5b21b6] hover:bg-purple-50/50 transition-all cursor-pointer bg-white rounded border border-[#7c3aed]/20"
            >
              Sign In
            </button>
            <button
              onClick={() => setModalView("signup")}
              className="px-6 py-2.5 text-sm font-semibold bg-[#7c3aed] hover:bg-[#6c26d8] active:scale-95 text-white rounded transition-all cursor-pointer shadow-md shadow-purple-900/10"
            >
              Open Account
            </button>
          </div>

        </div>
      </header>

      {/* COMPONENT BODY VIEWPORT with more space from header */}
      <main className="flex-1 pt-28 md:pt-36 flex flex-col justify-center min-h-[calc(100vh-110px)] select-none">
        
        {/* LANDING VIEW SECTION */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 w-full relative z-10">
          
          {/* Main Rounded Box Card mirroring the gorgeous screenshot shape */}
          <div className="w-full bg-[#080e26] rounded-3xl border border-slate-900/10 shadow-[0_32px_96px_rgba(3,6,12,0.4)] overflow-visible p-6 sm:p-10 lg:px-16 lg:py-14 relative">
            
            {/* Ambient inner box decorative circle */}
            <div className="absolute top-[-100px] right-[-50px] w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
 
            {/* Inner responsive grid container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10 w-full">
              
              {/* Left Column: Majestic text copy styled exactly like Pic 3 */}
              <div className="lg:col-span-6 flex flex-col justify-center h-full text-left">
                <h1 className="text-[34px] sm:text-[46px] lg:text-[56px] font-black tracking-tight leading-[1.1] sm:leading-[1.08] text-white font-sans text-left">
                  Generate UIs with <br />
                  the Multi-Agent AI <br />
                  of talented
                </h1>
              </div>

              {/* Right Column: Beautiful overlapping twin phone mockups */}
              <div className="lg:col-span-6 flex flex-col justify-center items-center relative overflow-visible mt-8 lg:mt-0">
                <div className="relative w-full overflow-visible flex items-center justify-center">
                  <TwinPhonesShowcase />
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* BOTTOM FOOTER */}
      <footer className="py-6 border-t border-slate-200/80 bg-slate-50/80 relative z-10 text-xs text-slate-500 font-mono">
        <div className="w-full px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">talented UI</span>
            <span className="w-1.5 h-1.5 bg-[#7c3aed] rounded-full" />
          </div>
          <p>© {new Date().getFullYear()} talented, Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <button onClick={() => showSectionPreview("core-features")} className="hover:text-slate-800 cursor-pointer">Core Features</button>
            <span>•</span>
            <button onClick={() => showSectionPreview("pricing-plans")} className="hover:text-slate-800 cursor-pointer">Pricing</button>
          </div>
        </div>
      </footer>

      {/* ============================================================================
          INTERACTIVE SCREEN MODAL COMPONENT (glassmorphism overlay container)
         ============================================================================ */}
      <AnimatePresence>
        {modalView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop blur overlay click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalView(null)}
              className="absolute inset-0 bg-[#02050e]/80 backdrop-blur-sm"
            />

            {/* Modal Body card container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[620px] bg-[#181f33] rounded-2xl shadow-[0_25px_60px_rgba(2,4,12,0.6)] border border-slate-800 p-8 sm:p-10 text-left overflow-y-auto max-h-[90vh] z-10"
            >
              
              {/* Absolutes Close button */}
              <button
                onClick={() => setModalView(null)}
                className="absolute right-4 top-4 p-2 text-slate-450 hover:text-white hover:bg-slate-800/60 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title brand Header */}
              <div className="flex items-center gap-1.5 mb-6 select-none border-b border-slate-800 pb-4">
                <span className="text-xl font-bold tracking-tight text-white font-sans">talented</span>
                <span className="w-4 h-1 bg-[#7c3aed] rounded-sm mt-1" />
              </div>

              {/* VIEW SWAP 1: SECTION PREVIEWS */}
              {modalView === "section-preview" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#a78bfa]" />
                    <h3 className="text-lg font-black text-white">{sectionPreviewTitle}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                    {sectionPreviewDesc}
                  </p>
                  
                  {/* Dynamic Custom Component output */}
                  <div className="border-t border-slate-800 pt-4 mt-2">
                    {previewComponent}
                  </div>

                  <div className="bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-lg text-[10px] leading-relaxed text-[#c084fc] flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#a78bfa] shrink-0" />
                    <span>
                      <strong>AI Generator Simulator:</strong> Under normal operation, clicking navbar sections renders their generated widgets in real-time. This interactive pop-up illustrates high-fidelity previews.
                    </span>
                  </div>

                  <button
                    onClick={() => setModalView(null)}
                    className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-lg uppercase tracking-wider transition-all text-center cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              )}

              {/* VIEW SWAP 2: SIGN IN MODAL FORM ENTRY */}
              {modalView === "signin" && (
                <div>
                  <h3 className="text-2xl font-black text-white mb-6">Sign In</h3>
                  
                  <form onSubmit={handleSignInSubmit} className="space-y-5">
                    
                    <div>
                      <label className="block text-[11px] font-bold text-slate-350 uppercase tracking-widest mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        className="w-full bg-[#232a42] border border-slate-700/60 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm font-medium focus:outline-hidden transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-350 uppercase tracking-widest mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="w-full bg-[#232a42] border border-slate-700/60 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 text-white placeholder-slate-500 rounded-lg pl-4 pr-10 py-3 text-sm font-medium focus:outline-hidden transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold pt-1">
                      <label className="flex items-center gap-2 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={keepMeSigned}
                          onChange={(e) => setKeepMeSigned(e.target.checked)}
                          className="rounded border-slate-700 bg-[#232a42] text-[#7c3aed] focus:ring-[#7c3aed]/50 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-350">Keep me signed in</span>
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => triggerToast("error", "Password recovery link has been safely cached. Ready for production integration.")}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#7c3aed] hover:bg-[#6c26d8] active:bg-[#5b1eb8] text-white py-3.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer select-none mt-4"
                    >
                      {isSubmitting ? "Authenticating Entry..." : "Submit Credentials"}
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerToast("error", "Google auth requires configuration keys. Integration prepared!")}
                      className="w-full bg-[#161c2c] hover:bg-[#20273c] border border-slate-700/60 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue With Google
                    </button>
                  </form>

                  <div className="text-center text-xs text-slate-400 mt-6 pt-4 border-t border-slate-800">
                    Don't have an profile yet?{" "}
                    <button
                      onClick={() => setModalView("signup")}
                      className="text-[#a78bfa] font-black hover:underline cursor-pointer ml-1"
                    >
                      Create one here
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW SWAP 3: SIGN UP MODAL FORM ENTRY */}
              {modalView === "signup" && (
                <div>
                  <h3 className="text-2xl font-black text-white mb-6">Create Account</h3>
                  
                  <form onSubmit={handleSignUpSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-2">First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          placeholder="First name"
                          value={signUpData.firstName}
                          onChange={handleSignUpChange}
                          className="w-full px-4 py-2 bg-[#232a42] border border-slate-705/60 text-white rounded-lg text-sm"
                        />
                        {errors.firstName && <p className="text-[10px] text-rose-450 mt-1">{errors.firstName}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-2">Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Last name"
                          value={signUpData.lastName}
                          onChange={handleSignUpChange}
                          className="w-full px-4 py-2 bg-[#232a42] border border-slate-705/60 text-white rounded-lg text-sm"
                        />
                        {errors.lastName && <p className="text-[10px] text-rose-450 mt-1">{errors.lastName}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-2">Username</label>
                      <input
                        type="text"
                        name="username"
                        placeholder="Choose unique username"
                        value={signUpData.username}
                        onChange={handleSignUpChange}
                        className="w-full px-4 py-2 bg-[#232a42] border border-slate-700 text-white rounded-lg text-sm"
                      />
                      {errors.username && <p className="text-[10px] text-rose-450 mt-1">{errors.username}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-2">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={signUpData.email}
                        onChange={handleSignUpChange}
                        className="w-full px-4 py-2 bg-[#232a42] border border-slate-700 text-white rounded-lg text-sm"
                      />
                      {errors.email && <p className="text-[10px] text-[#f43f5e] mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Create strong password"
                          value={signUpData.password}
                          onChange={handleSignUpChange}
                          className="w-full pl-4 pr-10 py-2 bg-[#232a42] border border-slate-700 text-white rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-[10px] text-rose-450 mt-1">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#cbd5e1] uppercase tracking-wider mb-2">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Confirm your password"
                          value={signUpData.confirmPassword}
                          onChange={handleSignUpChange}
                          className="w-full pl-4 pr-10 py-2 bg-[#232a42] border border-slate-700 text-white rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-[10px] text-rose-450 mt-1">{errors.confirmPassword}</p>}
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        name="agreeTerms"
                        checked={signUpData.agreeTerms}
                        onChange={handleSignUpChange}
                        className="mt-1 rounded bg-[#232a42] text-[#7c3aed] w-4 h-4"
                      />
                      <label htmlFor="agreeTerms" className="text-[11px] text-slate-300 leading-tight select-none cursor-pointer">
                        I agree to the Terms of Service and Privacy Guidelines.
                      </label>
                    </div>
                    {errors.agreeTerms && <p className="text-[10px] text-rose-450">{errors.agreeTerms}</p>}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#7c3aed] hover:bg-[#6c26d8] text-white py-3 rounded-lg font-bold text-sm transition-all mt-4"
                    >
                      {isSubmitting ? "Creating Sandbox Access..." : "Register Profile"}
                    </button>
                  </form>

                  <div className="text-center text-xs text-slate-400 mt-6 pt-4 border-t border-slate-800">
                    Already registered?{" "}
                    <button
                      onClick={() => setModalView("signin")}
                      className="text-[#a78bfa] font-black hover:underline cursor-pointer ml-1"
                    >
                      Sign in here
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
