# Competitor Dashboard API Documentation

## Overview

This application provides a comprehensive price monitoring dashboard for iDrinkCoffee.com to track competitor pricing across three major competitors:
- Home Coffee Solutions (homecoffeesolutions.com)
- The Kitchen Barista (thekitchenbarista.com)  
- Cafe Liegeois (cafeliegeois.ca)

## API Endpoints

### 1. IDC Products API

**GET** `/api/products/idc`

Fetches iDrinkCoffee products from Algolia search index.

**Query Parameters:**
- `q` (string): Search query
- `page` (number): Page number (default: 0)
- `filters` (string): Algolia filters (e.g., "product_type:espresso OR product_type:grinder")

**Response:**
```json
{
  "products": [
    {
      "objectID": "string",
      "title": "string",
      "handle": "string",
      "vendor": "string",
      "product_type": "string",
      "price": 0,
      "available": true,
      "variants": []
    }
  ],
  "total": 0,
  "page": 0,
  "totalPages": 0
}
```

### 2. Competitor Scraping API

**GET** `/api/competitors/scrape`

Scrapes individual competitor data.

**Query Parameters:**
- `competitor` (string): Competitor key (home-coffee-solutions, kitchen-barista, cafe-liegeois)
- `collection` (string): Collection to scrape (default: espresso-machines)
- `product` (string): Individual product handle to scrape

**POST** `/api/competitors/scrape`

Bulk scrapes all competitors.

**Request Body:**
```json
{
  "competitors": ["home-coffee-solutions", "kitchen-barista", "cafe-liegeois"],
  "collections": ["espresso-machines", "coffee-grinders"]
}
```

**Response:**
```json
{
  "results": [
    {
      "competitor": "string",
      "collection": "string", 
      "products": [],
      "total": 0,
      "scraped_at": "ISO date string"
    }
  ],
  "total_scraped": 0
}
```

### 3. Product Matching API

**POST** `/api/products/match`

Matches iDrinkCoffee products with competitor products using similarity algorithms.

**Request Body:**
```json
{
  "idc_products": [],
  "competitor_products": [
    {
      "competitor": "string",
      "products": []
    }
  ]
}
```

**Response:**
```json
{
  "matches": [
    {
      "idc_product": {},
      "competitor_matches": [
        {
          "competitor": "string",
          "product": {},
          "confidence": 0.85,
          "price_difference": -50.00,
          "price_difference_percent": -7.14
        }
      ],
      "best_match": {}
    }
  ],
  "total_matches": 0,
  "stats": {}
}
```

### 4. Dashboard Statistics API

**GET** `/api/dashboard/stats`

Returns dashboard statistics and recent alerts.

**Response:**
```json
{
  "stats": {
    "products_monitored": 85,
    "active_alerts": 3,
    "competitors_tracked": 3,
    "avg_savings_opportunity": 156.75
  },
  "competitor_status": [
    {
      "name": "string",
      "domain": "string",
      "status": "Active",
      "last_updated": "30m ago",
      "products_tracked": 28,
      "avg_price_difference": -5.2
    }
  ],
  "recent_alerts": []
}
```

**PATCH** `/api/dashboard/stats`

Updates dashboard statistics.

## Web Pages

### 1. Dashboard (/)
- Overview metrics
- Competitor status cards
- Recent alerts table
- Real-time data fetching

### 2. Competitors (/competitors)
- Individual competitor management
- Scraping controls
- Product listings per competitor

### 3. Price Comparison (/price-comparison)
- Product matching interface
- Price difference analysis
- Competitive advantage calculations

### 4. Alerts (/alerts)
- Alert management and filtering
- Status updates (new, acknowledged, resolved)
- Alert history

## Product Matching Algorithm

The system uses a multi-factor similarity algorithm to match products:

1. **Brand Matching (40% weight)**: Exact or partial brand name matches
2. **Title Similarity (30% weight)**: Text similarity after cleaning common terms
3. **Product Type (20% weight)**: Category matching (espresso machine, grinder, etc.)
4. **Price Similarity (10% weight)**: Proximity of pricing

**Confidence Scoring:**
- 90%+ : Excellent match
- 70-89%: Good match  
- 50-69%: Fair match
- <50%: Poor match (filtered out)

## Competitor Scraping Strategy

The system leverages Shopify's JSON endpoints available on all competitor sites:

1. **Collection Endpoints**: `/collections/{collection-name}.json`
2. **Product Endpoints**: `/products/{product-handle}.json`
3. **Sitemap Discovery**: Uses sitemap.xml for comprehensive product discovery

**Rate Limiting**: 1-second delays between requests to be respectful to competitor servers.

## Data Flow

1. **IDC Product Fetching**: Algolia search API provides structured product data
2. **Competitor Scraping**: Shopify JSON endpoints provide competitor product data  
3. **Product Matching**: Similarity algorithm creates product associations
4. **Price Analysis**: Calculates differences and competitive advantages
5. **Alert Generation**: Monitors price changes and generates notifications

## Environment Variables

Required environment variables (not included in repo):
```
SHOPIFY_SHOP_URL=https://idrinkcoffee.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_***
```

## Technology Stack

- **Frontend**: Next.js 15.4.3, React, TypeScript
- **UI Components**: Tailwind CSS, Catalyst UI Kit
- **Data Fetching**: Algolia Search API, Axios
- **Deployment**: Vercel-ready static generation

## Usage Notes

- Focus on espresso machines and grinders initially
- Competitor data updates every 30-40 minutes
- Product matching confidence threshold set at 30%
- Price differences calculated as (competitor_price - idc_price)
- Positive differences indicate iDC has lower prices (competitive advantage)