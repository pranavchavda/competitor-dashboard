'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { useState, useEffect } from 'react'

interface Alert {
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
  status: 'new' | 'acknowledged' | 'resolved'
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'acknowledged' | 'resolved'>('all')

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      // Add status to mock alerts for demonstration
      const alertsWithStatus = data.recent_alerts.map((alert: Alert, index: number) => ({
        ...alert,
        status: index === 0 ? 'new' : index === 1 ? 'acknowledged' : 'resolved'
      }))
      setAlerts(alertsWithStatus)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateAlertStatus = (alertId: number, newStatus: 'acknowledged' | 'resolved') => {
    setAlerts(prev => prev.map((alert: any) => 
      alert.id === alertId ? { ...alert, status: newStatus } : alert
    ))
  }

  const filteredAlerts = alerts.filter(alert => 
    filter === 'all' || alert.status === filter
  )

  const alertCounts = {
    all: alerts.length,
    new: alerts.filter(a => a.status === 'new').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const getAlertTypeColor = (alertType: string) => {
    switch (alertType) {
      case 'price_drop': return 'red'
      case 'price_increase': return 'green'
      case 'new_product': return 'blue'
      default: return 'zinc'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'red'
      case 'acknowledged': return 'yellow'
      case 'resolved': return 'emerald'
      default: return 'zinc'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500">Loading alerts...</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Heading>Price Alerts</Heading>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Monitor and respond to competitor price changes
          </p>
        </div>
        <Button onClick={fetchAlerts}>Refresh</Button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <div className="text-2xl font-semibold">{alertCounts.all}</div>
          <div className="text-sm text-zinc-500">Total Alerts</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <div className="text-2xl font-semibold text-red-600">{alertCounts.new}</div>
          <div className="text-sm text-zinc-500">New Alerts</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <div className="text-2xl font-semibold text-yellow-600">{alertCounts.acknowledged}</div>
          <div className="text-sm text-zinc-500">Acknowledged</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <div className="text-2xl font-semibold text-green-600">{alertCounts.resolved}</div>
          <div className="text-sm text-zinc-500">Resolved</div>
        </div>
      </div>

      <div className="mt-8 flex gap-2">
        {(['all', 'new', 'acknowledged', 'resolved'] as const).map((filterOption) => 
          filter === filterOption ? (
            <Button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)} ({alertCounts[filterOption]})
            </Button>
          ) : (
            <Button
              key={filterOption}
              outline
              onClick={() => setFilter(filterOption)}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)} ({alertCounts[filterOption]})
            </Button>
          )
        )}
      </div>

      {filteredAlerts.length > 0 ? (
        <>
          <Subheading className="mt-8">
            {filter === 'all' ? 'All Alerts' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Alerts`}
          </Subheading>
          <Table className="mt-4">
            <TableHead>
              <TableRow>
                <TableHeader>Product</TableHeader>
                <TableHeader>Competitor</TableHeader>
                <TableHeader>Alert Type</TableHeader>
                <TableHeader>Price Change</TableHeader>
                <TableHeader>Our Price</TableHeader>
                <TableHeader>Advantage</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Time</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="font-medium">{alert.product_title}</TableCell>
                  <TableCell>{alert.competitor}</TableCell>
                  <TableCell>
                    <Badge color={getAlertTypeColor(alert.alert_type)}>
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
                  <TableCell>
                    <Badge color={getStatusColor(alert.status)}>
                      {alert.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {alert.status === 'new' && (
                        <Button
                          plain
                          onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Button
                          plain
                          onClick={() => updateAlertStatus(alert.id, 'resolved')}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : (
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">
            <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9.707 14.707l-2-2a1 1 0 00-1.414 0l-2 2a1 1 0 001.414 1.414L6 15.414V19a1 1 0 002 0v-3.586l.293.293a1 1 0 001.414-1.414z" />
            </svg>
            <p className="mt-4">No {filter === 'all' ? '' : filter} alerts found</p>
            <p className="text-sm">Alerts will appear here when competitors change their pricing</p>
          </div>
        </div>
      )}
    </>
  )
}