// LLM Provider Types
export type LLMProvider = 'azure' | 'vertex' | 'claude'

export interface LLMConfig {
  provider: LLMProvider
  azure?: {
    endpoint: string
    apiKey: string
    deploymentName: string
  }
  vertex?: {
    projectId: string
    location: string
    modelId: string
  }
  claude?: {
    apiKey: string
    model: string
  }
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

// 3D Generation Types
export type GenerationProvider = 'tripo3d' | 'meshy'

export interface GenerationConfig {
  provider: GenerationProvider
  apiKey: string
}

export interface GenerationRequest {
  type: 'text' | 'image'
  prompt?: string
  imageData?: string
  style?: string
  quality?: 'draft' | 'standard' | 'high'
}

export interface GenerationResult {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  meshUrl?: string
  thumbnailUrl?: string
  error?: string
}

// Model Types
export interface Model3D {
  id: string
  name: string
  createdAt: Date
  prompt?: string
  sketchUrl?: string
  meshData?: ArrayBuffer
  thumbnailUrl?: string
}

// App State Types
export type AppMode = 'prompt' | 'sketch' | 'edit'

export interface EditorState {
  mode: AppMode
  currentModel: Model3D | null
  isGenerating: boolean
  generationProgress: number
  history: Model3D[]
}

// Chat/Editing Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  modelUpdate?: Partial<Model3D>
}

// Settings Types
export interface AppSettings {
  llm: LLMConfig
  generation: GenerationConfig
  theme: 'dark' | 'light'
  autoSave: boolean
}


