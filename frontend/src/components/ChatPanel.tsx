import React, { useCallback, useRef, useEffect, useState } from 'react'
import { editFile } from '../api'

export type ChatMsg = {
  role: 'ai' | 'user'
  text: string
  edits?: { file: string; added: number; removed: number }[]
}

interface ChatPanelProps {
  chatMessages: ChatMsg[]
  chatInput: string
  setChatInput: (value: string) => void
  isChatLoading: boolean
  selectedGenerationId: string | null
  selectedZone: { label: string; description: string } | null
  diffVisible: boolean
  setDiffVisible: (visible: boolean) => void
  diffEdits: { file: string; added: number; removed: number }[]
  setDiffEdits: (edits: { file: string; added: number; removed: number }[]) => void
  accessToken: string
  selectedModel: string
  onFileUpdated: (updatedMessages: ChatMsg[], edits: { file: string; added: number; removed: number }[]) => void
  prefillMessage?: string
  onPrefillUsed?: () => void
  onClearZone?: () => void
  onPreviewOverride?: (css: string | null) => void
}

// ── Color palettes ──────────────────────────────────────────────────────────
const COLOR_PALETTES = [
  {
    name: 'Modern Dark',
    colors: ['#0f172a', '#1e293b', '#6366f1', '#818cf8', '#f1f5f9'],
    instruction: 'Change the color scheme to a modern dark theme with dark navy background (#0f172a, #1e293b) and indigo-purple accents (#6366f1). Update text colors to light (#f1f5f9).',
  },
  {
    name: 'Clean Light',
    colors: ['#ffffff', '#f8fafc', '#3b82f6', '#60a5fa', '#1e293b'],
    instruction: 'Change the color scheme to a clean minimal light theme: white background (#ffffff), soft gray sections (#f8fafc), and blue accents (#3b82f6). Keep text dark (#1e293b).',
  },
  {
    name: 'Bold Purple',
    colors: ['#4c1d95', '#7c3aed', '#a78bfa', '#ddd6fe', '#faf5ff'],
    instruction: 'Change the color scheme to a bold purple gradient theme: deep purple background (#4c1d95), vibrant violet accents (#7c3aed), and light lavender for secondary elements (#a78bfa).',
  },
  {
    name: 'Warm Sunset',
    colors: ['#7c2d12', '#ea580c', '#f97316', '#fb923c', '#fff7ed'],
    instruction: 'Change the color scheme to warm sunset tones: deep amber/orange primary (#ea580c), soft orange accents (#f97316), and warm cream background (#fff7ed).',
  },
  {
    name: 'Forest Green',
    colors: ['#14532d', '#16a34a', '#22c55e', '#86efac', '#f0fdf4'],
    instruction: 'Change the color scheme to a fresh forest green palette: deep forest green primary (#14532d), emerald accents (#16a34a), and mint highlights (#86efac) on a light green background (#f0fdf4).',
  },
  {
    name: 'Ocean Blue',
    colors: ['#0c4a6e', '#0284c7', '#38bdf8', '#7dd3fc', '#f0f9ff'],
    instruction: 'Change the color scheme to ocean blue: deep navy primary (#0c4a6e), sky blue accents (#0284c7), and light cyan highlights (#38bdf8) on a pale blue background (#f0f9ff).',
  },
] as const

// ── Typography presets ─────────────────────────────────────────────────────
const TYPOGRAPHY_PRESETS = [
  {
    name: 'Inter / Sans',
    preview: 'Aa',
    style: { fontFamily: 'Inter, sans-serif', fontWeight: 400 },
    instruction: 'Change all fonts to use Inter (clean modern sans-serif). Set headings to font-weight 700-800 and body text to 400-500 with comfortable 1.6 line-height.',
  },
  {
    name: 'Playfair / Serif',
    preview: 'Aa',
    style: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    instruction: 'Change heading fonts to a serif typeface (Playfair Display or Georgia). Use serif for titles and a clean sans-serif for body text for an editorial, premium feel.',
  },
  {
    name: 'Space Grotesk',
    preview: 'Ag',
    style: { fontFamily: 'monospace', fontWeight: 700 },
    instruction: 'Change all fonts to Space Grotesk (geometric, techy). Use bold weights for headings (800) and medium for body. Add letter-spacing: -0.02em to headings for a modern startup look.',
  },
  {
    name: 'Slab Bold',
    preview: 'Ab',
    style: { fontFamily: 'Georgia, serif', fontWeight: 900 },
    instruction: 'Use a bold slab-serif style for headings (very heavy weight, slab-serif like Roboto Slab). Combine with a light sans-serif body font for strong contrast and impact.',
  },
  {
    name: 'Minimal Thin',
    preview: 'Aₜ',
    style: { fontFamily: 'sans-serif', fontWeight: 200 },
    instruction: 'Apply a minimal thin typography style: extra-light (200) or thin (100) headings with lots of letter-spacing (0.1em). Use uppercase for labels and small caps for subheadings.',
  },
] as const

