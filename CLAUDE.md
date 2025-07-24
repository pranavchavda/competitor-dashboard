# Competitor Price Monitoring Dashboard - Claude Code Instructions

This is a Next.js 15.4.3 web application that monitors competitor pricing for iDrinkCoffee.com across three major competitors. The system scrapes competitor data, matches products using similarity algorithms, and provides real-time price comparison insights.

## Project Overview

**Purpose**: Monitor and analyze competitor pricing for espresso machines and grinders to maintain competitive advantage for iDrinkCoffee.com.

**Competitors Monitored**:
- Home Coffee Solutions (homecoffeesolutions.com) - 398 products
- The Kitchen Barista (thekitchenbarista.com) - 269 products  
- Cafe Liegeois (cafeliegeois.ca) - 72 products

**Target Brands**: ECM, Profitec, Eureka (premium coffee equipment brands)

## Current State & Architecture

### ✅ **Completed Features**

**Frontend (Next.js + Catalyst UI):**
- **Dashboard** (`/`): Real-time metrics, competitor status, recent alerts
- **Competitors** (`/competitors`): Scraping controls, product listings per competitor
- **Price Comparison** (`/price-comparison`): Product matching with confidence scoring
- **Alerts** (`/alerts`): Alert management with filtering and status updates

**Backend APIs:**
- `/api/products/idc` - Fetches iDrinkCoffee products via Algolia search
- `/api/competitors/scrape` - Scrapes competitor data using Shopify JSON endpoints
- `/api/products/match` - Product matching using similarity algorithms
- `/api/dashboard/stats` - Dashboard metrics and alerts data

**Web Scraping System:**
- **Smart Strategy**: Uses Shopify JSON endpoints (`/collections/{brand}/products.json`)
- **Hybrid Approach**: Collections for most competitors, search API for Kitchen Barista
- **Rate Limited**: Respectful delays between requests
- **Brand-Focused**: Targets ECM, Profitec, Eureka specifically

### 🚧 **Current Issues & Next Steps**

1. **Price Comparison Not Working**: "Run Price Analysis" shows no results
   - Fixed API calls but needs testing
   - Added debugging logs to trace data flow

2. **Product Matching Accuracy**: Current algorithm is basic keyword-based
   - Need semantic similarity using OpenAI embeddings
   - Store embeddings in SQLite for fast querying
   - Extract features (PID, E61, dual boiler, etc.)

3. **Data Display Issues**: Some vendor names and pricing showing incorrectly
   - Price normalization fixed but needs verification
   - Vendor field correctly shows brand (ECM, Profitec, etc.)

## Technical Implementation

### **Scraping Strategy**

**Collections (Brand-Specific):**
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

**Data Normalization:**
- Extracts price from `product.variants[0].price`
- Converts string prices to numbers
- Filters for espresso machines and grinders
- Adds competitor source metadata

### **Product Matching Algorithm (Current)**
```
Brand Matching: 40% weight
Title Similarity: 30% weight  
Product Type: 20% weight
Price Proximity: 10% weight
Confidence Threshold: 30%
```

### **Planned Embeddings System**

**Database Schema (SQLite):**
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  vendor TEXT,
  price REAL,
  sku TEXT,
  features TEXT,
  embedding BLOB,
  created_at DATETIME
);

CREATE TABLE product_matches (
  idc_product_id TEXT,
  competitor_product_id TEXT,
  similarity_score REAL,
  price_difference REAL
);
```

**Feature Extraction:**
- Boiler types (dual/single boiler)
- Controls (PID, E61 group)
- Grinder types (burr, conical, flat)
- Materials (stainless steel, brass)
- Model numbers and SKUs

## Development Workflow

### **Environment Setup**
```bash
# Required environment variables
SHOPIFY_SHOP_URL=https://idrinkcoffee.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_***

