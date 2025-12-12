import { useState } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '@stores/appStore'
import type { LLMProvider, GenerationProvider } from '@shared/types'

interface SettingsModalProps {
  onClose: () => void
}

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
    setLLMConfig({
      provider: llmProvider,
      claude: { apiKey: claudeKey, model: 'claude-sonnet-4-20250514' },
      azure: { endpoint: azureEndpoint, apiKey: azureKey, deploymentName: azureDeployment },
      vertex: { projectId: vertexProject, location: vertexLocation, modelId: 'gemini-1.5-pro' }
    })

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
          <h2 className="text-xl font-bold text-white">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS - Made more visible */}
        <div className="flex border-b border-surface-800 bg-surface-800">
          <button
            onClick={() => setActiveTab('llm')}
            className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
              activeTab === 'llm'
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            🧠 LLM PROVIDER (Claude/Azure/Vertex)
          </button>
          <button
            onClick={() => setActiveTab('generation')}
            className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
              activeTab === 'generation'
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            🧊 3D GENERATION (Tripo3D/Meshy)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'llm' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                <p className="text-blue-300 text-sm">
                  Configure your LLM provider for AI chat and prompt enhancement.
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-white block">Select LLM Provider:</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['claude', 'azure', 'vertex'] as LLMProvider[]).map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setLLMProvider(provider)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        llmProvider === provider
                          ? 'border-teal-500 bg-teal-600/20 text-white'
                          : 'border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-bold">
                        {provider === 'claude' && '🟣 Claude'}
                        {provider === 'azure' && '🔵 Azure'}
                        {provider === 'vertex' && '🟢 Vertex'}
                      </div>
                      <div className="text-xs mt-1 opacity-70">
                        {provider === 'claude' && 'Anthropic'}
                        {provider === 'azure' && 'OpenAI GPT-4'}
                        {provider === 'vertex' && 'Google Gemini'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Claude Settings */}
              {llmProvider === 'claude' && (
                <div className="space-y-3 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                  <label className="text-sm font-bold text-white block">
                    🔑 Anthropic API Key:
                  </label>
                  <input
                    type="password"
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-400">
                    Get your key from{' '}
                    <a href="https://console.anthropic.com/" target="_blank" className="text-teal-400 underline">
                      console.anthropic.com
                    </a>
                  </p>
                </div>
              )}

              {/* Azure Settings */}
              {llmProvider === 'azure' && (
                <div className="space-y-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div>
                    <label className="text-sm font-bold text-white block mb-2">Azure Endpoint:</label>
                    <input
                      type="text"
                      value={azureEndpoint}
                      onChange={(e) => setAzureEndpoint(e.target.value)}
                      placeholder="https://your-resource.openai.azure.com"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-white block mb-2">🔑 API Key:</label>
                    <input
                      type="password"
                      value={azureKey}
                      onChange={(e) => setAzureKey(e.target.value)}
                      placeholder="Your Azure API key"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-white block mb-2">Deployment Name:</label>
                    <input
                      type="text"
                      value={azureDeployment}
                      onChange={(e) => setAzureDeployment(e.target.value)}
                      placeholder="gpt-4"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}

              {/* Vertex Settings */}
              {llmProvider === 'vertex' && (
                <div className="space-y-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <div>
                    <label className="text-sm font-bold text-white block mb-2">Project ID:</label>
                    <input
                      type="text"
                      value={vertexProject}
                      onChange={(e) => setVertexProject(e.target.value)}
                      placeholder="your-gcp-project-id"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-white block mb-2">Location:</label>
                    <input
                      type="text"
                      value={vertexLocation}
                      onChange={(e) => setVertexLocation(e.target.value)}
                      placeholder="us-central1"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div className="p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-xs">
                      ⚠️ Vertex AI requires GCP authentication. Use gcloud CLI or service account.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'generation' && (
            <div className="space-y-6">
              <div className="p-4 bg-teal-900/30 border border-teal-500/50 rounded-lg">
                <p className="text-teal-300 text-sm">
                  Configure your 3D generation provider to create models from text and images.
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-white block">Select 3D Generation Provider:</label>
                <div className="grid grid-cols-2 gap-4">
                  {(['tripo3d', 'meshy'] as GenerationProvider[]).map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setGenerationProvider(provider)}
                      className={`p-6 rounded-lg border-2 text-center transition-all ${
                        generationProvider === provider
                          ? 'border-teal-500 bg-teal-600/20 text-white'
                          : 'border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-2">
                        {provider === 'tripo3d' ? '🔺' : '🔷'}
                      </div>
                      <div className="font-bold text-lg">
                        {provider === 'tripo3d' ? 'Tripo3D' : 'Meshy'}
                      </div>
                      <div className="text-xs mt-1 opacity-70">
                        {provider === 'tripo3d' ? 'High quality models' : 'Fast generation'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-3 p-4 bg-surface-800 border border-gray-600 rounded-lg">
                <label className="text-sm font-bold text-white block">
                  🔑 {generationProvider === 'tripo3d' ? 'Tripo3D' : 'Meshy'} API Key:
                </label>
                <input
                  type="password"
                  value={genApiKey}
                  onChange={(e) => setGenApiKey(e.target.value)}
                  placeholder={`Enter your ${generationProvider} API key`}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-400">
                  Get your key from{' '}
                  <a
                    href={generationProvider === 'tripo3d' ? 'https://tripo3d.ai' : 'https://meshy.ai'}
                    target="_blank"
                    className="text-teal-400 underline"
                  >
                    {generationProvider === 'tripo3d' ? 'tripo3d.ai' : 'meshy.ai'}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-surface-800 bg-surface-800">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg font-bold text-white transition-colors"
          >
            💾 Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
