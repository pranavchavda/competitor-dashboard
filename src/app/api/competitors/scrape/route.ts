import { NextResponse } from 'next/server'
import axios from 'axios'
import { prisma } from '@/lib/db'
import { createProductEmbeddings } from '@/lib/embeddings'

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  vendor: string
  product_type: string
  created_at: string
  updated_at: string
  published_at: string | null
  available: boolean
  tags: string[]
  variants: Array<{
    id: number
    title: string
    option1: string | null
    option2: string | null
    option3: string | null
    sku: string | null
    requires_shipping: boolean
    taxable: boolean
    featured_image: any
    available: boolean
    price: string
    grams: number
    compare_at_price: string | null
    position: number
    product_id: number
    created_at: string
    updated_at: string
  }>
  options: Array<{
    id: number
    product_id: number
    name: string
    position: number
    values: string[]
  }>
  images: Array<{
    id: number
    product_id: number
    position: number
    created_at: string
    updated_at: string
    alt: string | null
    width: number
    height: number
    src: string
    variant_ids: number[]
  }>
}

const COMPETITORS = {
  'home_coffee_solutions': 'https://homecoffeesolutions.com',
  'kitchen_barista': 'https://thekitchenbarista.com', 
  'cafe_liegeois': 'https://cafeliegeois.ca'
}

const COMPETITOR_COLLECTIONS = {
  'home_coffee_solutions': ['ecm', 'profitec', 'eureka'],
  'kitchen_barista': ['profitec'], // Collections that exist
  'cafe_liegeois': ['ecm', 'profitec', 'eureka']
}

const COMPETITOR_SEARCHES = {
  'kitchen_barista': ['ecm', 'eureka'] // Use search for brands without collections
}

const COMPETITOR_SOURCE_MAP = {
  'home-coffee-solutions': 'home_coffee_solutions',
  'kitchen-barista': 'kitchen_barista',
  'cafe-liegeois': 'cafe_liegeois'
}

