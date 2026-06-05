import { useFadeUp, useCountUp } from "../hooks/use-fade-up";
import {
  Sparkles,
  ArrowRight,
  MonitorPlay,
  Brain,
  Palette,
  Code2,
  ShieldCheck,
  Wand2,
  Mic,
  Bot,
  Eye,
  Accessibility,
  GitBranch,
  Calendar,
  FileText,
  MessageSquare,
  Zap,
  Download,
  Upload,
  GitBranch as Github,
  Type,
  Cpu,
  Rocket,
} from "lucide-react";

/* ----------------------------- NAV ----------------------------- */
interface Props { onSignIn: () => void }

const Nav = ({ onSignIn }: Props) => (
  <nav className="fixed left-1/2 top-5 z-50 w-[min(1100px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200/60 bg-white px-5 py-3 shadow-lg">
    <div className="flex items-center justify-between gap-4">
      <a href="#" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-display text-xl font-bold tracking-tight text-[#0D0D5C]">
          Talanted
        </span>
      </a>
      <div className="hidden items-center gap-1 md:flex">
        {["Features", "How it works", "Pricing", "About"].map((l) => (
          <a
            key={l}
            href={`#${l.toLowerCase().replace(/\s/g, "-")}`}
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#0D0D5C]"
          >
            {l}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onSignIn} className="hidden rounded-lg px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:block">
          Sign in
        </button>
        <button onClick={onSignIn} className="group inline-flex items-center gap-1.5 rounded-lg bg-[#0D0D5C] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1a1a7a]">
          Get Started
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  </nav>
);

/* ----------------------------- HERO ----------------------------- */
const LaptopMockup = () => (
  <div
    className="relative animate-float-slow"
    style={{ transform: "perspective(1400px) rotateX(8deg)" }}
  >
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-slate-900 p-3 shadow-2xl">
      <div className="mb-2 flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="grid grid-cols-12 gap-3 rounded-lg bg-gradient-to-br from-[#F0F0FF] to-white p-4 text-left">
        <div className="col-span-3 space-y-2">
          <div className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
            ✨ New Project
          </div>
          {[
            { i: Brain, t: "Planner" },
            { i: Palette, t: "Designer" },
            { i: Code2, t: "Coder" },
            { i: ShieldCheck, t: "Validator" },
          ].map((x) => (
            <div
              key={x.t}
              className="flex items-center gap-2 rounded-md bg-white px-2.5 py-2 text-xs text-slate-700 shadow-sm"
            >
              <x.i className="h-3.5 w-3.5 text-indigo-600" />
              {x.t}
            </div>
          ))}
        </div>
        <div className="col-span-9 space-y-3">
          <div className="rounded-md bg-white p-3 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Prompt
            </div>
            <div className="mt-1 text-xs text-slate-700">
              "Build a SaaS pricing page with three tiers, dark hero, and FAQ"
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              "from-indigo-500 to-violet-500",
              "from-teal-400 to-emerald-500",
              "from-orange-400 to-rose-500",
            ].map((g, i) => (
              <div key={i} className="rounded-md bg-white p-2.5 shadow-sm">
                <div className={`mb-2 h-10 rounded bg-gradient-to-br ${g}`} />
                <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                <div className="mt-1.5 h-1.5 w-1/2 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-12 rounded bg-slate-900" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-md bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              WCAG AA passed
            </div>
            <div className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
              READY
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="mx-auto h-3 w-[105%] -translate-x-[2.5%] rounded-b-xl bg-slate-800" />
  </div>
);

const Hero = ({ onSignIn }: Props) => {
  const ref = useFadeUp<HTMLElement>();
  return (
    <section
      ref={ref}
      className="relative overflow-hidden pb-32 pt-36 text-white"
      style={{
        background:
          "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #4F46E5 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(167,139,250,.5), transparent 40%), radial-gradient(circle at 80% 20%, rgba(34,211,238,.35), transparent 35%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <div className="fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
          AI-Powered Platform
        </div>
        <h1 className="fade-up font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          Generate <span className="italic text-cyan-300">Production-Ready</span> UI
          <br /> from a Simple Description
        </h1>
        <p className="fade-up mx-auto mt-6 max-w-2xl text-lg text-violet-100/85 md:text-xl">
          Four specialized AI agents collaborate to plan, design, code, and validate
          your interfaces — shipping clean React + Tailwind in seconds.
        </p>
        <div className="fade-up mt-10 flex flex-wrap items-center justify-center gap-3">
          <button onClick={onSignIn} className="group inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.9)] transition-all hover:bg-cyan-300">
            Start Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button onClick={onSignIn} className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">
            <MonitorPlay className="h-4 w-4" />
            Watch Demo
          </button>
        </div>

        <div className="fade-up mx-auto mt-20 max-w-4xl">
          <LaptopMockup />
        </div>
      </div>
    </section>
  );
};

/* ------------------------ HOW IT WORKS ------------------------ */
const agents = [
  {
    n: 1,
    label: "Planner",
    title: "Architecture & plan",
    desc: "Parses your prompt, breaks it into components, defines routes, data, and layout structure.",
    icon: Brain,
    color: "bg-indigo-600",
    ring: "ring-indigo-200",
  },
  {
    n: 2,
    label: "Designer",
    title: "Design system & theme",
    desc: "Picks palette, typography pairing, spacing scale, and produces semantic design tokens.",
    icon: Palette,
    color: "bg-teal-500",
    ring: "ring-teal-200",
  },
  {
    n: 3,
    label: "Coder",
    title: "React + Tailwind code",
    desc: "Generates clean, idiomatic components with shadcn primitives, types, and props.",
    icon: Code2,
    color: "bg-orange-500",
    ring: "ring-orange-200",
  },
  {
    n: 4,
    label: "Validator",
    title: "Quality & accessibility",
    desc: "Audits contrast, focus states, ARIA, semantic HTML — flags issues before shipping.",
    icon: ShieldCheck,
    color: "bg-violet-600",
    ring: "ring-violet-200",
  },
];

const TimelineCard = ({ a }: { a: (typeof agents)[number] }) => {
  const Icon = a.icon;
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-[0_10px_40px_-20px_rgba(13,13,92,0.25)]">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          {a.label}
        </span>
      </div>
      <h3 className="font-display text-xl font-bold text-[#0D0D5C]">{a.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.desc}</p>
    </div>
  );
};

const HowItWorks = () => {
  const ref = useFadeUp<HTMLElement>();
  return (
    <section ref={ref} id="how-it-works" className="dot-grid relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="fade-up mx-auto mb-20 max-w-3xl text-center">
          <div className="mb-4 inline-block rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
            How it works
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-[#0D0D5C] md:text-5xl">
            Built on 4 AI Agents Working in Sequence
          </h2>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 hidden h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-indigo-300 via-violet-400 to-orange-400 md:block" />
          <div className="space-y-16">
            {agents.map((a, i) => {
              const left = i % 2 === 0;
              return (
                <div key={a.n} className="fade-up relative md:grid md:grid-cols-2 md:gap-12">
                  <div
                    className={`absolute left-1/2 top-6 z-10 hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white ${a.color} font-display text-lg font-bold text-white shadow-lg md:flex`}
                  >
                    {a.n}
                  </div>
                  {left ? (
                    <>
                      <div className="md:pr-12">
                        <TimelineCard a={a} />
                      </div>
                      <div />
                    </>
                  ) : (
                    <>
                      <div />
                      <div className="md:pl-12">
                        <TimelineCard a={a} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/* --------------------------- FEATURES --------------------------- */
const features = [
  {
    icon: Wand2,
    iconBg: "bg-indigo-600",
    title: "Text to UI Generation",
    desc: "Turn natural-language prompts into polished, production-ready interfaces in seconds.",
    mock: (
      <div className="space-y-2">
        <div className="rounded-md bg-indigo-100 px-3 py-2 text-xs font-medium text-indigo-700">
          "Create a signup form with social auth"
        </div>
        <div className="h-2 w-3/4 rounded bg-slate-200" />
        <div className="h-2 w-1/2 rounded bg-slate-200" />
        <div className="h-7 w-24 rounded-md bg-indigo-600" />
      </div>
    ),
    bg: "from-indigo-50 to-white",
  },
  {
    icon: Mic,
    iconBg: "bg-teal-500",
    title: "Import from Meeting",
    desc: "Drop in a recording — Talanted extracts requirements and generates the screens.",
    mock: (
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100">
          <Mic className="h-5 w-5 text-teal-600" />
        </div>
        <div className="flex items-end gap-0.5">
          {[3, 6, 4, 8, 5, 7, 3, 6, 4, 7, 5].map((h, i) => (
            <div key={i} className="w-1 rounded-full bg-teal-400" style={{ height: h * 3 }} />
          ))}
        </div>
      </div>
    ),
    bg: "from-teal-50 to-white",
  },
  {
    icon: Bot,
    iconBg: "bg-violet-600",
    title: "TED AI Assistant",
    desc: "Your in-context design partner. Ask, iterate, and refine without leaving the canvas.",
    mock: (
      <div className="space-y-1.5">
        <div className="ml-auto w-max rounded-2xl rounded-tr-sm bg-[#0D0D5C] px-3 py-1.5 text-xs text-white">
          Make the hero darker
        </div>
        <div className="w-max rounded-2xl rounded-tl-sm bg-violet-100 px-3 py-1.5 text-xs text-violet-900">
          ✨ Updated theme
        </div>
      </div>
    ),
    bg: "from-violet-50 to-white",
  },
  {
    icon: Eye,
    iconBg: "bg-orange-500",
    title: "Live Preview & Hot Reload",
    desc: "See your UI render in real time across breakpoints as you generate and edit.",
    mock: (
      <div className="grid grid-cols-3 gap-1.5">
        {["from-indigo-200 to-indigo-100", "from-teal-200 to-teal-100", "from-orange-200 to-orange-100"].map(
          (g, i) => (
            <div key={i} className={`rounded bg-gradient-to-br ${g} p-2`}>
              <div className="h-1.5 w-full rounded bg-white" />
              <div className="mt-1 h-4 rounded bg-white/70" />
            </div>
          ),
        )}
      </div>
    ),
    bg: "from-orange-50 to-white",
  },
  {
    icon: Accessibility,
    iconBg: "bg-emerald-500",
    title: "Accessibility Audit WCAG 2.1",
    desc: "Built-in checks flag contrast, focus, ARIA, and semantics — pass AA before shipping.",
    mock: (
      <div className="space-y-1.5">
        {[
          { c: "bg-emerald-500", t: "Contrast AA" },
          { c: "bg-emerald-500", t: "Focus rings" },
          { c: "bg-amber-500", t: "Alt text — 2 warnings" },
        ].map((r) => (
          <div key={r.t} className="flex items-center gap-2 text-xs text-slate-700">
            <span className={`h-2 w-2 rounded-full ${r.c}`} />
            {r.t}
          </div>
        ))}
      </div>
    ),
    bg: "from-emerald-50 to-white",
  },
  {
    icon: GitBranch,
    iconBg: "bg-rose-500",
    title: "GitLab & Jira Integration",
    desc: "Push generated code to a branch, open MRs, and sync tasks to Jira automatically.",
    mock: (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 font-mono text-[10px] text-slate-600">
        <div className="text-emerald-600">+ feat(ui): add pricing page</div>
        <div className="text-slate-400">main → feature/pricing</div>
        <div className="mt-1 text-rose-500">JIRA-204 linked</div>
      </div>
    ),
    bg: "from-rose-50 to-white",
  },
];

const Features = () => {
  const ref = useFadeUp<HTMLElement>();
  return (
    <section id="features" ref={ref} className="bg-white py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="fade-up mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 inline-block rounded-full bg-slate-900/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
            Complete Ecosystem
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-[#0D0D5C] md:text-5xl">
            Everything You Need to Build Faster
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="fade-up group relative rounded-2xl border border-slate-200 bg-white p-6"
                style={{
                  transitionDelay: `${i * 60}ms`,
                  transition: 'opacity 0.65s ease-out, transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                  willChange: 'transform',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transitionDelay = '0ms'
                  el.style.transform = 'translateY(-8px)'
                  el.style.boxShadow = '0 20px 50px -20px rgba(79,70,229,0.35)'
                  el.style.borderColor = '#a5b4fc'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(0px)'
                  el.style.boxShadow = ''
                  el.style.borderColor = ''
                }}
              >
                <div className={`mb-5 rounded-xl border border-slate-100 bg-gradient-to-br ${f.bg} p-4 shadow-inner`}>
                  {f.mock}
                </div>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${f.iconBg} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0D0D5C]">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ----------------------- FEATURE DEEP DIVE ----------------------- */
type Accent = {
  text: string;
  bg: string;
  btn: string;
  ring: string;
  soft: string;
};

const deepDives: {
  title: string;
  subtitle: string;
  accent: Accent;
  items: { icon: any; title: string; desc: string }[];
  mock: JSX.Element;
}[] = [
  {
    title: "Import from Meeting",
    subtitle:
      "Stop translating meetings into specs. Drop in an audio recording and Talanted ships the screens.",
    accent: {
      text: "text-teal-600",
      bg: "bg-teal-500",
      btn: "bg-teal-500 hover:bg-teal-600",
      ring: "ring-teal-200",
      soft: "bg-teal-50",
    },
    items: [
      { icon: Mic, title: "Audio transcription", desc: "Accurate speech-to-text with speaker diarization." },
      { icon: FileText, title: "Requirements extraction", desc: "Pulls user stories, features, and constraints." },
      { icon: Calendar, title: "Meeting sync", desc: "Connect Zoom, Meet, or upload .mp3 / .mp4 files." },
      { icon: Zap, title: "Instant scaffolding", desc: "Generates routes, components, and copy in one pass." },
    ],
    mock: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-teal-50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-slate-800">Q3 Planning.mp3</div>
            <div className="text-[10px] text-slate-500">12:48 — transcribed</div>
          </div>
          <span className="rounded bg-teal-500 px-2 py-0.5 text-[10px] font-bold text-white">DONE</span>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-800">Extracted features</div>
          <ul className="mt-1.5 space-y-1">
            <li>• Onboarding wizard (3 steps)</li>
            <li>• Admin dashboard with charts</li>
            <li>• Billing settings page</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "TED AI Assistant",
    subtitle:
      "Your always-on design partner. Refine layouts, swap components, and rewrite copy with a sentence.",
    accent: {
      text: "text-indigo-600",
      bg: "bg-indigo-600",
      btn: "bg-indigo-600 hover:bg-indigo-700",
      ring: "ring-indigo-200",
      soft: "bg-indigo-50",
    },
    items: [
      { icon: MessageSquare, title: "Natural language edits", desc: "“Make this hero bolder” — done." },
      { icon: Brain, title: "Context aware", desc: "Knows your tokens, components, and routes." },
      { icon: Wand2, title: "Multi-step changes", desc: "Refactors across files when you ask." },
      { icon: Eye, title: "Preview every diff", desc: "See changes before they hit your branch." },
    ],
    mock: (
      <div className="space-y-2">
        <div className="ml-auto w-max max-w-[80%] rounded-2xl rounded-tr-sm bg-[#0D0D5C] px-3 py-2 text-xs text-white">
          Change the CTA to teal and add a trust badge
        </div>
        <div className="w-max max-w-[85%] rounded-2xl rounded-tl-sm bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          ✨ Updated button color, added “SOC 2 ready” badge above the form.
        </div>
        <div className="ml-auto w-max rounded-2xl rounded-tr-sm bg-[#0D0D5C] px-3 py-2 text-xs text-white">
          Perfect, ship it
        </div>
      </div>
    ),
  },
  {
    title: "One-Click Export",
    subtitle:
      "Push to GitLab, open a merge request, sync Jira tickets — all from a single button.",
    accent: {
      text: "text-orange-600",
      bg: "bg-orange-500",
      btn: "bg-orange-500 hover:bg-orange-600",
      ring: "ring-orange-200",
      soft: "bg-orange-50",
    },
    items: [
      { icon: Github, title: "GitLab & GitHub", desc: "Native integration with branch & MR creation." },
      { icon: Download, title: "Download as ZIP", desc: "Grab the whole project in a clean repo layout." },
      { icon: Upload, title: "Deploy to Vercel", desc: "One click from generation to production URL." },
      { icon: GitBranch, title: "Jira linking", desc: "Auto-link tickets and update status on merge." },
    ],
    mock: (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-semibold text-slate-800">gitlab.com/talanted/app</span>
          </div>
          <span className="rounded bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">PUSHED</span>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 font-mono text-[10px] text-slate-600">
          <div className="text-emerald-600">+ 14 files changed</div>
          <div className="text-slate-500">main ← feature/pricing-v2</div>
          <div className="mt-1 text-orange-600">MR !247 opened · JIRA-318 linked</div>
        </div>
      </div>
    ),
  },
];

const DeepDive = ({ d }: { d: (typeof deepDives)[number] }) => {
  const ref = useFadeUp<HTMLElement>();
  return (
    <section ref={ref} className="dot-grid relative py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className={`fade-up font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl ${d.accent.text}`}>
            {d.title}
          </h2>
          <p className="fade-up mt-4 max-w-lg text-lg text-slate-600">{d.subtitle}</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {d.items.map((it, i) => {
              const Icon = it.icon;
              return (
                <div key={it.title} className="fade-up" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${d.accent.bg} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#0D0D5C]">{it.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{it.desc}</p>
                </div>
              );
            })}
          </div>
          <button
            className={`fade-up mt-10 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white ${d.accent.btn}`}
          >
            Learn more
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="fade-up">
          <div className="animate-float rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(13,13,92,0.3)]">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[10px] font-semibold text-slate-400">talanted.app</span>
            </div>
            {d.mock}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------ INTEGRATION DIAGRAM ------------------------ */
const integrationNodes = [
  { icon: Type, label: "Text Input", color: "bg-indigo-600" },
  { icon: Cpu, label: "AI Pipeline", color: "bg-violet-600" },
  { icon: Code2, label: "React Code", color: "bg-teal-500" },
  { icon: Eye, label: "Preview", color: "bg-orange-500" },
  { icon: Download, label: "Export", color: "bg-rose-500" },
  { icon: Github, label: "GitLab", color: "bg-slate-800" },
];

const IntegrationDiagram = () => {
  const ref = useFadeUp<HTMLElement>();
  return (
    <section ref={ref} className="bg-[#F0F0FF] py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="fade-up rounded-3xl border border-indigo-100 bg-white p-10 shadow-[0_30px_80px_-30px_rgba(13,13,92,0.2)] md:p-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <div className="mb-4 inline-block rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
              Integration
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight text-[#0D0D5C] md:text-5xl">
              All Modules Work Together
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {integrationNodes.map((n, i) => {
              const Icon = n.icon;
              return (
                <div key={n.label} className="fade-up flex items-center gap-3" style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${n.color} text-white shadow-lg`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {n.label}
                    </span>
                  </div>
                  {i < integrationNodes.length - 1 && (
                    <ArrowRight className="hidden h-5 w-5 text-indigo-400 md:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ----------------------------- STATS ----------------------------- */
const StatItem = ({
  value,
  suffix,
  label,
  color,
}: {
  value: number;
  suffix: string;
  label: string;
  color: string;
}) => {
  const { ref, value: v } = useCountUp(value);
  return (
    <div className="text-center">
      <div className={`font-display text-5xl font-bold md:text-6xl ${color}`}>
        <span ref={ref}>{v}</span>
        {suffix}
      </div>
      <div className="mt-2 text-sm font-medium text-slate-600">{label}</div>
    </div>
  );
};

const Stats = () => {
  const ref = useFadeUp<HTMLElement>();
  return (
    <section ref={ref} className="bg-white py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 md:grid-cols-4">
        <div className="fade-up">
          <StatItem value={10} suffix="x" label="Faster than manual coding" color="text-indigo-600" />
        </div>
        <div className="fade-up" style={{ transitionDelay: "100ms" }}>
          <StatItem value={100} suffix="%" label="Production-ready code" color="text-teal-500" />
        </div>
        <div className="fade-up" style={{ transitionDelay: "200ms" }}>
          <StatItem value={21} suffix="" label="WCAG 2.1 AA Accessibility" color="text-orange-500" />
        </div>
        <div className="fade-up" style={{ transitionDelay: "300ms" }}>
          <StatItem value={4} suffix="" label="AI Agents in sequence" color="text-violet-600" />
        </div>
      </div>
    </section>
  );
};

/* ----------------------------- CTA ----------------------------- */
const CtaSection = ({ onSignIn }: Props) => {
  const ref = useFadeUp<HTMLElement>();
  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-28"
      style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 50%, rgba(34,211,238,.4), transparent 40%), radial-gradient(circle at 70% 50%, rgba(244,114,182,.3), transparent 40%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center text-white">
        <div className="fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
          <Rocket className="h-3.5 w-3.5 text-cyan-300" />
          Ready when you are
        </div>
        <h2 className="fade-up font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Start Building <span className="italic text-cyan-300">in Seconds</span>
        </h2>
        <p className="fade-up mx-auto mt-5 max-w-xl text-lg text-violet-100/85">
          Free to start. No credit card. Ship your first generated UI today.
        </p>
        <div className="fade-up mt-9 flex flex-wrap justify-center gap-3">
          <button onClick={onSignIn} className="group inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.9)] hover:bg-cyan-300">
            Start Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button onClick={onSignIn} className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Sign in
          </button>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-[#0D0D5C] py-10 text-center text-sm text-violet-200/70">
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 md:flex-row md:justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-display font-bold text-white">Talanted</span>
      </div>
      <div>© 2026 Talanted. Crafted with care.</div>
    </div>
  </footer>
);

/* ----------------------------- PAGE ----------------------------- */
const LandingPage = ({ onSignIn }: Props) => {
  return (
    <div className="min-h-screen bg-[#F0F0FF]">
      <Nav onSignIn={onSignIn} />
      <Hero onSignIn={onSignIn} />
      <HowItWorks />
      <Features />
      {deepDives.map((d) => (
        <DeepDive key={d.title} d={d} />
      ))}
      <IntegrationDiagram />
      <Stats />
      <CtaSection onSignIn={onSignIn} />
      <Footer />
    </div>
  );
};

export default LandingPage;
