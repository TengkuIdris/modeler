import type { LLMConfig, LLMProvider } from '@shared/types'
import { BaseLLMProvider } from './base'
import { ClaudeLLMProvider } from './claude'
import { AzureLLMProvider } from './azure'
import { VertexLLMProvider } from './vertex'

export function createLLMProvider(config: LLMConfig): BaseLLMProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeLLMProvider(config)
    case 'azure':
      return new AzureLLMProvider(config)
    case 'vertex':
      return new VertexLLMProvider(config)
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`)
  }
}

export { BaseLLMProvider } from './base'
export { ClaudeLLMProvider } from './claude'
export { AzureLLMProvider } from './azure'
export { VertexLLMProvider } from './vertex'

