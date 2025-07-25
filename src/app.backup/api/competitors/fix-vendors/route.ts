import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dry_run') === 'true'
    
    // Get all products with incorrect vendors
    const products = await prisma.product.findMany({
      where: {
        source: { not: 'idc' }
      }
    })
    
    const updates = []
    let updateCount = 0
    
    for (const product of products) {
      const correctVendor = extractBrandFromTitle(product.title, product.vendor || '')
      
      if (correctVendor !== product.vendor) {
        updates.push({
          id: product.id,
          title: product.title,
          oldVendor: product.vendor,
          newVendor: correctVendor
        })
        
        if (!dryRun) {
          await prisma.product.update({
            where: { id: product.id },
            data: { vendor: correctVendor }
          })
          updateCount++
        }
      }
    }
    
    return NextResponse.json({
      message: dryRun 
        ? `Dry run: Found ${updates.length} products that need vendor fixes` 
        : `Updated vendors for ${updateCount} products`,
      total_products: products.length,
      updates_needed: updates.length,
      updates_applied: dryRun ? 0 : updateCount,
      changes: updates.slice(0, 20), // Show first 20 changes
      dry_run: dryRun
    })
    
  } catch (error) {
    console.error('Error fixing vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fix vendors' },
      { status: 500 }
    )
  }
}