# Product Matching with OpenAI Embeddings

## Strategy

Use OpenAI embeddings to create semantic similarity matching between IDC and competitor products.

## Implementation Plan

### 1. Database Schema (SQLite)

```sql
-- Products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL, -- 'idc' or competitor name
  title TEXT NOT NULL,
  vendor TEXT,
  product_type TEXT,
  price REAL,
  sku TEXT,
  description TEXT,
  features TEXT, -- JSON array of extracted features
  handle TEXT,
  embedding BLOB, -- Stored as binary
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product matches table  
CREATE TABLE product_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idc_product_id TEXT,
  competitor_product_id TEXT,
  similarity_score REAL,
  price_difference REAL,
  price_difference_percent REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idc_product_id) REFERENCES products (id),
  FOREIGN KEY (competitor_product_id) REFERENCES products (id)
);
```

### 2. Embedding Generation

**Product Text for Embedding:**
```typescript
function generateProductText(product: Product): string {
  const parts = [
    product.vendor,
    product.title,
    product.product_type,
    product.sku,
    extractModelNumber(product.title),
    extractFeatures(product.description || product.title)
  ].filter(Boolean)
  
  return parts.join(' ')
}
```

**Feature Extraction:**
```typescript
function extractFeatures(text: string): string[] {
  const features = []
  
  // Boiler types
  if (text.match(/dual.?boiler|double.?boiler/i)) features.push('dual_boiler')
  if (text.match(/single.?boiler/i)) features.push('single_boiler')
  
  // Controls
  if (text.match(/\bPID\b/i)) features.push('pid_control')
  if (text.match(/\bE61\b/i)) features.push('e61_group')
  
  // Grinder types
  if (text.match(/burr.?grinder/i)) features.push('burr_grinder')
  if (text.match(/conical.?burr/i)) features.push('conical_burr')
  if (text.match(/flat.?burr/i)) features.push('flat_burr')
  
  // Materials
  if (text.match(/stainless.?steel/i)) features.push('stainless_steel')
  if (text.match(/\bbrass\b/i)) features.push('brass')
  
  return features
}
```

### 3. API Endpoints

#### `/api/embeddings/generate`
- Generate embeddings for products
- Store in SQLite database
- Batch processing for efficiency

#### `/api/embeddings/match`
- Find similar products using cosine similarity
- Return matches above threshold (e.g., 0.8)
- Include price differences

### 4. Similarity Calculation

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}
```

### 5. Workflow

1. **Data Ingestion**:
   - Scrape competitor products
   - Fetch IDC products from Algolia
   - Extract features and generate embeddings
   - Store in SQLite

2. **Matching**:
   - Query similar products using vector similarity
   - Apply business rules (price range, category)
   - Calculate price differences
   - Store matches

3. **Dashboard**:
   - Display matched products with confidence scores
   - Show price advantages/disadvantages
   - Allow manual review and confirmation

### 6. Environment Variables

```bash
OPENAI_API_KEY=sk-...
DATABASE_URL=./competitor_products.db
```

### 7. Libraries Needed

```json
{
  "openai": "^4.0.0",
  "sqlite3": "^5.1.6",
  "better-sqlite3": "^9.0.0"
}
```

## Benefits

- **Better Matching**: Semantic understanding vs keyword matching
- **Persistent Storage**: SQLite for fast querying
- **Incremental Updates**: Only generate embeddings for new products
- **Scalable**: Can handle thousands of products efficiently
- **Explainable**: Feature extraction provides transparency

## Implementation Priority

1. Database setup and basic embedding generation
2. Product ingestion from existing APIs
3. Similarity matching algorithm
4. Integration with price comparison page
5. Performance optimization and caching