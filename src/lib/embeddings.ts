import OpenAI from 'openai'
import { prisma } from './db'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Feature extraction for coffee equipment
export function extractProductFeatures(product: {
  title: string
  vendor?: string | null
  productType?: string | null
  price?: number | null
  description?: string | null
  features?: string | null
}): string {
  const features: string[] = []
  
  const title = product.title.toLowerCase()
  const vendor = product.vendor?.toLowerCase() || ''
  const productType = product.productType?.toLowerCase() || ''
  const description = product.description?.toLowerCase() || ''
  
  // Brand/Vendor
  if (vendor) {
    features.push(`brand: ${vendor}`)
  }
  
  // Product Type
  if (productType.includes('espresso') || title.includes('espresso')) {
    features.push('category: espresso machine')
  }
  if (productType.includes('grinder') || title.includes('grinder')) {
    features.push('category: coffee grinder')
  }
  
  // Espresso Machine Features
  if (title.includes('dual boiler') || description.includes('dual boiler')) {
    features.push('boiler: dual boiler')
  } else if (title.includes('single boiler') || description.includes('single boiler')) {
    features.push('boiler: single boiler')
  } else if (title.includes('heat exchanger') || description.includes('heat exchanger')) {
    features.push('boiler: heat exchanger')
  }
  
  if (title.includes('pid') || description.includes('pid')) {
    features.push('control: pid temperature control')
  }
  
  if (title.includes('e61') || description.includes('e61')) {
    features.push('group: e61 group head')
  }
  
  if (title.includes('profiling') || description.includes('profiling')) {
    features.push('feature: pressure profiling')
  }
  
  // Grinder Features
  if (title.includes('burr') || description.includes('burr')) {
    features.push('type: burr grinder')
  }
  if (title.includes('conical') || description.includes('conical')) {
    features.push('burr: conical burr')
  }
  if (title.includes('flat') || description.includes('flat')) {
    features.push('burr: flat burr')
  }
  
  if (title.includes('stepless') || description.includes('stepless')) {
    features.push('adjustment: stepless')
  }
  if (title.includes('stepped') || description.includes('stepped')) {
    features.push('adjustment: stepped')
  }
  
  // Size indicators
  if (title.includes('compact') || title.includes('mini')) {
    features.push('size: compact')
  }
  if (title.includes('commercial') || title.includes('pro')) {
    features.push('size: commercial grade')
  }
  
  // Materials
  if (title.includes('stainless steel') || description.includes('stainless steel')) {
    features.push('material: stainless steel')
  }
  if (title.includes('brass') || description.includes('brass')) {
    features.push('material: brass')
  }
  
  // Capacity
  const waterTankMatch = title.match(/(\d+\.?\d*)\s*(?:l|liter|litre)/i)
  if (waterTankMatch) {
    features.push(`water tank: ${waterTankMatch[1]}L`)
  }
  
  const beanHopperMatch = title.match(/(\d+)\s*(?:g|gram|kg|pound|lb)\s*(?:bean|hopper)/i)
  if (beanHopperMatch) {
    features.push(`bean hopper: ${beanHopperMatch[1]}g`)
  }
  
  // Price range
  if (product.price) {
    if (product.price < 500) {
      features.push('price range: entry level')
    } else if (product.price < 1500) {
      features.push('price range: mid range')
    } else if (product.price < 3000) {
      features.push('price range: premium')
    } else {
      features.push('price range: luxury')
    }
  }
  
  // Model numbers and specific identifiers
  const modelMatch = title.match(/\b([A-Z]{2,}[-\s]?\d{2,}[A-Z]*)\b/i)
  if (modelMatch) {
    features.push(`model: ${modelMatch[1].toLowerCase()}`)
  }
  
  return features.join(', ')
}

// Create embeddings for product text
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit text length
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error creating embedding:', error)
    throw error
  }
}

// Create embeddings for a product
export async function createProductEmbeddings(product: {
  title: string
  vendor?: string | null
  productType?: string | null
  price?: number | null
  description?: string | null
  features?: string | null
}) {
  // Create title embedding
  const titleText = `${product.vendor || ''} ${product.title}`.trim()
  const titleEmbedding = await createEmbedding(titleText)
  
  // Create features embedding
  const extractedFeatures = extractProductFeatures(product)
  const featuresText = `${product.productType || ''} ${extractedFeatures}`.trim()
  const featuresEmbedding = await createEmbedding(featuresText)
  
  return {
    titleEmbedding: JSON.stringify(titleEmbedding),
    featuresEmbedding: JSON.stringify(featuresEmbedding),
    extractedFeatures
  }
}

// Calculate cosine similarity between two embedding vectors
export function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length')
  }
  
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    norm1 += embedding1[i] * embedding1[i]
    norm2 += embedding2[i] * embedding2[i]
  }
  
  const magnitude1 = Math.sqrt(norm1)
  const magnitude2 = Math.sqrt(norm2)
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0
  }
  
  return dotProduct / (magnitude1 * magnitude2)
}

// Find similar products using embeddings
export async function findSimilarProducts(
  targetEmbedding: number[],
  sourceProducts: Array<{
    id: string
    titleEmbedding?: string | null
    featuresEmbedding?: string | null
  }>,
  useFeatures = false,
  threshold = 0.7
): Promise<Array<{ id: string; similarity: number }>> {
  const similarities: Array<{ id: string; similarity: number }> = []
  
  for (const product of sourceProducts) {
    try {
      const embeddingField = useFeatures ? product.featuresEmbedding : product.titleEmbedding
      if (!embeddingField) continue
      
      const productEmbedding = JSON.parse(embeddingField) as number[]
      const similarity = calculateCosineSimilarity(targetEmbedding, productEmbedding)
      
      if (similarity >= threshold) {
        similarities.push({ id: product.id, similarity })
      }
    } catch (error) {
      console.error(`Error processing embedding for product ${product.id}:`, error)
    }
  }
  
  return similarities.sort((a, b) => b.similarity - a.similarity)
}

// Update product with embeddings
export async function updateProductEmbeddings(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })
    
    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }
    
    const embeddings = await createProductEmbeddings({
      title: product.title,
      vendor: product.vendor,
      productType: product.productType,
      price: product.price,
      description: product.description,
      features: product.features
    })
    
    await prisma.product.update({
      where: { id: productId },
      data: {
        titleEmbedding: embeddings.titleEmbedding,
        featuresEmbedding: embeddings.featuresEmbedding,
        features: embeddings.extractedFeatures
      }
    })
    
    return embeddings
  } catch (error) {
    console.error(`Error updating embeddings for product ${productId}:`, error)
    throw error
  }
}

// Batch update embeddings for multiple products
export async function batchUpdateEmbeddings(
  productIds: string[],
  batchSize = 10,
  delayMs = 100
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] }
  
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize)
    
    for (const productId of batch) {
      try {
        await updateProductEmbeddings(productId)
        results.success++
        console.log(`✓ Updated embeddings for product ${productId} (${results.success}/${productIds.length})`)
      } catch (error) {
        results.failed++
        const errorMsg = `Failed to update embeddings for product ${productId}: ${error}`
        results.errors.push(errorMsg)
        console.error(errorMsg)
      }
      
      // Add delay to respect rate limits
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  
  return results
}