async function storeProductInDB(product: ShopifyProduct, source: string) {
  try {
    const firstVariant = product.variants?.[0]
    const price = firstVariant ? parseFloat(firstVariant.price) : null
    const compareAtPrice = firstVariant?.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null
    
    // Extract features for future matching
    const features = {
      tags: product.tags || [],
      productType: product.product_type,
      options: product.options?.map((opt: any) => ({ name: opt.name, values: opt.values })) || []
    }
    
    // Smart vendor detection - extract brand from title if vendor is incorrect
    function extractBrandFromTitle(title: string, originalVendor: string): string {
      const title_lower = title.toLowerCase()
      const common_brands = [
        'eureka', 'ecm', 'profitec', 'rocket', 'breville', 'delonghi', 
        'gaggia', 'rancilio', 'lelit', 'bezzera', 'ascaso', 'mazzer', 
        'baratza', 'comandante', 'fellow', 'timemore', 'kinu'
      ]
      
      // Check if title starts with a known brand
      for (const brand of common_brands) {
        if (title_lower.startsWith(brand) || title_lower.includes(` ${brand} `) || title_lower.includes(`${brand} `)) {
          return brand.charAt(0).toUpperCase() + brand.slice(1)
        }
      }
      
      // Fallback to original vendor if it's reasonable
      if (originalVendor && originalVendor.toLowerCase() !== 'idrinkcoffee' && originalVendor.length > 1) {
        return originalVendor
      }
      
      // Extract first word as potential brand
      const firstWord = title.split(' ')[0]
      if (firstWord && firstWord.length > 2) {
        return firstWord
      }
      
      return originalVendor || 'Unknown'
    }
    
    const smartVendor = extractBrandFromTitle(product.title, product.vendor)
    
    // Generate embeddings if OpenAI API key is available
    let embeddings: { titleEmbedding: string; featuresEmbedding: string; extractedFeatures: string } | null = null
    
    // Generate embeddings if OpenAI API key is available (from settings or environment)
    try {
      // Check if OpenAI API key is available (either from settings or environment)
      const hasApiKey = process.env.OPENAI_API_KEY || require('fs').existsSync(require('path').join(process.cwd(), 'settings.json'))
      if (hasApiKey) {
        embeddings = await createProductEmbeddings({
          title: product.title,
          vendor: product.vendor,
          productType: product.product_type,
          price: price,
          features: JSON.stringify(features)
        })
        console.log(`✓ Generated embeddings for product: ${product.title}`)
      } else {
        console.log(`⚠️  Skipping embeddings for ${product.title} - no OpenAI API key configured`)
      }
    } catch (error: any) {
      console.error(`❌ Error generating embeddings for product ${product.id}:`, error.message || error)
      // Continue without embeddings
    }
    
    const dbProduct = await prisma.product.upsert({
      where: {
        externalId_source: {
          externalId: product.id.toString(),
          source: source
        }
      },
      update: {
        title: product.title,
        vendor: smartVendor,
        productType: product.product_type,
        handle: product.handle,
        price: price,
        compareAtPrice: compareAtPrice,
        available: product.available,
        imageUrl: product.images?.[0]?.src || null,
        url: `${COMPETITORS[source as keyof typeof COMPETITORS]}/products/${product.handle}`,
        features: (embeddings as any)?.extractedFeatures || JSON.stringify(features),
        titleEmbedding: embeddings?.titleEmbedding,
        featuresEmbedding: embeddings?.featuresEmbedding,
        lastScrapedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        externalId: product.id.toString(),
        source: source,
        title: product.title,
        vendor: smartVendor,
        productType: product.product_type,
        handle: product.handle,
        price: price,
        compareAtPrice: compareAtPrice,
        available: product.available,
        imageUrl: product.images?.[0]?.src || null,
        url: `${COMPETITORS[source as keyof typeof COMPETITORS]}/products/${product.handle}`,
        features: (embeddings as any)?.extractedFeatures || JSON.stringify(features),
        titleEmbedding: embeddings?.titleEmbedding,
        featuresEmbedding: embeddings?.featuresEmbedding,
        lastScrapedAt: new Date()
      }
    })
    
    // Store variants if they exist
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        await prisma.productVariant.upsert({
          where: {
            externalId_productId: {
              externalId: variant.id.toString(),
              productId: dbProduct.id
            }
          },
          update: {
            title: variant.title,
            sku: variant.sku,
            price: parseFloat(variant.price),
            compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            available: variant.available,
            inventoryQuantity: null, // Not available in public API
            updatedAt: new Date()
          },
          create: {
            externalId: variant.id.toString(),
            productId: dbProduct.id,
            title: variant.title,
            sku: variant.sku,
            price: parseFloat(variant.price),
            compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            available: variant.available,
            inventoryQuantity: null
          }
        })
      }
    }
    
    // Store price history if price changed
    if (price !== null) {
      const lastHistory = await prisma.priceHistory.findFirst({
        where: { productId: dbProduct.id },
        orderBy: { timestamp: 'desc' }
      })
      
      if (!lastHistory || lastHistory.price !== price) {
        await prisma.priceHistory.create({
          data: {
            productId: dbProduct.id,
            price: price,
            compareAtPrice: compareAtPrice,
            available: product.available,
            timestamp: new Date()
          }
        })
      }
    }
    
    return dbProduct
  } catch (error: any) {
    console.error('Error storing product in DB:', error.message || error)
    throw error
  }
}

async function scrapeShopifyCollection(baseUrl: string, collectionHandle: string) {
  const url = `${baseUrl}/collections/${collectionHandle}/products.json`
  console.log(`Attempting to scrape collection: ${url}`)
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PriceMonitor/1.0)'
      }
    })
    
    console.log(`Successfully scraped collection: ${url}, found ${response.data.products?.length || 0} products`)
    console.log(`Raw products from ${url}:`, JSON.stringify(response.data.products, null, 2))
    return response.data.products || []
  } catch (error: any) {
    console.error(`Error scraping collection ${url}:`)
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('  Status:', error.response.status)
      console.error('  Data:', error.response.data)
      console.error('  Headers:', error.response.headers)
    } else if (error.request) {
      // The request was made but no response was received
      console.error('  No response received:', error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('  Error message:', error.message)
    }
    return []
  }
}

async function scrapeShopifySearch(baseUrl: string, searchQuery: string) {
  const url = `${baseUrl}/search.json?q=${encodeURIComponent(searchQuery)}&options%5Bprefix%5D=last`
  console.log(`Attempting to search: ${url}`)
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PriceMonitor/1.0)'
      }
    })
    
    console.log(`Successfully searched: ${url}, found ${response.data.results?.length || 0} products`)
    console.log(`Raw products from ${url}:`, JSON.stringify(response.data.results, null, 2))
    return response.data.results || []
  } catch (error: any) {
    console.error(`Error searching ${url}:`)
    if (error.response) {
      console.error('  Status:', error.response.status)
      console.error('  Data:', error.response.data)
      console.error('  Headers:', error.response.headers)
    } else if (error.request) {
      console.error('  No response received:', error.request)
    } else {
      console.error('  Error message:', error.message)
    }
    return []
  }
}

