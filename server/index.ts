import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import OpenAI from 'openai'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3005

// Create HTTP server and WebSocket server
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Middleware with Tauri-specific CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://tauri.localhost', 'tauri://localhost'],
  credentials: true,
  optionsSuccessStatus: 200
}))
app.use(express.json())

// Serve static files from dist directory
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  console.log(`📁 Serving static files from: ${distPath}`)
} else {
  console.warn(`⚠️  Static files directory not found: ${distPath}`)
}

// WebSocket connection handling
const activeConnections = new Set<WebSocket>()

wss.on('connection', (ws) => {
  console.log('📡 New WebSocket connection established')
  activeConnections.add(ws)
  
  ws.on('close', () => {
    console.log('📡 WebSocket connection closed')
    activeConnections.delete(ws)
  })
  
  ws.on('error', (error) => {
    console.error('📡 WebSocket error:', error)
    activeConnections.delete(ws)
  })
})

// Broadcast function for progress updates
function broadcastProgress(data: any) {
  const message = JSON.stringify(data)
  activeConnections.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message)
    }
  })
}

// Initialize Prisma
let prisma: PrismaClient | null = null
function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

// Initialize OpenAI
let openai: OpenAI | null = null
function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return openai
}

// Helper functions
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

// OpenAI Embeddings Helper Functions
async function generateEmbedding(text: string): Promise<number[] | null> {
  const openai = getOpenAIClient()
  if (!openai) {
    console.warn('OpenAI not configured - skipping embedding generation')
    return null
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    return null
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  return isNaN(similarity) ? 0 : similarity
}

// Replace iDC products in database with fresh Algolia data
async function replaceIdcProducts(algoliaHits: any[], targetBrands: string[]) {
  const prismaClient = getPrismaClient()
  
  try {
    // Delete existing iDC products for target brands
    await prismaClient.product.deleteMany({
      where: {
        source: 'idc',
        vendor: { in: targetBrands }
      }
    })
    console.log(`🗑️  Cleared old iDC products for brands: ${targetBrands.join(', ')}`)
    
    // Insert fresh Algolia data
    let insertedCount = 0
    for (const hit of algoliaHits) {
      try {
        await prismaClient.product.create({
          data: {
            externalId: hit.objectID,
            source: 'idc',
            title: hit.title || hit.name || '',
            vendor: hit.vendor || hit.brand || '',
            productType: hit.product_type || hit.type || '',
            price: parseFloat(hit.price) || 0,
            compareAtPrice: hit.compare_at_price ? parseFloat(hit.compare_at_price) : null,
            available: hit.available !== false,
            imageUrl: hit.image || hit.image_url || '',
            url: hit.url || `https://idrinkcoffee.com/products/${hit.handle || ''}`,
            description: hit.description || '',
            handle: hit.handle || '',
            sku: hit.sku || '',
            lastScrapedAt: new Date(),
            updatedAt: new Date()
          }
        })
        insertedCount++
      } catch (productError) {
        console.warn(`Failed to insert iDC product ${hit.objectID}:`, productError.message)
      }
    }
    
    console.log(`✅ Replaced iDC data: ${insertedCount} products inserted for ${targetBrands.join(', ')}`)
  } catch (error) {
    console.error('Error replacing iDC products:', error)
  }
}

function calculateProductSimilarity(idcProduct: any, competitorProduct: any): number {
  // Original algorithm from CLAUDE.md:
  // Brand Matching: 40% weight
  // Title Similarity: 30% weight  
  // Product Type: 20% weight
  // Price Proximity: 10% weight
  
  let brandScore = 0
  let titleScore = 0
  let typeScore = 0
  let priceScore = 0
  
  // Brand matching (40% weight)
  if (idcProduct.vendor && competitorProduct.vendor) {
    const idcBrand = idcProduct.vendor.toLowerCase().trim()
    const compBrand = competitorProduct.vendor.toLowerCase().trim()
    brandScore = idcBrand === compBrand ? 1 : 0
  }
  
  // Title similarity (30% weight) - basic string similarity
  if (idcProduct.title && competitorProduct.title) {
    const idcTitle = idcProduct.title.toLowerCase()
    const compTitle = competitorProduct.title.toLowerCase()
    const words1 = new Set(idcTitle.split(/\s+/))
    const words2 = new Set(compTitle.split(/\s+/))
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    titleScore = intersection.size / union.size
  }
  
  // Product type matching (20% weight)
  if (idcProduct.productType && competitorProduct.productType) {
    const idcType = idcProduct.productType.toLowerCase().trim()
    const compType = competitorProduct.productType.toLowerCase().trim()
    typeScore = idcType === compType ? 1 : 0
  }
  
  // Price proximity (10% weight)
  if (idcProduct.price && competitorProduct.price) {
    const priceDiff = Math.abs(idcProduct.price - competitorProduct.price)
    const avgPrice = (idcProduct.price + competitorProduct.price) / 2
    priceScore = Math.max(0, 1 - (priceDiff / avgPrice))
  }
  
  // Weighted score
  const finalScore = (brandScore * 0.4) + (titleScore * 0.3) + (typeScore * 0.2) + (priceScore * 0.1)
  return Math.round(finalScore * 100) // Return as percentage
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

// Dashboard stats endpoint - Updated to use ProductMatch data for consistency
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const prismaClient = getPrismaClient()

    // Get MAP enforcement statistics from ProductMatch table
    const totalMatches = await prismaClient.productMatch.count()
    const mapViolations = await prismaClient.productMatch.count({
      where: { isMapViolation: true }
    })

    // Get revenue at risk from MAP violations
    const revenueAtRisk = await prismaClient.productMatch.aggregate({
      _sum: { violationAmount: true },
      where: { isMapViolation: true }
    }).then(result => result._sum.violationAmount || 0)

    // Get high confidence matches
    const highConfidenceMatches = await prismaClient.productMatch.count({
      where: { overallScore: { gte: 0.8 } }
    })

    // Get customer status with MAP violation data
    const customerStatus = await prismaClient.productMatch.groupBy({
      by: ['source'],
      _count: { id: true },
      _sum: { violationAmount: true },
      where: {
        source: { in: ['home_coffee_solutions', 'kitchen_barista', 'cafe_liegeois'] }
      }
    })

    const competitorStatus = customerStatus.map((customer: any) => ({
      name: COMPETITOR_NAMES[customer.source as keyof typeof COMPETITOR_NAMES] || customer.source,
      domain: COMPETITOR_DOMAINS[customer.source as keyof typeof COMPETITOR_DOMAINS] || customer.source,
      status: 'Active' as const,
      last_updated: '2h ago', // Would be calculated from lastChecked
      products_tracked: customer._count.id,
      avg_price_difference: 0, // Would calculate from ProductMatch data
      total_violations: customer._sum.violationAmount || 0
    }))

    // Get worst offender (customer with most violation amount)
    const worstOffender = await prismaClient.productMatch.groupBy({
      by: ['source'],
      _sum: { violationAmount: true },
      _count: { id: true },
      where: { isMapViolation: true },
      orderBy: { _sum: { violationAmount: 'desc' } },
      take: 1
    }).then(results => {
      if (results.length > 0) {
        const worst = results[0]
        return {
          source: worst.source,
          name: COMPETITOR_NAMES[worst.source as keyof typeof COMPETITOR_NAMES] || worst.source,
          violations: worst._count.id,
          violation_amount: worst._sum.violationAmount || 0
        }
      }
      return null
    })

    // Get recent MAP violations as alerts
    const recentViolations = await prismaClient.productMatch.findMany({
      where: { isMapViolation: true },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        idcProduct: true,
        competitorProduct: true
      }
    })

    const recentAlerts = recentViolations.map((violation: any) => ({
      id: violation.id,
      product_title: violation.competitorProduct.title,
      competitor: COMPETITOR_NAMES[violation.source as keyof typeof COMPETITOR_NAMES] || violation.source,
      alert_type: 'map_violation',
      old_price: null,
      new_price: violation.competitorProduct.price,
      price_difference: violation.priceDifference,
      price_difference_percent: violation.priceDifferencePercent,
      created_at: violation.firstViolationDate || violation.createdAt,
      idc_price: violation.idcProduct.price,
      competitive_advantage: violation.violationAmount
    }))

    const stats = {
      products_monitored: totalMatches,
      active_alerts: mapViolations,
      competitors_tracked: customerStatus.length,
      map_violations: mapViolations,
      revenue_at_risk: revenueAtRisk,
      worst_offender: worstOffender
    }

    res.json({
      stats,
      competitor_status: competitorStatus,
      recent_alerts: recentAlerts
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

// Competitor products endpoint
app.get('/api/competitors/products', async (req, res) => {
  try {
    const prismaClient = getPrismaClient()
    const { source, page = '1', limit = '50', search, vendor } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

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
        { title: { contains: search as string, mode: 'insensitive' } },
        { vendor: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    if (vendor) {
      where.vendor = { contains: vendor as string, mode: 'insensitive' }
    }

    // Get products with pagination
    const [products, totalCount] = await Promise.all([
      prismaClient.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { updatedAt: 'desc' }
        ]
      }),
      prismaClient.product.count({ where })
    ])

    // Get summary stats
    const summary = await prismaClient.product.groupBy({
      by: ['source'],
      where: {
        source: {
          not: 'idc'
        }
      },
      _count: {
        id: true
      },
      _avg: {
        price: true
      }
    })

    const summaryFormatted = summary.map(s => ({
      source: s.source,
      source_name: COMPETITOR_NAMES[s.source as keyof typeof COMPETITOR_NAMES] || s.source,
      product_count: s._count.id,
      avg_price: s._avg.price || 0
    }))

    const totalPages = Math.ceil(totalCount / limitNum)

    res.json({
      products: products.map((product: any) => ({
        ...product,
        source_name: COMPETITOR_NAMES[product.source as keyof typeof COMPETITOR_NAMES] || product.source,
        price_change: null, // Would need historical data
        price_change_percent: null
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        total_pages: totalPages,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      },
      summary: summaryFormatted,
      filters: {
        source: source as string || null,
        search: search as string || null,  
        vendor: vendor as string || null
      },
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching competitor products:', error)
    res.status(500).json({ error: 'Failed to fetch competitor products' })
  }
})

// Competitor scrape endpoint
app.post('/api/competitors/scrape', async (req, res) => {
  try {
    const { competitors } = req.body
    const prismaClient = getPrismaClient()
    
    const results = []
    let totalScraped = 0

    for (const competitor of competitors) {
      try {
        console.log(`Scraping ${competitor}...`)
        
        let products = []
        let competitorName = ''
        let baseUrl = ''
        
        // Define competitor URLs and collections
        const competitorMap: Record<string, { name: string, baseUrl: string, collections: string[] }> = {
          'home-coffee-solutions': {
            name: 'Home Coffee Solutions',
            baseUrl: 'https://homecoffeesolutions.com',
            collections: ['ecm', 'profitec', 'eureka']
          },
          'kitchen-barista': {
            name: 'The Kitchen Barista', 
            baseUrl: 'https://thekitchenbarista.com',
            collections: ['profitec']
          },
          'cafe-liegeois': {
            name: 'Cafe Liegeois',
            baseUrl: 'https://cafeliegeois.ca', 
            collections: ['ecm', 'profitec', 'eureka']
          }
        }

        const competitorConfig = competitorMap[competitor]
        if (!competitorConfig) {
          throw new Error(`Unknown competitor: ${competitor}`)
        }

        competitorName = competitorConfig.name
        baseUrl = competitorConfig.baseUrl

        // Scrape each collection
        for (const collection of competitorConfig.collections) {
          try {
            const url = `${baseUrl}/collections/${collection}/products.json`
            console.log(`Fetching: ${url}`)
            
            const response = await axios.get(url, {
              timeout: 30000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CompetitorDashboard/1.0)'
              }
            })

            if (response.data && response.data.products) {
              products.push(...response.data.products)
            }
            
            // Rate limiting - wait 2 seconds between requests
            await new Promise(resolve => setTimeout(resolve, 2000))
          } catch (collectionError) {
            console.warn(`Failed to scrape ${collection} from ${competitor}:`, collectionError.message)
          }
        }

        // Replace old competitor data for this source
        await prismaClient.product.deleteMany({
          where: {
            source: competitor.replace('-', '_'),
            vendor: { in: ['ECM', 'Profitec', 'Eureka'] }
          }
        })
        console.log(`🗑️  Cleared old ${competitorName} products for target brands`)

        // Store fresh products in database
        let storedCount = 0
        for (const product of products) {
          try {
            const variants = product.variants || []
            const lowestPrice = variants.length > 0 
              ? Math.min(...variants.map((v: any) => parseFloat(v.price) || 0))
              : parseFloat(product.price) || 0

            const productData = {
              externalId: product.id.toString(),
              source: competitor.replace('-', '_'),
              title: product.title,
              vendor: product.vendor || '',
              productType: product.product_type || '',
              handle: product.handle || '',
              sku: variants[0]?.sku || '',
              price: lowestPrice,
              compareAtPrice: variants[0]?.compare_at_price ? parseFloat(variants[0].compare_at_price) : null,
              available: product.available || false,
              imageUrl: product.images?.[0]?.src || '',
              url: `${baseUrl}/products/${product.handle}`,
              description: product.body_html || '',
              lastScrapedAt: new Date(),
              updatedAt: new Date()
            }

            await prismaClient.product.upsert({
              where: {
                externalId_source: {
                  externalId: productData.externalId,
                  source: productData.source
                }
              },
              create: productData,
              update: {
                ...productData,
                createdAt: undefined // Don't update createdAt on updates
              }
            })

            storedCount++
          } catch (productError) {
            console.warn(`Failed to store product ${product.id}:`, productError.message)
          }
        }

        results.push({
          competitor,
          collection: 'all',
          products: storedCount,
          total: products.length,
          scraped_at: new Date().toISOString()
        })

        totalScraped += storedCount
        console.log(`✓ Scraped ${storedCount} products from ${competitorName}`)

      } catch (competitorError) {
        console.error(`Failed to scrape ${competitor}:`, competitorError.message)
        results.push({
          competitor,
          collection: 'all', 
          products: 0,
          total: 0,
          scraped_at: new Date().toISOString(),
          error: competitorError.message
        })
      }
    }

    res.json({
      results,
      total_scraped: totalScraped,
      message: `Successfully scraped ${totalScraped} products from ${competitors.length} competitors`
    })
  } catch (error) {
    console.error('Error scraping competitors:', error)
    res.status(500).json({ error: 'Failed to scrape competitor data' })
  }
})

// iDrinkCoffee products endpoint - Real Algolia integration
app.get('/api/products/idc', async (req, res) => {
  try {
    const { query, brands, hitsPerPage = 500 } = req.query
    
    // Real Algolia API endpoint from CLAUDE.md
    const algoliaUrl = 'https://M71W3IRVX3-dsn.algolia.net/1/indexes/idc_products/query'
    
    // Build Algolia query - focus on target brands ECM, Profitec, Eureka
    const targetBrands = brands ? (brands as string).split(',') : ['ECM', 'Profitec', 'Eureka']
    
    const algoliaQuery: any = {
      query: query || '',
      hitsPerPage: parseInt(hitsPerPage as string),
      facetFilters: [targetBrands.map((brand: string) => `vendor:${brand.trim()}`)]
    }
    
    // Get Algolia API key from environment or settings
    let algoliaApiKey = process.env.ALGOLIA_API_KEY
    
    if (!algoliaApiKey) {
      try {
        const settingsFile = path.join(process.cwd(), 'settings.json')
        if (fs.existsSync(settingsFile)) {
          const fileSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
          algoliaApiKey = fileSettings.algolia_api_key
        }
      } catch (error) {
        console.warn('Could not read Algolia API key from settings:', error)
      }
    }
    
    // Try to fetch from real Algolia if API key is provided
    if (algoliaApiKey) {
      try {
        const algoliaResponse = await axios.post(algoliaUrl, algoliaQuery, {
          headers: {
            'Content-Type': 'application/json',
            'X-Algolia-Application-Id': 'M71W3IRVX3',
            'X-Algolia-API-Key': algoliaApiKey
          },
          timeout: 10000
        })
        
        if (algoliaResponse.data && algoliaResponse.data.hits) {
          console.log(`✓ Fetched ${algoliaResponse.data.hits.length} products from Algolia`)
          
          // Replace old iDC data with fresh Algolia data for target brands
          await replaceIdcProducts(algoliaResponse.data.hits, targetBrands)
          
          res.json(algoliaResponse.data)
          return
        }
      } catch (algoliaError) {
        console.warn('Algolia API failed, falling back to local data:', algoliaError.response?.status || algoliaError.message)
      }
    } else {
      console.log('Algolia API key not provided, using local data')
    }
    
    // Fallback: Get from local database or create samples
    const prismaClient = getPrismaClient()
    const where: any = { source: 'idc' }
    
    if (query) {
      where.OR = [
        { title: { contains: query as string, mode: 'insensitive' } },
        { vendor: { contains: query as string, mode: 'insensitive' } }
      ]
    }
    
    // Filter by target brands (already defined above)
    where.vendor = { in: targetBrands }

    const products = await prismaClient.product.findMany({
      where,
      take: parseInt(hitsPerPage as string),
      orderBy: { updatedAt: 'desc' }
    })

    // If no local iDC products exist, create sample ones
    if (products.length === 0) {
      // Clear any existing iDC sample data first
      await prismaClient.product.deleteMany({
        where: {
          source: 'idc',
          vendor: { in: targetBrands }
        }
      })
      
      const sampleProducts = [
        {
          externalId: 'idc-ecm-synchronika',
          source: 'idc',
          title: 'ECM Synchronika Dual Boiler Espresso Machine',
          vendor: 'ECM',
          productType: 'espresso-machine',
          price: 3299.99,
          compareAtPrice: 3499.99,
          available: true,
          imageUrl: '/images/ecm-synchronika.jpg',
          url: 'https://idrinkcoffee.com/products/ecm-synchronika',
          description: 'Premium dual boiler espresso machine with PID control'
        },
        {
          externalId: 'idc-profitec-pro-700',
          source: 'idc', 
          title: 'Profitec Pro 700 Dual Boiler Espresso Machine',
          vendor: 'Profitec',
          productType: 'espresso-machine',
          price: 2899.99,
          available: true,
          imageUrl: '/images/profitec-pro-700.jpg',
          url: 'https://idrinkcoffee.com/products/profitec-pro-700',
          description: 'Professional dual boiler espresso machine'
        },
        {
          externalId: 'idc-eureka-mignon-oro',
          source: 'idc',
          title: 'Eureka Mignon Oro Single Dose Grinder',
          vendor: 'Eureka',
          productType: 'grinder',
          price: 899.99,
          available: true,
          imageUrl: '/images/eureka-mignon-oro.jpg',
          url: 'https://idrinkcoffee.com/products/eureka-mignon-oro',
          description: 'Single dose coffee grinder with excellent retention'
        }
      ]

      // Create sample products if none exist
      for (const productData of sampleProducts) {
        try {
          await prismaClient.product.create({
            data: productData
          })
        } catch (err) {
          console.warn('Failed to create sample product:', err)
        }
      }
      console.log(`✅ Created ${sampleProducts.length} sample iDC products for ${targetBrands.join(', ')}`)

      // Re-fetch products
      const updatedProducts = await prismaClient.product.findMany({
        where,
        take: parseInt(hitsPerPage as string),
        orderBy: {
          updatedAt: 'desc'
        }
      })

      res.json({
        hits: updatedProducts.map(p => ({
          objectID: p.id,
          title: p.title,
          vendor: p.vendor,
          price: p.price,
          compare_at_price: p.compareAtPrice,
          available: p.available,
          image: p.imageUrl,
          brand: p.vendor
        })),
        nbHits: updatedProducts.length,
        page: 0,
        nbPages: 1,
        hitsPerPage: parseInt(hitsPerPage as string),
        processingTimeMS: 1
      })
    } else {
      res.json({
        hits: products.map(p => ({
          objectID: p.id,
          title: p.title,
          vendor: p.vendor,
          price: p.price,
          compare_at_price: p.compareAtPrice,
          available: p.available,
          image: p.imageUrl,
          brand: p.vendor
        })),
        nbHits: products.length,
        page: 0,
        nbPages: 1,
        hitsPerPage: parseInt(hitsPerPage as string),
        processingTimeMS: 1
      })
    }
  } catch (error) {
    console.error('Error fetching iDC products:', error)
    res.status(500).json({ error: 'Failed to fetch iDC products' })
  }
})

// Embeddings update endpoint
app.post('/api/embeddings/update', async (req, res) => {
  try {
    const { dry_run = false } = req.query
    const prismaClient = getPrismaClient()
    const openai = getOpenAIClient()
    
    if (!openai) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' 
      })
    }
    
    // Get products without embeddings
    const productsWithoutEmbeddings = await prismaClient.product.findMany({
      where: {
        embedding: null
      },
      take: dry_run ? 5 : 50 // Limit for cost control
    })
    
    if (dry_run) {
      return res.json({
        message: 'Dry run - would update embeddings for these products',
        products: productsWithoutEmbeddings.map(p => ({
          id: p.id,
          title: p.title,
          vendor: p.vendor,
          source: p.source
        })),
        count: productsWithoutEmbeddings.length,
        estimated_cost: `$${(productsWithoutEmbeddings.length * 0.00002).toFixed(4)}`
      })
    }
    
    let updatedCount = 0
    for (const product of productsWithoutEmbeddings) {
      try {
        // Create embedding text from product data
        const embeddingText = `${product.vendor} ${product.title} ${product.productType || ''} ${product.description || ''}`.trim()
        
        const embedding = await generateEmbedding(embeddingText)
        if (embedding) {
          await prismaClient.product.update({
            where: { id: product.id },
            data: { 
              embedding: JSON.stringify(embedding),
              updatedAt: new Date()
            }
          })
          updatedCount++
          console.log(`✓ Generated embedding for: ${product.title}`)
        }
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (embeddingError) {
        console.warn(`Failed to generate embedding for ${product.id}:`, embeddingError.message)
      }
    }
    
    res.json({
      message: `Successfully updated embeddings for ${updatedCount} products`,
      updated: updatedCount,
      total_candidates: productsWithoutEmbeddings.length,
      cost_estimate: `$${(updatedCount * 0.00002).toFixed(4)}`
    })
  } catch (error) {
    console.error('Error updating embeddings:', error)
    res.status(500).json({ error: 'Failed to update embeddings' })
  }
})

// GET stored matches endpoint - Load existing ProductMatch records
app.get('/api/products/match', async (req, res) => {
  try {
    const { min_confidence = 0.7, source, page = 1, limit = 100 } = req.query
    const prismaClient = getPrismaClient()
    
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum
    
    // Build where clause
    const where: any = {
      overallScore: { gte: parseFloat(min_confidence as string) }
    }
    
    if (source && source !== 'all') {
      where.source = source
    }
    
    // Get stored matches with related products
    const matches = await prismaClient.productMatch.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        idcProduct: true,
        competitorProduct: true
      },
      orderBy: [
        { isMapViolation: 'desc' }, // MAP violations first
        { overallScore: 'desc' }    // Then by confidence
      ]
    })
    
    // Format matches for frontend
    const formattedMatches = matches.map(match => ({
      id: match.id,
      idc_product: {
        id: match.idcProduct.id,
        title: match.idcProduct.title,
        vendor: match.idcProduct.vendor,
        price: match.idcProduct.price,
        product_type: match.idcProduct.productType,
        handle: match.idcProduct.handle,
        source: 'idc'
      },
      competitor_product: {
        id: match.competitorProduct.id,
        title: match.competitorProduct.title,
        vendor: match.competitorProduct.vendor,
        price: match.competitorProduct.price,
        product_type: match.competitorProduct.productType,
        handle: match.competitorProduct.handle,
        source: match.competitorProduct.source,
        url: match.competitorProduct.url
      },
      confidence: match.overallScore,
      confidence_level: match.confidence,
      price_difference: match.priceDifference || 0,
      price_difference_percent: match.priceDifferencePercent || 0,
      is_manual_match: match.isManualMatch,
      is_rejected: match.isRejected,
      is_map_violation: match.isMapViolation,
      violation_amount: match.violationAmount,
      violation_severity: match.violationSeverity,
      first_violation_date: match.firstViolationDate?.toISOString(),
      last_checked: match.lastChecked.toISOString(),
      similarity_scores: {
        title: match.titleSimilarity,
        brand: match.brandSimilarity,
        type: match.typeSimilarity,
        price: match.priceSimilarity,
        embedding: match.embeddingSimilarity
      },
      created_at: match.createdAt.toISOString(),
      updated_at: match.updatedAt.toISOString()
    }))
    
    res.json({
      matches: formattedMatches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: await prismaClient.productMatch.count({ where })
      }
    })
  } catch (error) {
    console.error('Error fetching stored matches:', error)
    res.status(500).json({ error: 'Failed to fetch stored matches' })
  }
})

