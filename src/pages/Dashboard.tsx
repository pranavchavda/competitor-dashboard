import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/api'

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
    violation_amount: number
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

interface DashboardResponse {
  stats: DashboardStats
  competitor_status: CompetitorStatus[]
  recent_alerts: RecentAlert[]
}

function StatCard({ 
  title, 
  value, 
  change, 
  color = 'blue' 
}: { 
  title: string
  value: string
  change: string
  color?: 'blue' | 'green' | 'red' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className={`text-sm ${colorClasses[color]} mt-1`}>{change}</p>
        </div>
      </div>
    </div>
  )
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">{domain}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status === 'Active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-gray-500">Products: {productsTracked}</p>
          <p className="text-gray-500">Updated {lastUpdated}</p>
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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [competitors, setCompetitors] = useState<CompetitorStatus[]>([])
  const [alerts, setAlerts] = useState<RecentAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await apiJson<DashboardResponse>('/api/dashboard/stats')
      setStats(data.stats)
      setCompetitors(data.competitor_status)
      setAlerts(data.recent_alerts || [])
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-500">Loading dashboard...</div>
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
                onClick={fetchDashboardData}
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
          <h1 className="text-3xl font-bold text-gray-900">MAP Enforcement Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor retail partner pricing compliance and MAP violations</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh Data
        </button>
      </div>
      
      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          title="Product Matches" 
          value={stats?.products_monitored.toString() || '0'} 
          change="MAP enforcement records" 
        />
        <StatCard 
          title="MAP Violations" 
          value={stats?.map_violations.toString() || '0'} 
          change={stats?.map_violations && stats.map_violations > 0 ? `⚠️ ${stats.map_violations} Active` : '✓ All Compliant'}
          color={stats?.map_violations && stats.map_violations > 0 ? 'red' : 'green'}
        />
        <StatCard 
          title="Revenue at Risk" 
          value={`$${stats?.revenue_at_risk.toFixed(2) || '0.00'}`} 
          change={stats?.worst_offender ? `Worst: ${stats.worst_offender.name}` : 'No violations'} 
          color={stats?.revenue_at_risk && stats.revenue_at_risk > 0 ? 'red' : 'green'}
        />
        <StatCard 
          title="Customers Monitored" 
          value={stats?.competitors_tracked.toString() || '0'} 
          change="Wholesale partners" 
        />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mt-12 mb-6">Wholesale Customer Status</h2>
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
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

      <h2 className="text-xl font-semibold text-gray-900 mt-12 mb-6">Recent MAP Violations</h2>
      {alerts.length > 0 ? (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Competitor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alert Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Our Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advantage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {alert.product_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {alert.competitor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.alert_type === 'price_drop' ? 'bg-red-100 text-red-800' : 
                      alert.alert_type === 'price_increase' ? 'bg-green-100 text-green-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.alert_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {alert.price_difference !== null ? (
                      <span className={alert.price_difference > 0 ? 'text-red-600' : 'text-green-600'}>
                        ${Math.abs(alert.price_difference).toFixed(2)} 
                        ({alert.price_difference > 0 ? '+' : ''}{alert.price_difference_percent?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-gray-500">New Product</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${alert.idc_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={alert.competitive_advantage > 0 ? 'text-green-600' : 'text-red-600'}>
                      ${alert.competitive_advantage.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">No recent alerts</p>
          <p className="mt-1 text-sm text-gray-400">Price alerts will appear here when competitors change their pricing</p>
        </div>
      )}
    </>
  )
}