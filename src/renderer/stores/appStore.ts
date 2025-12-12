import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  AppMode, 
  Model3D, 
  ChatMessage, 
  LLMConfig, 
  GenerationConfig,
  LLMProvider,
  GenerationProvider 
} from '@shared/types'

interface AppState {
  // Mode
  mode: AppMode
  setMode: (mode: AppMode) => void

  // Current Model
  currentModel: Model3D | null
  setCurrentModel: (model: Model3D | null) => void

  // Generation State
  isGenerating: boolean
  generationProgress: number
  setGenerating: (isGenerating: boolean) => void
  setGenerationProgress: (progress: number) => void

  // History
  history: Model3D[]
  addToHistory: (model: Model3D) => void
  clearHistory: () => void

  // Chat Messages
  messages: ChatMessage[]
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void

  // Prompt/Sketch Input
  promptText: string
  setPromptText: (text: string) => void
  sketchData: string | null
  setSketchData: (data: string | null) => void

  // Settings Panel
  isSettingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

interface SettingsState {
  // LLM Settings
  llmProvider: LLMProvider
  setLLMProvider: (provider: LLMProvider) => void
  llmConfig: LLMConfig
  setLLMConfig: (config: LLMConfig) => void

  // Generation Settings
  generationProvider: GenerationProvider
  setGenerationProvider: (provider: GenerationProvider) => void
  generationConfig: GenerationConfig
  setGenerationConfig: (config: GenerationConfig) => void
}

export const useAppStore = create<AppState>()((set) => ({
  // Mode
  mode: 'prompt',
  setMode: (mode) => set({ mode }),

  // Current Model
  currentModel: null,
  setCurrentModel: (model) => set({ currentModel: model }),

  // Generation State
  isGenerating: false,
  generationProgress: 0,
  setGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationProgress: (generationProgress) => set({ generationProgress }),

  // History
  history: [],
  addToHistory: (model) => set((state) => ({ 
    history: [model, ...state.history].slice(0, 50) // Keep last 50
  })),
  clearHistory: () => set({ history: [] }),

  // Chat Messages
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }]
  })),
  clearMessages: () => set({ messages: [] }),

  // Prompt/Sketch Input
  promptText: '',
  setPromptText: (promptText) => set({ promptText }),
  sketchData: null,
  setSketchData: (sketchData) => set({ sketchData }),

  // Settings Panel
  isSettingsOpen: false,
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
}))

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // LLM Settings
      llmProvider: 'claude',
      setLLMProvider: (llmProvider) => set({ llmProvider }),
      llmConfig: {
        provider: 'claude',
        claude: {
          apiKey: '',
          model: 'claude-sonnet-4-20250514'
        }
      },
      setLLMConfig: (llmConfig) => set({ llmConfig }),

      // Generation Settings  
      generationProvider: 'tripo3d',
      setGenerationProvider: (generationProvider) => set({ generationProvider }),
      generationConfig: {
        provider: 'tripo3d',
        apiKey: ''
      },
      setGenerationConfig: (generationConfig) => set({ generationConfig }),
    }),
    {
      name: 'modeler-settings',
    }
  )
)


