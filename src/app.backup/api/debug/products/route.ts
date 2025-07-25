import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get counts
    const idcProductCount = await prisma.product.count({
      where: { source: 'idc' }
    })
    
    const competitorProductCount = await prisma.product.count({
      where: { source: { not: 'idc' } }
    })
    
    const matchCount = await prisma.productMatch.count()
    
    // Get sample data
    const sampleCompetitorProducts = await prisma.product.findMany({
      where: { source: { not: 'idc' } },
      take: 100, // Increased sample size for comparison page
      select: {
        id: true,
        title: true,
        vendor: true,
        price: true,
        source: true,
        productType: true,
        sku: true,
        url: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    const sampleMatches = await prisma.productMatch.findMany({
      take: 3,
      include: {
        idcProduct: {
          select: { title: true, price: true }
        },
        competitorProduct: {
          select: { title: true, price: true, source: true }
        }
      }
    })
    
    // Get competitor breakdown
    const competitorBreakdown = await prisma.product.groupBy({
      by: ['source'],
      where: { source: { not: 'idc' } },
      _count: { id: true }
    })
    
    return NextResponse.json({
      counts: {
        idc_products: idcProductCount,
        competitor_products: competitorProductCount,
        matches: matchCount
      },
      competitor_breakdown: competitorBreakdown,
      sample_competitor_products: sampleCompetitorProducts,
      sample_matches: sampleMatches.map((match: any) => ({
        id: match.id,
        idc_product: match.idcProduct.title,
        idc_price: match.idcProduct.price,
        competitor_product: match.competitorProduct.title,
        competitor_price: match.competitorProduct.price,
        competitor_source: match.competitorProduct.source,
        confidence: match.overallScore,
        is_violation: match.isMapViolation
      }))
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}