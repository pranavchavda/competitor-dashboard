'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Heading, Subheading } from '@/components/heading'
import { ChevronRightIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/20/solid'

export default function HelpPage() {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Heading>Help & Support</Heading>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Complete guide to using the MAP Enforcement Dashboard
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { id: 'overview', title: 'System Overview', description: 'What this system does' },
          { id: 'getting-started', title: 'Getting Started', description: 'First steps and setup' },
          { id: 'dashboard', title: 'Dashboard Guide', description: 'Understanding the metrics' },
          { id: 'competitors', title: 'Competitor Management', description: 'Scraping and monitoring' },
          { id: 'comparison-items', title: 'Comparison Items', description: 'Products available for matching' },
          { id: 'price-comparison', title: 'Price Analysis', description: 'Finding MAP violations' },
          { id: 'troubleshooting', title: 'Troubleshooting', description: 'Common issues and fixes' },
          { id: 'api-reference', title: 'API Reference', description: 'Technical endpoints' }
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className="rounded-lg border border-zinc-200 p-4 text-left hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{section.title}</div>
                <div className="text-sm text-zinc-500">{section.description}</div>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-zinc-400" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 space-y-12">
        {/* System Overview */}
        <section id="overview">
          <Subheading>System Overview</Subheading>
          <div className="mt-4 space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              The MAP Enforcement Dashboard is designed to monitor retail partners who violate Minimum Advertised Price (MAP) agreements. 
              It automatically scrapes competitor websites, matches products with your catalog, and identifies pricing violations.
            </p>
            
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Key Purpose</h4>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Monitor retail partners (Home Coffee Solutions, The Kitchen Barista, Cafe Liegeois) to ensure they comply with MAP pricing agreements for ECM, Profitec, and Eureka products.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="font-medium text-purple-600">Data Collection</div>
                <div className="text-sm text-zinc-500 mt-1">Scrapes competitor websites for product pricing</div>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="font-medium text-blue-600">Smart Matching</div>
                <div className="text-sm text-zinc-500 mt-1">Uses AI to match products across different stores</div>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="font-medium text-red-600">Violation Detection</div>
                <div className="text-sm text-zinc-500 mt-1">Identifies when partners price below your levels</div>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section id="getting-started">
          <Subheading>Getting Started</Subheading>
          <div className="mt-4 space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Step 1: Scrape Competitor Data</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400 ml-4">
                <li>Go to <strong>Competitors</strong> page</li>
                <li>Click <strong>"Scrape All Competitors"</strong> or scrape individual competitors</li>
                <li>Wait for scraping to complete (shows products found for each competitor)</li>
                <li>Verify data in <strong>Comparison Items</strong> page</li>
              </ol>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Step 2: Generate Product Matches</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400 ml-4">
                <li>Go to <strong>Price Comparison</strong> page</li>
                <li>Click <strong>"Generate Matches"</strong></li>
                <li>System will fetch IDC products and match them with competitor data</li>
                <li>Wait for matching to complete (may take 1-2 minutes)</li>
              </ol>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Step 3: Review MAP Violations</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400 ml-4">
                <li>Check the <strong>Dashboard</strong> for violation summary</li>
                <li>Use <strong>Price Comparison</strong> to see detailed violations</li>
                <li>Click source badges to visit competitor product pages</li>
                <li>Filter by confidence level and specific competitors</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Dashboard Guide */}
        <section id="dashboard">
          <Subheading>Dashboard Guide</Subheading>
          <div className="mt-4 space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              The dashboard provides a high-level overview of your MAP enforcement status.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium">Key Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Products Monitored:</strong> Total competitor products being tracked</div>
                  <div><strong>MAP Violations:</strong> Products priced below your levels (top 100 matches, 30%+ confidence)</div>
                  <div><strong>Revenue at Risk:</strong> Total dollar amount lost to undercutting</div>
                  <div><strong>Competitors Tracked:</strong> Number of active competitor sources</div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Competitor Status</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Active:</strong> Competitor data is current</div>
                  <div><strong>Products:</strong> Number of products tracked per competitor</div>
                  <div><strong>Avg Price Difference:</strong> How their pricing compares to yours</div>
                  <div><strong>Updated:</strong> Last time data was refreshed</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Competitors */}
        <section id="competitors">
          <Subheading>Competitor Management</Subheading>
          <div className="mt-4 space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              The Competitors page manages data collection from retail partner websites.
            </p>

            <div className="space-y-4">
              <h4 className="font-medium">How Scraping Works</h4>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-sm">
                <div className="space-y-2">
                  <div><strong>Smart Strategy:</strong> Uses Shopify JSON endpoints for efficient data collection</div>
                  <div><strong>Brand Focused:</strong> Only scrapes ECM, Profitec, and Eureka products</div>
                  <div><strong>Rate Limited:</strong> Respectful delays to avoid overloading competitor servers</div>
                  <div><strong>Data Stored:</strong> Products saved to database with pricing, images, and metadata</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Competitor Sources</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
                  <div className="font-medium">Home Coffee Solutions</div>
                  <div className="text-sm text-zinc-500">homecoffeesolutions.com</div>
                  <div className="text-xs text-zinc-400 mt-1">~70+ products</div>
                </div>
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
                  <div className="font-medium">The Kitchen Barista</div>
                  <div className="text-sm text-zinc-500">thekitchenbarista.com</div>
                  <div className="text-xs text-zinc-400 mt-1">~30+ products</div>
                </div>
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
                  <div className="font-medium">Cafe Liegeois</div>
                  <div className="text-sm text-zinc-500">cafeliegeois.ca</div>
                  <div className="text-xs text-zinc-400 mt-1">~25+ products</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Items */}
        <section id="comparison-items">
          <Subheading>Comparison Items</Subheading>
          <div className="mt-4 space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              View all products available for price comparison and matching.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium">IDC Products Tab</h4>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                  <div>• Shows products fetched from Algolia search</div>
                  <div>• Filtered for ECM, Profitec, Eureka brands</div>
                  <div>• Espresso machines and grinders only</div>
                  <div>• Excludes openbox items</div>
                  <div>• Used as baseline for MAP enforcement</div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Competitors Tab</h4>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                  <div>• Shows scraped competitor products</div>
                  <div>• Filter by source and brand</div>
                  <div>• View pricing and product details</div>
                  <div>• See when products were added</div>
                  <div>• Verify scraping completeness</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Price Comparison */}
        <section id="price-comparison">
          <Subheading>Price Analysis & MAP Enforcement</Subheading>
          <div className="mt-4 space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              The core MAP enforcement tool for identifying and tracking pricing violations.
            </p>

            <div className="space-y-4">
              <h4 className="font-medium">How Product Matching Works</h4>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-sm space-y-2">
                <div><strong>Brand Matching:</strong> Only compares same brands (ECM vs ECM, Profitec vs Profitec)</div>
                <div><strong>AI Similarity:</strong> Uses OpenAI embeddings for semantic product matching</div>
                <div><strong>Confidence Scoring:</strong> Combines brand, title, type, and price similarity</div>
                <div><strong>MAP Detection:</strong> Flags when competitor price &lt; IDC price</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Understanding the Results</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Badge color="red" className="mt-1">MAP VIOLATION</Badge>
                  <div className="text-sm">
                    <div className="font-medium">Red badges indicate pricing violations</div>
                    <div className="text-zinc-500">Shows percentage below IDC price and dollar amount</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Badge color="green" className="mt-1">Compliant</Badge>
                  <div className="text-sm">
                    <div className="font-medium">Green badges show compliant pricing</div>
                    <div className="text-zinc-500">Competitor price is at or above IDC price</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Badge color="blue" className="mt-1">Source Link</Badge>
                  <div className="text-sm">
                    <div className="font-medium">Clickable source badges</div>
                    <div className="text-zinc-500">Click to visit competitor product page for verification</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Filter Options</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="font-medium text-sm">Source Filter</div>
                  <div className="text-xs text-zinc-500">View violations from specific competitors</div>
                </div>
                <div>
                  <div className="font-medium text-sm">Confidence Level</div>
                  <div className="text-xs text-zinc-500">30%, 50%, or 70% minimum match confidence</div>
                </div>
                <div>
                  <div className="font-medium text-sm">MAP Violations Only</div>
                  <div className="text-xs text-zinc-500">Hide compliant products, show only violations</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section id="troubleshooting">
          <Subheading>Troubleshooting</Subheading>
          <div className="mt-4 space-y-6">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Common Issues</h4>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <div>• If scraping fails, competitor website structure may have changed</div>
                    <div>• If no matches found, try lowering confidence threshold</div>
                    <div>• If wrong products matched, verify brand names in product titles</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Problem: No Products Found When Scraping</h4>
              <div className="ml-4 space-y-2 text-sm">
                <div><strong>Check:</strong> Competitor website is accessible</div>
                <div><strong>Verify:</strong> Brand collections still exist (ECM, Profitec, Eureka)</div>
                <div><strong>Solution:</strong> May need to update scraping endpoints</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Problem: Generate Matches Shows No Results</h4>
              <div className="ml-4 space-y-2 text-sm">
                <div><strong>Check:</strong> Competitor data was scraped first</div>
                <div><strong>Verify:</strong> IDC products are available in Algolia</div>
                <div><strong>Try:</strong> Lower confidence threshold to 10%</div>
                <div><strong>Debug:</strong> Check browser console for error messages</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Problem: Dashboard Shows Wrong Numbers</h4>
              <div className="ml-4 space-y-2 text-sm">
                <div><strong>Solution:</strong> Dashboard now uses same logic as Price Comparison</div>
                <div><strong>Scope:</strong> Shows top 100 matches with 30%+ confidence</div>
                <div><strong>Refresh:</strong> Click "Refresh Data" to update metrics</div>
              </div>
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section id="api-reference">
          <Subheading>API Reference</Subheading>
          <div className="mt-4 space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              Technical reference for the system's API endpoints.
            </p>

            <div className="space-y-4">
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="font-mono text-sm font-medium">POST /api/competitors/scrape</div>
                <div className="text-sm text-zinc-500 mt-1">Scrape competitor product data</div>
                <div className="text-xs text-zinc-400 mt-2">Body: {"{ competitors: ['home_coffee_solutions'] }"}</div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="font-mono text-sm font-medium">POST /api/products/match</div>
                <div className="text-sm text-zinc-500 mt-1">Generate product matches and detect violations</div>
                <div className="text-xs text-zinc-400 mt-2">Returns: Match results with confidence scores</div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="font-mono text-sm font-medium">GET /api/products/match</div>
                <div className="text-sm text-zinc-500 mt-1">Retrieve stored product matches</div>
                <div className="text-xs text-zinc-400 mt-2">Params: min_confidence, source, page, limit</div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="font-mono text-sm font-medium">GET /api/dashboard/stats</div>
                <div className="text-sm text-zinc-500 mt-1">Dashboard metrics and competitor status</div>
                <div className="text-xs text-zinc-400 mt-2">Returns: Violations, revenue at risk, competitor data</div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="font-mono text-sm font-medium">GET /api/debug/products</div>
                <div className="text-sm text-zinc-500 mt-1">Debug information about stored products</div>
                <div className="text-xs text-zinc-400 mt-2">Returns: Product counts, samples, competitor breakdown</div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact">
          <Subheading>Need More Help?</Subheading>
          <div className="mt-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="text-center">
                <div className="font-medium">Technical Support</div>
                <div className="text-sm text-zinc-500 mt-1">
                  For technical issues, feature requests, or questions about the MAP enforcement system
                </div>
                <div className="mt-4">
                  <div className="text-sm">
                    <strong>Email:</strong> pranav@idrinkcoffee.com
                  </div>
                  <div className="text-sm mt-1">
                    <strong>System Version:</strong> v1.0 - MAP Enforcement Dashboard
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}