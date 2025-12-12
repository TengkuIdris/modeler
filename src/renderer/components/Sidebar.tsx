import { Type, Pencil, MessageSquare, History, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@stores/appStore'
import type { AppMode } from '@shared/types'

interface NavItem {
  id: AppMode
  icon: typeof Type
  label: string
}

const navItems: NavItem[] = [
  { id: 'prompt', icon: Type, label: 'Text Prompt' },
  { id: 'sketch', icon: Pencil, label: 'Sketch' },
  { id: 'edit', icon: MessageSquare, label: 'Edit' },
]

export function Sidebar() {
  const { mode, setMode, history, currentModel } = useAppStore()

  return (
    <div className="w-16 bg-surface-900 border-r border-surface-800 flex flex-col items-center py-4">
      {/* Mode Navigation */}
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            className={`relative p-3 rounded-xl transition-all duration-200 group ${
              mode === item.id
                ? 'text-accent-400'
                : 'text-surface-500 hover:text-surface-300'
            }`}
            title={item.label}
          >
            {mode === item.id && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute inset-0 bg-accent-600/10 rounded-xl border border-accent-500/30"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              />
            )}
            <item.icon size={22} className="relative z-10" />
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="w-8 h-px bg-surface-700 my-4" />

      {/* History */}
      <button
        className="p-3 rounded-xl text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors relative"
        title="History"
      >
        <History size={22} />
        {history.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
            {history.length > 9 ? '9+' : history.length}
          </span>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export Button */}
      <button
        disabled={!currentModel}
        className={`p-3 rounded-xl transition-colors ${
          currentModel
            ? 'text-accent-400 hover:bg-accent-600/10 hover:text-accent-300'
            : 'text-surface-700 cursor-not-allowed'
        }`}
        title="Export STL"
      >
        <Download size={22} />
      </button>
    </div>
  )
}


