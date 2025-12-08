import { useRef, useState, useCallback, useEffect } from 'react'
import { Upload, Trash2, Send, Pencil, Eraser, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, useSettingsStore } from '@stores/appStore'
import { createGenerationService } from '@services/generation'
import type { Model3D } from '@shared/types'

type Tool = 'pencil' | 'eraser'

export function SketchPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<Tool>('pencil')
  const [brushSize, setBrushSize] = useState(3)
  const [hasContent, setHasContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { 
    sketchData, 
    setSketchData,
    setGenerating, 
    setGenerationProgress,
    setCurrentModel,
    addToHistory,
    setMode
  } = useAppStore()
  
  const { generationConfig } = useSettingsStore()

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    // Fill white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // If we have existing sketch data, load it
    if (sketchData) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight)
        setHasContent(true)
      }
      img.src = sketchData
    }
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getPos(e)

    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    if (tool === 'pencil') {
      ctx.strokeStyle = '#000000'
      ctx.globalCompositeOperation = 'source-over'
    } else {
      ctx.strokeStyle = '#ffffff'
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasContent(true)
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveCanvas()
    }
  }

  const saveCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const data = canvas.toDataURL('image/png')
    setSketchData(data)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    setHasContent(false)
    setSketchData(null)
  }

  const loadImage = async () => {
    try {
      const result = await window.electronAPI.loadImage()
      if (result.success && result.data) {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return

        const img = new Image()
        img.onload = () => {
          // Clear and draw image scaled to fit
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
          
          const scale = Math.min(
            canvas.offsetWidth / img.width,
            canvas.offsetHeight / img.height
          )
          const x = (canvas.offsetWidth - img.width * scale) / 2
          const y = (canvas.offsetHeight - img.height * scale) / 2
          
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
          setHasContent(true)
          saveCanvas()
        }
        img.src = result.data
      }
    } catch (err) {
      setError('Failed to load image')
    }
  }

  const handleGenerate = useCallback(async () => {
    if (!sketchData) return
    
    if (!generationConfig.apiKey) {
      setError('Please configure your 3D generation API key in settings')
      return
    }

    setError(null)
    setGenerating(true)
    setGenerationProgress(0)

    try {
      const service = createGenerationService(generationConfig)
      const task = await service.generateFromImage(sketchData)
      
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
          name: 'Sketch Model',
          createdAt: new Date(),
          sketchUrl: sketchData,
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
  }, [sketchData, generationConfig, setGenerating, setGenerationProgress, setCurrentModel, addToHistory, setMode])

  return (
    <div className="h-full flex flex-col bg-surface-900">
      {/* Header */}
      <div className="p-4 border-b border-surface-800">
        <h2 className="font-display font-semibold text-surface-200 flex items-center gap-2">
          <Pencil size={18} className="text-accent-400" />
          Sketch to 3D
        </h2>
        <p className="text-xs text-surface-500 mt-1">
          Draw or upload a sketch to generate
        </p>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b border-surface-800 flex items-center gap-2">
        <div className="flex bg-surface-800 rounded-lg p-1">
          <button
            onClick={() => setTool('pencil')}
            className={`p-2 rounded-md transition-colors ${
              tool === 'pencil' 
                ? 'bg-accent-600 text-white' 
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-md transition-colors ${
              tool === 'eraser' 
                ? 'bg-accent-600 text-white' 
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Eraser size={16} />
          </button>
        </div>

        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1 h-1 bg-surface-700 rounded-lg appearance-none cursor-pointer"
        />

        <button
          onClick={clearCanvas}
          className="p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 rounded-md transition-colors"
          title="Clear"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={loadImage}
          className="p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 rounded-md transition-colors"
          title="Upload Image"
        >
          <Upload size={16} />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      <div className="p-4 border-t border-surface-800">
        <button
          onClick={handleGenerate}
          disabled={!hasContent}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-600 hover:bg-accent-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-teal"
        >
          <Send size={16} />
          Generate from Sketch
        </button>
      </div>
    </div>
  )
}

