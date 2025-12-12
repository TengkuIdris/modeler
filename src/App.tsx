import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ProceduralGenerator, MeshBuilder, exportToSTL } from './services/procedural'
import type { ModelRecipe, ServiceAccount } from './services/procedural'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    model: THREE.Group | null
  } | null>(null)

  const [showSettings, setShowSettings] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [recipe, setRecipe] = useState<ModelRecipe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Ready')
  
  // Settings state
  const [provider, setProvider] = useState<'claude' | 'azure' | 'vertex'>('vertex')
  const [apiKey, setApiKey] = useState('')
  const [azureEndpoint, setAzureEndpoint] = useState('')
  const [azureDeployment, setAzureDeployment] = useState('')
  const [serviceAccount, setServiceAccount] = useState<ServiceAccount | null>(null)
  const [serviceAccountName, setServiceAccountName] = useState<string>('')
  const [vertexLocation, setVertexLocation] = useState('us-central1')
  const [vertexModel, setVertexModel] = useState('gemini-1.0-pro-002')

  // Load settings
  useEffect(() => {
    const saved = localStorage.getItem('modeler-settings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        setProvider(settings.provider || 'vertex')
        setApiKey(settings.apiKey || '')
        setAzureEndpoint(settings.azureEndpoint || '')
        setAzureDeployment(settings.azureDeployment || '')
        setVertexLocation(settings.vertexLocation || 'us-central1')
        setVertexModel(settings.vertexModel || 'gemini-1.0-pro-002')
        if (settings.serviceAccount) {
          setServiceAccount(settings.serviceAccount)
          setServiceAccountName(settings.serviceAccountName || 'service-account.json')
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }, [])

  // Initialize Three.js
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f0f1a)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(5, 3, 5)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(10, 10, 5)
    directional.castShadow = true
    scene.add(directional)

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x2a2a3e, 0x1a1a2e)
    scene.add(grid)

    // Placeholder model
    const placeholder = createPlaceholder()
    scene.add(placeholder)

    sceneRef.current = { scene, camera, renderer, controls, model: placeholder }

    // Animation loop
    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      controls.update()
      
      // Rotate placeholder
      if (sceneRef.current?.model && !recipe) {
        sceneRef.current.model.rotation.y += 0.005
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [])

  // Update model when recipe changes
  useEffect(() => {
    if (!sceneRef.current || !recipe) return

    const { scene, model: oldModel } = sceneRef.current

    // Remove old model
    if (oldModel) {
      scene.remove(oldModel)
    }

    // Build new model
    try {
      const builder = new MeshBuilder()
      const newModel = builder.buildFromRecipe(recipe)
      scene.add(newModel)
      sceneRef.current.model = newModel
    } catch (e) {
      console.error('Failed to build model:', e)
      setError('Failed to build 3D model')
    }
  }, [recipe])

  const saveSettings = () => {
    localStorage.setItem('modeler-settings', JSON.stringify({
      provider, apiKey, azureEndpoint, azureDeployment, serviceAccount, serviceAccountName,
      vertexLocation, vertexModel
    }))
    setShowSettings(false)
    setStatus('Settings saved!')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        if (json.type === 'service_account' && json.private_key && json.client_email) {
          setServiceAccount(json)
          setServiceAccountName(file.name)
          setStatus('Service account loaded!')
        } else {
          setError('Invalid service account JSON file')
        }
      } catch {
        setError('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description')
      return
    }
    
    if (provider === 'vertex' && !serviceAccount) {
      setError('Please upload your Vertex AI service account JSON file')
      return
    }
    if ((provider === 'claude' || provider === 'azure') && !apiKey) {
      setError('Please configure your API key in Settings')
      return
    }

    setIsGenerating(true)
    setError(null)
    setStatus('Generating 3D model...')

    try {
      const generator = new ProceduralGenerator({
        provider,
        apiKey,
        endpoint: provider === 'vertex' ? vertexLocation : azureEndpoint,
        deploymentName: provider === 'vertex' ? vertexModel : azureDeployment,
        serviceAccount: serviceAccount || undefined
      })

      const result = await generator.generate(prompt)

      if (result.success && result.recipe) {
        setRecipe(result.recipe)
        setStatus(`Generated: ${result.recipe.name}`)
      } else {
        throw new Error(result.error || 'Generation failed')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setError(msg)
      setStatus('Error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async () => {
    if (!recipe || !sceneRef.current?.model) return

    try {
      setStatus('Exporting STL...')
      sceneRef.current.model.updateMatrixWorld(true)
      const stlData = exportToSTL(sceneRef.current.model)
      const filename = `${recipe.name.replace(/[^a-z0-9]/gi, '_')}.stl`

      if (window.electronAPI?.saveSTL) {
        const result = await window.electronAPI.saveSTL(filename, stlData)
        setStatus(result.success ? `Saved: ${result.path}` : 'Export cancelled')
      } else {
        const blob = new Blob([stlData], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        setStatus(`Downloaded: ${filename}`)
      }
    } catch (err) {
      setError('Export failed')
    }
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={logoStyle}>M</div>
          <span style={{ fontSize: '20px', fontWeight: '600' }}>Modeler</span>
          <span style={{ color: '#666', fontSize: '14px' }}>• {status}</span>
        </div>
        <button onClick={() => setShowSettings(true)} style={settingsBtnStyle}>
          ⚙️ Settings
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 3D Viewport */}
        <div style={{ flex: 1, position: 'relative' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          
          {recipe && (
            <div style={overlayStyle}>
              ✅ {recipe.name} • {recipe.shapes.length} shapes
            </div>
          )}
        </div>

        {/* Panel */}
        <div style={panelStyle}>
          <div style={{ padding: '20px', borderBottom: '1px solid #2a2a3e' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>✨ Text to 3D</h2>
            <p style={{ color: '#666', fontSize: '12px', margin: '4px 0 0' }}>
              Describe your model • 100% Free
            </p>
          </div>

          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A coffee mug with a curved handle..."
              style={textareaStyle}
            />

            {error && <div style={errorStyle}>{error}</div>}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                ...generateBtnStyle,
                opacity: isGenerating ? 0.6 : 1,
                cursor: isGenerating ? 'wait' : 'pointer'
              }}
            >
              {isGenerating ? '⏳ Generating...' : '🚀 Generate 3D Model'}
            </button>

            {recipe && (
              <button onClick={handleExport} style={exportBtnStyle}>
                💾 Export STL for 3D Printing
              </button>
            )}

            <div style={{ marginTop: '20px' }}>
              <p style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>
                💡 Examples:
              </p>
              {['A coffee mug with handle', 'A simple wooden chair', 'A snowman', 'A rocket ship'].map(ex => (
                <button key={ex} onClick={() => setPrompt(ex)} style={exampleBtnStyle}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={modalOverlayStyle} onClick={() => setShowSettings(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0 }}>⚙️ Settings</h2>
              <button onClick={() => setShowSettings(false)} style={closeBtnStyle}>×</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <h3 style={{ color: '#00d9ff', fontSize: '14px', margin: '0 0 12px' }}>
                🧠 LLM Provider
              </h3>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['vertex', 'claude', 'azure'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: provider === p ? '#00d9ff22' : '#1a1a2e',
                      border: provider === p ? '2px solid #00d9ff' : '1px solid #2a2a3e',
                      borderRadius: '6px',
                      color: provider === p ? '#00d9ff' : '#888',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {p === 'vertex' && '🟢 Vertex AI'}
                    {p === 'claude' && '🟣 Claude'}
                    {p === 'azure' && '🔵 Azure'}
                  </button>
                ))}
              </div>

              {/* Vertex AI - File Upload */}
              {provider === 'vertex' && (
                <div style={{ backgroundColor: '#0f0f1a', padding: '16px', borderRadius: '8px', border: '1px solid #2a2a3e' }}>
                  <p style={{ color: '#888', fontSize: '12px', margin: '0 0 12px' }}>
                    Upload your Google Cloud service account JSON file:
                  </p>
                  
                  <label style={{
                    display: 'block',
                    padding: '16px',
                    backgroundColor: '#1a1a2e',
                    border: '2px dashed #3a3a4e',
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginBottom: '12px'
                  }}>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <span style={{ color: '#00d9ff', fontSize: '24px', display: 'block', marginBottom: '8px' }}>
                      📁
                    </span>
                    <span style={{ color: '#888', fontSize: '13px' }}>
                      {serviceAccountName || 'Click to upload service-account.json'}
                    </span>
                  </label>

                  {serviceAccount && (
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: '#0a3a2a', 
                      borderRadius: '6px',
                      border: '1px solid #0a5a3a',
                      marginBottom: '12px'
                    }}>
                      <p style={{ color: '#4ade80', fontSize: '12px', margin: 0 }}>
                        ✅ Project: {serviceAccount.project_id}
                      </p>
                    </div>
                  )}

                  {/* Location Selection */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                      Region:
                    </label>
                    <select
                      value={vertexLocation}
                      onChange={e => setVertexLocation(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #2a2a3e',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px'
                      }}
                    >
                      <option value="us-central1">us-central1 (Iowa)</option>
                      <option value="us-east4">us-east4 (Virginia)</option>
                      <option value="us-west1">us-west1 (Oregon)</option>
                      <option value="europe-west1">europe-west1 (Belgium)</option>
                      <option value="europe-west4">europe-west4 (Netherlands)</option>
                      <option value="asia-northeast1">asia-northeast1 (Tokyo)</option>
                      <option value="asia-southeast1">asia-southeast1 (Singapore)</option>
                    </select>
                  </div>

                  {/* Model Selection */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                      Model:
                    </label>
                    <select
                      value={vertexModel}
                      onChange={e => setVertexModel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #2a2a3e',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px'
                      }}
                    >
                      <optgroup label="Gemini 2.0 (Latest)">
                        <option value="gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                        <option value="gemini-2.0-flash-lite-001">Gemini 2.0 Flash Lite</option>
                      </optgroup>
                      <optgroup label="Gemini 1.5">
                        <option value="gemini-1.5-pro-002">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-pro-001">Gemini 1.5 Pro (v1)</option>
                        <option value="gemini-1.5-flash-002">Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-flash-001">Gemini 1.5 Flash (v1)</option>
                      </optgroup>
                      <optgroup label="Gemini 1.0">
                        <option value="gemini-1.0-pro-002">Gemini 1.0 Pro</option>
                        <option value="gemini-1.0-pro-001">Gemini 1.0 Pro (v1)</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Custom Model Input */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                      Or enter custom model name:
                    </label>
                    <input
                      type="text"
                      value={vertexModel}
                      onChange={e => setVertexModel(e.target.value)}
                      placeholder="e.g., gemini-2.5-flash-preview"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #2a2a3e',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <p style={{ color: '#666', fontSize: '11px', margin: '0' }}>
                    💡 Create a service account at{' '}
                    <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" 
                       target="_blank" 
                       style={{ color: '#00d9ff' }}>
                      Google Cloud Console
                    </a>
                    {' '}with Vertex AI User role
                  </p>
                </div>
              )}

              {/* Claude */}
              {provider === 'claude' && (
                <div style={{ backgroundColor: '#0f0f1a', padding: '16px', borderRadius: '8px', border: '1px solid #2a2a3e' }}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Anthropic API Key (sk-ant-...)"
                    style={inputStyle}
                  />
                  <p style={{ color: '#666', fontSize: '11px', margin: '12px 0 0' }}>
                    💡 Get your key at console.anthropic.com
                  </p>
                </div>
              )}

              {/* Azure */}
              {provider === 'azure' && (
                <div style={{ backgroundColor: '#0f0f1a', padding: '16px', borderRadius: '8px', border: '1px solid #2a2a3e' }}>
                  <input
                    type="text"
                    value={azureEndpoint}
                    onChange={e => setAzureEndpoint(e.target.value)}
                    placeholder="Azure Endpoint URL"
                    style={{ ...inputStyle, marginBottom: '8px' }}
                  />
                  <input
                    type="text"
                    value={azureDeployment}
                    onChange={e => setAzureDeployment(e.target.value)}
                    placeholder="Deployment Name"
                    style={{ ...inputStyle, marginBottom: '8px' }}
                  />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="API Key"
                    style={inputStyle}
                  />
                </div>
              )}

              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a2a3a', borderRadius: '6px', border: '1px solid #2a3a4a' }}>
                <p style={{ color: '#88ccff', fontSize: '12px', margin: 0 }}>
                  💡 <strong>100% Free 3D Generation</strong> - Uses your LLM to create models procedurally. No paid 3D APIs needed!
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid #2a2a3e', textAlign: 'right' }}>
              <button onClick={saveSettings} style={saveBtnStyle}>💾 Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function createPlaceholder(): THREE.Group {
  const group = new THREE.Group()
  
  const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16)
  const material = new THREE.MeshStandardMaterial({
    color: 0x00d9ff,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  })
  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)
  
  return group
}

// Styles
const containerStyle: React.CSSProperties = {
  height: '100vh',
  width: '100vw',
  backgroundColor: '#0f0f1a',
  color: 'white',
  fontFamily: 'system-ui, sans-serif',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}

const headerStyle: React.CSSProperties = {
  height: '56px',
  backgroundColor: '#1a1a2e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  borderBottom: '1px solid #2a2a3e'
}

const logoStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  color: '#0f0f1a',
  fontSize: '18px'
}

const settingsBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#2a2a3e',
  border: '1px solid #3a3a4e',
  borderRadius: '6px',
  color: 'white',
  cursor: 'pointer'
}

const panelStyle: React.CSSProperties = {
  width: '340px',
  backgroundColor: '#1a1a2e',
  borderLeft: '1px solid #2a2a3e',
  display: 'flex',
  flexDirection: 'column'
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  height: '100px',
  backgroundColor: '#0f0f1a',
  border: '1px solid #2a2a3e',
  borderRadius: '8px',
  padding: '12px',
  color: 'white',
  fontSize: '14px',
  resize: 'none',
  marginBottom: '12px',
  fontFamily: 'inherit'
}

const errorStyle: React.CSSProperties = {
  padding: '10px',
  backgroundColor: 'rgba(255,100,100,0.1)',
  border: '1px solid rgba(255,100,100,0.3)',
  borderRadius: '6px',
  color: '#ff6b6b',
  fontSize: '12px',
  marginBottom: '12px'
}

const generateBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
  border: 'none',
  borderRadius: '8px',
  color: '#0f0f1a',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '14px'
}

const exportBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#2a2a3e',
  border: '1px solid #3a3a4e',
  borderRadius: '8px',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
  marginTop: '8px'
}

const exampleBtnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 10px',
  backgroundColor: 'transparent',
  border: '1px solid #2a2a3e',
  borderRadius: '6px',
  color: '#888',
  fontSize: '12px',
  cursor: 'pointer',
  marginBottom: '6px'
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '16px',
  left: '16px',
  padding: '8px 12px',
  backgroundColor: 'rgba(26,26,46,0.9)',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#00d9ff'
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
}

const modalStyle: React.CSSProperties = {
  width: '420px',
  backgroundColor: '#1a1a2e',
  borderRadius: '12px',
  border: '1px solid #2a2a3e'
}

const modalHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #2a2a3e',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#666',
  fontSize: '24px',
  cursor: 'pointer'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#0f0f1a',
  border: '1px solid #2a2a3e',
  borderRadius: '6px',
  color: 'white',
  fontSize: '13px'
}

const saveBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
  border: 'none',
  borderRadius: '6px',
  color: '#0f0f1a',
  fontWeight: '600',
  cursor: 'pointer'
}
