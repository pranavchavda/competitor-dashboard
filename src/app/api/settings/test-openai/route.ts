import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { api_key } = await request.json()

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    if (!api_key.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      )
    }

    // Test the API key by making a simple request to OpenAI
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    })

    if (!testResponse.ok) {
      if (testResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key - authentication failed' },
          { status: 400 }
        )
      } else if (testResponse.status === 429) {
        return NextResponse.json(
          { error: 'API key rate limit exceeded - please try again later' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: `OpenAI API error: ${testResponse.status}` },
          { status: 400 }
        )
      }
    }

    const models = await testResponse.json()
    
    // Check if the embedding model we need is available
    const hasEmbeddingModel = models.data?.some((model: any) => 
      model.id === 'text-embedding-3-small' || model.id.includes('embedding')
    )

    return NextResponse.json({
      valid: true,
      models_available: models.data?.length || 0,
      has_embedding_model: hasEmbeddingModel,
      message: hasEmbeddingModel 
        ? 'API key is valid and supports embeddings' 
        : 'API key is valid but may not support embeddings'
    })

  } catch (error) {
    console.error('Error testing OpenAI API key:', error)
    
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error - unable to reach OpenAI API' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to test API key' },
      { status: 500 }
    )
  }
}