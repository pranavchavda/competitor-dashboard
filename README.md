# Competitor Price Monitoring Dashboard

A cross-platform desktop application for monitoring competitor pricing across major coffee equipment retailers. Built with Next.js 15.4.3 and Tauri, providing real-time price comparison insights for iDrinkCoffee.com's premium espresso machines and grinders.

## 🚀 Features

- **Multi-Platform Desktop App**: Linux, Windows, macOS support
- **Real-Time Competitor Monitoring**: Tracks pricing from 3 major retailers
- **Smart Product Matching**: AI-powered similarity algorithms with confidence scoring
- **Price Analysis Dashboard**: Visual insights into competitive positioning
- **Alert System**: Automated notifications for price changes and MAP violations
- **Ethical Scraping**: Respectful data collection with rate limiting

## 🏪 Monitored Competitors

- **Home Coffee Solutions** (~398 products)
- **The Kitchen Barista** (~269 products)  
- **Cafe Liegeois** (~72 products)

**Focus Brands**: ECM, Profitec, Eureka premium coffee equipment

## 📦 Installation

### Download Pre-built Binaries

Visit the [Releases](https://github.com/pranavchavda/competitor-dashboard/releases) page to download:

- **Linux**: AppImage, Deb, RPM packages
- **Windows**: MSI installer + standalone EXE + **Windows Portable ZIP**
- **macOS**: Universal DMG (Intel + Apple Silicon)

### Windows Portable Distribution

For maximum compatibility and ease of deployment, use the **Windows Portable ZIP**:

1. **Download**: `competitor-dashboard-windows-portable.zip` (87MB)
2. **Extract**: Unzip to any folder (no installation required)
3. **Run**: Double-click `Competitor Dashboard.bat`
4. **Features**: 
   - ✅ No Node.js installation required (includes portable runtime)
   - ✅ Complete SQLite database with Prisma ORM
   - ✅ All dependencies bundled
   - ✅ Automatic browser opening
   - ✅ Works on Windows 7+ (including Windows 11)

### Linux (AppImage)

```bash
# Download and make executable
chmod +x competitor-dashboard.AppImage

# Run the application
./competitor-dashboard.AppImage
```

### Windows

Double-click the MSI installer or use silent install:
```cmd
msiexec /i competitor-dashboard.msi /quiet
```

### macOS

Mount the DMG and drag to Applications folder.

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- Rust toolchain (for Tauri)
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/pranavchavda/competitor-dashboard.git
cd competitor-dashboard

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev

# Run as desktop app
npm run tauri:dev
```

### Build Commands

```bash
# Build web version
npm run build

# Build desktop app (current platform)
npm run tauri:build

# Multi-platform builds (via GitHub Actions)
git push origin main

# Build Windows Portable Distribution
npm run build:windows-portable
# OR manually:
node build-windows-portable.js
bash create-windows-zip.sh
```

## ⚙️ Configuration

### Optional Settings

- **OpenAI API Key**: Enable semantic product matching with embeddings
- **Confidence Thresholds**: Adjust matching sensitivity (70%, 80%, 90%)
- **Scraping Intervals**: Configure update frequencies

Settings are accessible through the in-app Settings page.

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15.4.3 + TypeScript
- **UI Framework**: Catalyst UI Kit (Tailwind CSS)
- **Desktop**: Tauri (Rust-based)
- **Database**: SQLite with Prisma ORM
- **AI/ML**: OpenAI embeddings (optional)
- **CI/CD**: GitHub Actions

### Data Flow

1. **Scraping**: Ethical collection from Shopify JSON endpoints
2. **Normalization**: Price extraction and format standardization
3. **Matching**: Similarity algorithms with confidence scoring
4. **Analysis**: Price comparison and trend detection
5. **Alerts**: Automated notifications for significant changes

## 📊 Key Metrics

- **Price Differences**: Competitive advantage analysis
- **Match Confidence**: Algorithm reliability scoring
- **MAP Violations**: Minimum Advertised Price monitoring
- **Revenue at Risk**: Financial impact calculations

## 🔒 Security & Ethics

### Data Protection
- All data stored locally (SQLite)
- No personal information collected
- API keys never transmitted externally

### Ethical Scraping
- Respects robots.txt guidelines
- Conservative rate limiting (2-3 second delays)
- Honest bot identification
- Public data only

## 🤝 Contributing

This is a private tool for iDrinkCoffee.com, but contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Submit a pull request

## 📋 Requirements

### Runtime
- **Linux**: Any modern distribution with GUI support
- **Windows**: Windows 10+ (64-bit)
- **macOS**: macOS 10.14+ (Intel/Apple Silicon)

### Development
- Node.js 18+
- Rust toolchain
- 4GB+ RAM for builds

## 📈 Roadmap

### Phase 1: Enhanced Matching
- [ ] Full OpenAI embeddings integration
- [ ] Advanced feature extraction
- [ ] Model number correlation

### Phase 2: Business Intelligence
- [ ] Market share analysis
- [ ] Automated pricing recommendations
- [ ] Seasonal pattern detection

### Phase 3: Automation
- [ ] Scheduled background scraping
- [ ] Email/Slack alert integration
- [ ] API connections to pricing systems

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**: Ensure `npx prisma generate` has been run
2. **Empty Results**: Check internet connectivity and Algolia API
3. **Slow Performance**: Increase confidence thresholds to reduce matches
4. **Security Warnings**: App is not code-signed (future enhancement)

### Windows Portable Issues

**If the Windows portable app fails to start:**

1. **Prisma Query Engine Missing**:
   ```bash
   # Run the fix script
   bash fix-windows-query-engine.sh
   ```

2. **Module Resolution Errors**:
   - Ensure you're running on native Windows (not WSL)
   - Try the unbundled version: `bash create-unbundled-windows.sh`

3. **Browser Won't Open**: 
   - Manually navigate to `http://localhost:3005`
   - Check Windows firewall settings

### Debug Endpoints

- `/api/debug/products` - Matching statistics
- `/api/embeddings/update?dry_run=true` - Test embeddings
- Browser DevTools for API monitoring

## 📄 License

Copyright © 2025 iDrinkCoffee.com. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 📞 Support

For technical support or feature requests, please open an issue on GitHub or contact the development team.

**Built for iDrinkCoffee.com's competitive intelligence needs** ☕