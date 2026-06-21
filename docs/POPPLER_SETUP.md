# Poppler Installation Guide for OCR Feature

The OCR feature (for scanned PDFs) requires **Poppler** to be installed on your system.

## What is Poppler?

Poppler is a PDF rendering library that includes utilities for converting PDF pages to images. Our OCR feature uses it to convert scanned PDF pages into images, which are then processed by AI vision models to extract text.

## Installation Instructions

### Windows

1. **Download Poppler for Windows:**
   - Go to: https://github.com/oschwartz10612/poppler-windows/releases/
   - Download the latest release (e.g., `Release-24.08.0-0.zip`)

2. **Extract the ZIP file:**
   - Extract to a permanent location (e.g., `C:\Program Files\poppler-24.08.0`)

3. **Add to System PATH:**
   - Open System Properties → Advanced → Environment Variables
   - Under "System variables", find and select "Path"
   - Click "Edit" → "New"
   - Add the path to the `bin` folder: `C:\Program Files\poppler-24.08.0\Library\bin`
   - Click OK to save

4. **Verify Installation:**
   ```cmd
   pdftoppm -v
   ```
   You should see version information if installed correctly.

5. **Restart your development server** after installation.

### macOS

```bash
brew install poppler
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install poppler-utils
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install poppler-utils
```

## Verifying Installation

After installation, run this command in your terminal:

```bash
pdftoppm -v
```

If you see version information, Poppler is installed correctly!

## What Happens Without Poppler?

- **Text-based PDFs** will work fine (they don't need OCR)
- **Scanned/image-based PDFs** will fail with a helpful error message directing users to install Poppler

## Alternative: Use Text-Based PDFs Only

If you don't want to install Poppler, you can:
1. Only upload text-based PDFs (not scanned documents)
2. Convert scanned PDFs to text-based PDFs using online OCR tools first
3. Use PDF editing software to add a text layer to scanned documents

## Troubleshooting

### "pdftoppm not found" error
- Make sure Poppler's `bin` folder is in your system PATH
- Restart your terminal/IDE after adding to PATH
- On Windows, make sure you added the correct path (should end with `\Library\bin`)

### OCR still not working after installation
- Restart your Next.js development server (`npm run dev`)
- Verify Poppler is in PATH: `pdftoppm -v`
- Check server logs for specific error messages

## Production Deployment

For production environments (Vercel, Netlify, etc.), you'll need to:
1. Use a platform that supports custom system dependencies
2. Or pre-process scanned PDFs before upload
3. Or disable OCR feature and only accept text-based PDFs

**Note:** Vercel and most serverless platforms don't support custom system binaries like Poppler. For production OCR, consider:
- Using a dedicated OCR service (AWS Textract, Google Vision API)
- Pre-processing PDFs on a server with Poppler installed
- Accepting only text-based PDFs in production
