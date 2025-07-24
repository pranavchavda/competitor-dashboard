import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { 
  createProductEmbeddings, 
  calculateCosineSimilarity, 
  extractProductFeatures,
  createEmbedding 
} from '@/lib/embeddings'

interface Product {
  id: string | number
  title: string
  vendor: string
  product_type: string
  price: number
  compare_at_price?: number
  handle: string
  variants?: Array<{
    id: number
    title: string
    price: number | string
    sku?: string
  }>
  source: 'idc' | 'competitor'
  competitor?: string
}

interface ProductMatch {
  idc_product: Product
  competitor_matches: Array<{
    competitor: string
    product: Product
    confidence: number
    price_difference: number
    price_difference_percent: number
  }>
  best_match?: {
    competitor: string
    product: Product
    confidence: number
    price_difference: number
    price_difference_percent: number
  }
}

function cleanTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(espresso|machine|coffee|grinder|burr|electric|manual|automatic|semi-automatic)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractBrand(title: string): string {
  const commonBrands = [
    'breville', 'delonghi', 'gaggia', 'rancilio', 'lelit', 'profitec', 
    'rocket', 'bezzera', 'ecm', 'ascaso', 'eureka', 'mazzer', 'baratza',
    'comandante', 'fellow', 'timemore', 'kinu', 'jx-pro', 'hario'
  ]
  
  const titleLower = title.toLowerCase()
  for (const brand of commonBrands) {
    if (titleLower.includes(brand)) {
      return brand
    }
  }
  
  // Try to extract first word as potential brand
  const firstWord = title.split(' ')[0].toLowerCase()
  return firstWord
}

function calculateSimilarity(product1: Product, product2: Product): number {
  let score = 0
  
  // Brand matching (40% weight)
  const brand1 = extractBrand(product1.title)
  const brand2 = extractBrand(product2.title)
  if (brand1 === brand2) {
    score += 0.4
  } else if (brand1.includes(brand2) || brand2.includes(brand1)) {
    score += 0.2
  }
  
  // Title similarity (30% weight)
  const clean1 = cleanTitle(product1.title)
  const clean2 = cleanTitle(product2.title)
  const titleSimilarity = calculateStringSimilarity(clean1, clean2)
  score += titleSimilarity * 0.3
  
  // Product type matching (20% weight)
  if (product1.product_type?.toLowerCase() === product2.product_type?.toLowerCase()) {
    score += 0.2
  } else if (
    product1.product_type?.toLowerCase().includes('espresso') && 
    product2.product_type?.toLowerCase().includes('espresso')
  ) {
    score += 0.1
  } else if (
    product1.product_type?.toLowerCase().includes('grinder') && 
    product2.product_type?.toLowerCase().includes('grinder')
  ) {
    score += 0.1
  }
  
  // Price similarity (10% weight) - closer prices get higher score
  const priceDiff = Math.abs(product1.price - product2.price) / Math.max(product1.price, product2.price)
  if (priceDiff < 0.1) score += 0.1
  else if (priceDiff < 0.2) score += 0.05
  
  return score
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(' ').filter(w => w.length > 2)
  const words2 = str2.split(' ').filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  let matches = 0
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matches++
        break
      } else if (word1.includes(word2) || word2.includes(word1)) {
        matches += 0.5
        break
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length)
}

