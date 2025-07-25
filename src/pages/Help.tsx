export default function Help() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
          <p className="mt-2 text-gray-600">
            Get help and support for using the application
          </p>
        </div>
      </div>
      
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Help Documentation</h3>
        <p className="mt-1 text-sm text-gray-500">
          This page will show documentation, FAQs, and troubleshooting guides for the competitor dashboard.
        </p>
      </div>
    </>
  )
}