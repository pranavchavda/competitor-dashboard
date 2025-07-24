'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/heading'
import { Select } from '@/components/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { useState, useEffect } from 'react'

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
  const [matches, setMatches] = useState<ProductMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
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

      console.log('Generating new product matches...')
      const response = await fetch('/api/products/match', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to generate matches')
      }

      const data = await response.json()
      console.log('Match generation result:', data)

      // Reload matches after generation
      await loadStoredMatches()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error generating matches:', err)
    } finally {
      setGenerating(false)
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
          <Heading>MAP Enforcement Analysis</Heading>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Review product matches and identify MAP violations
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadStoredMatches} 
            disabled={loading}
            color="zinc"
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </Button>
          <Button 
            onClick={generateNewMatches} 
            disabled={generating || loading}
          >
            {generating ? 'Generating...' : 'Generate Matches'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Source:</label>
          <Select
            value={filters.source}
            onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
          >
            <option value="all">All Competitors</option>
            <option value="home_coffee_solutions">Home Coffee Solutions</option>
            <option value="kitchen_barista">The Kitchen Barista</option>
            <option value="cafe_liegeois">Cafe Liegeois</option>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Min Confidence:</label>
          <div className="flex flex-col">
            <Select
              value={filters.minConfidence.toString()}
              onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
            >
              <option value="0.9">90% - Very High (Exact matches)</option>
              <option value="0.8">80% - High (Strong matches)</option>
              <option value="0.7">70% - Good (Default)</option>
              <option value="0.5">50% - Medium (Some uncertainty)</option>
              <option value="0.3">30% - Low (Loose matching)</option>
            </Select>
            <span className="text-xs text-zinc-500 mt-1">
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
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Stats Cards */}
      {stats.total_matches > 0 && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <div className="text-2xl font-semibold">{stats.total_matches}</div>
            <div className="text-sm text-zinc-500">Product Matches</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <div className={`text-2xl font-semibold ${stats.map_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.map_violations}
            </div>
            <div className="text-sm text-zinc-500">MAP Violations</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <div className="text-2xl font-semibold text-red-600">
              ${stats.revenue_at_risk.toFixed(2)}
            </div>
            <div className="text-sm text-zinc-500">Revenue at Risk</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <div className="text-2xl font-semibold text-blue-600">{stats.high_confidence}</div>
            <div className="text-sm text-zinc-500">High Confidence Matches</div>
          </div>
        </div>
      )}

      {matches.length > 0 ? (
        <>
          <Subheading className="mt-14">
            Product Matches 
            {filters.showViolationsOnly && ` - MAP Violations Only`}
          </Subheading>
          <Table className="mt-4">
            <TableHead>
              <TableRow>
                <TableHeader>iDrinkCoffee Product</TableHeader>
                <TableHeader>IDC Price</TableHeader>
                <TableHeader>Competitor Product</TableHeader>
                <TableHeader>Source</TableHeader>
                <TableHeader>Competitor Price</TableHeader>
                <TableHeader>MAP Status</TableHeader>
                <TableHeader>Confidence</TableHeader>
                <TableHeader>Last Checked</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map((match) => (
                <TableRow key={match.id} className={match.is_map_violation ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                  <TableCell className="font-medium">
                    <div className="font-medium">{match.idc_product.title}</div>
                    <div className="text-sm text-zinc-500">{match.idc_product.vendor}</div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${match.idc_product.price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{match.competitor_product.title}</div>
                    <div className="text-sm text-zinc-500">{match.competitor_product.vendor}</div>
                  </TableCell>
                  <TableCell>
                    {match.competitor_product.url ? (
                      <a 
                        href={match.competitor_product.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block hover:opacity-80 transition-opacity"
                      >
                        <Badge color="blue">
                          {match.competitor_product.source}
                        </Badge>
                      </a>
                    ) : (
                      <Badge color="blue">
                        {match.competitor_product.source}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${match.competitor_product.price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {match.is_map_violation ? (
                      <div>
                        <Badge color="red">MAP VIOLATION</Badge>
                        <div className="text-sm text-red-600 mt-1">
                          -{match.violation_severity?.toFixed(1)}% 
                          (${match.violation_amount?.toFixed(2)} below)
                        </div>
                        {match.first_violation_date && (
                          <div className="text-xs text-zinc-500 mt-1">
                            Since: {new Date(match.first_violation_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge color="green">Compliant</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge color={match.confidence > 0.8 ? 'emerald' : match.confidence > 0.7 ? 'blue' : match.confidence > 0.5 ? 'yellow' : 'red'}>
                      {(match.confidence * 100).toFixed(0)}%
                    </Badge>
                    <div className="text-xs text-zinc-500 mt-1">{match.confidence_level}</div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {new Date(match.last_checked).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : !loading && !generating && (
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">
            <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-4">No product matches found</p>
            <p className="text-sm">
              {filters.showViolationsOnly 
                ? "No MAP violations found with current filters"
                : "Click 'Generate Matches' to analyze products and detect MAP violations"
              }
            </p>
          </div>
        </div>
      )}

      {(loading || generating) && (
        <div className="mt-8 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-zinc-500">
            {generating ? 'Generating product matches and detecting violations...' : 'Loading stored matches...'}
          </p>
        </div>
      )}
    </>
  )
}