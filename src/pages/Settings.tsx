import { useState, useEffect, useRef } from 'react'

interface SettingsData {
  openai_api_key: string
  confidence_threshold: number
  scraping_interval: number
}

interface EmbeddingProgress {
  type: string
  status: string
  total?: number
  processed?: number
  success?: number
  errors?: number
  current_product?: string
  progress_percent?: number
  message?: string
  error?: string
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>({
    openai_api_key: '',
    confidence_threshold: 70,
    scraping_interval: 24
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  
  // Embedding generation state
  const [embeddingProgress, setEmbeddingProgress] = useState<EmbeddingProgress | null>(null)
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // Load current settings
  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        // Settings API might not exist yet, use defaults
        console.log('Settings API not available, using defaults')
      }
    } catch (err) {
      console.log('Could not load settings, using defaults')
    } finally {
      setLoading(false)
    }
  }

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Test OpenAI API key
  const testApiKey = async () => {
    if (!settings.openai_api_key.trim()) {
      setError('Please enter an API key first')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/settings/test-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: settings.openai_api_key })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('✅ OpenAI API key is valid!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Invalid API key')
      }
    } catch (err) {
      setError('Failed to test API key')
    } finally {
      setSaving(false)
    }
  }

  // Setup WebSocket connection for real-time progress
  const setupWebSocket = () => {
    const wsUrl = `ws://localhost:3005`
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('📡 WebSocket connected for embedding progress')
      wsRef.current = ws
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'embedding_progress') {
          setEmbeddingProgress(data)
          
          // Clear progress when completed or error
          if (data.status === 'completed' || data.status === 'error') {
            setIsGeneratingEmbeddings(false)
            if (data.status === 'completed') {
              setSuccess('✅ Embedding generation completed!')
              setTimeout(() => {
                setEmbeddingProgress(null)
                setSuccess(null)
              }, 5000)
            } else {
              setError(`❌ Embedding generation failed: ${data.error}`)
              setTimeout(() => {
                setEmbeddingProgress(null)
                setError(null)
              }, 5000)
            }
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }
    
    ws.onclose = () => {
      console.log('📡 WebSocket connection closed')
      wsRef.current = null
    }
    
    ws.onerror = (error) => {
      console.error('📡 WebSocket error:', error)
      wsRef.current = null
    }
  }

  // Generate embeddings for all products
  const generateEmbeddings = async () => {
    if (!settings.openai_api_key.trim()) {
      setError('Please enter an API key first')
      return
    }

    try {
      setIsGeneratingEmbeddings(true)
      setError(null)
      setEmbeddingProgress(null)
      
      // Setup WebSocket connection if not already connected
      if (!wsRef.current) {
        setupWebSocket()
      }

      // Start embedding generation via Express server
      const response = await fetch('http://localhost:3005/api/debug/force-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start embedding generation')
      }

      console.log('🤖 Embedding generation started successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start embedding generation')
      setIsGeneratingEmbeddings(false)
      setEmbeddingProgress(null)
    }
  }

  // Cancel embedding generation
  const cancelEmbeddings = () => {
    setIsGeneratingEmbeddings(false)
    setEmbeddingProgress(null)
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  useEffect(() => {
    loadSettings()
    
    // Cleanup WebSocket connection on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure application settings and API keys
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {/* OpenAI API Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">OpenAI Configuration</h2>
          <p className="text-sm text-gray-600 mb-6">
            Configure your OpenAI API key for advanced semantic product matching using embeddings.
            <br />
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Get your API key from OpenAI →
            </a>
          </p>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.openai_api_key}
                    onChange={(e) => {
                      // Sanitize input - remove invisible characters
                      const cleanValue = e.target.value
                        .replace(' (from environment)', '')
                        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
                        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
                      setSettings(prev => ({ ...prev, openai_api_key: cleanValue }))
                    }}
                    placeholder="sk-..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    readOnly={settings.openai_api_key.includes('(from environment)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  onClick={testApiKey}
                  disabled={saving || !settings.openai_api_key.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                >
                  {saving ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Required for semantic product matching. API key is stored locally and never shared.
                {settings.openai_api_key.includes('(from environment)') && (
                  <span className="block text-blue-600 mt-1">
                    ✓ Currently using API key from environment variable OPENAI_API_KEY
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Matching Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Matching Configuration</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Confidence Threshold
              </label>
              <select
                value={settings.confidence_threshold}
                onChange={(e) => setSettings(prev => ({ ...prev, confidence_threshold: parseInt(e.target.value) }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value={90}>90% - Very High (Exact matches)</option>
                <option value={80}>80% - High (Strong matches)</option>
                <option value={70}>70% - Good (Default)</option>
                <option value={50}>50% - Medium (Some uncertainty)</option>
                <option value={30}>30% - Low (Loose matching)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Higher thresholds show only more certain product matches
              </p>
            </div>
          </div>
        </div>

        {/* Scraping Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scraping Configuration</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-scraping Interval (hours)
              </label>
              <select
                value={settings.scraping_interval}
                onChange={(e) => setSettings(prev => ({ ...prev, scraping_interval: parseInt(e.target.value) }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours (Daily)</option>
                <option value={48}>48 hours</option>
                <option value={168}>168 hours (Weekly)</option>
                <option value={0}>Disabled</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How often to automatically scrape competitor data (0 = manual only)
              </p>
            </div>
          </div>
        </div>

        {/* Embedding Management */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Embeddings Management</h2>
          <p className="text-sm text-gray-600 mb-6">
            Generate semantic embeddings for all products to enable AI-powered matching. 
            This process uses OpenAI's text-embedding-3-small model to create vector representations 
            of product titles and features for more accurate similarity matching.
          </p>

          {/* Progress Display */}
          {embeddingProgress && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  {embeddingProgress.message}
                </span>
                {embeddingProgress.progress_percent !== undefined && (
                  <span className="text-sm text-blue-700">
                    {embeddingProgress.progress_percent}%
                  </span>
                )}
              </div>
              
              {embeddingProgress.total && (
                <div className="space-y-2">
                  {/* Progress Bar */}
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${embeddingProgress.progress_percent || 0}%` }}
                    />
                  </div>
                  
                  {/* Stats */}
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>
                      Processed: {embeddingProgress.processed || 0}/{embeddingProgress.total}
                    </span>
                    <span>
                      Success: {embeddingProgress.success || 0} | Errors: {embeddingProgress.errors || 0}
                    </span>
                  </div>
                  
                  {/* Current Product */}
                  {embeddingProgress.current_product && (
                    <div className="text-xs text-blue-600 truncate">
                      Processing: {embeddingProgress.current_product}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={generateEmbeddings}
              disabled={isGeneratingEmbeddings || !settings.openai_api_key.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {isGeneratingEmbeddings ? 'Generating...' : '🤖 Generate Embeddings'}
            </button>
            
            {isGeneratingEmbeddings && (
              <button
                onClick={cancelEmbeddings}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            {!settings.openai_api_key.trim() ? (
              '⚠️ OpenAI API key required to generate embeddings'
            ) : (
              '💡 This process may take several minutes depending on the number of products'
            )}
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  )
}