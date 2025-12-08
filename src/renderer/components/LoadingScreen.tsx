import { motion } from 'framer-motion'

export function LoadingScreen() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-surface-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-4 border-2 border-accent-500/30 border-t-accent-500 rounded-full"
        />
        <p className="text-surface-400 text-sm font-medium">Loading 3D Viewport...</p>
      </motion.div>
    </div>
  )
}

