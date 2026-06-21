import React, { useState, useEffect } from 'react';
import { Folder, Search, X, Trash2 } from 'lucide-react';

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

const FALLBACK_PROJECTS: ProjectItem[] = [
  { id: 'Ecommerce', title: 'Ecommerce Live Dashboard', tag: 'Meeting', status: 'Active Pipeline', version: 'v3.4.2', elements: '18 UI Widgets', wcagScore: '98/100', editedTime: 'Edited 1d ago', description: 'Interactive sales catalog, charts, and payment gates.', color: 'from-[#15395e] to-[#019cda]', agents: ['Requirements Agent', 'Code Generator Synth', 'WCAG compliance reviewer'] },
  { id: 'Landing Page', title: 'Landing Page & Hero Space', tag: 'Prompt', status: 'Ready for Push', version: 'v1.2.0', elements: '12 Sections', wcagScore: '97/100', editedTime: 'Edited 2h ago', description: 'Stunning marketing hero banner and responsive grid.', color: 'from-[#0b64a0] to-teal-500', agents: ['Prompt Agent', 'Code Generator Synth'] },
];

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
  initialSelectedProjectId = '',
  customToastHandler,
}: MyProjectsGridHubProps) {
  const [projectList, setProjectList] = useState<ProjectItem[]>(initialProjects ?? FALLBACK_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialSelectedProjectId);
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<'All' | 'Prompt' | 'Meeting' | 'Jira'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync real projects when they load/change
  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setProjectList(initialProjects);
    }
  }, [initialProjects]);

  const showToast = (msg: string) => {
    if (customToastHandler) {
      customToastHandler(msg);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const filteredProjects = projectList
    .filter(p => selectedTagFilter === 'All' || p.tag === selectedTagFilter)
    .filter(p => p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()));

  const handleDelete = async (p: ProjectItem) => {
    if (projectList.length <= 1) {
      showToast("⚠️ Can't delete the last remaining project.");
      return;
    }
    setDeletingId(p.id);
    try {
      if (onDeleteProject) {
        await onDeleteProject(p.id);
      }
      setProjectList(prev => prev.filter(proj => proj.id !== p.id));
      showToast(`🗑️ Project "${p.title}" removed successfully.`);
    } catch {
      showToast('⚠️ Failed to delete project. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-8 bg-neutral-50/50 rounded-3xl border border-stone-200 shadow-xs max-w-7xl mx-auto" id="projects-hub-container">

      {/* Toast HUD */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#15395e] text-white px-4 py-2.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-2 text-xs font-semibold animate-bounce">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white/75 hover:text-white ml-2">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="space-y-6">

        {/* Header + controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Folder className="w-5 h-5 text-[#15395e]" />
              My Projects Grid Hub
            </h3>
            <p className="text-xs text-stone-500 font-medium mt-1">
              Showing {filteredProjects.length} of {projectList.length} generated pipelines
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search projects by title..."
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                className="pl-8.5 pr-8 py-1.5 bg-white border border-stone-200 rounded-xl text-stone-700 text-xs outline-none focus:border-[#019cda] font-medium w-full sm:w-56"
              />
              {projectSearchQuery && (
                <button onClick={() => setProjectSearchQuery('')} className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <select className="bg-white border border-stone-200 rounded-xl text-xs px-3 py-1.5 outline-none font-semibold text-stone-700 cursor-pointer">
              <option>Date edited</option>
              <option>Highest Fidelity</option>
              <option>Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Filter chips */}
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

        {/* Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 space-y-2">
            <Folder className="w-8 h-8 mx-auto stroke-1 text-[#2563eb]" />
            <p className="text-xs font-semibold">No projects match your current filters or search terms.</p>
            <button
              onClick={() => { setProjectSearchQuery(''); setSelectedTagFilter('All'); }}
              className="text-xs text-[#2563eb] font-bold hover:underline cursor-pointer"
            >
              Go back to all projects
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProjects.map((p) => {
              const isSelected = selectedProjectId === p.id;
              const isDeleting = deletingId === p.id;
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
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          p.tag === 'Meeting' ? 'bg-violet-50 text-violet-600' :
                          p.tag === 'Jira' ? 'bg-blue-50 text-blue-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>{p.tag}</span>
                      </div>
                      <span className="text-[10px] bg-stone-100 text-stone-600 font-bold px-2 py-0.5 rounded-md font-mono">
                        {p.version}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-stone-900 text-xs tracking-tight line-clamp-1 group-hover:text-[#2563eb] transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 leading-normal line-clamp-2 h-8 font-medium">
                        {p.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-stone-100">
                    <span className="text-[10px] text-stone-400 font-mono font-medium">{p.editedTime}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          onSelectProject?.(p.id);
                          showToast(`🎯 Selected: "${p.title}"`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-white shadow-xs hover:bg-stone-800'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                        }`}
                      >
                        Select
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          onSelectProject?.(p.id);
                          onOpenInIDE?.(p.id);
                          showToast(`💻 Opened "${p.title}" in editor.`);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#2563eb] hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                      >
                        IDE
                      </button>
                      <button
                        onClick={() => void handleDelete(p)}
                        disabled={isDeleting}
                        title="Delete project"
                        className="p-1 px-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {isDeleting
                          ? <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
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
  );
}
