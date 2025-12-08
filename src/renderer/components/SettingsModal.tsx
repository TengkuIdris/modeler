import { useState } from 'react'
import { X, Key, Brain, Cube, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '@stores/appStore'
import type { LLMProvider, GenerationProvider } from '@shared/types'

interface SettingsModalProps {
  onClose: () => void
}

const LLM_PROVIDERS: { id: LLMProvider; name: string; description: string }[] = [
  { id: 'claude', name: 'Claude (Anthropic)', description: 'Best for nuanced understanding' },
  { id: 'azure', name: 'Azure OpenAI', description: 'GPT-4 via Azure' },
  { id: 'vertex', name: 'Vertex AI', description: 'Google Gemini models' },
]

const GENERATION_PROVIDERS: { id: GenerationProvider; name: string; description: string }[] = [
  { id: 'tripo3d', name: 'Tripo3D', description: 'High quality 3D generation' },
  { id: 'meshy', name: 'Meshy', description: 'Fast 3D model creation' },
]

export function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    llmProvider,
    setLLMProvider,
    llmConfig,
    setLLMConfig,
    generationProvider,
    setGenerationProvider,
    generationConfig,
    setGenerationConfig
  } = useSettingsStore()

  const [activeTab, setActiveTab] = useState<'llm' | 'generation'>('llm')

  // Local state for form
  const [claudeKey, setClaudeKey] = useState(llmConfig.claude?.apiKey || '')
  const [azureEndpoint, setAzureEndpoint] = useState(llmConfig.azure?.endpoint || '')
  const [azureKey, setAzureKey] = useState(llmConfig.azure?.apiKey || '')
  const [azureDeployment, setAzureDeployment] = useState(llmConfig.azure?.deploymentName || '')
  const [vertexProject, setVertexProject] = useState(llmConfig.vertex?.projectId || '')
  const [vertexLocation, setVertexLocation] = useState(llmConfig.vertex?.location || 'us-central1')
  const [genApiKey, setGenApiKey] = useState(generationConfig.apiKey || '')

  const handleSave = () => {
    // Save LLM config
    setLLMConfig({
      provider: llmProvider,
      claude: { apiKey: claudeKey, model: 'claude-sonnet-4-20250514' },
      azure: { endpoint: azureEndpoint, apiKey: azureKey, deploymentName: azureDeployment },
      vertex: { projectId: vertexProject, location: vertexLocation, modelId: 'gemini-1.5-pro' }
    })

    // Save generation config
    setGenerationConfig({
      provider: generationProvider,
      apiKey: genApiKey
    })

    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-900 rounded-xl border border-surface-700 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="font-display font-semibold text-surface-200">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-surface-400 hover:text-surface-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-800">
          <button
            onClick={() => setActiveTab('llm')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'llm'
                ? 'text-accent-400 border-b-2 border-accent-400'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Brain size={16} />
            LLM Provider
          </button>
          <button
            onClick={() => setActiveTab('generation')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'generation'
                ? 'text-accent-400 border-b-2 border-accent-400'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Cube size={16} />
            3D Generation
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'llm' && (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-surface-300">Select Provider</label>
                <div className="grid grid-cols-3 gap-3">
                  {LLM_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setLLMProvider(provider.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        llmProvider === provider.id
                          ? 'border-accent-500 bg-accent-600/10'
                          : 'border-surface-700 hover:border-surface-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-surface-200">{provider.name}</span>
                        {llmProvider === provider.id && (
                          <Check size={14} className="text-accent-400" />
                        )}
                      </div>
                      <span className="text-xs text-surface-500">{provider.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider-specific settings */}
              {llmProvider === 'claude' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-surface-300 flex items-center gap-2">
                    <Key size={14} />
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm"
                  />
                </div>
              )}

              {llmProvider === 'azure' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">Azure Endpoint</label>
                    <input
                      type="text"
                      value={azureEndpoint}
                      onChange={(e) => setAzureEndpoint(e.target.value)}
                      placeholder="https://your-resource.openai.azure.com"
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">API Key</label>
                    <input
                      type="password"
                      value={azureKey}
                      onChange={(e) => setAzureKey(e.target.value)}
                      placeholder="Your Azure API key"
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">Deployment Name</label>
                    <input
                      type="text"
                      value={azureDeployment}
                      onChange={(e) => setAzureDeployment(e.target.value)}
                      placeholder="gpt-4"
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {llmProvider === 'vertex' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">Project ID</label>
                    <input
                      type="text"
                      value={vertexProject}
                      onChange={(e) => setVertexProject(e.target.value)}
                      placeholder="your-gcp-project-id"
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">Location</label>
                    <input
                      type="text"
                      value={vertexLocation}
                      onChange={(e) => setVertexLocation(e.target.value)}
                      placeholder="us-central1"
                      className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm"
                    />
                  </div>
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
                    Note: Vertex AI requires proper GCP authentication. Set up a service account or use gcloud CLI.
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'generation' && (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-surface-300">Select Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  {GENERATION_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setGenerationProvider(provider.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        generationProvider === provider.id
                          ? 'border-accent-500 bg-accent-600/10'
                          : 'border-surface-700 hover:border-surface-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-surface-200">{provider.name}</span>
                        {generationProvider === provider.id && (
                          <Check size={14} className="text-accent-400" />
                        )}
                      </div>
                      <span className="text-xs text-surface-500">{provider.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-surface-300 flex items-center gap-2">
                  <Key size={14} />
                  API Key
                </label>
                <input
                  type="password"
                  value={genApiKey}
                  onChange={(e) => setGenApiKey(e.target.value)}
                  placeholder={`Enter your ${generationProvider === 'tripo3d' ? 'Tripo3D' : 'Meshy'} API key`}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm"
                />
                <p className="text-xs text-surface-500">
                  Get your API key from{' '}
                  <a
                    href={generationProvider === 'tripo3d' ? 'https://tripo3d.ai' : 'https://meshy.ai'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-400 hover:underline"
                  >
                    {generationProvider === 'tripo3d' ? 'tripo3d.ai' : 'meshy.ai'}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-surface-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-500 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

