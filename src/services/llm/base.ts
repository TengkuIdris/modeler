import type { LLMMessage, LLMResponse, LLMConfig } from '@shared/types'

export abstract class BaseLLMProvider {
  protected config: LLMConfig

  constructor(config: LLMConfig) {
    this.config = config
  }

  abstract chat(messages: LLMMessage[]): Promise<LLMResponse>
  
  abstract stream(
    messages: LLMMessage[], 
    onChunk: (chunk: string) => void
  ): Promise<void>

  // System prompt for 3D modeling assistance
  getSystemPrompt(): string {
    return `You are an AI assistant specialized in 3D modeling and design. Your role is to:

1. Help users describe and refine 3D models they want to create
2. Interpret user requests and convert them into detailed, structured prompts for 3D generation
3. Suggest improvements and refinements to model descriptions
4. Help users iterate on their designs through conversation

When the user describes a 3D model, extract and enhance the description with:
- Shape and form details
- Dimensions and proportions (relative or absolute)
- Surface details and textures
- Style (realistic, stylized, low-poly, etc.)
- Intended use (3D printing, visualization, etc.)

Always respond concisely and focus on actionable feedback for 3D model generation.

When asked to modify a model, describe the specific changes needed clearly.`
  }

  // Format messages with system prompt
  formatMessages(messages: LLMMessage[]): LLMMessage[] {
    const hasSystem = messages.some(m => m.role === 'system')
    if (hasSystem) return messages
    
    return [
      { role: 'system', content: this.getSystemPrompt() },
      ...messages
    ]
  }
}

