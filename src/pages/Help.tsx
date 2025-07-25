import { useState } from 'react'

interface HelpSection {
  id: string
  title: string
  content: React.ReactNode
}

export default function Help() {
  const [activeSection, setActiveSection] = useState<string>('getting-started')

  const sections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Welcome to Competitor Dashboard</h3>
            <p className="text-gray-600 mb-4">
              This application helps you monitor competitor pricing for iDrinkCoffee.com across major coffee equipment retailers. 
              It automatically scrapes competitor data, matches products using AI algorithms, and provides real-time price comparison insights.
            </p>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">First Time Setup</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Navigate to <strong>Settings</strong> to configure your API keys</li>
              <li>Add your OpenAI API key for advanced product matching (optional but recommended)</li>
              <li>Add your Algolia API key to fetch real iDrinkCoffee products</li>
              <li>Go to <strong>Competitors</strong> and click "Start Scraping" to collect initial data</li>
              <li>Visit <strong>Price Comparison</strong> to generate product matches</li>
              <li>Check the <strong>Dashboard</strong> for overview and alerts</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-800">Tip</h4>
                <p className="mt-1 text-sm text-blue-700">
                  The app works with sample data initially. For full functionality, configure your API keys in Settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: 'Dashboard Overview',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">MAP Enforcement Dashboard</h3>
            <p className="text-gray-600 mb-4">
              The dashboard provides a real-time overview of your competitive pricing position and MAP (Minimum Advertised Price) compliance.
            </p>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Key Metrics</h4>
            <div className="space-y-3">
              <div>
                <strong className="text-gray-900">Product Matches:</strong>
                <span className="text-gray-600 ml-2">Total number of products successfully matched between iDrinkCoffee and competitors</span>
              </div>
              <div>
                <strong className="text-gray-900">MAP Violations:</strong>
                <span className="text-gray-600 ml-2">Number of competitors selling below Minimum Advertised Price</span>
              </div>
              <div>
                <strong className="text-gray-900">Revenue at Risk:</strong>
                <span className="text-gray-600 ml-2">Estimated revenue impact from competitive pricing pressures</span>
              </div>
              <div>
                <strong className="text-gray-900">Customers Monitored:</strong>
                <span className="text-gray-600 ml-2">Number of wholesale partners/competitors being tracked</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Wholesale Customer Status</h4>
            <p className="text-gray-600 mb-2">
              Monitor the pricing behavior of your wholesale customers:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Active/Inactive:</strong> Current monitoring status</li>
              <li><strong>Products Tracked:</strong> Number of products being monitored</li>
              <li><strong>Average Price Difference:</strong> How their pricing compares to yours (positive = they're more expensive)</li>
              <li><strong>Last Updated:</strong> When data was last refreshed</li>
            </ul>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Recent MAP Violations</h4>
            <p className="text-gray-600">
              The violations table shows real-time pricing alerts with price changes, competitive advantages, and timestamps. 
              Use this to take immediate action on pricing policy violations.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'competitors',
      title: 'Competitors Management',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Competitor Data Collection</h3>
            <p className="text-gray-600 mb-4">
              The Competitors page manages data collection from your key competitors in the coffee equipment space.
            </p>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Monitored Competitors</h4>
            <div className="space-y-3">
              <div>
                <strong className="text-gray-900">Home Coffee Solutions:</strong>
              </div>
              <div>
                <strong className="text-gray-900">The Kitchen Barista:</strong>
              </div>
              <div>
                <strong className="text-gray-900">Cafe Liegeois:</strong>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">How to Use</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li><strong>Start Scraping:</strong> Click the blue "Start Scraping" button to begin data collection</li>
              <li><strong>Monitor Progress:</strong> Watch real-time progress updates as data is collected from each competitor</li>
              <li><strong>View Results:</strong> Product counts update automatically as scraping completes</li>
              <li><strong>Filter Products:</strong> Use search and filter options to find specific products</li>
              <li><strong>Schedule Updates:</strong> Configure automatic scraping intervals in Settings</li>
            </ol>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Scraping Process</h4>
            <p className="text-gray-600 mb-2">
              The app uses intelligent scraping that:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Targets specific brand collections (ECM, Profitec, Eureka) for now (this will change in the future to be customizable)</li>
              <li>Uses Shopify JSON endpoints for faster data collection</li>
              <li>Respects rate limits and website terms of service</li>
              <li>Automatically normalizes prices and product information</li>
              <li>Updates existing products and adds new ones</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-yellow-800">Important</h4>
                <p className="mt-1 text-sm text-yellow-700">
                  Scraping may take 5-10 minutes depending on network speed and competitor website performance. 
                  Don't close the app during scraping to ensure complete data collection.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'price-comparison',
      title: 'Price Comparison & Matching',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Matching System</h3>
            <p className="text-gray-600 mb-4">
              The Price Comparison page uses advanced algorithms to match your products with competitor offerings, 
              providing detailed price analysis and competitive insights.
            </p>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Getting Started</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li><strong>Refresh IDC Products:</strong> Click "Refresh IDC Products" to load your current product catalog</li>
              <li><strong>Generate Analysis:</strong> Click "Generate Analysis" to create product matches using AI</li>
              <li><strong>Review Matches:</strong> Examine the confidence scores and price differences</li>
              <li><strong>Create Manual Matches:</strong> Use the manual matching tool for products not automatically matched</li>
            </ol>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Matching Algorithm</h4>
            <p className="text-gray-600 mb-2">The system uses multiple factors to determine product matches:</p>
            <div className="space-y-2">
              <div>
                <strong className="text-gray-900">Brand Matching (40%):</strong>
                <span className="text-gray-600 ml-2">Exact brand name comparison (ECM, Profitec, Eureka)</span>
              </div>
              <div>
                <strong className="text-gray-900">Title Similarity (30%):</strong>
                <span className="text-gray-600 ml-2">Product name and model number matching</span>
              </div>
              <div>
                <strong className="text-gray-900">Product Type (20%):</strong>
                <span className="text-gray-600 ml-2">Category matching (espresso machines, grinders, etc.)</span>
              </div>
              <div>
                <strong className="text-gray-900">Price Proximity (10%):</strong>
                <span className="text-gray-600 ml-2">Similar price ranges indicate similar products</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Confidence Levels</h4>
            <div className="space-y-2">
              <div>
                <strong className="text-green-600">90%+ (High Confidence):</strong>
                <span className="text-gray-600 ml-2">Very likely to be the same product</span>
              </div>
              <div>
                <strong className="text-yellow-600">70-89% (Medium Confidence):</strong>
                <span className="text-gray-600 ml-2">Probable match, review recommended</span>
              </div>
              <div>
                <strong className="text-red-600">Below 70% (Low Confidence):</strong>
                <span className="text-gray-600 ml-2">Uncertain match, manual verification needed</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Manual Matching</h4>
            <p className="text-gray-600 mb-2">
              For products not automatically matched or low-confidence matches:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Select an iDrinkCoffee product from the dropdown</li>
              <li>Choose the corresponding competitor product</li>
              <li>Click "Create Manual Match" to save the pairing</li>
              <li>Manual matches are marked with 100% confidence</li>
            </ol>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Understanding Price Differences</h4>
            <div className="space-y-2">
              <div>
                <strong className="text-green-600">Positive Difference (+$50):</strong>
                <span className="text-gray-600 ml-2">Competitor is more expensive - you have competitive advantage</span>
              </div>
              <div>
                <strong className="text-red-600">Negative Difference (-$50):</strong>
                <span className="text-gray-600 ml-2">Competitor is cheaper - may need pricing review</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'alerts',
      title: 'Alerts & Monitoring',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Price Alert System</h3>
            <p className="text-gray-600 mb-4">
              The Alerts page helps you track price changes and competitive movements in real-time, 
              allowing you to respond quickly to market changes.
            </p>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Alert Types</h4>
            <div className="space-y-3">
              <div>
                <strong className="text-red-600">Price Drop:</strong>
                <span className="text-gray-600 ml-2">Competitor reduced their price - opportunity to raise yours or match</span>
              </div>
              <div>
                <strong className="text-green-600">Price Increase:</strong>
                <span className="text-gray-600 ml-2">Competitor raised their price - opportunity to gain market share</span>
              </div>
              <div>
                <strong className="text-blue-600">New Product:</strong>
                <span className="text-gray-600 ml-2">Competitor added a new product to their catalog</span>
              </div>
              <div>
                <strong className="text-yellow-600">MAP Violation:</strong>
                <span className="text-gray-600 ml-2">Competitor is selling below Minimum Advertised Price</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Managing Alerts</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Filter by Status:</strong> View All, New, or Acknowledged alerts</li>
              <li><strong>Filter by Type:</strong> Focus on specific alert types (price changes, new products, etc.)</li>
              <li><strong>Mark as Acknowledged:</strong> Track which alerts you've reviewed</li>
              <li><strong>View Details:</strong> Click on alerts to see full product and pricing information</li>
              <li><strong>Sort by Date:</strong> See the most recent alerts first</li>
            </ul>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Taking Action on Alerts</h4>
            <p className="text-gray-600 mb-2">
              When you receive alerts, consider these actions:
            </p>
            <div className="space-y-2">
              <div>
                <strong className="text-gray-900">Price Drop Alerts:</strong>
                <span className="text-gray-600 ml-2">Review if you can increase your margins or need to match competitor pricing</span>
              </div>
              <div>
                <strong className="text-gray-900">Price Increase Alerts:</strong>
                <span className="text-gray-600 ml-2">Consider promotional opportunities or highlighting your competitive advantage</span>
              </div>
              <div>
                <strong className="text-gray-900">New Product Alerts:</strong>
                <span className="text-gray-600 ml-2">Evaluate if you should add similar products to your catalog</span>
              </div>
              <div>
                <strong className="text-gray-900">MAP Violations:</strong>
                <span className="text-gray-600 ml-2">Contact the violating retailer or supplier to address policy compliance</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-green-800">Best Practice</h4>
                <p className="mt-1 text-sm text-green-700">
                  Check alerts daily and acknowledge them after review to maintain an organized workflow. 
                  Set up regular scraping to ensure you receive timely alerts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Application Configuration</h3>
            <p className="text-gray-600 mb-4">
              The Settings page allows you to configure API keys, matching parameters, and system preferences 
              to optimize the application for your specific needs.
            </p>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">API Configuration</h4>
            
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-gray-900 mb-2">OpenAI API Key (Optional)</h5>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                <li>Enables advanced semantic product matching using AI</li>
                <li>Improves matching accuracy from ~70% to 85-90%</li>
                <li>Required for generating product embeddings</li>
                <li>Get your key from <a href="https://platform.openai.com/account/api-keys" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
                <li>Click "Test Key" to verify your API key works</li>
              </ul>
            </div>

            <div className="mb-4">
              <h5 className="text-sm font-semibold text-gray-900 mb-2">Algolia API Key (Recommended)</h5>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                <li>Required to fetch real iDrinkCoffee products from your catalog</li>
                <li>Without this key, the app uses sample/local data only</li>
                <li>Enables matching against your actual product inventory</li>
                <li>Contact your Algolia administrator for the API key</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Matching Configuration</h4>
            <div className="space-y-3">
              <div>
                <strong className="text-gray-900">Default Confidence Threshold:</strong>
                <div className="text-gray-600 text-sm ml-4 mt-1">
                  <div>• <strong>70%:</strong> More matches, some false positives</div>
                  <div>• <strong>80%:</strong> Balanced accuracy and coverage (recommended)</div>
                  <div>• <strong>90%:</strong> High accuracy, fewer matches</div>
                </div>
              </div>
              <div>
                <strong className="text-gray-900">Scraping Interval:</strong>
                <span className="text-gray-600 ml-2">How often to automatically update competitor data (hours)</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">AI Embeddings</h4>
            <p className="text-gray-600 mb-2">
              Generate semantic embeddings for improved product matching:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Generate Embeddings:</strong> Process all products for semantic matching (requires OpenAI API key)</li>
              <li><strong>Real-time Progress:</strong> Monitor embedding generation with live progress updates</li>
              <li><strong>Cancel Operation:</strong> Stop embedding generation if needed</li>
              <li><strong>One-time Process:</strong> Only needs to be run when you add new products or significantly change your catalog</li>
            </ul>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Data Privacy & Security</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>All API keys are stored locally on your computer</li>
              <li>No sensitive data is transmitted to external services (except OpenAI/Algolia for their respective functions)</li>
              <li>Competitor data is scraped ethically and stored locally</li>
              <li>All database files remain on your system</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-800">Configuration Tips</h4>
                <p className="mt-1 text-sm text-blue-700">
                  Start with the Algolia API key for basic functionality, then add OpenAI for advanced matching. 
                  Generate embeddings after your initial scraping for best results.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Common Issues & Solutions</h3>
            <p className="text-gray-600 mb-4">
              Quick fixes for the most common problems you might encounter.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2">⚠️ "API call failed: 500 Internal Server Error"</h4>
              <div className="text-gray-600 text-sm space-y-1">
                <p><strong>Cause:</strong> Database connection issues or missing configuration</p>
                <p><strong>Solution:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Restart the application</li>
                  <li>Check if database file exists and has proper permissions</li>
                  <li>Verify your API keys in Settings</li>
                  <li>Try running competitor scraping first to populate data</li>
                </ol>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2">🔑 "OpenAI API key is invalid"</h4>
              <div className="text-gray-600 text-sm space-y-1">
                <p><strong>Cause:</strong> Incorrect or expired OpenAI API key</p>
                <p><strong>Solution:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Go to Settings and verify your OpenAI API key</li>
                  <li>Ensure the key starts with 'sk-' and is complete</li>
                  <li>Test the key using the "Test Key" button</li>
                  <li>Generate a new key from OpenAI Platform if needed</li>
                </ol>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2">🔍 "No products found" or empty results</h4>
              <div className="text-gray-600 text-sm space-y-1">
                <p><strong>Cause:</strong> No data has been collected or API keys not configured</p>
                <p><strong>Solution:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Go to Competitors page and run "Start Scraping"</li>
                  <li>Wait for scraping to complete (5-10 minutes)</li>
                  <li>In Price Comparison, click "Refresh IDC Products"</li>
                  <li>Add your Algolia API key in Settings for real iDC products</li>
                </ol>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2">⏱️ Scraping is very slow or fails</h4>
              <div className="text-gray-600 text-sm space-y-1">
                <p><strong>Cause:</strong> Network issues or competitor website changes</p>
                <p><strong>Solution:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Check your internet connection</li>
                  <li>Wait and retry - competitor websites may be temporarily slow</li>
                  <li>Don't close the app during scraping</li>
                  <li>If scraping fails repeatedly, contact support</li>
                </ol>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2">🔄 App shows "Cannot GET /" error</h4>
              <div className="text-gray-600 text-sm space-y-1">
                <p><strong>Cause:</strong> Server not properly started or port conflicts</p>
                <p><strong>Solution:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Close and restart the application</li>
                  <li>The app automatically finds available ports (3005, 3006, etc.)</li>
                  <li>Wait a few seconds for the server to fully start</li>
                  <li>Check if antivirus is blocking the application</li>
                </ol>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2">📊 Low matching confidence scores</h4>
              <div className="text-gray-600 text-sm space-y-1">
                <p><strong>Cause:</strong> Products have different naming conventions or missing embeddings</p>
                <p><strong>Solution:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Add OpenAI API key in Settings for better matching</li>
                  <li>Generate embeddings using the "Generate Embeddings" button</li>
                  <li>Use manual matching for products the AI can't match</li>
                  <li>Lower the confidence threshold in Settings to see more matches</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-800">Still Having Issues?</h4>
                <p className="mt-1 text-sm text-red-700">
                  If problems persist, check the browser console (F12) for error messages, and contact your system administrator 
                  with specific error details and steps to reproduce the issue.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Help & Documentation</h1>
          <p className="mt-2 text-gray-600">
            Complete guide to using the Competitor Dashboard for pricing intelligence and MAP enforcement
          </p>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1 sticky top-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            {sections.find(section => section.id === activeSection)?.content}
          </div>
        </div>
      </div>
    </>
  )
}