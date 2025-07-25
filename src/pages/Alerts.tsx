export default function Alerts() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="mt-2 text-gray-600">
            Monitor price alerts and notifications
          </p>
        </div>
      </div>
      
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
          <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Price Alerts</h3>
        <p className="mt-1 text-sm text-gray-500">
          This page will show all price alerts with filtering, status management, and notification settings.
        </p>
      </div>
    </>
  )
}