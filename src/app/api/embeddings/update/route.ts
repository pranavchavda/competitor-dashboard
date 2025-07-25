import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { batchUpdateEmbeddings } from '@/lib/embeddings'
import fs from 'fs'
import path from 'path'

function loadAPIKeyFromSettings(): string | null {
  try {
    const settingsFile = path.join(process.cwd(), 'settings.json')
    if (fs.existsSync(settingsFile)) {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
      return settings.openai_api_key || null
    }
  } catch (error) {
    console.error('Error loading API key from settings:', error)
  }
  return null
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') // Optional: update specific source
    const limit = parseInt(searchParams.get('limit') || '50') // Batch size
    const dryRun = searchParams.get('dry_run') === 'true'
    
    // Check if OpenAI API key is available (either from settings or environment)
    const apiKey = loadAPIKeyFromSettings() || process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please configure it in Settings or set OPENAI_API_KEY environment variable.' },
        { status: 400 }
      )
    }
    
    // Find products without embeddings
    const whereClause: any = {
      OR: [
        { titleEmbedding: null },
        { featuresEmbedding: null }
      ]
    }
    
    if (source) {
      whereClause.source = source
    }
    
    const productsToUpdate = await prisma.product.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
    
    if (productsToUpdate.length === 0) {
      return NextResponse.json({
        message: 'No products need embedding updates',
        stats: {
          products_found: 0,
          products_processed: 0,
          success: 0,
          failed: 0
        }
      })
    }
    
    if (dryRun) {
      return NextResponse.json({
        message: `Dry run: Found ${productsToUpdate.length} products that need embedding updates`,
        products: productsToUpdate.map((p: any) => ({
          id: p.id,
          title: p.title,
          source: p.source,
          has_title_embedding: !!p.titleEmbedding,
          has_features_embedding: !!p.featuresEmbedding
        })),
        stats: {
          products_found: productsToUpdate.length,
          products_processed: 0,
          success: 0,
          failed: 0
        }
      })
    }
    
    // Update embeddings in batches
    const productIds = productsToUpdate.map((p: any) => p.id)
    const results = await batchUpdateEmbeddings(productIds, 5, 200) // 5 per batch, 200ms delay
    
    return NextResponse.json({
      message: `Updated embeddings for ${results.success} out of ${productIds.length} products`,
      stats: {
        products_found: productsToUpdate.length,
        products_processed: productIds.length,
        success: results.success,
        failed: results.failed
      },
      errors: results.errors.slice(0, 10), // Return first 10 errors
      processed_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error updating embeddings:', error)
    return NextResponse.json(
      { error: 'Failed to update embeddings' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Get statistics about embeddings coverage
    const totalProducts = await prisma.product.count()
    
    const withTitleEmbeddings = await prisma.product.count({
      where: { titleEmbedding: { not: null } }
    })
    
    const withFeaturesEmbeddings = await prisma.product.count({
      where: { featuresEmbedding: { not: null } }
    })
    
    const withBothEmbeddings = await prisma.product.count({
      where: {
        AND: [
          { titleEmbedding: { not: null } },
          { featuresEmbedding: { not: null } }
        ]
      }
    })
    
    const needingUpdates = await prisma.product.count({
      where: {
        OR: [
          { titleEmbedding: null },
          { featuresEmbedding: null }
        ]
      }
    })
    
    // Get breakdown by source
    const bySource = await prisma.product.groupBy({
      by: ['source'],
      _count: {
        id: true
      },
      where: {
        OR: [
          { titleEmbedding: null },
          { featuresEmbedding: null }
        ]
      }
    })
    
    return NextResponse.json({
      total_products: totalProducts,
      embeddings_coverage: {
        with_title_embeddings: withTitleEmbeddings,
        with_features_embeddings: withFeaturesEmbeddings,
        with_both_embeddings: withBothEmbeddings,
        needing_updates: needingUpdates
      },
      coverage_percentage: {
        title: totalProducts > 0 ? (withTitleEmbeddings / totalProducts * 100).toFixed(1) : '0',
        features: totalProducts > 0 ? (withFeaturesEmbeddings / totalProducts * 100).toFixed(1) : '0',
        complete: totalProducts > 0 ? (withBothEmbeddings / totalProducts * 100).toFixed(1) : '0'
      },
      needing_updates_by_source: bySource.map((s: any) => ({
        source: s.source,
        count: s._count.id
      })),
      openai_configured: !!(loadAPIKeyFromSettings() || process.env.OPENAI_API_KEY),
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching embeddings stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch embeddings statistics' },
      { status: 500 }
    )
  }
}