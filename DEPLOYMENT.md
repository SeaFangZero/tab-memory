# 🚀 Deployment Guide

## 📋 **Deployment Options**

### **Option 1: Railway (Recommended)**
Free tier: 500 hours/month, automatic HTTPS, easy setup

### **Option 2: Render**  
Free tier: 750 hours/month, slower cold starts

### **Option 3: Vercel**
Free tier for serverless functions

---

## 🚂 **Railway Deployment**

### **Prerequisites**
1. [Railway Account](https://railway.app) (free)
2. GitHub repository with your code
3. Supabase database set up

### **Step 1: Prepare Repository**
```bash
# Ensure all files are committed
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### **Step 2: Deploy to Railway**
1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `tab-memory` repository
5. Select the `api` folder as root directory

### **Step 3: Configure Environment Variables**
In Railway dashboard → **Variables** tab:

```env
NODE_ENV=production
PORT=3000
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
JWT_SECRET=your-production-jwt-secret-make-it-long-and-random
REFRESH_TOKEN_SECRET=your-production-refresh-secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
LOG_LEVEL=info
```

### **Step 4: Custom Domain (Optional)**
1. Go to **Settings** → **Domains**
2. Add custom domain: `api.tabmemory.com`
3. Update DNS records as shown

### **Step 5: Test Deployment**
```bash
curl https://your-app.railway.app/health
```

---

## 🎨 **Render Deployment**

### **Step 1: Create Render Account**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### **Step 2: Create Web Service**
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository
3. Configure:
   - **Name**: `tab-memory-api`
   - **Root Directory**: `api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### **Step 3: Environment Variables**
Same as Railway configuration above.

### **Step 4: Deploy**
Render will automatically deploy on push to main branch.

---

## ⚡ **Vercel Deployment (Serverless)**

### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

### **Step 2: Configure Vercel**
Create `api/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### **Step 3: Deploy**
```bash
cd api
vercel --prod
```

---

## 🔧 **Post-Deployment Configuration**

### **Update Extension Configuration**
Update the extension to use your deployed API:

1. **Edit** `extension/dist/background.js`:
```javascript
const API_BASE_URL = 'https://your-app.railway.app'; // Your deployed URL
```

2. **Update manifest.json**:
```json
{
  "host_permissions": [
    "https://your-app.railway.app/*"
  ]
}
```

3. **Reload extension** in Chrome

### **Test End-to-End Flow**
1. Open extension popup
2. Should show "API Connected" 
3. Browse some tabs
4. Check Railway logs for incoming events
5. Verify data in Supabase dashboard

---

## 📊 **Monitoring & Logs**

### **Railway Logs**
```bash
# Install Railway CLI
npm install -g @railway/cli

# View logs
railway logs
```

### **Health Monitoring**
- Railway: Built-in metrics dashboard
- Render: Metrics in service dashboard
- Custom: Use `/health` endpoint

### **Database Monitoring**
- Supabase: Built-in dashboard
- Query performance insights
- Connection pool monitoring

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Build Failures**
```bash
# Check build logs
railway logs --deployment

# Common fixes:
npm install --save-dev typescript
npm run build
```

#### **Database Connection**
```bash
# Test connection
curl https://your-app.railway.app/health

# Check environment variables
railway variables
```

#### **CORS Errors**
Update API CORS configuration:
```javascript
app.use(cors({
  origin: ['chrome-extension://*', 'https://your-domain.com'],
  credentials: true
}));
```

### **Performance Optimization**
1. **Enable compression** (already configured)
2. **Use connection pooling** (already configured) 
3. **Add Redis caching** (Phase 3)
4. **CDN for static assets** (if needed)

---

## 💰 **Cost Estimates**

### **Free Tier Limits**
- **Railway**: 500 hours/month (~20 days)
- **Render**: 750 hours/month (~31 days)
- **Supabase**: 2 databases, 500MB storage
- **Vercel**: 100GB bandwidth, 12 functions

### **Scaling Costs**
- **Railway Pro**: $5/month (unlimited hours)
- **Render Pro**: $7/month (unlimited hours)
- **Supabase Pro**: $25/month (8GB storage)

For Phase 2, free tiers are sufficient for testing and initial users.

---

## ✅ **Deployment Checklist**

- [ ] Supabase database created and migrated
- [ ] Environment variables configured
- [ ] API deployed to Railway/Render
- [ ] Health check endpoint responding
- [ ] Extension configured with production API URL
- [ ] End-to-end test completed
- [ ] Monitoring and logging set up
- [ ] Documentation updated with production URLs
