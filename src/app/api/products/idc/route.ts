import { NextResponse } from 'next/server'

interface AlgoliaProduct {
  objectID: string
  title: string
  handle: string
  vendor: string
  product_type: string
  price: number
  compare_at_price?: number
  available: boolean
  inventory_quantity: number
  tags: string[]
  variants: Array<{
    id: number
    title: string
    price: number
    compare_at_price?: number
    available: boolean
    inventory_quantity: number
    sku?: string
  }>
}

interface AlgoliaResponse {
  hits: AlgoliaProduct[]
  nbHits: number
  page: number
  nbPages: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '0')
    const filters = searchParams.get('filters') || ''
    
    // Build Algolia query params
    const params = new URLSearchParams({
      query: query,
      page: page.toString(),
      hitsPerPage: '50',
      filters: filters
    })

    const response = await fetch(`https://M71W3IRVX3-dsn.algolia.net/1/indexes/idc_products/query`, {
      headers: {
        "X-Algolia-API-Key": "f4080b5c70ce601c85706444675a8a04",
        "X-Algolia-Application-Id": "M71W3IRVX3",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        params: params.toString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Algolia API error: ${response.status}`)
    }

    const data: AlgoliaResponse = await response.json()
    
    // Filter for active products and espresso machines/grinders
    const filteredProducts = data.hits.filter(product => {
      const productType = product.product_type?.toLowerCase() || ''
      const title = product.title?.toLowerCase() || ''
      
      return product.available && 
             (productType.includes('espresso') || 
              productType.includes('grinder') ||
              title.includes('espresso') || 
              title.includes('grinder'))
    })

    return NextResponse.json({
      products: filteredProducts,
      total: data.nbHits,
      page: data.page,
      totalPages: data.nbPages
    })
  } catch (error) {
    console.error('Error fetching iDrinkCoffee products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}