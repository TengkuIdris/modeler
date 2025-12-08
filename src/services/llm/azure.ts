import { AzureOpenAI } from '@azure/openai'
import { BaseLLMProvider } from './base'
import type { LLMMessage, LLMResponse, LLMConfig } from '@shared/types'

export class AzureLLMProvider extends BaseLLMProvider {
  private client: AzureOpenAI | null = null

  constructor(config: LLMConfig) {
    super(config)
    if (config.azure?.endpoint && config.azure?.apiKey) {
      this.client = new AzureOpenAI({
        endpoint: config.azure.endpoint,
        apiKey: config.azure.apiKey,
        apiVersion: '2024-02-15-preview',
        dangerouslyAllowBrowser: true
      })
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.client || !this.config.azure) {
      throw new Error('Azure OpenAI not configured')
    }

    const formattedMessages = this.formatMessages(messages)

    const response = await this.client.chat.completions.create({
      model: this.config.azure.deploymentName,
      messages: formattedMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: 2048,
      temperature: 0.7
    })

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens
      } : undefined
    }
  }

  async stream(
    messages: LLMMessage[], 
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.client || !this.config.azure) {
      throw new Error('Azure OpenAI not configured')
    }

    const formattedMessages = this.formatMessages(messages)

    const stream = await this.client.chat.completions.create({
      model: this.config.azure.deploymentName,
      messages: formattedMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: 2048,
      temperature: 0.7,
      stream: true
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        onChunk(delta)
      }
    }
  }
}

