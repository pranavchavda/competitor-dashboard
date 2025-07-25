'use client'

import { Stat } from '@/app/stat'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import { Heading, Subheading } from '@/components/heading'
import { Select } from '@/components/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { useEffect, useState } from 'react'

interface DashboardStats {
  products_monitored: number
  active_alerts: number
  competitors_tracked: number
  map_violations: number
  revenue_at_risk: number
  worst_offender: {
    source: string
    violations: number
    name: string
  } | null
}

interface CompetitorStatus {
  name: string
  domain: string
  status: 'Active' | 'Inactive'
  last_updated: string
  products_tracked: number
  avg_price_difference: number
}

interface RecentAlert {
  id: number
  product_title: string
  competitor: string
  alert_type: string
  old_price: number | null
  new_price: number
  price_difference: number | null
  price_difference_percent: number | null
  created_at: string
  idc_price: number
  competitive_advantage: number
}

function CompetitorCard({ 
  name, 
  domain, 
  status, 
  lastUpdated, 
  productsTracked, 
  avgPriceDiff 
}: { 
  name: string
  domain: string
  status: 'Active' | 'Inactive'
  lastUpdated: string
  productsTracked: number
  avgPriceDiff: number
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-sm text-zinc-500">{domain}</p>
        </div>
        <Badge color={status === 'Active' ? 'emerald' : 'zinc'}>{status}</Badge>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-zinc-500">Products: {productsTracked}</p>
          <p className="text-zinc-500">Updated {lastUpdated}</p>
        </div>
        <div className="text-right">
          <p className={`font-medium ${avgPriceDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {avgPriceDiff > 0 ? '+' : ''}{avgPriceDiff.toFixed(1)}% avg
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PriceMonitoring() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [competitors, setCompetitors] = useState<CompetitorStatus[]>([])
  const [alerts, setAlerts] = useState<RecentAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      setStats(data.stats)
      setCompetitors(data.competitor_status)
      setAlerts(data.recent_alerts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <Button className="mt-2" onClick={fetchDashboardData}>Retry</Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Heading>MAP Enforcement Dashboard</Heading>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Monitor retail partner pricing compliance and MAP violations</p>
        </div>
        <Button onClick={fetchDashboardData}>Refresh Data</Button>
      </div>
      
      <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
        <Stat 
          title="Products Monitored" 
          value={stats?.products_monitored.toString() || '0'} 
          change="+12" 
        />
        <Stat 
          title="MAP Violations" 
          value={stats?.map_violations.toString() || '0'} 
          change={stats?.map_violations && stats.map_violations > 0 ? `⚠️ Active` : '✓ Clean'}
          color={stats?.map_violations && stats.map_violations > 0 ? 'red' : 'green'}
        />
        <Stat 
          title="Revenue at Risk" 
          value={`$${stats?.revenue_at_risk.toFixed(2) || '0.00'}`} 
          change={stats?.worst_offender ? `${stats.worst_offender.name} (${stats.worst_offender.violations})` : 'No violations'} 
        />
        <Stat 
          title="Competitors Tracked" 
          value={stats?.competitors_tracked.toString() || '0'} 
          change="+0" 
        />
      </div>

      <Subheading className="mt-14">Competitor Status</Subheading>
      <div className="mt-4 grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
        {competitors.map((competitor) => (
          <CompetitorCard 
            key={competitor.domain}
            name={competitor.name}
            domain={competitor.domain}
            status={competitor.status}
            lastUpdated={competitor.last_updated}
            productsTracked={competitor.products_tracked}
            avgPriceDiff={competitor.avg_price_difference}
          />
        ))}
      </div>

      <Subheading className="mt-14">Recent Alerts</Subheading>
      {alerts.length > 0 ? (
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeader>Product</TableHeader>
              <TableHeader>Competitor</TableHeader>
              <TableHeader>Alert Type</TableHeader>
              <TableHeader>Price Change</TableHeader>
              <TableHeader>Our Price</TableHeader>
              <TableHeader>Advantage</TableHeader>
              <TableHeader>Time</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className="font-medium">{alert.product_title}</TableCell>
                <TableCell>{alert.competitor}</TableCell>
                <TableCell>
                  <Badge color={
                    alert.alert_type === 'price_drop' ? 'red' : 
                    alert.alert_type === 'price_increase' ? 'green' : 'blue'
                  }>
                    {alert.alert_type.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {alert.price_difference !== null ? (
                    <span className={alert.price_difference > 0 ? 'text-red-600' : 'text-green-600'}>
                      ${Math.abs(alert.price_difference).toFixed(2)} 
                      ({alert.price_difference > 0 ? '+' : ''}{alert.price_difference_percent?.toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="text-zinc-500">New Product</span>
                  )}
                </TableCell>
                <TableCell>${alert.idc_price.toFixed(2)}</TableCell>
                <TableCell>
                  <span className={alert.competitive_advantage > 0 ? 'text-green-600' : 'text-red-600'}>
                    ${alert.competitive_advantage.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {new Date(alert.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="mt-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <p className="text-center text-zinc-500">No recent alerts</p>
          <p className="mt-1 text-center text-sm text-zinc-400">Price alerts will appear here when competitors change their pricing</p>
        </div>
      )}
    </>
  )
}
