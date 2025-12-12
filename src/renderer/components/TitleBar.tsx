import { useAppStore } from '@stores/appStore'

export function TitleBar() {
  const { setSettingsOpen } = useAppStore()

  return (
    <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 drag-region">
      {/* Left side - Logo */}
      <div className="flex items-center gap-3 no-drag">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
          <span className="text-sm font-bold text-white">M</span>
        </div>
        <span className="font-bold text-white text-lg">
          Modeler
        </span>
        <span className="text-gray-500 text-sm">
          | AI 3D Generator
        </span>
      </div>

      {/* Right side - Just one settings button */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="no-drag px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-2"
      >
        <span>⚙️</span>
        <span className="text-sm font-medium">Settings</span>
      </button>
    </div>
  )
}

