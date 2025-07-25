import { Routes, Route, Link, useLocation } from 'react-router'
import {
  HomeIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  Square2StackIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/20/solid'

// Import pages
import Dashboard from './pages/Dashboard'
import Competitors from './pages/Competitors'
import ComparisonItems from './pages/ComparisonItems'
import PriceComparison from './pages/PriceComparison'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'
import Help from './pages/Help'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Competitors', href: '/competitors', icon: BuildingStorefrontIcon },
  { name: 'Comparison Items', href: '/comparison-items', icon: ClipboardDocumentListIcon },
  { name: 'Price Comparison', href: '/price-comparison', icon: Square2StackIcon },
  { name: 'Alerts', href: '/alerts', icon: ExclamationTriangleIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Help', href: '/help', icon: QuestionMarkCircleIcon },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <BuildingStorefrontIcon className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  Competitor Dashboard
                </span>
              </div>
              <nav className="mt-8 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const current = location.pathname === item.href || 
                    (item.href !== '/' && location.pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        current
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'border-transparent text-gray-900 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-3 py-2 text-sm font-medium border-l-4 rounded-md'
                      )}
                    >
                      <item.icon
                        className={classNames(
                          current ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500',
                          'mr-3 flex-shrink-0 h-5 w-5'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="md:pl-64 flex flex-col flex-1">
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/competitors" element={<Competitors />} />
                  <Route path="/comparison-items" element={<ComparisonItems />} />
                  <Route path="/price-comparison" element={<PriceComparison />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/help" element={<Help />} />
                </Routes>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}