// ── Layout / spacing presets ───────────────────────────────────────────────
const LAYOUT_PRESETS = [
  {
    label: 'Compact',
    emoji: '▣',
    instruction: 'Make the layout more compact: reduce all padding and margins by 30-40%, tighten spacing between sections, and make cards/elements smaller and denser.',
  },
  {
    label: 'Spacious',
    emoji: '⬜',
    instruction: 'Make the layout more spacious and breathable: increase section padding to 100-120px, add generous margins between elements, and give content more whitespace.',
  },
  {
    label: 'Full width',
    emoji: '↔',
    instruction: 'Make the layout full-width: remove max-width constraints so content stretches edge-to-edge with only small side padding (20-40px).',
  },
  {
    label: 'Centered narrow',
    emoji: '⊟',
    instruction: 'Apply a narrow centered layout: max-width 720px, centered with auto margins, for a focused reading-optimized layout.',
  },
  {
    label: 'Split 50/50',
    emoji: '◫',
    instruction: 'Reorganize key sections into a 50/50 two-column split layout where text is on the left and a visual (image, illustration, or component) is on the right.',
  },
  {
    label: 'Bento grid',
    emoji: '⊞',
    instruction: 'Redesign the features/cards section as a modern bento grid layout with varying card sizes (some spanning 2 columns, some tall, some wide) for a dynamic asymmetric feel.',
  },
] as const

// ── Visual effects presets ─────────────────────────────────────────────────
const EFFECT_PRESETS = [
  {
    label: 'Glassmorphism',
    emoji: '🪟',
    instruction: 'Apply a glassmorphism style: semi-transparent backgrounds (rgba white 10-20%), backdrop-filter blur(16px), subtle white border (rgba white 20%), and soft shadows on cards and panels.',
  },
  {
    label: 'Neumorphism',
    emoji: '⬜',
    instruction: 'Apply a soft neumorphism style: light gray background with elements appearing extruded using dual box-shadows (light top-left, dark bottom-right). No hard borders.',
  },
  {
    label: 'Neon / Glow',
    emoji: '⚡',
    instruction: 'Add neon glow effects: dark background, bright neon accent colors, and glowing box-shadows on buttons and highlighted elements (e.g. box-shadow: 0 0 20px rgba(99,102,241,0.6)).',
  },
  {
    label: 'Flat / Material',
    emoji: '◻',
    instruction: 'Apply a clean flat material design style: solid colors without gradients, 4dp/8dp shadows on cards, bold primary colors, and clear visual hierarchy.',
  },
  {
    label: 'Gradient mesh',
    emoji: '🌈',
    instruction: 'Add colorful gradient mesh backgrounds using multiple radial-gradient or conic-gradient blobs for a modern, vibrant feel on section backgrounds.',
  },
  {
    label: 'Outlined / Wireframe',
    emoji: '□',
    instruction: 'Apply a clean outlined style: white background, elements defined by borders (1-2px solid) instead of fills, minimal color with only accents on borders and icons.',
  },
] as const

