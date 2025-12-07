# Simplified Gallery Web View

A standalone, minimal photo gallery view that provides a clean, simple interface for viewing family photos without admin features or complex filtering.

## Features

- **Clean, simple design**: Easy-to-use photo grid layout
- **No authentication required**: Perfect for public sharing
- **Responsive**: Works on mobile, tablet, and desktop
- **Lightweight**: Single HTML file with embedded CSS and JavaScript
- **Modal view**: Click any photo to see it full-size
- **People tags**: Shows who appears in each photo
- **Statistics**: Displays total photo and people counts

## Accessing the Simplified Gallery

### Development Mode

1. Start the API server:
   ```bash
   cd api
   python server.py
   ```

2. Start the web dev server:
   ```bash
   cd web
   npm run dev
   ```

3. Open your browser to:
   ```
   http://localhost:3000/gallery.html
   ```

### Production Build

1. Build the web assets:
   ```bash
   cd web
   npm run build
   ```

2. The gallery will be built to `web/dist/gallery.html`

3. Serve the built files with your API server or any static file server

## How It Works

The simplified gallery:

1. **Fetches photos** from the `/api/photos` endpoint
2. **Loads face details** for each photo to show people tags
3. **Displays photos** in a responsive grid
4. **Shows statistics** about your photo collection
5. **Provides modal view** for full-size images

## Differences from Main Gallery

| Feature | Main Gallery (React) | Simplified Gallery |
|---------|---------------------|-------------------|
| Technology | React + Vite | Vanilla HTML/JS |
| Admin Features | ✓ | ✗ |
| Complex Filtering | ✓ | ✗ |
| Person Selection | ✓ | ✗ |
| Family Tree | ✓ | ✗ |
| Timeline View | ✓ | ✗ |
| Simple Photo Grid | ✓ | ✓ |
| People Tags | ✓ | ✓ |
| Modal View | ✓ | ✓ |
| Mobile Responsive | ✓ | ✓ |

## Use Cases

- **Public sharing**: Share your photo collection without exposing admin features
- **Read-only access**: Let people view photos without ability to modify
- **Embedded view**: Include in other websites or applications
- **Lightweight option**: When you don't need the full React app
- **Quick preview**: Fast-loading simple view of your collection

## Customization

The gallery can be easily customized by editing `/web/gallery.html`:

- **Colors**: Modify the CSS variables in the `<style>` section
- **Layout**: Adjust grid columns in `.gallery` CSS
- **Photo limit**: Change the `limit` parameter in the API call
- **Statistics**: Add/remove stat items in the HTML

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- IE11+ (with polyfills)
