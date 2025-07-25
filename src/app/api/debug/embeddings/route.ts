import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Check competitor products with embeddings
    const competitorProducts = await prisma.product.findMany({
      where: {
        source: { not: 'idc' }
      },
      select: {
        id: true,
        title: true,
        source: true,
        titleEmbedding: true,
        featuresEmbedding: true
      }
    })

    const withEmbeddings = competitorProducts.filter(p => p.titleEmbedding && p.featuresEmbedding)
    const withoutEmbeddings = competitorProducts.filter(p => !p.titleEmbedding || !p.featuresEmbedding)

    // Check API key availability
    let apiKeyStatus = 'Not Available'
    try {
      const fs = require('fs')
      const path = require('path')
      const settingsFile = path.join(process.cwd(), 'settings.json')
      
      if (process.env.OPENAI_API_KEY) {
        apiKeyStatus = 'Environment Variable'
      } else if (fs.existsSync(settingsFile)) {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
        if (settings.openai_api_key) {
          apiKeyStatus = 'Settings File'
        }
      }
    } catch (error) {
      apiKeyStatus = `Error: ${error}`
    }

    return NextResponse.json({
      api_key_status: apiKeyStatus,
      total_competitor_products: competitorProducts.length,
      products_with_embeddings: withEmbeddings.length,
      products_without_embeddings: withoutEmbeddings.length,
      embedding_coverage_percent: competitorProducts.length > 0 ? 
        Math.round((withEmbeddings.length / competitorProducts.length) * 100) : 0,
      
      // Sample products with embeddings
      sample_with_embeddings: withEmbeddings.slice(0, 3).map(p => ({
        id: p.id,
        title: p.title,
        source: p.source,
        has_title_embedding: !!p.titleEmbedding,
        has_features_embedding: !!p.featuresEmbedding
      })),
      
      // Sample products without embeddings
      sample_without_embeddings: withoutEmbeddings.slice(0, 3).map(p => ({
        id: p.id,
        title: p.title,
        source: p.source,
        has_title_embedding: !!p.titleEmbedding,
        has_features_embedding: !!p.featuresEmbedding
      }))
    })
  } catch (error) {
    console.error('Error checking embeddings:', error)
    return NextResponse.json(
      { error: 'Failed to check embeddings' },
      { status: 500 }
    )
  }
}