import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'

interface Product {
  id: string | number
  title: string
  vendor: string
  product_type: string
  price: number
  handle: string
  source: 'idc' | 'competitor'
  competitor?: string
  url?: string
}

interface ProductMatch {
  id: string
  idc_product: Product
  competitor_product: Product
  confidence: number
  confidence_level: string
  price_difference: number
  price_difference_percent: number
  is_manual_match: boolean
  is_rejected: boolean
  is_map_violation: boolean
  violation_amount: number | null
  violation_severity: number | null
  first_violation_date: string | null
  last_checked: string
  similarity_scores: {
    title: number | null
    brand: number | null
    type: number | null
    price: number | null
    embedding: number | null
  }
  created_at: string
  updated_at: string
}

export default function PriceComparisonPage() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<ProductMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [updatingEmbeddings, setUpdatingEmbeddings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    source: 'all',
    minConfidence: 0.7,
    showViolationsOnly: false
  })
  const [stats, setStats] = useState({
    total_matches: 0,
    map_violations: 0,
    revenue_at_risk: 0,
    high_confidence: 0
  })

  // Customer name mapping
  const getCustomerName = (source: string): string => {
    const customerNames: Record<string, string> = {
      'home_coffee_solutions': 'Home Coffee Solutions',
      'kitchen_barista': 'The Kitchen Barista',
      'cafe_liegeois': 'Cafe Liegeois'
    }
    return customerNames[source] || source.replace('_', ' ')
  }

  // Load existing matches from database
  const loadStoredMatches = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        min_confidence: filters.minConfidence.toString(),
        page: '1',
        limit: '100'
      })

      if (filters.source !== 'all') {
        params.append('source', filters.source)
      }

      const response = await fetch(`/api/products/match?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load stored matches')
      }

      const data = await response.json()
      
      // Filter for violations if requested
      let filteredMatches = data.matches
      if (filters.showViolationsOnly) {
        filteredMatches = data.matches.filter((m: ProductMatch) => m.is_map_violation)
      }
      
      setMatches(filteredMatches)

      // Calculate stats
      const totalMatches = filteredMatches.length
      const violations = filteredMatches.filter((m: ProductMatch) => m.is_map_violation).length
      const revenueAtRisk = filteredMatches
        .filter((m: ProductMatch) => m.is_map_violation && m.violation_amount)
        .reduce((sum: number, m: ProductMatch) => sum + (m.violation_amount || 0), 0)
      const highConfidence = filteredMatches.filter((m: ProductMatch) => m.confidence > 0.8).length

      setStats({
        total_matches: totalMatches,
        map_violations: violations,
        revenue_at_risk: revenueAtRisk,
        high_confidence: highConfidence
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error loading stored matches:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate new matches
  const generateNewMatches = async () => {
    try {
      setGenerating(true)
      setError(null)

      console.log('Generating new MAP enforcement analysis...')
      const response = await fetch('/api/products/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confidence_threshold: filters.minConfidence * 100
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate MAP analysis')
      }

      const data = await response.json()
      console.log('MAP analysis result:', data)

      // Reload matches after generation
      await loadStoredMatches()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error generating MAP analysis:', err)
    } finally {
      setGenerating(false)
    }
  }

  // Update embeddings for all products
  const updateEmbeddings = async () => {
    try {
      setUpdatingEmbeddings(true)
      setError(null)

      console.log('Updating product embeddings...')
      const response = await fetch('/api/embeddings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to update embeddings')
      }

      const data = await response.json()
      console.log('Embeddings update result:', data)

      // Show success message
      alert(`✅ Embeddings updated successfully!\n\nFound: ${data.stats?.products_found || 0} products\nProcessed: ${data.stats?.products_processed || 0}\nSuccess: ${data.stats?.success || 0}\nFailed: ${data.stats?.failed || 0}`)

      // Reload matches to show improved accuracy
      await loadStoredMatches()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error updating embeddings:', err)
    } finally {
      setUpdatingEmbeddings(false)
    }
  }

  // Load matches on component mount and filter changes
  useEffect(() => {
    loadStoredMatches()
  }, [filters.source, filters.minConfidence, filters.showViolationsOnly])

  const formatPriceDifference = (difference: number, percent: number) => {
    const isPositive = difference > 0
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {isPositive ? '+' : ''}${difference.toFixed(2)} ({percent.toFixed(1)}%)
      </span>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MAP Enforcement Analysis</h1>
          <p className="mt-2 text-gray-600">
            Monitor wholesale customer compliance with Minimum Advertised Price agreements
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadStoredMatches} 
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
          <button 
            onClick={updateEmbeddings} 
            disabled={updatingEmbeddings || loading || generating}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
            title="Update AI embeddings for more accurate semantic matching"
          >
            {updatingEmbeddings ? 'Updating AI...' : 'Update Embeddings'}
          </button>
          <button 
            onClick={generateNewMatches} 
            disabled={generating || loading || updatingEmbeddings}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {generating ? 'Analyzing...' : 'Generate Analysis'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Customer:</label>
          <select
            value={filters.source}
            onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Customers</option>
            <option value="home_coffee_solutions">Home Coffee Solutions</option>
            <option value="kitchen_barista">The Kitchen Barista</option>
            <option value="cafe_liegeois">Cafe Liegeois</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Min Confidence:</label>
          <div className="flex flex-col">
            <select
              value={filters.minConfidence.toString()}
              onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="0.9">90% - Very High (Exact matches)</option>
              <option value="0.8">80% - High (Strong matches)</option>
              <option value="0.7">70% - Good (Default)</option>
              <option value="0.5">50% - Medium (Some uncertainty)</option>
              <option value="0.3">30% - Low (Loose matching)</option>
            </select>
            <span className="text-xs text-gray-500 mt-1">
              Higher thresholds show only more certain product matches
            </span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.showViolationsOnly}
            onChange={(e) => setFilters(prev => ({ ...prev, showViolationsOnly: e.target.checked }))}
            className="rounded"
          />
          MAP Violations Only
        </label>

        <button
          onClick={() => navigate('/comparison-items')}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          title="Manually match products for more accurate tracking"
        >
          Manual Match
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}

      {/* Stats Cards */}
      {stats.total_matches > 0 && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-semibold">{stats.total_matches}</div>
            <div className="text-sm text-gray-500">Product Matches</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-6">
            <div className={`text-2xl font-semibold ${stats.map_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.map_violations}
            </div>
            <div className="text-sm text-gray-500">MAP Violations</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-semibold text-red-600">
              ${stats.revenue_at_risk.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Revenue at Risk</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-semibold text-blue-600">{stats.high_confidence}</div>
            <div className="text-sm text-gray-500">High Confidence Matches</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-semibold text-purple-600">
              {matches.filter(m => m.similarity_scores?.embedding !== null).length}
            </div>
            <div className="text-sm text-gray-500">AI-Powered Matches</div>
            <div className="text-xs text-purple-600 mt-1">
              {matches.length > 0 ? Math.round((matches.filter(m => m.similarity_scores?.embedding !== null).length / matches.length) * 100) : 0}% coverage
            </div>
          </div>
        </div>
      )}

      {matches.length > 0 ? (
        <>
          <div className="mt-14 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Customer Pricing Analysis
                {filters.showViolationsOnly && ` - MAP Violations Only`}
              </h2>
              <div className="flex items-center gap-4">
                {(() => {
                  const aiMatches = matches.filter(m => m.similarity_scores?.embedding !== null).length
                  const ruleMatches = matches.length - aiMatches
                  const aiPercentage = matches.length > 0 ? ((aiMatches / matches.length) * 100).toFixed(0) : '0'
                  
                  return (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          🤖 AI: {aiMatches}
                        </span>
                        <span className="text-gray-500">({aiPercentage}%)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          📋 Rules: {ruleMatches}
                        </span>
                        <span className="text-gray-500">({(100 - parseInt(aiPercentage))}%)</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
            {(() => {
              const aiMatches = matches.filter(m => m.similarity_scores?.embedding !== null).length
              const totalMatches = matches.length
              
              if (aiMatches === 0 && totalMatches > 0) {
                return (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-yellow-800">
                        <strong>Traditional matching only.</strong> Configure OpenAI API key in Settings and click "Update Embeddings" for more accurate AI-powered semantic matching.
                      </span>
                    </div>
                  </div>
                )
              } else if (aiMatches > 0 && aiMatches < totalMatches) {
                return (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-blue-800">
                        <strong>Hybrid matching.</strong> {aiMatches} matches use AI embeddings, {totalMatches - aiMatches} use traditional rules. Click "Update Embeddings" to improve more matches.
                      </span>
                    </div>
                  </div>
                )
              } else if (aiMatches === totalMatches && totalMatches > 0) {
                return (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-800">
                        <strong>AI-powered matching.</strong> All matches use semantic embeddings for maximum accuracy.
                      </span>
                    </div>
                  </div>
                )
              }
              return null
            })()}
          </div>
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">iDrinkCoffee Product (MAP)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAP Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Product & Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAP Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Checked</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.map((match) => (
                  <tr key={match.id} className={match.is_map_violation ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{match.idc_product.title}</div>
                      <div className="text-sm text-gray-500">{match.idc_product.vendor}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      ${match.idc_product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{match.competitor_product.title}</div>
                      <div className="text-sm text-gray-500">{match.competitor_product.vendor}</div>
                      <div className="text-sm font-semibold text-blue-600 mt-1">
                        {getCustomerName(match.competitor_product.source || '')}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">
                        ${match.competitor_product.price.toFixed(2)}
                      </div>
                      {match.competitor_product.url ? (
                        <a 
                          href={match.competitor_product.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 block"
                        >
                          View Product →
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 mt-1 block">No link available</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {match.competitor_product.url ? (
                        <a 
                          href={match.competitor_product.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block hover:opacity-80 transition-opacity"
                        >
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getCustomerName(match.competitor_product.source || '')}
                          </span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getCustomerName(match.competitor_product.source || '')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {match.is_map_violation ? (
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            MAP VIOLATION
                          </span>
                          <div className="text-sm text-red-600 mt-1">
                            -{match.violation_severity?.toFixed(1)}% 
                            (${match.violation_amount?.toFixed(2)} below MAP)
                          </div>
                          {match.first_violation_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              Since: {new Date(match.first_violation_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Compliant
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          match.confidence > 0.8 ? 'bg-green-100 text-green-800' : 
                          match.confidence > 0.7 ? 'bg-blue-100 text-blue-800' : 
                          match.confidence > 0.5 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {(match.confidence * 100).toFixed(0)}%
                        </span>
                        {match.similarity_scores?.embedding !== null ? (
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                            title={`AI-powered match using semantic embeddings (${(match.similarity_scores.embedding * 100).toFixed(0)}% semantic similarity)`}
                          >
                            🤖 AI
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                            title="Traditional rule-based matching (brand, title, type, price)"
                          >
                            📋 Rules
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{match.confidence_level}</div>
                      {match.similarity_scores?.embedding !== null && (
                        <div className="text-xs text-purple-600 mt-1">
                          Semantic: {(match.similarity_scores.embedding * 100).toFixed(0)}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(match.last_checked).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : !loading && !generating && (
        <div className="mt-8 text-center py-12">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-4">No MAP analysis data found</p>
            <p className="text-sm">
              {filters.showViolationsOnly 
                ? "No MAP violations detected with current filters"
                : "Click 'Generate Analysis' to analyze customer pricing and detect MAP violations"
              }
            </p>
          </div>
        </div>
      )}

      {(loading || generating || updatingEmbeddings) && (
        <div className="mt-8 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">
            {updatingEmbeddings ? 'Updating AI embeddings for improved semantic matching...' :
             generating ? 'Generating MAP enforcement analysis and detecting violations...' : 
             'Loading stored analysis...'}
          </p>
        </div>
      )}
    </>
  )
}