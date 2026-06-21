/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  X, 
  Edit2, 
  Check, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  History,
  Monitor,
  Layout,
  Sliders,
  Shield,
  HelpCircle,
  Mail,
  ArrowRight,
  ArrowLeft,
  Users,
  Zap,
  Layers,
  CheckCircle2,
  Lock,
  ChevronDown,
  Info,
  MousePointer,
  Sparkle,
  PenTool,
  Grid,
  Box,
  Spline,
  MessageSquare,
  Volume2,
  Home,
  User,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
  BookOpen,
  Image,
  ArrowUp
} from 'lucide-react';

// Interfaces for our interactive sandbox
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

export default function App() {
  // --- AUTHENTICATION SCREEN FOR THE CLONE DEMO ---
  const [currentScreen, setCurrentScreen] = useState<'auth' | 'app'>('app');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin' | 'forgot' | 'resetsent'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // --- LOGGED-IN TALANTED WORKSPACE VIEWS ---
  // Users can switch between 'dashboard' ("What should we build, Developpeur?") and 'editor' (IDE layout preview with live charts and code edit logs)
  const [portalView, setPortalView] = useState<'dashboard' | 'editor'>('dashboard');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'home' | 'projects' | 'profile'>('home'); // Set 'home' as default search greeting
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<'All' | 'Prompt' | 'Meeting' | 'Jira'>('All');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('Ecommerce');
  const [editorTab, setEditorTab] = useState<'preview' | 'code' | 'quality' | 'accessibility'>('preview');
  const [promptInput, setPromptInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; timestamp: string }>>([
    { sender: 'assistant', text: "Hello! Our 11-agent pipeline has successfully generated your initial 'Ecommerce' system layout based on the functional requirements extract. What would you like to edit next?", timestamp: "10:14 AM" }
  ]);

  // AI Editor Custom Workspace State variables
  const [selectedExplorerFile, setSelectedExplorerFile] = useState<string>('button.tsx');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'src': true,
    'components': true,
    'ui': true
  });
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [activeTabSub, setActiveTabSub] = useState<'issues' | 'components' | 'history'>('issues');
  const [rightSidebarMode, setRightSidebarMode] = useState<'chat' | 'versions' | 'meeting'>('chat');

  // --- PIXSO SUBSCRIPTION PLANS & PRICING STATES ---
  const [pricingActiveTab, setPricingActiveTab] = useState<'design' | 'whiteboard' | 'dev'>('design');
  const [isTeamAnnualBilling, setIsTeamAnnualBilling] = useState<boolean>(false);
  const [isBasicExpanded, setIsBasicExpanded] = useState<boolean>(true);
  const [isSmartDeliveryExpanded, setIsSmartDeliveryExpanded] = useState<boolean>(true);
  const [isSecuritySupportExpanded, setIsSecuritySupportExpanded] = useState<boolean>(true);

  // --- LANDING PAGE NEW SECTIONS STATES ---
  const [activeLandingRole, setActiveLandingRole] = useState<'pm' | 'designer' | 'auditor' | 'developer' | 'manager'>('pm');
  const [landingPrompt, setLandingPrompt] = useState<string>("A SaaS dashboard to manage crypto transactions...");
  const [landingAgentStatus, setLandingAgentStatus] = useState<'idle' | 'scribe' | 'architect' | 'synth' | 'completed'>('idle');
  const [codeModeTab, setCodeModeTab] = useState<'preview' | 'code'>('preview');
  const [mockSelectedStyle, setMockSelectedStyle] = useState<string>('rounded-xl');
  const [landingPromptIndex, setLandingPromptIndex] = useState<number>(0);

  // NEW: State variables to support Inspect Mode & Live Element Code Styling properties (Pics 1 and 2)
  const [isInspectMode, setIsInspectMode] = useState<boolean>(false);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isStyleOverlayOpen, setIsStyleOverlayOpen] = useState<boolean>(false);
  
  // Custom styled properties for elements: text color, bg color, size, weight, font family, text alignment, border radius
  const [elementStyles, setElementStyles] = useState<Record<string, {
    textColor: string;
    bgColor: string;
    size: '11px' | '12px' | '14px' | '16px' | '18px';
    weight: 'Light' | 'Regular' | 'Medium' | 'Bold' | 'Extrabold';
    font: 'Inter' | 'JetBrains Mono' | 'Space Grotesk' | 'Playfair Display';
    align: 'left' | 'center' | 'right';
    radius: '0px' | '4px' | '8px' | '12px' | '16px';
  }>>({
    'sales-volume': { textColor: '#020817', bgColor: '#fafaf9', size: '12px', weight: 'Bold', font: 'Inter', align: 'left', radius: '12px' },
    'active-orders': { textColor: '#020817', bgColor: '#fafaf9', size: '12px', weight: 'Bold', font: 'Inter', align: 'left', radius: '12px' },
    'checkout-button': { textColor: '#ffffff', bgColor: '#2563eb', size: '12px', weight: 'Extrabold', font: 'Inter', align: 'center', radius: '12px' },
    'hero-banner': { textColor: '#f5f5f4', bgColor: '#09090b', size: '12px', weight: 'Bold', font: 'Inter', align: 'left', radius: '12px' },
    'learn-more-btn': { textColor: '#f5f5f4', bgColor: '#09090b', size: '11px', weight: 'Bold', font: 'Inter', align: 'center', radius: '8px' },
    'live-demo-btn': { textColor: '#374151', bgColor: '#ffffff', size: '11px', weight: 'Bold', font: 'Inter', align: 'center', radius: '8px' },
    'available-funds': { textColor: '#ffffff', bgColor: '#15395e', size: '12px', weight: 'Bold', font: 'Inter', align: 'left', radius: '16px' }
  });
  const [stylePanelTab, setStylePanelTab] = useState<'style' | 'layout'>('style');

  // NEW STATES FOR MANUALLY SLIDING IN/OUT SIDEBARS & TED POPUP CHAT
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [isTedPopupOpen, setIsTedPopupOpen] = useState<boolean>(false);
  const [tedActiveTab, setTedActiveTab] = useState<'chat' | 'diagnostics'>('chat');
  const [tedChatMessages, setTedChatMessages] = useState<Array<{
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
    codeBlock?: string;
    status?: 'info' | 'success' | 'warning' | 'error';
    suggestedFixes?: { id: string; title: string; action: string }[];
  }>>([
    {
      sender: 'assistant',
      text: `🛠️ **TED Active Code Co-Pilot & Debugger** initialized for **Petsorel standard workspace**.\n\nI have successfully scanned your active application canvas. We are running in a dedicated Node.js container behind a port 3000 reverse proxy.\n\n**Current Design Context Analyzed:**\n- Headings styled with **Space Grotesk** coupled with **Inter** body text\n- Active Brand Palette: Warm/Cool deep slate colors (\`#102a46\` / \`#15395e\`)\n- Active component page: \`Ecommerce\` layout (sales volume indicators, revenue pie distribution chart with svg labels, and custom table list)\n\nLet's design, style, customize, or debug components! Use the prompt box below to request direct updates or trigger diagnostic fixes.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'success',
      suggestedFixes: [
        { id: 'fix-spacing', title: '📏 Optimize container spacing & layout paddings', action: 'Inject style improvements & align with first-class figma blueprints' },
        { id: 'fix-contrast', title: '🎨 Refine text dark contrast ratios', action: 'Set highlights to hover:bg-slate-100' },
        { id: 'fix-code', title: '💻 Generate additional interactive controls', action: 'Output optimized responsive toggle logic' }
      ]
    }
  ]);
  const [tedPromptInput, setTedPromptInput] = useState<string>('');

  // New States for Push to GitLab, Netlify Deploy, and Share dialogs
  const [isGitlabModalOpen, setIsGitlabModalOpen] = useState(false);
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com');
  const [gitlabProjectPath, setGitlabProjectPath] = useState('meryemboukraa199@gmail.com');
  const [gitlabToken, setGitlabToken] = useState('');
  const [gitlabBranch, setGitlabBranch] = useState('main');
  const [gitlabCommitMsg, setGitlabCommitMsg] = useState('feat: AI-generated UI');

  const [isNetlifyModalOpen, setIsNetlifyModalOpen] = useState(false);
  const [netlifyToken, setNetlifyToken] = useState('');
  const [isNetlifyDeploying, setIsNetlifyDeploying] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLinkRevoked, setShareLinkRevoked] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('Editor');
  
  // Custom mock file contents mapping for different explorer files
  const mockFileContents: Record<string, string> = {
    'avatar.tsx': `import React from 'react';

export function Avatar({ src, alt, fallback }: { src?: string; alt?: string; fallback: string }) {
  return (
    <div className="relative inline-flex items-center justify-center w-10 h-10 overflow-hidden bg-stone-100 rounded-full border border-stone-200">
      {src ? (
        <img src={src} alt={alt || "User profile avatar"} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
      ) : (
        <span className="font-semibold text-stone-600 uppercase text-sm">{fallback}</span>
      )}
    </div>
  );
}`,
    'badge.tsx': `import React from 'react';

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warn' }) {
  const bg = variant === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
             variant === 'warn' ? 'bg-amber-50 text-amber-800 border-amber-200' :
             'bg-stone-100 text-stone-800 border-stone-200';
  return (
    <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full border \${bg}\`}>
      {children}
    </span>
  );
}`,
    'button.tsx': `import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const base = "px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm";
  const styles = variant === 'primary' ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100" :
                 variant === 'secondary' ? "bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-250" :
                 "hover:bg-stone-50 text-stone-600 shadow-none";
  return (
    <button className={\`\${base} \${styles} \${className}\`} aria-label={props['aria-label'] || "Interactive action trigger button"} {...props}>
      {children}
    </button>
  );
}`,
    'card.tsx': `import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={\`bg-white border border-stone-200/85 p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all duration-300 \${className}\`}>
      {children}
    </div>
  );
}`,
    'checkbox.tsx': `import React from 'react';

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none font-medium text-xs text-stone-750">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-stone-300 pointer-events-auto" />
      {label && <span>{label}</span>}
    </label>
  );
}`,
    'dialog.tsx': `import React from 'react';

export function Dialog({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-stone-950/45 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-stone-150 shadow-2xl relative">
        <h3 className="text-sm font-bold text-stone-900 border-b pb-2 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}`,
    'dropdown-menu.tsx': `import React from 'react';

export function DropdownMenu({ trigger, items }: { trigger: React.ReactNode; items: Array<{ label: string; onClick: () => void }> }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block text-left">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">{trigger}</div>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-stone-200 shadow-lg py-1.5 z-40">
          {items.map((item, idx) => (
            <button key={idx} onClick={() => { item.onClick(); setOpen(false); }} className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 font-semibold">
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}`,
    'input.tsx': `import React from 'react';

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={\`w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 outline-none focus:border-blue-500 transition-colors \${className}\`} 
      {...props} 
    />
  );
}`,
    'label.tsx': `import React from 'react';

export function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={\`block text-[10.5px] uppercase tracking-wider font-extrabold text-stone-400 font-mono mb-1.5 \${className}\`}>
      {children}
    </label>
  );
}`,
    'progress.tsx': `import React from 'react';

export function Progress({ value }: { value: number }) {
  return (
    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
      <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: \`\${value}%\` }}></div>
    </div>
  );
}`,
    'scroll-area.tsx': `import React from 'react';

export function ScrollArea({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={\`overflow-y-auto max-h-48 pr-2 custom-scrollbar \${className}\`}>
      {children}
    </div>
  );
}`,
    'select.tsx': `import React from 'react';

export function Select({ options, defaultValue }: { options: string[]; defaultValue: string }) {
  return (
    <select className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 pointer-events-auto">
      {options.map((opt, i) => <option key={i}>{opt}</option>)}
    </select>
  );
}`,
    'separator.tsx': `import React from 'react';

export function Separator() {
  return <div className="h-px bg-stone-200 my-4" />;
}`,
    'switch.tsx': `import React from 'react';

export function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button 
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={\`w-9 h-5 rounded-full p-0.5 transition-all outline-none border \${checked ? 'bg-blue-600 border-blue-700' : 'bg-stone-200 border-stone-300'}\`}
    >
      <div className={\`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all \${checked ? 'translate-x-4' : 'translate-x-0'}\`} />
    </button>
  );
}`,
    'table.tsx': `import React from 'react';

export function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-stone-150">
      <thead className="bg-stone-50 border-b border-stone-150 text-stone-500 font-bold">
        <tr>
          {headers.map((h, i) => <th key={i} className="p-3 font-semibold">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100 text-stone-700">
        {rows.map((row, i) => (
          <tr key={i} className="hover:bg-stone-50/50">
            {row.map((cell, j) => <td key={j} className="p-3 font-medium">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}`,
    'tabs.tsx': `import React from 'react';

export function Tabs({ tabs, activeTab, onChange }: { tabs: string[]; activeTab: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-stone-250">
      {tabs.map((tab) => (
        <button 
          key={tab} 
          onClick={() => onChange(tab)} 
          className={\`p-3.5 text-xs font-bold border-b-2 transition-all \${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-stone-500 hover:text-stone-700'}\`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}`,
    'textarea.tsx': `import React from 'react';

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea 
      className={\`w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-805 outline-none focus:border-blue-500 transition-colors \${className}\`} 
      {...props} 
    />
  );
}`,
    'tooltip.tsx': `import React from 'react';

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2.5 py-1.5 bg-stone-900 border border-stone-800 text-stone-105 text-[10px] rounded-lg shadow-md whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
  );
}`,
    'SearchPanel.tsx': `import React from 'react';

export default function SearchPanel() {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm w-full">
      <h3 className="text-xs font-bold text-stone-900">Search Workspace Components</h3>
      <input type="text" placeholder="Grep pattern..." className="w-full mt-2 p-2 bg-stone-50 border rounded-lg text-xs" />
    </div>
  );
}`
  };
  const [codeContent, setCodeContent] = useState<string>(`import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function EcommerceDashboard() {
  const data = [
    { name: 'Jan', revenue: 35000 },
    { name: 'Feb', revenue: 48000 },
    { name: 'Mar', revenue: 38000 },
    { name: 'Apr', revenue: 62000 },
    { name: 'May', revenue: 84000 },
    { name: 'Jun', revenue: 127840 }
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">E-Commerce Live Dashboard</h1>
        <p className="text-xs text-stone-500">Auto-generated via TALANTED Multi-Agent Pipeline</p>
      </div>
    </div>
  );
}`);

  const [projectList, setProjectList] = useState([
    { id: 'Ecommerce', title: 'Ecommerce Live Dashboard', tag: 'Meeting', status: 'Active Pipeline', version: 'v3.4.2', elements: '18 UI Widgets', wcagScore: '98/100', editedTime: 'Edited 1d ago', description: 'Interactive sales catalog, charts, and payment gates.', color: 'from-[#15395e] to-[#019cda]', agents: ["Requirements Agent", "Code Generator Synth", "WCAG compliance reviewer"] },
    { id: 'Landing Page', title: 'Landing Page & Hero Space', tag: 'Prompt', status: 'Ready for Push', version: 'v1.2.0', elements: '12 Sections', wcagScore: '97/100', editedTime: 'Edited 2h ago', description: 'Stunning marketing hero banner and responsive grid.', color: 'from-[#0b64a0] to-teal-500', agents: ["Prompt Agent", "Code Generator Synth"] },
    { id: 'ECOMMERCE_1', title: 'ECOMMERCE Core Billing', tag: 'Jira', status: 'Validated Draft', version: 'v1.0.3', elements: '6 Table Views', wcagScore: '100/100', editedTime: 'Edited 3d ago', description: 'Table views, customer invoices, and billing ledgers.', color: 'from-violet-600 to-indigo-600', agents: ["Requirements Scribe", "Reviewer"] },
    { id: 'ECOMMERCE_2', title: 'ECOMMERCE Cart Service', tag: 'Prompt', status: 'Active Pipeline', version: 'v2.1.0', elements: '8 Elements', wcagScore: '96/100', editedTime: 'Edited 4d ago', description: 'Dynamic items list, quantity counters, and vouchers.', color: 'from-amber-500 to-orange-600', agents: ["Requirements Agent", "Code Generator Synth"] },
    { id: 'E-commerce', title: 'E-commerce Catalog Grid', tag: 'Meeting', status: 'Active Pipeline', version: 'v1.5.0', elements: '12 Cards', wcagScore: '98/100', editedTime: 'Edited 5d ago', description: 'Responsive slider component with category tags.', color: 'from-[#15395e] to-sky-400', agents: ["Figma Extractor", "Code Synth"] },
    { id: 'Pricing', title: 'Pricing & Tiers Card', tag: 'Jira', status: 'Validated Draft', version: 'v2.0.4', elements: '14 Components', wcagScore: '99/100', editedTime: 'Edited 6d ago', description: 'Interactive multi-tenant billing tier comparator.', color: 'from-[#1c456f] to-stone-500', agents: ["Requirements Agent", "Code Generator Synth"] },
    { id: 'Contact', title: 'Contact Support & SLA Form', tag: 'Prompt', status: 'Ready for Push', version: 'v3.0.1', elements: '5 Inputs', wcagScore: '100/100', editedTime: 'Edited 1w ago', description: 'Semantic WCAG forms with client validation.', color: 'from-emerald-600 to-teal-500', agents: ["WCAG Auditor", "Requirements Agent"] },
    { id: 'Blog', title: 'Blog Marketing Core', tag: 'Prompt', status: 'Draft', version: 'v1.0.0', elements: '7 Layout Blocks', wcagScore: '98/100', editedTime: 'Edited 1w ago', description: 'SEO optimized article pages and comments section.', color: 'from-pink-500 to-rose-600', agents: ["Prompt Agent", "Reviewer"] },
    { id: 'Portfolio', title: 'Developer Premium Portfolio', tag: 'Prompt', status: 'Draft', version: 'v1.0.1', elements: '10 Widgets', wcagScore: '98/100', editedTime: 'Edited 2w ago', description: 'Micro-animations, typography pairings, and grids.', color: 'from-violet-600 to-[#019cda]', agents: ["Figma Scribe Agent", "WCAG compliance reviewer"] },
    { id: 'Figma Skeleton', title: 'Figma Skeleton Design', tag: 'Meeting', status: 'Active Pipeline', version: 'v3.3.0', elements: '22 Wireframes', wcagScore: '95/100', editedTime: 'Edited 2w ago', description: 'Wireframe layouts extracted from online design mockups.', color: 'from-stone-700 to-stone-900', agents: ["Figma Scribe Agent"] },
    { id: 'Fintech', title: 'Fintech Cashless Wallet Form', tag: 'Jira', status: 'Validated Draft', version: 'v1.1.0', elements: '9 UI Elements', wcagScore: '100/100', editedTime: 'Edited 3w ago', description: 'Wallet balances, recent transactions, and transfers.', color: 'from-[#1a446f] to-[#019cda]', agents: ["Figma Scribe Agent", "WCAG compliance reviewer", "Requirements Agent"] }
  ]);


  // --- FIGMA / MEETING / JIRA MODALS & DROPDOWN STATE ---
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [figmaFileUrl, setFigmaFileUrl] = useState('https://figma.com/file/a7b8c9d10e11/Pixso-Dashboard-Mockup');
  const [figmaPersonalToken, setFigmaPersonalToken] = useState('meryemboukraa199@gmail.com');
  const [meetingTranscriptText, setMeetingTranscriptText] = useState('Meeting transcribing with ElevenLabs. Needs: a beautiful sales chart, secure payment method buttons, and high-fidelity WCAG contrast indicators.');
  const [jiraBoardUrl, setJiraBoardUrl] = useState('PROJ-4522-ecommerce-checkout-redesign');
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('GB English');
  const [meetingRecordingText, setMeetingRecordingText] = useState('Ready to record meeting...');
  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [jiraTabSelection, setJiraTabSelection] = useState<'fetch' | 'generate'>('fetch');
  const [meetingTabSelection, setMeetingTabSelection] = useState<'record' | 'analysis'>('record');

  // --- LANDING PAGE THEME STATES & PRESETS ---
  // Default to a striking "talanted" brand palette matching #15395e and #019cda!
  const [activeTheme, setActiveTheme] = useState<'talanted' | 'indigo' | 'slate'>('talanted');
  const [activeFeatureTab, setActiveFeatureTab] = useState<'backlog' | 'session' | 'live-analytics' | 'notepad'>('backlog');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Newsletter Subscribe
  const [emailInput, setEmailInput] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Active cursor indicators (modeling team collaboration shown in the Pixso screenshot!)
  const [showCursors, setShowCursors] = useState(true);

  // --- DYNAMIC CLOCK ---
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- FOCUS WISDOM QUOTE TERMINAL ---
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // --- SANDBOX APPLICATION STATES (PERSISTED SECURELY IN LOCALSTORAGE) ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('ws_tasks_pixso');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
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

  // Inline editing state for tasks
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');

  const [stats, setStats] = useState<WorkspaceStats>(() => {
    const saved = localStorage.getItem('ws_stats_pixso');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return { completedToday: 4, focusMinutes: 90, streakDays: 6 };
  });

  const [timerPreset, setTimerPreset] = useState<'Focus' | 'Brainstorm' | 'Refuel'>('Focus');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [totalTimerDuration, setTotalTimerDuration] = useState<number>(25 * 60);

  const [notes, setNotes] = useState<string>(() => {
    const saved = localStorage.getItem('ws_notes_pixso');
    return saved || `### Interactive Sandbox Notes\n- Design mockup parameters matched perfectly\n- Local variables sync immediately\n- Instant file downloads as markdown files (.md)`;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [taskTagFilter, setTaskTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- PERSISTENCE DISKS EFFECTS ---
  useEffect(() => {
    localStorage.setItem('ws_tasks_pixso', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('ws_stats_pixso', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('ws_notes_pixso', notes);
  }, [notes]);

  // --- FOCUS TIMER CONTROL PIPELINE ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      const minutesAdded = Math.round(totalTimerDuration / 60);
      setStats(prev => ({
        ...prev,
        focusMinutes: prev.focusMinutes + minutesAdded
      }));
      showToast(`🔔 Great work! Focus session complete! Added ${minutesAdded} minutes to daily diagnostics.`);
      
      // Dynamic Synthesized Web Audio chime (safe client-side audio feedback)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Success melodic sequence: G4 -> C5
        const playTone = (freq: number, start: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.15, start);
          gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + duration);
        };
        
        const now = audioCtx.currentTime;
        playTone(392, now, 0.15); // G4
        playTone(523.25, now + 0.15, 0.3); // C5
      } catch (e) {
        console.log('Audio engine initialized on gesture');
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft, totalTimerDuration]);

  // Toast notifier helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const applyPreset = (preset: 'Focus' | 'Brainstorm' | 'Refuel') => {
    setIsTimerRunning(false);
    setTimerPreset(preset);
    let seconds = 25 * 60;
    if (preset === 'Brainstorm') seconds = 15 * 60;
    if (preset === 'Refuel') seconds = 5 * 60;
    setTimeLeft(seconds);
    setTotalTimerDuration(seconds);
  };

  // --- AUTH SUBMISSION CONTROLLER ---
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === 'signup') {
      if (!authFirstName.trim() || !authLastName.trim()) {
        showToast("⚠️ We need your first and last name to configure your space.");
        return;
      }
      if (!authEmail.trim() || !authEmail.includes('@')) {
        showToast("⚠️ Please enter a valid work email.");
        return;
      }
      if (!authUsername.trim()) {
        showToast("⚠️ Please select a username.");
        return;
      }
      if (!authPassword.trim() || authPassword.length < 6) {
        showToast("⚠️ Password must be at least 6 characters long.");
        return;
      }
      if (authPassword !== authConfirmPassword) {
        showToast("⚠️ Password confirmation mismatch.");
        return;
      }
      showToast(`🚀 Welcome onboard, ${authFirstName}! Setting up your secure workspace...`);
    } else if (authMode === 'signin') {
      if (!authEmail.trim()) {
        showToast("⚠️ Please enter your email.");
        return;
      }
      if (!authPassword.trim()) {
        showToast("⚠️ Please enter your password.");
        return;
      }
      showToast("🔑 Access granted successfully! Entering developer workspace...");
    }

    setIsLoggedIn(true);
    setPortalView('dashboard');
    setTimeout(() => {
      setCurrentScreen('app');
    }, 850);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      showToast("⚠️ Please specify a valid email to receive instructions.");
      return;
    }
    setAuthMode('resetsent');
    showToast(`✨ Restored! restoration code dispatched safely to ${resetEmail}.`);
  };

  // --- WORKSPACE CORE CRUD FUNCTIONS ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
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

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSubscribed(true);
    showToast(`🚀 Subscribed! Thank you for joining us.`);
  };

  // --- STATS HELPER FORMULA CALCULATION ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = timeLeft / totalTimerDuration;
  const strokeDashoffset = 282.74 * (1 - progress);
  const activeTasksCount = tasks.filter(t => t.category !== 'Accomplished').length;
  const completedPercent = tasks.length > 0 ? Math.round((tasks.filter(t => t.category === 'Accomplished').length / tasks.length) * 105) : 0;

  const filteredTasks = tasks.filter(t => {
    const matchesTag = taskTagFilter === 'All' || t.tag === taskTagFilter;
    const matchesSearch = t.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  // --- THEME STYLING CONFIGURATORS (TALANTED BRAND PREFERRED) ---
  const themes = {
    talanted: {
      accentText: 'text-[#019cda]',
      accentBg: 'bg-[#019cda]',
      accentBgLight: 'bg-[#019cda]/5',
      accentBgMedium: 'bg-[#019cda]/12',
      accentBorder: 'border-[#019cda]/20',
      accentBorderFocused: 'focus:ring-2 focus:ring-[#019cda] focus:border-transparent',
      gradientFrom: 'from-[#15395e] to-[#019cda]',
      gradientText: 'bg-gradient-to-r from-[#15395e] via-[#0c598c] to-[#019cda] bg-clip-text text-transparent',
      badgeStyle: 'bg-[#15395e]/5 border border-[#15395e]/15 text-[#15395e]',
      cardHover: 'hover:border-[#019cda]/30 hover:shadow-lg hover:shadow-[#019cda]/5',
      checkboxActive: 'bg-[#019cda] border-[#019cda] text-white',
      badgeDot: 'bg-[#019cda]',
      floatingCursorStyle: 'bg-[#019cda] text-white'
    },
    indigo: {
      accentText: 'text-indigo-600',
      accentBg: 'bg-indigo-600',
      accentBgLight: 'bg-indigo-50',
      accentBgMedium: 'bg-indigo-150',
      accentBorder: 'border-indigo-200',
      accentBorderFocused: 'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
      gradientFrom: 'from-indigo-500 to-blue-600',
      gradientText: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 bg-clip-text text-transparent',
      badgeStyle: 'bg-indigo-50 border border-indigo-100 text-indigo-700',
      cardHover: 'hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5',
      checkboxActive: 'bg-indigo-600 border-indigo-600 text-white',
      badgeDot: 'bg-indigo-500',
      floatingCursorStyle: 'bg-indigo-600 text-white'
    },
    slate: {
      accentText: 'text-zinc-800',
      accentBg: 'bg-zinc-800',
      accentBgLight: 'bg-zinc-100',
      accentBgMedium: 'bg-zinc-200',
      accentBorder: 'border-zinc-300',
      accentBorderFocused: 'focus:ring-2 focus:ring-zinc-800 focus:border-transparent',
      gradientFrom: 'from-zinc-700 to-zinc-900',
      gradientText: 'bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-950 bg-clip-text text-transparent',
      badgeStyle: 'bg-zinc-100 border border-zinc-200 text-zinc-800',
      cardHover: 'hover:border-zinc-400 hover:shadow-lg hover:shadow-zinc-500/5',
      checkboxActive: 'bg-zinc-800 border-zinc-800 text-white',
      badgeDot: 'bg-zinc-700',
      floatingCursorStyle: 'bg-zinc-800 text-white'
    }
  };

  const style = themes[activeTheme];

  const faqs = [
    {
      q: "How does the Multi-Agent pipeline UI generation work?",
      a: "The TALANTED platform orchestrates a pipeline of 11 specialized LLM agents (requirements analysis, Figma skeleton design, React/TypeScript generation, and WCAG accessibility audits) to produce optimal production-ready interface code."
    },
    {
      q: "What specification inputs are supported?",
      a: "You can submit a text prompt, a Figma JSON file or link, a Jira backlog ticket, a specifications PDF file, or even record oral meetings of your team for our agent to automatically extract functional requirements."
    },
    {
      q: "Is the generated code compliant with accessibility criteria?",
      a: "Absolutely. A critical auditing agent is dedicated to WCAG 2.1 Level AA analysis. It scans color contrast, ARIA attributes, and semantic structure, assigning a real-time accessibility score to guarantee legal compliance."
    },
    {
      q: "Are there rollback options and GitLab integration?",
      a: "Yes! Every generated version is saved with the possibility of an instant rollback. You can connect your GitLab repository to automatically push validated UI patches."
    }
  ];

  // --- RENDERING AUTH IF SCREEN IS AUTH ---
  if (currentScreen === 'auth') {
    return (
      <div className="min-h-screen w-full bg-[#ffffff] text-stone-800 font-sans flex flex-col lg:flex-row antialiased relative select-none">
        
        {/* Toast System inside Auth Gate */}
        {toastMessage && (
          <div id="toast-notify" className="fixed top-6 right-6 z-50 bg-[#15395e] border border-[#019cda]/20 text-sky-100 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all duration-300">
            <Sparkles className="w-4 h-4 text-[#019cda] animate-pulse" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* LEFT PANEL: AUTH SYSTEM CONTAINER */}
        <div className="w-full lg:w-[48%] min-h-screen bg-white px-6 py-6 md:px-12 md:py-8 flex flex-col justify-between relative z-20">
          
          {/* Comeback to landing page arrow */}
          <div>
            <button
              onClick={() => {
                setCurrentScreen('app');
                showToast("🏡 Returned to talanted Workspace");
              }}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to home</span>
            </button>
          </div>
                        {/* Header containing talanted Logo and upper Auth mode switch button */}
          <div className="flex items-center justify-between mt-4">
            {/* Custom organic twin-seed overlapping talanted logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg className="w-5 h-6 text-black" viewBox="0 0 24 32" fill="currentColor">
                  <path d="M4 12 C4 4, 12 4, 12 12 C12 20, 4 20, 4 12 Z M12 20 C12 12, 20 12, 20 20 C20 28, 12 28, 12 20 Z" fillRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-neutral-900 font-sans">talanted</span>
            </div>

            {/* Auth switcher */}
            <button
              onClick={() => {
                if (authMode === 'signin' || authMode === 'forgot' || authMode === 'resetsent') {
                  setAuthMode('signup');
                  showToast("Shifted to: Join Talanted Sign Up view!");
                } else {
                  setAuthMode('signin');
                  showToast("Shifted to: Welcome Back Log In view!");
                }
              }}
              style={{ padding: '0.45rem 1rem' }}
              className="text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-lg text-xs font-bold leading-none shadow-sm transition-colors cursor-pointer"
            >
              {authMode === 'signup' ? 'Log in' : 'Sign up'}
            </button>
          </div>

          {/* Core Center form layout */}
          <div className="max-w-md w-full mx-auto my-auto flex flex-col justify-center py-6 md:py-0">
            
            {authMode === 'signup' && (
              <>
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight leading-tight">
                  Join Talanted
                </h1>
                <p className="text-stone-500 text-xs md:text-sm leading-normal mt-1.5 mb-5 text-left">
                  Create your account and start generating UIs instantly.
                </p>

                {/* Registration Form fields strictly following screenshot */}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">First name</label>
                      <input
                        type="text"
                        required
                        placeholder="Meriem"
                        value={authFirstName}
                        onChange={(e) => setAuthFirstName(e.target.value)}
                        className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">Last name</label>
                      <input
                        type="text"
                        required
                        placeholder="Boukraa"
                        value={authLastName}
                        onChange={(e) => setAuthLastName(e.target.value)}
                        className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="your_username"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Confirm password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 bg-[#019cda] hover:bg-[#008fc9] active:scale-[0.99] transition-all text-white font-semibold text-xs md:text-sm py-3.5 rounded-xl shadow-lg shadow-sky-500/10 cursor-pointer"
                  >
                    Join Talanted
                  </button>
                </form>

                <div className="text-center mt-4">
                  <span className="text-xs text-stone-400">Already have an account? </span>
                  <button 
                    onClick={() => {
                      setAuthMode('signin');
                      showToast("🏡 Switched to Welcome Back portal!");
                    }}
                    className="text-xs text-[#019cda] font-bold hover:underline cursor-pointer"
                  >
                    Log In
                  </button>
                </div>
              </>
            )}

            {authMode === 'signin' && (
              <>
                <h1 className="text-2xl md:text-[28px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Welcome back
                </h1>
                
                <p className="text-stone-500 text-xs md:text-sm leading-normal mt-2 mb-6">
                  Access your design projects and team AI-pipelines inside your talanted workspace instantly.
                </p>

                {/* Google Authentication simulation */}
                <button
                  type="button"
                  onClick={() => {
                    showToast("✨ Logging in as Meriem Boukraa...");
                    setAuthFirstName("Meriem");
                    setAuthLastName("Boukraa");
                    setAuthEmail("you@example.com");
                    setAuthUsername("your_username");
                    setIsLoggedIn(true);
                    setPortalView('dashboard');
                    setTimeout(() => {
                      setCurrentScreen('app');
                      showToast("🔑 Google Account synced! Entering talanted Space...");
                    }, 800);
                  }}
                  className="w-full bg-white border border-stone-200 hover:bg-stone-50/80 active:scale-98 transition-all p-2.5 rounded-xl text-stone-700 text-xs font-bold flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.97 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99C6.16 7.42 8.87 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.57v2.96h3.91c2.28-2.1 3.54-5.19 3.54-8.68z" />
                    <path fill="#FBBC05" d="M5.24 14.55c-.24-.72-.37-1.49-.37-2.28s.13-1.56.37-2.28L1.39 7.01C.5 8.81 0 10.84 0 13s.5 4.19 1.39 5.99l3.85-2.99s-.01-.01-.01-.45z" />
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.91-2.96c-1.08.72-2.47 1.16-4.05 1.16-3.13 0-5.84-2.38-6.76-5.51l-3.85 2.99C3.37 20.33 7.35 23 12 23z" />
                  </svg>
                  Continue with Google
                </button>

                {/* Visual Divider block "or" */}
                <div className="flex items-center gap-3 my-5">
                  <div className="h-px bg-stone-150 flex-grow"></div>
                  <span className="text-[10px] font-bold text-stone-400 font-mono uppercase tracking-widest">or</span>
                  <div className="h-px bg-stone-150 flex-grow"></div>
                </div>

                {/* Sign In Email form */}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-750 mb-1">Email address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-bold text-stone-750">Password</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          showToast("🔑 Let's recover your password credentials!");
                        }}
                        className="text-[11.5px] text-[#019cda] font-semibold hover:underline cursor-pointer"
                      >
                        Reset password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#019cda] hover:bg-[#008fc9] active:scale-[0.99] transition-all text-white font-semibold text-xs md:text-sm py-3.5 rounded-xl shadow-lg shadow-sky-500/10 cursor-pointer"
                  >
                    Log In
                  </button>
                </form>

                <div className="text-center mt-5">
                  <span className="text-xs text-stone-400">First time using talanted? </span>
                  <button 
                    onClick={() => {
                      setAuthMode('signup');
                      showToast("✨ Join our workflow workspace!");
                    }}
                    className="text-xs text-[#019cda] font-bold hover:underline cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              </>
            )}

            {authMode === 'forgot' && (
              <>
                <h1 className="text-2xl md:text-[28px] font-bold text-neutral-900 tracking-tight leading-tight flex items-center gap-2">
                  <span>Reset Password</span>
                </h1>
                
                <p className="text-stone-500 text-xs md:text-sm leading-normal mt-2 mb-6 text-left">
                  Enter your email address below and we will send you an instant secure password restoration link to regain entry.
                </p>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-750 mb-1">Email address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full bg-white border border-stone-200 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda] outline-none rounded-xl p-3 text-stone-800 placeholder-stone-300 font-medium text-xs transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#15395e] hover:bg-[#204975] active:scale-[0.99] transition-all text-white font-semibold text-xs md:text-sm py-3.5 rounded-xl shadow-lg cursor-pointer"
                  >
                    Send reset instructions
                  </button>
                </form>

                <div className="text-center mt-6">
                  <button 
                    onClick={() => {
                      setAuthMode('signin');
                      showToast("🏡 Switched to Log In!");
                    }}
                    className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 font-bold hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to Log In
                  </button>
                </div>
              </>
            )}

            {authMode === 'resetsent' && (
              <div className="text-left space-y-4">
                <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-2xl">
                  ✉️
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 tracking-tight leading-tight">
                  Instructions Dispatched!
                </h1>
                <p className="text-stone-500 text-xs md:text-sm leading-relaxed">
                  We have dispatched a secure password restoration verification code and custom snapshot link to <strong className="text-stone-900">{resetEmail || 'your email'}</strong>. Please check your inbox and spam folder.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setAuthMode('signin');
                      showToast("🔒 Enter with your new password");
                    }}
                    className="w-full bg-[#019cda] hover:bg-[#008fc9] text-white text-xs font-semibold py-3 rounded-xl cursor-pointer text-center"
                  >
                    Back to Log In
                  </button>
                </div>
              </div>
            )}

            {/* Terms statement policy details */}
            {authMode !== 'resetsent' && (
              <p className="text-[11px] text-center text-stone-400 leading-normal mt-5 font-sans">
                By continuing, you agree to our{' '}
                <a href="#" className="underline font-medium text-stone-550 hover:text-stone-800 transition-colors">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="underline font-medium text-stone-550 hover:text-stone-800 transition-colors">Privacy Policy</a>.
              </p>
            )}

            {/* Guest sandbox shortcut */}
            <div className="mt-6 text-center border-t border-stone-100 pt-5">
              <button 
                type="button"
                onClick={() => {
                  setAuthFirstName("Meriem");
                  setAuthLastName("Boukraa");
                  setAuthEmail("roihizeineb123@gmail.com");
                  setAuthUsername("developer_space");
                  setIsLoggedIn(true);
                  setPortalView('dashboard');
                  setCurrentScreen('app');
                  showToast("⚡ Logged in to Developpeur's custom workspace successfully!");
                }}
                className="text-[11.5px] text-[#019cda] font-extrabold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Sign in automatically as test user &rarr;
              </button>
            </div>

          </div>

          {/* Minimal humble page footer with no system telemetry */}
          <div className="text-center text-[10px] text-stone-400 font-sans tracking-wide pt-4 lg:pt-0">
            talanted design workspace • All local client secure data
          </div>

        </div>

        {/* RIGHT PANEL: IMMERSIVE PRESENTATION COLLAGE (HIGH FIDELITY MOCKUP CARDS) */}
        <div className="hidden lg:flex lg:w-[52%] bg-[#fafafa] bg-grid-pattern relative border-l border-stone-200/50 overflow-hidden items-center justify-center p-12">
          
          {/* Fading aesthetic shadow overlays to frame the mockups */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-transparent to-transparent z-10 pointer-events-none"></div>

          {/* Actual perspective layout container */}
          <div className="relative w-full max-w-lg h-[640px]">
            
            {/* CARD A (Top-Left delivery payment summary mockup card) */}
            <div className="absolute left-[-20px] top-[40px] w-[270px] bg-white rounded-3xl p-5 border border-stone-200 shadow-2xl hover:scale-[1.03] hover:-rotate-1 transition-transform duration-300 z-20">
              <div className="space-y-3.5 mb-6 text-[13px] font-sans font-medium text-stone-500">
                <div className="flex justify-between">
                  <span>Delivery fee</span>
                  <span className="font-bold text-stone-800">$37.99</span>
                </div>
                <div className="flex justify-between">
                  <span>Fees & Taxes</span>
                  <span className="font-bold text-stone-800">$3.99</span>
                </div>
                <div className="flex justify-between text-emerald-500 font-semibold">
                  <span>Discount</span>
                  <span>-$2.45</span>
                </div>
                <div className="h-px bg-stone-100 my-1"></div>
                <div className="flex justify-between text-base font-bold text-stone-950 mt-2 font-sans">
                  <span className="tracking-tight">Subtotal</span>
                  <span className="tracking-tight">$34.97</span>
                </div>
              </div>
              {/* Bright emerald action button to exact screenshot copy */}
              <button 
                type="button"
                onClick={() => showToast("🛒 Order simulation checkout saved!")}
                className="w-full py-3 bg-[#00c853] hover:bg-emerald-600 active:scale-98 text-white font-bold text-[13px] tracking-wide rounded-2xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                Continue
              </button>
            </div>

            {/* CARD B (Bottom-Left mobile app prototype phone frame mockup card) */}
            <div className="absolute left-[0px] bottom-[20px] w-[280px] h-[390px] bg-white rounded-[36px] border border-stone-200/90 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)] p-4 overflow-hidden z-30 hover:scale-[1.03] hover:rotate-1 transition-transform duration-300">
              
              {/* Phone Head Notch layout */}
              <div className="flex justify-between items-center text-[10px] font-bold text-stone-900 font-sans px-2.5 mb-3.5 select-none">
                <span>9:41</span>
                {/* Simulated battery and signals */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]">📶</span>
                  <div className="w-4 h-2 bg-black rounded-sm relative flex items-center p-0.5">
                    <div className="bg-white h-full w-[80%] rounded-xs"></div>
                  </div>
                </div>
              </div>
              
              {/* GPS location selector widget */}
              <div className="flex items-center gap-1.5 mb-3 px-1 select-none">
                <span className="text-orange-500 text-sm">📍</span>
                <span className="text-[13px] font-extrabold text-stone-900 tracking-tight">Park Way 145</span>
              </div>
              
              {/* Rounded search mockup fields */}
              <div className="bg-stone-50 rounded-full border border-stone-150 flex items-center px-4 py-2 mb-4 text-xs text-stone-400 gap-2.5 select-none">
                <span className="text-[11px]">🔍</span>
                <span className="font-medium text-stone-400">Search</span>
              </div>
              
              {/* Category circles scroll slider */}
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none text-[10px] whitespace-nowrap mb-4 select-none">
                <span className="bg-orange-50 text-orange-700 font-bold px-3.5 py-2 rounded-full border border-orange-100 flex items-center gap-1 shrink-0">
                  <span>🍖</span> Dry food
                </span>
                <span className="bg-stone-50/50 text-stone-600 font-semibold px-3 py-2 rounded-full border border-stone-100 shrink-0">
                  🚑 Vet food
                </span>
                <span className="bg-stone-50/50 text-stone-600 font-semibold px-3 py-2 rounded-full border border-stone-100 shrink-0">
                  🥬 Fresh
                </span>
                <span className="bg-stone-50/50 text-stone-600 font-semibold px-3 py-2 rounded-full border border-stone-100 shrink-0">
                  🍪 Treats
                </span>
              </div>
              
              {/* App Feed Content */}
              <div className="px-1 text-stone-900">
                <h4 className="text-[14px] font-extrabold pb-2 select-none">Fastest</h4>
                
                {/* Veterinarian feed mockup visual item */}
                <div className="bg-stone-50/70 rounded-2xl p-3 border border-stone-100 flex items-center gap-3 shadow-xs">
                  <div className="w-11 h-11 rounded-xl bg-orange-100/80 flex items-center justify-center text-lg shadow-sm">
                    🐶
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="text-[11px] font-bold truncate text-stone-900">Zaza & Zainab Pack</div>
                    <p className="text-[9px] text-stone-450 text-stone-400 truncate mt-0.5">La Palma Vet Center</p>
                  </div>
                  <span className="shrink-0 bg-orange-600 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg">Go</span>
                </div>
              </div>
            </div>

            {/* CARD C (Right-Side analytics progress metric mockup card) */}
            <div className="absolute right-[0px] top-[70px] w-[270px] bg-white rounded-3xl p-5 border border-stone-200 shadow-2xl hover:scale-[1.03] hover:rotate-1 transition-transform duration-300 z-10">
              <div className="text-base font-extrabold text-stone-900 tracking-tight mb-1.5">Sustainable progress</div>
              
              <div className="inline-flex bg-neutral-100 border border-neutral-150/70 text-[9px] font-bold text-neutral-500 px-2 py-0.5 rounded-md mb-4 select-none">
                Location: La Palma
              </div>
              
              {/* Badge element 1: Localities */}
              <div className="flex items-center gap-3 mb-4 bg-stone-50/60 p-2.5 rounded-2xl border border-stone-100 select-none">
                <div className="w-9 h-9 rounded-xl bg-[#00c853] text-white font-extrabold flex items-center justify-center text-sm shadow-sm shadow-[#019cda]/10">
                  82
                </div>
                <div>
                  <div className="text-xs font-extrabold text-stone-900">Localities</div>
                  <p className="text-[9px] text-stone-400 font-medium">Total added localities</p>
                </div>
              </div>
              
              {/* High precision mini geometric line charts */}
              <div className="mb-4">
                <div className="h-10 w-full relative flex items-baseline select-none">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path 
                      d="M 5,25 Q 30,5 55,18 T 95,8 L 95,30 L 5,30 Z" 
                      fill="rgba(0, 200, 83, 0.04)" 
                    />
                    <path 
                      d="M 5,25 Q 30,5 55,18 T 95,8" 
                      fill="none" 
                      stroke="#00c853" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                    />
                    <circle cx="55" cy="18" r="3.5" fill="#00c853" stroke="white" strokeWidth="1" />
                    <circle cx="95" cy="8" r="3.5" fill="#00c853" stroke="white" strokeWidth="1" />
                  </svg>
                </div>
                <div className="flex justify-between text-[8px] font-bold text-stone-400 mt-1.5 px-1 font-mono uppercase tracking-wider select-none">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                </div>
              </div>
              
              <div className="text-[10px] text-stone-500 flex items-center gap-1 px-0.5 py-1 select-none">
                <span className="text-emerald-500 font-bold flex items-center gap-0.5">📈 Trending up by 5.2%</span> this month
              </div>

               {/* Badge element 2: Lifestyles */}
              <div className="flex items-center gap-3 bg-stone-50/60 p-2.5 rounded-2xl border border-stone-100 select-none">
                <div className="w-9 h-9 rounded-xl bg-[#00c853] text-white font-extrabold flex items-center justify-center text-sm shadow-sm shadow-[#019cda]/10">
                  98
                </div>
                <div>
                  <div className="text-xs font-extrabold text-stone-900">Lifestyles</div>
                  <p className="text-[9px] text-stone-450 font-medium font-sans">Total added localities</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // --- INTEGRATED HIGH-FIDELITY TALANTED DEVELOPER WORKSPACE (isLoggedIn check) ---
  if (isLoggedIn) {
    const activeProject = projectList.find(p => p.id === selectedProjectId) || projectList[0];

    return (
      <div id="talanted-portal-root" className="min-h-screen bg-stone-50 text-stone-800 font-sans flex antialiased relative selection:bg-sky-100 selection:text-sky-900 overflow-x-hidden">
        
        {/* Toast System inside User Space */}
        {toastMessage && (
          <div id="portal-toast" className="fixed top-6 right-6 z-50 bg-[#15395e] border border-[#019cda]/20 text-sky-100 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all duration-300">
            <Sparkles className="w-4 h-4 text-[#019cda] animate-pulse" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* SIDEBAR NAVIGATION COLUMN */}
        {portalView !== 'editor' && (
          <aside className="w-[215px] shrink-0 min-h-screen bg-[#102a46] border-r border-white/10 text-white p-4 flex flex-col justify-between select-none relative z-25 font-sans">
            
            <div className="space-y-4.5">
              
              {/* Space Header info */}
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold mb-1 px-1">Workspace</div>
                <div className="flex items-center gap-2 bg-[#15395e] border border-white/15 p-2 rounded-xl text-xs font-bold text-white shadow-xs">
                  <span className="w-6.5 h-6.5 rounded-lg bg-[#019cda] flex items-center justify-center text-[10.5px] font-extrabold uppercase shadow shrink-0 text-white">
                    P
                  </span>
                  <div className="truncate">
                    <div className="font-extrabold truncate text-[11px] text-white">Petsorel</div>
                    <span className="text-[8.5px] text-white/80 font-mono block leading-none font-semibold">Standard Workspace</span>
                  </div>
                </div>
              </div>

              {/* Menu Options tabbed - Home, All projects, Profile */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveSidebarTab('home');
                    setPortalView('dashboard');
                    setSelectedTagFilter('All');
                    showToast("🏠 Switched to Home space dashboard.");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                    activeSidebarTab === 'home' && portalView === 'dashboard'
                      ? 'bg-[#15395e] text-white font-extrabold shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <Home className="w-3.5 h-3.5 shrink-0" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebarTab('projects');
                    setPortalView('dashboard');
                    setSelectedTagFilter('All');
                    showToast("📂 Displaying All Projects Hub!");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                    activeSidebarTab === 'projects' && portalView === 'dashboard'
                      ? 'bg-[#15395e] text-white font-extrabold shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">All projects ({projectList.length})</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#0e2137] text-white rounded font-bold shrink-0">{projectList.length}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSidebarTab('profile');
                    showToast("👤 Developer profile parameters loaded.");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                    activeSidebarTab === 'profile'
                      ? 'bg-[#15395e] text-white font-extrabold shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>Profile</span>
                </button>
              </div>

              {/* RECENTS SECTION HEADER & LIST */}
              <div className="pt-1.5">
                <div className="text-[9px] uppercase tracking-wider text-white/50 font-mono font-bold mb-1.5 px-2.5">
                  RECENTS
                </div>
                <div className="space-y-0.5 animate-fade-in">
                  {projectList.slice(0, 8).map((item, idx) => {
                    const isCurrent = selectedProjectId === item.id;
                    const isActive = isCurrent && portalView === 'editor';
                    return (
                      <button
                        key={`${item.id}-${idx}`}
                        onClick={() => {
                          setSelectedProjectId(item.id);
                          setPortalView('editor');
                          showToast(`💻 Loaded project design container: ${item.title}`);
                        }}
                        className={`w-full text-left px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all truncate flex items-center justify-between ${
                          isActive
                            ? 'bg-[#15395e] text-white font-extrabold border-l-2 border-white pl-3'
                            : isCurrent
                            ? 'text-white bg-[#15395e]/60 font-medium'
                            : 'text-white/80 hover:bg-white/5 hover:text-white font-medium'
                        }`}
                      >
                        <span className="truncate">{item.title.replace(' & Hero Space', '').replace(' Live Dashboard', '').replace(' Form', '').replace(' Catalog Grid', '')}</span>
                        <span className={`w-1 h-1 rounded-full shrink-0 ${isCurrent ? 'bg-white' : 'bg-white/20'}`}></span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Connected User Profile block */}
            <div className="border-t border-white/10 pt-3 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7.5 h-7.5 rounded-full bg-[#15395e] text-white font-extrabold flex items-center justify-center text-xs shadow border border-white/10 uppercase shrink-0">
                  {authFirstName ? authFirstName[0] : 'M'}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold truncate text-white">
                    {authFirstName || 'Meriem'} {authLastName || 'Boukraa'}
                  </div>
                  <p className="text-[9px] text-white/70 truncate font-mono">
                    {authEmail || 'roihizeineb1235@gmail.com'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  showToast("🔒 Securely logged out from session.");
                }}
                className="w-full bg-[#15395e] hover:bg-[#1a4470] border border-white/10 p-1.5 rounded-lg text-[10px] text-white font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                Sign out session &rarr;
              </button>
            </div>

          </aside>
        )}

        {/* MAIN PANEL CONTENT SCROLL */}
        <main className="flex-grow min-h-screen flex flex-col overflow-y-auto">
          
          {/* Header Bar Area */}
          <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-mono">{activeProject.version}</span>
              </div>
              <h2 className="text-lg font-bold text-stone-900 mt-1 uppercase tracking-tight">
                {portalView === 'dashboard' ? 'Scoping Dashboard' : 'Multi-Agent Pipeline Generator'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-mono text-stone-400 uppercase">Selected Layout Target</div>
                <div className="text-xs font-bold text-stone-800">{activeProject.title}</div>
              </div>
              <span className="w-px h-8 bg-stone-200"></span>
              <button
                onClick={() => {
                  setPortalView(portalView === 'dashboard' ? 'editor' : 'dashboard');
                  showToast("🔄 Fast viewport toggled!");
                }}
                className="bg-[#15395e] hover:bg-[#1f4e7d] text-white text-xs font-bold px-4.5 py-2 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Navigate to {portalView === 'dashboard' ? 'Generateur' : 'Tableau de bord'}</span>
              </button>
            </div>
          </header>

          {/* VIEW RENDER: TABLEAU DE BORD (DASHBOARD) */}
          {portalView === 'dashboard' && (
            <div className="p-6 md:p-8 space-y-6 w-full">
              
              {/* If activeSidebarTab is 'home' - Render ChatGPT style launcher */}
              {activeSidebarTab === 'home' && (
                <div className="py-6 md:py-12 max-w-4xl mx-auto space-y-8 animate-fade-in">
                  
                  {/* Headline styled EXACTLY like Pic 3 */}
                  <div className="text-left space-y-3">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight font-sans flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[#2563eb] inline-flex items-center gap-0.5 select-none hover:underline cursor-pointer">
                        Generate designs
                        <ChevronDown className="w-5 h-5 text-[#2563eb]" />
                      </span>
                      <span className="text-stone-900">with Pixso AI, start creating!</span>
                    </h2>
                  </div>

                  {/* Chat input box card styled EXACTLY like Pic 3 */}
                  <div className="bg-white border border-stone-200 shadow-md rounded-2xl p-5.5 space-y-4 transition-all focus-within:ring-1 focus-within:ring-blue-500/30 focus-within:border-blue-500 hover:shadow-lg relative">
                    <div className="flex gap-3">
                      <textarea
                        placeholder="Generate desired designs with one click, e.g., blue finance homepage"
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const submitBtn = document.getElementById("submit-home-generator");
                            if (submitBtn) submitBtn.click();
                          }
                        }}
                        className="flex-grow bg-transparent outline-none text-sm text-stone-800 placeholder-stone-400 font-medium resize-none h-16 py-1 focus:ring-0 border-none px-0"
                      />
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3.5 border-t border-stone-100">
                      {/* Left: Examples and "What can AI do?" */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-stone-400 font-medium">
                        <span className="text-stone-450 font-normal">Example:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPromptInput("Workplace app dashboard with collaborative projects tracking, dark mode side panel and widgets list");
                            showToast("💡 Workplace app prompt loaded!");
                          }}
                          className="text-stone-605 text-stone-600 hover:text-[#2563eb] cursor-pointer hover:underline transition-all font-semibold"
                        >
                          Workplace app
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPromptInput("Corporate landing page with elegant hero text slider, clean SaaS product images and checkout tables");
                            showToast("💡 Landing page prompt loaded!");
                          }}
                          className="text-stone-605 text-stone-600 hover:text-[#2563eb] cursor-pointer hover:underline transition-all font-semibold"
                        >
                          Landing page
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPromptInput("Login page mockup with beautiful backdrop glassmorphism visual layout, OAuth icons and email validate form");
                            showToast("💡 Login page prompt loaded!");
                          }}
                          className="text-stone-605 text-stone-600 hover:text-[#2563eb] cursor-pointer hover:underline transition-all font-semibold"
                        >
                          Login page
                        </button>
                        
                        <span className="text-stone-200">|</span>
                        
                        <button
                          type="button"
                          onClick={() => showToast("💡 Pixso AI utilizes advanced multi-agent workflows to synthesize designs and check contrast colors instantly!")}
                          className="text-[#2563eb] hover:underline font-bold cursor-pointer transition-all"
                        >
                          What can AI do?
                        </button>
                      </div>

                      {/* Right: Tools & Submit circle/square up button */}
                      <div className="flex items-center gap-2 justify-end shrink-0">
                        {/* Smart design system button */}
                        <button
                          type="button"
                          onClick={() => showToast("🎨 Smart design system loaded with default components layout.")}
                          className="bg-white border border-stone-200 hover:border-stone-300 text-stone-750 text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:bg-stone-50 cursor-pointer font-bold shadow-xs text-stone-800"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                          <span>Smart design system</span>
                        </button>

                        {/* Image button */}
                        <button
                          type="button"
                          onClick={() => showToast("📸 Attach mockups feature ready!")}
                          className="bg-white border border-stone-200 hover:border-stone-300 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 transition-all cursor-pointer"
                          title="Attach designer frame reference"
                        >
                          <Image className="w-4 h-4" />
                        </button>

                        <button
                          id="submit-home-generator"
                          onClick={() => {
                            if (!promptInput.trim()) {
                              showToast("⚠️ Please describe your interface idea!");
                              return;
                            }
                            const newProjId = `Proj_${Date.now()}`;
                            const newProjTitle = promptInput.length > 30 ? `${promptInput.substring(0, 30)}...` : promptInput;
                            const newProj = {
                              id: newProjId,
                              title: newProjTitle,
                              tag: 'Prompt' as const,
                              status: 'Active Pipeline' as const,
                              version: 'v1.0.0',
                              elements: '6 UI Widgets',
                              wcagScore: '99/100',
                              editedTime: 'Created just now',
                              description: promptInput,
                              color: 'from-sky-500 to-indigo-600',
                              agents: ["Requirements Agent", "Code Generator Synth", "WCAG reviewer"]
                            };
                            setProjectList(prev => [newProj, ...prev]);
                            setSelectedProjectId(newProjId);
                            setPortalView('editor');
                            setPromptInput('');
                            showToast(`🚀 Multi-agents activated for "${newProjTitle}"! Generating...`);
                          }}
                          className="bg-[#2563eb] hover:bg-blue-700 text-white p-2 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer w-8 h-8 shrink-0"
                          title="Submit to Pixso AI"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pixso Action Cadres Grid Styled EXACTLY like Pic 4 */}
                  <div className="max-w-4xl mx-auto w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6.5 justify-center">
                      
                      {/* 3. Import from Figma Card */}
                      <button 
                        onClick={() => {
                          setIsFigmaModalOpen(true);
                        }}
                        className="bg-white border border-stone-200 hover:border-orange-400 p-6.5 rounded-2xl text-left transition-all hover:bg-stone-50/70 hover:shadow-md flex flex-col justify-between h-[168px] group shadow-xs cursor-pointer transform hover:-translate-y-1 duration-200"
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
                            <svg className="w-6.5 h-6.5 shrink-0" viewBox="0 0 36 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 13.5C9 8.52944 13.0294 4.5 18 4.5C22.9706 4.5 27 8.52944 27 13.5V22.5H18C13.0294 22.5 9 18.4706 9 13.5Z" fill="#F24E1E"/>
                              <path d="M9 31.5C9 26.5294 13.0294 22.5 18 22.5H27V31.5C27 36.4706 22.9706 40.5 18 40.5C13.0294 40.5 9 36.4706 9 31.5Z" fill="#A259FF"/>
                              <path d="M18 49.5C13.0294 49.5 9 45.4706 9 40.5V31.5H18C22.9706 31.5 27 35.5294 27 40.5C27 45.4706 22.9706 49.5 18 49.5Z" fill="#1ABCFE"/>
                              <path d="M18 40.5V49.5C22.9706 49.5 27 45.4706 27 40.5C27 35.5294 22.9706 31.5 18 31.5V40.5Z" fill="#0ACF83"/>
                              <path d="M9 13.5V22.5H18V13.5C18 8.52944 13.0294 4.5 9 4.5C4.02944 4.5 0 8.52944 0 13.5C0 18.4706 4.02944 22.5 9 22.5" fill="#F24E1E"/>
                            </svg>
                          </span>
                          <span className="text-stone-400 font-extrabold group-hover:text-orange-500 text-lg transition-colors pr-1">+</span>
                        </div>
                        <div>
                          <div className="text-sm md:text-base font-extrabold text-stone-950 group-hover:text-orange-600 transition-colors">Import from Figma</div>
                          <p className="text-xs text-stone-400 mt-1 leading-normal font-medium">Compile Figma vectors</p>
                        </div>
                      </button>
 
                      {/* 4. Import from Meeting Card */}
                      <button 
                        onClick={() => {
                          setIsMeetingModalOpen(true);
                        }}
                        className="bg-white border border-stone-200 hover:border-violet-400 p-6.5 rounded-2xl text-left transition-all hover:bg-stone-50/70 hover:shadow-md flex flex-col justify-between h-[168px] group shadow-xs cursor-pointer transform hover:-translate-y-1 duration-200"
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
                            <Volume2 className="w-5.5 h-5.5 text-violet-600" />
                          </span>
                          <span className="text-stone-400 font-extrabold group-hover:text-violet-500 text-lg transition-colors pr-1">+</span>
                        </div>
                        <div>
                          <div className="text-sm md:text-base font-extrabold text-stone-950 group-hover:text-violet-600 transition-colors">Import from Meeting</div>
                          <p className="text-xs text-stone-400 mt-1 leading-normal font-medium">Speech requirements scribe</p>
                        </div>
                      </button>
 
                      {/* 5. Import from Jira Card */}
                      <button 
                        onClick={() => {
                          setIsJiraModalOpen(true);
                        }}
                        className="bg-white border border-stone-200 hover:border-blue-400 p-6.5 rounded-2xl text-left transition-all hover:bg-stone-50/70 hover:shadow-md flex flex-col justify-between h-[168px] group shadow-xs cursor-pointer transform hover:-translate-y-1 duration-200"
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
                            <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M260.6 224.6c0-60.6 49.1-109.7 109.7-109.7H512L370.3 256.6c-60.6 0-109.7-49.1-109.7-109.7z" fill="#0052CC"/>
                              <path d="M0 224.6C0 164 49.1 114.9 109.7 114.9H251.7L110 256.6C49.4 256.6 0 207.5 0 224.6z" fill="#2684FF"/>
                            </svg>
                          </span>
                          <span className="text-stone-400 font-extrabold group-hover:text-blue-500 text-lg transition-colors pr-1">+</span>
                        </div>
                        <div>
                          <div className="text-sm md:text-base font-extrabold text-stone-950 group-hover:text-blue-600 transition-colors">Import from Jira</div>
                          <p className="text-xs text-stone-400 mt-1 leading-normal font-medium">Translate Jira issues</p>
                        </div>
                      </button>
 
                    </div>
                  </div>

                </div>
              )}

              {/* If activeSidebarTab is 'projects' - Render beautiful Grid Hub & Active framing logic */}
              {activeSidebarTab === 'projects' && (
                <div className="space-y-8 animate-fade-in" id="projects-hub-section">
                  
                  {/* Grid of Projects */}
                  <div className="space-y-6">
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
                      <div>
                        <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                          <Folder className="w-5 h-5 text-[#15395e]" />
                          My Projects Grid Hub
                        </h3>
                        <p className="text-xs text-stone-500 font-medium">
                          Showing {projectList.filter(p => selectedTagFilter === 'All' || p.tag === selectedTagFilter).filter(p => p.title.toLowerCase().includes(projectSearchQuery.toLowerCase())).length} of {projectList.length} generated pipelines
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search projects by title..."
                            value={projectSearchQuery}
                            onChange={(e) => setProjectSearchQuery(e.target.value)}
                            className="pl-8.5 pr-8 py-1.5 bg-white border border-stone-200 rounded-xl text-stone-750 text-xs outline-none focus:border-[#019cda] font-medium w-full sm:w-56"
                          />
                          {projectSearchQuery && (
                            <button onClick={() => setProjectSearchQuery('')} className="absolute right-2.5 top-2.5 text-stone-450 hover:text-stone-750">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Sort option */}
                        <select className="bg-white border border-stone-200 rounded-xl text-xs px-3 py-1.5 outline-none font-semibold text-stone-700 cursor-pointer">
                          <option>Date edited</option>
                          <option>Highest Fidelity</option>
                          <option>Alphabetical</option>
                        </select>
                      </div>
                    </div>

                    {/* Filter Chips row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['All', 'Prompt', 'Meeting', 'Jira'] as const).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSelectedTagFilter(tag);
                            showToast(`📂 Filtered by category: ${tag}`);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            selectedTagFilter === tag
                              ? 'bg-[#15395e] text-white font-bold'
                              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {tag === 'All' ? 'All Categories' : 
                           tag === 'Prompt' ? 'Prompt Generated' :
                           tag === 'Meeting' ? 'Meeting Audio' : 'Jira Backlog'}
                        </button>
                      ))}
                    </div>

                    {/* Projects Grid content */}
                    {projectList.filter(p => selectedTagFilter === 'All' || p.tag === selectedTagFilter).filter(p => p.title.toLowerCase().includes(projectSearchQuery.toLowerCase())).length === 0 ? (
                      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 space-y-2">
                        <Folder className="w-8 h-8 mx-auto stroke-1 text-[#2563eb]" />
                        <p className="text-xs font-semibold">No projects match your current filters or search terms.</p>
                        <button onClick={() => { setProjectSearchQuery(''); setSelectedTagFilter('All'); }} className="text-xs text-[#2563eb] font-bold hover:underline cursor-pointer">
                          Go back to all projects
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-5">
                        {projectList
                          .filter(p => selectedTagFilter === 'All' || p.tag === selectedTagFilter)
                          .filter(p => p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                          .map((p) => {
                            const isSelected = selectedProjectId === p.id;
                            return (
                              <div
                                key={p.id}
                                className={`bg-white border rounded-2xl p-4.5 transition-all duration-300 relative group flex flex-col justify-between space-y-4 ${
                                  isSelected 
                                    ? 'border-blue-500 ring-4 ring-blue-50 shadow-md' 
                                    : 'border-stone-200 hover:border-blue-500/50 shadow-sm'
                                }`}
                              >
                                <div>
                                  {/* Upper Meta row instead of heavy colorful gradient */}
                                  <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] uppercase font-bold text-stone-400 font-mono tracking-wider">Project</span>
                                    </div>
                                    <span className="text-[10px] bg-stone-100 text-stone-600 font-bold px-2 py-0.5 rounded-md font-mono">
                                      {p.version}
                                    </span>
                                  </div>

                                  {/* Card Content parameters */}
                                  <div className="space-y-1">
                                    <h4 className="font-bold text-stone-900 text-xs tracking-tight line-clamp-1 group-hover:text-[#2563eb] transition-colors">{p.title}</h4>
                                    <p className="text-[11px] text-stone-500 leading-normal line-clamp-2 h-8 font-medium">{p.description}</p>
                                  </div>
                                </div>

                                {/* Action Buttons Footer block */}
                                <div className="pt-3 flex items-center justify-between border-t border-stone-100">
                                  <span className="text-[10px] text-stone-400 font-mono font-medium">{p.editedTime}</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedProjectId(p.id);
                                        showToast(`🎯 Selected Project : "${p.title}"`);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                        isSelected 
                                          ? 'bg-stone-900 text-white shadow-xs hover:bg-stone-850' 
                                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                                      }`}
                                    >
                                      Select
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedProjectId(p.id);
                                        setPortalView('editor');
                                        showToast(`💻 Opened "${p.title}" in Code Generator Editor Space.`);
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#2563eb] hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                                    >
                                      IDE
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (projectList.length <= 1) {
                                          showToast("⚠️ Can't delete the last remaining project pipeline.");
                                          return;
                                        }
                                        setProjectList(prev => prev.filter(proj => proj.id !== p.id));
                                        showToast(`🗑️ Project "${p.title}" removed successfully.`);
                                      }}
                                      title="Delete project"
                                      className="p-1 px-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-red-650 hover:bg-red-50 hover:border-red-150 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* If activeSidebarTab is 'profile' - Render profile spaces */}
              {activeSidebarTab === 'profile' && (
                <div className="max-w-2xl bg-white rounded-2xl border border-stone-200 p-6 space-y-6 animate-fade-in mx-auto">
                  
                  <div className="flex items-center gap-4 border-b border-stone-100 pb-5">
                    <span className="w-12 h-12 rounded-full bg-[#15395e] text-white flex items-center justify-center text-lg font-bold">
                      P
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-stone-900">Petsorel Developer Profile</h3>
                      <p className="text-xs text-stone-400 font-medium">Manage your active pipeline integration setups</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-100">
                      <div>
                        <span className="block text-stone-400 text-[10px] uppercase font-bold">Email address</span>
                        <span className="font-semibold text-stone-850">roihizeineb123@gmail.com</span>
                      </div>
                      <div>
                        <span className="block text-stone-400 text-[10px] uppercase font-bold">Assigned Space</span>
                        <span className="font-semibold text-stone-850">Petsorel (Active Dev Space)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-stone-400 text-[10px] uppercase font-bold">License Key status</span>
                        <span className="text-[#019cda] font-extrabold">Lifetime Enterprise</span>
                      </div>
                      <div>
                        <span className="block text-stone-400 text-[10px] uppercase font-bold">GitLab Sync Connection</span>
                        <span className="text-emerald-600 font-extrabold">Connected 🟢</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* VIEW RENDER: GENERATEUR MULTI-AGENTS IDE */}
          {portalView === 'editor' && (
            <div className="flex-grow h-screen overflow-hidden flex flex-col items-stretch bg-stone-50">
              
              {/* TOP BAR: PORTAL IDE CONTROL PANELS METRICS (Strictly aligned with Pic 4) */}
              <div className="bg-white border-b border-stone-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-stone-850 shadow-sm shrink-0">
                
                {/* Back and File Path row */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setPortalView('dashboard');
                      showToast("🏠 Return to dashboard!");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 bg-stone-50 hover:bg-stone-100 hover:text-stone-900 transition-all text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Home</span>
                  </button>
                  <div className="h-4 w-px bg-stone-250 shrink-0"></div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium font-sans">
                    <span className="font-semibold text-stone-400 font-sans">AIEditor</span>
                    <span className="text-stone-300">/</span>
                    <span className="font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-150 font-sans">
                      {activeProject?.title}
                    </span>
                    <span className="text-stone-300">/</span>
                    <span className="font-mono text-stone-500 font-bold">
                       src/components/ui/{selectedExplorerFile}
                    </span>
                  </div>
                </div>

                {/* Middle Action Tabs (Strictly Pic 4 Centered Buttons - Lit Up with status lights!) */}
                <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`px-4 py-1.5 text-[11px] font-extrabold tracking-wide uppercase transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-lg ${
                      editorTab === 'preview'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${editorTab === 'preview' ? 'bg-blue-400' : 'bg-stone-350'}`}></span>
                    <span>PREVIEW</span>
                  </button>
                  <button
                    onClick={() => setEditorTab('code')}
                    className={`px-4 py-1.5 text-[11px] font-extrabold tracking-wide uppercase transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-lg ${
                      editorTab === 'code'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${editorTab === 'code' ? 'bg-amber-400' : 'bg-stone-350'}`}></span>
                    <span>CODE</span>
                  </button>
                  <button
                    onClick={() => setEditorTab('quality')}
                    className={`px-4 py-1.5 text-[11px] font-extrabold tracking-wide uppercase transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-lg ${
                      editorTab === 'quality'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${editorTab === 'quality' ? 'bg-emerald-450 bg-emerald-400' : 'bg-stone-350'}`}></span>
                    <span>QUALITY</span>
                  </button>
                  <button
                    onClick={() => setEditorTab('accessibility')}
                    className={`px-4 py-1.5 text-[11px] font-extrabold tracking-wide uppercase transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-lg ${
                      editorTab === 'accessibility'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${editorTab === 'accessibility' ? 'bg-purple-400 animate-pulse' : 'bg-stone-350'}`}></span>
                    <span>ACCESSIBILITY</span>
                  </button>
                </div>

                {/* Right controls row (Inspired by Pic 4) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  
                  {/* Zoom controls section */}
                  <div className="flex items-center overflow-hidden border border-stone-250 bg-stone-50 rounded-xl px-2 py-1 text-xs shrink-0 select-none mr-1 font-sans">
                    <button 
                      onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                      className="text-stone-500 hover:text-stone-900 font-bold px-1.5 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-stone-750 text-[10.5px] px-1 text-center w-10">
                      {zoomLevel}%
                    </span>
                    <button 
                      onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
                      className="text-stone-500 hover:text-stone-900 font-bold px-1.5 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Manual sidebar slide in/out triggers */}
                  <div className="flex items-center gap-1.5 border-r border-stone-200 pr-3 mr-1 shrink-0 select-none">
                    <button
                      onClick={() => {
                        const nextVal = !isLeftSidebarOpen;
                        setIsLeftSidebarOpen(nextVal);
                        showToast(nextVal ? "📂 Explorer Sidebar Opened (Local FS In)" : "📂 Explorer Sidebar Collapsed (Local FS Out)");
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-extrabold text-[10.5px] cursor-pointer transition-all shrink-0 select-none ${
                        isLeftSidebarOpen 
                          ? 'bg-[#15395e]/10 text-[#15395e] border-[#15395e]/20 hover:bg-[#15395e]/20' 
                          : 'border-stone-250 text-stone-500 bg-stone-50 hover:bg-stone-100'
                      }`}
                      title={isLeftSidebarOpen ? "Slide Out Local Files Explorer" : "Slide In Local Files Explorer"}
                    >
                      <Folder className={`w-3 h-3 ${isLeftSidebarOpen ? 'text-[#15395e]' : 'text-stone-400'}`} />
                      <span>{isLeftSidebarOpen ? "Files In" : "Files Out"}</span>
                    </button>

                    <button
                      onClick={() => {
                        const nextVal = !isRightSidebarOpen;
                        setIsRightSidebarOpen(nextVal);
                        showToast(nextVal ? "💬 Agents & Versions Sidebar Opened (Chat In)" : "💬 Agents & Versions Sidebar Collapsed (Chat Out)");
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-extrabold text-[10.5px] cursor-pointer transition-all shrink-0 select-none ${
                        isRightSidebarOpen 
                          ? 'bg-[#15395e]/10 text-[#15395e] border-[#15395e]/20 hover:bg-[#15395e]/20' 
                          : 'border-stone-250 text-stone-500 bg-stone-50 hover:bg-stone-100'
                      }`}
                      title={isRightSidebarOpen ? "Slide Out Chat/Versions list" : "Slide In Chat/Versions list"}
                    >
                      <Layers className={`w-3 h-3 ${isRightSidebarOpen ? 'text-[#15395e]' : 'text-stone-400'}`} />
                      <span>{isRightSidebarOpen ? "Chat In" : "Chat Out"}</span>
                    </button>
                  </div>

                  {/* Actions Row */}
                  <button 
                    onClick={() => {
                      const newMode = !isInspectMode;
                      setIsInspectMode(newMode);
                      if (newMode) {
                        showToast("🎯 Advanced Inspect tool turned ON! Hover & click on elements to style live.");
                      } else {
                        setHoveredElementId(null);
                        setSelectedElementId(null);
                        setIsStyleOverlayOpen(false);
                        showToast("Element Inspect tool turned OFF.");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-extrabold text-[11px] tracking-tight cursor-pointer transition-all shrink-0 ${
                      isInspectMode 
                        ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-xs' 
                        : 'border-stone-250 text-stone-700 bg-white hover:bg-stone-50'
                    }`}
                    title="Toggle Inspect Tool (Pic 1 Style)"
                  >
                    <MousePointer className={`w-3 h-3 ${isInspectMode ? 'text-purple-600' : 'text-stone-550'}`} />
                    <span>{isInspectMode ? "Inspecting" : "Inspect"}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsTedPopupOpen(true);
                      setIsRightSidebarOpen(false); // Hide the default sidebar
                      showToast("🛠️ TED Active Code Co-Pilot and Debugger pop-up chat activated!");
                      
                      // Push live status analysis from TED
                      setTedChatMessages(prev => {
                        const hasPrompt = prev.some(m => m.text.includes("automated scan status"));
                        if (hasPrompt) return prev;
                        return [
                          ...prev,
                          {
                            sender: 'assistant',
                            text: `🕵️‍♂️ **TED Automated Scan Diagnostic:** I have evaluated \`${selectedProjectId}\` components. One potential spacing variance was highlighted in the customers list container. You can write custom request edits below or click a quick debug action.`,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            status: 'info'
                          }
                        ];
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 font-extrabold text-[11px] tracking-tight cursor-pointer transition-all shrink-0 ${
                      isTedPopupOpen 
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'border-stone-250 text-stone-700 bg-white hover:bg-stone-50'
                    }`}
                    title="Run TED Automated fixes"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isTedPopupOpen ? 'text-white' : 'text-blue-500'} animate-pulse`} />
                    <span>TED Fixes</span>
                  </button>

                  <button 
                    onClick={() => showToast("🗄️ Bundling file package to ZIP archive...")}
                    className="px-3 py-1.5 rounded-lg border border-stone-250 text-stone-700 bg-white hover:bg-stone-50 font-extrabold text-[11px] cursor-pointer transition-all shrink-0"
                  >
                    Zip
                  </button>

                  <button 
                    onClick={() => setIsGitlabModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-stone-250 text-stone-700 bg-white hover:bg-stone-50 font-extrabold text-[11px] cursor-pointer transition-all shrink-0"
                  >
                    GitLab
                  </button>

                  <button 
                    onClick={() => setIsNetlifyModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-stone-250 text-stone-700 bg-white hover:bg-stone-50 font-extrabold text-[11px] cursor-pointer transition-all shrink-0"
                  >
                    Deploy
                  </button>

                  <button 
                    onClick={() => setIsMeetingModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-stone-250 text-stone-700 bg-white hover:bg-stone-50 font-extrabold text-[11px] cursor-pointer transition-all shrink-0"
                  >
                    Meeting
                  </button>

                  {/* Share button styled dynamically like figma blue button from Pic 1 */}
                  <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-705 text-white font-extrabold text-[11px] cursor-pointer transition-all shrink-0 shadow-sm"
                  >
                    Share
                  </button>

                </div>

              </div>

              {/* THREE COLUMN GRID LAYOUT BODY */}
              <div className="flex-grow h-0 min-h-0 grid grid-cols-1 lg:grid-cols-12 items-stretch overflow-hidden">
                
                {/* 1. LEFT COLUMN: DISK DIRECTORY TREE EXPLORER (Pic 4 Authentic Panel) */}
                {isLeftSidebarOpen && (
                  <div className="lg:col-span-3 bg-white border-r border-stone-200 flex flex-col justify-start p-4 space-y-4 overflow-hidden h-full z-15">
                  
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-stone-400 font-mono">
                      IDE Explorer
                    </span>
                    <span className="bg-[#15395e] text-white text-[9px] font-mono px-2 py-0.5 rounded-md font-bold">
                      Local FS
                    </span>
                  </div>

                  {/* Filter local files path */}
                  <div className="relative">
                    <input
                      type="text"
                      id="ide-file-filter"
                      placeholder="Filter files (e.g., button)..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8.5 pr-3 py-2 text-xs font-semibold text-stone-750 outline-none focus:border-[#019cda] transition-colors font-sans"
                      onChange={(e) => {
                        // Dynamic search triggers automatically update
                      }}
                    />
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  </div>

                  {/* The Directory Listing Tree */}
                  <div className="font-mono text-xs text-stone-700 space-y-1.5 select-none overflow-y-auto flex-grow h-0 min-h-0 custom-scrollbar">
                    
                    {/* Root 'src' directory */}
                    <div>
                      <div 
                        onClick={() => setExpandedFolders(prev => ({ ...prev, src: !prev.src }))}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 cursor-pointer font-bold text-stone-880 text-[12px]"
                      >
                        {expandedFolders.src ? <FolderOpen className="w-3.5 h-3.5 text-stone-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-stone-400 shrink-0" />}
                        <span className="text-stone-900">src</span>
                      </div>

                      {expandedFolders.src && (
                        <div className="pl-4 border-l border-dashed border-stone-200 ml-3.5 mt-1 space-y-1.5 font-sans">
                          
                          {/* Subfolder 'components' */}
                          <div>
                            <div 
                              onClick={() => setExpandedFolders(prev => ({ ...prev, components: !prev.components }))}
                              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-stone-50 cursor-pointer font-bold text-xs"
                            >
                              {expandedFolders.components ? <FolderOpen className="w-3.5 h-3.5 text-stone-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-stone-400 shrink-0" />}
                              <span className="text-stone-800">components</span>
                            </div>

                            {expandedFolders.components && (
                              <div className="pl-4 border-l border-dashed border-stone-200 ml-3.5 mt-1 space-y-1.5 font-sans">
                                
                                {/* Sub-subfolder 'ui' */}
                                <div>
                                  <div 
                                    onClick={() => setExpandedFolders(prev => ({ ...prev, ui: !prev.ui }))}
                                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-stone-50 cursor-pointer font-bold text-xs"
                                  >
                                    {expandedFolders.ui ? <FolderOpen className="w-3.5 h-3.5 text-stone-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-stone-400 shrink-0" />}
                                    <span className="text-stone-700">ui</span>
                                  </div>

                                  {expandedFolders.ui && (
                                    <div className="pl-4 border-l border-dashed border-stone-200 ml-3.5 mt-1 space-y-1 font-sans">
                                      {Object.keys(mockFileContents)
                                        .filter(f => f !== 'SearchPanel.tsx')
                                        .map((fileName) => {
                                          const isActiveFile = selectedExplorerFile === fileName;
                                          return (
                                            <div
                                              key={fileName}
                                              onClick={() => {
                                                setSelectedExplorerFile(fileName);
                                                setEditorTab('code'); // instantly switch code view context
                                                showToast(`📝 Code loaded: ${fileName}`);
                                              }}
                                              className={`flex items-center justify-between gap-2 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] font-medium ${
                                                isActiveFile 
                                                  ? 'bg-[#15395e] text-white font-bold shadow-xs' 
                                                  : 'hover:bg-stone-105 hover:bg-stone-50 text-stone-600 hover:text-stone-900'
                                              }`}
                                            >
                                              <span className="flex items-center gap-1.5">
                                                <FileText className={`w-3.5 h-3.5 shrink-0 ${isActiveFile ? 'text-white' : 'text-stone-400'}`} />
                                                <span>{fileName}</span>
                                              </span>
                                              <span className="text-[8px] font-mono opacity-60 uppercase font-bold tracking-wider">tsx</span>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>

                              </div>
                            )}
                          </div>

                          {/* SearchPanel file directly in src folder */}
                          <div
                            onClick={() => {
                              setSelectedExplorerFile('SearchPanel.tsx');
                              setEditorTab('code');
                              showToast("📝 Loading SearchPanel.tsx code source");
                            }}
                            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                              selectedExplorerFile === 'SearchPanel.tsx'
                                ? 'bg-[#15395e] text-white font-extrabold shadow-xs'
                                : 'hover:bg-stone-50 text-stone-800 text-xs'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <FileText className={`w-3.5 h-3.5 shrink-0 ${selectedExplorerFile === 'SearchPanel.tsx' ? 'text-white' : 'text-stone-400'}`} />
                              <span>SearchPanel.tsx</span>
                            </span>
                            <span className="text-[8px] font-mono opacity-60 uppercase font-bold tracking-wider">tsx</span>
                          </div>

                        </div>
                      )}
                    </div>

                  </div>

                </div>
                )}

                {/* 2. CENTER COLUMN: THE MAIN INTERACTIVE WORKSPACE CANVAS (Pic 4 Compliance Score panel) */}
                <div className={`bg-[#fafafa] border-r border-stone-200 flex flex-col justify-between overflow-hidden h-full transition-all duration-300 ${
                  isLeftSidebarOpen && isRightSidebarOpen 
                    ? 'lg:col-span-6' 
                    : (isLeftSidebarOpen || isRightSidebarOpen) 
                    ? 'lg:col-span-9' 
                    : 'lg:col-span-12'
                }`}>
                  
                  {/* Outer Frame with scaled wrapper of current zoomLevel value */}
                  <div className="flex-grow p-6 flex flex-col items-center justify-start overflow-y-auto h-0 min-h-0 custom-scrollbar">
                    
                    <div 
                      className="w-full transition-transform duration-300 origin-top"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    >

                      {/* --- TABS RENDERING: PREVIEW VIEW --- */}
                      {editorTab === 'preview' && (() => {
                        // Isolated helper for Element Inspection and dynamic Style mapping (Pics 1 & 2 Style)
                        const renderInteractiveElement = (id: string, label: string, defaultClassName: string, children: React.ReactNode) => {
                          const isSelected = selectedElementId === id;
                          const isHovered = hoveredElementId === id;
                          const style = elementStyles[id] || {
                            textColor: '#020817',
                            bgColor: '#fafaf9',
                            size: '12px' as const,
                            weight: 'Regular' as const,
                            font: 'Inter' as const,
                            align: 'left' as const,
                            radius: '12px' as const
                          };

                          // Convert logical weights to numbers
                          const weightMap = {
                            'Light': 300,
                            'Regular': 400,
                            'Medium': 500,
                            'Bold': 700,
                            'Extrabold': 800
                          };
                          const fontWeight = weightMap[style.weight] || 400;

                          // Convert families
                          const fontMap = {
                            'Inter': '"Inter", sans-serif',
                            'JetBrains Mono': '"JetBrains Mono", monospace',
                            'Space Grotesk': '"Space Grotesk", sans-serif',
                            'Playfair Display': '"Playfair Display", serif'
                          };
                          const fontFamily = fontMap[style.font] || '"Inter", sans-serif';

                          return (
                            <div
                              id={`inspect-target-${id}`}
                              onClick={(e) => {
                                if (!isInspectMode) return;
                                e.stopPropagation();
                                setSelectedElementId(id);
                                setIsStyleOverlayOpen(true);
                                showToast(`🎯 Style Editor: Customizing "${label}"`);
                              }}
                              onMouseEnter={(e) => {
                                if (!isInspectMode) return;
                                e.stopPropagation();
                                setHoveredElementId(id);
                              }}
                              onMouseLeave={() => {
                                if (!isInspectMode) return;
                                setHoveredElementId(null);
                              }}
                              style={{
                                color: style.textColor,
                                backgroundColor: style.bgColor,
                                fontSize: style.size,
                                fontWeight: fontWeight,
                                fontFamily: fontFamily,
                                textAlign: style.align,
                                borderRadius: style.radius,
                              }}
                              className={`${defaultClassName} relative transition-all duration-200 ${
                                isInspectMode ? 'cursor-cell border-dashed border border-purple-300' : ''
                              } ${
                                isInspectMode && isHovered ? 'ring-2 ring-blue-500 scale-[1.01] z-10 shadow-md' : ''
                              } ${
                                isInspectMode && isSelected ? 'ring-2 ring-purple-600 scale-[1.01] z-20 shadow-lg' : ''
                              }`}
                            >
                              {/* Hover overlay with Tag + Dimensions (Pic 1 Style) */}
                              {isInspectMode && isHovered && (
                                <div className="absolute top-0 left-0 -mt-6 bg-blue-600 text-white font-mono text-[8.5px] px-1.5 py-0.5 rounded shadow-lg z-50 flex items-center gap-1 select-none">
                                  <span className="font-extrabold uppercase bg-blue-700 px-1 rounded-sm text-[7.5px]">div</span>
                                  <span className="font-bold">.{id}</span>
                                  <span className="text-blue-105 select-none font-medium opacity-80">1039 × 369</span>
                                </div>
                              )}
                              {children}
                            </div>
                          );
                        };

                        return (
                          <div className="w-full space-y-4">
                            <div className="w-full bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
                              
                              <div className="flex justify-between items-center pb-2.5 border-b border-stone-100">
                                <div>
                                  <h4 className="text-xs font-mono uppercase tracking-wider text-stone-400 font-extrabold text-left">App Active Iframe preview</h4>
                                  <h2 className="text-sm font-bold text-stone-900 mt-0.5 text-left">{activeProject.title} Live</h2>
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold border border-emerald-100 uppercase tracking-wider font-mono">ACTIVE PIPELINE</span>
                              </div>

                              {/* Dynamic components mapping relative to projects */}
                              {selectedProjectId === 'Ecommerce' && (
                                <div className="space-y-4 pt-1.5 text-xs text-stone-800 font-medium font-sans">
                                  <div className="grid grid-cols-2 gap-3 text-left">
                                    {renderInteractiveElement('sales-volume', 'sales-volume', 'p-3 border border-stone-150 shadow-xs text-left cursor-pointer', (
                                      <>
                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400 block mb-0.5">Sales volume</span>
                                        <span className="block text-md font-bold text-stone-800">$127,840</span>
                                        <p className="text-[9px] text-[#10b981] font-bold mt-1">📈 +12% this cycle</p>
                                      </>
                                    ))}
                                    {renderInteractiveElement('active-orders', 'active-orders', 'p-3 border border-stone-150 shadow-xs text-left cursor-pointer', (
                                      <>
                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#019cda] block mb-0.5">Active Orders</span>
                                        <span className="block text-md font-bold text-stone-800">1,489 checkout</span>
                                        <p className="text-[9px] text-stone-400 font-medium mt-1">Simulated locally</p>
                                      </>
                                    ))}
                                  </div>

                                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-150 space-y-2 text-left">
                                    <span className="block text-[10px] font-bold text-stone-705 uppercase font-mono tracking-wider">ECommerce interactive scale gauge</span>
                                    <input 
                                      type="range"
                                      min="1"
                                      max="100"
                                      defaultValue="82"
                                      onChange={(e) => showToast(`Sales adjusted: ${e.target.value}%`)}
                                      className="w-full accent-blue-600 cursor-pointer pointer-events-auto"
                                    />
                                    <div className="flex justify-between text-[8px] text-stone-400 font-mono">
                                      <span>MIN</span>
                                      <span>DEFAULT</span>
                                      <span>MAX</span>
                                    </div>
                                  </div>

                                  {renderInteractiveElement('checkout-button', 'checkout-button', 'w-full py-3 font-extrabold text-white shadow-sm text-xs transition-colors pointer-events-auto cursor-pointer flex items-center justify-center', (
                                    <span>Trigger Payment Simulation &rarr;</span>
                                  ))}
                                </div>
                              )}

                              {selectedProjectId === 'Landing Page' && (
                                <div className="space-y-4 pt-1.5 text-xs text-stone-700 leading-relaxed font-sans">
                                  {renderInteractiveElement('hero-banner', 'hero-banner', 'relative h-24 p-4 flex flex-col justify-end text-white overflow-hidden border border-stone-800', (
                                    <>
                                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700 via-stone-950 to-black opacity-90 z-0"></div>
                                      <div className="relative z-10 text-left">
                                        <span className="text-[9px] uppercase font-bold text-teal-400 tracking-wider block">talanted space</span>
                                        <h3 className="text-xs font-sans font-bold text-stone-100 mt-0.5">Make Each Day Beautiful</h3>
                                      </div>
                                    </>
                                  ))}
                                  <p className="text-[11px] text-stone-500 text-left">
                                    Stunning marketing hero space layout automatically configured for multi-device responsive scaling checks safely.
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {renderInteractiveElement('learn-more-btn', 'learn-more-btn', 'px-3.5 py-2 text-stone-100 bg-[#1c1917] hover:bg-stone-800 pointer-events-auto cursor-pointer block text-center rounded-lg', (
                                      <span>Learn More</span>
                                    ))}
                                    {renderInteractiveElement('live-demo-btn', 'live-demo-btn', 'px-3.5 py-2 border border-stone-250 hover:bg-stone-100 text-stone-800 pointer-events-auto cursor-pointer block text-center rounded-lg', (
                                      <span>Live Demo</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedProjectId !== 'Ecommerce' && selectedProjectId !== 'Landing Page' && (
                                <div className="space-y-4 pt-1.5 text-xs text-[#1F2937] font-medium font-sans">
                                  {renderInteractiveElement('available-funds', 'available-funds', 'p-4.5 relative overflow-hidden shadow-xs text-left', (
                                    <>
                                      <span className="text-[9.5px] uppercase tracking-wider text-[#019cda] font-extrabold block">Available Funds</span>
                                      <span className="block text-xl font-mono font-bold tracking-tight mt-1 text-stone-800">€4,890.45</span>
                                      <div className="flex justify-between text-[10px] text-stone-400 mt-4.5 font-mono">
                                        <span>ROIH_ZEINEB DEPS_HUB</span>
                                        <span>06/30</span>
                                      </div>
                                    </>
                                  ))}
                                  {renderInteractiveElement('checkout-button', 'checkout-button', 'w-full py-3 hover:opacity-95 font-bold text-xs rounded-xl shadow-xs cursor-pointer pointer-events-auto flex items-center justify-center', (
                                    <span>Confirm Transaction Simulation</span>
                                  ))}
                                </div>
                              )}

                            </div>

                            {/* FLOATING HIGH-FIDELITY ELEMENT STYLE WRITER (Perfect Match for Pic 2 Layout!) */}
                            {isStyleOverlayOpen && selectedElementId && (
                              <div className="w-full bg-white border border-stone-200 rounded-2xl p-4.5 shadow-xl space-y-3.5 animate-fade-in relative z-40 select-none text-left">
                                
                                {/* Header: breadcrumb, tabs Style/Layout, close button */}
                                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                                  <div className="flex items-center gap-1.5 text-[10.5px]">
                                    <span className="bg-blue-600 text-white font-mono font-extrabold text-[9px] px-2 py-0.5 rounded-md">div</span>
                                    <span className="bg-[#10b981] text-white font-mono font-extrabold text-[9px] px-2 py-0.5 rounded-md">.{selectedElementId}</span>
                                    <span className="text-stone-400 font-mono font-semibold truncate max-w-[120px] sm:max-w-none text-[9.5px]">
                                      div.flex &gt; div.flex-1 &gt; div.p-6 &gt; div.grid
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[10px]">
                                      <button 
                                        onClick={() => setStylePanelTab('style')}
                                        className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                                          stylePanelTab === 'style' ? 'bg-[#4f46e5] text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
                                        }`}
                                      >
                                        🎨 Style
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setStylePanelTab('layout');
                                          showToast("📐 Layout structures unlocked!");
                                        }}
                                        className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                                          stylePanelTab === 'layout' ? 'bg-[#4f46e5] text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
                                        }`}
                                      >
                                        Layout
                                      </button>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setIsStyleOverlayOpen(false);
                                        setSelectedElementId(null);
                                      }}
                                      className="text-stone-400 hover:text-stone-850 font-extrabold p-1 cursor-pointer text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                {/* Form Controls Grid (Strictly Aligned with Pic 2 Fields!) */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-left">
                                  
                                  {/* 1. TEXT Color code input */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">TEXT COLOR</label>
                                    <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5">
                                      <input 
                                        type="color" 
                                        value={elementStyles[selectedElementId]?.textColor || "#020817"} 
                                        onChange={(e) => {
                                          const color = e.target.value;
                                          setElementStyles(prev => ({
                                            ...prev,
                                            [selectedElementId]: { ...prev[selectedElementId], textColor: color }
                                          }));
                                        }}
                                        className="w-4 h-4 rounded-sm cursor-pointer border-0 p-0"
                                      />
                                      <input 
                                        type="text" 
                                        value={elementStyles[selectedElementId]?.textColor || ""} 
                                        onChange={(e) => {
                                          const txt = e.target.value;
                                          setElementStyles(prev => ({
                                            ...prev,
                                            [selectedElementId]: { ...prev[selectedElementId], textColor: txt }
                                          }));
                                        }}
                                        className="bg-transparent font-mono text-[10px] font-extrabold outline-none text-stone-800 w-full"
                                      />
                                    </div>
                                  </div>

                                  {/* 2. BACKGROUND Color code input */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">BG COLOR</label>
                                    <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 font-sans">
                                      <input 
                                        type="color" 
                                        value={elementStyles[selectedElementId]?.bgColor === 'transparent' ? '#ffffff' : (elementStyles[selectedElementId]?.bgColor || '#ffffff')} 
                                        onChange={(e) => {
                                          const color = e.target.value;
                                          setElementStyles(prev => ({
                                            ...prev,
                                            [selectedElementId]: { ...prev[selectedElementId], bgColor: color }
                                          }));
                                        }}
                                        className="w-4 h-4 rounded-sm cursor-pointer border-0 p-0 font-sans"
                                      />
                                      <input 
                                        type="text" 
                                        value={elementStyles[selectedElementId]?.bgColor || ""} 
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setElementStyles(prev => ({
                                            ...prev,
                                            [selectedElementId]: { ...prev[selectedElementId], bgColor: val }
                                          }));
                                        }}
                                        className="bg-transparent font-mono text-[10px] font-extrabold outline-none text-stone-800 w-full"
                                      />
                                    </div>
                                  </div>

                                  {/* 3. SIZE DROP-DOWN */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">SIZE</label>
                                    <select 
                                      value={elementStyles[selectedElementId]?.size || "12px"}
                                      onChange={(e) => {
                                        const sz = e.target.value as any;
                                        setElementStyles(prev => ({
                                          ...prev,
                                          [selectedElementId]: { ...prev[selectedElementId], size: sz }
                                        }));
                                      }}
                                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5 text-[10.5px] font-bold text-stone-800 outline-none cursor-pointer"
                                    >
                                      <option value="11px">11px</option>
                                      <option value="12px">12px</option>
                                      <option value="14px">14px</option>
                                      <option value="16px">16px</option>
                                      <option value="18px">18px</option>
                                    </select>
                                  </div>

                                  {/* 4. WEIGHT DROP-DOWN / SELECTION */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">WEIGHT</label>
                                    <select 
                                      value={elementStyles[selectedElementId]?.weight || "Regular"}
                                      onChange={(e) => {
                                        const wt = e.target.value as any;
                                        setElementStyles(prev => ({
                                          ...prev,
                                          [selectedElementId]: { ...prev[selectedElementId], weight: wt }
                                        }));
                                      }}
                                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5 text-[10.5px] font-bold text-stone-800 outline-none cursor-pointer"
                                    >
                                      <option value="Light">Light</option>
                                      <option value="Regular">Regular</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Bold">Bold</option>
                                      <option value="Extrabold">Extrabold</option>
                                    </select>
                                  </div>

                                </div>

                                {/* Row 2: Font Family, Layout Alignments, Border Radius */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left pt-1">
                                  
                                  {/* A. FONT FAMILY */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-stone-400 font-sans">FONT FAMILY</label>
                                    <select 
                                      value={elementStyles[selectedElementId]?.font || "Inter"}
                                      onChange={(e) => {
                                        const fn = e.target.value as any;
                                        setElementStyles(prev => ({
                                          ...prev,
                                          [selectedElementId]: { ...prev[selectedElementId], font: fn }
                                        }));
                                      }}
                                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5 text-[10.5px] font-bold text-stone-805 outline-none cursor-pointer"
                                    >
                                      <option value="Inter">Inter (Clean UI)</option>
                                      <option value="JetBrains Mono">JetBrains Mono (Mono)</option>
                                      <option value="Space Grotesk">Space Grotesk (Tech)</option>
                                      <option value="Playfair Display">Playfair Display (Serif)</option>
                                    </select>
                                  </div>

                                  {/* B. ALIGNMENT (Segmented Buttons left, center, right) */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-stone-400 font-sans">ALIGN</label>
                                    <div className="flex bg-stone-50 border border-stone-200 p-0.5 rounded-xl text-center select-none font-sans">
                                      {(['left', 'center', 'right'] as const).map((dir) => (
                                        <button 
                                          key={dir}
                                          type="button"
                                          onClick={() => {
                                            setElementStyles(prev => ({
                                              ...prev,
                                              [selectedElementId]: { ...prev[selectedElementId], align: dir }
                                            }));
                                          }}
                                          className={`flex-1 font-bold text-xs py-1 rounded-lg transition-all cursor-pointer ${
                                            elementStyles[selectedElementId]?.align === dir 
                                              ? 'bg-white border border-stone-200 font-extrabold text-stone-900 shadow-xs' 
                                              : 'text-stone-400 hover:text-stone-800'
                                          }`}
                                        >
                                          {dir === 'left' ? '←' : dir === 'center' ? '↔' : '→'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* C. BORDER RADIUS selector */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-stone-400 font-sans">RADIUS</label>
                                    <select 
                                      value={elementStyles[selectedElementId]?.radius || "12px"}
                                      onChange={(e) => {
                                        const rad = e.target.value as any;
                                        setElementStyles(prev => ({
                                          ...prev,
                                          [selectedElementId]: { ...prev[selectedElementId], radius: rad }
                                        }));
                                      }}
                                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5 text-[10.5px] font-bold text-stone-800 outline-none cursor-pointer"
                                    >
                                      <option value="0px">0px (Flat Square)</option>
                                      <option value="4px">4px (Subtle)</option>
                                      <option value="8px">8px (Standard)</option>
                                      <option value="12px">12px (Rounded Card)</option>
                                      <option value="16px">16px (Extremely Soft)</option>
                                    </select>
                                  </div>

                                </div>

                                {/* Footer Action buttons */}
                                <div className="flex justify-between items-center pt-2.5 border-t border-stone-105">
                                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-55 px-2.5 py-1 rounded-lg">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Changes previewing live in the iframe
                                  </span>
                                  <div className="flex items-center gap-2 font-sans">
                                    <button 
                                      onClick={() => {
                                        // Reset to standard defaults
                                        setElementStyles(prev => ({
                                          ...prev,
                                          [selectedElementId]: {
                                            textColor: selectedElementId === 'checkout-button' ? '#ffffff' : '#020817',
                                            bgColor: selectedElementId === 'checkout-button' ? '#2563eb' : '#fafaf9',
                                            size: '12px',
                                            weight: 'Bold',
                                            font: 'Inter',
                                            align: selectedElementId === 'checkout-button' ? 'center' : 'left',
                                            radius: '12px'
                                          }
                                        }));
                                        showToast("Reverted changes to initial values.");
                                      }}
                                      className="px-4 py-1.5 border border-stone-200 hover:bg-stone-50 rounded-xl text-[10.5px] font-bold text-stone-600 transition-colors pointer-events-auto cursor-pointer"
                                    >
                                      Discard
                                    </button>
                                    <button 
                                      onClick={() => {
                                        showToast("⚡ Compiling element style parameters...");
                                        const styles = elementStyles[selectedElementId] || {};
                                        const summaryMessage = `🛠️ **Inspect & Apply Audit Log**:\n\nCustom styling compiled for element ID \`#${selectedElementId}\`:\n- **Font Family**: \`${styles.font || 'Inter'}\` (${styles.weight || 'Bold'})\n- **Colors**: Text: \`${styles.textColor || 'Default'}\` • Background: \`${styles.bgColor || 'Default'}\`\n- **Typography**: Size: \`${styles.size || '12px'}\`\n- **Alignment**: Align: \`${styles.align || 'left'}\`\n- **Border Radius**: Radius: \`${styles.radius || '12px'}\`\n\n*These style adjustments are fully recompiled inside the Node.js reverse proxy environment.*`;

                                        setTimeout(() => {
                                          showToast(`✨ Successfully updated and synced structural definitions within Code!`);
                                          
                                          // Update Right Sidebar Chat messages
                                          setChatMessages(prev => [
                                            ...prev,
                                            {
                                              sender: 'assistant',
                                              text: summaryMessage,
                                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            }
                                          ]);

                                          // Update TED Popup Chat messages
                                          setTedChatMessages(prev => [
                                            ...prev,
                                            {
                                              sender: 'assistant',
                                              text: summaryMessage,
                                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                              status: 'success'
                                            }
                                          ]);

                                          setIsStyleOverlayOpen(false);
                                        }, 1000);
                                      }}
                                      className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-[10.5px] rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Apply to Code</span>
                                    </button>
                                  </div>
                                </div>

                              </div>
                            )}

                          </div>
                        );
                      })()}

                      {/* --- TABS RENDERING: CODE VIEW (Authentic File Explorer Source Display) --- */}
                      {editorTab === 'code' && (
                        <div className="w-full bg-[#1e1e1e] border border-stone-900 rounded-3xl p-4.5 shadow-2xl font-mono text-[11px] text-stone-300 leading-relaxed overflow-x-auto">
                          
                          <div className="flex justify-between items-center text-[10px] text-stone-500 border-b border-stone-800 pb-2.5 mb-3 select-none">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                              <span className="font-bold text-stone-400">src/components/ui/{selectedExplorerFile}</span>
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(mockFileContents[selectedExplorerFile] || "");
                                showToast("📋 Code snippet copied to clipboard!");
                              }}
                              className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1 rounded-lg transition-colors border border-stone-700 cursor-pointer text-[9.5px] font-bold"
                            >
                              Copy Code
                            </button>
                          </div>

                          <pre className="text-left font-mono overflow-x-auto text-[10.5px]">
                            {/* Elegant token colored styling simulating beautiful syntax highlight */}
                            <code className="text-stone-300 block">
                              {(mockFileContents[selectedExplorerFile] || mockFileContents['button.tsx'])
                                .split('\n')
                                .map((line, idx) => {
                                  // Simple regex colorization simulation for visual luxury!
                                  let renderedLine = line;
                                  if (line.trim().startsWith('import ')) {
                                    renderedLine = line.replace('import ', '<span class="text-indigo-400 font-bold">import </span>');
                                  } else if (line.trim().startsWith('export ')) {
                                    renderedLine = line.replace('export ', '<span class="text-pink-400 font-bold">export </span>');
                                  } else if (line.trim().startsWith('return ')) {
                                    renderedLine = line.replace('return ', '<span class="text-purple-400 font-bold">return </span>');
                                  }
                                  return (
                                    <div key={idx} className="flex hover:bg-stone-800/40 px-1 rounded">
                                      <span className="text-stone-500 text-right w-6.5 shrink-0 pr-2.5 select-none font-mono text-[9px]">
                                        {idx + 1}
                                      </span>
                                      <span 
                                        dangerouslySetInnerHTML={{ __html: renderedLine }} 
                                        className="font-mono"
                                      />
                                    </div>
                                  );
                                })}
                            </code>
                          </pre>

                        </div>
                      )}

                      {/* --- TABS RENDERING: DIAGNOSTICS/QUALITY VIEW --- */}
                      {editorTab === 'quality' && (
                        <div className="w-full max-w-[520px] mx-auto bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5 text-left">
                          
                          <div className="pb-2.5 border-b border-stone-100">
                            <h4 className="text-sm font-bold text-stone-900 animate-fade-in flex items-center gap-2">
                              📋 <span>Diagnostic metrics review</span>
                            </h4>
                            <p className="text-[10px] text-stone-400 mt-1">6 measures computed by our Quality Control agent pipeline</p>
                          </div>

                          <div className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-stone-700">
                                <span className="font-medium">Design Fidelity to Figma wireframe mockup</span>
                                <span className="font-mono font-bold text-stone-900">98% Passed</span>
                              </div>
                              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-stone-900 h-full" style={{ width: '98%' }}></div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-stone-700">
                                <span className="font-medium">Semantic layout & component cleanliness</span>
                                <span className="font-mono font-bold text-stone-900">96% Optimized</span>
                              </div>
                              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-stone-900 h-full" style={{ width: '96%' }}></div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-stone-700">
                                <span className="font-medium">Mobile viewport auto-adaptable coverage</span>
                                <span className="font-mono font-bold text-stone-900">100% Responsive</span>
                              </div>
                              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-stone-900 h-full" style={{ width: '100%' }}></div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-stone-700">
                                <span className="font-medium">Execution speed load & DOM nodes reduction</span>
                                <span className="font-mono font-bold text-stone-900">99% Elite</span>
                              </div>
                              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-stone-900 h-full" style={{ width: '99%' }}></div>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}

                      {/* --- TABS RENDERING: ACCESSIBILITY (Refined Modern Low-Intensity Design - Pic 3 Neutral Style Proposal) --- */}
                      {editorTab === 'accessibility' && (
                        <div className="w-full max-w-[520px] mx-auto bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5 animate-fade-in text-stone-800">
                          
                          <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                            <div>
                              <span className="text-[9px] font-mono tracking-wider font-extrabold uppercase text-stone-400">WCAG 2.1 AA Compliance Scorecard</span>
                              <h3 className="text-sm font-bold text-stone-900 mt-0.5 animate-slide-in font-sans">Accessibility evaluation results</h3>
                            </div>
                            <span className="bg-stone-100 text-stone-700 text-[9.5px] font-extrabold px-3 py-1 rounded-lg uppercase border border-stone-200 shrink-0">
                              Warning AA
                            </span>
                          </div>

                          {/* Refined Circle Score Indicator Block matches Pic 3 Slate Elegance */}
                          <div className="flex flex-col md:flex-row items-center gap-6 bg-stone-55 p-4.5 rounded-2xl border border-stone-150">
                            
                            {/* Minimal circle score indicator */}
                            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-stone-200"
                                  strokeWidth="3.5"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className="text-stone-850 transition-all duration-1000"
                                  strokeDasharray="80, 100"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute text-center">
                                <span className="block text-xl font-mono font-extrabold text-stone-900 font-sans">80</span>
                                <span className="block text-[8px] uppercase tracking-widest text-stone-400 font-extrabold font-sans">Score</span>
                              </div>
                            </div>

                            {/* Details text */}
                            <div className="space-y-1.5 text-xs text-stone-600 leading-normal font-sans font-medium">
                              <p className="font-extrabold text-stone-800 font-sans">Low-Severity Issues Detected</p>
                              <p className="text-[10.5px] text-stone-500 font-sans">
                                The provided React source has some accessibility warnings, including missing alt text descriptions and lack of keyboard descriptors on specific navigation buttons.
                              </p>
                              <button 
                                onClick={() => {
                                  setIsAuditing(true);
                                  showToast("⏳ Running automated WCAG AA compliance audit...");
                                  setTimeout(() => {
                                    setIsAuditing(false);
                                    showToast("✅ Audit complete! No major obstacles remaining.");
                                  }, 1200);
                                }}
                                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-extrabold rounded-xl transition-all font-mono text-[9px] tracking-wider pointer-events-auto cursor-pointer"
                              >
                                {isAuditing ? "Auditing Pipeline..." : "RUN INTUITIVE AUDIT"}
                              </button>
                            </div>

                          </div>

                          {/* Subtabs list */}
                          <div className="flex border-b border-stone-200 text-[10.5px]">
                            <button 
                              onClick={() => setActiveTabSub('issues')}
                              className={`p-2.5 font-extrabold border-b-2 tracking-tight ${activeTabSub === 'issues' ? 'border-[#15395e] text-[#15395e]' : 'border-transparent text-stone-400'}`}
                            >
                              Issues (3)
                            </button>
                            <button 
                              onClick={() => setActiveTabSub('components')}
                              className={`p-2.5 font-extrabold border-b-2 tracking-tight ${activeTabSub === 'components' ? 'border-[#15395e] text-[#15395e]' : 'border-transparent text-stone-400'}`}
                            >
                              Components Tested
                            </button>
                            <button 
                              onClick={() => setActiveTabSub('history')}
                              className={`p-2.5 font-extrabold border-b-2 tracking-tight ${activeTabSub === 'history' ? 'border-[#15395e] text-[#15395e]' : 'border-transparent text-stone-400'}`}
                            >
                              History
                            </button>
                          </div>

                          <div className="space-y-3.5 text-xs pt-1">
                            {activeTabSub === 'issues' && (
                              <div className="space-y-2 text-xs">
                                <div className="p-3.5 bg-stone-50/70 border-l-4 border-stone-600 border-y border-r border-stone-200 rounded-lg space-y-1 shadow-2xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-stone-900 uppercase text-[9px] font-mono tracking-wider">Missing alt text descriptor</span>
                                    <span className="text-[9px] font-mono font-bold text-stone-400">WCAG 1.1.1</span>
                                  </div>
                                  <p className="text-[10.5px] text-stone-600 font-medium font-sans">Image icons lack explicit alt values to describe visual placeholders.</p>
                                  <p className="text-[9px] font-mono text-stone-400 mt-1">Location: src/App.tsx line 1472</p>
                                </div>

                                <div className="p-3.5 bg-stone-50/70 border-l-4 border-stone-600 border-y border-r border-stone-200 rounded-lg space-y-1 shadow-2xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-stone-900 uppercase text-[9px] font-mono tracking-wider">Lack of keyboard aria-label descriptors</span>
                                    <span className="text-[9px] font-mono font-bold text-stone-400">WCAG 4.1.2</span>
                                  </div>
                                  <p className="text-[10.5px] text-stone-600 font-medium font-sans">Close drawer trigger has no textual labels set for screen reader users.</p>
                                  <p className="text-[9px] font-mono text-stone-400 mt-1">Location: src/components/ui/dialog.tsx line 8</p>
                                </div>

                                <div className="p-3 bg-stone-50/75 border border-stone-200 rounded-lg text-stone-700 font-bold text-[10px] flex items-center gap-2 font-sans shadow-2xs">
                                  <span className="text-stone-805 text-xs">✔</span>
                                  <span>Landmarks ARIA navigation structure is fully compliant with modern landmarks.</span>
                                </div>
                              </div>
                            )}

                            {activeTabSub === 'components' && (
                              <div className="space-y-1 font-mono text-[11px] text-stone-650">
                                <div className="p-2.5 hover:bg-stone-50 rounded italic border-b border-stone-100">✓ button.tsx - Compliant</div>
                                <div className="p-2.5 hover:bg-stone-50 rounded italic border-b border-stone-100">✓ avatar.tsx - Compliant</div>
                                <div className="p-2.5 hover:bg-stone-50 rounded italic">✓ card.tsx - Compliant</div>
                              </div>
                            )}

                            {activeTabSub === 'history' && (
                              <p className="text-[10.5px] text-stone-400 text-center py-6 font-medium">
                                No previous compliance logs found for this project code branch.
                              </p>
                            )}
                          </div>

                        </div>
                      )}

                    </div>

                  </div>

                  {/* Minimal page footer strictly with no telemetry clutter */}
                  <div className="text-center text-[10px] text-stone-400 font-sans tracking-wide py-3 border-t border-stone-200 bg-white w-full">
                    talanted developpeur hub • Secure Sandbox Port 3000
                  </div>

                </div>

                {/* 3. RIGHT COLUMN: SHUTTLE PANEL FOR DUAL CHAT / HISTORY (span 3) */}
                {isRightSidebarOpen && (
                  <div className="lg:col-span-3 bg-white flex flex-col justify-between overflow-hidden h-full border-l border-stone-150 animate-fade-in">
                  
                  {/* Sliding Tabs header for Dialogue / History */}
                  <div className="flex border-b border-stone-200 text-xs select-none">
                    <button
                      onClick={() => setRightSidebarMode('chat')}
                      className={`flex-1 text-center py-3 font-extrabold transition-all duration-150 cursor-pointer ${
                        rightSidebarMode === 'chat'
                          ? 'border-b-2 border-[#15395e] text-[#15395e] font-extrabold bg-[#fafafa]'
                          : 'text-stone-400 hover:bg-stone-50 animate-fade-in'
                      }`}
                    >
                      🗣️ CHAT AGENTS
                    </button>
                    <button
                      onClick={() => setRightSidebarMode('versions')}
                      className={`flex-1 text-center py-3 font-extrabold transition-all duration-150 cursor-pointer ${
                        rightSidebarMode === 'versions'
                          ? 'border-b-2 border-[#15395e] text-[#15395e] font-extrabold bg-[#fafafa]'
                          : 'text-stone-400 hover:bg-stone-50 animate-fade-in'
                      }`}
                    >
                      🕒 VERSIONS ({activeProject?.version})
                    </button>
                  </div>

                  {/* Dynamic side content render */}
                  {rightSidebarMode === 'chat' ? (
                    <div className="flex-grow flex flex-col justify-between min-h-0">
                      
                      {/* Highlighted Cohort Agents Block (Fulfills list highlighting) */}
                      <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex flex-col gap-1 select-none animate-fade-in shrink-0">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#15395e] font-sans flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active Cohort Agents
                        </span>
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {(activeProject?.agents || ["Requirements Scribe", "Code Synth", "Compliance Auditor"]).map((agentName, idx) => (
                            <span 
                              key={idx} 
                              className="text-[9.5px] font-sans font-extrabold bg-[#15395e]/10 text-[#15395e] border border-[#15395e]/15 rounded-md px-2 py-0.5 hover:bg-[#15395e] hover:text-white transition-all duration-200 cursor-pointer"
                              title={`Direct your question specifically to @${agentName}`}
                              onClick={() => {
                                setPromptInput(`@${agentName}: `);
                                showToast(`🎯 Direct prompt channeled to ${agentName}!`);
                              }}
                            >
                              @{agentName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-grow p-4 overflow-y-auto space-y-4 max-h-[440px] custom-scrollbar">
                        {chatMessages.map((msg, i) => (
                          <div 
                            key={i} 
                            className={`flex flex-col max-w-[90%] ${
                              msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                            }`}
                          >
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              msg.sender === 'user' 
                                ? 'bg-[#15395e] text-white rounded-tr-none shadow-xs' 
                                : 'bg-stone-100 text-stone-800 rounded-tl-none border border-stone-200'
                            }`}>
                              {msg.text}
                            </div>
                            <span className="text-[9px] text-stone-400 font-mono mt-1 pr-1">{msg.timestamp}</span>
                          </div>
                        ))}
                      </div>

                      {/* Code generation prompt submit triggers */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!promptInput.trim()) return;
                          
                          const userMsg = promptInput;
                          setChatMessages(prev => [...prev, { sender: 'user', text: userMsg, timestamp: "Now" }]);
                          setPromptInput('');
                          showToast("🤖 Talanted Multi-Agent pipeline processing instructions...");

                          setTimeout(() => {
                            setChatMessages(prev => [...prev, {
                              sender: 'assistant',
                              text: `✨ Instructions processed successfully: "${userMsg}". The updated interface components correspond seamlessly to your directive.`,
                              timestamp: "Now"
                            }]);
                            showToast("🔔 Live preview fully updated!");
                          }, 1200);
                        }}
                        className="p-3 border-t border-stone-200 bg-stone-50 flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          placeholder="Command agent (ex: add rounded corner)..."
                          value={promptInput}
                          onChange={(e) => setPromptInput(e.target.value)}
                          className="flex-grow bg-white border border-stone-200 outline-none text-xs rounded-xl px-3 py-2.5 focus:border-[#019cda] text-stone-800 font-semibold"
                        />
                        <button
                          type="submit"
                          className="p-2.5 rounded-xl bg-[#15395e] text-white hover:bg-[#019cda] font-extrabold text-xs shrink-0 cursor-pointer"
                        >
                          Send
                        </button>
                      </form>

                    </div>
                  ) : (
                    <div className="flex-grow p-4.5 space-y-4 text-xs font-semibold overflow-y-auto font-sans">
                      
                      <div className="flex justify-between items-center text-stone-400 text-[10px] uppercase font-mono tracking-wider border-b border-stone-100 pb-1.5 animate-fade-in">
                        <span>Versions Timeline</span>
                        <span>3 builds synced</span>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-stone-50 border-2 border-dashed border-[#15395e] rounded-xl flex items-center justify-between">
                          <div>
                            <span className="font-mono text-stone-900 font-bold block">{activeProject?.version} [Active branch]</span>
                            <span className="text-[10px] text-stone-400 mt-0.5 block">Sync with GitLab main</span>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] uppercase font-bold">LIVE</span>
                        </div>

                        <div className="p-3 bg-stone-100/50 border border-stone-150 rounded-xl flex items-center justify-between opacity-70 hover:opacity-100 transition-all">
                          <div>
                            <span className="font-mono text-stone-605 block">v3.4.1</span>
                            <span className="text-[10px] text-stone-400 mt-0.5 block">Initial Figma Vector export build</span>
                          </div>
                          <button 
                            onClick={() => {
                              showToast("🔄 Rolled back branch successfully!");
                            }}
                            className="text-[#019cda] hover:underline font-bold text-[10px]"
                          >
                            Rollback
                          </button>
                        </div>

                        <div className="p-3 bg-stone-100/50 border border-stone-150 rounded-xl flex items-center justify-between opacity-70 hover:opacity-100 transition-all">
                          <div>
                            <span className="font-mono text-stone-605 block">v3.4.0</span>
                            <span className="text-[10px] text-stone-400 mt-0.5 block">Pipeline baseline template skeleton</span>
                          </div>
                          <button 
                            onClick={() => {
                              showToast("🔄 Rolled back branch successfully!");
                            }}
                            className="text-[#019cda] hover:underline font-bold text-[10px]"
                          >
                            Rollback
                          </button>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

          {/* TED ACTIVE CODE FIXER & DEBUGGER CHATBOT WIDGET */}
          {isTedPopupOpen && (
            <div className="fixed bottom-6 right-6 w-[450px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-100px)] bg-white border border-stone-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-850 font-sans z-[60] animate-slide-in" id="ted-interactive-co-pilot-chatbot">
              
              {/* Header Row */}
              <div className="bg-white px-5 py-3.5 border-b border-stone-200 flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[10px] font-mono text-blue-600 uppercase tracking-widest font-extrabold leading-none">AI COPILOT</h3>
                    <h2 className="text-sm font-bold text-stone-850 flex items-center gap-1.5 mt-1 font-sans">
                      TED Active Assistant
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="bg-emerald-50 text-emerald-700 text-[9.5px] font-mono px-2 py-0.5 rounded-full border border-emerald-200 uppercase font-bold flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Live
                  </span>
                  <button 
                    onClick={() => {
                      setIsTedPopupOpen(false);
                      setIsRightSidebarOpen(true); // Restore default workspace right side
                      showToast("💼 Returned to primary workspace view.");
                    }}
                    className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-50 transition-colors cursor-pointer"
                    title="Close Chatbot Widget"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Chatbot Interface Tabs */}
              <div className="bg-stone-50/55 border-b border-stone-200 flex px-3 select-none">
                <button
                  onClick={() => setTedActiveTab('chat')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    tedActiveTab === 'chat'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => setTedActiveTab('diagnostics')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    tedActiveTab === 'diagnostics'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  🔍 System Diagnostics
                </button>
              </div>

              {/* Tab Content Panels */}
              {tedActiveTab === 'chat' ? (
                <div className="flex-grow flex flex-col justify-between overflow-hidden min-h-0 bg-white">
                  
                  {/* Message Stream */}
                  <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar text-left font-sans animate-fade-in">
                    {tedChatMessages.map((msg, idx) => (
                      <div 
                        key={idx}
                        className={`flex flex-col max-w-[90%] space-y-1 ${
                          msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div className={`p-3.5 rounded-2xl text-[12px] leading-relaxed shadow-xs ${
                          msg.sender === 'user'
                            ? 'bg-[#15395e] text-white rounded-tr-none'
                            : 'bg-stone-50 border border-stone-200 text-stone-850 rounded-tl-none'
                        }`}>
                          <div className="whitespace-pre-line text-[11.5px] font-sans">{msg.text}</div>
                          
                          {/* Interactive suggested fixes inside the floating chat bubble */}
                          {msg.suggestedFixes && msg.suggestedFixes.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-stone-200 space-y-1.5 select-none font-sans">
                              <span className="text-[9px] uppercase font-mono font-extrabold text-blue-600 block tracking-wider">Quick Apply Fixes:</span>
                              <div className="space-y-1.5">
                                {msg.suggestedFixes.map((fix) => (
                                  <button
                                    key={fix.id}
                                    onClick={() => {
                                      showToast(`🛠️ Executing: "${fix.title}"...`);
                                      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                      
                                      // Log the fix actions into both chat history systems
                                      const fixStatement = `Execute automated fix: "${fix.title}"`;
                                      const diagnosticMsg = `🛠️ **Automated Adjustment Implemented!** I edited the component layout schema corresponding directly to your request:\n\n- **Target Action**: ${fix.action}\n- **Sandbox Impact**: Fixed layout padding constraints, resolved bounds overflow alerts, and recompiled the active assets bundle in the client context.\n\nEverything is fully running. Check out the preview box on the canvas!`;
                                      
                                      setChatMessages(prev => [
                                        ...prev,
                                        {
                                          sender: 'assistant',
                                          text: `🤖 **TED AI Copilot Synced**: ${diagnosticMsg}`,
                                          timestamp
                                        }
                                      ]);

                                      setTedChatMessages(prev => [
                                        ...prev,
                                        {
                                          sender: 'user',
                                          text: fixStatement,
                                          timestamp
                                        },
                                        {
                                          sender: 'assistant',
                                          text: diagnosticMsg,
                                          timestamp,
                                          status: 'success'
                                        }
                                      ]);
                                    }}
                                    className="w-full text-left bg-white border border-stone-200 hover:border-blue-500 hover:bg-stone-50 p-2 rounded-lg text-[10px] text-stone-750 font-semibold transition-all duration-150 flex items-center justify-between cursor-pointer shadow-subtle"
                                  >
                                    <span>{fix.title}</span>
                                    <span className="text-blue-600 font-mono text-[9px] uppercase font-extrabold tracking-wider shrink-0 ml-2">Apply &rarr;</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interactive generated code block element */}
                          {msg.codeBlock && (
                            <div className="mt-3 bg-slate-900 rounded-lg p-2 border border-slate-800 font-mono text-[10px] text-emerald-400 overflow-x-auto select-all shadow-sm">
                              <pre className="leading-4">{msg.codeBlock}</pre>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-stone-400 font-mono pr-1">{msg.timestamp}</span>
                      </div>
                    ))}
                  </div>

                  {/* Submit Box */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!tedPromptInput.trim()) return;

                      const input = tedPromptInput;
                      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      setTedChatMessages(prev => [...prev, { sender: 'user', text: input, timestamp }]);
                      setTedPromptInput('');
                      showToast("🤖 TED Active reasoning scanner active...");

                      setTimeout(() => {
                        let responseText = ``;
                        let codeBlock = undefined;

                        if (input.toLowerCase().includes('align') || input.toLowerCase().includes('position') || input.toLowerCase().includes('center')) {
                          responseText = `🛠️ **TED Layout Positioner & Code Aligner Active!**\n\nI reviewed your component alignments and configured centering properties directly.\n\nI implemented a direct Flexbox container check around active modules. Centering is updated safely in code layout files.`;
                          codeBlock = `// Align & center styles synchronized\n<div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center space-y-6">\n  <h2 className="text-xl md:text-3xl font-sans text-center text-slate-900">\n    Centered element\n  </h2>\n</div>`;
                        } else if (input.toLowerCase().includes('color') || input.toLowerCase().includes('bg') || input.toLowerCase().includes('style') || input.toLowerCase().includes('theme')) {
                          responseText = `🎨 **TED Styling Engine Active!**\n\nThe deep slate Midnight brand scheme matches \`#15395e\` colors. Layout style properties are fully integrated and synced with Code changes!`;
                          codeBlock = `<div className="bg-[#15395e] border border-white/10 rounded-2xl shadow-lg p-6 bg-gradient-to-br from-slate-900 via-[#15395e] to-[#15395e]/80">\n  {/* Accent background sync */}\n</div>`;
                        } else {
                          responseText = `💻 **TED Code Co-Pilot Compiled!** Action executed successfully.\n\nFilesystem state parsed cleanly. Interactive style mapping is updated and synchronized within the active context!`;
                          codeBlock = `// TED auto-applied patch\nexport function ComponentWrapper() {\n  return (\n    <section className="px-4 py-8 max-w-7xl mx-auto" id="comply-block">\n      {/* Generated high-fidelity changes */}\n    </section>\n  );\n}`;
                        }

                        // Also append this information directly to the main Sidebar chat logs (as requested)
                        setChatMessages(prev => [
                          ...prev,
                          {
                            sender: 'assistant',
                            text: `🤖 **TED AI Copilot Synced**: ${responseText}`,
                            timestamp
                          }
                        ]);

                        setTedChatMessages(prev => [
                          ...prev,
                          {
                            sender: 'assistant',
                            text: responseText,
                            timestamp,
                            codeBlock,
                            status: 'success'
                          }
                        ]);
                        showToast("🔔 Code changes applied successfully!");
                      }, 1050);
                    }}
                    className="p-3 border-t border-stone-200 bg-stone-50 flex items-center gap-2 select-none"
                  >
                    <input 
                      type="text"
                      placeholder="Type style guidelines or debug CMD..."
                      value={tedPromptInput}
                      onChange={(e) => setTedPromptInput(e.target.value)}
                      className="flex-grow bg-white border border-stone-200 outline-none rounded-xl px-3 py-2 text-[11px] text-stone-800 placeholder-stone-400 focus:border-blue-500 font-medium"
                    />
                    <button
                      type="submit"
                      className="bg-[#15395e] hover:bg-[#102a46] text-white font-bold text-[11px] px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>

                </div>
              ) : (
                <div className="flex-grow flex flex-col overflow-hidden bg-stone-50/55 min-h-0 select-none animate-fade-in">
                  
                  {/* System Header Specs */}
                  <div className="bg-white px-4 py-2.5 border-b border-stone-200 grid grid-cols-2 gap-2 text-left text-[10.5px]">
                    <div>
                      <span className="text-[8.5px] uppercase tracking-wider text-stone-400 font-mono font-bold block">Platform Target</span>
                      <span className="text-stone-700 font-semibold block">React 18 + Vite (ESM)</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] uppercase tracking-wider text-stone-400 font-mono font-bold block">Typography Pairings</span>
                      <span className="text-stone-700 font-semibold block">Space Grotesk + Inter</span>
                    </div>
                  </div>

                  {/* Scanned components list & logs */}
                  <div className="p-4 flex-grow overflow-y-auto space-y-3 custom-scrollbar text-left font-mono">
                    
                    <div className="bg-white border border-stone-250/80 p-3 rounded-xl space-y-1.5 shadow-2xs">
                      <h4 className="text-[10px] font-mono font-bold text-[#15395e] uppercase tracking-wider">Active Canvas Components Checked</h4>
                      
                      <div className="space-y-1 text-[10.5px]">
                        <div className="flex items-center justify-between bg-stone-50 px-2 py-1 rounded border border-stone-150">
                          <span className="text-stone-700 font-semibold">#sales-volume</span>
                          <span className="text-[8.5px] bg-[#15395e]/10 text-[#15395e] px-1.5 py-0.2 rounded font-mono font-bold uppercase">Grid Card</span>
                        </div>
                        <div className="flex items-center justify-between bg-stone-50 px-2 py-1 rounded border border-stone-150">
                          <span className="text-stone-700 font-semibold">#active-orders</span>
                          <span className="text-[8.5px] bg-[#019cda]/10 text-[#019cda] px-1.5 py-0.2 rounded font-mono font-bold uppercase">Metrics Widget</span>
                        </div>
                        <div className="flex items-center justify-between bg-stone-50 px-2 py-1 rounded border border-stone-150">
                          <span className="text-stone-700 font-semibold">#checkout-button</span>
                          <span className="text-[8.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold uppercase">Button</span>
                        </div>
                        <div className="flex items-center justify-between bg-stone-50 px-2 py-1 rounded border border-stone-150">
                          <span className="text-stone-700 font-semibold">#available-funds</span>
                          <span className="text-[8.5px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-mono font-bold uppercase">Funds Pill</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2 font-mono text-[10px] text-slate-100 shadow-md">
                      <div className="flex items-center justify-between animate-pulse">
                        <span className="text-slate-400 uppercase tracking-wider font-extrabold text-[9px]">Debugging Logs</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      </div>
                      <div className="space-y-0.5 text-slate-300 leading-relaxed font-mono">
                        <p className="text-slate-500 text-[9.5px]">[SYSTEM] Scanning HTML targets...</p>
                        <p className="text-emerald-400 text-[9.5px]">✓ Found exact matching style binds</p>
                        <p className="text-blue-400 text-[9.5px]">ℹ Live styles synchronized</p>
                        <p className="text-amber-400 font-medium text-[9.5px]">[WARN] Layout alignments validated</p>
                        <p className="text-violet-400 font-medium text-[9.5px]">[INFO] Style overrides synchronized</p>
                        <p className="text-slate-500 font-mono text-[9px] mt-1">Build Context: Sandbox active on Port 3000</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500">Size: 341 KB</span>
                        <button
                          type="button"
                          onClick={() => {
                            showToast("⚡ Scanning codebase errors...");
                            setTimeout(() => {
                              showToast("✨ Code diagnostics completed! 0 errors found.");
                            }, 1000);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[8.5px] px-2 py-1 rounded transition-all cursor-pointer uppercase tracking-wider"
                        >
                          Scan Build Structure
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

          {/* FIGMA IMPORT MODAL */}
          {isFigmaModalOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" id="figma-import-popup">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-stone-200 animate-slide-in">
                <button 
                  onClick={() => setIsFigmaModalOpen(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  {/* Title */}
                  <div className="flex items-center gap-2 pb-2.5 border-b border-stone-100">
                    <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 36 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 13.5C9 8.52944 13.0294 4.5 18 4.5C22.9706 4.5 27 8.52944 27 13.5V22.5H18C13.0294 22.5 9 18.4706 9 13.5Z" fill="#F24E1E"/>
                        <path d="M9 31.5C9 26.5294 13.0294 22.5 18 22.5H27V31.5C27 36.4706 22.9706 40.5 18 40.5C13.0294 40.5 9 36.4706 9 31.5Z" fill="#A259FF"/>
                        <path d="M18 49.5C13.0294 49.5 9 45.4706 9 40.5V31.5H18C22.9706 31.5 27 35.5294 27 40.5C27 45.4706 22.9706 49.5 18 49.5Z" fill="#1ABCFE"/>
                        <path d="M18 40.5V49.5C22.9706 49.5 27 45.4706 27 40.5C27 35.5294 22.9706 31.5 18 31.5V40.5Z" fill="#0ACF83"/>
                        <path d="M9 13.5V22.5H18V13.5C18 8.52944 13.0294 4.5 9 4.5C4.02944 4.5 0 8.52944 0 13.5C0 18.4706 4.02944 22.5 9 22.5" fill="#F24E1E"/>
                      </svg>
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 font-sans">Importer depuis Figma</h3>
                  </div>

                  {/* Explainer instructions layout */}
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-150 space-y-2">
                    <div className="text-xs font-bold text-stone-800">How to get your Figma token?</div>
                    <ol className="text-[11px] text-stone-505 list-decimal pl-4.5 space-y-1.5 leading-relaxed font-medium">
                      <li>Open Figma -- Settings - Security</li>
                      <li>Click Generate new token</li>
                      <li>Copy the token and paste it below</li>
                    </ol>
                  </div>

                  {/* Input fields as described */}
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-750 mb-1.5 uppercase font-mono tracking-wider">Figma File URL</label>
                      <input 
                        type="text" 
                        value={figmaFileUrl}
                        onChange={(e) => setFigmaFileUrl(e.target.value)}
                        placeholder="https://figma.com/file/..."
                        className="w-full bg-white border border-stone-250 rounded-xl px-4 py-2.5 text-xs text-stone-850 outline-none focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda]/20 font-medium"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-bold text-stone-750 uppercase font-mono tracking-wider">Figma Personal Token</label>
                        <span className="text-[10px] text-stone-400 font-mono">meryemboukraa199@gmail.com</span>
                      </div>
                      <input 
                        type="password" 
                        value={figmaPersonalToken}
                        onChange={(e) => setFigmaPersonalToken(e.target.value)}
                        placeholder="Your Figma access key..."
                        className="w-full bg-white border border-stone-250 rounded-xl px-4 py-2.5 text-xs text-stone-850 outline-none focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda]/20 font-mono"
                      />
                      <p className="text-[10.5px] text-stone-450 mt-2 flex items-center gap-1.5 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                        <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>Your token is never stored — used only for this generation</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer actions buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
                    <button 
                      onClick={() => setIsFigmaModalOpen(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-850 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={() => {
                        setIsFigmaModalOpen(false);
                        const newId = `Figma_${Date.now()}`;
                        const newP = {
                          id: newId,
                          title: 'Figma Auto-generated Dashboard Layout',
                          tag: 'Prompt' as const,
                          status: 'Active Pipeline' as const,
                          version: 'v1.4.0',
                          elements: '14 Vector Widgets',
                          wcagScore: '98/100',
                          editedTime: 'Created just now',
                          description: 'Figma workspace generated via token. Target URL: ' + figmaFileUrl,
                          color: 'from-orange-500 to-amber-600',
                          agents: ["Figma Extractor", "Code Synth"]
                        };
                        setProjectList(prev => [newP, ...prev]);
                        setSelectedProjectId(newId);
                        setPortalView('editor');
                        showToast("🎉 Figma compiled layout compiled successfully into editor!");
                      }}
                      className="bg-[#15395e] hover:bg-[#019cda] text-white px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MEETING TRANSCRIPT MODAL */}
          {isMeetingModalOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" id="meeting-import-popup">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative border border-stone-200 animate-slide-in">
                <button 
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  {/* Title & Language selector */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-sky-100 text-[#019cda] flex items-center justify-center font-bold text-sm">🎙️</span>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">Import from Meeting</h3>
                        <p className="text-[10px] text-stone-400 leading-none">Record Transcribe (ElevenLabs) Al Analysis</p>
                      </div>
                    </div>
                    
                    {/* GB English selector pill */}
                    <div className="relative">
                      <select 
                        value={selectedLanguage}
                        onChange={(e) => {
                          setSelectedLanguage(e.target.value);
                          showToast(`Speech recognition set to: ${e.target.value}`);
                        }}
                        className="bg-stone-100 hover:bg-stone-150 text-stone-750 font-bold text-[10px] px-2.5 py-1.5 rounded-xl border border-stone-200 cursor-pointer outline-none"
                      >
                        <option value="GB English">GB English</option>
                        <option value="FR Français">FR Français</option>
                        <option value="US English">US English</option>
                      </select>
                    </div>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex border-b border-stone-100 text-xs">
                    <button 
                      onClick={() => setMeetingTabSelection('record')}
                      className={`py-2 px-4 font-bold border-b-2 transition-all cursor-pointer ${meetingTabSelection === 'record' ? 'border-[#019cda] text-[#019cda]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                    >
                      Record Transcribe (ElevenLabs)
                    </button>
                    <button 
                      onClick={() => setMeetingTabSelection('analysis')}
                      className={`py-2 px-4 font-bold border-b-2 transition-all cursor-pointer ${meetingTabSelection === 'analysis' ? 'border-[#019cda] text-[#019cda]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                    >
                      PASTE A TRANSCRIPT
                    </button>
                  </div>

                  {/* Dynamic Inner Panel based on tab */}
                  {meetingTabSelection === 'record' ? (
                    <div className="space-y-3 pt-1">
                      <div className="bg-sky-50/50 p-4.5 rounded-2xl border border-sky-100 text-center space-y-3">
                        <div className="flex justify-center items-center gap-1.5 h-6">
                          {isRecordingMeeting ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                              <span className="text-xs font-mono font-bold text-red-650 animate-pulse">RECORDING ACTIVE (ElevenLabs Live Stream...)</span>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-stone-500 font-sans">ElevenLabs Voice Recognition stream is ready</span>
                          )}
                        </div>

                        {isRecordingMeeting ? (
                          <div className="flex items-center justify-center gap-1 py-2">
                            {[1, 2, 3, 4, 3, 2, 1, 3, 4, 5, 2, 1, 3, 2, 4].map((h, x) => (
                              <span 
                                key={x} 
                                style={{ height: `${h * 4}px` }} 
                                className="w-0.5 bg-red-505 bg-red-500 rounded animate-bounce"
                              />
                            ))}
                          </div>
                        ) : null}

                        <p className="text-[11.5px] font-semibold text-stone-700 leading-relaxed max-w-sm mx-auto">{meetingRecordingText}</p>
                        
                        <button 
                          onClick={() => {
                            if (isRecordingMeeting) {
                              setIsRecordingMeeting(false);
                              setMeetingRecordingText("Requirements generated: 'Design a clean transactional card form with a dark blue pricing table, dynamic counter fields, and 100% compliant WCAG contrast text elements.'");
                              showToast("🎙️ Audio stream parsed & requirements extracted from ElevenLabs transcript logs!");
                            } else {
                              setIsRecordingMeeting(true);
                              setMeetingRecordingText("Listening to meeting notes discussion... (Your voice signals are fed directly to ElevenLabs pipeline for requirement structure tracking)");
                              showToast("🎙️ Audiostream listening active!");
                            }
                          }}
                          className={`mx-auto px-4.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                            isRecordingMeeting 
                              ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                              : 'bg-[#15395e] hover:bg-[#019cda] text-white'
                          }`}
                        >
                          <span>{isRecordingMeeting ? 'Stop Transcription' : 'Start Recording'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold text-stone-700">Paste your meeting transcript here to extract requirements...</label>
                      <textarea 
                        value={meetingTranscriptText}
                        onChange={(e) => setMeetingTranscriptText(e.target.value)}
                        placeholder="Paste transcript dialogue here..."
                        className="w-full bg-white border border-stone-250 rounded-xl px-3.5 py-2.5 text-xs text-stone-850 outline-none focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda]/20 font-medium h-24 resize-none"
                      />
                    </div>
                  )}

                  <div className="text-[10px] text-stone-400 bg-stone-50 p-3 rounded-xl border border-stone-150 leading-normal">
                    Record a meeting or paste a transcript: The AI will automatically extract functional requirements, detect core ambiguities, and prepare a optimized prompt for instantaneous UI generation.
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-stone-100">
                    <button 
                      onClick={() => {
                        setIsMeetingModalOpen(false);
                        setIsRecordingMeeting(false);
                      }}
                      className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-850 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setIsMeetingModalOpen(false);
                        setIsRecordingMeeting(false);
                        const newId = `Meet_${Date.now()}`;
                        const content = meetingTabSelection === 'record' ? meetingRecordingText : meetingTranscriptText;
                        const newP = {
                          id: newId,
                          title: 'Meeting Transcript Extracted Screen',
                          tag: 'Meeting' as const,
                          status: 'Active Pipeline' as const,
                          version: 'v2.1.0',
                          elements: '12 Extracted Items',
                          wcagScore: '99/100',
                          editedTime: 'Created just now',
                          description: 'Voice requirements: ' + content,
                          color: 'from-blue-600 to-sky-400',
                          agents: ["Audio Scribe", "Requirements Auditor", "Code Synth"]
                        };
                        setProjectList(prev => [newP, ...prev]);
                        setSelectedProjectId(newId);
                        setPortalView('editor');
                        showToast("🎙️ Requirements analyzed and formulated into UI block design!");
                      }}
                      className="bg-[#019cda] hover:bg-[#15395e] text-white px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 animate-pulse"
                    >
                      <span>Generate UI</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GITLAB SYNC MODAL */}
          {isGitlabModalOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" id="gitlab-sync-popup">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-stone-200 animate-slide-in">
                <button 
                  onClick={() => setIsGitlabModalOpen(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  <div className="pb-2.5 border-b border-stone-100">
                    <h3 className="text-sm font-bold text-stone-900 font-sans">Push to GitLab</h3>
                    <p className="text-[10px] text-stone-400 font-sans font-medium">Sync and commit your code to GitLab repositories</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 font-sans">GitLab URL •</label>
                      <input 
                        type="text" 
                        value={gitlabUrl}
                        onChange={(e) => setGitlabUrl(e.target.value)}
                        className="w-full bg-white border border-stone-250 rounded-lg px-3 py-2 text-stone-850 outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 font-medium font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 font-sans">Project path •</label>
                      <input 
                        type="text" 
                        value={gitlabProjectPath}
                        onChange={(e) => setGitlabProjectPath(e.target.value)}
                        className="w-full bg-white border border-stone-250 rounded-lg px-3 py-2 text-stone-850 outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 font-medium font-sans"
                      />
                      <p className="text-[10px] text-stone-400 mt-0.5 font-sans font-medium">The path to your GitLab project</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 font-sans">Personal Access Token •</label>
                      <input 
                        type="password" 
                        value={gitlabToken}
                        onChange={(e) => setGitlabToken(e.target.value)}
                        placeholder="Paste your GitLab Personal Access Token"
                        className="w-full bg-white border border-stone-250 rounded-lg px-3 py-2 text-stone-850 outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 font-mono"
                      />
                      <p className="text-[10px] text-stone-400 mt-0.5 font-sans font-medium font-semibold">Create a PAT at Settings — Access Tokens</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="col-span-1">
                        <label className="block text-[11px] font-bold text-stone-700 mb-1 font-sans">Branch •</label>
                        <input 
                          type="text" 
                          value={gitlabBranch}
                          onChange={(e) => setGitlabBranch(e.target.value)}
                          className="w-full bg-white border border-stone-250 rounded-lg px-3 py-2 text-stone-850 outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-stone-700 mb-1 font-sans">Commit Message •</label>
                        <input 
                          type="text" 
                          value={gitlabCommitMsg}
                          onChange={(e) => setGitlabCommitMsg(e.target.value)}
                          className="w-full bg-white border border-stone-250 rounded-lg px-3 py-2 text-stone-850 outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 font-medium font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                    <button 
                      onClick={() => setIsGitlabModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-850 hover:bg-stone-50 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        showToast("⚙️ Packaging layout files...");
                        setTimeout(() => {
                          showToast(`🚀 Successfully synced & committed design draft to GitLab master branch!`);
                          setIsGitlabModalOpen(false);
                        }, 1250);
                      }}
                      className="bg-stone-900 hover:bg-stone-850 text-white px-5 py-2 text-xs   font-bold rounded-lg transition-all shadow-sm"
                    >
                      Push to GitLab
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEPLOY TO NETLIFY MODAL */}
          {isNetlifyModalOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" id="netlify-deploy-popup">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-stone-200 animate-slide-in">
                <button 
                  onClick={() => setIsNetlifyModalOpen(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  <div className="pb-2.5 border-b border-stone-100">
                    <h3 className="text-sm font-bold text-stone-900 font-sans">Deploy to Netlify</h3>
                    <p className="text-[10px] text-stone-400 font-sans font-medium">Publish to a public URL in one Click — free hosting</p>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="bg-stone-50 p-3 rounded-lg border border-stone-150 text-stone-600 leading-relaxed text-[11px] font-medium font-sans">
                      <span className="font-extrabold block text-stone-800 mb-0.5">How to get a token:</span>
                      Go to <span className="underline font-mono font-bold">app.netlify.com</span> &bull; New access token &bull; Paste it below to trigger instantaneous deployment.
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 font-sans">Netlify Access Token •</label>
                      <input 
                        type="password" 
                        value={netlifyToken}
                        onChange={(e) => setNetlifyToken(e.target.value)}
                        placeholder="Paste your Netlify Access Token"
                        className="w-full bg-white border border-stone-250 rounded-lg px-3 py-2 text-stone-850 outline-none focus:border-stone-800 focus:ring-1 focus:ring-stone-800 font-mono"
                      />
                    </div>

                    {isNetlifyDeploying && (
                      <div className="space-y-1 bg-sky-50/50 p-3 rounded-lg border border-sky-100 animate-pulse">
                        <div className="flex justify-between items-center text-[10px] font-bold text-sky-850">
                          <span>📦 Optimizing and transpiling codebase...</span>
                          <span>Active deployment</span>
                        </div>
                        <div className="w-full bg-stone-150 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: '70%' }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                    <button 
                      onClick={() => setIsNetlifyModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-850 hover:bg-stone-50 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setIsNetlifyDeploying(true);
                        showToast("⚙_ Commencing full Netlify build compiler...");
                        setTimeout(() => {
                          setIsNetlifyDeploying(false);
                          showToast("🚀 App deployed live on Netlify! Production URL active.");
                          setIsNetlifyModalOpen(false);
                        }, 1800);
                      }}
                      className="bg-stone-905 bg-stone-900 hover:bg-stone-850 text-white px-5 py-2 text-xs font-bold rounded-lg transition-all shadow-sm"
                    >
                      Deploy to Netlify
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SHARE PROJECT LINK MODAL */}
          {isShareModalOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" id="share-link-popup">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-stone-200 animate-slide-in">
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  <div className="pb-2.5 border-b border-stone-100">
                    <h3 className="text-sm font-bold text-stone-900 font-sans">Share design draft</h3>
                    <p className="text-[10px] text-stone-400 font-sans font-medium">Share absolute sandbox URL with teammates</p>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 font-sans">Share link</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={shareLinkRevoked ? "Iframe preview link has been revoked" : "https://ais-pre-nev44m27a6tmzyygfl3nii-319293250367.europe-west2.run.app/share/497df"}
                          className={`w-full bg-stone-50 border border-stone-250 rounded-lg px-3 py-2 text-[11px] text-stone-600 font-mono outline-none ${shareLinkRevoked ? 'line-through text-stone-400' : ''}`}
                        />
                        <button 
                          onClick={() => {
                            if (shareLinkRevoked) return;
                            navigator.clipboard.writeText("https://ais-pre-nev44m27a6tmzyygfl3nii-319293250367.europe-west2.run.app/share/497df");
                            showToast("📋 URL copied to your workspace clipboard!");
                          }}
                          className="bg-stone-900 text-white px-3 py-2 rounded-lg hover:bg-stone-850 font-bold transition font-sans text-[11px] shrink-0"
                          disabled={shareLinkRevoked}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-[10px] text-stone-400 font-mono font-bold">Active Preview Access Code: 497df</span>
                      <button 
                        onClick={() => {
                          setShareLinkRevoked(!shareLinkRevoked);
                          showToast(shareLinkRevoked ? "✅ Live preview Link revived!" : "🛑 Live preview Link has been successfully revoked.");
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all ${shareLinkRevoked ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700 hover:bg-red-105'}`}
                      >
                        {shareLinkRevoked ? "Revive link" : "Revoke link"}
                      </button>
                    </div>

                    <div className="border-t border-stone-100 pt-3.5 space-y-2">
                      <h4 className="text-[11px] font-extrabold text-stone-800 font-sans">Invite collaborator</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <input 
                          type="email" 
                          placeholder="collaborateur@example.com"
                          value={collaboratorEmail}
                          onChange={(e) => setCollaboratorEmail(e.target.value)}
                          className="col-span-2 w-full bg-white border border-stone-250 rounded-lg px-3 py-2 text-stone-850 outline-none focus:border-stone-800 font-medium font-sans"
                        />
                        <select 
                          value={collaboratorRole}
                          onChange={(e) => setCollaboratorRole(e.target.value)}
                          className="col-span-1 w-full bg-white border border-stone-250 rounded-lg px-2 py-2 text-stone-800 outline-none bg-stone-50 font-medium font-sans"
                        >
                          <option value="Editor">Editor</option>
                          <option value="Viewer">Viewer</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => {
                          if (!collaboratorEmail) {
                            showToast("❌ Enter collaborator email first!");
                            return;
                          }
                          showToast(`✉️ Invitation sent to ${collaboratorEmail} as ${collaboratorRole}!`);
                          setCollaboratorEmail('');
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold py-2 rounded-lg transition-all text-center text-[11.5px]"
                      >
                        Send Invitation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* JIRA BOARD IMPORT MODAL */}
          {isJiraModalOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in" id="jira-import-popup">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-stone-200 animate-slide-in">
                <button 
                  onClick={() => setIsJiraModalOpen(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  {/* Title and Jira Arrow symbol */}
                  <div className="flex items-center gap-2 pb-2.5 border-b border-stone-100">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#0052CC] flex items-center justify-center">
                      <svg className="w-4.5 h-4.5" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M260.6 224.6c0-60.6 49.1-109.7 109.7-109.7H512L370.3 256.6c-60.6 0-109.7-49.1-109.7-109.7z" fill="#0052CC"/>
                        <path d="M0 224.6C0 164 49.1 114.9 109.7 114.9H251.7L110 256.6C49.4 256.6 0 207.5 0 224.6z" fill="#2684FF"/>
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Import from Jira</h3>
                      <p className="text-[10px] text-stone-400 leading-none">Fetch Select task  Generate UI</p>
                    </div>
                  </div>

                  {/* Tabs select */}
                  <div className="flex border-b border-stone-100 text-xs">
                    <button 
                      onClick={() => setJiraTabSelection('fetch')}
                      className={`py-2 px-4 font-bold border-b-2 transition-all cursor-pointer ${jiraTabSelection === 'fetch' ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                    >
                      Fetch Select task
                    </button>
                    <button 
                      onClick={() => setJiraTabSelection('generate')}
                      className={`py-2 px-4 font-bold border-b-2 transition-all cursor-pointer ${jiraTabSelection === 'generate' ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                    >
                      Generate UI
                    </button>
                  </div>

                  {/* Input form */}
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1.5">Paste your Jira board URL or Issue key (e.g., ABC-123)</label>
                      <input 
                        type="text" 
                        value={jiraBoardUrl}
                        onChange={(e) => setJiraBoardUrl(e.target.value)}
                        placeholder="Paste a Jira URL or issue ticket key..."
                        className="w-full bg-white border border-stone-250 rounded-xl px-4 py-2.5 text-xs text-stone-850 outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]/15 font-semibold font-mono"
                      />
                    </div>

                    <div className="bg-stone-50 border border-stone-150 rounded-xl p-4 text-center space-y-1">
                      <span className="text-xl inline-block mb-1">🔗</span>
                      <p className="text-[11px] font-bold text-stone-800">Paste a Jira URL or issue key above</p>
                      <p className="text-[10px] text-stone-450 leading-relaxed font-semibold max-w-xs mx-auto">Fetch your board backlog items to see frontend tasks, or paste an issue URL directly</p>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-stone-100">
                    <button 
                      onClick={() => setIsJiraModalOpen(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-850 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setIsJiraModalOpen(false);
                        const newId = `Jira_${Date.now()}`;
                        const newP = {
                          id: newId,
                          title: `Jira Ticketing Layout: ${jiraBoardUrl}`,
                          tag: 'Jira' as const,
                          status: 'Validated Draft' as const,
                          version: 'v1.0.0',
                          elements: '6 Agile Components',
                          wcagScore: '99/100',
                          editedTime: 'Created just now',
                          description: 'Requirements mapped from Jira story card ' + jiraBoardUrl,
                          color: 'from-blue-600 via-[#019cda] to-indigo-600',
                          agents: ["Jira Connector", "Code Synth"]
                        };
                        setProjectList(prev => [newP, ...prev]);
                        setSelectedProjectId(newId);
                        setPortalView('editor');
                        showToast(`📈 Jira story ${jiraBoardUrl} parsed, requirements imported to development suite!`);
                      }}
                      className="bg-[#0052CC] hover:bg-[#15395e] text-white px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Generate UI
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

            </div>
          )}

        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] bg-dot-pattern text-stone-800 font-sans selection:bg-violet-100 selection:text-violet-900 flex flex-col relative overflow-x-hidden antialiased">
      
      {/* TOAST SYSTEM */}
      {toastMessage && (
        <div id="toast-notify" className="fixed top-6 right-6 z-50 bg-neutral-905 bg-[#15395e] border border-[#019cda]/20 text-sky-100 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all duration-300">
          <Sparkles className="w-4 h-4 text-[#019cda] animate-pulse" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* --- HEADER NAVIGATION BAR --- */}
      <nav className="w-full bg-white/90 border-b border-stone-200/50 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between" id="pixso-navbar">
        
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#15395e] via-[#0b64a0] to-[#019cda] flex items-center justify-center text-white shadow-md shadow-[#019cda]/20">
            <Layers className="w-5 h-5 text-white" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-neutral-900 font-display font-sans">talanted</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#019cda]/5 border border-[#019cda]/15 text-[#019cda]">Workspace</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">Inspired Custom Environment</p>
          </div>
        </div>

        {/* Desktop Menu links (Exactly matched to the Pixso screenshot style!) */}
        <div className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-neutral-600">
          <a href="#explore-more-talanted" className="hover:text-neutral-900 cursor-pointer scroll-smooth transition-colors">Core Features</a>
          <a href="#organizational-efficiency-talanted" className="hover:text-neutral-900 cursor-pointer scroll-smooth transition-colors">Team Efficiency</a>
          <a href="#pixso-pricing" className="hover:text-neutral-900 cursor-pointer scroll-smooth transition-colors">Pricing & Plans</a>
          <a href="#expanded-faqs" className="hover:text-neutral-900 cursor-pointer scroll-smooth transition-colors">Support Q&A</a>
          <a href="#sandbox-terminal" className="hover:text-[#15395e] cursor-pointer text-[#019cda] font-extrabold flex items-center gap-1 bg-[#019cda]/5 px-3 py-1.5 rounded-lg border border-[#019cda]/15 hover:bg-[#019cda]/10 transition-all">
            <Zap className="w-3.5 h-3.5 text-[#019cda] animate-pulse" /> Live Workspace Sandbox
          </a>
        </div>

        {/* Right Nav Actions (Matches Pixso's log-in / Get Started colors!) */}
        <div className="flex items-center gap-x-4">
          
          <a href="#expanded-faqs" className="hidden sm:inline text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">
            Support Q&A
          </a>

          {isLoggedIn ? (
            <button
              onClick={() => {
                setIsLoggedIn(false);
                showToast("🔒 Logged out from talanted workspace.");
              }}
              className="px-4.5 py-2 text-xs font-bold border border-zinc-300 text-[#15395e] rounded-lg transition-transform hover:bg-[#15395e]/5 active:scale-95 shadow-sm inline-flex items-center gap-1 cursor-pointer"
            >
              Sign out
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setCurrentScreen('auth');
                  showToast("🔑 Accessing Sign In Gate...");
                }}
                className="px-3 md:px-4.5 py-2 text-xs font-bold border border-stone-200 text-stone-700 hover:text-stone-900 rounded-lg transition-transform hover:bg-stone-50 active:scale-95 cursor-pointer"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setCurrentScreen('auth');
                  showToast("✨ Coordinate professional workflows!");
                }}
                className="px-3 md:px-4.5 py-2 text-xs font-bold bg-[#15395e] hover:bg-opacity-95 text-white rounded-lg transition-transform focus:ring-1 focus:ring-neutral-700 active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* --- HERO BANNER WORKFLOW SECTION --- */}
      <section className="w-full relative overflow-hidden bg-white border-b border-stone-200/40" id="hero-banner">
        
        {/* Left Side Rail Grid Column - Pixso Clone Theme */}
        <div className="absolute left-0 top-0 bottom-0 w-[140px] xl:w-[190px] border-r border-stone-150/85 bg-[#fafafa]/30 bg-grid-pattern hidden lg:flex flex-col items-center justify-center gap-8 py-12 z-10 select-none">
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer" title="Cursor tool">
            <PenTool className="w-5 h-5 text-violet-500" />
            <span className="absolute -right-20 bg-stone-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">Pen Design</span>
          </div>
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer" title="Vector Spline">
            <Spline className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer text-emerald-500" title="Terminal Mode">
            <Layout className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer text-amber-500" title="Color Swatch">
            <Layers className="w-5 h-5 text-amber-500" />
          </div>
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer text-pink-500" title="Sound synthesizers">
            <Volume2 className="w-5 h-5 text-pink-500" />
          </div>
        </div>

        {/* Right Side Rail Grid Column - Pixso Clone Theme */}
        <div className="absolute right-0 top-0 bottom-0 w-[140px] xl:w-[190px] border-l border-stone-150/85 bg-[#fafafa]/30 bg-grid-pattern hidden lg:flex flex-col items-center justify-center gap-8 py-12 z-10 select-none">
          <div className="p-2.5 bg-violet-600 rounded-full text-white shadow-lg text-[10px] font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
            <Users className="w-3.5 h-3.5" /> <span>2 Active</span>
          </div>
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer" title="Sparkle indicators">
            <Sparkle className="w-5 h-5 text-violet-500" />
          </div>
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer" title="Hashtags Grid">
            <Grid className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer text-violet-550" title="3D Block layout">
            <Box className="w-5 h-5 text-violet-600" />
          </div>
          <div className="p-3 bg-white shadow-xl shadow-purple-500/5 rounded-xl border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer text-indigo-500" title="Collaborators chat">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
          </div>
        </div>

        {/* Core Center Hero Text Banner Container */}
        <div className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center relative z-20">
          
          {/* Hero Title Matching Pixso display */}
          <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-neutral-900 leading-tight">
            Generate UIs with <br/>
            the Multi-Agent AI of <span className={style.gradientText}>talanted</span>
          </h2>

          {/* Hero Substring */}
          <p className="text-neutral-500 text-sm md:text-base max-w-3xl leading-relaxed mt-6">
            Design and development of a full-stack platform for user interface generation through a multi-agent LLM pipeline and intelligent meeting transcription. Enter your prompt, PDF, Jira ticket, or Figma design, and let AI generate accessible code with real-time WCAG 2.1 AA audits.
          </p>

          {/* Button Controls and demo triggers */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 z-20">
            <button
              onClick={() => {
                setAuthMode('signup');
                setCurrentScreen('auth');
                showToast("✨ Shifting to Signup Gate...");
              }}
              className="w-full sm:w-auto px-6 py-3 bg-[#15395e] hover:bg-opacity-95 text-white font-bold text-xs tracking-wider uppercase rounded-lg transition-all shadow-xl hover:shadow-[#019cda]/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              Create my account
            </button>
            <button
              onClick={() => {
                setAuthLastName("Boukraa");
                setAuthFirstName("Meriem");
                setAuthEmail("you@example.com");
                setAuthUsername("developer_space");
                setIsLoggedIn(true);
                setPortalView('dashboard');
                setCurrentScreen('app');
                showToast("⚡ Direct entry as Meriem Boukraa!");
              }}
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs tracking-wider uppercase rounded-lg border border-neutral-300 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              Quick user demo &rarr;
            </button>
          </div>

          {/* Visual Mockup Frame representing the lifetime promo deal */}
          <div className="w-full max-w-md mt-12 bg-white/90 border border-stone-200/80 rounded-2xl p-4 shadow-xl custom-shadow flex items-center gap-4 text-left z-10 hover:scale-[1.02] transition-transform duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#15395e] via-[#0b64a0] to-[#019cda] flex items-center justify-center text-white shrink-0 shadow-lg">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-neutral-950 flex items-center gap-2">
                talanted multi-agents pipeline
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">ACTIVE DEPLOY</span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">Access your secure developer workspace.</p>
            </div>
            <ArrowRight className="w-5 h-5 ml-auto text-neutral-400" />
          </div>

        </div>

      </section>

      {/* SECTION 1: --- EXPLORE MORE (HIGH FIDELITY CARDS MOCKUPS MATCHING PIC 2) --- */}
      <section className="px-2 md:px-4 py-20 bg-stone-50/50 border-b border-stone-200/50 scroll-mt-20" id="explore-more-talanted">
        <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-10 px-2 sm:px-4 md:px-6">
          
          <div className="text-center md:text-left space-y-2">
            <span className="text-[11px] font-extrabold tracking-widest text-[#019cda] uppercase">EXPERIENCE THE FUTURE</span>
            <h3 className="text-3xl md:text-5xl font-display font-bold text-neutral-900 tracking-tight">
              Explore more core mechanisms
            </h3>
            <p className="text-stone-500 text-xs md:text-sm max-w-xl leading-relaxed">
              Discover how our continuous multi-agent system accelerates UX layout prototyping and code outputs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Generate from idea */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
              <div className="space-y-4">
                {/* Visual Widget representation from image 2 - typing box draft */}
                <div className="bg-[#fafafa] rounded-xl border border-stone-150 p-4 min-h-[160px] flex flex-col justify-between shadow-inner relative">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">Input Workspace Prompt</div>
                  
                  {/* Prompt Text Input Mockup */}
                  <div className="bg-white rounded-lg border border-stone-250 p-2.5 flex items-center justify-between shadow-xs transition-all focus-within:border-[#019cda]/80">
                    <span className="text-xs font-medium text-stone-800 line-clamp-1">
                      {landingPrompt}
                    </span>
                    <span className="w-1.5 h-4 bg-[#019cda] animate-pulse rounded-full shrink-0"></span>
                  </div>

                  {/* Multi-agent Waterfalling Simulator Ticker */}
                  {landingAgentStatus !== 'idle' ? (
                    <div className="bg-stone-900/95 absolute inset-4 rounded-lg p-3 text-[10px] text-emerald-400 font-mono flex flex-col justify-between space-y-1 animate-fade-in shadow-xl">
                      <div className="flex justify-between items-center border-b border-stone-800 pb-1.5">
                        <span className="font-bold text-stone-300 text-[8px] tracking-wider font-sans uppercase">agent pipeline telemetry</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      </div>
                      <div className="space-y-1 text-left">
                        <div className={landingAgentStatus === 'scribe' ? 'text-white font-bold' : 'opacity-60'}>
                          {landingAgentStatus === 'scribe' ? '●' : '✓'} [Requirements Scribe] Analyzing idea...
                        </div>
                        <div className={landingAgentStatus === 'architect' ? 'text-white font-bold' : 'opacity-60'}>
                          {landingAgentStatus === 'architect' ? '●' : landingAgentStatus === 'scribe' ? ' ' : '✓'} [Figma Extractor] Mapping wireframes...
                        </div>
                        <div className={landingAgentStatus === 'synth' ? 'text-white font-bold' : 'opacity-60'}>
                          {landingAgentStatus === 'synth' ? '●' : (landingAgentStatus === 'scribe' || landingAgentStatus === 'architect') ? ' ' : '✓'} [Code Synth] Bundling React TSX...
                        </div>
                        <div className={landingAgentStatus === 'completed' ? 'text-emerald-300 font-bold' : 'opacity-60'}>
                          {landingAgentStatus === 'completed' ? '✓ [WCAG Auditor] Score: 100/100 AA!' : '  [WCAG Auditor] Verification queue...'}
                        </div>
                      </div>
                      <div className="text-right text-[8px] text-stone-500">
                        {landingAgentStatus === 'completed' ? 'Click to restart process' : 'Running...'}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">
                      {["crypto", "ecom", "fintech"].map((badge, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (idx === 0) setLandingPrompt("A SaaS dashboard to manage crypto transactions...");
                            if (idx === 1) setLandingPrompt("A clean e-commerce shop with a responsive product grid...");
                            if (idx === 2) setLandingPrompt("A banking transactions widget with a responsive SVG pie chart...");
                            showToast(`Selected quick template: ${badge}`);
                          }}
                          className="text-[9px] bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded-md cursor-pointer font-bold transition-all lowercase"
                        >
                          #{badge}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (landingAgentStatus !== 'idle') {
                          setLandingAgentStatus('idle');
                          return;
                        }
                        setLandingAgentStatus('scribe');
                        showToast("⚙️ Multi-Agents pipeline triggered!");
                        setTimeout(() => setLandingAgentStatus('architect'), 1600);
                        setTimeout(() => setLandingAgentStatus('synth'), 3200);
                        setTimeout(() => setLandingAgentStatus('completed'), 4805);
                      }}
                      className="p-1 px-3 bg-[#15395e] hover:bg-opacity-95 text-white rounded-lg text-[10px] font-extrabold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      {landingAgentStatus === 'idle' ? 'Generate' : 'Reset'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <h4 className="text-base font-bold text-stone-900 group-hover:text-[#019cda] transition-colors">
                    Generate from idea
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans">
                    Powered by natural language multi-agent coordination. Just write what you need or import a meeting transcript, and watch your inspiration convert into high-fidelity code structures instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Chat interface */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
              <div className="space-y-4">
                {/* Visual Widget representation from image 2 - chat bubbles */}
                <div className="bg-[#fafafa] rounded-xl border border-stone-150 p-4 min-h-[160px] flex flex-col justify-between shadow-inner space-y-3">
                  <div className="text-[10px] font-bold text-stone-400 text-left uppercase tracking-wider font-mono">Multi-agent chat</div>
                  
                  {/* Chat Bubbles Representation */}
                  <div className="space-y-2 flex-grow overflow-y-auto">
                    <div className="bg-stone-200/50 p-2.5 rounded-xl rounded-tr-none text-[10px] text-stone-850 text-right leading-normal max-w-[85%] ml-auto shadow-xs border border-stone-200/30">
                      <p className="font-medium">"Please add colored status badges to the dashboard"</p>
                    </div>
                    <div className="bg-violet-50 border border-violet-100 p-2.5 rounded-xl rounded-tl-none text-[10px] text-violet-955 text-left leading-normal max-w-[85%] mr-auto shadow-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                        <span className="font-extrabold text-[9px] text-violet-700 uppercase font-sans">Code Synth Agent</span>
                      </div>
                      <p className="font-medium">I have injected dynamic status badge labels (Success, Pending, Failed) styled with Tailwind.</p>
                    </div>
                  </div>

                  <div className="p-1 px-2.5 bg-white rounded-lg border border-stone-200 text-[10px] flex items-center justify-between shadow-inner">
                    <span className="text-stone-400 font-medium">Reply to talanted...</span>
                    <div className="w-5 h-5 bg-stone-100 border border-stone-250 rounded-full flex items-center justify-center cursor-pointer text-stone-500 hover:bg-stone-200">
                      <ArrowUp className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <h4 className="text-base font-bold text-stone-900 group-hover:text-[#019cda] transition-colors">
                    Chat interface
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans">
                    Context-aware and goal-oriented conversation. Refine designs, prompt adjustments, or implement new logic directly in code through conversational iterations with your digital engineering workforce.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Code mode */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
              <div className="space-y-4">
                {/* Visual Widget representation from image 2 - code preview tabs */}
                <div className="bg-[#fafafa] rounded-xl border border-stone-150 p-3 min-h-[160px] flex flex-col justify-between shadow-inner">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    </div>
                    
                    {/* Tiny Switch tab button preview */}
                    <div className="bg-stone-200/65 rounded-lg p-0.5 flex gap-0.5 border border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setCodeModeTab('preview');
                          showToast("🎨 Switched widget to Preview view");
                        }}
                        className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                          codeModeTab === 'preview' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-500 hover:text-stone-855'
                        }`}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCodeModeTab('code');
                          showToast("💻 Switched widget to Code view");
                        }}
                        className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                          codeModeTab === 'code' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-500 hover:text-stone-855'
                        }`}
                      >
                        Code
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Workspace display based on Tab */}
                  <div className="bg-white/90 p-2.5 rounded-lg border border-stone-150 flex-grow mt-2 flex flex-col justify-center text-xs font-mono min-h-[90px] shadow-sm">
                    {codeModeTab === 'preview' ? (
                      <div className="space-y-1.5 text-center p-2">
                        <div className="text-[11px] font-bold text-stone-900">Preview Layout Widget</div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-100 flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                          <span className="px-2.5 py-1 rounded bg-[#15395e]/5 text-[#15395e] text-[10px] font-extrabold border border-[#15395e]/10 shadow-xs">
                            WCAG 100/100
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[9px] text-stone-700 text-left leading-normal font-mono p-1">
                        <span className="text-indigo-600">const</span> Dashboard = () =&gt; &#123;<br/>
                        &nbsp;&nbsp;<span className="text-indigo-600">return</span> (<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-rose-600">div</span> <span className="text-amber-600">className</span>=<span className="text-emerald-700">"p-6 bg-white"</span>&gt;<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-rose-600">h2</span>&gt;Transactions&lt;/<span className="text-rose-600">h2</span>&gt;<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-rose-600">div</span>&gt;<br/>
                        &nbsp;&nbsp;);<br/>
                        &#125;;
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <h4 className="text-base font-bold text-stone-900 group-hover:text-[#019cda] transition-colors">
                    Code mode
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans">
                    Switch designs to raw code views. Easily inspect layouts, copy css classes, extract clean tailwind design variables, debug structure, and audit syntax safety on the fly.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 3: --- THE ALL-IN-ONE SYSTEM FOR EFFICIENCY (MATCHING PIC 4 & 5) --- */}
      <section className="px-2 md:px-4 py-20 bg-stone-50 border-b border-stone-200" id="organizational-efficiency-talanted">
        <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-14 px-2 sm:px-4 md:px-6">
          
          <div className="text-center space-y-4">
            <h3 className="text-3xl md:text-5xl font-display font-bold text-neutral-900 tracking-tight leading-tight">
              The all-in-one design-to-code compiler <br/>
              for organizational efficiency
            </h3>
            <p className="text-stone-500 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
              Consolidate design, eliminate communication silos, and accelerate your interface delivery by 10x.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Better, faster collaboration */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between" id="efficiency-collab">
              <div className="space-y-6">
                
                {/* Visual Mockup matching Pic 4 left side */}
                <div className="bg-[#fafafa] rounded-2xl border border-stone-150 p-4 min-h-[170px] flex flex-col justify-between shadow-inner relative">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2.5">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-mono">Workspace session share</span>
                    <button
                      type="button"
                      onClick={() => showToast("👥 Copied project workspace share link to clipboard!")}
                      className="px-2.5 py-1 bg-white rounded-lg border border-stone-200 font-extrabold text-[9px] text-[#15395e] flex items-center gap-1 hover:bg-stone-50 transition-all cursor-pointer shadow-xs"
                    >
                      <Users className="w-3.5 h-3.5 text-[#019cda]" />
                      share link
                    </button>
                  </div>

                  {/* Collaborative Users panel cards list mockup */}
                  <div className="space-y-2 mt-4 flex-grow text-left">
                    <div className="bg-white rounded-xl border border-stone-200 p-2.5 flex items-center justify-between shadow-xs hover:border-[#019cda] transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs uppercase">
                          S
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-stone-850">Sophia (Scribe Agent)</span>
                          <span className="text-[9px] text-stone-400 font-mono">Active workspace scribe</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-violet-50 text-violet-750 border border-violet-150 font-bold px-2 py-0.5 rounded">can edit</span>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 p-2.5 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5 mr-1">
                        <div className="w-8 h-8 rounded-full bg-[#019cda]/10 flex items-center justify-center text-[#019cda] font-bold text-xs uppercase font-sans">
                          M
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-stone-850">Meriem Boukraa (PM)</span>
                          <span className="text-[9px] text-stone-400 font-mono text-left">Lead product owner</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded">owner</span>
                    </div>
                  </div>

                  {/* Miniature Floating custom role tags */}
                  <div className="absolute bottom-3 right-3 bg-[#019cda] text-white text-[8px] font-extrabold font-mono px-2 py-0.5 rounded shadow-lg animate-bounce">
                    PM Agent
                  </div>

                </div>

                <div className="space-y-2 text-left">
                  <h4 className="text-xl font-bold text-neutral-950">Better, faster collaboration</h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans">
                    Enable multi-agent collaboration on single project workspaces. Continuous requirements auditing and real-time design translations completely eliminate bulky coordination logs and versioning headache traps.
                  </p>
                </div>

              </div>
            </div>

            {/* Card 2: Seamless handoff */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between" id="efficiency-handoff">
              <div className="space-y-6">
                
                {/* Visual Mockup matching Pic 4 right side (Code, Slicing, D2C progress) */}
                <div className="bg-[#fafafa] rounded-2xl border border-stone-150 p-4 min-h-[170px] flex flex-col justify-between shadow-inner relative">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2 flex-row text-[9px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                    <div className="flex gap-2">
                      <span className="text-[#15395e] border-b border-[#15395e] pb-1 cursor-pointer">Code</span>
                      <span className="opacity-50 hover:opacity-90 cursor-pointer">Slicing</span>
                      <span className="opacity-50 hover:opacity-90 cursor-pointer text-violet-600 font-extrabold">D2C Live</span>
                    </div>
                    <span>D2C Module</span>
                  </div>

                  {/* Interactive handoff checklist representation */}
                  <div className="space-y-2 mt-4 flex-grow text-left">
                    <div className="flex items-center justify-between text-xs text-stone-800 font-medium">
                      <span className="flex items-center gap-1.5 pl-1 font-semibold">
                        <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                        React output code compilation
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold font-mono">100% Ok</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-stone-800 font-medium">
                      <span className="flex items-center gap-1.5 pl-1 font-semibold">
                        <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                        Automated WCAG audit test suite
                      </span>
                      <span className="text-[10px] text-[#019cda] font-extrabold font-mono">Audit passed</span>
                    </div>
                  </div>

                  {/* Beautiful big code generation button progress list */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => showToast("⚡ Generated pure clean code bundle! Ready to push to production.")}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                      <span>Generate code 100% (Success)</span>
                    </button>
                  </div>

                </div>

                <div className="space-y-2 text-left">
                  <h4 className="text-xl font-bold text-neutral-950">Seamless one-click handoff</h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans">
                    Convert layouts to beautiful production-ready files in a single click. talanted fully supports standard React, TypeScript, elegant Tailwind styling rules, and native accessibility tags (W3C standard coverage).
                  </p>
                </div>

              </div>
            </div>

            {/* Card 3: Unmatched performance */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between" id="efficiency-performance">
              <div className="space-y-6">
                
                {/* Visual Mockup matching Pic 5 left chart comparison! */}
                <div className="bg-[#fafafa] rounded-2xl border border-stone-150 p-4 min-h-[170px] flex flex-col justify-between shadow-inner">
                  <div className="flex justify-between items-center border-b border-stone-150 pb-2">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-mono">talanted compiler metrics</span>
                    <span className="text-[9px] text-[#019cda] font-bold">50% Faster file processing</span>
                  </div>

                  {/* Custom HTML Bar Chart growing dynamically */}
                  <div className="flex items-end justify-center gap-8 h-[95px] mt-4 z-10 relative">
                    
                    {/* Bar 1: talanted 2.0 (stellar fast) */}
                    <div className="flex flex-col items-center gap-2 w-1/3">
                      <div className="text-[10px] font-bold text-violet-600 font-mono animate-bounce text-center">6.81s</div>
                      <div className="w-full bg-gradient-to-t from-violet-600 to-violet-500 h-[38px] rounded-lg shadow-lg relative group transition-all duration-500 hover:-translate-y-1">
                        {/* Shimmer effect overlay */}
                        <div className="absolute inset-0 bg-white/10 rounded-lg animate-pulse" />
                      </div>
                      <div className="text-[9px] font-bold text-stone-900 font-mono uppercase text-center">2.0 model</div>
                    </div>

                    {/* Bar 2: Legacy framework (sluggish grey) */}
                    <div className="flex flex-col items-center gap-2 w-1/3">
                      <div className="text-[10px] text-stone-400 font-bold font-mono">19.48s</div>
                      <div className="w-full bg-stone-300 h-[92px] rounded-lg transition-all duration-500 hover:-translate-y-1"></div>
                      <div className="text-[9px] font-bold text-stone-400 font-mono uppercase text-center">1.0 model</div>
                    </div>

                  </div>

                </div>

                <div className="space-y-2 text-left">
                  <h4 className="text-xl font-bold text-neutral-950">Unmatched compilation speed</h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans">
                    talanted 2.0 brings a substantial core architecture update: 50% faster compilation speed, 65% reduced network token roundtrip latency, and 40% lightweight browser footprint. No code sluggishness.
                  </p>
                </div>

              </div>
            </div>

            {/* Card 4: AI-empowered efficiency */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between" id="efficiency-ai">
              <div className="space-y-6">
                
                {/* Visual Mockup matching Pic 5 right (AI prompt + preview mockup) */}
                <div className="bg-[#fafafa] rounded-2xl border border-stone-150 p-4 min-h-[170px] flex flex-col justify-between shadow-inner relative">
                  
                  {/* Glowing AI badge overlay */}
                  <div className="flex justify-between items-center border-b border-stone-150 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                      <span>talanted AI workspace</span>
                    </div>
                    <span className="text-[8px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-150 font-bold uppercase tracking-wider font-mono">live synth</span>
                  </div>

                  {/* Simulated interaction bubble */}
                  <div className="space-y-2 mt-4 flex-grow text-left">
                    <div className="bg-white rounded-xl border border-stone-200 p-2.5 text-[9px] shadow-xs text-stone-700">
                      <p className="font-extrabold uppercase text-[7px] text-stone-400 font-mono mb-1 text-left">Incoming AI request</p>
                      <p className="font-medium text-left">"I want to create a homepage layout for a modern fitness trainer web app"</p>
                    </div>

                    <div className="bg-indigo-600/95 text-white p-2.5 rounded-xl text-[9px] shadow-md flex items-center gap-2 max-w-[90%] mr-auto border border-indigo-500/50">
                      <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
                      <div className="text-left">
                        <span className="block font-bold">Generating template file blocks...</span>
                        <span className="text-[7.5px] opacity-75 font-mono">12 Widgets, 6 custom layouts loaded...</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="space-y-2 text-left">
                  <h4 className="text-xl font-bold text-neutral-950">AI-powered multi-agent pipeline</h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans">
                    Leverage advanced context understanding directly inside all interface creation pipelines. Our custom LLM routers optimize structure files generation based on the active project mood and target rules.
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>



      {/* --- PIXSO INTEGRATED PLANS & PRICING SECTION --- */}
      <section className="px-4 md:px-8 py-20 bg-stone-50 border-t border-stone-200 scroll-mt-20 z-10" id="pixso-pricing">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          
          {/* Section Heading */}
          <div className="text-center space-y-4">
            <h3 className="text-3xl md:text-5xl font-display font-bold text-neutral-900 tracking-tight leading-tight">
              Pixso Subscription Plans & Pricing
            </h3>
            <p className="text-neutral-500 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              New role-based seats to boost integrated collaboration efficiency.
            </p>
          </div>

          {/* Interactive Pricing Tab Switcher */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-xs text-neutral-500 font-medium flex items-center gap-2">
              <span>Please choose the plan that fits you best.</span>
            </div>
            
            <div className="bg-stone-100/80 p-1.5 rounded-xl flex items-center shadow-inner border border-stone-200/55 animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setPricingActiveTab('design');
                  showToast("🎨 Switched to Design files configuration");
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  pricingActiveTab === 'design'
                    ? 'bg-white text-neutral-950 shadow-sm border border-stone-200/40'
                    : 'text-stone-500 hover:text-stone-850'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                Design files
              </button>
              <button
                type="button"
                onClick={() => {
                  setPricingActiveTab('whiteboard');
                  showToast("✏️ Switched to Whiteboard files configuration");
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  pricingActiveTab === 'whiteboard'
                    ? 'bg-white text-neutral-950 shadow-sm border border-stone-200/40'
                    : 'text-stone-500 hover:text-stone-850'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                Whiteboard files
              </button>
              <button
                type="button"
                onClick={() => {
                  setPricingActiveTab('dev');
                  showToast("💻 Switched to Developer view configuration");
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  pricingActiveTab === 'dev'
                    ? 'bg-white text-neutral-950 shadow-sm border border-stone-200/40'
                    : 'text-stone-500 hover:text-stone-850'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-[#15395e]"></div>
                Dev view
              </button>
            </div>
          </div>

          {/* Core Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mt-4">
            
            {/* Card 1: Free */}
            <div className="bg-white rounded-3xl border border-stone-250/80 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden" id="price-card-free">
              <div>
                {/* Header with beautiful cyan-to-purple-to-pink gradient badge overlay just like picture 2! */}
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-cyan-400 via-sky-400 to-purple-400 text-white mb-6 shadow-sm">
                  <h4 className="text-xl font-bold">Free</h4>
                  <p className="text-[11px] text-white/95 mt-1 leading-normal font-medium">For personal creation, prototyping, and exploration</p>
                </div>

                <div className="space-y-4 px-1">
                  <div>
                    <div className="text-2xl font-bold text-neutral-950">Free</div>
                    <div className="text-xs text-stone-400 mt-1 font-medium">Unlimited free viewer seats</div>
                  </div>
                </div>

                {/* Free features list */}
                <div className="mt-8 pt-6 border-t border-stone-100 flex-grow px-1">
                  <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mb-3">Free plan includes:</p>
                  <ul className="space-y-2.5">
                    <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Unlimited viewer seats</span>
                    </li>
                    <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Unlimited draft files</span>
                    </li>
                    <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>3 free design files</span>
                    </li>
                    <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>3 free whiteboard files</span>
                    </li>
                    <li className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>MCP (Limited-time free)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setCurrentScreen('auth');
                    showToast("✨ Shifting to Signup Gate for Free tier!");
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-stone-300 text-stone-850 font-bold text-xs hover:bg-stone-50 hover:border-stone-400 transition-all active:scale-[0.98] cursor-pointer text-center"
                >
                  Get started
                </button>
              </div>
            </div>

            {/* Card 2: Team */}
            <div className="bg-white rounded-3xl border border-stone-250/80 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden" id="price-card-team">
              <div>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-150 mb-6 flex flex-col justify-between min-h-[110px]">
                  <div>
                    <h4 className="text-xl font-bold text-neutral-950">Team</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">For growing startups and SMBs</p>
                  </div>
                  
                  {/* Interactive Toggle inside Card */}
                  <div className="mt-4 bg-stone-200/60 p-0.5 rounded-lg flex items-center w-full max-w-[145px] border border-stone-200/50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsTeamAnnualBilling(false);
                        showToast("💳 Set Team plan billing cycle to Monthly");
                      }}
                      className={`flex-1 py-1 rounded text-[9px] font-bold tracking-tight transition-all ${
                        !isTeamAnnualBilling 
                          ? 'bg-white text-neutral-950 shadow-xs' 
                          : 'text-stone-500 hover:text-stone-850'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTeamAnnualBilling(true);
                        showToast("🎁 Set Team plan billing cycle to Annual");
                      }}
                      className={`flex-1 py-1 rounded text-[9px] font-bold tracking-tight transition-all ${
                        isTeamAnnualBilling 
                          ? 'bg-white text-neutral-950 shadow-xs' 
                          : 'text-stone-500 hover:text-stone-850'
                      }`}
                    >
                      Annual
                    </button>
                  </div>
                </div>

                <div className="space-y-3 px-1">
                  {/* Creator Seat */}
                  <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                    <div>
                      <span className="block text-xs font-bold text-neutral-900">Creator seat</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" title="Design tool access"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Whiteboard access"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15395e]" title="Code access"></span>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider font-mono">ALL</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-neutral-950">${isTeamAnnualBilling ? '10' : '12'}</span>
                      <span className="text-[10px] text-stone-400 block font-mono">/month/seat</span>
                    </div>
                  </div>

                  {/* Dev Seat */}
                  <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                    <div>
                      <span className="block text-xs font-bold text-neutral-900">Developer seat</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15395e]" title="Code access only"></span>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider font-mono">DEV</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-neutral-950">${isTeamAnnualBilling ? '6' : '8'}</span>
                      <span className="text-[10px] text-stone-400 block font-mono">/month/seat</span>
                    </div>
                  </div>

                  {/* Collaborator Seat */}
                  <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                    <div>
                      <span className="block text-xs font-bold text-neutral-900">Collaborator seat</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Whiteboard only access"></span>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider font-mono">WB</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-neutral-950">${isTeamAnnualBilling ? '3' : '4'}</span>
                      <span className="text-[10px] text-stone-400 block font-mono">/month/seat</span>
                    </div>
                  </div>
                </div>

                {/* Features inclusions */}
                <div className="mt-6 pt-5 border-t border-stone-100 px-1 font-sans">
                  <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mb-2.5">Everything in Free, plus:</p>
                  <ul className="space-y-2">
                    {['Unlimited projects', 'Unlimited files', 'Unlimited pages', 'Unlimited version history', 'Team resource libraries', 'Team font libraries', 'Private files'].map((f, i) => (
                      <li key={i} className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                        <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => {
                    showToast("🚀 Upgrading to High-Fidelity Team workspace subscription...");
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer text-center shadow-xs"
                >
                  Upgrade to Team
                </button>
              </div>
            </div>

            {/* Card 3: Enterprise */}
            <div className="bg-white rounded-3xl border border-stone-250/80 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden" id="price-card-enterprise">
              <div>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-150 mb-6 flex flex-col justify-between min-h-[110px]">
                  <div>
                    <h4 className="text-xl font-bold text-neutral-950">Enterprise</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">For SMBs and organizations</p>
                  </div>
                  <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md uppercase tracking-wider w-fit mt-3">Yearly Billed</div>
                </div>

                <div className="space-y-3 px-1">
                  {/* Creator Seat Yearly */}
                  <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                    <div>
                      <span className="block text-xs font-bold text-neutral-900">Creator seat</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse"></span>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider font-mono text-stone-500">Scale Full</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-neutral-950">$280</span>
                      <span className="text-[10px] text-stone-400 block font-mono">/year/seat</span>
                    </div>
                  </div>

                  {/* Dev Seat Yearly */}
                  <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                    <div>
                      <span className="block text-xs font-bold text-neutral-900">Developer seat</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15395e] animate-pulse"></span>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider font-mono text-stone-500">IDE Agent</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-neutral-950">$120</span>
                      <span className="text-[10px] text-stone-400 block font-mono">/year/seat</span>
                    </div>
                  </div>

                  {/* Collaborator Seat Yearly */}
                  <div className="flex justify-between items-center bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                    <div>
                      <span className="block text-xs font-bold text-neutral-900">Collaborator seat</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider font-mono text-stone-500">Co-Edit</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-neutral-950">$90</span>
                      <span className="text-[10px] text-stone-400 block font-mono">/year/seat</span>
                    </div>
                  </div>
                </div>

                {/* Features inclusions */}
                <div className="mt-6 pt-5 border-t border-stone-100 px-1">
                  <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mb-2.5">Everything in Team, plus:</p>
                  <ul className="space-y-2">
                    {['Advanced permissions', 'Member seat management', 'Collaboration logs', 'Enterprise resource libraries', 'Enterprise font libraries', 'Enterprise security', 'SSO (Single Sign-On)'].map((f, i) => (
                      <li key={i} className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => {
                    showToast("🏢 Requesting custom setup quote for multi-branch enterprise options...");
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer text-center shadow-xs"
                >
                  Upgrade to Enterprise
                </button>
              </div>
            </div>

            {/* Card 4: On-premise */}
            <div className="bg-white rounded-3xl border border-stone-250/80 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden" id="price-card-onpremise">
              <div>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-150 mb-6 flex flex-col justify-between min-h-[110px]">
                  <div>
                    <h4 className="text-xl font-bold text-neutral-950">On-premise</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">Custom large-scale delivery & compliance</p>
                  </div>
                  <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md uppercase tracking-wider w-fit mt-3">Dedicated Host</div>
                </div>

                <div className="text-center py-7 bg-[#fafaf9] rounded-2xl border border-stone-150 mb-6 px-2">
                  <span className="block text-xl font-bold text-stone-900 tracking-tight">Custom Plan</span>
                  <p className="text-[11px] text-stone-400 mt-1 font-medium">Contact partner support for quotes</p>
                </div>

                {/* Features inclusions */}
                <div className="mt-6 pt-5 border-t border-stone-100 px-1">
                  <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest mb-2.5">Everything in Enterprise, plus:</p>
                  <ul className="space-y-2">
                    {['On-premise deployment', 'Custom feature development', 'Core data encryption', 'Dedicated custom solutions', 'Dedicated technical consultant'].map((f, i) => (
                      <li key={i} className="text-xs text-stone-750 flex items-start gap-2 font-medium">
                        <Check className="w-3.5 h-3.5 text-[#019cda] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => {
                    showToast("✉️ Forwarding inquiry message to enterprise sales partners...");
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer text-center shadow-xs"
                >
                  Contact us
                </button>
              </div>
            </div>

          </div>

          {/* --- INTERACTIVE VERSION COMPARISON MATRIX --- */}
          <div className="mt-14 space-y-6" id="version-comparison-table">
            <div className="text-center space-y-1">
              <h4 className="text-2xl font-display font-medium text-neutral-950">Version comparison</h4>
              <p className="text-xs text-stone-400 font-medium">Find the plan that fits you best</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl shadow-xs overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                
                {/* Table Header: Sticky static representation layout */}
                <thead>
                  <tr className="border-b border-stone-200">
                    <td className="p-6 text-xs font-extrabold uppercase tracking-wider text-stone-400 bg-stone-50/50 w-1/3">Features Comparison</td>
                    <td className="p-6 text-center bg-stone-50/50">
                      <div className="font-bold text-sm text-neutral-950">Free</div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setCurrentScreen('auth');
                        }}
                        className="mt-2 text-[10px] font-bold bg-white border border-stone-250 hover:bg-stone-50 px-3 py-1.5 rounded-lg text-stone-700 cursor-pointer transition-all"
                      >
                        Get started
                      </button>
                    </td>
                    <td className="p-6 text-center bg-stone-50/50">
                      <div className="font-bold text-sm text-neutral-950">Team</div>
                      <button
                        type="button"
                        onClick={() => showToast("🚀 Upgrading to Team pipeline tier...")}
                        className="mt-2 text-[10px] font-bold bg-neutral-955 text-white hover:bg-neutral-900 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        Upgrade to Team
                      </button>
                    </td>
                    <td className="p-6 text-center bg-stone-50/50">
                      <div className="font-bold text-sm text-neutral-950">Enterprise</div>
                      <button
                        type="button"
                        onClick={() => showToast("🏢 Shifting to Enterprise level options...")}
                        className="mt-2 text-[10px] font-bold bg-neutral-955 text-white hover:bg-neutral-900 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        Upgrade to Enterprise
                      </button>
                    </td>
                    <td className="p-6 text-center bg-stone-50/50">
                      <div className="font-bold text-sm text-neutral-950">On-premise</div>
                      <button
                        type="button"
                        onClick={() => showToast("✉️ Inquiring custom enterprise scope design...")}
                        className="mt-2 text-[10px] font-bold bg-white border border-stone-250 hover:bg-stone-50 px-3 py-1.5 rounded-lg text-stone-750 cursor-pointer transition-all"
                      >
                        Contact us
                      </button>
                    </td>
                  </tr>
                </thead>

                <tbody>
                  
                  {/* CATEGORY 1: BASIC FEATURES COLLAPSIBLE */}
                  <tr className="bg-stone-50/80 border-b border-stone-200 cursor-pointer select-none" onClick={() => setIsBasicExpanded(!isBasicExpanded)}>
                    <td colSpan={5} className="p-4 text-xs font-bold text-neutral-950 flex items-center justify-between">
                      <span className="flex items-center gap-2 uppercase tracking-widest text-[10px] text-stone-600">
                        <FolderOpen className="w-3.5 h-3.5 text-[#15395e]" />
                        Basic Limits
                      </span>
                      <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${isBasicExpanded ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>

                  {isBasicExpanded && (
                    <>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          <div className="flex items-center gap-1.5">
                            Draft files
                            <Info className="w-3 h-3 text-stone-400 cursor-help" title="Direct scratchpad drafting files allowed" />
                          </div>
                        </td>
                        <td className="p-4 text-center text-xs text-stone-500 font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-850 font-semibold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-850 font-semibold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-850 font-semibold font-mono">Unlimited</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          <div className="flex items-center gap-1.5">
                            Team members
                            <Info className="w-3 h-3 text-stone-400 cursor-help" title="Collaborators per project team seat limit" />
                          </div>
                        </td>
                        <td className="p-4 text-center text-xs text-stone-500 font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-850 font-semibold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-850 font-semibold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-850 font-semibold font-mono">Unlimited</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          Projects per team
                        </td>
                        <td className="p-4 text-center text-xs text-stone-500 font-mono">1</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          Design files per project
                        </td>
                        <td className="p-4 text-center text-xs text-stone-500 font-mono">3</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          Pages per design file
                        </td>
                        <td className="p-4 text-center text-xs text-stone-500 font-mono">3</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          Whiteboard files per project
                        </td>
                        <td className="p-4 text-center text-xs text-stone-500 font-mono">3</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                        <td className="p-4 text-center text-xs text-stone-855 font-bold font-mono">Unlimited</td>
                      </tr>
                    </>
                  )}


                  {/* CATEGORY 2: SMART DELIVERY FEATURES */}
                  <tr className="bg-stone-50/80 border-b border-stone-200 cursor-pointer select-none" onClick={() => setIsSmartDeliveryExpanded(!isSmartDeliveryExpanded)}>
                    <td colSpan={5} className="p-4 text-xs font-bold text-neutral-950 flex items-center justify-between">
                      <span className="flex items-center gap-2 uppercase tracking-widest text-[10px] text-stone-600">
                        <Zap className="w-3.5 h-3.5 text-[#019cda] animate-pulse" />
                        Smart Delivery
                      </span>
                      <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${isSmartDeliveryExpanded ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>

                  {isSmartDeliveryExpanded && (
                    <>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          Dev view
                        </td>
                        <td className="p-4 text-center text-xs text-stone-400 font-mono">&mdash;</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          AI in design editor
                        </td>
                        <td className="p-4 text-center text-xs text-stone-400 font-mono">&mdash;</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          <div className="flex items-center gap-1.5">
                            D2C (Design to Code)
                            <Info className="w-3 h-3 text-stone-400 cursor-help" title="Convert sketch wireframes directly into code" />
                          </div>
                        </td>
                        <td className="p-4 text-center text-xs text-stone-400 font-mono">&mdash;</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                      </tr>
                    </>
                  )}


                  {/* CATEGORY 3: SECURITY & SUPPORT */}
                  <tr className="bg-stone-50/80 border-b border-stone-200 cursor-pointer select-none" onClick={() => setIsSecuritySupportExpanded(!isSecuritySupportExpanded)}>
                    <td colSpan={5} className="p-4 text-xs font-bold text-neutral-950 flex items-center justify-between">
                      <span className="flex items-center gap-2 uppercase tracking-widest text-[10px] text-stone-600">
                        <Shield className="w-3.5 h-3.5 text-indigo-500" />
                        Security &amp; Support SLA
                      </span>
                      <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${isSecuritySupportExpanded ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>

                  {isSecuritySupportExpanded && (
                    <>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          Custom domain mapping
                        </td>
                        <td className="p-4 text-center text-xs text-stone-400 font-mono">&mdash;</td>
                        <td className="p-4 text-center text-xs text-stone-400 font-mono">&mdash;</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          SSO Integration
                        </td>
                        <td className="p-4 text-center text-xs text-stone-400 font-mono">&mdash;</td>
                        <td className="p-4 text-center text-xs text-stone-400 font-mono">&mdash;</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                        <td className="p-4 text-center text-xs text-emerald-600 font-bold font-sans">✓</td>
                      </tr>
                      <tr className="border-b border-stone-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 text-xs text-neutral-750 font-medium pl-6">
                          Support Response SLA
                        </td>
                        <td className="p-4 text-center text-xs text-stone-500 font-medium">Community Forums</td>
                        <td className="p-4 text-center text-xs text-stone-800 font-semibold font-mono">12h Email support</td>
                        <td className="p-4 text-center text-xs text-indigo-900 font-bold font-mono">24/7 Dedicated Priority</td>
                        <td className="p-4 text-center text-xs text-indigo-950 font-bold font-mono">Custom Onsite Engineer</td>
                      </tr>
                    </>
                  )}

                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* --- THE CORE WORKSPACE TERMINAL (THE LIVE DEMO SANDBOX!) --- */}
      <section className="px-4 md:px-8 py-16 max-w-7xl mx-auto flex flex-col gap-8 scroll-mt-20 z-10" id="sandbox-terminal">
        
        {/* Core Title matching clean light-mode spacing */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-violet-600 rounded-full animate-pulse"></span>
              Live Interactive Playground
            </span>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-neutral-900 tracking-tight">
              Test Workspace Hub directly inside our canvas
            </h3>
            <p className="text-neutral-500 text-xs md:text-sm mt-1 max-w-2xl">
              This is the fully integrated single-view application. Try adding tasks, moving statuses, configuring Pomodoro presets, and testing local notes saving.
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

        {/* The high-fidelity Browser bezel surrounding the Sandbox */}
        <div className="w-full bg-white rounded-3xl border-8 border-neutral-900/10 shadow-2xl relative overflow-hidden custom-shadow" id="dashboard-browser-bezel">
          
          {/* Mock collaborative cursors floating on browser workspace as shown in Pixso's image */}
          {showCursors && (
            <>
              {/* Cursor 1: Roi */}
              <div className="absolute top-28 left-1/4 z-30 pointer-events-none select-none animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-1">
                  <MousePointer className="w-4 h-4 text-violet-600 fill-violet-600" />
                  <span className="bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md font-sans">
                    Roi (Backlog)
                  </span>
                </div>
              </div>

              {/* Cursor 2: Zainab */}
              <div className="absolute bottom-32 right-1/4 z-30 pointer-events-none select-none animate-float" style={{ animationDelay: '3s' }}>
                <div className="flex items-center gap-1">
                  <MousePointer className="w-4 h-4 text-pink-500 fill-pink-500" />
                  <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md font-sans">
                    Zainab (Timer)
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Browser header chrome bar */}
          <div className="w-full bg-neutral-100 flex items-center justify-between px-4 py-3 border-b border-stone-200 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <div className="bg-white px-3 py-1 rounded-md border border-stone-200 text-[10px] text-stone-500 font-mono flex items-center gap-1.5 w-60 sm:w-96 select-all ml-3">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>workspacehub-developer-container:3000</span>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className={`px-2 py-0.5 rounded-full ${style.badgeStyle} font-bold`}>SANDBOX PORT: 3000</span>
              <span className="hidden sm:inline text-neutral-400">• CLIENT ENVIRONMENT</span>
            </div>
          </div>

          {/* Embedded studio dashboard contents strictly light-mode Pixso styled */}
          <div className="bg-white p-4 md:p-8 flex flex-col gap-6" id="bezel-inner-app">
            
            {/* Top Workspace Header Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              
              {/* Brand and clocks panel */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between gap-5 shadow-sm relative group">
                <div className="absolute top-0 right-0 p-2 pr-3 mt-1.5 pointer-events-none">
                  <Sparkles className={`w-12 h-12 ${style.accentText} opacity-10 animate-pulse`} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-xl ${style.accentBgLight} ${style.accentText}`}>
                      <Monitor className="w-4.5 h-4.5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 font-display">Workspace Hub</h4>
                      <p className="text-[10px] text-neutral-400 font-mono tracking-tight">Active Client Sandbox</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${style.badgeStyle} flex items-center gap-1.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.accentBg} animate-ping`}></span>
                    LIVE STATE
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-3xl font-mono font-bold tracking-tight text-neutral-900 block">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="text-neutral-500 text-[11px] font-medium mt-0.5">
                      {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-neutral-400 font-mono">TIMEZONE</div>
                    <div className="text-[10px] font-bold text-neutral-700 font-mono uppercase tracking-wider">
                      {Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'UTC'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Central diagnostic scoreboard metrics */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 grid grid-cols-3 gap-4 items-center justify-between shadow-sm">
                
                {/* Metric 1 */}
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 hover:border-violet-200 transition-colors group">
                  <div className="w-8.5 h-8.5 rounded-full bg-violet-100/40 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Flame className="w-4.5 h-4.5 text-violet-600" />
                  </div>
                  <span className="text-[10px] text-neutral-500 font-semibold tracking-wide">Daily Streak</span>
                  <span className="text-base font-bold text-neutral-900 mt-0.5 font-mono tracking-tight">{stats.streakDays} <span className="text-[9px] text-neutral-400 font-sans">Days</span></span>
                </div>

                {/* Metric 2 */}
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 hover:border-emerald-200 transition-colors group">
                  <div className="w-8.5 h-8.5 rounded-full bg-emerald-100/40 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] text-neutral-500 font-semibold tracking-wide">Completed</span>
                  <span className="text-base font-bold text-neutral-900 mt-0.5 font-mono tracking-tight">{stats.completedToday} <span className="text-[9px] text-neutral-400 font-sans">Tasks</span></span>
                </div>

                {/* Metric 3 */}
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 hover:border-cyan-200 transition-colors group">
                  <div className="w-8.5 h-8.5 rounded-full bg-cyan-100/40 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Clock className="w-4.5 h-4.5 text-cyan-600" />
                  </div>
                  <span className="text-[10px] text-neutral-500 font-semibold tracking-wide">Focus Mins</span>
                  <span className="text-base font-bold text-neutral-900 mt-0.5 font-mono tracking-tight">{stats.focusMinutes} <span className="text-[9px] text-neutral-400 font-sans">Mins</span></span>
                </div>

              </div>

              {/* Dynamic atmospheric terminal quotes panel */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 pr-3 mt-1 pointer-events-none opacity-5">
                  <Sparkles className="w-16 h-16 text-violet-500" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-spin" /> Wisdom Engine
                </div>

                <div className="my-2 min-h-[3rem] flex items-center">
                  <p className="text-neutral-700 italic text-xs leading-relaxed font-medium">
                    &ldquo;{QUOTES[quoteIndex]}&rdquo;
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-[9px] text-neutral-400 font-mono">
                  <span>Client rotation interval active</span>
                  <button 
                    onClick={() => {
                      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
                      showToast("🌟 Ambient quotes updated!");
                    }}
                    className="hover:text-neutral-800 font-bold tracking-wide transition-colors flex items-center gap-1"
                  >
                    ROTATE <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* Main Application Bento Grid split: left (timer + graph), right (kanban tasks + notes) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* LEFT COLUMN: TIMER & VECTOR CURVES */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Timing controls */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between relative" id="dashboard-workspace-timer">
                  <div className="w-full flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                    <span className="text-xs font-bold text-neutral-800 tracking-wide flex items-center gap-2">
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
                              ? `${style.badgeStyle} ring-1 ring-violet-200`
                              : 'text-neutral-400 hover:text-neutral-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Circle timing clock graphics */}
                  <div className="relative my-3 flex items-center justify-center">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="45"
                        className="stroke-neutral-100 fill-none"
                        strokeWidth="5"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="45"
                        className="stroke-violet-600 fill-none transition-all duration-300"
                        strokeWidth="5"
                        strokeDasharray="282.74"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    <div className="absolute text-center">
                      <div className={`text-3xl font-mono font-bold tracking-tight text-neutral-900 ${isTimerRunning ? 'animate-pulse' : ''}`}>
                        {formatTime(timeLeft)}
                      </div>
                      <div className="text-[8px] text-gray-400 tracking-widest font-semibold uppercase mt-0.5">
                        {isTimerRunning ? 'COUNTING DOWN' : 'PAUSED'}
                      </div>
                    </div>
                  </div>

                  {/* Trigger operators */}
                  <div className="flex items-center justify-center gap-2 w-full mt-2 pt-3 border-t border-stone-100">
                    <button
                      onClick={() => {
                        setIsTimerRunning(!isTimerRunning);
                        showToast(isTimerRunning ? "⏸️ Session paused" : "🚀 Focus countdown started!");
                      }}
                      className="flex-grow py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs tracking-wider uppercase transition-all shadow active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isTimerRunning ? 'Pause countdown' : 'Trigger Time'}
                    </button>
                    <button
                      onClick={() => {
                        setIsTimerRunning(false);
                        applyPreset(timerPreset);
                        showToast("🕐 Timing block restarted to defaults.");
                      }}
                      className="p-2 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                      title="Reset countdown preset"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* SVG Visual accomplishments wave curve */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between" id="dashboard-productivity-diagnostics">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-3 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800">Diagnostics Amplitude Wave</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Plots coordinates dynamically based on task goals ratio</p>
                    </div>
                    <TrendingUp className="w-4 h-4 text-violet-600 animate-pulse-soft" />
                  </div>

                  <div className="h-28 w-full mt-1 relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="violetCurveGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* reference grid lines */}
                      <line x1="0" y1="45" x2="100" y2="45" className="stroke-stone-200/80" strokeWidth="0.75" strokeDasharray="2,2" />
                      <line x1="0" y1="25" x2="100" y2="25" className="stroke-stone-200/40" strokeWidth="0.5" />
                      <line x1="0" y1="5" x2="100" y2="5" className="stroke-stone-200/40" strokeWidth="0.5" strokeDasharray="2,2" />

                      {/* dynamic wave visual */}
                      <path
                        d={`M 0,45 L 20,${Math.max(12, 40 - stats.completedToday * 0.8)} L 45,28 L 70,${Math.max(8, 36 - stats.completedToday * 2)} L 100,${Math.max(5, 45 - stats.completedToday * 4.2)} L 100,45 Z`}
                        fill="url(#violetCurveGradient)"
                        className="transition-all duration-700"
                      />

                      <path
                        d={`M 0,45 L 20,${Math.max(12, 40 - stats.completedToday * 0.8)} L 45,28 L 70,${Math.max(8, 36 - stats.completedToday * 2)} L 100,${Math.max(5, 45 - stats.completedToday * 4.2)}`}
                        fill="none"
                        className="stroke-violet-600 transition-all duration-700"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />

                      {/* Highlight circles on nodes */}
                      <circle cx="20" cy={Math.max(12, 40 - stats.completedToday * 0.8)} r="2" className="fill-white stroke-violet-600" strokeWidth="1.5" />
                      <circle cx="70" cy={Math.max(8, 36 - stats.completedToday * 2)} r="2" className="fill-white stroke-violet-600" strokeWidth="1.5" />
                      <circle cx="100" cy={Math.max(5, 45 - stats.completedToday * 4.2)} r="2.5" className="fill-violet-600 stroke-white" strokeWidth="1" />
                    </svg>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mt-2">
                    <span>MON</span>
                    <span>WED</span>
                    <span>FRI</span>
                    <span className="text-violet-600 font-bold">LIVE STREAM</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse"></span>
                      Completed ratio:
                    </span>
                    <span className="font-mono font-bold text-neutral-800">{completedPercent}% achieved</span>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: KANBAN WORKSPACE TASKS & WRITER */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* Milestone Backlog Board */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  
                  {/* Kanban Header bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                        MILESTOMES BACKLOG
                        <span className="text-[10px] bg-neutral-100 text-neutral-500 py-0.5 px-2 rounded-full font-mono font-bold">
                          {activeTasksCount} PENDING
                        </span>
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Prioritize project backlogs and tag deliverables</p>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex items-center gap-2">
                      <select
                        value={taskTagFilter}
                        onChange={(e) => setTaskTagFilter(e.target.value)}
                        className="bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-[11px] text-neutral-700 outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                      >
                        <option value="All">All tags</option>
                        <option value="Design">Design</option>
                        <option value="Build">Build</option>
                        <option value="Learn">Learn</option>
                        <option value="Refuel">Refuel</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Search queries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-[11px] text-neutral-700 outline-none placeholder-neutral-400 focus:ring-1 focus:ring-violet-400 w-28 sm:w-36"
                      />
                    </div>
                  </div>

                  {/* Task creation form panel */}
                  <form onSubmit={handleAddTask} className="bg-neutral-50/60 border border-neutral-100 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex items-stretch gap-2">
                      <input
                        type="text"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder="Capture rapid tasks... (e.g. Draft landing page assets)"
                        className="flex-grow bg-white border border-neutral-200 text-xs px-3 py-2 rounded-lg text-neutral-850 placeholder-neutral-400 outline-none focus:ring-1 focus:ring-violet-400 font-medium"
                      />
                      <button
                        type="submit"
                        className="bg-[#18181b] hover:bg-neutral-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-transform duration-100 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Save task
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] pt-1.5 border-t border-neutral-200/40 text-neutral-400">
                      <div className="flex flex-wrap items-center gap-4">
                        
                        {/* Tags selectors */}
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">Format:</span>
                          {(['Design', 'Build', 'Learn', 'Refuel'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNewTaskTag(t)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                                newTaskTag === t
                                  ? `${style.badgeStyle}`
                                  : 'text-neutral-400 hover:text-neutral-700'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>

                        {/* Priorities selectors */}
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">Type:</span>
                          {(['high', 'medium', 'low'] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setNewTaskPriority(p)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer transition-colors ${
                                newTaskPriority === p
                                  ? 'bg-violet-50 text-violet-600 border border-violet-100'
                                  : 'text-neutral-400 hover:text-neutral-700'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>

                      </div>

                      {/* Targets selectors */}
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">Init Stage:</span>
                        <select
                          value={newTaskCategory}
                          onChange={(e: any) => setNewTaskCategory(e.target.value)}
                          className="bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-[9px] text-neutral-600 focus:outline-none cursor-pointer font-bold"
                        >
                          <option value="Focus">Focus Today</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Accomplished">Accomplished</option>
                        </select>
                      </div>
                    </div>
                  </form>

                  {/* The three distinct columns of layout cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                    
                    {/* Columns 1 */}
                    <div className="bg-neutral-50/40 border border-neutral-100 p-3 rounded-xl flex flex-col gap-2 min-h-[260px]">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
                          Focus Today
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-white border border-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded-full">
                          {filteredTasks.filter(t => t.category === 'Focus').length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 flex-grow overflow-y-auto max-h-[280px]">
                        {filteredTasks.filter(t => t.category === 'Focus').length === 0 ? (
                          <span className="text-center text-[10px] text-neutral-400 my-auto italic">No priority items today.</span>
                        ) : (
                          filteredTasks.filter(t => t.category === 'Focus').map(t => renderBacklogCard(t))
                        )}
                      </div>
                    </div>

                    {/* Columns 2 */}
                    <div className="bg-neutral-50/40 border border-neutral-100 p-3 rounded-xl flex flex-col gap-2 min-h-[260px]">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                        <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                          In Progress
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-white border border-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded-full">
                          {filteredTasks.filter(t => t.category === 'In Progress').length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 flex-grow overflow-y-auto max-h-[280px]">
                        {filteredTasks.filter(t => t.category === 'In Progress').length === 0 ? (
                          <span className="text-center text-[10px] text-neutral-400 my-auto italic">No active works.</span>
                        ) : (
                          filteredTasks.filter(t => t.category === 'In Progress').map(t => renderBacklogCard(t))
                        )}
                      </div>
                    </div>

                    {/* Columns 3 */}
                    <div className="bg-neutral-50/40 border border-neutral-100 p-3 rounded-xl flex flex-col gap-2 min-h-[260px]">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Accomplished
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-white border border-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded-full">
                          {filteredTasks.filter(t => t.category === 'Accomplished').length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 flex-grow overflow-y-auto max-h-[280px]">
                        {filteredTasks.filter(t => t.category === 'Accomplished').length === 0 ? (
                          <span className="text-center text-[10px] text-neutral-400 my-auto italic">Tackle some challenges!</span>
                        ) : (
                          filteredTasks.filter(t => t.category === 'Accomplished').map(t => renderBacklogCard(t))
                        )}
                      </div>
                    </div>

                  </div>

                </div>

                {/* Local drafting note file compiler */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-2.5">
                    <span className="text-xs font-bold text-neutral-800 tracking-wide flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-600" />
                      Continuous Markdown Drafts
                    </span>
                    <div className="text-[10px] font-mono text-neutral-400">
                      <span>{notes.length} chars</span>
                    </div>
                  </div>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-24 bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl p-3 text-xs font-mono text-neutral-750 placeholder-stone-400 leading-relaxed resize-none outline-none focus:ring-1 focus:ring-violet-400 transition-all font-medium"
                    placeholder="Log technical memos, backlog summaries, or code templates..."
                  />

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[11px] text-neutral-400 italic flex items-center gap-1.5 select-none text-violet-700 font-semibold bg-violet-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Directly synced to browser storage
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadNotes}
                      className="bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 border border-neutral-200 py-1.5 px-3 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors select-none"
                    >
                      <Download className="w-3.5 h-3.5" /> Download (.md)
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Bottom simulated chrome ribbon */}
          <div className="w-full bg-neutral-100 flex flex-col sm:flex-row items-center justify-between px-6 py-3 border-t border-stone-200 text-xs text-stone-500">
            <span>&copy; {new Date().getFullYear()} Workspace Hub. Securely compiled offline studio framework.</span>
            <div className="flex items-center gap-3 font-mono text-[10px] text-stone-400 mt-2 sm:mt-0">
              <span>Wite/Vite v5.x</span>
              <span>React v19.x</span>
              <span>Tailwind v4.x</span>
            </div>
          </div>

        </div>

      </section>

      {/* --- EXTENDED FAQS ACCORDION GRID --- */}
      <section className="px-4 md:px-8 py-16 bg-white border-y border-stone-200/60" id="expanded-faqs">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-bold tracking-widest text-violet-600 uppercase">HAVE QUESTIONS?</span>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">Technical Q&amp;A</h3>
            <p className="text-neutral-500 text-xs md:text-sm">
              Answers regarding architecture, browser security, and offline operation formats.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-neutral-50 border border-neutral-200/70 rounded-xl overflow-hidden transition-all duration-250 cursor-pointer"
                  onClick={() => {
                    setExpandedFaq(isExpanded ? null : idx);
                    showToast(`Checked FAQ block: #${idx + 1}`);
                  }}
                >
                  <div className="px-5 py-4 flex items-center justify-between hover:bg-neutral-100/50 transition-colors">
                    <span className="text-xs md:text-sm font-bold text-neutral-900 pr-4">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-4 text-xs text-neutral-500 border-t border-neutral-200/40 pt-3 leading-relaxed bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* --- NEWSLETTER SIGNUP AREA --- */}
      <section className="px-4 md:px-8 py-16 max-w-4xl mx-auto text-center" id="newsletter-signup">
        <div className="bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-700 rounded-3xl p-8 md:p-12 text-white shadow-xl flex flex-col items-center gap-6 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Sparkles className="w-40 h-40" />
          </div>

          <span className="bg-white/10 text-white font-bold text-[10px] tracking-widest px-3 py-1 rounded-full uppercase">
            WEEKLY INSIGHTS
          </span>

          <h3 className="text-xl md:text-3xl font-display font-semibold max-w-xl">
            Keep up with advanced developer templates and custom designs
          </h3>

          <p className="text-violet-100 text-xs md:text-sm max-w-lg leading-relaxed">
            Join 12,000+ builders. Get pristine curated design inspirations, productivity workflows, and offline utility releases directly inside your inbox.
          </p>

          <form onSubmit={handleNewsletter} className="w-full max-w-md flex flex-col sm:flex-row gap-2.5 mt-2 z-10">
            {isSubscribed ? (
              <div className="w-full bg-white/15 p-3 rounded-lg text-xs font-bold text-emerald-250 flex items-center justify-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-300 animate-bounce" /> Subscribed successfully! Welcome onboard.
              </div>
            ) : (
              <>
                <input
                  type="email"
                  required
                  placeholder="Enter your professional email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-grow bg-white text-stone-800 placeholder-stone-400 text-xs px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-violet-400 text-left font-medium"
                />
                <button
                  type="submit"
                  className="bg-[#18181b] hover:bg-neutral-800 text-white font-bold text-xs uppercase px-5 py-3 rounded-lg tracking-wider transition-all"
                >
                  Join now
                </button>
              </>
            )}
          </form>

          <p className="text-[10px] text-violet-200 mt-1">
            Zero spam. Unsubscribe anytime in a single click.
          </p>

        </div>
      </section>

      {/* --- PREMIUM BRAND FOOTER --- */}
      <footer className="bg-white border-t border-stone-200 py-12 px-4 md:px-8" id="pixso-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
          
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-white font-mono font-bold">
              W
            </span>
            <div>
              <p className="font-bold text-neutral-900 text-xs font-display">Workspace Hub</p>
              <p className="text-[10px] text-neutral-400">Prisinte Design Framework</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a href="#hero-banner" className="hover:text-neutral-900 transition-colors">Hero Setup</a>
            <a href="#key-spotlights" className="hover:text-neutral-900 transition-colors">Anatomy Features</a>
            <a href="#sandbox-terminal" className="hover:text-neutral-900 transition-colors text-violet-600 font-semibold">Interactive Demo</a>
            <a href="#expanded-faqs" className="hover:text-neutral-900 transition-colors">Technical Q&As</a>
          </div>

          <div className="text-[11px] font-mono text-neutral-400 text-center md:text-right">
            <p>Node JS Sandbox Environment - Active Port 3000</p>
            <p className="mt-0.5">Designed entirely with pristine client state persistence</p>
          </div>

        </div>
      </footer>

    </div>
  );

  // --- SUB-RENDER COMPONENT FOR BACKLOG LIST CARDS ---
  function renderBacklogCard(task: Task) {
    const isCompleted = task.category === 'Accomplished';
    
    // Tag styling
    const formats = {
      Design: 'bg-violet-50 text-violet-700 border-violet-100',
      Build: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      Learn: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      Refuel: 'bg-rose-50 text-rose-700 border-rose-100'
    };

    // Priority pill tags
    const priorities = {
      high: 'bg-red-500',
      medium: 'bg-amber-500',
      low: 'bg-neutral-300'
    };

    return (
      <div 
        key={task.id} 
        className="bg-white p-3 rounded-xl border border-neutral-200/80 hover:border-violet-300 transition-all font-sans relative flex flex-col gap-2.5 group shadow-sm"
        id={`task-item-${task.id}`}
      >
        <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${priorities[task.priority]}`} />
        
        {/* Task edit or text details */}
        <div className="flex items-start justify-between gap-1.5 pl-1">
          {editingTaskId === task.id ? (
            <textarea
              value={editingTaskText}
              onChange={(e) => setEditingTaskText(e.target.value)}
              className="flex-grow bg-neutral-50 border border-neutral-200 text-xs p-1.5 rounded outline-none focus:ring-1 focus:ring-violet-400 text-neutral-850"
              rows={2}
            />
          ) : (
            <p className={`text-[11.5px] leading-normal font-medium transition-colors ${
              isCompleted ? 'text-neutral-400 line-through' : 'text-neutral-800'
            }`}>
              {task.text}
            </p>
          )}
        </div>

        {/* Task attributes indicators */}
        <div className="flex items-center justify-between text-[9.5px] border-t border-neutral-100/60 pt-2 pl-1 select-none">
          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded border font-bold text-[8.5px] uppercase ${formats[task.tag]}`}>
              {task.tag}
            </span>
            <span className="text-neutral-400 font-mono">
              {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Action Operator shortcuts */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150">
            
            {/* Shifts */}
            {task.category !== 'Focus' && (
              <button
                type="button"
                onClick={() => handleMoveTask(task.id, 'Focus')}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-1 py-0.5 rounded border border-neutral-200 cursor-pointer text-[8px]"
                title="Focus Today"
              >
                Focus
              </button>
            )}

            {task.category !== 'In Progress' && (
              <button
                type="button"
                onClick={() => handleMoveTask(task.id, 'In Progress')}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-1 py-0.5 rounded border border-neutral-200 cursor-pointer text-[8px]"
                title="Work on state"
              >
                Work
              </button>
            )}

            {task.category !== 'Accomplished' && (
              <button
                type="button"
                onClick={() => handleMoveTask(task.id, 'Accomplished')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded border border-emerald-150 cursor-pointer text-[8px] font-bold"
                title="Accomplished milestone"
              >
                Done
              </button>
            )}

            {/* Inline editing checks */}
            {editingTaskId === task.id ? (
              <button
                type="button"
                onClick={saveEditing}
                className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                title="Save detailed modifications"
              >
                <Check className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startEditing(task)}
                className="p-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded cursor-pointer"
                title="Edit task text"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDeleteTask(task.id)}
              className="p-1 bg-neutral-100 hover:bg-rose-100 text-neutral-500 hover:text-rose-600 rounded cursor-pointer"
              title="Delete task from list"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>

          </div>

        </div>

      </div>
    );
  }
}

// Sub-component for Concept Spotlight Diagram
interface BoxHighlightProps {
  activeTab: 'backlog' | 'session' | 'live-analytics' | 'notepad';
  theme: any;
}

function BoxHighlight({ activeTab, theme }: BoxHighlightProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Dynamic vector backdrop rotation mapping each selected tab */}
      <div className={`w-32 h-32 rounded-3xl opacity-20 blur-xl absolute transition-all duration-300 ${
        activeTab === 'backlog' ? 'bg-violet-500' :
        activeTab === 'session' ? 'bg-rose-500' :
        activeTab === 'live-analytics' ? 'bg-cyan-500' : 'bg-amber-500'
      }`} />
      
      {activeTab === 'backlog' && <Layout className="w-16 h-16 text-violet-600 animate-bounce" />}
      {activeTab === 'session' && <Clock className="w-16 h-16 text-rose-500 animate-spin" style={{ animationDuration: '40s' }} />}
      {activeTab === 'live-analytics' && <TrendingUp className="w-16 h-16 text-cyan-500 animate-pulse" />}
      {activeTab === 'notepad' && <FileText className="w-16 h-16 text-amber-500 animate-float" />}
    </div>
  );
}
