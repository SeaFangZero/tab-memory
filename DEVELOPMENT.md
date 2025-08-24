# Development Guide

## Quick Start

1. **Setup the project**:
```bash
npm run setup
```

2. **Set up PostgreSQL database**:
```bash
# Create database
createdb tabmemory

# Copy and configure environment
cp api/env.example api/.env
# Edit api/.env with your database credentials

# Run migrations
npm run migrate
```

3. **Start development servers**:
```bash
# Terminal 1: API server (http://localhost:3000)
npm run start:api

# Terminal 2: Extension build watcher
npm run start:extension
```

4. **Load extension in Chrome**:
   - Open Chrome → Extensions → Developer mode ON
   - Click "Load unpacked" → Select `extension/dist/` folder
   - Pin the Tab Memory extension to toolbar

## Project Structure

```
tab-memory/
├── shared/           # Shared types and utilities
│   ├── src/
│   │   ├── types/    # Data model interfaces
│   │   ├── ai/       # AI provider interfaces
│   │   └── utils/    # URL utilities, etc.
│   └── package.json
├── extension/        # Chrome extension
│   ├── src/
│   │   ├── background/  # Service worker
│   │   ├── popup/       # React popup UI
│   │   ├── content/     # Content script
│   │   └── icons/       # Extension icons
│   ├── manifest.json    # Extension manifest
│   └── webpack.config.js
├── api/             # Node.js API server
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── middleware/ # Auth, validation, etc.
│   │   ├── db/         # Database connection & schema
│   │   └── utils/      # Logging, etc.
│   └── package.json
└── package.json     # Root workspace config
```

## Development Workflow

### Phase 1: Foundation (Current)
- ✅ Tab event monitoring
- ✅ Data storage and sync
- ✅ User authentication
- ✅ Basic UI

### Phase 2: Core Features (Next)
- Session clustering
- Tab restoration
- Cross-device sync

### Phase 3: AI Features (Future)
- Session summaries
- Vector search
- Screenshot capture

## Key Files to Know

### Extension
- `extension/src/background/index.ts` - Main service worker
- `extension/src/background/tab-event-handler.ts` - Tab monitoring
- `extension/src/popup/components/PopupApp.tsx` - Main UI

### API
- `api/src/index.ts` - Server entry point
- `api/src/routes/` - All API endpoints
- `api/src/db/schema.sql` - Database schema

### Shared
- `shared/src/types/index.ts` - Data model types
- `shared/src/ai/interfaces.ts` - AI provider interfaces

## Testing the Extension

1. **Open popup**: Click extension icon in toolbar
2. **Monitor background**: Check `chrome://extensions` → Tab Memory → "service worker"
3. **View storage**: Chrome DevTools → Application → Storage → Extension
4. **Check API**: `curl http://localhost:3000/health`

## Database Management

```bash
# Run migrations
npm run migrate

# Connect to database
psql tabmemory

# View tables
\dt

# View events
SELECT * FROM events ORDER BY ts DESC LIMIT 10;
```

## API Testing

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Common Issues

### Extension not loading
- Check `extension/dist/` exists after build
- Verify manifest.json is valid
- Check browser console for errors

### API connection fails
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify port 3000 is available

### CORS errors
- Extension requests should work automatically
- For web testing, check CORS configuration

## Code Style

- Use TypeScript strict mode
- Follow existing patterns
- Add JSDoc comments for public APIs
- Prefer explicit over implicit types

## Performance Considerations

- Tab events are batched for efficiency
- Local storage has size limits
- API includes rate limiting
- Database queries are indexed

## Security Notes

- Never log sensitive data
- URLs are automatically redacted
- JWT tokens have expiration
- Input validation on all endpoints
