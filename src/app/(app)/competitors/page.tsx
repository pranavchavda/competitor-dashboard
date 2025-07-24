'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { useState, useEffect } from 'react'

interface CompetitorProduct {
  id: string
  external_id: string
  title: string
  vendor: string
  product_type: string
  handle: string
  sku: string
  price: number
  compare_at_price: number
  available: boolean
  image_url: string
  url: string
  source: string
  source_name: string
  last_scraped_at: string
  created_at: string
  updated_at: string
  variants_count: number
  lowest_variant_price: number
  price_change: number | null
  price_change_percent: number | null
}

interface CompetitorProductsResponse {
  products: CompetitorProduct[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  summary: Array<{
    source: string
    source_name: string
    product_count: number
    avg_price: number
  }>
  filters: {
    source: string | null
    search: string | null
    vendor: string | null
  }
  generated_at: string
}

interface ScrapeResult {
  results: Array<{
    competitor: string
    collection: string
    products: number
    total: number
    scraped_at: string
  }>
  total_scraped: number
  message: string
}

export default function CompetitorsPage() {
  const [productsData, setProductsData] = useState<CompetitorProductsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const competitors = [
    { key: 'home_coffee_solutions', name: 'Home Coffee Solutions', domain: 'homecoffeesolutions.com' },
    { key: 'kitchen_barista', name: 'The Kitchen Barista', domain: 'thekitchenbarista.com' },
    { key: 'cafe_liegeois', name: 'Cafe Liegeois', domain: 'cafeliegeois.ca' }
  ]

  const competitorKeyMap = {
    'home_coffee_solutions': 'home-coffee-solutions',
    'kitchen_barista': 'kitchen-barista',
    'cafe_liegeois': 'cafe-liegeois'
  }

  // Load stored products from database
  const loadStoredProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        source: selectedSource,
        page: currentPage.toString(),
        limit: '50'
      })

      const response = await fetch(`/api/competitors/products?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load stored products')
      }
      
      const data: CompetitorProductsResponse = await response.json()
      setProductsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error loading stored products:', err)
    } finally {
      setLoading(false)
    }
  }

  const scrapeCompetitorData = async (competitor?: string) => {
    try {
      setScraping(true)
      setError(null)

      const url = '/api/competitors/scrape'
      
      if (competitor) {
        // Single competitor scrape (not implemented in new API, using bulk)
        const competitorApiKey = competitorKeyMap[competitor as keyof typeof competitorKeyMap]
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competitors: [competitorApiKey]
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to scrape ${competitor}`)
        }

        const data: ScrapeResult = await response.json()
        console.log('Scrape result:', data)
      } else {
        // Bulk scrape all competitors
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competitors: Object.values(competitorKeyMap)
          })
        })

        if (!response.ok) {
          throw new Error('Failed to scrape competitor data')
        }

        const data: ScrapeResult = await response.json()
        console.log('Bulk scrape result:', data)
      }
      
      // Reload stored products after successful scrape
      await loadStoredProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error scraping competitor data:', err)
    } finally {
      setScraping(false)
    }
  }

  // Load data on component mount and when filters change
  useEffect(() => {
    loadStoredProducts()
  }, [selectedSource, currentPage])

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Heading>Competitors</Heading>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Monitor and analyze competitor product pricing
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value)
              setCurrentPage(1)
            }}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="all">All Competitors</option>
            {competitors.map((comp) => (
              <option key={comp.key} value={comp.key}>
                {comp.name}
              </option>
            ))}
          </select>
          <Button 
            onClick={() => scrapeCompetitorData()} 
            disabled={scraping}
          >
            {scraping ? 'Scraping...' : 'Scrape All'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {productsData?.summary && (
        <div className="mt-8 grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          {competitors.map((competitor) => {
            const summaryData = productsData.summary.find(s => s.source === competitor.key)
            const productCount = summaryData?.product_count || 0
            const avgPrice = summaryData?.avg_price || 0
            
            return (
              <div key={competitor.key} className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{competitor.name}</h3>
                    <p className="text-sm text-zinc-500">{competitor.domain}</p>
                  </div>
                  <Badge color={productCount > 0 ? 'emerald' : 'zinc'}>
                    {productCount > 0 ? 'Active' : 'No Data'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-semibold">{productCount}</p>
                    <p className="text-sm text-zinc-500">Products</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">${avgPrice.toFixed(0)}</p>
                    <p className="text-sm text-zinc-500">Avg Price</p>
                  </div>
                </div>
                
                <Button 
                  outline
                  className="w-full"
                  onClick={() => scrapeCompetitorData(competitor.key)}
                  disabled={scraping}
                >
                  {scraping ? 'Scraping...' : 'Scrape Now'}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Products Table */}
      {productsData && productsData.products.length > 0 && (
        <>
          <div className="mt-8 flex items-center justify-between">
            <Subheading>
              Stored Products ({productsData.pagination.total} total)
              {selectedSource !== 'all' && (
                <span className="text-sm font-normal text-zinc-500 ml-2">
                  - {competitors.find(c => c.key === selectedSource)?.name}
                </span>
              )}
            </Subheading>
            {productsData.generated_at && (
              <p className="text-sm text-zinc-500">
                Last updated: {new Date(productsData.generated_at).toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="mt-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Product</TableHeader>
                  <TableHeader>Source</TableHeader>
                  <TableHeader>Vendor</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Price</TableHeader>
                  <TableHeader>Change</TableHeader>
                  <TableHeader>Available</TableHeader>
                  <TableHeader>Last Updated</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsData.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{product.title}</div>
                        {product.sku && (
                          <div className="text-sm text-zinc-500">SKU: {product.sku}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.source_name}</TableCell>
                    <TableCell>{product.vendor}</TableCell>
                    <TableCell>{product.product_type}</TableCell>
                    <TableCell>
                      <div>
                        <div>${product.price?.toFixed(2) || 'N/A'}</div>
                        {product.compare_at_price && product.compare_at_price > (product.price || 0) && (
                          <div className="text-sm text-zinc-500 line-through">
                            ${product.compare_at_price.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.price_change !== null && product.price_change_percent !== null ? (
                        <Badge color={product.price_change > 0 ? 'red' : product.price_change < 0 ? 'emerald' : 'zinc'}>
                          {product.price_change > 0 ? '+' : ''}${product.price_change.toFixed(2)} 
                          ({product.price_change_percent > 0 ? '+' : ''}{product.price_change_percent.toFixed(1)}%)
                        </Badge>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge color={product.available ? 'emerald' : 'red'}>
                        {product.available ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {new Date(product.last_scraped_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {productsData.pagination.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-zinc-500">
                  Showing {((productsData.pagination.page - 1) * productsData.pagination.limit) + 1} to{' '}
                  {Math.min(productsData.pagination.page * productsData.pagination.limit, productsData.pagination.total)} of{' '}
                  {productsData.pagination.total} products
                </p>
                <div className="flex gap-2">
                  <Button
                    outline
                    disabled={!productsData.pagination.has_prev}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    outline
                    disabled={!productsData.pagination.has_next}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-zinc-500">Loading stored products...</p>
        </div>
      )}

      {scraping && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-zinc-500">Scraping competitor data...</p>
        </div>
      )}

      {!loading && !productsData?.products?.length && (
        <div className="mt-8 text-center">
          <p className="text-zinc-500">No products found. Try running a scrape to collect data.</p>
        </div>
      )}
    </>
  )
}