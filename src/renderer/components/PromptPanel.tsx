import { useState, useCallback } from 'react'
import { Send, Sparkles, Wand2, Lightbulb } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, useSettingsStore } from '@stores/appStore'
import { createGenerationService } from '@services/generation'
import { createLLMProvider } from '@services/llm'
import type { Model3D } from '@shared/types'

const EXAMPLE_PROMPTS = [
  "A detailed chess piece, specifically a knight, with intricate medieval armor details",
  "A small succulent plant in a geometric planter pot",
  "A sleek modern desk lamp with adjustable arm",
  "A miniature castle tower with crenellations and a spiral staircase",
]

export function PromptPanel() {
  const { 
    promptText, 
    setPromptText, 
    setGenerating, 
    setGenerationProgress,
    setCurrentModel,
    addToHistory,
    setMode
  } = useAppStore()
  
  const { generationConfig, llmConfig } = useSettingsStore()
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEnhancePrompt = useCallback(async () => {
    if (!promptText.trim() || !llmConfig.claude?.apiKey) {
      setError('Please configure your LLM API key in settings')
      return
    }

    setIsEnhancing(true)
    setError(null)

    try {
      const llm = createLLMProvider(llmConfig)
      const response = await llm.chat([
        { 
          role: 'user', 
          content: `Enhance this 3D model description to be more detailed and specific for AI generation. Keep it concise but descriptive. Original: "${promptText}"` 
        }
      ])
      setPromptText(response.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt')
    } finally {
      setIsEnhancing(false)
    }
  }, [promptText, llmConfig, setPromptText])

  const handleGenerate = useCallback(async () => {
    if (!promptText.trim()) return
    
    if (!generationConfig.apiKey) {
      setError('Please configure your 3D generation API key in settings')
      return
    }

    setError(null)
    setGenerating(true)
    setGenerationProgress(0)

    try {
      const service = createGenerationService(generationConfig)
      const task = await service.generateFromText(promptText)
      
      const result = await service.waitForCompletion(
        task.id,
        (progress) => setGenerationProgress(progress)
      )

      if (result.status === 'failed') {
        throw new Error(result.error || 'Generation failed')
      }

      if (result.meshUrl) {
        const meshData = await service.downloadMesh(result.meshUrl)
        
        const model: Model3D = {
          id: crypto.randomUUID(),
          name: promptText.slice(0, 50),
          createdAt: new Date(),
          prompt: promptText,
          meshData,
          thumbnailUrl: result.thumbnailUrl
        }

        setCurrentModel(model)
        addToHistory(model)
        setMode('edit')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
      setGenerationProgress(0)
    }
  }, [promptText, generationConfig, setGenerating, setGenerationProgress, setCurrentModel, addToHistory, setMode])

  return (
    <div className="h-full flex flex-col bg-surface-900">
      {/* Header */}
      <div className="p-4 border-b border-surface-800">
        <h2 className="font-display font-semibold text-surface-200 flex items-center gap-2">
          <Sparkles size={18} className="text-accent-400" />
          Text to 3D
        </h2>
        <p className="text-xs text-surface-500 mt-1">
          Describe your 3D model in detail
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-surface-400">
            Prompt
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Describe your 3D model..."
            className="w-full h-32 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder:text-surface-600 resize-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20"
          />
        </div>

        {/* Enhance Button */}
        <button
          onClick={handleEnhancePrompt}
          disabled={!promptText.trim() || isEnhancing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-lg text-sm text-surface-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 size={16} className={isEnhancing ? 'animate-spin' : ''} />
          {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
        </button>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Example Prompts */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Lightbulb size={14} />
            <span>Try these examples</span>
          </div>
          <div className="space-y-2">
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setPromptText(prompt)}
                className="w-full text-left p-2 bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 hover:border-surface-600 rounded-lg text-xs text-surface-400 hover:text-surface-300 transition-colors line-clamp-2"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="p-4 border-t border-surface-800">
        <button
          onClick={handleGenerate}
          disabled={!promptText.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-600 hover:bg-accent-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-teal"
        >
          <Send size={16} />
          Generate 3D Model
        </button>
      </div>
    </div>
  )
}