async function scrapeShopifyProduct(baseUrl: string, handle: string) {
  try {
    const url = `${baseUrl}/products/${handle}.json`
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PriceMonitor/1.0)'
      }
    })
    
    return response.data.product
  } catch (error) {
    console.error(`Error scraping ${baseUrl}/products/${handle}:`, error)
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const competitor = searchParams.get('competitor') as keyof typeof COMPETITORS
    const collection = searchParams.get('collection') || 'espresso-machines'
    const productHandle = searchParams.get('product')
    
    if (!competitor || !COMPETITORS[competitor]) {
      return NextResponse.json(
        { error: 'Invalid competitor specified' },
        { status: 400 }
      )
    }

    const baseUrl = COMPETITORS[competitor]

    if (productHandle) {
      // Scrape individual product
      const product = await scrapeShopifyProduct(baseUrl, productHandle)
      if (product) {
        // Add price from first available variant
        const firstVariant = product.variants?.[0]
        const price = firstVariant ? parseFloat(firstVariant.price) : 0
        product.price = price
      }
      return NextResponse.json({ product })
    } else {
      // Scrape collection
      const products = await scrapeShopifyCollection(baseUrl, collection)
      
      // Filter for espresso machines and grinders and normalize price data
      const filteredProducts = products.filter((product: ShopifyProduct) => {
        const productType = product.product_type?.toLowerCase() || ''
        const title = product.title?.toLowerCase() || ''
        
        return productType.includes('espresso') || 
               productType.includes('grinder') ||
               title.includes('espresso') || 
               title.includes('grinder')
      }).map((product: ShopifyProduct) => {
        // Add price from first available variant
        const firstVariant = product.variants?.[0]
        const price = firstVariant ? parseFloat(firstVariant.price) : 0
        
        return {
          ...product,
          price: price
        }
      })

      return NextResponse.json({ 
        competitor,
        collection,
        products: filteredProducts,
        total: filteredProducts.length,
        scraped_at: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error in competitor scrape API:', error)
    return NextResponse.json(
      { error: 'Failed to scrape competitor data' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  console.log('POST /api/competitors/scrape received.')
  try {
    const body = await request.json()
    console.log('Request body:', body)
    const { competitors = Object.keys(COMPETITORS) } = body
    
    const results = []
    
    for (const competitorKey of competitors) {
      console.log(`Processing competitor key from frontend: ${competitorKey}`)
      const competitorSource = COMPETITOR_SOURCE_MAP[competitorKey as keyof typeof COMPETITOR_SOURCE_MAP]
      
      if (!competitorSource || !COMPETITORS[competitorSource as keyof typeof COMPETITORS]) {
        console.warn(`Skipping unknown or unmapped competitor: ${competitorKey} (mapped to ${competitorSource})`)
        continue
      }
      
      console.log(`Mapped ${competitorKey} to internal source: ${competitorSource}`)
      
      // Delete existing products for this competitor to ensure fresh data
      console.log(`Deleting existing products for ${competitorSource}...`)
      const deletedCount = await prisma.product.deleteMany({
        where: { source: competitorSource }
      })
      console.log(`Deleted ${deletedCount.count} existing products for ${competitorSource}`)

      // Create scrape job
      const scrapeJob = await prisma.scrapeJob.create({
        data: {
          source: competitorSource,
          status: 'running',
          startedAt: new Date()
        }
      })
      
      let totalFound = 0
      let totalCreated = 0
      let totalUpdated = 0
      const errors: string[] = []
      
      try {
        const baseUrl = COMPETITORS[competitorSource as keyof typeof COMPETITORS]
        const collections = COMPETITOR_COLLECTIONS[competitorSource as keyof typeof COMPETITOR_COLLECTIONS] || []
        const searches = COMPETITOR_SEARCHES[competitorSource as keyof typeof COMPETITOR_SEARCHES] || []
        
        console.log(`Base URL: ${baseUrl}`)
        console.log(`Collections to scrape:`, collections)
        console.log(`Searches to scrape:`, searches)

        // Scrape collections
        if (collections.length > 0) {
          console.log(`Starting collection scraping for ${competitorKey}`)
          for (const collection of collections) {
            console.log(`Scraping ${competitorKey} - collection: ${collection}`)
            try {
              const products = await scrapeShopifyCollection(baseUrl, collection)
              
              const filteredProducts = products.filter((product: ShopifyProduct) => {
                const productType = product.product_type?.toLowerCase() || ''
                const title = product.title?.toLowerCase() || ''
                
                return productType.includes('espresso') || 
                       productType.includes('grinder') ||
                       title.includes('espresso') || 
                       title.includes('grinder')
              })
              
              totalFound += filteredProducts.length
              console.log(`Filtered ${filteredProducts.length} products from collection ${collection}`)
              
              // Store products in database
              for (const product of filteredProducts) {
                try {
                  const existingProduct = await prisma.product.findUnique({
                    where: {
                      externalId_source: {
                        externalId: product.id.toString(),
                        source: competitorSource
                      }
                    }
                  })
                  
                  await storeProductInDB(product, competitorSource)
                  
                  if (existingProduct) {
                    totalUpdated++
                  } else {
                    totalCreated++
                  }
                } catch (productError) {
                  errors.push(`Error storing product ${product.id}: ${productError}`)
                  console.error(`Error storing product ${product.id}:`, productError)
                }
              }
              
              results.push({
                competitor: competitorKey,
                collection,
                products: filteredProducts.length,
                total: filteredProducts.length,
                scraped_at: new Date().toISOString()
              })
              
            } catch (collectionError) {
              errors.push(`Error scraping collection ${collection}: ${collectionError}`)
              console.error(`Error scraping collection ${collection}:`, collectionError)
            }
            
            // Add delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
        
        // Scrape searches
        if (searches.length > 0) {
          console.log(`Starting search scraping for ${competitorKey}`)
          for (const searchTerm of searches) {
            console.log(`Searching ${competitorKey} - search: ${searchTerm}`)
            try {
              const products = await scrapeShopifySearch(baseUrl, searchTerm)
              
              const filteredProducts = products.filter((product: ShopifyProduct) => {
                const productType = product.product_type?.toLowerCase() || ''
                const title = product.title?.toLowerCase() || ''
                
                return productType.includes('espresso') || 
                       productType.includes('grinder') ||
                       title.includes('espresso') || 
                       title.includes('grinder')
              })
              
              totalFound += filteredProducts.length
              console.log(`Filtered ${filteredProducts.length} products from search ${searchTerm}`)
              
              // Store products in database
              for (const product of filteredProducts) {
                try {
                  const existingProduct = await prisma.product.findUnique({
                    where: {
                      externalId_source: {
                        externalId: product.id.toString(),
                        source: competitorSource
                      }
                    }
                  })
                  
                  await storeProductInDB(product, competitorSource)
                  
                  if (existingProduct) {
                    totalUpdated++
                  } else {
                    totalCreated++
                  }
                } catch (productError) {
                  errors.push(`Error storing product ${product.id}: ${productError}`)
                  console.error(`Error storing product ${product.id}:`, productError)
                }
              }
              
              results.push({
                competitor: competitorKey,
                collection: `search-${searchTerm}`,
                products: filteredProducts.length,
                total: filteredProducts.length,
                scraped_at: new Date().toISOString()
              })
              
            } catch (searchError) {
              errors.push(`Error searching for ${searchTerm}: ${searchError}`)
              console.error(`Error searching for ${searchTerm}:`, searchError)
            }
            
            // Add delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
        
        // Update scrape job with success
        await prisma.scrapeJob.update({
          where: { id: scrapeJob.id },
          data: {
            status: 'completed',
            productsFound: totalFound,
            productsCreated: totalCreated,
            productsUpdated: totalUpdated,
            errors: errors.length > 0 ? JSON.stringify(errors) : null,
            completedAt: new Date()
          }
        })
        
      } catch (competitorError) {
        // Update scrape job with failure
        await prisma.scrapeJob.update({
          where: { id: scrapeJob.id },
          data: {
            status: 'failed',
            productsFound: totalFound,
            productsCreated: totalCreated,
            productsUpdated: totalUpdated,
            errors: JSON.stringify([...errors, competitorError]),
            completedAt: new Date()
          }
        })
        console.error(`Critical error during scraping for a competitor:`, competitorError)
        throw competitorError
      }
    }
    
    return NextResponse.json({ 
      results,
      total_scraped: results.reduce((sum, r) => sum + r.total, 0),
      message: 'Data stored in database successfully'
    })
  } catch (error: any) {
    console.error('Error in bulk competitor scrape:', error)
    return NextResponse.json(
      { error: 'Failed to bulk scrape competitor data', details: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}