# 🗄️ Supabase Database Setup

## 📋 **Step-by-Step Setup**

### **1. Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** 
3. Sign up/in with GitHub
4. Click **"New Project"**
5. Choose organization and project name: `tab-memory`
6. Generate a strong database password
7. Select region closest to you
8. Click **"Create new project"**

### **2. Get Connection Details**
After project creation (takes ~2 minutes):

#### **Database Connection String:**
1. Go to **Settings** → **Database** (left sidebar)
2. Scroll down to **Connection parameters** section
3. Look for **Connection string** and select **URI** tab
4. Copy the connection string that looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   
   **Alternative location if not found above:**
   - Go to **Settings** → **Database** → **Connection pooling**
   - Look for **Connection string** under **Direct connection**

#### **API Keys:**
1. Go to **Settings** → **API** (left sidebar)
2. Copy the following:
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon public key**: Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role secret key**: Also starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)

### **3. Configure Environment Variables**
Update your `.env` file with Supabase credentials:

```env
# Supabase Configuration
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### **4. Enable pgvector Extension**
1. In Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Run this command:
```sql
CREATE EXTENSION IF NOT EXISTS "vector";
```
4. Click **"Run"**

### **5. Run Schema Migration**
1. In Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Copy the contents of `api/src/db/supabase-schema.sql`
4. Paste and click **"Run"**
5. Verify tables were created in **Table Editor**

### **6. Disable RLS for API Access (Temporary)**
For API server access, temporarily disable RLS:

```sql
-- Disable RLS for API server access (we handle auth in middleware)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE tabs DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE vectors DISABLE ROW LEVEL SECURITY;
```

### **7. Test Connection**
```bash
cd api
npm run dev
curl http://localhost:3000/health
```

## 🔒 **Security Notes**

- **Service Role Key**: Keep secret, never expose to client
- **Anon Key**: Safe for client use, limited permissions
- **Database Password**: Store securely, used for direct connections
- **RLS**: Re-enable after setting up proper auth policies

## 🚀 **Next Steps**

After successful setup:
1. ✅ API can connect to Supabase PostgreSQL
2. ✅ All existing endpoints work unchanged
3. ✅ Data persists in cloud database
4. ✅ Ready for extension integration

## 🐛 **Troubleshooting**

### Connection Issues
- Check database password in connection string
- Verify project reference ID is correct
- Ensure your IP isn't blocked (Supabase allows all by default)

### Extension Issues
- Make sure pgvector extension is enabled
- Check that all tables were created successfully
- Verify indexes were created for performance

### Authentication Issues
- Confirm service role key is set correctly
- Check that RLS is disabled for API access
- Verify JWT secret matches between services
