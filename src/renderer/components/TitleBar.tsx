import { Settings, Minus, Square, X } from 'lucide-react'
import { useAppStore } from '@stores/appStore'

export function TitleBar() {
  const { setSettingsOpen } = useAppStore()
  const isMac = window.electronAPI?.platform === 'darwin'

  return (
    <div className="h-10 bg-surface-900 border-b border-surface-800 flex items-center justify-between drag-region">
      {/* Left side - Mac traffic lights space or logo */}
      <div className={`flex items-center ${isMac ? 'pl-20' : 'pl-4'}`}>
        <div className="flex items-center gap-2 no-drag">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">M</span>
          </div>
          <span className="font-display font-semibold text-surface-200 text-sm">
            Modeler
          </span>
        </div>
      </div>

      {/* Center - optional title */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-surface-500 text-xs font-medium">
          AI 3D Model Generator
        </span>
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-1 pr-2 no-drag">
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-md hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {/* Windows controls */}
        {!isMac && (
          <div className="flex ml-2">
            <button className="p-2 hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors">
              <Minus size={14} />
            </button>
            <button className="p-2 hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors">
              <Square size={12} />
            </button>
            <button className="p-2 hover:bg-red-600 text-surface-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

