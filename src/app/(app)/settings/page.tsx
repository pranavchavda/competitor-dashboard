'use client'

import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Heading, Subheading } from '@/components/heading'
import { Input } from '@/components/input'
import { Text } from '@/components/text'
import { useState, useEffect } from 'react'

export default function Settings() {
  const [config, setConfig] = useState({
    openaiKey: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Try to load from localStorage or Tauri store
        const saved = localStorage.getItem('competitor-dash-config')
        if (saved) {
          const savedConfig = JSON.parse(saved)
          setConfig({ openaiKey: savedConfig.openaiKey || '' })
        }
      } catch (error) {
        console.error('Failed to load configuration:', error)
      }
    }
    
    loadConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Save to localStorage for now (in production, use Tauri store)
      localStorage.setItem('competitor-dash-config', JSON.stringify(config))
      
      // In a real Tauri app, you'd save to secure store:
      // await invoke('save_config', { config })
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-4xl">
      <Heading>Configuration</Heading>
      <Text className="mt-2 text-zinc-500">
        Configure optional settings to enhance the competitor dashboard experience.
      </Text>
      <Divider className="my-10 mt-6" />

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>OpenAI API Key</Subheading>
          <Text>Optional - Enables advanced product matching using AI embeddings for more accurate competitor comparisons</Text>
        </div>
        <div>
          <Input 
            type="password"
            placeholder="sk-your_openai_key_here"
            value={config.openaiKey}
            onChange={(e) => handleChange('openaiKey', e.target.value)}
          />
        </div>
      </section>

      <Divider className="my-10" soft />

      <div className="rounded-lg bg-green-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              How it works
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>This app automatically:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Fetches iDrinkCoffee products via Algolia search</li>
                <li>Scrapes competitor websites for pricing data</li>
                <li>Matches products using similarity algorithms</li>
                <li>With OpenAI: Uses AI embeddings for better matching accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-4 mt-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Environment Variable Alternative
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>You can also set this as a system environment variable:</p>
              <code className="bg-blue-100 px-2 py-1 rounded mt-2 inline-block">OPENAI_API_KEY=sk-your_key_here</code>
            </div>
          </div>
        </div>
      </div>

      <Divider className="my-10" soft />

      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          plain
          onClick={() => setConfig({ openaiKey: '' })}
        >
          Clear
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
        </Button>
      </div>
    </form>
  )
}