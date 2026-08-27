import { defineConfig, loadEnv } from 'vite'
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
        
        server.middlewares.use('/api/assistant', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          const env = loadEnv('', process.cwd(), '');
          const apiKey = env.GEMINI_API_KEY;

          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'GEMINI_API_KEY is missing on the server.' }));
            return;
          }

          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const { messages, currentPage } = JSON.parse(body);

              if (!messages || !Array.isArray(messages)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'messages array is required' }));
              }

              const systemInstruction = `You are INGSOL AI, the built-in conversational helper for INGSOL Manager. 
Think like a helpful product assistant sitting beside the customer. Your goal is for the customer to understand what to do with the least amount of effort.

BEHAVIOR & TONE:
- Understand what the user is trying to accomplish and give the minimum useful information needed to move them forward.
- Use simple, natural language.
- Do not dump every possible instruction at once.
- Do not repeat information the user already knows or explain fields/options they didn't ask about.
- Give step-by-step guidance only when the user actually needs it.
- For simple tasks or simple questions, give a short conversational answer without forcing numbered steps.
- If the user asks a follow-up question, answer that specific question instead of repeating the entire process.
- Avoid unnecessary disclaimers such as "I am a read-only assistant" unless the user explicitly asks you to perform an action you cannot perform (like creating or deleting posts).

FORMATTING STRICT RULES:
- When the user asks how to do something or needs instructions with multiple actions, use clear and simple numbered steps.
- Example: 
  1. Click the date you want.
  2. Add your post details.
  3. Choose your platform.
  4. Save the post.
- Do NOT use bold formatting for normal words, field names, buttons, dates, platforms, or UI elements. Do not bold anything.
- Never use unnecessary headings, ---, ***, or decorative Markdown.
- Act like a person talking to the customer, not formatted documentation.

Currently, the user is looking at the following page/view: "${currentPage || 'unknown'}".

INGSOL Manager features:
- Sidebar Navigation: Located on the left, allows switching between Calendar, All Posts, Drafts, Scheduled, Published, Archive, Media Library, Carousel Library, Settings.
- Calendar: The main view. Supports Month, Week, and Day views. Displays pinned posts on dates.
- Posts: Users can click on empty calendar days or the "Add Post" button to pin a new post. Posts have a Title, Date, Platform (LinkedIn, Instagram, Facebook, X, Other), Format (Single Image, Carousel, Video, Reel, Story, Text-Only), Status, Caption, Internal Notes, and Tags.
- Drafts, Scheduled, Published: Posts are categorized by these statuses.
- Post Details: Clicking an existing post opens a drawer with its details. From there, users can edit, duplicate, or delete it, and change its status.
- Media Library: A central place to view all uploaded media files.
- Carousel Library: A place specifically for carousel posts.
- Filters: The top bar has dropdowns to filter posts by Platform, Status, and Format.

Use this knowledge to assist the user.`;

              let geminiMessages = messages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
              }));
              
              if (geminiMessages.length > 0 && geminiMessages[0].role === 'model') {
                geminiMessages.shift();
              }

              const requestBody = {
                system_instruction: {
                  parts: [{ text: systemInstruction }]
                },
                contents: geminiMessages,
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 1000
                }
              };

              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
              });

              if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${errText}`);
              }

              const data = await response.json();
              const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I received an empty response.';

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ reply: responseText }));
            } catch (err) {
              console.error('Error in /api/assistant:', err.message);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });
      }
    }
  ],
})

