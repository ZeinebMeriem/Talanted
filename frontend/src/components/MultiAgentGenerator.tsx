import React, { useState, ReactNode, useRef, useEffect } from 'react';
import {
  ChevronLeft, Layers, Folder, Search, Sparkles, X,
  Send, TrendingUp, ArrowRight, FileText,
  FolderOpen, Link2, UserPlus, Bot, Zap,
  RotateCcw, ChevronDown, Copy, Maximize2, Trash2,
} from 'lucide-react';
import { useTed } from '../hooks/useTed';

export type IDETab = 'preview' | 'code' | 'quality' | 'accessibility';
export type RightTab = 'chat' | 'versions' | 'meeting';

export interface MultiAgentGeneratorProps {
  appName: string;
  onBackToDashboard: () => void;
  fileExplorer?: ReactNode;
  fileCount?: number;
  centerTab?: IDETab;
  setCenterTab?: (t: IDETab) => void;
  centerContent?: { preview: ReactNode; code: ReactNode; quality: ReactNode; accessibility: ReactNode; };
  rightTab?: RightTab;
  setRightTab?: (t: RightTab) => void;
  hasMeetingTab?: boolean;
  rightContent?: { chat: ReactNode; versions: ReactNode; meeting?: ReactNode; };
  rightHeader?: ReactNode;
  isTedOpen?: boolean;
  onTedOpen?: () => void;
  onTedClose?: () => void;
  tedAccessToken?: string;
  tedGenerationId?: string;
  tedCurrentFile?: string;
  tedFileContent?: string;
  tedAllFiles?: Array<{path: string; content: string}>;
  onTedFileApplied?: () => void;
  shareToken?: string | null;
  shareLink?: string;
  isSharing?: boolean;
  onShareCreate?: () => void;
  onRevoke?: () => void;
  onInspect?: () => void;
  inspectMode?: boolean;
  onZip?: () => void;
  onGitlab?: () => void;
  onDeploy?: () => void;
  onMeeting?: () => void;
  isAdmin?: boolean;
  modals?: ReactNode;
}

const MOCK_FILES: Record<string, string> = {
  'avatar.tsx': `import React from 'react';\n\nexport function Avatar({ fallback }: { fallback: string }) {\n  return (\n    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">\n      <span className="font-semibold text-stone-600 uppercase text-sm">{fallback}</span>\n    </div>\n  );\n}`,
  'button.tsx': `import React from 'react';\n\nexport function Button({ children, variant = 'primary', ...props }: any) {\n  const cls = variant === 'primary'\n    ? 'bg-violet-600 hover:bg-violet-700 text-white'\n    : 'bg-stone-100 hover:bg-stone-200 text-stone-800';\n  return (\n    <button className={\`px-4 py-2 rounded-xl text-xs font-bold \${cls}\`} {...props}>\n      {children}\n    </button>\n  );\n}`,
  'card.tsx': `import React from 'react';\n\nexport function Card({ children, className = '' }: any) {\n  return (\n    <div className={\`bg-white border border-stone-200 p-5 rounded-2xl shadow-xs \${className}\`}>\n      {children}\n    </div>\n  );\n}`,
};

const WCAG_CHECKS = [
  { id: 'contrast', label: 'Color contrast ratio AA',  status: 'pass', score: '4.8:1', note: 'Meets AA standard' },
  { id: 'headings', label: 'Heading hierarchy',        status: 'pass', score: '100%',  note: 'H1 → H2 → H3 preserved' },
  { id: 'alt-text', label: 'Image alt attributes',     status: 'warn', score: '83%',   note: '2 images missing alt' },
  { id: 'focus',    label: 'Keyboard focus indicators',status: 'pass', score: '100%',  note: 'All elements have focus ring' },
  { id: 'aria',     label: 'ARIA roles & labels',      status: 'pass', score: '96%',   note: 'Modals have aria-labelledby' },
  { id: 'color',    label: 'Info not by color alone',  status: 'fail', score: '75%',   note: 'Error states need icons' },
];

