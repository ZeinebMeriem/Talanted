import React, { useState, useEffect } from 'react';
import { Folder, Search, X, Trash2, Code2, MousePointer2, Layers, Clock } from 'lucide-react';

export interface ProjectItem {
  id: string;
  title: string;
  tag: 'Prompt' | 'Meeting' | 'Jira';
  status: string;
  version: string;
  elements: string;
  wcagScore: string;
  editedTime: string;
  description: string;
  color: string;
  agents: string[];
}

export const INITIAL_PROJECTS: ProjectItem[] = [
  { id: 'Ecommerce', title: 'Ecommerce Live Dashboard', tag: 'Meeting', status: 'Active Pipeline', version: 'v3.4.2', elements: '18 UI Widgets', wcagScore: '98/100', editedTime: 'Edited 1d ago', description: 'Interactive sales catalog, charts, and payment gates.', color: 'from-[#15395e] to-[#019cda]', agents: ['Requirements Agent', 'Code Generator Synth', 'WCAG compliance reviewer'] },
  { id: 'Landing Page', title: 'Landing Page & Hero Space', tag: 'Prompt', status: 'Ready for Push', version: 'v1.2.0', elements: '12 Sections', wcagScore: '97/100', editedTime: 'Edited 2h ago', description: 'Stunning marketing hero banner and responsive grid.', color: 'from-[#0b64a0] to-teal-500', agents: ['Prompt Agent', 'Code Generator Synth'] },
  { id: 'ECOMMERCE_1', title: 'ECOMMERCE Core Billing', tag: 'Jira', status: 'Validated Draft', version: 'v1.0.3', elements: '6 Table Views', wcagScore: '100/100', editedTime: 'Edited 3d ago', description: 'Table views, customer invoices, and billing ledgers.', color: 'from-violet-600 to-indigo-600', agents: ['Requirements Scribe', 'Reviewer'] },
  { id: 'ECOMMERCE_2', title: 'ECOMMERCE Cart Service', tag: 'Prompt', status: 'Active Pipeline', version: 'v2.1.0', elements: '8 Elements', wcagScore: '96/100', editedTime: 'Edited 4d ago', description: 'Dynamic items list, quantity counters, and vouchers.', color: 'from-amber-500 to-orange-600', agents: ['Requirements Agent', 'Code Generator Synth'] },
  { id: 'E-commerce', title: 'E-commerce Catalog Grid', tag: 'Meeting', status: 'Active Pipeline', version: 'v1.5.0', elements: '12 Cards', wcagScore: '98/100', editedTime: 'Edited 5d ago', description: 'Responsive slider component with category tags.', color: 'from-[#15395e] to-sky-400', agents: ['Figma Extractor', 'Code Synth'] },
  { id: 'Pricing', title: 'Pricing & Tiers Card', tag: 'Jira', status: 'Validated Draft', version: 'v2.0.4', elements: '14 Components', wcagScore: '99/100', editedTime: 'Edited 6d ago', description: 'Interactive multi-tenant billing tier comparator.', color: 'from-[#1c456f] to-stone-500', agents: ['Requirements Agent', 'Code Generator Synth'] },
  { id: 'Contact', title: 'Contact Support & SLA Form', tag: 'Prompt', status: 'Ready for Push', version: 'v3.0.1', elements: '5 Inputs', wcagScore: '100/100', editedTime: 'Edited 1w ago', description: 'Semantic WCAG forms with client validation.', color: 'from-emerald-600 to-teal-500', agents: ['WCAG Auditor', 'Requirements Agent'] },
];

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Prompt:  { bg: 'rgba(124,58,237,.1)',  text: '#7c3aed' },
  Meeting: { bg: 'rgba(16,185,129,.1)',  text: '#059669' },
  Jira:    { bg: 'rgba(59,130,246,.1)',  text: '#2563eb' },
};

interface MyProjectsGridHubProps {
  initialProjects?: ProjectItem[];
  onSelectProject?: (projectId: string) => void;
  onOpenInIDE?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => Promise<void>;
  initialSelectedProjectId?: string;
  customToastHandler?: (message: string) => void;
}

