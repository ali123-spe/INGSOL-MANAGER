import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Helper function to decode HTML entities
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// SSRF prevention: Check if host resolves to local or private range
function isPrivateIP(hostname) {
  if (hostname === 'localhost' || hostname === 'localhost.localdomain') return true;
  if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') return true;
  
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    const parts = hostname.split('.').map(Number);
    if (parts.some(p => p < 0 || p > 255)) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
  }
  
  if (hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) return true;
  return false;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'link-preview-api',
      configureServer(server) {
        server.middlewares.use('/api/link-preview', async (req, res) => {
          try {
            const reqUrl = new URL(req.url, 'http://localhost');
            const urlStr = reqUrl.searchParams.get('url');

            if (!urlStr) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'URL parameter is required' }));
              return;
            }

            if (!/^https?:\/\//i.test(urlStr)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Only HTTP/HTTPS URLs are allowed' }));
              return;
            }

            let parsedUrl;
            try {
              parsedUrl = new URL(urlStr);
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid URL' }));
              return;
            }

            if (isPrivateIP(parsedUrl.hostname)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Access to private network addresses is restricted' }));
              return;
            }

            // Fetch target page
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(urlStr, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();

            const extractMeta = (htmlContent, key) => {
              const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
              const regexes = [
                new RegExp(`<meta[^>]*?(?:property|name)=["']${escapedKey}["'][^>]*?content=["']([^"']*)["']`, 'i'),
                new RegExp(`<meta[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${escapedKey}["']`, 'i')
              ];
              for (const regex of regexes) {
                const match = htmlContent.match(regex);
                if (match) return decodeHtmlEntities(match[1]);
              }
              return null;
            };

            const extractTitleTag = (htmlContent) => {
              const match = htmlContent.match(/<title[^>]*>([^<]*)<\/title>/i);
              return match ? decodeHtmlEntities(match[1].trim()) : null;
            };

            const extractLinkImage = (htmlContent) => {
              const regexes = [
                /<link[^>]*?rel=["']image_src["'][^>]*?href=["']([^"']*)["']/i,
                /<link[^>]*?href=["']([^"']*)["'][^>]*?rel=["']image_src["']/i
              ];
              for (const regex of regexes) {
                const match = htmlContent.match(regex);
                if (match) return decodeHtmlEntities(match[1]);
              }
              return null;
            };

            const extractFirstImage = (htmlContent) => {
              const imgRegex = /<img[^>]*?src=["']([^"']*)["']/gi;
              let match;
              const images = [];
              while ((match = imgRegex.exec(htmlContent)) !== null) {
                const src = decodeHtmlEntities(match[1]);
                if (src) images.push(src);
              }
              const suitable = images.find(src => !src.includes('icon') && !src.includes('logo') && !src.endsWith('.gif') && !src.endsWith('.svg'));
              return suitable || images[0] || null;
            };

            const makeAbsolute = (urlToResolve, baseUrl) => {
              if (!urlToResolve) return null;
              try {
                return new URL(urlToResolve, baseUrl).href;
              } catch {
                return urlToResolve;
              }
            };

            const title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTitleTag(html) || '';
            const description = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || extractMeta(html, 'description') || '';
            let image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || extractMeta(html, 'twitter:image:src') || extractMeta(html, 'image') || extractLinkImage(html) || extractFirstImage(html) || '';
            const canonicalUrl = extractMeta(html, 'og:url') || urlStr;

            if (image) {
              image = makeAbsolute(image, urlStr);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              url: makeAbsolute(canonicalUrl, urlStr),
              title,
              description,
              image
            }));

          } catch (error) {
            console.error('Error fetching link preview:', error.message);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              url: '',
              title: '',
              description: '',
              image: ''
            }));
          }
        });
      }
    }
  ],
})

