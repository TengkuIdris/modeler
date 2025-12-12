import type { GenerationConfig, GenerationResult } from '@shared/types'

const MESHY_API_BASE = 'https://api.meshy.ai/v2'

export class MeshyService {
  private apiKey: string

  constructor(config: GenerationConfig) {
    this.apiKey = config.apiKey
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${MESHY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Meshy API error: ${response.statusText}`)
    }

    return response
  }

  async generateFromText(prompt: string, style: string = 'realistic'): Promise<GenerationResult> {
    const response = await this.request('/text-to-3d', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'preview', // 'preview' or 'refine'
        prompt: prompt,
        art_style: style, // realistic, cartoon, low-poly, etc.
        negative_prompt: 'low quality, blurry, distorted'
      })
    })

    const data = await response.json()
    
    return {
      id: data.result,
      status: 'pending'
    }
  }

  async generateFromImage(imageUrl: string): Promise<GenerationResult> {
    const response = await this.request('/image-to-3d', {
      method: 'POST',
      body: JSON.stringify({
        image_url: imageUrl
      })
    })

    const data = await response.json()
    
    return {
      id: data.result,
      status: 'pending'
    }
  }

  async checkStatus(taskId: string): Promise<GenerationResult> {
    const response = await this.request(`/text-to-3d/${taskId}`)
    const data = await response.json()

    let status: GenerationResult['status'] = 'pending'
    if (data.status === 'IN_PROGRESS') status = 'processing'
    else if (data.status === 'SUCCEEDED') status = 'completed'
    else if (data.status === 'FAILED' || data.status === 'EXPIRED') status = 'failed'

    return {
      id: taskId,
      status,
      progress: data.progress || 0,
      meshUrl: data.model_urls?.glb || data.model_urls?.obj,
      thumbnailUrl: data.thumbnail_url,
      error: data.status === 'FAILED' ? data.task_error?.message : undefined
    }
  }

  async downloadMesh(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to download mesh')
    }
    return response.arrayBuffer()
  }

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


