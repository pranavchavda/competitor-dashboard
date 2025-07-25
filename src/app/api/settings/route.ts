import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { resetOpenAIClient } from '@/lib/embeddings'

interface Settings {
  openai_api_key: string
  confidence_threshold: number
  scraping_interval: number
}

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json')

function getDefaultSettings(): Settings {
  return {
    openai_api_key: process.env.OPENAI_API_KEY || '',
    confidence_threshold: 70,
    scraping_interval: 24
  }
}

function loadSettings(): Settings {
  const defaults = getDefaultSettings()
  
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8')
      const saved = JSON.parse(data)
      return { ...defaults, ...saved }
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
  
  // Return defaults which includes environment variable
  return defaults
}

function saveSettings(settings: Settings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Error saving settings:', error)
    throw new Error('Failed to save settings')
  }
}

export async function GET() {
  try {
    const settings = loadSettings()
    
    // Mask the API key for security but preserve source indication
    if (settings.openai_api_key) {
      if (settings.openai_api_key.length > 12) {
        const masked = settings.openai_api_key.substring(0, 8) + '...' + settings.openai_api_key.substring(settings.openai_api_key.length - 4)
        settings.openai_api_key = masked
      }
      
      // Add source indicator
      const isFromEnv = process.env.OPENAI_API_KEY && !fs.existsSync(SETTINGS_FILE)
      if (isFromEnv) {
        settings.openai_api_key = `${settings.openai_api_key} (from environment)`
      }
    }
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error getting settings:', error)
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.openai_api_key || typeof body.openai_api_key !== 'string') {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      )
    }

    if (!body.openai_api_key.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key format' },
        { status: 400 }
      )
    }

    // Validate confidence threshold
    const confidenceThreshold = parseInt(body.confidence_threshold)
    if (isNaN(confidenceThreshold) || confidenceThreshold < 10 || confidenceThreshold > 100) {
      return NextResponse.json(
        { error: 'Confidence threshold must be between 10 and 100' },
        { status: 400 }
      )
    }

    // Validate scraping interval
    const scrapingInterval = parseInt(body.scraping_interval)
    if (isNaN(scrapingInterval) || scrapingInterval < 0) {
      return NextResponse.json(
        { error: 'Scraping interval must be 0 or positive' },
        { status: 400 }
      )
    }

    const settings: Settings = {
      openai_api_key: body.openai_api_key.trim(),
      confidence_threshold: confidenceThreshold,
      scraping_interval: scrapingInterval
    }

    // Save to file
    saveSettings(settings)

    // Reset OpenAI client to use new API key
    resetOpenAIClient()

    // Also update environment variable for current session
    process.env.OPENAI_API_KEY = settings.openai_api_key

    return NextResponse.json({
      message: 'Settings saved successfully',
      settings: {
        ...settings,
        openai_api_key: '[SAVED]' // Don't return the actual key
      }
    })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}