// ── Zone-specific quick-action chips ───────────────────────────────────────
const ZONE_SUGGESTIONS: Record<string, { label: string; emoji: string; instruction: string }[]> = {
  'header / navbar': [
    { label: 'Sticky + glass', emoji: '🪟', instruction: 'Make the navbar sticky (position: fixed) with a frosted glass effect: backdrop-filter blur(12px) and semi-transparent background with a subtle bottom border.' },
    { label: 'Add shadow', emoji: '🌑', instruction: 'Add a soft drop shadow below the navbar to separate it from the page content.' },
    { label: 'Add CTA button', emoji: '🔴', instruction: 'Add a prominent call-to-action button ("Get Started" or "Try Free") in the navbar on the right side with a gradient background.' },
    { label: 'Transparent hero nav', emoji: '✨', instruction: 'Make the navbar transparent over the hero section with white text. Add a smooth transition so it gets a solid background on scroll.' },
    { label: 'Centered logo', emoji: '⬛', instruction: 'Center the logo in the navbar with navigation links split equally on both sides.' },
  ],
  'hero section': [
    { label: 'Full-screen', emoji: '↕', instruction: 'Make the hero section full viewport height (min-height: 100vh) with content vertically centered.' },
    { label: 'Gradient background', emoji: '🌈', instruction: 'Add a beautiful diagonal gradient background to the hero section using the primary brand colors.' },
    { label: 'Animated headline', emoji: '⚡', instruction: 'Add a CSS typing or fade-in animation to the main hero headline for visual impact.' },
    { label: 'Hero image/illustration', emoji: '🖼', instruction: 'Add a large hero image or abstract SVG illustration on the right side of the hero section.' },
    { label: 'Particle effect', emoji: '✦', instruction: 'Add subtle animated floating shapes or dots in the hero background for a modern tech look.' },
  ],
  'features / content': [
    { label: '3-column grid', emoji: '⊞', instruction: 'Arrange the features/benefits in a clean 3-column grid layout with icon, bold title, and short description per card.' },
    { label: 'Add icons', emoji: '◈', instruction: 'Add a meaningful colorful icon (SVG or emoji) to each feature card to make the section more visually appealing.' },
    { label: 'Hover effects', emoji: '🖱', instruction: 'Add smooth hover effects to all feature cards: lift the card up slightly, add a colored border highlight, and enhance the shadow.' },
    { label: 'Numbered steps', emoji: '①', instruction: 'Add large step numbers (01, 02, 03…) to each feature to make it look like a clear step-by-step process.' },
    { label: 'Stats counter', emoji: '📊', instruction: 'Add a statistics/metrics strip (e.g. 10k+ users, 99% uptime, $0 to start) between sections with large bold numbers.' },
  ],
  'cards / grid': [
    { label: 'Elevated shadows', emoji: '🌓', instruction: 'Add deep elevated drop shadows to all cards (box-shadow with multiple layers) for a more modern floating card look.' },
    { label: 'Round corners', emoji: '⬤', instruction: 'Increase the border radius on all cards to 16px or 20px to make them look softer and more modern.' },
    { label: 'Gradient borders', emoji: '🔲', instruction: 'Add animated gradient borders to cards on hover using a CSS gradient border technique.' },
    { label: 'Image thumbnails', emoji: '🖼', instruction: 'Add a colored or image thumbnail/header section at the top of each card.' },
    { label: 'Badges / tags', emoji: '🏷', instruction: 'Add small colored category badge tags to each card (e.g. "New", "Popular", "Featured").' },
  ],
  'footer': [
    { label: 'Dark footer', emoji: '🌙', instruction: 'Make the footer dark (dark background like #0f172a or #1e293b) with light text to create a strong contrast with the rest of the page.' },
    { label: 'Newsletter form', emoji: '📧', instruction: 'Add a newsletter subscription section to the footer with an email input field and a "Subscribe" button.' },
    { label: 'Multi-column links', emoji: '☰', instruction: 'Organize the footer into a clean 4-column layout: logo+tagline, product links, company links, and social/contact info.' },
    { label: 'Wave separator', emoji: '〜', instruction: 'Add a decorative SVG wave or curved shape as a separator between the main content area and the footer.' },
    { label: 'Social icons', emoji: '🔗', instruction: 'Add styled social media icon links (Twitter/X, LinkedIn, GitHub, Instagram) to the footer.' },
  ],
  'sidebar': [
    { label: 'Collapsible', emoji: '◀', instruction: 'Make the sidebar collapsible with a toggle button — collapsed shows only icons, expanded shows icons + labels.' },
    { label: 'Add icons to nav', emoji: '◈', instruction: 'Add a relevant SVG icon to each sidebar navigation item.' },
    { label: 'User profile footer', emoji: '👤', instruction: 'Add a user profile section at the bottom of the sidebar showing avatar, name, and role.' },
    { label: 'Active item style', emoji: '▌', instruction: 'Improve the active navigation item style: add a colored left border, bold text, and a subtle gradient background.' },
  ],
  'right panel': [
    { label: 'Filter panel', emoji: '⚙', instruction: 'Add a filter/search panel with checkboxes, toggle switches, and a search input.' },
    { label: 'Summary card', emoji: '📋', instruction: 'Add a summary statistics card at the top of the right panel with key metrics.' },
    { label: 'Collapsible sections', emoji: '▾', instruction: 'Make each section of the right panel collapsible with an accordion-style toggle.' },
  ],
}

const FALLBACK_SUGGESTIONS = [
  { label: 'More whitespace', emoji: '⬜', instruction: 'Increase padding and spacing throughout the page for a more breathable, premium layout.' },
  { label: 'Bold typography', emoji: 'B', instruction: 'Make all headings heavier and larger for more visual impact and better hierarchy.' },
  { label: 'Rounded corners', emoji: '⬤', instruction: 'Apply consistent rounded corners (border-radius) to all buttons, cards, and input fields.' },
  { label: 'Add animations', emoji: '✨', instruction: 'Add smooth CSS fade-in/slide-up animations to elements as they enter the viewport.' },
]

