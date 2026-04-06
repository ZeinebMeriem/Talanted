#!/usr/bin/env python3
"""Reconstruct the corrupted App.tsx cleanly."""

path = "/app/projects/01KN4ZDHYZVBEP907XDAN96JMV/src/App.tsx"
with open(path, "r") as f:
    content = f.read()
lines = content.split("\n")

# ── Find the stats grid (DashboardPage content start) ──
rest_start = None
for i, line in enumerate(lines):
    if "grid grid-cols-4" in line and "gap-6" in line:
        rest_start = i
        print(f"Stats grid at line {i+1}")
        break

if rest_start is None:
    print("ERROR: cannot find stats grid"); exit(1)

# ── Extract the rest section and remove garbage closing tags ──
# The corruption left orphaned `  </div>` and `</div>` lines right after
# `<ArrowUpRight size={16} />` in the first (Revenue) stats card.
# These have zero or minimal indentation and don't belong there.
rest_lines = lines[rest_start:]

# Find and remove the two garbage lines:
#   a line matching exactly `  </div>` (2-space indent)
#   immediately followed by `</div>` (no indent)
clean_rest = []
i = 0
while i < len(rest_lines):
    line = rest_lines[i]
    # Detect the garbage pattern: unindented/2-space </div> after an ArrowUpRight
    if (line.strip() == '</div>' and line in ('  </div>', '</div>') and
            i + 1 < len(rest_lines) and
            rest_lines[i+1].strip() == '</div>' and rest_lines[i+1] in ('  </div>', '</div>')):
        # Peek ahead: if after these two </div>s we see "12.4%" or a bare text fragment
        # (not proper indented JSX), skip both garbage lines
        after = rest_lines[i+2] if i+2 < len(rest_lines) else ''
        stripped = after.strip()
        # A bare percentage/number string is the telltale sign of the garbage block
        if stripped and (stripped[0].isdigit() or stripped.endswith('%') or stripped.startswith('<ArrowDown') or stripped.startswith('<ArrowUp')):
            print(f"  Removing garbage lines {rest_start+i+1} and {rest_start+i+2}: {repr(line)} / {repr(rest_lines[i+1])}")
            i += 2
            continue
    clean_rest.append(line)
    i += 1

# Also remove any top-level (0 or 2 space indent) stray </div> that precede "12.4%"
# by doing a targeted pass near the Revenue card ArrowUpRight
final_rest = []
j = 0
while j < len(clean_rest):
    line = clean_rest[j]
    # If this is a minimal-indent </div> and next non-empty line is a bare text value
    if line.rstrip() in ('  </div>', '</div>', '</div>  '):
        next_content = ''
        for k in range(j+1, min(j+3, len(clean_rest))):
            s = clean_rest[k].strip()
            if s:
                next_content = s
                break
        if next_content and len(next_content) < 15 and not next_content.startswith('<') and not next_content.startswith('//'):
            print(f"  Removing stray </div> at rest+{j}: next='{next_content}'")
            j += 1
            continue
    final_rest.append(line)
    j += 1

# ── Fixed imports ──
fixed_lucide = "import { ArrowDownRight, ArrowUpRight, BarChart3, Bell, DollarSign, Edit, FolderOpen, LayoutDashboard, Plus, Save, Search, Settings, Share, Trash2, TrendingUp, Upload, User, UserMinus, Users } from 'lucide-react';"

HEADER = """\
import Navbar from './components/Navbar';
function Sidebar({ activePage, setActivePage }: { activePage: string; setActivePage: (p: string) => void }) {
  return (
    <div className='w-80 shrink-0 h-screen sticky top-0 bg-indigo-950 flex flex-col overflow-y-auto'>
      <div className='p-6 border-b border-indigo-800'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center'>
            <LayoutDashboard size={20} className='text-white' />
          </div>
          <span className='text-white font-bold text-lg'>SaaS Pro</span>
        </div>
      </div>
      <nav className='flex-1 px-4 py-6 space-y-1'>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
          { id: 'projectslist', label: 'Projects', icon: <FolderOpen size={20} /> },
          { id: 'projectdetail', label: 'Project Detail', icon: <FolderOpen size={20} /> },
          { id: 'editproject', label: 'Edit Project', icon: <Edit size={20} /> },
          { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActivePage(id)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-left transition-all ${activePage === id ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-indigo-800'}`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className='p-4 border-t border-indigo-800'>
        <div className='bg-indigo-800/50 rounded-lg p-3 text-center'>
          <p className='text-indigo-300 text-xs font-medium mb-2'>Pro Plan</p>
          <button className='w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors'>
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const revenueData = [
    { month: 'Jan', value: 30200 },
    { month: 'Feb', value: 34800 },
    { month: 'Mar', value: 37500 },
    { month: 'Apr', value: 41200 },
    { month: 'May', value: 44900 },
    { month: 'Jun', value: 48295 },
  ]
  const planData = [
    { name: 'Enterprise', value: 30, fill: '#6366f1' },
    { name: 'Pro', value: 45, fill: '#3b82f6' },
    { name: 'Starter', value: 25, fill: '#8b5cf6' },
  ]
  return (
    <>"""

new_lines = (
    lines[0:2]              # React + recharts imports
    + [fixed_lucide]        # fixed lucide import
    + HEADER.split("\n")    # Navbar import + Sidebar + DashboardPage opener
    + final_rest            # stats grid + rest of file (garbage lines removed)
)

with open(path, "w") as f:
    f.write("\n".join(new_lines))

print(f"Done: {len(new_lines)} lines total")
