# 🚀 Deployment & Cache Busting Guide

## Overview
This guide ensures that ALL updates work immediately on mobile and desktop when you deploy to your VPS, with ZERO caching issues.

## How It Works

### 1. **Server-Side Cache Busting** (server.js)
- **BUILD_TIMESTAMP**: Generated on every server start (Date.now())
- **BUILD_VERSION**: Generated on every server start (ISO timestamp)
- **Cache-Control Headers**: Set to `no-cache, no-store, must-revalidate, max-age=0` for:
  - All `.js` files
  - All `.css` files
  - All `.json` files
  - `/sw.js` route
  - `/manifest.json` route
- **ETag Headers**: Set to BUILD_TIMESTAMP for validation

### 2. **Service Worker Cache Busting** (sw.js)
- **Dynamic Cache Name**: Uses `Date.now()` to create unique cache on every SW load
- **Aggressive Cleanup**: Deletes ALL old `padoo-delivery-*` caches on activation
- **Immediate Claim**: Takes control of all clients immediately

### 3. **Client-Side Version Check** (pwa-utils.js)
- **Automatic Version Check**: Checks `/api/version` on app load
- **Version Mismatch Detection**: If server version differs from stored version:
  - Clears all browser caches
  - Forces hard reload (bypass cache)
- **Stored Version**: Saved in localStorage for comparison

## Deployment Steps

### Step 1: Upload Files to VPS
```bash
# Upload these files to your VPS:
- server.js (updated with BUILD_TIMESTAMP and cache headers)
- sw.js (updated with dynamic cache name)
- pwa-utils.js (updated with version checking)
- mainapp/delivery/js/app.js (your app changes)
- Any other modified files
```

### Step 2: Restart Server
```bash
# SSH into your VPS and run:
pm2 stop server
pm2 start server.js

# Or if using pm2 with ecosystem file:
pm2 restart ecosystem.config.js

# Verify it's running:
pm2 logs server
```

### Step 3: Verify on Desktop
1. **Hard refresh** browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Open console**: F12
3. **Check logs** for:
   - `🚀 Server starting with BUILD_VERSION: v...`
   - `✅ App is up to date`
4. **Test functionality**: Accept order, check time updates, verify layout

### Step 4: Verify on Mobile
1. **Hard refresh** app: `Ctrl+Shift+R` or `Cmd+Shift+R`
2. **Clear app cache**:
   - **iOS**: Settings → Safari → Clear History and Website Data
   - **Android**: Settings → Apps → Your App → Storage → Clear Cache & Clear Data
3. **Uninstall PWA** (if installed):
   - **iOS**: Home Screen → Long press app → Remove
   - **Android**: Long press app → Uninstall
4. **Reinstall PWA**:
   - Open app in browser
   - Install prompt should appear
   - Install as PWA
5. **Test functionality**: Accept order, check time updates, verify layout

## What Gets Cached and When

### ✅ NEVER Cached (Always Fresh)
- `/sw.js` - Service Worker
- `/manifest.json` - PWA Manifest
- `/mainapp/delivery/js/app.js` - Main app JS
- `/mainapp/delivery/css/*.css` - All CSS files
- `/api/version` - Version check endpoint
- All `.json` files

### ✅ Cached for 1 Day
- `/icons/*.png` - App icons
- `/icons/*.svg` - SVG files

### ✅ Cached for 1 Week
- Images (`.jpg`, `.jpeg`, `.png`)

## Troubleshooting

### Issue: Changes not showing on mobile
**Solution:**
1. Clear app cache (see Step 4 above)
2. Uninstall and reinstall PWA
3. Hard refresh: `Ctrl+Shift+R`
4. Check browser console for errors

### Issue: Old Service Worker still active
**Solution:**
1. Go to DevTools → Application → Service Workers
2. Click "Unregister" on old service workers
3. Hard refresh the page
4. New Service Worker should register automatically

### Issue: Stuck on old version
**Solution:**
1. Clear browser cache completely
2. Clear app storage: Settings → Apps → Your App → Storage → Clear All
3. Restart browser/app
4. Hard refresh

## Verification Checklist

After deployment, verify:
- [ ] Server logs show new BUILD_VERSION
- [ ] `/api/version` returns new timestamp
- [ ] Browser console shows "✅ App is up to date"
- [ ] Accept order stays on current page
- [ ] Time updates every minute
- [ ] Layout is symmetric
- [ ] No console errors
- [ ] Works on desktop
- [ ] Works on mobile (after cache clear)

## Key Files Modified

1. **server.js**
   - Added BUILD_TIMESTAMP and BUILD_VERSION
   - Updated static file serving with cache headers
   - Updated /sw.js and /manifest.json routes
   - Added /api/version endpoint

2. **sw.js**
   - Changed CACHE_NAME to use Date.now()
   - Updated activate event to delete all old caches
   - Added aggressive cache cleanup

3. **pwa-utils.js**
   - Added checkServerVersion() method
   - Checks version on app load
   - Clears caches and reloads if version mismatch

## Important Notes

⚠️ **CRITICAL**: Every time you run `pm2 start server.js`:
- A NEW BUILD_TIMESTAMP is generated
- Service Worker cache is invalidated
- All old caches are deleted
- Clients will automatically reload if version changed

✅ **This ensures**: Updates work immediately with ZERO caching issues!

## Support

If you encounter any issues:
1. Check server logs: `pm2 logs server`
2. Check browser console: F12
3. Check Network tab for cache headers
4. Verify `/api/version` returns correct timestamp