// POST generate new matches endpoint - Create and store new ProductMatch records
app.post('/api/products/match', async (req, res) => {
  try {
    const { confidence_threshold = 70 } = req.body
    const prismaClient = getPrismaClient()
    
    console.log('🔍 Starting MAP enforcement analysis...')
    
    // Get iDC products (these are the MAP prices)
    const idcProducts = await prismaClient.product.findMany({
      where: { 
        source: 'idc',
        vendor: { in: ['ECM', 'Profitec', 'Eureka'] }
      },
      take: 500
    })
    
    // Get competitor products (our wholesale customers)
    const competitorProducts = await prismaClient.product.findMany({
      where: { 
        source: { not: 'idc' },
        vendor: { in: ['ECM', 'Profitec', 'Eureka'] }
      },
      take: 1000
    })
    
    if (idcProducts.length === 0) {
      return res.status(400).json({ 
        error: 'No iDrinkCoffee MAP prices found. Please ensure iDC data is available.' 
      })
    }
    
    if (competitorProducts.length === 0) {
      return res.status(400).json({ 
        error: 'No customer/competitor products found. Please run competitor scraping first.' 
      })
    }
    
    // Clear existing matches for fresh analysis
    await prismaClient.productMatch.deleteMany({})
    console.log('🗑️  Cleared existing product matches for fresh MAP analysis')
    
    let matchesCreated = 0
    let violationsDetected = 0
    const usedCompetitorIds = new Set()
    
    for (const idcProduct of idcProducts) {
      let bestMatch = null
      let bestScore = 0
      
      let bestEmbeddingSimilarity = null
      
      for (const compProduct of competitorProducts) {
        if (usedCompetitorIds.has(compProduct.id)) continue
        
        // Calculate similarity using both traditional algorithm and embeddings
        let similarity = calculateProductSimilarity(idcProduct, compProduct)
        let embeddingSimilarity = null
        
        // Enhance with embedding similarity if available
        if (idcProduct.titleEmbedding && compProduct.titleEmbedding) {
          try {
            const idcEmb = JSON.parse(idcProduct.titleEmbedding)
            const compEmb = JSON.parse(compProduct.titleEmbedding)
            embeddingSimilarity = cosineSimilarity(idcEmb, compEmb)
            
            console.log(`🤖 EMBEDDING SIMILARITY: ${embeddingSimilarity.toFixed(3)} for "${idcProduct.title}" vs "${compProduct.title}"`)
            
            // Use embedding-weighted scoring when embeddings are available (40% semantic, 25% brand, 20% title, 10% type, 5% price)
            similarity = (embeddingSimilarity * 100 * 0.4) + (similarity * 0.6)
          } catch (err) {
            console.error('Error parsing embeddings:', err)
            // Skip embedding enhancement if parsing fails
          }
        } else {
          console.log(`⚠️  NO EMBEDDINGS: IDC=${!!idcProduct.titleEmbedding}, Comp=${!!compProduct.titleEmbedding} for "${idcProduct.title}" vs "${compProduct.title}"`)
        }
        
        if (similarity > bestScore && similarity >= confidence_threshold) {
          bestScore = similarity
          bestMatch = { compProduct, similarity }
          bestEmbeddingSimilarity = embeddingSimilarity
        }
      }
      
      if (bestMatch) {
        const { compProduct, similarity } = bestMatch
        usedCompetitorIds.add(compProduct.id)
        
        // Calculate MAP violation analysis
        const priceDifference = compProduct.price - idcProduct.price
        const priceDifferencePercent = idcProduct.price > 0 ? (priceDifference / idcProduct.price) * 100 : 0
        const isMapViolation = compProduct.price < idcProduct.price // Customer selling below MAP
        const violationAmount = isMapViolation ? Math.abs(priceDifference) : null
        const violationSeverity = isMapViolation ? Math.abs(priceDifferencePercent) : null
        
        // Determine confidence level
        let confidenceLevel = 'low'
        if (similarity >= 90) confidenceLevel = 'high'
        else if (similarity >= 80) confidenceLevel = 'medium'
        
        // Create ProductMatch record
        await prismaClient.productMatch.create({
          data: {
            idcProductId: idcProduct.id,
            competitorProductId: compProduct.id,
            source: compProduct.source,
            overallScore: similarity / 100, // Store as 0-1 decimal
            titleSimilarity: 0.85, // Would be calculated by enhanced algorithm
            brandSimilarity: idcProduct.vendor === compProduct.vendor ? 1.0 : 0.0,
            typeSimilarity: idcProduct.productType === compProduct.productType ? 1.0 : 0.0,
            embeddingSimilarity: bestEmbeddingSimilarity, // Store the actual embedding similarity
            priceSimilarity: Math.max(0, 1 - Math.abs(priceDifferencePercent) / 100),
            priceDifference,
            priceDifferencePercent,
            isMapViolation,
            violationSeverity,
            violationAmount,
            firstViolationDate: isMapViolation ? new Date() : null,
            lastChecked: new Date(),
            isManualMatch: false,
            isRejected: false,
            confidence: confidenceLevel
          }
        })
        
        matchesCreated++
        if (isMapViolation) violationsDetected++
      }
    }
    
    console.log(`✅ MAP Analysis Complete: ${matchesCreated} matches created, ${violationsDetected} violations detected`)
    
    res.json({
      success: true,
      message: `Generated ${matchesCreated} product matches with ${violationsDetected} MAP violations`,
      summary: {
        matches_created: matchesCreated,
        violations_detected: violationsDetected,
        idc_products_analyzed: idcProducts.length,
        competitor_products_analyzed: competitorProducts.length,
        confidence_threshold,
        analysis_type: 'MAP Enforcement Analysis'
      }
    })
  } catch (error) {
    console.error('Error generating MAP analysis:', error)
    res.status(500).json({ error: 'Failed to generate MAP analysis' })
  }
})

