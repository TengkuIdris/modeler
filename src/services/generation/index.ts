import type { GenerationConfig, GenerationResult } from '@shared/types'
import { Tripo3DService } from './tripo3d'
import { MeshyService } from './meshy'

export interface Generation3DService {
  generateFromText(prompt: string): Promise<GenerationResult>
  generateFromImage(imageData: string): Promise<GenerationResult>
  checkStatus(taskId: string): Promise<GenerationResult>
  downloadMesh(url: string): Promise<ArrayBuffer>
  waitForCompletion(
    taskId: string, 
    onProgress?: (progress: number) => void
  ): Promise<GenerationResult>
}

export function createGenerationService(config: GenerationConfig): Generation3DService {
  switch (config.provider) {
    case 'tripo3d':
      return new Tripo3DService(config)
    case 'meshy':
      return new MeshyService(config)
    default:
      throw new Error(`Unknown generation provider: ${config.provider}`)
  }
}

export { Tripo3DService } from './tripo3d'
export { MeshyService } from './meshy'


