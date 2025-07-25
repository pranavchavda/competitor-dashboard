import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { idc_product_id, competitor_product_id, confidence, is_manual_match } = await request.json()

    if (!idc_product_id || !competitor_product_id) {
      return NextResponse.json(
        { error: 'Both iDC product ID and competitor product ID are required' },
        { status: 400 }
      )
    }

    // Find the iDC product in our database (it should be stored when fetching from Algolia)
    const idcProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { externalId: idc_product_id.toString(), source: 'idc' },
          { id: idc_product_id }
        ]
      }
    })

    if (!idcProduct) {
      return NextResponse.json(
        { error: 'iDC product not found in database' },
        { status: 404 }
      )
    }

    // Find the competitor product
    const competitorProduct = await prisma.product.findUnique({
      where: { id: competitor_product_id }
    })

    if (!competitorProduct) {
      return NextResponse.json(
        { error: 'Competitor product not found' },
        { status: 404 }
      )
    }

    // Calculate price differences and MAP violation data
    const priceDiff = (competitorProduct.price || 0) - (idcProduct.price || 0)
    const priceDiffPercent = (idcProduct.price || 0) > 0 ? (priceDiff / (idcProduct.price || 0)) * 100 : 0

    // Calculate MAP violation metrics
    const isMapViolation = (competitorProduct.price || 0) < (idcProduct.price || 0)
    const violationAmount = isMapViolation ? ((idcProduct.price || 0) - (competitorProduct.price || 0)) : null
    const violationSeverity = isMapViolation ? (((idcProduct.price || 0) - (competitorProduct.price || 0)) / (idcProduct.price || 0)) * 100 : null

    // Check if match already exists
    const existingMatch = await prisma.productMatch.findFirst({
      where: {
        idcProductId: idcProduct.id,
        competitorProductId: competitorProduct.id
      }
    })

    if (existingMatch) {
      return NextResponse.json(
        { error: 'A match between these products already exists' },
        { status: 409 }
      )
    }

    // Create the manual match
    const manualMatch = await prisma.productMatch.create({
      data: {
        idcProductId: idcProduct.id,
        competitorProductId: competitorProduct.id,
        source: competitorProduct.source,
        overallScore: confidence || 1.0,
        titleSimilarity: 1.0, // Manual matches get perfect similarity scores
        brandSimilarity: 1.0,
        typeSimilarity: 1.0,
        priceSimilarity: 1.0,
        embeddingSimilarity: null, // Manual matches don't use embeddings
        priceDifference: priceDiff,
        priceDifferencePercent: priceDiffPercent,
        confidence: 'manual', // Special confidence level for manual matches
        isManualMatch: true,
        isRejected: false,
        // MAP violation fields
        isMapViolation: isMapViolation,
        violationAmount: violationAmount,
        violationSeverity: violationSeverity,
        firstViolationDate: isMapViolation ? new Date() : null,
        lastChecked: new Date()
      },
      include: {
        idcProduct: true,
        competitorProduct: true
      }
    })

    // Create violation history entry if this is a MAP violation
    if (isMapViolation) {
      try {
        await prisma.mapViolationHistory.create({
          data: {
            productMatchId: manualMatch.id,
            violationType: 'manual_violation',
            competitorPrice: competitorProduct.price || 0,
            idcPrice: idcProduct.price || 0,
            violationAmount: violationAmount || 0,
            violationPercent: violationSeverity || 0,
            competitorUrl: competitorProduct.url || null,
            source: competitorProduct.source,
            detectedAt: new Date()
          }
        })
      } catch (historyError) {
        console.error('Error creating violation history for manual match:', historyError)
        // Don't fail the entire operation if history creation fails
      }
    }

    return NextResponse.json({
      id: manualMatch.id,
      message: 'Manual match created successfully',
      match: {
        id: manualMatch.id,
        idc_product: {
          id: idcProduct.id,
          title: idcProduct.title,
          vendor: idcProduct.vendor,
          price: idcProduct.price
        },
        competitor_product: {
          id: competitorProduct.id,
          title: competitorProduct.title,
          vendor: competitorProduct.vendor,
          price: competitorProduct.price,
          source: competitorProduct.source
        },
        confidence: manualMatch.overallScore,
        is_manual_match: true,
        is_map_violation: isMapViolation,
        violation_amount: violationAmount,
        violation_severity: violationSeverity,
        created_at: manualMatch.createdAt
      }
    })

  } catch (error) {
    console.error('Error creating manual match:', error)
    return NextResponse.json(
      { error: 'Failed to create manual match' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Get all manual matches
    const manualMatches = await prisma.productMatch.findMany({
      where: { isManualMatch: true },
      include: {
        idcProduct: true,
        competitorProduct: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedMatches = manualMatches.map((match: any) => ({
      id: match.id,
      idc_product: {
        id: match.idcProduct.id,
        title: match.idcProduct.title,
        vendor: match.idcProduct.vendor,
        price: match.idcProduct.price,
        source: 'idc'
      },
      competitor_product: {
        id: match.competitorProduct.id,
        title: match.competitorProduct.title,
        vendor: match.competitorProduct.vendor,
        price: match.competitorProduct.price,
        source: match.competitorProduct.source
      },
      confidence: match.overallScore,
      price_difference: match.priceDifference,
      is_manual_match: match.isManualMatch,
      is_map_violation: match.isMapViolation,
      violation_amount: match.violationAmount,
      violation_severity: match.violationSeverity,
      created_at: match.createdAt,
      updated_at: match.updatedAt
    }))

    return NextResponse.json({
      matches: formattedMatches,
      total: manualMatches.length
    })

  } catch (error) {
    console.error('Error fetching manual matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manual matches' },
      { status: 500 }
    )
  }
}