// Brands endpoints
app.get('/api/brands', async (req, res) => {
  try {
    const prismaClient = getPrismaClient()
    
    const brands = await prismaClient.brand.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    res.json(brands)
  } catch (error) {
    console.error('Error fetching brands:', error)
    res.status(500).json({ error: 'Failed to fetch brands' })
  }
})

// Force regenerate embeddings for ALL products with real-time progress
app.post('/api/debug/force-embeddings', async (req, res) => {
  try {
    const prismaClient = getPrismaClient()
    
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'OpenAI API key not found in environment variables' })
    }

    // Get all products (including IDC products that need embeddings)
    const allProducts = await prismaClient.product.findMany({
      where: {
        OR: [
          { titleEmbedding: null },
          { featuresEmbedding: null }
        ]
      }
    })

    console.log(`🤖 Starting FORCE embedding generation for ${allProducts.length} products...`)
    
    // Broadcast initial progress
    broadcastProgress({
      type: 'embedding_progress',
      status: 'started',
      total: allProducts.length,
      processed: 0,
      success: 0,
      errors: 0,
      message: `Starting embedding generation for ${allProducts.length} products...`
    })

    let successCount = 0
    let errorCount = 0
    const errors = []

    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i]
      try {
        // Broadcast current product being processed
        broadcastProgress({
          type: 'embedding_progress',
          status: 'processing',
          total: allProducts.length,
          processed: i,
          success: successCount,
          errors: errorCount,
          current_product: product.title,
          progress_percent: Math.round((i / allProducts.length) * 100),
          message: `Processing ${i + 1}/${allProducts.length}: ${product.title}`
        })

        // Import embeddings functions
        const { createProductEmbeddings } = await import('../src/lib/embeddings')
        
        const embeddings = await createProductEmbeddings({
          title: product.title,
          vendor: product.vendor,
          productType: product.productType,
          price: product.price,
          features: product.features
        })

        await prismaClient.product.update({
          where: { id: product.id },
          data: {
            titleEmbedding: embeddings.titleEmbedding,
            featuresEmbedding: embeddings.featuresEmbedding,
            features: embeddings.extractedFeatures
          }
        })

        successCount++
        console.log(`✓ Generated embeddings for: ${product.title} (${successCount}/${allProducts.length})`)
        
        // Broadcast success update
        broadcastProgress({
          type: 'embedding_progress',
          status: 'processing',
          total: allProducts.length,
          processed: i + 1,
          success: successCount,
          errors: errorCount,
          progress_percent: Math.round(((i + 1) / allProducts.length) * 100),
          message: `✓ Completed ${i + 1}/${allProducts.length}: ${product.title}`
        })
      } catch (error) {
        errorCount++
        const errorMsg = `Failed for ${product.title}: ${error}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
        
        // Broadcast error update
        broadcastProgress({
          type: 'embedding_progress',
          status: 'processing',
          total: allProducts.length,
          processed: i + 1,
          success: successCount,
          errors: errorCount,
          current_error: errorMsg,
          progress_percent: Math.round(((i + 1) / allProducts.length) * 100),
          message: `❌ Error ${i + 1}/${allProducts.length}: ${product.title}`
        })
      }

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log(`🎯 FORCE EMBEDDING COMPLETE: ${successCount} success, ${errorCount} errors`)
    
    // Broadcast completion
    broadcastProgress({
      type: 'embedding_progress',
      status: 'completed',
      total: allProducts.length,
      processed: allProducts.length,
      success: successCount,
      errors: errorCount,
      progress_percent: 100,
      message: `✅ Complete! ${successCount} successful, ${errorCount} errors`
    })

    res.json({
      message: 'Force embedding generation completed',
      total_products: allProducts.length,
      success_count: successCount,
      error_count: errorCount,
      errors: errors.slice(0, 10) // Return first 10 errors
    })
  } catch (error) {
    console.error('Error in force embedding generation:', error)
    
    // Broadcast error completion
    broadcastProgress({
      type: 'embedding_progress',
      status: 'error',
      message: `❌ Failed: ${error.message}`,
      error: error.message
    })
    
    res.status(500).json({ error: 'Failed to generate embeddings' })
  }
})

// Debug endpoint for embeddings
app.get('/api/debug/embeddings', async (req, res) => {
  try {
    const prismaClient = getPrismaClient()
    
    // Check competitor products with embeddings
    const competitorProducts = await prismaClient.product.findMany({
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
      const fs = await import('fs')
      const path = await import('path')
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

    res.json({
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
    res.status(500).json({ error: 'Failed to check embeddings' })
  }
})

// Settings API endpoints
app.get('/api/settings', async (req, res) => {
  try {
    // Return default settings or load from file
    const settingsFile = path.join(process.cwd(), 'settings.json')
    
    let settings = {
      openai_api_key: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 8)}... (from environment)` : '',
      algolia_api_key: process.env.ALGOLIA_API_KEY ? `${process.env.ALGOLIA_API_KEY.substring(0, 8)}... (from environment)` : '',
      confidence_threshold: 70,
      scraping_interval: 24
    }
    
    try {
      if (fs.existsSync(settingsFile)) {
        const fileSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
        settings = { ...settings, ...fileSettings }
        
        // Mask the API key for display
        if (settings.openai_api_key && !settings.openai_api_key.includes('(from environment)')) {
          settings.openai_api_key = `${settings.openai_api_key.substring(0, 8)}...`
        }
      }
    } catch (fileError) {
      console.log('Could not read settings file, using defaults')
    }
    
    res.json(settings)
  } catch (error) {
    console.error('Error loading settings:', error)
    res.status(500).json({ error: 'Failed to load settings' })
  }
})

