import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function timeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return `${diffDays}d ago`
  }
}

const COMPETITOR_NAMES = {
  'home_coffee_solutions': 'Home Coffee Solutions',
  'kitchen_barista': 'The Kitchen Barista',
  'cafe_liegeois': 'Cafe Liegeois'
}

const COMPETITOR_DOMAINS = {
  'home_coffee_solutions': 'homecoffeesolutions.com',
  'kitchen_barista': 'thekitchenbarista.com',
  'cafe_liegeois': 'cafeliegeois.ca'
}

export async function GET() {
  try {
    // 1. Get total products monitored (competitor products)
    const totalCompetitorProducts = await prisma.product.count({
      where: {
        source: {
          not: 'idc'
        }
      }
    })

    // 2. Get active alerts count
    const activeAlertsCount = await prisma.alert.count({
      where: {
        status: {
          in: ['unread', 'read']
        }
      }
    })

    // 3. Get competitors tracked count
    const competitorsTracked = await prisma.product.groupBy({
      by: ['source'],
      where: {
        source: {
          not: 'idc'
        }
      }
    })

    // 4. Calculate MAP violation metrics using same logic as Price Comparison page
    // Get matches with same filters as Price Comparison (min confidence 70%, limit 100)
    const relevantMatches = await prisma.productMatch.findMany({
      where: {
        overallScore: {
          gte: 0.8 // 80% minimum confidence for "high confidence" stats
        }
      },
      include: {
        idcProduct: true,
        competitorProduct: true
      },
      orderBy: { overallScore: 'desc' },
      take: 100 // Same limit as Price Comparison page
    })

    // Filter for MAP violations (same logic as Price Comparison frontend)
    const mapViolations = relevantMatches.filter(match => match.isMapViolation)
    const mapViolationsCount = mapViolations.length

    // Calculate total revenue at risk from violations 
    const revenueAtRisk = mapViolations
      .filter(violation => violation.violationAmount)
      .reduce((sum, violation) => {
        return sum + (violation.violationAmount || 0)
      }, 0)

    // Find worst offender (retailer with most violations) from the same filtered data
    const violationsBySource = mapViolations.reduce((acc: {[key: string]: number}, violation) => {
      acc[violation.source] = (acc[violation.source] || 0) + 1
      return acc
    }, {})
    
    const worstOffenderSource = Object.entries(violationsBySource)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]

    const worstOffender = worstOffenderSource ? {
      source: worstOffenderSource[0],
      violations: worstOffenderSource[1] as number,
      name: COMPETITOR_NAMES[worstOffenderSource[0] as keyof typeof COMPETITOR_NAMES] || worstOffenderSource[0]
    } : null

    // 5. Get competitor status with product counts and last update times
    const competitorStatus = []
    
    for (const source of Object.keys(COMPETITOR_NAMES)) {
      const productCount = await prisma.product.count({
        where: { source }
      })
      
      const lastScrape = await prisma.scrapeJob.findFirst({
        where: { source },
        orderBy: { createdAt: 'desc' }
      })
      
      const lastProduct = await prisma.product.findFirst({
        where: { source },
        orderBy: { lastScrapedAt: 'desc' }
      })
      
      // Calculate average price difference for this competitor
      const avgPriceDiff = await prisma.productMatch.aggregate({
        _avg: {
          priceDifference: true
        },
        where: {
          source: source
        }
      })
      
      competitorStatus.push({
        name: COMPETITOR_NAMES[source as keyof typeof COMPETITOR_NAMES],
        domain: COMPETITOR_DOMAINS[source as keyof typeof COMPETITOR_DOMAINS],
        status: lastScrape && lastScrape.status === 'completed' ? 'Active' : 'Inactive',
        last_updated: lastProduct ? timeAgo(lastProduct.lastScrapedAt) : 'Never',
        products_tracked: productCount,
        avg_price_difference: avgPriceDiff._avg.priceDifference || 0
      })
    }

    // 6. Get recent alerts
    const recentAlerts = await prisma.alert.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    const stats = {
      products_monitored: totalCompetitorProducts,
      active_alerts: activeAlertsCount,
      competitors_tracked: competitorsTracked.length,
      map_violations: mapViolationsCount,
      revenue_at_risk: Math.round(revenueAtRisk * 100) / 100, // Round to 2 decimal places
      worst_offender: worstOffender,
      last_updated: new Date().toISOString()
    }

    return NextResponse.json({
      stats,
      competitor_status: competitorStatus,
      recent_alerts: recentAlerts.map(alert => ({
        id: alert.id,
        product_title: alert.title,
        competitor: alert.source || 'Unknown',
        alert_type: alert.type,
        old_price: alert.oldPrice,
        new_price: alert.newPrice,
        price_difference: alert.priceChange,
        price_difference_percent: alert.oldPrice && alert.newPrice ? 
          ((alert.newPrice - alert.oldPrice) / alert.oldPrice * 100) : null,
        created_at: alert.createdAt.toISOString(),
        severity: alert.severity,
        status: alert.status
      })),
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}

// Update specific stats (for when scraping completes, etc.)
export async function PATCH(request: Request) {
  try {
    const updates = await request.json()
    
    // Create alerts based on updates
    if (updates.new_alerts && Array.isArray(updates.new_alerts)) {
      for (const alertData of updates.new_alerts) {
        await prisma.alert.create({
          data: {
            type: alertData.type,
            title: alertData.title,
            message: alertData.message,
            severity: alertData.severity || 'medium',
            source: alertData.source,
            oldPrice: alertData.oldPrice,
            newPrice: alertData.newPrice,
            priceChange: alertData.priceChange,
            productId: alertData.productId
          }
        })
      }
    }
    
    // Return fresh stats after updates
    const response = await GET()
    return response
    
  } catch (error) {
    console.error('Error updating dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to update statistics' },
      { status: 500 }
    )
  }
}