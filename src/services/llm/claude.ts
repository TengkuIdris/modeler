import Anthropic from '@anthropic-ai/sdk'
import { BaseLLMProvider } from './base'
import type { LLMMessage, LLMResponse, LLMConfig } from '@shared/types'

export class ClaudeLLMProvider extends BaseLLMProvider {
  private client: Anthropic | null = null

  constructor(config: LLMConfig) {
    super(config)
    if (config.claude?.apiKey) {
      this.client = new Anthropic({
        apiKey: config.claude.apiKey,
        dangerouslyAllowBrowser: true // Required for Electron renderer
      })
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.client || !this.config.claude) {
      throw new Error('Claude API not configured')
    }

    const formattedMessages = this.formatMessages(messages)
    const systemMessage = formattedMessages.find(m => m.role === 'system')
    const chatMessages = formattedMessages.filter(m => m.role !== 'system')

    const response = await this.client.messages.create({
      model: this.config.claude.model || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemMessage?.content || this.getSystemPrompt(),
      messages: chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    })

    const textContent = response.content.find(c => c.type === 'text')
    
    return {
      content: textContent?.text || '',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    }
  }

  async stream(
    messages: LLMMessage[], 
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.client || !this.config.claude) {
      throw new Error('Claude API not configured')
    }

    const formattedMessages = this.formatMessages(messages)
    const systemMessage = formattedMessages.find(m => m.role === 'system')
    const chatMessages = formattedMessages.filter(m => m.role !== 'system')

    const stream = this.client.messages.stream({
      model: this.config.claude.model || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemMessage?.content || this.getSystemPrompt(),
      messages: chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onChunk(event.delta.text)
      }
    }
  }
}

