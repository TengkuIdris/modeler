import type { ModelRecipe, GenerationResult } from './types'

// Service account type for Vertex AI
export interface ServiceAccount {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

const SYSTEM_PROMPT = `You are a 3D model architect. Your job is to convert text descriptions into JSON recipes that describe 3D models using primitive shapes.

AVAILABLE PRIMITIVES:
- box: A rectangular box (use scale for dimensions)
- sphere: A sphere (scale[0] controls radius)
- cylinder: A cylinder (use params.radiusTop, params.radiusBottom for different radii)
- cone: A cone shape
- torus: A donut shape (params.radius for ring radius, params.tube for tube thickness)
- capsule: A pill shape

OUTPUT FORMAT (JSON only, no markdown):
{
  "name": "Model Name",
  "description": "Brief description",
  "shapes": [
    {
      "type": "box",
      "position": [x, y, z],
      "rotation": [rx, ry, rz],
      "scale": [width, height, depth],
      "color": "#hexcolor"
    }
  ],
  "centerAtOrigin": true,
  "uniformScale": 1.0
}

GUIDELINES:
1. Use realistic proportions (units are roughly centimeters)
2. Position [0,0,0] is the center. Y is up.
3. Combine multiple primitives to create complex shapes
4. Use contrasting colors for different parts
5. Keep models printable (no floating parts, reasonable thickness)
6. Rotation is in degrees

EXAMPLES:
- "coffee mug" → cylinder for body, torus for handle
- "simple chair" → box for seat, 4 thin boxes for legs, box for backrest  
- "snowman" → 3 spheres stacked, small spheres for eyes/buttons
- "table" → flat box for top, 4 cylinders for legs

Respond with ONLY the JSON, no explanation.`

export class ProceduralGenerator {
  private apiKey: string
  private provider: 'claude' | 'azure' | 'vertex'
  private endpoint?: string
  private deploymentName?: string
  private serviceAccount?: ServiceAccount

  constructor(config: {
    provider: 'claude' | 'azure' | 'vertex'
    apiKey: string
    endpoint?: string
    deploymentName?: string
    serviceAccount?: ServiceAccount
  }) {
    this.provider = config.provider
    this.apiKey = config.apiKey
    this.endpoint = config.endpoint
    this.deploymentName = config.deploymentName
    this.serviceAccount = config.serviceAccount
  }

  async generate(prompt: string): Promise<GenerationResult> {
    try {
      let response: string

      switch (this.provider) {
        case 'claude':
          response = await this.callClaude(prompt)
          break
        case 'azure':
          response = await this.callAzure(prompt)
          break
        case 'vertex':
          response = await this.callVertex(prompt)
          break
        default:
          throw new Error('Unknown provider')
      }

      // Parse the JSON response
      const recipe = this.parseRecipe(response)
      return { success: true, recipe }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed'
      }
    }
  }

  private async callClaude(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `Create a 3D model recipe for: ${prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no explanation.` }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Claude API error')
    }

    const data = await response.json()
    return data.content[0].text
  }

  private async callAzure(prompt: string): Promise<string> {
    if (!this.endpoint || !this.deploymentName) {
      throw new Error('Azure endpoint and deployment name required')
    }

    const response = await fetch(
      `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=2024-02-15-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Create a 3D model recipe for: ${prompt}` }
          ],
          max_tokens: 2048,
          temperature: 0.7
        })
      }
    )

    if (!response.ok) {
      throw new Error('Azure OpenAI API error')
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  private async callVertex(prompt: string): Promise<string> {
    if (!this.serviceAccount) {
      throw new Error('Vertex AI requires a service account JSON file')
    }

    // Get access token from service account
    const accessToken = await this.getVertexAccessToken()
    
    const projectId = this.serviceAccount.project_id
    const location = this.endpoint || 'us-central1'
    // Use gemini-1.0-pro which is widely available, or user-specified model
    const model = this.deploymentName || 'gemini-1.0-pro-002'
    
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\nCreate a 3D model recipe for: ${prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no explanation.` }]
        }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vertex AI error: ${error}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  private async getVertexAccessToken(): Promise<string> {
    if (!this.serviceAccount) {
      throw new Error('No service account configured')
    }

    // Create JWT for service account authentication
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
      iss: this.serviceAccount.client_email,
      sub: this.serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    }

    // Base64url encode
    const base64url = (obj: object) => {
      const str = JSON.stringify(obj)
      const base64 = btoa(str)
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }

    const headerEncoded = base64url(header)
    const payloadEncoded = base64url(payload)
    const signatureInput = `${headerEncoded}.${payloadEncoded}`

    // Sign with private key using Web Crypto API
    const privateKey = this.serviceAccount.private_key
    const pemHeader = '-----BEGIN PRIVATE KEY-----'
    const pemFooter = '-----END PRIVATE KEY-----'
    const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '')
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    )

    const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const jwt = `${signatureInput}.${signatureEncoded}`

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Vertex AI access token')
    }

    const tokenData = await tokenResponse.json()
    return tokenData.access_token
  }

  private parseRecipe(response: string): ModelRecipe {
    // Clean up response - remove markdown code blocks and extra text
    let json = response.trim()
    
    // Remove markdown code blocks
    if (json.includes('```')) {
      const match = json.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) {
        json = match[1].trim()
      } else {
        // Try to extract just the code block content
        json = json.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
      }
    }
    
    // Try to find JSON object in the response
    const jsonStart = json.indexOf('{')
    const jsonEnd = json.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      json = json.substring(jsonStart, jsonEnd + 1)
    }

    console.log('Parsing JSON:', json.substring(0, 200) + '...')

    try {
      const recipe = JSON.parse(json) as ModelRecipe

      // Validate required fields
      if (!recipe.shapes || !Array.isArray(recipe.shapes)) {
        throw new Error('Invalid recipe: missing shapes array')
      }

      // Set defaults
      recipe.name = recipe.name || 'Generated Model'
      recipe.description = recipe.description || ''
      recipe.centerAtOrigin = recipe.centerAtOrigin ?? true
      recipe.uniformScale = recipe.uniformScale ?? 1

      // Validate and fix shapes
      recipe.shapes = recipe.shapes.map((shape, i) => ({
        type: shape.type || 'box',
        position: shape.position || [0, 0, 0],
        rotation: shape.rotation || [0, 0, 0],
        scale: shape.scale || [1, 1, 1],
        color: shape.color || this.getDefaultColor(i),
        params: shape.params
      }))

      return recipe
    } catch (e) {
      throw new Error(`Failed to parse model recipe: ${e}`)
    }
  }

  private getDefaultColor(index: number): string {
    const colors = [
      '#00d9ff', // cyan
      '#ff6b6b', // red
      '#4ecdc4', // teal
      '#ffe66d', // yellow
      '#95e1d3', // mint
      '#f38181', // coral
      '#aa96da', // lavender
      '#fcbad3', // pink
    ]
    return colors[index % colors.length]
  }
}

