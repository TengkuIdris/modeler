import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Download, RefreshCw, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, useSettingsStore } from '@stores/appStore'
import { createLLMProvider } from '@services/llm'
import type { ChatMessage } from '@shared/types'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { 
    messages, 
    addMessage, 
    currentModel 
  } = useAppStore()
  
  const { llmConfig } = useSettingsStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message
    addMessage({ role: 'user', content: userMessage })
    
    setIsLoading(true)
    setStreamingContent('')

    try {
      const llm = createLLMProvider(llmConfig)
      
      // Build conversation history
      const history = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
      
      // Add context about current model
      const context = currentModel 
        ? `The user is editing a 3D model created from: "${currentModel.prompt || 'a sketch'}". `
        : 'No model is currently loaded. '

      let fullResponse = ''
      
      await llm.stream(
        [
          { role: 'system', content: llm.getSystemPrompt() + '\n\n' + context },
          ...history,
          { role: 'user', content: userMessage }
        ],
        (chunk) => {
          fullResponse += chunk
          setStreamingContent(fullResponse)
        }
      )

      // Add assistant message
      addMessage({ role: 'assistant', content: fullResponse })
      setStreamingContent('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response'
      addMessage({ role: 'assistant', content: `Error: ${errorMessage}` })
    } finally {
      setIsLoading(false)
      setStreamingContent('')
    }
  }, [input, isLoading, messages, currentModel, llmConfig, addMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleExportSTL = async () => {
    if (!currentModel?.meshData) return

    try {
      const result = await window.electronAPI.saveSTL(
        `${currentModel.name || 'model'}.stl`,
        currentModel.meshData
      )
      
      if (result.success) {
        addMessage({ 
          role: 'assistant', 
          content: `Model exported successfully to: ${result.path}` 
        })
      }
    } catch (error) {
      addMessage({ 
        role: 'assistant', 
        content: 'Failed to export model. Please try again.' 
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-surface-900">
      {/* Header */}
      <div className="p-4 border-b border-surface-800 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-surface-200 flex items-center gap-2">
            <MessageSquare size={18} className="text-accent-400" />
            Edit Model
          </h2>
          <p className="text-xs text-surface-500 mt-1">
            Describe changes to refine your model
          </p>
        </div>
        
        {currentModel && (
          <button
            onClick={handleExportSTL}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-600 hover:bg-accent-500 rounded-lg text-xs font-medium text-white transition-colors"
          >
            <Download size={14} />
            Export STL
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!currentModel && messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-800 flex items-center justify-center">
              <MessageSquare size={24} className="text-surface-500" />
            </div>
            <p className="text-surface-500 text-sm">
              Generate a model first to start editing
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {streamingContent && (
          <ChatBubble 
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date()
            }}
            isStreaming
          />
        )}

        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-surface-500 text-sm">
            <RefreshCw size={14} className="animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe changes to your model..."
            className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder:text-surface-600 resize-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 bg-accent-600 hover:bg-accent-500 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-surface-600 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

function ChatBubble({ 
  message, 
  isStreaming = false 
}: { 
  message: ChatMessage
  isStreaming?: boolean 
}) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
          isUser
            ? 'bg-accent-600 text-white'
            : 'bg-surface-800 text-surface-200 border border-surface-700'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-accent-400 animate-pulse ml-0.5" />
        )}
      </div>
    </motion.div>
  )
}


