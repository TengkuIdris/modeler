import { BaseLLMProvider } from './base'
import type { LLMMessage, LLMResponse, LLMConfig } from '@shared/types'

// Vertex AI requires server-side auth, so we'll use the REST API
// For desktop, you'd typically use a service account or OAuth
export class VertexLLMProvider extends BaseLLMProvider {
  private baseUrl: string

  constructor(config: LLMConfig) {
    super(config)
    if (config.vertex) {
      this.baseUrl = `https://${config.vertex.location}-aiplatform.googleapis.com/v1/projects/${config.vertex.projectId}/locations/${config.vertex.location}/publishers/google/models/${config.vertex.modelId || 'gemini-1.5-pro'}`
    } else {
      this.baseUrl = ''
    }
  }

  // Note: For production, implement proper OAuth flow or use service account
  // This is a simplified version that expects an access token
  private async getAccessToken(): Promise<string> {
    // In production, implement proper auth:
    // - Service account JSON key
    // - OAuth 2.0 flow
    // - gcloud CLI token
    
    // For now, we'll expect the token to be provided in config
    // You might want to use @google-cloud/vertexai package with proper auth
    throw new Error(
      'Vertex AI requires authentication. Please configure a service account or use gcloud auth.'
    )
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.vertex) {
      throw new Error('Vertex AI not configured')
    }

    const formattedMessages = this.formatMessages(messages)
    const systemMessage = formattedMessages.find(m => m.role === 'system')
    const chatMessages = formattedMessages.filter(m => m.role !== 'system')

    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.baseUrl}:generateContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: chatMessages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        systemInstruction: systemMessage ? {
          parts: [{ text: systemMessage.content }]
        } : undefined,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Vertex AI error: ${response.statusText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return {
      content: text,
      usage: data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount,
        outputTokens: data.usageMetadata.candidatesTokenCount
      } : undefined
    }
  }

  async stream(
    messages: LLMMessage[], 
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.config.vertex) {
      throw new Error('Vertex AI not configured')
    }

    const formattedMessages = this.formatMessages(messages)
    const systemMessage = formattedMessages.find(m => m.role === 'system')
    const chatMessages = formattedMessages.filter(m => m.role !== 'system')

    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.baseUrl}:streamGenerateContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: chatMessages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        systemInstruction: systemMessage ? {
          parts: [{ text: systemMessage.content }]
        } : undefined,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Vertex AI error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      // Parse SSE-like response from Vertex
      const lines = text.split('\n').filter(l => l.trim())
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (chunk) {
            onChunk(chunk)
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }
}