# For embeddings (when implemented)
OPENAI_API_KEY=sk-***
DATABASE_URL=./competitor_products.db
```

### **Development Commands**
```bash
npm run dev      # Start development server (http://localhost:3001)
npm run build    # Build for production
npm run lint     # Run linting
```

### **File Structure**
```
src/
├── app/
│   ├── (app)/                    # Main app pages
│   │   ├── page.tsx             # Dashboard
│   │   ├── competitors/         # Competitor management
│   │   ├── price-comparison/    # Product matching
│   │   └── alerts/              # Alert management
│   └── api/                     # Backend API routes
│       ├── products/idc/        # IDC product fetching
│       ├── competitors/scrape/  # Competitor scraping
│       ├── products/match/      # Product matching
│       └── dashboard/stats/     # Dashboard data
├── components/                  # Catalyst UI components
└── styles/                     # Tailwind CSS
```

## Key Data Sources

### **iDrinkCoffee Products (Algolia)**
```javascript
fetch('https://M71W3IRVX3-dsn.algolia.net/1/indexes/idc_products/query', {
  headers: {
    "X-Algolia-API-Key": "f4080b5c70ce601c85706444675a8a04",
    "X-Algolia-Application-Id": "M71W3IRVX3"
  },
  body: JSON.stringify({ params: "filters=product_type:espresso OR product_type:grinder" })
})
```

### **Competitor Endpoints**
```
Home Coffee Solutions:
https://homecoffeesolutions.com/collections/profitec/products.json

Kitchen Barista:  
https://thekitchenbarista.com/collections/profitec/products.json
https://thekitchenbarista.com/search.json?q=ecm

Cafe Liegeois:
https://cafeliegeois.ca/collections/profitec/products.json
```

## Business Logic

### **Price Analysis**
- Positive price difference = iDC has lower prices (competitive advantage)
- Negative price difference = competitor has lower prices (need action)
- Confidence scoring helps prioritize reliable matches
- Focus on premium brands where margins matter most

### **Alert System**
- Price drops by competitors (opportunity to raise prices)
- Price increases by competitors (opportunity to gain market share)
- New products from competitors (market intelligence)
- Out of stock situations (opportunity to capture demand)

## Known Issues & Debugging

### **Current Debugging Points**
1. Check browser console logs when running "Price Analysis"
2. Verify competitor scraping returns products with correct price format
3. Ensure IDC product filtering works with Algolia
4. Test product matching algorithm with real data

### **Common Problems**
- **$NaN prices**: Fixed by proper price extraction from variants
- **No matches found**: Usually due to API errors or data format issues
- **Slow scraping**: Rate limited to be respectful to competitor servers
- **Empty collections**: Some competitors may not have brand-specific collections

## Future Enhancements

### **Phase 1: Embeddings (High Priority)**
- Implement OpenAI embeddings for semantic product matching
- SQLite database for fast similarity queries
- Feature extraction for better matching accuracy

### **Phase 2: Automation**
- Scheduled scraping (every 6-24 hours)
- Automated alerts via email/Slack
- Price change trend analysis

### **Phase 3: Intelligence**
- Market share analysis
- Pricing strategy recommendations
- Competitor inventory tracking
- Seasonal pricing patterns

## Important Notes

- **Rate Limiting**: Always include delays between scraping requests
- **Error Handling**: Gracefully handle 404s and timeout errors
- **Data Quality**: Validate price formats and product data before processing
- **Respectful Scraping**: Use appropriate user agents and respect robots.txt
- **Security**: Never commit API keys or sensitive data

## Troubleshooting Guide

**If scraping fails:**
1. Check if competitor website structure changed
2. Verify collection names still exist
3. Test individual product JSON endpoints
4. Check for rate limiting or IP blocks

**If matching is poor:**
1. Review confidence thresholds
2. Check data quality (missing fields, wrong formats)
3. Test with known product pairs manually
4. Consider implementing embeddings for better accuracy

**If performance is slow:**
1. Optimize database queries
2. Add caching for frequently accessed data
3. Implement background job processing
4. Consider pagination for large datasets

This system provides a solid foundation for competitive intelligence and pricing strategy for iDrinkCoffee.com's premium coffee equipment business.