// Enhanced similarity calculation using both traditional and embedding-based methods
async function calculateEnhancedSimilarity(
  product1: Product,
  product2: Product,
  product1Embeddings?: { titleEmbedding?: string | null; featuresEmbedding?: string | null },
  product2Embeddings?: { titleEmbedding?: string | null; featuresEmbedding?: string | null }
): Promise<{
  overallScore: number
  titleSimilarity: number
  brandSimilarity: number
  typeSimilarity: number
  priceSimilarity: number
  embeddingSimilarity: number | null
}> {
  // Traditional similarity scores
  const brandSimilarity = extractBrand(product1.title) === extractBrand(product2.title) ? 1.0 : 0.0
  const titleSimilarity = calculateStringSimilarity(cleanTitle(product1.title), cleanTitle(product2.title))
  const typeSimilarity = product1.product_type?.toLowerCase() === product2.product_type?.toLowerCase() ? 1.0 : 0.0
  
  // Price similarity (inverse of relative difference)
  const priceDiff = Math.abs(product1.price - product2.price) / Math.max(product1.price, product2.price)
  const priceSimilarity = Math.max(0, 1 - priceDiff)
  
  // Embedding similarity
  let embeddingSimilarity: number | null = null
  
  if (product1Embeddings?.titleEmbedding && product2Embeddings?.titleEmbedding) {
    try {
      const embedding1 = JSON.parse(product1Embeddings.titleEmbedding) as number[]
      const embedding2 = JSON.parse(product2Embeddings.titleEmbedding) as number[]
      embeddingSimilarity = calculateCosineSimilarity(embedding1, embedding2)
    } catch (error) {
      console.error('Error calculating embedding similarity:', error)
    }
  }
  
  // Weighted combination of similarity scores
  let overallScore = 0
  
  if (embeddingSimilarity !== null) {
    // When embeddings are available, give them higher weight
    overallScore = (
      embeddingSimilarity * 0.4 +        // Semantic similarity (40%)
      brandSimilarity * 0.25 +           // Brand matching (25%) 
      titleSimilarity * 0.2 +            // Traditional title similarity (20%)
      typeSimilarity * 0.1 +             // Product type (10%)
      priceSimilarity * 0.05             // Price proximity (5%)
    )
  } else {
    // Fallback to traditional scoring when embeddings not available
    overallScore = (
      brandSimilarity * 0.4 +            // Brand matching (40%)
      titleSimilarity * 0.3 +            // Title similarity (30%) 
      typeSimilarity * 0.2 +             // Product type (20%)
      priceSimilarity * 0.1              // Price proximity (10%)
    )
  }
  
  return {
    overallScore,
    titleSimilarity,
    brandSimilarity, 
    typeSimilarity,
    priceSimilarity,
    embeddingSimilarity
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0.3')
    const source = searchParams.get('source')
    
    const skip = (page - 1) * limit
    
    // Build where clause
    const where: any = {
      overallScore: {
        gte: minConfidence
      }
    }
    
    if (source) {
      where.source = source
    }
    
    // Get matches with related products
    const [matches, totalCount] = await Promise.all([
      prisma.productMatch.findMany({
        where,
        include: {
          idcProduct: true,
          competitorProduct: true
        },
        orderBy: { overallScore: 'desc' },
        skip,
        take: limit
      }),
      prisma.productMatch.count({ where })
    ])
    
    // Transform to frontend format
    const transformedMatches = matches.map((match: any) => ({
      id: match.id,
      idc_product: {
        id: match.idcProduct.id,
        title: match.idcProduct.title,
        vendor: match.idcProduct.vendor,
        product_type: match.idcProduct.productType,
        price: match.idcProduct.price,
        handle: match.idcProduct.handle,
        source: 'idc'
      },
      competitor_product: {
        id: match.competitorProduct.id,
        title: match.competitorProduct.title,
        vendor: match.competitorProduct.vendor,
        product_type: match.competitorProduct.productType,
        price: match.competitorProduct.price,
        handle: match.competitorProduct.handle,
        source: match.competitorProduct.source,
        source_name: match.source,
        url: match.competitorProduct.url
      },
      confidence: match.overallScore,
      confidence_level: match.confidence,
      price_difference: match.priceDifference,
      price_difference_percent: match.priceDifferencePercent,
      is_manual_match: match.isManualMatch,
      is_rejected: match.isRejected,
      // MAP violation data
      is_map_violation: match.isMapViolation,
      violation_amount: match.violationAmount,
      violation_severity: match.violationSeverity,
      first_violation_date: match.firstViolationDate,
      last_checked: match.lastChecked,
      similarity_scores: {
        title: match.titleSimilarity,
        brand: match.brandSimilarity,
        type: match.typeSimilarity,
        price: match.priceSimilarity,
        embedding: match.embeddingSimilarity
      },
      created_at: match.createdAt,
      updated_at: match.updatedAt
    }))
    
    return NextResponse.json({
      matches: transformedMatches,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
        has_next: page < Math.ceil(totalCount / limit),
        has_prev: page > 1
      },
      filters: {
        min_confidence: minConfidence,
        source
      },
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching product matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product matches' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Clear existing matches and regenerate
    await prisma.productMatch.deleteMany()
    
    // Get IDC products from Algolia directly (avoid internal fetch)
    let idcProducts;
    try {
      const algoliaResponse = await fetch('https://M71W3IRVX3-dsn.algolia.net/1/indexes/idc_products/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-API-Key': 'f4080b5c70ce601c85706444675a8a04',
          'X-Algolia-Application-Id': 'M71W3IRVX3'
        },
        body: JSON.stringify({
          params: 'filters=(product_type:"Espresso Machines" OR product_type:"Grinders") AND (vendor:"ECM" OR vendor:"Profitec" OR vendor:"Eureka") AND NOT tags:"openbox"&hitsPerPage=1000'
        })
      });

      if (!algoliaResponse.ok) {
        throw new Error('Failed to fetch IDC products from Algolia')
      }

      const algoliaData = await algoliaResponse.json()
      idcProducts = algoliaData.hits || []
    } catch (error) {
      console.error('Error fetching IDC products:', error)
      throw new Error('Failed to fetch IDC products')
    }
    
    // Get competitor products from database with embeddings
    const competitorProducts = await prisma.product.findMany({
      where: {
        source: { not: 'idc' },
        price: { not: null }
      },
      include: {
        variants: {
          take: 1,
          orderBy: { price: 'asc' }
        }
      }
    })
    
    const matches: ProductMatch[] = []
    let totalMatches = 0
    
    // First, store IDC products in our database
    console.log('🔄 Storing IDC products in database...')
    for (const idcProduct of idcProducts) {
      try {
        await prisma.product.upsert({
          where: { 
            externalId_source: {
              externalId: idcProduct.objectID,
              source: 'idc'
            }
          },
          update: {
            title: idcProduct.title,
            vendor: idcProduct.vendor || 'iDrinkCoffee',
            productType: idcProduct.product_type || '',
            price: parseFloat(idcProduct.price) || 0,
            handle: idcProduct.handle || '',
            sku: idcProduct.sku || null,
            url: `https://idrinkcoffee.com/products/${idcProduct.handle}`,
            updatedAt: new Date()
          },
          create: {
            externalId: idcProduct.objectID,
            title: idcProduct.title,
            vendor: idcProduct.vendor || 'iDrinkCoffee',
            productType: idcProduct.product_type || '',
            price: parseFloat(idcProduct.price) || 0,
            handle: idcProduct.handle || '',
            source: 'idc',
            sku: idcProduct.sku || null,
            url: `https://idrinkcoffee.com/products/${idcProduct.handle}`
          }
        })
      } catch (error) {
        console.error(`Error storing IDC product ${idcProduct.objectID}:`, error)
      }
    }

    for (const idcProduct of idcProducts) {
      // Convert IDC product to our format (Algolia object structure)
      const idcProd: Product = {
        id: idcProduct.objectID,
        title: idcProduct.title,
        vendor: idcProduct.vendor || 'iDrinkCoffee',
        product_type: idcProduct.product_type || '',
        price: parseFloat(idcProduct.price) || 0,
        handle: idcProduct.handle || '',
        source: 'idc'
      }
      
      // Generate embeddings for IDC product if needed
      let idcEmbeddings: { titleEmbedding: string; featuresEmbedding: string } | null = null
      try {
        if (process.env.OPENAI_API_KEY) {
          idcEmbeddings = await createProductEmbeddings({
            title: idcProd.title,
            vendor: idcProd.vendor,
            productType: idcProd.product_type,
            price: idcProd.price
          })
        }
      } catch (error) {
        console.error('Error creating IDC product embeddings:', error)
      }
      
      const productMatch: ProductMatch = {
        idc_product: idcProd,
        competitor_matches: []
      }
      
      // Find matches only within the same brand for more accurate comparisons
      const idcBrand = extractBrand(idcProd.title).toLowerCase()
      const matchingCompetitorProducts = competitorProducts.filter(comp => 
        comp.price && extractBrand(comp.title).toLowerCase() === idcBrand
      )
      
      console.log(`🎯 IDC Product: "${idcProd.title}" (Brand: ${idcBrand}) - Found ${matchingCompetitorProducts.length} same-brand competitors`)
      
      for (const compProduct of matchingCompetitorProducts) {
        const compProd: Product = {
          id: compProduct.id,
          title: compProduct.title,
          vendor: compProduct.vendor || '',
          product_type: compProduct.productType || '',
          price: compProduct.price || 0,
          handle: compProduct.handle || '',
          source: 'competitor',
          competitor: compProduct.source
        }
        
        // Calculate enhanced similarity using embeddings
        const similarities = await calculateEnhancedSimilarity(
          idcProd,
          compProd,
          idcEmbeddings || undefined,
          compProduct.titleEmbedding && compProduct.featuresEmbedding ? { 
            titleEmbedding: compProduct.titleEmbedding,
            featuresEmbedding: compProduct.featuresEmbedding 
          } : undefined
        )
        
        // Log some examples for debugging
        if (totalMatches < 3) {
          console.log(`🔍 Sample Match: "${idcProd.title}" vs "${compProd.title}"`)
          console.log(`   Brands: "${extractBrand(idcProd.title)}" vs "${extractBrand(compProd.title)}"`)
          console.log(`   Prices: $${idcProd.price} vs $${compProd.price}`)
          console.log(`   Overall Score: ${similarities.overallScore.toFixed(3)}`)
          console.log(`   Brand: ${similarities.brandSimilarity}, Title: ${similarities.titleSimilarity}`)
        }
        
        if (similarities.overallScore > 0.1) { // Lower confidence threshold for testing
          const priceDiff = (compProduct.price || 0) - idcProd.price
          const priceDiffPercent = idcProd.price > 0 ? (priceDiff / idcProd.price) * 100 : 0
          
          // Calculate MAP violation metrics
          const isMapViolation = (compProduct.price || 0) < idcProd.price
          const violationAmount = isMapViolation ? (idcProd.price - (compProduct.price || 0)) : null
          const violationSeverity = isMapViolation ? ((idcProd.price - (compProduct.price || 0)) / idcProd.price) * 100 : null

          // Store match in database
          try {
            // Find the actual database records
            const idcDbProduct = await prisma.product.findUnique({
              where: {
                externalId_source: {
                  externalId: idcProd.id.toString(),
                  source: 'idc'
                }
              }
            })
            
            if (!idcDbProduct) {
              console.error(`IDC product not found in database: ${idcProd.id}`)
              continue
            }
            
            const createdMatch = await prisma.productMatch.create({
              data: {
                idcProductId: idcDbProduct.id,
                competitorProductId: compProduct.id,
                source: compProduct.source,
                overallScore: similarities.overallScore,
                titleSimilarity: similarities.titleSimilarity,
                brandSimilarity: similarities.brandSimilarity,
                typeSimilarity: similarities.typeSimilarity,
                priceSimilarity: similarities.priceSimilarity,
                embeddingSimilarity: similarities.embeddingSimilarity,
                priceDifference: priceDiff,
                priceDifferencePercent: priceDiffPercent,
                confidence: similarities.overallScore > 0.8 ? 'very_high' : similarities.overallScore > 0.7 ? 'high' : similarities.overallScore > 0.5 ? 'medium' : 'low',
                // MAP violation fields
                isMapViolation: isMapViolation,
                violationAmount: violationAmount,
                violationSeverity: violationSeverity,
                firstViolationDate: isMapViolation ? new Date() : null,
                lastChecked: new Date()
              }
            })
            totalMatches++

            // Create violation history entry if this is a MAP violation
            if (isMapViolation && createdMatch) {
              console.log(`🚨 MAP VIOLATION DETECTED: ${idcProd.title} - Competitor: ${compProduct.price}, IDC: ${idcProd.price}`)
              
              // Create violation history record
              try {
                await prisma.mapViolationHistory.create({
                  data: {
                    productMatchId: createdMatch.id,
                    violationType: 'new_violation',
                    competitorPrice: compProduct.price || 0,
                    idcPrice: idcProd.price,
                    violationAmount: violationAmount || 0,
                    violationPercent: violationSeverity || 0,
                    competitorUrl: compProduct.url || null,
                    source: compProduct.source,
                    detectedAt: new Date()
                  }
                })
              } catch (historyError) {
                console.error('Error creating violation history:', historyError)
              }
            }
          } catch (error) {
            console.error('Error storing match:', error)
            // Continue with other matches
          }
          
          productMatch.competitor_matches.push({
            competitor: compProduct.source,
            product: compProd,
            confidence: similarities.overallScore,
            price_difference: priceDiff,
            price_difference_percent: priceDiffPercent
          })
        }
      }
      
      // Sort by confidence and pick best match
      productMatch.competitor_matches.sort((a, b) => b.confidence - a.confidence)
      
      if (productMatch.competitor_matches.length > 0) {
        productMatch.best_match = productMatch.competitor_matches[0]
        matches.push(productMatch)
      }
    }
    
    // Sort matches by best confidence
    matches.sort((a, b) => (b.best_match?.confidence || 0) - (a.best_match?.confidence || 0))
    
    console.log(`🎯 MATCHING SUMMARY:`)
    console.log(`- IDC Products: ${idcProducts.length}`)
    console.log(`- Competitor Products: ${competitorProducts.length}`)
    console.log(`- Matches Created: ${totalMatches}`)
    console.log(`- Preview Matches: ${matches.length}`)

    return NextResponse.json({
      matches: matches.slice(0, 50), // Return top 50 for preview
      total_matches: totalMatches,
      processed_at: new Date().toISOString(),
      stats: {
        idc_products_processed: idcProducts.length,
        competitor_products_processed: competitorProducts.length,
        matches_found: totalMatches,
        matches_stored: totalMatches
      },
      message: `Successfully processed ${idcProducts.length} IDC products against ${competitorProducts.length} competitor products and stored ${totalMatches} matches`
    })
  } catch (error) {
    console.error('Error in product matching:', error)
    return NextResponse.json(
      { error: 'Failed to match products' },
      { status: 500 }
    )
  }
}