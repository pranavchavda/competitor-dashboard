# MAP Enforcement Dashboard - Deployment Guide

## Overview

This Next.js application includes its own production web server and doesn't require Express or additional frameworks. It runs as a Node.js process behind nginx as a reverse proxy.

## Production Architecture

```
Internet → Nginx (port 80/443) → Next.js server (port 3000)
```

## Deployment Steps

### 1. Server Prerequisites

Ensure your Ubuntu server has:
- Node.js (18+)
- npm or yarn
- nginx
- PM2 (for process management): `npm install -g pm2`

### 2. Upload and Setup Code

```bash
# Upload your code to server (via git, scp, etc.)
cd /path/to/map-enforcement-dashboard

# Install dependencies
npm install

# Set up production environment variables
cp .env.example .env
# Edit .env with production values
```

### 3. Required Environment Variables

Edit `.env` file with production values:

```env
# Database
DATABASE_URL="file:./production.db"

# Shopify API (required for product matching)
SHOPIFY_SHOP_URL="https://idrinkcoffee.myshopify.com"
SHOPIFY_ACCESS_TOKEN="your-production-shopify-token"

# OpenAI API (required for embeddings)
OPENAI_API_KEY="your-production-openai-key"

# Authentication
ALLOWED_EMAILS="pranav@idrinkcoffee.com,sj@idrinkcoffee.com"
AUTH_PASSWORD="your-secure-production-password"

# Optional: Shopify Wholesale
SHOPIFY_WHOLESALE_URL="https://your-wholesale-store.myshopify.com"
SHOPIFY_WHOLESALE_TOKEN="your-wholesale-token"
```

### 4. Build and Database Setup

```bash
# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push

# Build for production
npm run build
```

### 5. Configure Nginx

Create nginx configuration file: `/etc/nginx/sites-available/map-dashboard`

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Optional: Redirect HTTP to HTTPS
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# Optional: HTTPS configuration
# server {
#     listen 443 ssl;
#     server_name your-domain.com;
#     
#     ssl_certificate /path/to/ssl/certificate.crt;
#     ssl_certificate_key /path/to/ssl/private.key;
#     
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#         proxy_read_timeout 86400;
#     }
# }
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/map-dashboard /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 6. Start with PM2 (Recommended)

```bash
# Start the application with PM2
pm2 start npm --name "map-dashboard" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server boot
pm2 startup
# Follow the instructions PM2 provides
```

### 7. Alternative: Create systemd Service

Create `/etc/systemd/system/map-dashboard.service`:

```ini
[Unit]
Description=MAP Enforcement Dashboard
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/map-enforcement-dashboard
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable map-dashboard
sudo systemctl start map-dashboard
sudo systemctl status map-dashboard
```

## Production Commands

```bash
# Build for production
npm run build

# Start production server
npm start

# Check PM2 status
pm2 status

# View logs
pm2 logs map-dashboard

# Restart application
pm2 restart map-dashboard

# Stop application
pm2 stop map-dashboard
```

## SSL/HTTPS Setup (Recommended)

### Using Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (certbot usually sets this up automatically)
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### Log Files
- **Application logs**: `pm2 logs map-dashboard`
- **Nginx logs**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

### Health Checks
- **Application**: `curl http://localhost:3000`
- **Through nginx**: `curl http://your-domain.com`

### Database Backups
```bash
# Backup SQLite database
cp /path/to/map-enforcement-dashboard/production.db /backups/map-dashboard-$(date +%Y%m%d).db

# Automated backup script (add to crontab)
0 2 * * * cp /path/to/production.db /backups/map-dashboard-$(date +\%Y\%m\%d).db
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild application
npm run build

# Restart with PM2
pm2 restart map-dashboard
```

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   - Check: `lsof -i :3000`
   - Kill process: `kill -9 <PID>`

2. **Permission errors**
   - Ensure proper file permissions
   - Check PM2 is running as correct user

3. **Database connection errors**
   - Verify SQLite file permissions
   - Check DATABASE_URL in .env

4. **Nginx 502 Bad Gateway**
   - Ensure Next.js server is running on port 3000
   - Check nginx error logs: `tail -f /var/log/nginx/error.log`

### Performance Optimization

1. **Enable gzip in nginx**:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

2. **PM2 Cluster Mode** (if needed):
```bash
pm2 start npm --name "map-dashboard" -i max -- start
```

## Security Considerations

1. **Environment Variables**: Never commit production .env to version control
2. **Firewall**: Only expose ports 80, 443, and SSH
3. **Updates**: Keep Node.js, nginx, and system packages updated
4. **Authentication**: Change default password before deployment
5. **HTTPS**: Always use SSL certificates in production

## Key Differences from Remix/Cloudflare

- **Server-based deployment** (not edge/serverless)
- **Built-in Next.js server** (no Express needed)
- **File-based routing** in `/app` directory
- **API routes** in `/app/api` become REST endpoints
- **Traditional Node.js process** management

## Support

For deployment issues:
- Check Next.js documentation: https://nextjs.org/docs/deployment
- PM2 documentation: https://pm2.keymetrics.io/docs/
- Nginx documentation: https://nginx.org/en/docs/