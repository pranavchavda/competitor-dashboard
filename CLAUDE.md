# Competitor Price Monitoring Dashboard - Claude Code Instructions

This is a Next.js 15.4.3 desktop application built with Tauri that monitors competitor pricing for iDrinkCoffee.com across major coffee equipment retailers. The system scrapes competitor data, matches products using similarity algorithms, and provides real-time price comparison insights through a modern desktop interface.

## Project Overview

**Purpose**: Monitor and analyze competitor pricing for premium espresso machines and grinders to maintain competitive advantage for iDrinkCoffee.com.

**Technology Stack**:
- **Frontend**: Next.js 15.4.3 with TypeScript
- **UI**: Catalyst UI Kit (Tailwind CSS components)
- **Desktop**: Tauri (Rust-based framework)
- **Database**: SQLite with Prisma ORM
- **AI**: OpenAI embeddings for semantic product matching
- **Build**: GitHub Actions for multi-platform releases

## Competitors Monitored

- **Home Coffee Solutions** (homecoffeesolutions.com) - ~398 products
- **The Kitchen Barista** (thekitchenbarista.com) - ~269 products
- **Cafe Liegeois** (cafeliegeois.ca) - ~72 products

**Target Brands**: ECM, Profitec, Eureka (premium coffee equipment brands)

## Application Architecture

### Frontend Pages
- **Dashboard** (`/`): Real-time metrics, competitor status, recent alerts
- **Competitors** (`/competitors`): Scraping controls, product listings per competitor
- **Price Comparison** (`/price-comparison`): Product matching with confidence scoring
- **Alerts** (`/alerts`): Alert management with filtering and status updates
- **Settings** (`/settings`): OpenAI API key configuration

### Backend APIs
- `/api/products/idc` - Fetches iDrinkCoffee products via Algolia search
- `/api/competitors/scrape` - Scrapes competitor data using Shopify JSON endpoints
- `/api/products/match` - Product matching using similarity algorithms
- `/api/dashboard/stats` - Dashboard metrics and alerts data
- `/api/embeddings/update` - Updates OpenAI embeddings for products

## Data Sources

### iDrinkCoffee Products (Algolia)
The app fetches product data from iDrinkCoffee's Algolia search index:
```javascript
// Public API endpoint - no authentication required
https://M71W3IRVX3-dsn.algolia.net/1/indexes/idc_products/query
```

### Competitor Scraping Strategy
**Smart Brand-Focused Approach**:
```
Home Coffee Solutions & Cafe Liegeois:
├── /collections/ecm/products.json
├── /collections/profitec/products.json  
└── /collections/eureka/products.json

Kitchen Barista (Hybrid):
├── /collections/profitec/products.json
├── /search.json?q=ecm (47 products)
└── /search.json?q=eureka (159 products)
```

**Key Features**:
- Uses Shopify JSON endpoints (faster than HTML scraping)
- Brand-specific collection targeting
- Rate-limited and respectful scraping
- Automatic price normalization

## Product Matching System

### Current Algorithm
```
Brand Matching: 40% weight
Title Similarity: 30% weight  
Product Type: 20% weight
Price Proximity: 10% weight
Confidence Threshold: 30% (configurable: 70%, 80%, 90%)
```

### Planned Enhancements (Embeddings)
- **Semantic Similarity**: OpenAI text-embedding-3-small
- **Feature Extraction**: PID controllers, E61 groups, dual boilers, etc.
- **SQLite Storage**: Fast similarity queries with indexed embeddings
- **Advanced Matching**: Brand + model number + feature recognition

## Configuration

### Environment Variables
```bash
# Required for embeddings (optional for basic functionality)
OPENAI_API_KEY=sk-***

# Database (auto-generated SQLite file)
DATABASE_URL=file:./competitor_products.db
```

### Settings Management
The app stores settings in `/settings` page:
- **OpenAI API Key**: For semantic product matching
- **Confidence Thresholds**: 70%, 80%, 90% matching levels
- **Scraping Intervals**: Configurable update frequencies

## Development Workflow

### Setup Commands
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev

# Build for production
npm run build

# Build desktop app
npm run tauri:build
```

### Desktop Development
```bash
# Run in desktop mode (opens Tauri window)
npm run tauri:dev

# Build for current platform
npm run tauri:build

# Build for specific platform (via GitHub Actions)
git push origin main  # Triggers multi-platform builds
```

## Key Business Logic

### Price Analysis
- **Positive price difference** = iDC has lower prices (competitive advantage)
- **Negative price difference** = competitor has lower prices (action needed)
- **MAP Violations**: Automated detection of Minimum Advertised Price violations
- **Revenue at Risk**: Calculated from price difference × estimated sales volume

### Alert System
- **Price drops by competitors** (opportunity to raise prices)
- **Price increases by competitors** (opportunity to gain market share)  
- **New products from competitors** (market intelligence)
- **MAP violations** (pricing policy enforcement)

## Technical Implementation Details

### Scraping Best Practices
- **Rate Limiting**: 2-3 second delays between requests
- **User Agent Rotation**: Respectful bot identification
- **Error Handling**: Graceful 404 and timeout handling
- **Data Validation**: Price format verification before storage

### TypeScript Configuration
The app uses strict TypeScript checking, especially important for Windows builds:
```typescript
// Always use explicit types for callback parameters
products.map((product: any) => ({ ... }))
products.filter((item: any) => item.condition)

// Prisma client lazy initialization
let prisma: PrismaClient | null = null
function getPrismaClient() {
  if (!prisma) prisma = new PrismaClient()
  return prisma
}
```

## Deployment & Distribution

### GitHub Actions CI/CD
Automated builds for:
- **Linux**: AppImage, Deb, RPM packages
- **Windows**: MSI installer + standalone EXE
- **macOS**: Universal DMG (Intel + Apple Silicon)

### Installation Methods
```bash
# Linux AppImage
chmod +x competitor-dashboard.AppImage
./competitor-dashboard.AppImage

# Windows MSI
# Double-click installer or use silent install:
msiexec /i competitor-dashboard.msi /quiet

# macOS DMG
# Mount and drag to Applications folder
```

## Troubleshooting

### Common Issues
1. **Build Failures**: Run `npx prisma generate` before building
2. **Empty Results**: Check Algolia API connectivity
3. **Scraping Errors**: Verify competitor website structure hasn't changed
4. **Matching Issues**: Adjust confidence thresholds in settings

### Debug Endpoints
- `/api/debug/products` - Product matching statistics
- `/api/embeddings/update?dry_run=true` - Test embedding updates
- Browser DevTools → Network tab - API call monitoring

## Security & Compliance

### Data Protection
- **Local Storage**: All data stored locally in SQLite
- **No Personal Data**: Only public product information
- **API Keys**: Stored locally, never transmitted to external services

### Ethical Scraping
- **robots.txt Compliance**: Respects crawler guidelines
- **Rate Limiting**: Conservative request intervals
- **User Agent**: Honest bot identification
- **Terms of Service**: Compliant with public data access

## Important Development Notes

- **Windows Builds**: Require stricter TypeScript checking - always add explicit types
- **Prisma**: Must run `prisma generate` before building
- **Tauri**: Uses Rust backend with Node.js frontend bridge
- **Desktop Distribution**: No code signing implemented yet (users may see security warnings)
- **Database**: SQLite file auto-created on first run, no manual setup required

This system provides comprehensive competitive intelligence while maintaining ethical data collection practices and delivering actionable insights for iDrinkCoffee.com's pricing strategy.