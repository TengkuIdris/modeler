import { Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@stores/appStore'
import { TitleBar } from '@components/TitleBar'
import { Sidebar } from '@components/Sidebar'
import { Viewport3D } from '@components/Viewport3D'
import { PromptPanel } from '@components/PromptPanel'
import { SketchPanel } from '@components/SketchPanel'
import { ChatPanel } from '@components/ChatPanel'
import { SettingsModal } from '@components/SettingsModal'
import { LoadingScreen } from '@components/LoadingScreen'

export default function App() {
  const { mode, isSettingsOpen, setSettingsOpen } = useAppStore()

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-950 overflow-hidden">
      {/* Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 3D Viewport */}
          <div className="flex-1 relative">
            <Suspense fallback={<LoadingScreen />}>
              <Viewport3D />
            </Suspense>
          </div>
        </div>

        {/* Right Panel - Context Sensitive */}
        <AnimatePresence mode="wait">
          {mode === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-96 border-l border-surface-800"
            >
              <PromptPanel />
            </motion.div>
          )}
          
          {mode === 'sketch' && (
            <motion.div
              key="sketch"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-96 border-l border-surface-800"
            >
              <SketchPanel />
            </motion.div>
          )}
          
          {mode === 'edit' && (
            <motion.div
              key="edit"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-96 border-l border-surface-800"
            >
              <ChatPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal onClose={() => setSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