export default function MyProjectsGridHub({
  initialProjects,
  onSelectProject,
  onOpenInIDE,
  onDeleteProject,
  initialSelectedProjectId = 'Ecommerce',
  customToastHandler,
}: MyProjectsGridHubProps) {
  const [projectList, setProjectList] = useState<ProjectItem[]>(initialProjects ?? INITIAL_PROJECTS);
  useEffect(() => { if (initialProjects && initialProjects.length > 0) setProjectList(initialProjects); }, [initialProjects]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialSelectedProjectId);
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<'All' | 'Prompt' | 'Meeting' | 'Jira'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    if (customToastHandler) { customToastHandler(msg); return; }
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredProjects = projectList
    .filter(p => selectedTagFilter === 'All' || p.tag === selectedTagFilter)
    .filter(p => p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()));

  return (
    <div style={{ padding:'20px 24px', background:'#f4f5f9', minHeight:'100%', fontFamily:"'Inter',sans-serif" }}>

      {/* Toast */}
      {toastMessage && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:50, background:'#04081c', color:'#fff', padding:'10px 16px', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.3)', border:'1px solid rgba(124,58,237,.3)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
          <span>{toastMessage}</span>
          <button onClick={()=>setToastMessage(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:12, flexWrap:'wrap' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(124,58,237,.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Folder size={14} color="#7c3aed"/>
            </div>
            <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:'#0f172a', letterSpacing:'-.02em' }}>My Projects</h2>
            <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'rgba(124,58,237,.1)', color:'#7c3aed' }}>{filteredProjects.length}</span>
          </div>
          <p style={{ margin:'3px 0 0', fontSize:11, color:'#94a3b8', fontWeight:500 }}>Showing {filteredProjects.length} of {projectList.length} generated pipelines</p>
        </div>

        {/* Search + sort */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={12} color="#94a3b8" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
            <input
              type="text"
              placeholder="Search projects..."
              value={projectSearchQuery}
              onChange={e=>setProjectSearchQuery(e.target.value)}
              style={{ paddingLeft:28, paddingRight: projectSearchQuery?28:10, paddingTop:7, paddingBottom:7, background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12, color:'#374151', outline:'none', width:200, fontFamily:'inherit' }}
              onFocus={e=>e.target.style.borderColor='#7c3aed'}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'}
            />
            {projectSearchQuery && (
              <button onClick={()=>setProjectSearchQuery('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex' }}>
                <X size={12}/>
              </button>
            )}
          </div>
          <select style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12, padding:'7px 10px', outline:'none', fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>
            <option>Date edited</option>
            <option>Alphabetical</option>
          </select>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {(['All', 'Prompt', 'Meeting', 'Jira'] as const).map(tag => (
          <button key={tag} onClick={()=>setSelectedTagFilter(tag)}
            style={{ padding:'5px 14px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer', border:'none', transition:'all .15s',
              background: selectedTagFilter===tag ? '#04081c' : '#fff',
              color:       selectedTagFilter===tag ? '#fff'    : '#64748b',
              boxShadow:   selectedTagFilter===tag ? '0 2px 8px rgba(4,8,28,.25)' : '0 1px 3px rgba(0,0,0,.06)',
            }}>
            {tag === 'All' ? 'All Categories' : tag === 'Prompt' ? 'Prompt Generated' : tag === 'Meeting' ? 'Meeting Audio' : 'Jira Backlog'}
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      {filteredProjects.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8edf5', padding:40, textAlign:'center', color:'#94a3b8' }}>
          <Folder size={28} strokeWidth={1} style={{ margin:'0 auto 8px', color:'#cbd5e1' }}/>
          <p style={{ fontSize:13, fontWeight:600, margin:0 }}>No matching projects found.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
          {filteredProjects.map(p => {
            const isSelected = selectedProjectId === p.id;
            const tagStyle = TAG_COLORS[p.tag] ?? TAG_COLORS.Prompt;
            return (
              <div key={p.id}
                style={{ background:'#fff', border:`1.5px solid ${isSelected?'#7c3aed':'#e8edf5'}`, borderRadius:14, padding:'14px 14px 12px', display:'flex', flexDirection:'column', gap:10, boxShadow: isSelected?'0 0 0 3px rgba(124,58,237,.1)':'0 1px 4px rgba(0,0,0,.04)', transition:'all .2s', cursor:'default' }}>

                {/* Card top */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:'monospace' }}>Project</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:6, background: tagStyle.bg, color: tagStyle.text }}>{p.tag}</span>
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:6, background:'#f1f5f9', color:'#64748b', fontFamily:'monospace' }}>{p.version}</span>
                  </div>
                </div>

                {/* Title + desc */}
                <div>
                  <h4 style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>{p.title}</h4>
                  <p style={{ margin:0, fontSize:11, color:'#64748b', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{p.description}</p>
                </div>

                {/* Footer */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4, color:'#94a3b8' }}>
                    <Clock size={10}/>
                    <span style={{ fontSize:10, fontWeight:500, fontFamily:'monospace' }}>{p.editedTime}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    {/* Select */}
                    <button
                      onClick={()=>{ setSelectedProjectId(p.id); onSelectProject?.(p.id); showToast(`Selected "${p.title}"`); }}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, fontSize:10, fontWeight:700, cursor:'pointer', border:'none', transition:'all .15s',
                        background: isSelected ? '#04081c' : '#f1f5f9',
                        color:       isSelected ? '#fff'    : '#374151',
                        boxShadow:   isSelected ? '0 2px 6px rgba(4,8,28,.25)' : 'none',
                      }}>
                      <MousePointer2 size={9}/> Select
                    </button>
                    {/* IDE */}
                    <button
                      onClick={()=>{ setSelectedProjectId(p.id); onSelectProject?.(p.id); onOpenInIDE?.(p.id); }}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, fontSize:10, fontWeight:700, cursor:'pointer', border:'none', background:'#7c3aed', color:'#fff', boxShadow:'0 2px 6px rgba(124,58,237,.35)', transition:'all .15s' }}>
                      <Code2 size={9}/> IDE
                    </button>
                    {/* Delete */}
                    <button
                      onClick={async()=>{ if(projectList.length<=1) return; if(onDeleteProject) await onDeleteProject(p.id); setProjectList(prev=>prev.filter(x=>x.id!==p.id)); showToast(`Removed "${p.title}"`); }}
                      style={{ padding:'4px 6px', borderRadius:7, border:'1px solid #e2e8f0', background:'transparent', color:'#94a3b8', cursor:'pointer', display:'flex', alignItems:'center', transition:'all .15s' }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='#fef2f2';(e.currentTarget as HTMLButtonElement).style.color='#ef4444';(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(239,68,68,.3)'}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color='#94a3b8';(e.currentTarget as HTMLButtonElement).style.borderColor='#e2e8f0'}}>
                      <Trash2 size={11}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
