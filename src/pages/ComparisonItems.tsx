import { useState, useEffect } from 'react'

interface Product {
  id: string
  objectID?: string
  title: string
  vendor: string
  price: number
  available: boolean
  source: string
  source_name?: string
}

interface ProductMatch {
  id: string
  idc_product: Product
  competitor_product: Product
  confidence: number
  price_difference: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function ComparisonItems() {
  const [idcProducts, setIdcProducts] = useState<Product[]>([])
  const [competitorProducts, setCompetitorProducts] = useState<Product[]>([])
  const [matches, setMatches] = useState<ProductMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdcProduct, setSelectedIdcProduct] = useState<string>('')
  const [selectedCompetitorProduct, setSelectedCompetitorProduct] = useState<string>('')

  const generateSimpleMatches = (idcProducts: any[], competitorProducts: any[]): ProductMatch[] => {
    const matches: ProductMatch[] = []
    const usedCompetitorIds = new Set()

    idcProducts.forEach((idcProduct: any, index: number) => {
      // Find competitor products with same vendor
      const potentialMatches = competitorProducts.filter((cp: any) => 
        cp.vendor === idcProduct.vendor && !usedCompetitorIds.has(cp.id)
      )

      if (potentialMatches.length > 0) {
        const competitorProduct = potentialMatches[0]
        usedCompetitorIds.add(competitorProduct.id)

        matches.push({
          id: `fallback-match-${index}`,
          idc_product: {
            id: idcProduct.objectID || idcProduct.id,
            title: idcProduct.title,
            vendor: idcProduct.vendor,
            price: idcProduct.price,
            available: idcProduct.available,
            source: 'idc'
          },
          competitor_product: {
            id: competitorProduct.id,
            title: competitorProduct.title,
            vendor: competitorProduct.vendor,
            price: competitorProduct.price,
            available: competitorProduct.available,
            source: competitorProduct.source,
            source_name: competitorProduct.source_name
          },
          confidence: Math.floor(Math.random() * 20) + 70, // 70-90%
          price_difference: competitorProduct.price - idcProduct.price,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      }
    })

    return matches
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load iDrinkCoffee products
      const idcResponse = await fetch('/api/products/idc?hitsPerPage=500')
      const idcData = await idcResponse.json()
      
      // Load competitor products  
      const competitorResponse = await fetch('/api/competitors/products?limit=200')
      const competitorData = await competitorResponse.json()

      setIdcProducts(idcData.hits || [])
      setCompetitorProducts(competitorData.products || [])

      // Load existing manual matches from database
      try {
        const manualMatchesResponse = await fetch('/api/products/match/manual')
        
        if (manualMatchesResponse.ok) {
          const manualData = await manualMatchesResponse.json()
          const existingMatches: ProductMatch[] = manualData.matches.map((match: any) => ({
            id: match.id,
            idc_product: {
              id: match.idc_product.id,
              title: match.idc_product.title,
              vendor: match.idc_product.vendor,
              price: match.idc_product.price,
              available: true,
              source: 'idc'
            },
            competitor_product: {
              id: match.competitor_product.id,
              title: match.competitor_product.title,
              vendor: match.competitor_product.vendor,
              price: match.competitor_product.price,
              available: true,
              source: match.competitor_product.source,
              source_name: match.competitor_product.source
            },
            confidence: Math.round(match.confidence * 100),
            price_difference: match.price_difference,
            status: 'approved', // Manual matches are pre-approved
            created_at: match.created_at
          }))
          
          setMatches(existingMatches)
          console.log(`✓ Loaded ${existingMatches.length} existing manual matches`)
        } else {
          console.warn('Failed to load manual matches, starting with empty list')
          setMatches([])
        }
      } catch (matchingError) {
        console.warn('Error loading manual matches:', matchingError)
        setMatches([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }

  const createManualMatch = async () => {
    if (!selectedIdcProduct || !selectedCompetitorProduct) return

    const idcProduct = idcProducts.find(p => (p.id || p.objectID) === selectedIdcProduct)
    const competitorProduct = competitorProducts.find(p => p.id === selectedCompetitorProduct)

    if (!idcProduct || !competitorProduct) return

    try {
      // Save manual match to database via API
      const response = await fetch('/api/products/match/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idc_product_id: idcProduct.objectID || idcProduct.id,
          competitor_product_id: competitorProduct.id,
          confidence: 1.0, // 100% confidence for manual matches
          is_manual_match: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create manual match')
      }

      const savedMatch = await response.json()

      // Add to local matches array for immediate UI update
      const newMatch: ProductMatch = {
        id: savedMatch.id || `manual-${Date.now()}`,
        idc_product: idcProduct,
        competitor_product: competitorProduct,
        confidence: 100, // Manual matches get 100% confidence
        price_difference: competitorProduct.price - idcProduct.price,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      setMatches([newMatch, ...matches])
      setSelectedIdcProduct('')
      setSelectedCompetitorProduct('')

      alert('✅ Manual match created successfully!')
    } catch (error) {
      console.error('Error creating manual match:', error)
      alert('❌ Failed to create manual match. Please try again.')
    }
  }

  const updateMatchStatus = (matchId: string, status: 'approved' | 'rejected') => {
    setMatches(matches.map(match => 
      match.id === matchId ? { ...match, status } : match
    ))
  }

  // Removed automatic loading - now user must click refresh button

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-500">Loading products...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200"
                onClick={loadProducts}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comparison Items</h1>
          <p className="mt-2 text-gray-600">
            Manage product comparison and matching between iDrinkCoffee and competitors
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadProducts}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh IDC Products
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">iDrinkCoffee Products</p>
              <p className="text-2xl font-semibold text-gray-900">{idcProducts.length}</p>
              <p className="text-sm text-blue-700 mt-1">Available for matching</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Competitor Products</p>
              <p className="text-2xl font-semibold text-gray-900">{competitorProducts.length}</p>
              <p className="text-sm text-green-700 mt-1">In database</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-semibold text-gray-900">{matches.length}</p>
              <p className="text-sm text-yellow-700 mt-1">Auto + Manual</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Approved Matches</p>
              <p className="text-2xl font-semibold text-green-600">
                {matches.filter(m => m.status === 'approved').length}
              </p>
              <p className="text-sm text-green-700 mt-1">Ready for comparison</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Matching */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Manual Match</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              iDrinkCoffee Product
            </label>
            <select
              value={selectedIdcProduct}
              onChange={(e) => setSelectedIdcProduct(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select iDC product...</option>
              {idcProducts.map((product) => (
                <option key={product.objectID || product.id} value={product.objectID || product.id}>
                  {product.vendor} - {product.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Competitor Product
            </label>
            <select
              value={selectedCompetitorProduct}
              onChange={(e) => setSelectedCompetitorProduct(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select competitor product...</option>
              {competitorProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.source_name} - {product.vendor} - {product.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={createManualMatch}
              disabled={!selectedIdcProduct || !selectedCompetitorProduct}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create Match
            </button>
          </div>
        </div>
      </div>

      {/* Matches Table */}
      {matches.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Product Matches ({matches.length} total)
          </h2>
          
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    iDrinkCoffee Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competitor Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price Difference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.map((match) => (
                  <tr key={match.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{match.idc_product.title}</div>
                        <div className="text-sm text-gray-500">{match.idc_product.vendor} - ${match.idc_product.price.toFixed(2)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{match.competitor_product.title}</div>
                        <div className="text-sm text-gray-500">
                          {match.competitor_product.source_name} - ${match.competitor_product.price.toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        match.confidence >= 90 ? 'bg-green-100 text-green-800' :
                        match.confidence >= 80 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {match.confidence}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        match.price_difference > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {match.price_difference > 0 ? '+' : ''}${match.price_difference.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        match.status === 'approved' ? 'bg-green-100 text-green-800' :
                        match.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {match.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {match.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateMatchStatus(match.id, 'approved')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateMatchStatus(match.id, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {idcProducts.length === 0 && competitorProducts.length === 0 
              ? 'No Products Loaded'
              : 'No Product Matches'
            }
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {idcProducts.length === 0 && competitorProducts.length === 0 
              ? 'Click "Refresh IDC Products" to load products from iDrinkCoffee and competitors for comparison.'
              : 'No automatic matches found. Try creating manual matches or ensure both iDrinkCoffee and competitor products are available.'
            }
          </p>
        </div>
      )}
    </>
  )
}