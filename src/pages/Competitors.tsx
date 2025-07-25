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

export default function Competitors() {
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
        // Single competitor scrape
        const competitorApiKey = competitorKeyMap[competitor as keyof typeof competitorKeyMap]
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competitors: [competitorApiKey]
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to scrape ${competitor}`)
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
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to scrape competitor data')
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
          <h1 className="text-3xl font-bold text-gray-900">Competitors</h1>
          <p className="mt-2 text-gray-600">
            Monitor and analyze competitor product pricing
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value)
              setCurrentPage(1)
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Competitors</option>
            {competitors.map((comp) => (
              <option key={comp.key} value={comp.key}>
                {comp.name}
              </option>
            ))}
          </select>
          <button 
            onClick={() => scrapeCompetitorData()} 
            disabled={scraping}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {scraping ? 'Scraping...' : 'Scrape All'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
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
              <div key={competitor.key} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{competitor.name}</h3>
                    <p className="text-sm text-gray-500">{competitor.domain}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    productCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {productCount > 0 ? 'Active' : 'No Data'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">{productCount}</p>
                    <p className="text-sm text-gray-500">Products</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">${avgPrice.toFixed(0)}</p>
                    <p className="text-sm text-gray-500">Avg Price</p>
                  </div>
                </div>
                
                <button 
                  className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => scrapeCompetitorData(competitor.key)}
                  disabled={scraping}
                >
                  {scraping ? 'Scraping...' : 'Scrape Now'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Products Table */}
      {productsData && productsData.products.length > 0 && (
        <>
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Stored Products ({productsData.pagination.total} total)
              {selectedSource !== 'all' && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - {competitors.find(c => c.key === selectedSource)?.name}
                </span>
              )}
            </h2>
            {productsData.generated_at && (
              <p className="text-sm text-gray-500">
                Last updated: {new Date(productsData.generated_at).toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="mt-4 bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productsData.products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.title}</div>
                        {product.sku && (
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.source_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.vendor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.product_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">${product.price?.toFixed(2) || 'N/A'}</div>
                        {product.compare_at_price && product.compare_at_price > (product.price || 0) && (
                          <div className="text-sm text-gray-500 line-through">
                            ${product.compare_at_price.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.price_change !== null && product.price_change_percent !== null ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.price_change > 0 ? 'bg-red-100 text-red-800' : 
                          product.price_change < 0 ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.price_change > 0 ? '+' : ''}${product.price_change.toFixed(2)} 
                          ({product.price_change_percent > 0 ? '+' : ''}{product.price_change_percent.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.available ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.last_scraped_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {productsData.pagination.total_pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    disabled={!productsData.pagination.has_prev}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!productsData.pagination.has_next}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {((productsData.pagination.page - 1) * productsData.pagination.limit) + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(productsData.pagination.page * productsData.pagination.limit, productsData.pagination.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{productsData.pagination.total}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        disabled={!productsData.pagination.has_prev}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Previous
                      </button>
                      <button
                        disabled={!productsData.pagination.has_next}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading stored products...</p>
        </div>
      )}

      {scraping && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Scraping competitor data...</p>
        </div>
      )}

      {!loading && !productsData?.products?.length && (
        <div className="mt-8 text-center bg-white border border-gray-200 rounded-lg p-12">
          <p className="text-gray-500">No products found. Try running a scrape to collect data.</p>
        </div>
      )}
    </>
  )
}