const COHORT_AGENTS = [
  { name: 'Requirements Agent',   status: 'running', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', task: 'Extracting UI specs…'  },
  { name: 'Code Generator Synth', status: 'running', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', task: 'Generating components…' },
  { name: 'WCAG Compliance',      status: 'idle',    color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', task: 'Awaiting code output'   },
];

export default function MultiAgentGenerator({
  appName, onBackToDashboard,
  fileExplorer, fileCount,
  centerTab: externalCenterTab, setCenterTab: externalSetCenterTab,
  centerContent,
  rightTab: externalRightTab, setRightTab: externalSetRightTab,
  hasMeetingTab, rightContent, rightHeader,
  isTedOpen: externalTedOpen, onTedOpen, onTedClose,
  tedAccessToken, tedGenerationId, tedCurrentFile, tedFileContent, tedAllFiles, onTedFileApplied,
  shareToken, shareLink, isSharing = false, onShareCreate, onRevoke,
  onInspect, inspectMode = false,
  onZip, onGitlab, onDeploy, onMeeting,
  isAdmin, modals,
}: MultiAgentGeneratorProps) {

  const [_centerTab, _setCenterTab] = useState<IDETab>('preview');
  const [_rightTab,  _setRightTab]  = useState<RightTab>('chat');
  const [_tedOpen,   _setTedOpen]   = useState(false);

  const centerTab    = externalCenterTab    ?? _centerTab;
  const setCenterTab = externalSetCenterTab ?? _setCenterTab;
  const rightTab     = externalRightTab     ?? _rightTab;
  const setRightTab  = externalSetRightTab  ?? _setRightTab;
  const tedOpen      = externalTedOpen      ?? _tedOpen;
  const openTed      = onTedOpen            ?? (() => _setTedOpen(true));
  const closeTed     = onTedClose           ?? (() => _setTedOpen(false));

  const ted = useTed({ accessToken: tedAccessToken, enabled: tedOpen, generationId: tedGenerationId });
  const tedInputRef  = useRef<HTMLInputElement>(null);
  const tedScrollRef = useRef<HTMLDivElement>(null);
  const [tedTypedInput, setTedTypedInput] = useState('');
  const [tedDiagTab,    setTedDiagTab]    = useState<'chat' | 'diag'>('chat');
  const [codeCopied,    setCodeCopied]    = useState(false);
  const [prettyPrint,   setPrettyPrint]   = useState(false);
  const [applyingBlock, setApplyingBlock] = useState<string | null>(null);

  // Sync project context into TED whenever TED opens or current file changes
  useEffect(() => {
    if (!tedOpen) return;
    ted.updateContext({
      generationId: tedGenerationId,
      currentFile: tedCurrentFile,
      fileContent: tedFileContent,
      allFiles: tedAllFiles,
      action: 'previewing',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tedOpen, tedGenerationId, tedCurrentFile]);

  useEffect(() => { if (tedOpen) setTimeout(() => tedInputRef.current?.focus(), 100) }, [tedOpen]);
  useEffect(() => { tedScrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [ted.messages]);

  const sendTedMsg = () => {
    if (!tedTypedInput.trim() || ted.isLoading) return;
    ted.sendMessage(tedTypedInput);
    setTedTypedInput('');
  };

  /** Parse a TED message into text and code-block segments */
  function parseTedSegments(text: string): Array<{ type: 'text' | 'code'; content: string; lang?: string }> {
    const out: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
    const re = /```(\w*)\n?([\s\S]*?)```/g;
    let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ type: 'text', content: text.slice(last, m.index) });
      out.push({ type: 'code', lang: m[1] || 'code', content: m[2].trim() });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ type: 'text', content: text.slice(last) });
    return out;
  }

  function extractTedFilePath(text: string): string | null {
    const m = text.match(/(?:File|Fichier)\s*:\s*[`']?([\w./\-]+\.(?:tsx?|py|jsx?|css|json))[`']?/i);
    return m ? m[1] : null;
  }

  const handleTedApply = async (code: string, filePath: string, blockKey: string) => {
    if (!tedGenerationId || !tedAccessToken) return;
    setApplyingBlock(blockKey);
    await ted.applyToCode(
      { id: blockKey, title: 'Apply code', description: '', icon: '⚡', action: '', file: filePath,
        instruction: `Apply this exact code to the file:\n\n\`\`\`\n${code}\n\`\`\`` },
      tedGenerationId,
      onTedFileApplied,
    );
    setApplyingBlock(null);
  };

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inviteEmail,    setInviteEmail]    = useState('');
  const [inviteRole,     setInviteRole]     = useState('Editor');
  const [shareCopied,    setShareCopied]    = useState(false);
  const activeLinkOrCode = shareToken ? (shareLink ?? `${window.location.origin}/share/${shareToken}`) : '';
  const activeCode       = shareToken ? shareToken.slice(-5) : '';

  const copyShareLink = () => {
    if (!activeLinkOrCode) return;
    navigator.clipboard.writeText(activeLinkOrCode).then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) });
  };

  const [leftOpen,  setLeftOpen]  = useState(true);
  const [fullPreview, setFullPreview] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [gaugeValue,    setGaugeValue]    = useState(72);
  const [selectedFile,  setSelectedFile]  = useState('button.tsx');
  const [expandFolders, setExpandFolders] = useState({ src: true, components: true, ui: true });
  const [chatInput,     setChatInput]     = useState('');
  const [localMsgs,     setLocalMsgs]     = useState<{ sender: 'user' | 'assistant'; text: string; ts: string }[]>([
    { sender: 'assistant', text: "Hello! Our 11-agent pipeline has successfully generated your initial layout. What would you like to edit next?", ts: '10:14 AM' },
  ]);

  const sendLocal = () => {
    if (!chatInput.trim()) return;
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setLocalMsgs(p => [...p,
      { sender: 'user',      text: chatInput,                                               ts },
      { sender: 'assistant', text: `Processing: "${chatInput}". Regenerating affected zones...`, ts },
    ]);
    setChatInput('');
  };

  const colSpan = leftOpen && rightOpen ? 'lg:col-span-6'
    : (leftOpen || rightOpen)           ? 'lg:col-span-9'
    :                                     'lg:col-span-12';

  const TAB_ACCENT: Record<IDETab, string> = {
    preview: '#3b82f6', code: '#f59e0b', quality: '#10b981', accessibility: '#7c3aed',
  };

  /* ── file explorer ──────────────────────────────────────────── */
  const MOCK_EXTRA_FILES = ['checkbox.tsx','dialog.tsx','dropdown-menu.tsx','input.tsx','label.tsx','progress.tsx','scroll-area.tsx','select.tsx'];
  const allMockFiles = [...Object.keys(MOCK_FILES), ...MOCK_EXTRA_FILES];

  const extBadge: Record<string, { text: string; color: string; bg: string }> = {
    tsx:  { text:'TSX',  color:'#3b82f6', bg:'#eff6ff' },
    ts:   { text:'TS',   color:'#7c3aed', bg:'#f5f3ff' },
    css:  { text:'CSS',  color:'#ec4899', bg:'#fdf2f8' },
    json: { text:'JSON', color:'#f59e0b', bg:'#fffbeb' },
    js:   { text:'JS',   color:'#f59e0b', bg:'#fffbeb' },
  };

  const FolderRow = ({ label, depth=0, open, onToggle }: { label:string; depth?:number; open:boolean; onToggle:()=>void }) => (
    <div onClick={onToggle} style={{ paddingLeft:10+depth*14, paddingRight:8, paddingTop:4, paddingBottom:4, display:'flex', alignItems:'center', gap:6, cursor:'pointer', borderRadius:6, userSelect:'none' }}
      onMouseEnter={e=>(e.currentTarget.style.background='#f1f5f9')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
      <svg style={{ width:10, height:10, color:'#94a3b8', flexShrink:0, transform:open?'rotate(90deg)':'', transition:'transform .15s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      {open ? <FolderOpen style={{ width:13, height:13, color:'#f59e0b', flexShrink:0 }}/> : <Folder style={{ width:13, height:13, color:'#94a3b8', flexShrink:0 }}/>}
      <span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>{label}</span>
    </div>
  );

  const FileRow = ({ name, depth=0, ext='tsx' }: { name:string; depth?:number; ext?:string }) => {
    const active = selectedFile === name;
    const b = extBadge[ext] ?? { text:ext.toUpperCase(), color:'#64748b', bg:'#f8fafc' };
    return (
      <div onClick={() => { setSelectedFile(name); setCenterTab('code') }}
        style={{ paddingLeft:14+depth*14, paddingRight:8, paddingTop:4, paddingBottom:4, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', borderRadius:6, background:active?'#1e293b':'transparent', transition:'all .12s' }}
        onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='#f1f5f9' }}
        onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent' }}>
        <span style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
          <FileText style={{ width:12, height:12, flexShrink:0, color:active?'#93c5fd':'#cbd5e1' }}/>
          <span style={{ fontSize:11, fontWeight:active?700:500, color:active?'#fff':'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
        </span>
        <span style={{ fontSize:8, fontWeight:700, fontFamily:'monospace', padding:'1px 5px', borderRadius:4, border:`1px solid ${active?'rgba(147,197,253,.3)':b.color+'33'}`, color:active?'#93c5fd':b.color, background:active?'rgba(59,130,246,.2)':b.bg, flexShrink:0, marginLeft:4 }}>
          {active?ext.toUpperCase():b.text}
        </span>
      </div>
    );
  };

  const MockFileExplorer = (
    <div style={{ padding:'2px 4px' }}>
      <FolderRow label="src" depth={0} open={expandFolders.src} onToggle={()=>setExpandFolders(p=>({...p,src:!p.src}))}/>
      {expandFolders.src && <>
        <FolderRow label="components" depth={1} open={expandFolders.components} onToggle={()=>setExpandFolders(p=>({...p,components:!p.components}))}/>
        {expandFolders.components && <>
          <FolderRow label="ui" depth={2} open={expandFolders.ui} onToggle={()=>setExpandFolders(p=>({...p,ui:!p.ui}))}/>
          {expandFolders.ui && allMockFiles.map(f=><FileRow key={f} name={f} depth={3} ext="tsx"/>)}
        </>}
      </>}
    </div>
  );

  /* ── JSX syntax highlighter ──────────────────────────────── */
  type SynToken = { text: string; color: string };
  const SYN = {
    keyword : '#ff6b9d',  // export function return const
    tag     : '#ff6b9d',  // <Component  </div>  />  >
    attr    : '#4ecdc4',  // className= onClick=
    string  : '#a8ff8a',  // "value"
    expr    : '#ffd93d',  // {expression}
    comment : '#636e7b',
    number  : '#ffd93d',
    plain   : '#e2e8f0',
  };
  const KEYWORDS = /^(export|default|function|return|const|let|var|import|from|async|await|if|else|class|interface|type|new|this|extends)$/;

  const tokenizeLine = (raw: string): SynToken[] => {
    if (/^\s*(\/\/|\/\*)/.test(raw)) return [{ text: raw, color: SYN.comment }];
    const tokens: SynToken[] = [];
    // regex: strings | {expr} | </tag or <tag | > or /> | keyword word | attr=
    const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\{[^{}]*\}|<\/?[A-Za-z][A-Za-z0-9.]*|\/?>|>|\b(?:export|default|function|return|const|let|var|import|from|async|await|if|else|class|interface|type|new|this|extends)\b|[A-Za-z_$][A-Za-z0-9_$]*(?=\s*=))/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      if (m.index > last) tokens.push({ text: raw.slice(last, m.index), color: SYN.plain });
      const t = m[0];
      let c = SYN.plain;
      if (/^(".*"|'.*'|`.*`)$/.test(t))                      c = SYN.string;
      else if (/^\{/.test(t))                                  c = SYN.expr;
      else if (/^<\/?[A-Za-z]/.test(t))                       c = SYN.tag;
      else if (/^(\/?>|>)$/.test(t))                          c = SYN.tag;
      else if (KEYWORDS.test(t))                               c = SYN.keyword;
      else                                                     c = SYN.attr;   // matched attr= pattern
      tokens.push({ text: t, color: c });
      last = m.index + t.length;
    }
    if (last < raw.length) tokens.push({ text: raw.slice(last), color: SYN.plain });
    return tokens.length ? tokens : [{ text: raw, color: SYN.plain }];
  };

  const MockCode = (
    <div style={{ width:'100%', background:'#1a1b2e', fontFamily:"'Fira Code','JetBrains Mono','Cascadia Code',monospace", fontSize:12.5, lineHeight:1.75, color:SYN.plain }}>
      {/* ── toolbar (matches screenshot exactly) ── */}
      <div style={{ display:'flex', alignItems:'center', padding:'10px 16px', background:'#13141f', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        {/* single yellow dot */}
        <div style={{ width:11, height:11, borderRadius:'50%', background:'#f59e0b', flexShrink:0, marginRight:12 }}/>
        {/* filepath */}
        <span style={{ flex:1, fontSize:12, color:'rgba(255,255,255,.75)', fontFamily:"'Fira Code','JetBrains Mono',monospace", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          src/components/{selectedFile}
        </span>
        {/* utility controls */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:12 }}>
          <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:10, color:'rgba(255,255,255,.35)', userSelect:'none' }}>
            <input type="checkbox" checked={prettyPrint} onChange={e=>setPrettyPrint(e.target.checked)} style={{ accentColor:'#7c3aed', width:11, height:11 }}/>
            Pretty-print
          </label>
          <button onClick={()=>{ navigator.clipboard.writeText(MOCK_FILES[selectedFile]||''); setCodeCopied(true); setTimeout(()=>setCodeCopied(false),1500) }}
            style={{ padding:'6px 14px', borderRadius:8, background:codeCopied?'#10b981':'#fff', color:codeCopied?'#fff':'#111', fontSize:11, fontWeight:700, border:'none', cursor:'pointer', transition:'all .2s', boxShadow:'0 1px 4px rgba(0,0,0,.3)', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <Copy style={{ width:11, height:11 }}/>{codeCopied?'Copied!':'Copy Code'}
          </button>
          <button style={{ padding:'6px 10px', borderRadius:8, background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, border:'1px solid rgba(255,255,255,.1)', cursor:'pointer', transition:'all .15s', display:'flex', alignItems:'center', gap:4 }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.12)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,.07)')}>
            <Maximize2 style={{ width:11, height:11 }}/>
          </button>
          <button style={{ padding:'6px 10px', borderRadius:8, background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700, border:'1px solid rgba(255,255,255,.1)', cursor:'pointer', transition:'all .15s', display:'flex', alignItems:'center', gap:4 }}
            onMouseEnter={e=>(e.currentTarget.style.color='#ef4444')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.5)')}>
            <Trash2 style={{ width:11, height:11 }}/>
          </button>
        </div>
      </div>
      {/* ── code lines ── */}
      <div style={{ overflowX:'auto', padding:'14px 0 20px' }}>
        {(MOCK_FILES[selectedFile]||'').split('\n').map((line,i)=>(
          <div key={i} style={{ display:'flex', transition:'background .1s' }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.03)')}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <span style={{ width:44, textAlign:'right', paddingRight:16, color:'rgba(255,255,255,.2)', fontSize:11, fontFamily:'monospace', userSelect:'none', flexShrink:0, borderRight:'1px solid rgba(255,255,255,.06)', marginRight:16, lineHeight:1.75 }}>{i+1}</span>
            <span>
              {tokenizeLine(line).map((tok,j)=>(
                <span key={j} style={{ color:tok.color }}>{tok.text}</span>
              ))}
              {line===''&&' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const MockPreview = (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:16, borderBottom:'1px solid #f1f5f9', marginBottom:16 }}>
        <div>
          <p style={{ fontSize:9, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.12em', color:'#94a3b8', fontWeight:800, margin:'0 0 3px' }}>App Active Iframe Preview</p>
          <h2 style={{ fontSize:14, fontWeight:800, color:'#0f172a', margin:0 }}>{appName} Live</h2>
        </div>
        <span style={{ background:'#f0fdf4', color:'#16a34a', fontSize:9, padding:'3px 10px', borderRadius:20, fontWeight:800, border:'1px solid #bbf7d0', fontFamily:'monospace', textTransform:'uppercase' }}>Active Pipeline</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div style={{ padding:16, border:'1px solid #e2e8f0', borderRadius:12, background:'#f0fdf4' }}>
          <span style={{ fontSize:9, textTransform:'uppercase', fontWeight:800, color:'#94a3b8', display:'block' }}>Sales Volume</span>
          <span style={{ fontSize:24, fontWeight:900, color:'#0f172a', display:'block', marginTop:4 }}>$127,840</span>
          <span style={{ fontSize:10, color:'#16a34a', fontWeight:700, display:'flex', alignItems:'center', gap:3, marginTop:3 }}><TrendingUp style={{ width:11, height:11 }}/> +12%</span>
        </div>
        <div style={{ padding:16, border:'1px solid #e2e8f0', borderRadius:12, background:'#f5f3ff' }}>
          <span style={{ fontSize:9, textTransform:'uppercase', fontWeight:800, color:'#7c3aed', display:'block' }}>Active Orders</span>
          <span style={{ fontSize:24, fontWeight:900, color:'#0f172a', display:'block', marginTop:4 }}>1,489</span>
          <span style={{ fontSize:10, color:'#94a3b8', display:'block', marginTop:3 }}>Simulated locally</span>
        </div>
      </div>
      <div style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:14, background:'#fafafa', marginBottom:12 }}>
        <span style={{ fontSize:9, textTransform:'uppercase', fontWeight:800, color:'#94a3b8', display:'block', marginBottom:8 }}>Scale Gauge</span>
        <input type="range" min={0} max={100} value={gaugeValue} onChange={e=>setGaugeValue(Number(e.target.value))} style={{ width:'100%', accentColor:'#7c3aed' }}/>
        <span style={{ fontSize:10, color:'#64748b', marginTop:6, display:'block' }}>Current: <strong>{gaugeValue}%</strong> — {gaugeValue<33?'Low':gaugeValue<66?'Medium':'Peak'}</span>
      </div>
      <button style={{ width:'100%', padding:'11px 0', background:'#7c3aed', color:'#fff', fontWeight:800, fontSize:13, borderRadius:12, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        Trigger Payment Simulation<ArrowRight style={{ width:14, height:14 }}/>
      </button>
    </div>
  );

  const MockQuality = (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:14, borderBottom:'1px solid #f1f5f9' }}>
        <h4 style={{ fontSize:10, fontFamily:'monospace', textTransform:'uppercase', color:'#94a3b8', fontWeight:800, margin:0 }}>Diagnostic Metrics</h4>
        <span style={{ background:'#f0fdf4', color:'#16a34a', fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:800, border:'1px solid #bbf7d0' }}>98% PASSED</span>
      </div>
      {[{l:'Figma Design Compliance',v:98},{l:'Requirements Mapping',v:96},{l:'TypeScript Strict Mode',v:100},{l:'Bundle Optimization',v:94}].map(({l,v})=>(
        <div key={l} style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
            <span style={{ fontWeight:600, color:'#374151' }}>{l}</span>
            <span style={{ fontWeight:800, color:'#0f172a' }}>{v}%</span>
          </div>
          <div style={{ background:'#f1f5f9', height:6, borderRadius:99, overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(90deg,#7c3aed,#a855f7)', height:'100%', borderRadius:99, width:`${v}%` }}/>
          </div>
        </div>
      ))}
    </div>
  );

  const MockAccessibility = (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, paddingBottom:14, borderBottom:'1px solid #f1f5f9' }}>
        <div>
          <span style={{ fontSize:9, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.12em', color:'#94a3b8', fontWeight:800, display:'block' }}>WCAG 2.1 AA</span>
          <h3 style={{ fontSize:14, fontWeight:800, color:'#0f172a', margin:'4px 0 0' }}>Accessibility results</h3>
        </div>
        <span style={{ background:'#fffbeb', color:'#b45309', fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:800, border:'1px solid #fde68a' }}>83% PASS</span>
      </div>
      {WCAG_CHECKS.map(c=>(
        <div key={c.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:11, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, marginBottom:7 }}>
          <span style={{ fontSize:14, color:c.status==='pass'?'#16a34a':c.status==='warn'?'#d97706':'#dc2626', marginTop:1 }}>{c.status==='pass'?'✓':c.status==='warn'?'⚠':'✗'}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{c.label}</span>
              <span style={{ fontSize:10, fontWeight:700, fontFamily:'monospace', padding:'1px 7px', borderRadius:6, background:c.status==='pass'?'#f0fdf4':c.status==='warn'?'#fffbeb':'#fef2f2', color:c.status==='pass'?'#16a34a':c.status==='warn'?'#d97706':'#dc2626' }}>{c.score}</span>
            </div>
            <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0' }}>{c.note}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const fileTree     = fileExplorer ?? MockFileExplorer;
  const previewPanel = centerContent?.preview       ?? MockPreview;
  const codePanel    = centerContent?.code          ?? MockCode;
  const qualityPanel = centerContent?.quality       ?? MockQuality;
  const accessPanel  = centerContent?.accessibility ?? MockAccessibility;

  const chatPanel = rightContent?.chat ?? (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ flexGrow:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
        {localMsgs.map((msg,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:msg.sender==='user'?'flex-end':'flex-start' }}>
            <div style={{ maxWidth:'85%', padding:'9px 12px', borderRadius:msg.sender==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', fontSize:12, lineHeight:1.55, background:msg.sender==='user'?'#7c3aed':'#f8fafc', color:msg.sender==='user'?'#fff':'#374151', border:msg.sender==='user'?'none':'1px solid #e2e8f0' }}>
              <p style={{ margin:'0 0 3px' }}>{msg.text}</p>
              <p style={{ margin:0, fontSize:9, opacity:.6 }}>{msg.ts}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 12px', borderTop:'1px solid #f1f5f9', flexShrink:0, background:'#fff' }}>
        <div style={{ display:'flex', gap:8 }}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendLocal()}
            placeholder="Command agent (ex: add rounded corners)..."
            style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'7px 12px', fontSize:12, color:'#374151', outline:'none', fontFamily:'inherit' }}
            onFocus={e=>(e.target.style.borderColor='#7c3aed')} onBlur={e=>(e.target.style.borderColor='#e2e8f0')}
          />
          <button onClick={sendLocal}
            style={{ background:'#7c3aed', border:'none', color:'#fff', padding:'0 12px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', boxShadow:'0 2px 6px rgba(124,58,237,.3)' }}>
            <Send style={{ width:13, height:13 }}/>
          </button>
        </div>
        <div style={{ fontSize:9, color:'#94a3b8', textAlign:'center', marginTop:5 }}>Enter to send · Ctrl+Enter in prompt box to generate</div>
      </div>
    </div>
  );

  const versionsPanel = rightContent?.versions ?? (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #f1f5f9' }}>
        <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#94a3b8', fontFamily:'monospace' }}>Versions Timeline</span>
        <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#94a3b8', fontFamily:'monospace' }}>3 Builds Synced</span>
      </div>
      <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ padding:12, borderRadius:10, border:'2px dashed rgba(124,58,237,.3)', background:'rgba(124,58,237,.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:800, color:'#1e293b' }}>v1.2.0 <span style={{ color:'#7c3aed' }}>[Active]</span></span>
            <span style={{ fontSize:9, background:'#f0fdf4', color:'#16a34a', padding:'1px 8px', borderRadius:10, fontWeight:700, border:'1px solid #bbf7d0' }}>LIVE</span>
          </div>
          <p style={{ fontSize:10, color:'#94a3b8', margin:0 }}>Sync with GitLab main</p>
        </div>
        {[{v:'v3.4.1',label:'Initial Figma Vector export build'},{v:'v3.4.0',label:'Pipeline baseline template skeleton'}].map(({v,label})=>(
          <div key={v} style={{ padding:12, borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div>
              <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:800, color:'#1e293b', display:'block' }}>{v}</span>
              <span style={{ fontSize:10, color:'#94a3b8' }}>{label}</span>
            </div>
            <button style={{ fontSize:11, fontWeight:700, color:'#7c3aed', background:'none', border:'none', cursor:'pointer' }}>Rollback</button>
          </div>
        ))}
      </div>
    </div>
  );

  const meetingPanel = rightContent?.meeting ?? null;

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ flexGrow:1, height:'100vh', overflow:'hidden', display:'flex', flexDirection:'column', background:'#f8fafc', userSelect:'none', fontFamily:"'Inter',sans-serif" }}>

      <style>{`
        @keyframes agentPulse {
          0%,100% { box-shadow: 0 0 0 0 var(--ac,rgba(124,58,237,.4)); }
          60%      { box-shadow: 0 0 0 6px transparent; }
        }
      `}</style>

      {/* ══ HEADER ══ */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'9px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:9, fontFamily:'monospace', color:'#94a3b8', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>v3.4.2</div>
          <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.1em' }}>Multi-Agent Pipeline Generator</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.1em', color:'#94a3b8', fontWeight:600 }}>Selected Layout Target</div>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{appName}</div>
          </div>
          <button onClick={onBackToDashboard}
            style={{ padding:'8px 16px', borderRadius:10, background:'#04081c', color:'#fff', fontSize:12, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 2px 8px rgba(4,8,28,.2)', transition:'background .15s', whiteSpace:'nowrap' }}
            onMouseEnter={e=>(e.currentTarget.style.background='#0e142e')} onMouseLeave={e=>(e.currentTarget.style.background='#04081c')}>
            Navigate to Tableau de bord
          </button>
        </div>
      </div>

      {/* ══ TOOLBAR ══ */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'7px 14px', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:8, flexShrink:0 }}>

        {/* breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={onBackToDashboard}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#f1f5f9';e.currentTarget.style.borderColor='#cbd5e1'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0'}}>
            <ChevronLeft style={{ width:12, height:12 }}/> Home
          </button>
          <div style={{ width:1, height:16, background:'#e2e8f0' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600 }}>
            <span style={{ color:'#94a3b8' }}>AIEditor</span>
            <span style={{ color:'#d1d5db' }}>/</span>
            <span style={{ fontWeight:700, color:'#0f172a', background:'#f1f5f9', padding:'2px 8px', borderRadius:7, border:'1px solid #e2e8f0' }}>{appName}</span>
          </div>
        </div>

        {/* tab pills */}
        <div style={{ display:'flex', background:'#f1f5f9', padding:3, borderRadius:10, border:'1px solid #e2e8f0', gap:2 }}>
          {(['preview','code','quality','accessibility'] as IDETab[])
            .filter(t=>!isAdmin||t==='preview'||t==='code')
            .map(tab=>{
              const active = centerTab===tab;
              return (
                <button key={tab} onClick={()=>setCenterTab(tab)}
                  style={{ padding:'5px 13px', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.04em', border:'none', cursor:'pointer', borderRadius:8, display:'flex', alignItems:'center', gap:5, background:active?'#fff':'transparent', color:active?'#0f172a':'#94a3b8', boxShadow:active?'0 1px 3px rgba(0,0,0,.08)':'none', transition:'all .15s' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:active?TAB_ACCENT[tab]:'#d1d5db', flexShrink:0 }}/>
                  {tab}
                </button>
              );
            })}
        </div>

        {/* actions */}
        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
          {/* zoom */}
          <div style={{ display:'flex', alignItems:'center', gap:1, border:'1px solid #e2e8f0', background:'#f8fafc', borderRadius:8, padding:'2px 4px' }}>
            <button onClick={()=>setZoomLevel(p=>Math.max(50,p-10))} style={{ color:'#64748b', background:'none', border:'none', cursor:'pointer', padding:'2px 5px', fontWeight:700, fontSize:14, lineHeight:1 }}>-</button>
            <span style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, color:'#475569', width:38, textAlign:'center' }}>{zoomLevel}%</span>
            <button onClick={()=>setZoomLevel(p=>Math.min(150,p+10))} style={{ color:'#64748b', background:'none', border:'none', cursor:'pointer', padding:'2px 5px', fontWeight:700, fontSize:14, lineHeight:1 }}>+</button>
          </div>
          {/* full preview expand — only visible when preview tab is active */}
          {centerTab==='preview' && (
            <button onClick={()=>setFullPreview(true)}
              title="Expand to full screen"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(124,58,237,.08)';e.currentTarget.style.borderColor='rgba(124,58,237,.3)';e.currentTarget.style.color='#7c3aed'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#475569'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              Full Preview
            </button>
          )}
          {/* Files / Chat toggles */}
          {[
            { label: leftOpen?'Files In':'Files Out',   active:leftOpen,  icon:<Folder style={{ width:11, height:11 }}/>,  onClick:()=>setLeftOpen(p=>!p) },
            { label: rightOpen?'Chat In':'Chat Out',    active:rightOpen, icon:<Layers style={{ width:11, height:11 }}/>,  onClick:()=>setRightOpen(p=>!p) },
          ].map(b=>(
            <button key={b.label} onClick={b.onClick}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s', background:b.active?'rgba(124,58,237,.08)':'#f8fafc', color:b.active?'#7c3aed':'#475569', borderColor:b.active?'rgba(124,58,237,.25)':'#e2e8f0' }}>
              {b.icon}{b.label}
            </button>
          ))}
          <div style={{ width:1, height:16, background:'#e2e8f0' }}/>
          {onInspect && <button onClick={onInspect} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:inspectMode?'#0f172a':'#f8fafc', color:inspectMode?'#fff':'#475569', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>▶ Inspect</button>}
          {!isAdmin && <button onClick={()=>{ openTed(); setRightOpen(true) }} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:tedOpen?'#0f172a':'#f8fafc', color:tedOpen?'#fff':'#475569', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}><Sparkles style={{ width:11, height:11 }}/>TED Fixes</button>}
          {onZip    && <button onClick={onZip}    style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontSize:11, fontWeight:700, cursor:'pointer' }}>Zip</button>}
          {onGitlab && <button onClick={onGitlab} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontSize:11, fontWeight:700, cursor:'pointer' }}>GitLab</button>}
          {onDeploy && <button onClick={onDeploy} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#f1f5f9';e.currentTarget.style.borderColor='#cbd5e1'}} onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0'}}>Deploy</button>}
          {onMeeting && !isAdmin && <button onClick={onMeeting} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontSize:11, fontWeight:700, cursor:'pointer' }}>Meeting</button>}
          {!isAdmin && (
            <button onClick={()=>setShareModalOpen(true)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, border:'1px solid rgba(124,58,237,.3)', background:'rgba(124,58,237,.08)', color:'#7c3aed', fontSize:11, fontWeight:800, cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(124,58,237,.15)';e.currentTarget.style.borderColor='rgba(124,58,237,.5)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(124,58,237,.08)';e.currentTarget.style.borderColor='rgba(124,58,237,.3)'}}>
              <Link2 style={{ width:11, height:11 }}/>Share
            </button>
          )}
        </div>
      </div>

      {/* ══ THREE COLUMNS ══ */}
      <div style={{ flexGrow:1, minHeight:0, display:'grid', gridTemplateColumns:`${leftOpen?'240px':'0'} 1fr ${rightOpen&&!isAdmin?'280px':'0'}`, overflow:'hidden', transition:'grid-template-columns .25s' }}>

        {/* LEFT: Explorer */}
        {leftOpen && (
          <div style={{ background:'#fff', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px 9px', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
              <span style={{ fontSize:10, textTransform:'uppercase', fontWeight:800, letterSpacing:'0.12em', color:'#374151' }}>IDE EXPLORER</span>
              <span style={{ background:'#04081c', color:'#a78bfa', fontSize:9, fontFamily:'monospace', padding:'2px 8px', borderRadius:6, fontWeight:700, letterSpacing:'0.06em' }}>Local FS</span>
            </div>
            <div style={{ padding:'7px 10px', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
              <div style={{ position:'relative' }}>
                <input type="text" placeholder="Filter files (e.g., button)..."
                  style={{ width:'100%', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, paddingLeft:27, paddingRight:10, paddingTop:6, paddingBottom:6, fontSize:11, color:'#374151', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                  onFocus={e=>(e.target.style.borderColor='#7c3aed')} onBlur={e=>(e.target.style.borderColor='#e2e8f0')}
                />
                <Search style={{ width:11, height:11, color:'#94a3b8', position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
              </div>
            </div>
            <div style={{ overflowY:'auto', flexGrow:1, padding:'6px 4px' }}>{fileTree}</div>
            {fileCount!==undefined && (
              <div style={{ padding:'7px 14px', borderTop:'1px solid #e2e8f0', flexShrink:0 }}>
                <span style={{ fontSize:9, fontFamily:'monospace', color:'#94a3b8' }}>{fileCount} files</span>
              </div>
            )}
          </div>
        )}

        {/* CENTER */}
        <div style={{ background: '#f4f5f9', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>
          <div style={{ flexGrow:1, overflowY:'auto', minHeight:0, transform:centerTab==='preview'?`scale(${zoomLevel/100})`:undefined, transformOrigin:'top left' }}>
            {centerTab==='preview'       && <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, margin:16, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>{previewPanel}</div>}
            {centerTab==='code'          && <div style={{ padding:16 }}><div style={{ borderRadius:16, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,.45)' }}>{codePanel}</div></div>}
            {centerTab==='quality'       && <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, margin:16, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>{qualityPanel}</div>}
            {centerTab==='accessibility' && <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, margin:16, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>{accessPanel}</div>}
          </div>
        </div>

        {/* RIGHT */}
        {rightOpen && !isAdmin && (
          <div style={{ background:'#fff', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
            {!tedOpen && (
              <div style={{ flexShrink:0, borderBottom:'1px solid #e2e8f0' }}>
                {/* tabs */}
                <div style={{ display:'flex', height:46 }}>
                  {(['chat','versions',...(hasMeetingTab?['meeting']:[])] as RightTab[]).map(t=>{
                    const active = rightTab===t;
                    const icon = t==='chat'
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      : t==='versions'
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                      : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/></svg>;
                    return (
                      <button key={t} onClick={()=>setRightTab(t)}
                        style={{ flex:1, height:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:10, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', background:'transparent', border:'none', borderBottom:`2px solid ${active?'#7c3aed':'transparent'}`, color:active?'#7c3aed':'#94a3b8', cursor:'pointer', transition:'all .15s' }}>
                        {icon}{t}
                      </button>
                    );
                  })}
                </div>
                {rightHeader && <div style={{ padding:'6px 12px', borderTop:'1px solid #f1f5f9', background:'#fafafa' }}>{rightHeader}</div>}
                {/* Agent cards */}
                {rightTab==='chat' && (
                  <div style={{ padding:'8px 10px', borderTop:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background:'#10b981', flexShrink:0 }}/>
                      <span style={{ fontSize:8, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color:'#94a3b8', fontFamily:'monospace' }}>Active Cohort Agents</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {COHORT_AGENTS.map(agent=>(
                        <div key={agent.name} style={{ display:'flex', alignItems:'center', gap:5, background:agent.bg, border:`1px solid ${agent.border}`, borderRadius:8, padding:'4px 8px' }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:agent.color, flexShrink:0, animation:agent.status==='running'?'agentPulse 2s ease-in-out infinite':'none' } as React.CSSProperties}/>
                          <span style={{ fontSize:9, fontWeight:700, color:'#1e293b', whiteSpace:'nowrap' }}>{agent.name.replace(' Agent','').replace(' Synth','')}</span>
                          <span style={{ fontSize:8, fontWeight:700, color:agent.status==='running'?agent.color:'#94a3b8', background:agent.status==='running'?`${agent.color}15`:'transparent', padding:'1px 5px', borderRadius:6, border:`1px solid ${agent.status==='running'?`${agent.color}30`:'transparent'}` }}>
                            {agent.status==='running'?'●':'○'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tedOpen ? (
              <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
                <div style={{ padding:'12px 14px', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:9, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.12em', color:'#94a3b8', fontWeight:800 }}>AI COPILOT</div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginTop:3, display:'flex', alignItems:'center', gap:8 }}>
                        TED Active Assistant
                        <span style={{ fontSize:9, background:'#f0fdf4', color:'#16a34a', padding:'2px 8px', borderRadius:10, fontWeight:700, border:'1px solid #bbf7d0', textTransform:'uppercase' }}>LIVE</span>
                      </div>
                    </div>
                    <button onClick={closeTed} style={{ color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:4, borderRadius:6 }}
                      onMouseEnter={e=>(e.currentTarget.style.color='#374151')} onMouseLeave={e=>(e.currentTarget.style.color='#94a3b8')}>
                      <X style={{ width:14, height:14 }}/>
                    </button>
                  </div>
                  <div style={{ display:'flex', gap:14, marginTop:10, borderBottom:'1px solid #e2e8f0', paddingBottom:0, marginLeft:-14, paddingLeft:14 }}>
                    {(['chat','diag'] as const).map(t=>(
                      <button key={t} onClick={()=>setTedDiagTab(t)}
                        style={{ paddingBottom:8, fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:`2px solid ${tedDiagTab===t?'#7c3aed':'transparent'}`, color:tedDiagTab===t?'#7c3aed':'#94a3b8', background:'none', border:'none', cursor:'pointer' }}>
                        {t==='chat'?'Chat':'System Diagnostics'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flexGrow:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
                  {ted.messages.map((msg,i)=>{
                    const isBot = msg.type==='bot';
                    const segments = parseTedSegments(msg.text);
                    const filePath = isBot ? extractTedFilePath(msg.text) : null;
                    return (
                      <div key={i} style={{ display:'flex', justifyContent:isBot?'flex-start':'flex-end' }}>
                        {isBot && <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:8, marginTop:2 }}>
                          <Bot style={{ width:13, height:13, color:'#7c3aed' }}/>
                        </div>}
                        <div style={{ maxWidth:'90%', borderRadius:isBot?'14px 14px 14px 4px':'14px 14px 4px 14px', fontSize:12, lineHeight:1.55, background:isBot?'#f8fafc':'#7c3aed', color:isBot?'#374151':'#fff', border:isBot?'1px solid #e2e8f0':'none', overflow:'hidden' }}>
                          {segments.map((seg, si) => seg.type === 'code' ? (
                            <div key={si} style={{ background:'#0f172a', borderTop:'1px solid #1e293b', borderBottom:'1px solid #1e293b' }}>
                              {/* code header */}
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 10px', background:'#1e293b' }}>
                                <span style={{ fontSize:10, color:'#94a3b8', fontFamily:'monospace' }}>{seg.lang}{filePath ? ` · ${filePath.split('/').pop()}` : ''}</span>
                                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                                  {filePath && tedAccessToken && tedGenerationId && (
                                    <button
                                      onClick={() => handleTedApply(seg.content, filePath, `${i}-${si}`)}
                                      disabled={applyingBlock === `${i}-${si}`}
                                      style={{ fontSize:10, color:'#34d399', background:'none', border:'none', cursor:'pointer', fontWeight:700, opacity:applyingBlock === `${i}-${si}` ? 0.6 : 1 }}>
                                      {applyingBlock === `${i}-${si}` ? '…applying' : '⚡ Apply'}
                                    </button>
                                  )}
                                  <button onClick={() => { navigator.clipboard.writeText(seg.content) }}
                                    style={{ fontSize:10, color:'#94a3b8', background:'none', border:'none', cursor:'pointer' }}>⎘ Copy</button>
                                </div>
                              </div>
                              <pre style={{ margin:0, padding:'8px 10px', fontSize:11, color:'#86efac', overflowX:'auto', fontFamily:'monospace', lineHeight:1.5 }}><code>{seg.content}</code></pre>
                            </div>
                          ) : (
                            <p key={si} style={{ margin:0, padding:'8px 12px', whiteSpace:'pre-wrap' }}>{seg.content}</p>
                          ))}
                          {/* Action steps */}
                          {isBot && msg.actionSteps && msg.actionSteps.length > 0 && (
                            <div style={{ padding:'6px 12px 10px', borderTop:'1px solid rgba(124,58,237,.1)' }}>
                              {msg.actionSteps.map((step, si) => (
                                <div key={si} style={{ display:'flex', gap:6, fontSize:11, color:'#7c3aed', marginTop:4 }}>
                                  <span style={{ fontWeight:700 }}>→</span><span>{step}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {ted.isTyping && (
                    <div style={{ display:'flex' }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.2)', display:'flex', alignItems:'center', justifyContent:'center', marginRight:8 }}>
                        <Bot style={{ width:13, height:13, color:'#7c3aed' }}/>
                      </div>
                      <div style={{ padding:'8px 12px', borderRadius:'14px 14px 14px 4px', background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                        <div style={{ display:'flex', gap:4, alignItems:'center', height:14 }}>
                          {[0,150,300].map(d=><span key={d} style={{ width:5, height:5, borderRadius:'50%', background:'#a78bfa', opacity:.7, animation:`agentPulse 1.2s ease-in-out ${d}ms infinite` }}/>)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={tedScrollRef}/>
                </div>
                <div style={{ padding:'10px 12px', borderTop:'1px solid #e2e8f0', flexShrink:0, background:'#fff' }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <input ref={tedInputRef} value={tedTypedInput} onChange={e=>setTedTypedInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendTedMsg()}
                      placeholder="Type style guidelines or debug CMD..."
                      style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'7px 12px', fontSize:12, color:'#374151', outline:'none', fontFamily:'inherit' }}
                      onFocus={e=>(e.target.style.borderColor='#7c3aed')} onBlur={e=>(e.target.style.borderColor='#e2e8f0')}
                    />
                    <button onClick={sendTedMsg} disabled={ted.isLoading}
                      style={{ background:'#7c3aed', color:'#fff', border:'none', padding:'0 12px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', opacity:ted.isLoading?.5:1 }}>
                      <Send style={{ width:13, height:13 }}/>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flexGrow:1, overflowY:'auto', minHeight:0, display:'flex', flexDirection:'column' }}>
                {rightTab==='chat'     && chatPanel}
                {rightTab==='versions' && versionsPanel}
                {rightTab==='meeting'  && (meetingPanel ?? <div style={{ padding:16, textAlign:'center', fontSize:12, color:'#94a3b8' }}>No meeting data</div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {modals}

      {/* Share modal */}
      {shareModalOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,.15)', width:'100%', maxWidth:420, padding:24, display:'flex', flexDirection:'column', gap:18 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <h3 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>Share design draft</h3>
                <p style={{ fontSize:12, color:'#64748b', margin:0 }}>Share sandbox URL with teammates</p>
              </div>
              <button onClick={()=>setShareModalOpen(false)} style={{ color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:4 }}><X style={{ width:15, height:15 }}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151' }}>Share link</label>
              <div style={{ display:'flex', gap:8 }}>
                <input readOnly value={activeLinkOrCode||'No link yet — click Generate below'}
                  style={{ flex:1, fontSize:11, fontFamily:'monospace', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:10, background:'#f8fafc', color:'#64748b', outline:'none' }}/>
                <button onClick={activeLinkOrCode?copyShareLink:onShareCreate}
                  style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:800, cursor:'pointer', border:'none', background:shareCopied?'#10b981':'#04081c', color:'#fff', transition:'background .15s' }}>
                  {shareCopied?'Copied!':activeLinkOrCode?'Copy':isSharing?'…':'Generate'}
                </button>
              </div>
              {activeCode && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:10, color:'#64748b', fontFamily:'monospace' }}>
                  <span>Code: <strong style={{ color:'#0f172a' }}>{activeCode}</strong></span>
                  <button onClick={onRevoke} style={{ color:'#ef4444', background:'none', border:'1px solid rgba(239,68,68,.25)', borderRadius:7, padding:'2px 8px', cursor:'pointer', fontWeight:700, fontSize:10 }}>Revoke</button>
                </div>
              )}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:12, borderTop:'1px solid #f1f5f9' }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'flex', alignItems:'center', gap:6 }}>
                <UserPlus style={{ width:13, height:13, color:'#94a3b8' }}/> Invite collaborator
              </label>
              <div style={{ display:'flex', gap:8 }}>
                <input type="email" placeholder="collaborateur@example.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}
                  style={{ flex:1, fontSize:12, padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:10, background:'#fff', color:'#374151', outline:'none', fontFamily:'inherit' }}
                  onFocus={e=>(e.target.style.borderColor='#7c3aed')} onBlur={e=>(e.target.style.borderColor='#e2e8f0')}
                />
                <div style={{ position:'relative' }}>
                  <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}
                    style={{ appearance:'none', fontSize:12, padding:'8px 28px 8px 12px', border:'1px solid #e2e8f0', borderRadius:10, background:'#fff', color:'#374151', outline:'none', cursor:'pointer', fontFamily:'inherit' }}>
                    <option>Editor</option><option>Viewer</option><option>Admin</option>
                  </select>
                  <ChevronDown style={{ width:11, height:11, color:'#94a3b8', position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                </div>
              </div>
              <button onClick={()=>{ alert(`Invitation sent to ${inviteEmail} as ${inviteRole}`); setInviteEmail('') }} disabled={!inviteEmail.includes('@')}
                style={{ width:'100%', padding:'10px 0', background:'#04081c', color:'#fff', fontWeight:800, fontSize:13, borderRadius:12, border:'none', cursor:inviteEmail.includes('@')?'pointer':'not-allowed', opacity:inviteEmail.includes('@')?1:.5 }}>
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FULL PREVIEW OVERLAY ══ */}
      {fullPreview && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#0f172a', display:'flex', flexDirection:'column' }}>
          {/* toolbar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', background:'#1e293b', borderBottom:'1px solid #334155', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#7c3aed' }}/>
              <span style={{ fontSize:12, fontWeight:800, color:'#f1f5f9' }}>{appName}</span>
              <span style={{ fontSize:10, color:'#64748b', fontFamily:'monospace' }}>Full Preview</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {/* zoom in full preview */}
              <div style={{ display:'flex', alignItems:'center', gap:1, border:'1px solid #334155', background:'#0f172a', borderRadius:8, padding:'2px 4px' }}>
                <button onClick={()=>setZoomLevel(p=>Math.max(50,p-10))} style={{ color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:'2px 6px', fontWeight:700, fontSize:14, lineHeight:1 }}>-</button>
                <span style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, color:'#94a3b8', width:38, textAlign:'center' }}>{zoomLevel}%</span>
                <button onClick={()=>setZoomLevel(p=>Math.min(200,p+10))} style={{ color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:'2px 6px', fontWeight:700, fontSize:14, lineHeight:1 }}>+</button>
              </div>
              <button onClick={()=>setFullPreview(false)}
                title="Exit full preview"
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:9, border:'1px solid #475569', background:'#334155', color:'#f1f5f9', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#475569'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#334155'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                Exit Full Preview
              </button>
            </div>
          </div>
          {/* content */}
          <div style={{ flexGrow:1, overflow:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:24 }}>
            <div style={{ transform:`scale(${zoomLevel/100})`, transformOrigin:'top center', background:'#fff', borderRadius:16, boxShadow:'0 25px 80px rgba(0,0,0,.6)', overflow:'hidden', width:'100%', maxWidth:1280 }}>
              {previewPanel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
