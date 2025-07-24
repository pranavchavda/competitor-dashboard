'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/heading'
import { Select } from '@/components/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { useState, useEffect } from 'react'

interface CompetitorProduct {
  id: string
  title: string
  vendor: string
  price: number
  source: string
  productType?: string
  sku?: string
  url?: string
  createdAt?: string
}

interface IDCProduct {
  objectID: string
  title: string
  vendor: string
  product_type: string
  price: string
  handle: string
  sku?: string
  brand?: string
}

interface ComparisonData {
  idc_products: IDCProduct[]
  competitor_products: CompetitorProduct[]
  competitor_breakdown: Array<{
    source: string
    _count: { id: number }
  }>
  counts: {
    idc_products: number
    competitor_products: number
    matches: number
  }
}

export default function ComparisonItemsPage() {
  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'idc' | 'competitors'>('overview')
  const [filters, setFilters] = useState({
    source: 'all',
    brand: 'all'
  })

  const loadComparisonData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get stored competitor products from database
      const dbResponse = await fetch('/api/debug/products')
      if (!dbResponse.ok) throw new Error('Failed to load stored data')
      const dbData = await dbResponse.json()

      // Get IDC products from Algolia
      let idcProducts: IDCProduct[] = []
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
        })

        if (algoliaResponse.ok) {
          const algoliaData = await algoliaResponse.json()
          idcProducts = algoliaData.hits || []
        }
      } catch (algoliaError) {
        console.error('Error fetching IDC products:', algoliaError)
      }

      setData({
        idc_products: idcProducts,
        competitor_products: dbData.sample_competitor_products || [],
        competitor_breakdown: dbData.competitor_breakdown || [],
        counts: {
          idc_products: idcProducts.length,
          competitor_products: dbData.counts.competitor_products,
          matches: dbData.counts.matches
        }
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error loading comparison data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComparisonData()
  }, [])

  const getUniqueValues = (items: any[], field: string) => {
    const values = items.map((item: any) => item[field]).filter(Boolean)
    return [...new Set(values)].sort()
  }

  const filteredCompetitorProducts = data?.competitor_products.filter(product => {
    if (filters.source !== 'all' && product.source !== filters.source) return false
    if (filters.brand !== 'all' && product.vendor?.toLowerCase() !== filters.brand.toLowerCase()) return false
    return true
  }) || []

  const getSourceDisplayName = (source: string) => {
    switch (source) {
      case 'home_coffee_solutions': return 'Home Coffee Solutions'
      case 'kitchen_barista': return 'The Kitchen Barista'
      case 'cafe_liegeois': return 'Cafe Liegeois'
      default: return source
    }
  }

  const getBrandColor = (brand: string) => {
    const brandLower = brand.toLowerCase()
    if (['ecm', 'profitec', 'eureka'].includes(brandLower)) return 'emerald'
    if (['rocket', 'bezzera', 'rancilio'].includes(brandLower)) return 'blue'
    return 'zinc'
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Heading>Product Comparison Items</Heading>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Review available products for MAP enforcement monitoring
          </p>
        </div>
        <Button onClick={loadComparisonData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Overview Stats */}
      {data && (
        <div className="mt-8 grid gap-6 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <div className="text-2xl font-semibold text-blue-600">{data.counts.idc_products}</div>
            <div className="text-sm text-zinc-500">iDrinkCoffee Products</div>
            <div className="text-xs text-zinc-400 mt-1">Available for comparison</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <div className="text-2xl font-semibold text-purple-600">{data.counts.competitor_products}</div>
            <div className="text-sm text-zinc-500">Competitor Products</div>
            <div className="text-xs text-zinc-400 mt-1">Being monitored</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <div className="text-2xl font-semibold text-green-600">{data.counts.matches}</div>
            <div className="text-sm text-zinc-500">Active Matches</div>
            <div className="text-xs text-zinc-400 mt-1">Products paired for comparison</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <div className="text-2xl font-semibold text-orange-600">{data.competitor_breakdown.length}</div>
            <div className="text-sm text-zinc-500">Competitor Sources</div>
            <div className="text-xs text-zinc-400 mt-1">Active monitoring sources</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mt-8 border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'idc', label: `iDrinkCoffee (${data?.counts.idc_products || 0})` },
            { id: 'competitors', label: `Competitors (${data?.counts.competitor_products || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && data && (
        <div className="mt-6">
          <Subheading>Competitor Breakdown</Subheading>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.competitor_breakdown.map((competitor) => (
              <div key={competitor.source} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{getSourceDisplayName(competitor.source)}</div>
                    <div className="text-sm text-zinc-500">{competitor._count.id} products</div>
                  </div>
                  <Badge color="blue">{competitor.source}</Badge>
                </div>
              </div>
            ))}
          </div>

          {data.counts.idc_products === 0 && (
            <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    No IDC Products Available
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      No iDrinkCoffee products are currently loaded for comparison. This prevents product matching and MAP violation detection.
                      The system will attempt to fetch products from Algolia when generating matches.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IDC Products Tab */}
      {activeTab === 'idc' && (
        <div className="mt-6">
          {data?.idc_products && data.idc_products.length > 0 ? (
            <>
              <Subheading>iDrinkCoffee Products Available for Comparison</Subheading>
              <Table className="mt-4">
                <TableHead>
                  <TableRow>
                    <TableHeader>Product</TableHeader>
                    <TableHeader>Brand</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Price</TableHeader>
                    <TableHeader>SKU</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.idc_products.slice(0, 50).map((product) => (
                    <TableRow key={product.objectID}>
                      <TableCell className="font-medium">
                        <div className="font-medium">{product.title}</div>
                        <div className="text-sm text-zinc-500">{product.handle}</div>
                      </TableCell>
                      <TableCell>
                        <Badge color={getBrandColor(product.vendor)}>
                          {product.vendor}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-600">{product.product_type}</span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${parseFloat(product.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {product.sku || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.idc_products.length > 50 && (
                <p className="mt-4 text-sm text-zinc-500">
                  Showing first 50 of {data.idc_products.length} products
                </p>
              )}
            </>
          ) : (
            <div className="mt-8 text-center py-12">
              <div className="text-zinc-500">
                <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m6-6v4m4-2v6" />
                </svg>
                <p className="mt-4">No iDrinkCoffee products loaded</p>
                <p className="text-sm">Products will be fetched from Algolia when generating matches</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Competitor Products Tab */}
      {activeTab === 'competitors' && (
        <div className="mt-6">
          <div className="flex gap-4 items-center mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Source:</label>
              <Select
                value={filters.source}
                onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
              >
                <option value="all">All Sources</option>
                <option value="home_coffee_solutions">Home Coffee Solutions</option>
                <option value="kitchen_barista">The Kitchen Barista</option>
                <option value="cafe_liegeois">Cafe Liegeois</option>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Brand:</label>
              <Select
                value={filters.brand}
                onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
              >
                <option value="all">All Brands</option>
                {getUniqueValues(data?.competitor_products || [], 'vendor').map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </Select>
            </div>
          </div>

          {filteredCompetitorProducts.length > 0 ? (
            <>
              <Subheading>Competitor Products Being Monitored</Subheading>
              <Table className="mt-4">
                <TableHead>
                  <TableRow>
                    <TableHeader>Product</TableHeader>
                    <TableHeader>Brand</TableHeader>
                    <TableHeader>Source</TableHeader>
                    <TableHeader>Price</TableHeader>
                    <TableHeader>Added</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCompetitorProducts.slice(0, 50).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div className="font-medium">{product.title}</div>
                        {product.sku && <div className="text-sm text-zinc-500">SKU: {product.sku}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge color={getBrandColor(product.vendor)}>
                          {product.vendor}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge color="blue">
                          {getSourceDisplayName(product.source)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${product.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredCompetitorProducts.length > 50 && (
                <p className="mt-4 text-sm text-zinc-500">
                  Showing first 50 of {filteredCompetitorProducts.length} filtered products
                </p>
              )}
            </>
          ) : (
            <div className="mt-8 text-center py-12">
              <div className="text-zinc-500">
                <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="mt-4">No products found</p>
                <p className="text-sm">Try adjusting your filters or refresh the data</p>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-8 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-zinc-500">Loading comparison data...</p>
        </div>
      )}
    </>
  )
}