export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading: _isChatLoading,
  selectedGenerationId,
  selectedZone,
  diffVisible: _diffVisible,
  setDiffVisible,
  diffEdits: _diffEdits,
  setDiffEdits,
  accessToken,
  selectedModel,
  onFileUpdated,
  prefillMessage,
  onPrefillUsed,
  onClearZone,
  onPreviewOverride,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isSending, setIsSending] = React.useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(true)
  type PreviewKind = 'palette' | 'typography' | 'layout' | 'effect' | 'quick'
  const [hoverPreview, setHoverPreview] = useState<{
    kind: PreviewKind
    data: Record<string, any>
    rect: DOMRect
  } | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const generatePreviewCSS = (kind: PreviewKind, data: Record<string, any>): string => {
    if (kind === 'palette') {
      const c = data.colors as readonly string[]
      return [
        `html,body{background:${c[0]}!important;color:${c[4]}!important;}`,
        `nav,header,[class*="nav"],[class*="header"],[class*="navbar"]{background:${c[1]}!important;}`,
        `h1,h2,h3,h4,h5,h6{color:${c[4]}!important;}`,
        `p,span,li,td,label{color:${c[4]}!important;opacity:.85;}`,
        `a,[class*="link"]{color:${c[3]}!important;}`,
        `button,[class*="btn"],input[type="submit"]{background:${c[2]}!important;border-color:${c[2]}!important;color:#fff!important;}`,
        `section,main,article,[class*="card"]{background:${c[1]}!important;}`,
        `footer{background:${c[1]}!important;}`,
      ].join('\n')
    }
    if (kind === 'typography') {
      const ff = String(data.fontFamily)
      const fw = Number(data.fontWeight)
      return [
        `*,body{font-family:${ff}!important;}`,
        `h1,h2,h3,h4,h5,h6{font-weight:${Math.min(fw + 200, 900)}!important;}`,
        `p,span,li{font-weight:${Math.max(fw - 100, 300)}!important;}`,
      ].join('\n')
    }
    if (kind === 'effect') {
      const effects: Record<string, string> = {
        'Glassmorphism': [
          `[class*="card"],section>div>div,main>div>div{background:rgba(255,255,255,.12)!important;`,
          `backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important;`,
          `border:1px solid rgba(255,255,255,.25)!important;}`,
        ].join(''),
        'Neumorphism': [
          `body{background:#e0e5ec!important;color:#4b5563!important;}`,
          `[class*="card"],div[class*="shadow"]{background:#e0e5ec!important;`,
          `box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff!important;border:none!important;}`,
        ].join(''),
        'Neon / Glow': [
          `body{background:#0f172a!important;color:#e2e8f0!important;}`,
          `h1,h2,h3{color:#818cf8!important;text-shadow:0 0 12px rgba(99,102,241,.8),0 0 24px rgba(99,102,241,.4)!important;}`,
          `button,[class*="btn"]{box-shadow:0 0 12px rgba(99,102,241,.6)!important;border:1px solid #6366f1!important;}`,
        ].join(''),
        'Flat / Material': [
          `[class*="card"],div[class*="shadow"]{box-shadow:0 2px 4px rgba(0,0,0,.2)!important;border-radius:4px!important;}`,
          `button,[class*="btn"]{box-shadow:0 2px 4px rgba(0,0,0,.3)!important;border-radius:4px!important;}`,
        ].join(''),
        'Gradient mesh': [
          `body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;`,
          `background:radial-gradient(circle at 20% 50%,rgba(99,102,241,.35) 0%,transparent 50%),`,
          `radial-gradient(circle at 80% 20%,rgba(168,85,247,.35) 0%,transparent 50%),`,
          `radial-gradient(circle at 60% 80%,rgba(236,72,153,.25) 0%,transparent 50%);}`,
        ].join(''),
        'Outlined / Wireframe': [
          `body{background:#fff!important;color:#111827!important;}`,
          `[class*="card"],section>div{background:#fff!important;border:1.5px solid #d1d5db!important;box-shadow:none!important;}`,
          `button,[class*="btn"]{background:#fff!important;color:#6366f1!important;border:1.5px solid #6366f1!important;}`,
        ].join(''),
      }
      return effects[String(data.label)] ?? ''
    }
    if (kind === 'layout') {
      const layouts: Record<string, string> = {
        'Compact': `section,main{padding:16px 24px!important;}h1{font-size:1.5rem!important;}h2{font-size:1.25rem!important;}`,
        'Spacious': `section,main,header{padding:100px 64px!important;}`,
        'Full width': `[class*="max-w"],[class*="container"],[class*="wrapper"]{max-width:100%!important;padding-left:20px!important;padding-right:20px!important;}`,
        'Centered narrow': `[class*="max-w"],[class*="container"],[class*="wrapper"]{max-width:720px!important;margin-left:auto!important;margin-right:auto!important;}`,
      }
      return layouts[String(data.label)] ?? ''
    }
    return ''
  }

  const showPreview = (kind: PreviewKind, data: Record<string, any>) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setHoverPreview({ kind, data, rect: new DOMRect() })
    onPreviewOverride?.(generatePreviewCSS(kind, data))
  }
  const dismissPreview = () => {
    setHoverPreview(null)
    onPreviewOverride?.(null)
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chatMessages])

  // Open suggestions panel whenever a zone is newly selected
  useEffect(() => {
    if (selectedZone) setSuggestionsOpen(true)
  }, [selectedZone?.label])

  useEffect(() => {
    if (prefillMessage && !chatInput) {
      setChatInput(prefillMessage)
      onPrefillUsed?.()
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.setSelectionRange(prefillMessage.length, prefillMessage.length)
      }, 100)
    }
  }, [prefillMessage, chatInput, setChatInput, onPrefillUsed])

  const injectSuggestion = (instruction: string) => {
    setChatInput(instruction)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(instruction.length, instruction.length)
    }, 50)
  }

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || !selectedGenerationId || isSending) return

    const userMsg: ChatMsg = { role: 'user', text: chatInput }
    setChatInput('')
    setIsSending(true)

    const instruction = selectedZone
      ? `Focus on ${selectedZone.description}. ${chatInput}`
      : chatInput

    try {
      const response = await editFile(selectedGenerationId, '', instruction, selectedModel, accessToken)

      const edits = response.filePath ? [{
        file: response.filePath,
        added: 0,
        removed: 0,
      }] : []

      setDiffEdits(edits)

      const aiMsg: ChatMsg = {
        role: 'ai',
        text: response.buildSuccess
          ? `Done! Updated \`${response.filePath ?? 'file'}\`. Preview will reload.`
          : `Applied changes but build had issues — check the Console tab for details.`,
        edits: edits.length > 0 ? edits : undefined,
      }

      const newMessages = [...chatMessages, userMsg, aiMsg]
      onFileUpdated(newMessages, edits)
      setDiffVisible(false)
    } catch (e: any) {
      const errorMsg: ChatMsg = {
        role: 'ai',
        text: `Error: ${e?.message || 'Failed to apply change. Try rephrasing the instruction.'}`,
      }
      onFileUpdated([...chatMessages, userMsg, errorMsg], [])
    } finally {
      setIsSending(false)
    }
  }, [chatInput, isSending, selectedZone, selectedGenerationId, selectedModel, accessToken, chatMessages, onFileUpdated, setDiffEdits, setDiffVisible, setChatInput])

  const zoneSuggestions = selectedZone
    ? (ZONE_SUGGESTIONS[selectedZone.label] ?? FALLBACK_SUGGESTIONS)
    : []

  // ── Tooltip content renderer ──────────────────────────────────────────────
  const renderTooltipContent = () => {
    if (!hoverPreview) return null
    const { kind, data } = hoverPreview

    if (kind === 'palette') {
      const colors = data.colors as string[]
      return (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>{data.name}</div>
          {/* Mini UI mockup */}
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
            {/* Navbar */}
            <div style={{ height: 22, background: colors[1], display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6 }}>
              <div style={{ width: 24, height: 7, borderRadius: 3, background: colors[2] }} />
              <div style={{ flex: 1 }} />
              <div style={{ width: 14, height: 5, borderRadius: 2, background: colors[3], opacity: .7 }} />
              <div style={{ width: 14, height: 5, borderRadius: 2, background: colors[3], opacity: .7 }} />
              <div style={{ width: 28, height: 14, borderRadius: 10, background: colors[2] }} />
            </div>
            {/* Hero */}
            <div style={{ background: colors[0], padding: '14px 12px 10px', textAlign: 'center' }}>
              <div style={{ width: '60%', height: 9, borderRadius: 4, background: colors[4], margin: '0 auto 5px', opacity: .9 }} />
              <div style={{ width: '45%', height: 5, borderRadius: 3, background: colors[4], margin: '0 auto 10px', opacity: .5 }} />
              <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: colors[2], fontSize: 9, fontWeight: 700, color: '#fff' }}>
                Get Started
              </div>
            </div>
            {/* Cards */}
            <div style={{ background: colors[0], padding: '0 8px 10px', display: 'flex', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ flex: 1, borderRadius: 5, background: colors[1], overflow: 'hidden' }}>
                  <div style={{ height: 3, background: i === 0 ? colors[2] : colors[3] }} />
                  <div style={{ padding: '5px 6px' }}>
                    <div style={{ height: 5, borderRadius: 2, background: colors[4], opacity: .7, marginBottom: 3 }} />
                    <div style={{ height: 3, borderRadius: 2, background: colors[4], opacity: .3, width: '70%' }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Footer */}
            <div style={{ height: 16, background: colors[1], borderTop: `1px solid ${colors[2]}22` }} />
          </div>
          {/* Swatch strip */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
            {colors.map((c, i) => (
              <div key={i} title={c} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,.15)', flexShrink: 0 }} />
            ))}
          </div>
        </div>
      )
    }

    if (kind === 'typography') {
      const ff = data.fontFamily as string
      const fw = data.fontWeight as number
      return (
        <div style={{ background: '#fff', borderRadius: 8, padding: '12px 14px', color: '#111827', minWidth: 180 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{data.name}</div>
          <div style={{ fontFamily: ff, fontWeight: Math.min(fw + 200, 900), fontSize: 18, lineHeight: 1.2, marginBottom: 4, color: '#111827' }}>
            Heading Style
          </div>
          <div style={{ fontFamily: ff, fontWeight: 400, fontSize: 11, color: '#6b7280', lineHeight: 1.5, marginBottom: 10 }}>
            Body text: clean and readable at every size, great for UI.
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ padding: '4px 10px', borderRadius: 20, background: '#6366f1', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: ff }}>Button</div>
            <div style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid #e5e7eb', color: '#374151', fontSize: 10, fontFamily: ff }}>Link</div>
          </div>
        </div>
      )
    }

    if (kind === 'layout') {
      const layoutPreviews: Record<string, React.ReactNode> = {
        'Compact': (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[100, 80, 90, 70, 85].map((w, i) => (
              <div key={i} style={{ height: 8, borderRadius: 2, background: 'rgba(99,102,241,.4)', width: `${w}%` }} />
            ))}
          </div>
        ),
        'Spacious': (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            {[100, 75, 90].map((w, i) => (
              <div key={i} style={{ height: 10, borderRadius: 3, background: 'rgba(99,102,241,.4)', width: `${w}%` }} />
            ))}
          </div>
        ),
        'Full width': (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ height: 16, borderRadius: 3, background: 'rgba(99,102,241,.5)', width: '100%' }} />
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,1,1].map((_,i) => <div key={i} style={{ flex: 1, height: 30, borderRadius: 3, background: 'rgba(99,102,241,.25)' }} />)}
            </div>
            <div style={{ height: 12, borderRadius: 3, background: 'rgba(99,102,241,.3)', width: '100%' }} />
          </div>
        ),
        'Centered narrow': (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '0 20%' }}>
            {[100, 80, 100, 65].map((w, i) => (
              <div key={i} style={{ height: 8, borderRadius: 2, background: 'rgba(99,102,241,.4)', width: `${w}%` }} />
            ))}
          </div>
        ),
        'Split 50/50': (
          <div style={{ display: 'flex', gap: 6, height: 60 }}>
            <div style={{ flex: 1, borderRadius: 4, background: 'rgba(99,102,241,.25)', display: 'flex', flexDirection: 'column', gap: 4, padding: 6 }}>
              {[80,60,90].map((w,i)=><div key={i} style={{ height: 6, borderRadius: 2, background: 'rgba(99,102,241,.5)', width:`${w}%` }} />)}
            </div>
            <div style={{ flex: 1, borderRadius: 4, background: 'rgba(168,85,247,.2)' }} />
          </div>
        ),
        'Bento grid': (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 4, height: 60 }}>
            <div style={{ borderRadius: 4, background: 'rgba(99,102,241,.3)', gridRow: '1 / 3' }} />
            <div style={{ borderRadius: 4, background: 'rgba(168,85,247,.25)' }} />
            <div style={{ borderRadius: 4, background: 'rgba(99,102,241,.2)' }} />
          </div>
        ),
      }
      return (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>{data.label}</div>
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '10px', minHeight: 70, display: 'flex', alignItems: 'center' }}>
            {layoutPreviews[data.label as string] ?? <div style={{ color: '#64748b', fontSize: 11 }}>Preview</div>}
          </div>
        </div>
      )
    }

    if (kind === 'effect') {
      const effectPreviews: Record<string, React.ReactNode> = {
        'Glassmorphism': (
          <div style={{ borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#a855f7)', height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Glass Card</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>Frosted blur effect</div>
            </div>
          </div>
        ),
        'Neumorphism': (
          <div style={{ borderRadius: 8, background: '#e0e5ec', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 90 }}>
            <div style={{ background: '#e0e5ec', borderRadius: 10, padding: '10px 16px', boxShadow: '5px 5px 10px #b8bec7, -5px -5px 10px #ffffff', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>Soft UI Card</div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>Extruded shadow</div>
            </div>
          </div>
        ),
        'Neon / Glow': (
          <div style={{ borderRadius: 8, background: '#0f172a', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 90 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#818cf8', textShadow: '0 0 12px rgba(99,102,241,.9), 0 0 24px rgba(99,102,241,.5)' }}>NEON GLOW</div>
              <div style={{ marginTop: 8, padding: '4px 14px', borderRadius: 20, border: '1px solid #6366f1', color: '#818cf8', fontSize: 9, boxShadow: '0 0 10px rgba(99,102,241,.5)' }}>Button</div>
            </div>
          </div>
        ),
        'Flat / Material': (
          <div style={{ borderRadius: 8, background: '#f5f5f5', padding: 10, height: 90, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ background: '#6366f1', borderRadius: 4, padding: '6px 10px', boxShadow: '0 2px 4px rgba(0,0,0,.2)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>PRIMARY CARD</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 4, padding: '6px 10px', boxShadow: '0 1px 3px rgba(0,0,0,.12)' }}>
              <div style={{ fontSize: 9, color: '#374151' }}>Secondary Card</div>
            </div>
          </div>
        ),
        'Gradient mesh': (
          <div style={{ borderRadius: 8, overflow: 'hidden', height: 90, position: 'relative', background: '#fff' }}>
            <div style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.6), transparent)' }} />
            <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,.6), transparent)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 10, fontWeight: 700, color: '#374151' }}>Mesh gradient</div>
          </div>
        ),
        'Outlined / Wireframe': (
          <div style={{ borderRadius: 8, background: '#fff', padding: 10, height: 90, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ border: '1.5px solid #6366f1', borderRadius: 5, padding: '5px 8px' }}>
              <div style={{ fontSize: 9, color: '#6366f1', fontWeight: 700 }}>Outlined Card</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ flex: 1, border: '1.5px solid #d1d5db', borderRadius: 4, height: 20 }} />
              <div style={{ border: '1.5px solid #6366f1', borderRadius: 4, padding: '3px 8px', fontSize: 9, color: '#6366f1', fontWeight: 700 }}>Send</div>
            </div>
          </div>
        ),
      }
      return (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>{data.label}</div>
          {effectPreviews[data.label as string] ?? <div style={{ color: '#64748b', fontSize: 11, padding: 8 }}>{data.label}</div>}
        </div>
      )
    }

    // quick / zone chip — just show the instruction preview
    return (
      <div style={{ maxWidth: 200 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', marginBottom: 6 }}>{data.emoji} {data.label}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{String(data.instruction).slice(0, 100)}…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
        {chatMessages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '82%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg,#6366f1,#a855f7)'
                  : 'rgba(255,255,255,.07)',
                color: msg.role === 'user' ? '#fff' : '#cbd5e1',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,.08)',
              }}
            >
              {msg.text}
              {msg.edits && msg.edits.length > 0 && (
                <div style={{ fontSize: 11, marginTop: 6, color: msg.role === 'user' ? 'rgba(255,255,255,.7)' : '#64748b' }}>
                  {msg.edits.map((e, i) => (
                    <span key={i}>📄 {e.file}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: 'bounce 1s infinite', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>Applying edit…</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Suggestions panel ── */}
      {selectedZone && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,.06)',
          background: 'rgba(15,23,42,.8)',
          flexShrink: 0,
        }}>
          {/* Zone header + toggle */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer' }}
            onClick={() => setSuggestionsOpen(o => !o)}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>
              {selectedZone.label} — suggestions
            </span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round"
              style={{ transition: 'transform .2s', transform: suggestionsOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
            <button
              onClick={e => { e.stopPropagation(); onClearZone?.() }}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2, lineHeight: 1, flexShrink: 0, marginLeft: 4 }}
              title="Clear zone selection"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {suggestionsOpen && (
            <div style={{ padding: '0 12px 10px' }}>

              {/* Inline hover preview */}
              <div style={{
                marginBottom: hoverPreview ? 10 : 0,
                maxHeight: hoverPreview ? 220 : 0,
                overflow: 'hidden',
                transition: 'max-height .2s ease, margin-bottom .2s ease',
              }}>
                {hoverPreview && (
                  <div style={{
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(99,102,241,.25)',
                    borderRadius: 10,
                    padding: 10,
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <button
                      onClick={dismissPreview}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', lineHeight: 1, padding: 2 }}
                      title="Close preview"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                    {renderTooltipContent()}
                  </div>
                )}
              </div>

              {/* Color palettes */}
              <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
                🎨 Color palette
              </p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
                {COLOR_PALETTES.map(palette => (
                  <button
                    key={palette.name}
                    onClick={() => { injectSuggestion(palette.instruction); showPreview('palette', { ...palette }) }}
                    title={`Apply: ${palette.name}`}
                    style={{
                      flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
                  >
                    {/* Swatch row */}
                    <div style={{ display: 'flex', gap: 2 }}>
                      {palette.colors.map((c, i) => (
                        <div key={i} style={{
                          width: 12, height: 12, borderRadius: '50%', background: c,
                          border: '1px solid rgba(255,255,255,.15)',
                          boxShadow: '0 1px 3px rgba(0,0,0,.4)',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>{palette.name}</span>
                  </button>
                ))}
              </div>

              {/* Zone-specific quick changes */}
              <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
                ✦ Quick changes
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                {zoneSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { injectSuggestion(s.instruction); showPreview('quick', { ...s }) }}
                    style={{
                      padding: '5px 10px', borderRadius: 20, border: '1px solid rgba(99,102,241,.25)',
                      background: 'rgba(99,102,241,.08)',
                      color: '#a5b4fc', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,.22)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,.5)'; e.currentTarget.style.color = '#c7d2fe' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,.25)'; e.currentTarget.style.color = '#a5b4fc' }}
                  >
                    <span style={{ fontSize: 12 }}>{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Typography presets */}
              <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
                🔤 Typography
              </p>
              <div style={{ display: 'flex', gap: 5, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
                {TYPOGRAPHY_PRESETS.map(t => (
                  <button
                    key={t.name}
                    onClick={() => { injectSuggestion(t.instruction); showPreview('typography', { name: t.name, fontFamily: t.style.fontFamily, fontWeight: t.style.fontWeight, preview: t.preview }) }}
                    title={t.name}
                    style={{
                      flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                      transition: 'all .15s', minWidth: 52,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
                  >
                    <span style={{ fontSize: 16, fontWeight: t.style.fontWeight as number, fontFamily: t.style.fontFamily, color: '#c7d2fe', lineHeight: 1 }}>
                      {t.preview}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{t.name}</span>
                  </button>
                ))}
              </div>

              {/* Layout presets */}
              <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
                ▦ Layout
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                {LAYOUT_PRESETS.map((l, i) => (
                  <button
                    key={i}
                    onClick={() => { injectSuggestion(l.instruction); showPreview('layout', { ...l }) }}
                    style={{
                      padding: '5px 10px', borderRadius: 20, border: '1px solid rgba(16,185,129,.2)',
                      background: 'rgba(16,185,129,.06)',
                      color: '#6ee7b7', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,.18)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,.45)'; e.currentTarget.style.color = '#a7f3d0' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,.06)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,.2)'; e.currentTarget.style.color = '#6ee7b7' }}
                  >
                    <span style={{ fontSize: 12 }}>{l.emoji}</span>
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Visual effects */}
              <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
                ✨ Effects
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {EFFECT_PRESETS.map((ef, i) => (
                  <button
                    key={i}
                    onClick={() => { injectSuggestion(ef.instruction); showPreview('effect', { ...ef }) }}
                    style={{
                      padding: '5px 10px', borderRadius: 20, border: '1px solid rgba(251,191,36,.2)',
                      background: 'rgba(251,191,36,.06)',
                      color: '#fcd34d', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,.18)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,.45)'; e.currentTarget.style.color = '#fde68a' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,.06)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,.2)'; e.currentTarget.style.color = '#fcd34d' }}
                  >
                    <span style={{ fontSize: 12 }}>{ef.emoji}</span>
                    {ef.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.07)', background: 'rgba(15,23,42,.6)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={selectedZone ? `Describe your change for ${selectedZone.label}…` : 'What would you like to change?'}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendChat()
              }
            }}
            disabled={isSending || !selectedGenerationId}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
              color: '#e2e8f0', outline: 'none',
              opacity: (isSending || !selectedGenerationId) ? 0.5 : 1,
            }}
          />
          <button
            onClick={() => void sendChat()}
            disabled={!chatInput.trim() || isSending || !selectedGenerationId}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: (!chatInput.trim() || isSending || !selectedGenerationId) ? '#1e293b' : 'linear-gradient(135deg,#6366f1,#a855f7)',
              color: (!chatInput.trim() || isSending || !selectedGenerationId) ? '#475569' : '#fff',
              cursor: (!chatInput.trim() || isSending || !selectedGenerationId) ? 'not-allowed' : 'pointer',
              transition: 'all .2s', flexShrink: 0,
            }}
          >
            {isSending ? '…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
