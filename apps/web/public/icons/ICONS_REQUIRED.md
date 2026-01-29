# PWA Icons Required

Generate these icons from the favicon.svg source file.

## Required Icon Sizes

| File | Size | Purpose |
|------|------|---------|
| icon-16x16.png | 16x16 | Favicon small |
| icon-32x32.png | 32x32 | Favicon standard |
| icon-72x72.png | 72x72 | PWA icon |
| icon-96x96.png | 96x96 | PWA icon |
| icon-128x128.png | 128x128 | PWA icon |
| icon-144x144.png | 144x144 | MS Tile |
| icon-152x152.png | 152x152 | Apple Touch |
| icon-192x192.png | 192x192 | PWA icon (Android) |
| icon-384x384.png | 384x384 | PWA icon |
| icon-512x512.png | 512x512 | PWA splash |
| maskable-192x192.png | 192x192 | Maskable (safe zone) |
| maskable-512x512.png | 512x512 | Maskable (safe zone) |

## Apple Touch Icon
- /apple-touch-icon.png (180x180)

## Screenshots (for PWA install prompt)
- /screenshots/mobile-clock-in.png (540x720)
- /screenshots/mobile-dashboard.png (540x720)

## Generation Command (using ImageMagick)

```bash
# From apps/web/public directory
for size in 16 32 72 96 128 144 152 192 384 512; do
  convert favicon.svg -resize ${size}x${size} icons/icon-${size}x${size}.png
done

# Maskable icons (with padding for safe zone)
convert favicon.svg -resize 144x144 -gravity center -extent 192x192 -background "#1e40af" icons/maskable-192x192.png
convert favicon.svg -resize 384x384 -gravity center -extent 512x512 -background "#1e40af" icons/maskable-512x512.png

# Apple touch icon
convert favicon.svg -resize 180x180 apple-touch-icon.png
```

## Alternative: Use pwa-asset-generator

```bash
npx pwa-asset-generator favicon.svg public/icons --background "#1e40af" --splash-only false
```
