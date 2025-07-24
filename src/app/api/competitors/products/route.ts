import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const COMPETITOR_NAMES = {
  'home_coffee_solutions': 'Home Coffee Solutions',
  'kitchen_barista': 'The Kitchen Barista',
  'cafe_liegeois': 'Cafe Liegeois'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const vendor = searchParams.get('vendor')
    
    const skip = (page - 1) * limit
    
    // Build where clause
    const where: any = {
      source: {
        not: 'idc'
      }
    }
    
    if (source && source !== 'all') {
      where.source = source
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (vendor) {
      where.vendor = { contains: vendor, mode: 'insensitive' }
    }
    
    // Get products with pagination
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: {
            take: 1,
            orderBy: { price: 'asc' }
          },
          priceHistory: {
            take: 2,
            orderBy: { timestamp: 'desc' }
          }
        },
        orderBy: { lastScrapedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ])
    
    // Transform products for frontend
    const transformedProducts = products.map(product => {
      const recentHistory = product.priceHistory[0]
      const previousHistory = product.priceHistory[1]
      
      return {
        id: product.id,
        external_id: product.externalId,
        title: product.title,
        vendor: product.vendor,
        product_type: product.productType,
        handle: product.handle,
        sku: product.sku,
        price: product.price,
        compare_at_price: product.compareAtPrice,
        available: product.available,
        image_url: product.imageUrl,
        url: product.url,
        source: product.source,
        source_name: COMPETITOR_NAMES[product.source as keyof typeof COMPETITOR_NAMES] || product.source,
        last_scraped_at: product.lastScrapedAt,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        variants_count: product.variants.length,
        lowest_variant_price: product.variants[0]?.price || product.price,
        price_change: recentHistory && previousHistory ? 
          recentHistory.price - previousHistory.price : null,
        price_change_percent: recentHistory && previousHistory && previousHistory.price > 0 ? 
          ((recentHistory.price - previousHistory.price) / previousHistory.price) * 100 : null
      }
    })
    
    // Get summary stats by source
    const summaryStats = await prisma.product.groupBy({
      by: ['source'],
      where: {
        source: { not: 'idc' }
      },
      _count: {
        id: true
      },
      _avg: {
        price: true
      }
    })
    
    const summary = summaryStats.map(stat => ({
      source: stat.source,
      source_name: COMPETITOR_NAMES[stat.source as keyof typeof COMPETITOR_NAMES] || stat.source,
      product_count: stat._count.id,
      avg_price: stat._avg.price
    }))
    
    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
        has_next: page < Math.ceil(totalCount / limit),
        has_prev: page > 1
      },
      summary,
      filters: {
        source,
        search,
        vendor
      },
      generated_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error fetching competitor products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitor products' },
      { status: 500 }
    )
  }
}