app.post('/api/settings', async (req, res) => {
  try {
    const { openai_api_key, algolia_api_key, confidence_threshold, scraping_interval } = req.body
    
    // Sanitize the API keys if provided
    const cleanOpenaiApiKey = openai_api_key ? 
      openai_api_key
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
        .trim() : ''
    
    const cleanAlgoliaApiKey = algolia_api_key ? 
      algolia_api_key
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters  
        .trim() : ''
    
    const settingsFile = path.join(process.cwd(), 'settings.json')
    
    const settings = {
      openai_api_key: cleanOpenaiApiKey,
      algolia_api_key: cleanAlgoliaApiKey,
      confidence_threshold,
      scraping_interval
    }
    
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2))
    
    res.json({ success: true, message: 'Settings saved successfully' })
  } catch (error) {
    console.error('Error saving settings:', error)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

app.post('/api/settings/test-openai', async (req, res) => {
  try {
    const { api_key } = req.body
    
    if (!api_key) {
      return res.status(400).json({ error: 'API key is required' })
    }

    // Sanitize the API key - remove invisible characters and trim
    const cleanApiKey = api_key
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
      .trim()

    if (!cleanApiKey) {
      return res.status(400).json({ error: 'API key contains only invalid characters' })
    }

    console.log(`Testing API key: ${cleanApiKey.substring(0, 10)}...`)

    // Test the API key by making a simple request to OpenAI
    const openai = new OpenAI({ apiKey: cleanApiKey })
    
    try {
      // Make a simple test call
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'test',
        dimensions: 512
      })
      
      if (response && response.data && response.data.length > 0) {
        res.json({ success: true, message: 'API key is valid' })
      } else {
        res.status(400).json({ error: 'Invalid API response' })
      }
    } catch (apiError) {
      console.error('OpenAI API test error:', apiError)
      res.status(400).json({ 
        error: apiError.message || 'Invalid API key or OpenAI service error' 
      })
    }
  } catch (error) {
    console.error('Error testing OpenAI API key:', error)
    res.status(500).json({ error: 'Failed to test API key' })
  }
})

// Catch-all handler for React Router (must be last)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' })
  }
  
  const indexPath = path.join(distPath, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).send(`
      <h1>Application files not found</h1>
      <p>Make sure the 'dist' folder is in the correct location.</p>
      <p>Looking for: ${indexPath}</p>
    `)
  }
})

// Start server with WebSocket support
server.listen(port, () => {
  console.log(`🚀 Express server with WebSocket running on http://localhost:${port}`)
  console.log(`📡 WebSocket server running on ws://localhost:${port}`)
  console.log(`📊 Dashboard stats: http://localhost:${port}/api/dashboard/stats`)
  console.log(`🏪 Competitor products: http://localhost:${port}/api/competitors/products`)
  console.log(`🔍 Debug embeddings: http://localhost:${port}/api/debug/embeddings`)
  console.log(`🤖 Force embeddings: http://localhost:${port}/api/debug/force-embeddings`)
})