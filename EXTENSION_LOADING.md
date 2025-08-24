# Loading the Tab Memory Extension

## 🚀 Quick Start

The Tab Memory extension is now ready to load into Chrome! Here's how:

### 1. Open Chrome Extensions Page
- Open Chrome browser
- Navigate to `chrome://extensions/`
- Or go to **Chrome Menu** → **More Tools** → **Extensions**

### 2. Enable Developer Mode
- Toggle **Developer mode** ON (top right corner)

### 3. Load the Extension
- Click **Load unpacked**
- Navigate to: `/Users/armaankhan/Desktop/group_manager/extension/dist/`
- Select the `dist` folder and click **Open**

### 4. Pin the Extension (Optional)
- Click the puzzle piece icon in Chrome toolbar
- Find "Tab Memory" and click the pin icon
- The Tab Memory icon will now appear in your toolbar

## 🧪 Testing the Extension

### Check Installation
1. **Extension Icon**: Look for the Tab Memory icon (blue square with "TM")
2. **Click Icon**: Opens the popup showing "Extension Loaded!"
3. **Background Script**: Check `chrome://extensions/` → Tab Memory → "service worker"

### Monitor Tab Events
1. **Open/Close Tabs**: The extension captures all tab events
2. **Background Console**: Click "service worker" to see event logs
3. **Storage**: Check Chrome DevTools → Application → Storage → Extension

### Expected Behavior
- ✅ Extension loads without errors
- ✅ Popup opens when clicking icon
- ✅ Background script logs tab events
- ✅ Events stored in Chrome extension storage
- ⏳ API sync (requires API server setup)

## 🔧 Development Mode

The extension is currently in **Phase 1** - basic tab monitoring:

- **Working**: Tab event capture, local storage
- **Phase 2**: Session clustering, restoration
- **Phase 3**: AI summaries, vector search

## 📊 Viewing Activity

### Background Script Console
```
1. Go to chrome://extensions/
2. Find "Tab Memory"
3. Click "service worker"
4. View console logs for tab events
```

### Extension Storage
```
1. Right-click extension icon → Inspect popup
2. Go to Application tab → Storage → Extension
3. View stored events and configuration
```

## 🐛 Troubleshooting

### Extension Won't Load
- Check that you selected the `dist` folder, not the `extension` folder
- Ensure Developer mode is enabled
- Check for manifest errors in Chrome

### CSP Errors (Fixed)
- ✅ Content Security Policy errors have been resolved
- ✅ Inline scripts moved to external files
- ✅ Proper CSP configuration in manifest

### No Tab Events
- Check background script console for errors
- Verify permissions are granted
- Try opening/closing tabs to trigger events

### API Connection Issues
- API server not required for Phase 1
- Local storage works independently
- Check console for network errors

## 🚀 Next Steps

1. **Test Basic Functionality**: Open/close tabs and verify events are captured
2. **Set up API Server**: Follow instructions in main README for full functionality
3. **Monitor Development**: Background script logs all activity

The extension is now running and monitoring your browsing sessions! 🎉
