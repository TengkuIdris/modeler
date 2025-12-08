import type { GenerationConfig, GenerationRequest, GenerationResult } from '@shared/types'

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi'

export class Tripo3DService {
  private apiKey: string

  constructor(config: GenerationConfig) {
    this.apiKey = config.apiKey
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${TRIPO_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Tripo3D API error: ${response.statusText}`)
    }

    return response
  }

  async generateFromText(prompt: string): Promise<GenerationResult> {
    const response = await this.request('/task', {
      method: 'POST',
      body: JSON.stringify({
        type: 'text_to_model',
        prompt: prompt
      })
    })

    const data = await response.json()
    
    return {
      id: data.data.task_id,
      status: 'pending'
    }
  }

  async generateFromImage(imageData: string): Promise<GenerationResult> {
    // First upload the image
    const uploadResponse = await this.request('/upload', {
      method: 'POST',
      body: JSON.stringify({
        file: imageData // base64 data URL
      })
    })

    const uploadData = await uploadResponse.json()
    const imageToken = uploadData.data.image_token

    // Then create task
    const response = await this.request('/task', {
      method: 'POST',
      body: JSON.stringify({
        type: 'image_to_model',
        file: {
          type: 'image_token',
          image_token: imageToken
        }
      })
    })

    const data = await response.json()
    
    return {
      id: data.data.task_id,
      status: 'pending'
    }
  }

  async checkStatus(taskId: string): Promise<GenerationResult> {
    const response = await this.request(`/task/${taskId}`)
    const data = await response.json()
    const task = data.data

    let status: GenerationResult['status'] = 'pending'
    if (task.status === 'running') status = 'processing'
    else if (task.status === 'success') status = 'completed'
    else if (task.status === 'failed') status = 'failed'

    return {
      id: taskId,
      status,
      progress: task.progress || 0,
      meshUrl: task.output?.model,
      thumbnailUrl: task.output?.rendered_image,
      error: task.status === 'failed' ? 'Generation failed' : undefined
    }
  }

  async downloadMesh(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to download mesh')
    }
    return response.arrayBuffer()
  }

  // Poll for completion
  async waitForCompletion(
    taskId: string, 
    onProgress?: (progress: number) => void,
    maxAttempts = 120,
    interval = 2000
  ): Promise<GenerationResult> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.checkStatus(taskId)
      
      if (onProgress && result.progress !== undefined) {
        onProgress(result.progress)
      }

      if (result.status === 'completed' || result.status === 'failed') {
        return result
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('Generation timed out')
  }
}

