
const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");
const net = require("net");

const app = express();

// CORS: in production set CORS_ORIGIN to your deployed frontend URL.
// Leave unset (or set to *) for local development.
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Parse JSON request bodies
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Test route
app.get("/", (req, res) => {
  res.send("OG Image Preview Backend is running!");
});

// Health check endpoint for frontend connection test
app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is connected!" });
});

const dns = require('dns').promises;

function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 127) return true; // Loopback
    if (parts[0] === 10) return true; // Private 10.x.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // Private 172.16.x.x
    if (parts[0] === 192 && parts[1] === 168) return true; // Private 192.168.x.x
    if (parts[0] === 169 && parts[1] === 254) return true; // Link-local
    if (parts[0] === 0) return true; // "0.0.0.0"
  } else if (net.isIPv6(ip)) {
    const lowerIp = ip.toLowerCase();
    
    if (lowerIp === '::1' || lowerIp === '::' || lowerIp === '0:0:0:0:0:0:0:1') return true;
    if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;
    if (lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) return true;
    
    // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (lowerIp.startsWith('::ffff:')) {
      const remainder = lowerIp.substring(7);
      if (remainder.includes('.')) {
        return isPrivateIP(remainder);
      } else {
        const hexParts = remainder.split(':');
        if (hexParts.length <= 2) {
          let hexString = '';
          for (const part of hexParts) {
            hexString += part.padStart(4, '0');
          }
          if (hexString.length === 8) {
            const ip4 = [
              parseInt(hexString.substring(0,2), 16),
              parseInt(hexString.substring(2,4), 16),
              parseInt(hexString.substring(4,6), 16),
              parseInt(hexString.substring(6,8), 16)
            ].join('.');
            return isPrivateIP(ip4);
          }
        }
      }
    }
  }
  return false;
}

async function validateAndResolveUrl(urlStr) {
  let parsedUrl;
  try {
    parsedUrl = new URL(urlStr);
  } catch (err) {
    return { isValid: false, error: "Invalid URL format." };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { isValid: false, error: "Invalid URL protocol. Must be http or https." };
  }

  let hostname = parsedUrl.hostname.toLowerCase();
  
  if (hostname === "localhost" && process.env.ALLOW_LOCALHOST !== 'true') {
    return { isValid: false, error: "Localhost is not allowed." };
  }

  // Strip IPv6 brackets for checking
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      if ((hostname === '127.0.0.1' || hostname === '::1') && process.env.ALLOW_LOCALHOST === 'true') {
        // allow loopback for test
      } else {
        return { isValid: false, error: "Private or internal IPs are not allowed." };
      }
    }
  } else {
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const record of addresses) {
        if (isPrivateIP(record.address)) {
          if ((record.address === '127.0.0.1' || record.address === '::1') && process.env.ALLOW_LOCALHOST === 'true') {
            // allow
          } else {
            return { isValid: false, error: "Hostname resolves to a private or internal IP." };
          }
        }
      }
    } catch (err) {
      return { isValid: false, error: "DNS resolution failed or hostname does not exist." };
    }
  }

  return { isValid: true };
}

async function fetchWithSSRFProtection(targetUrl, signal, maxRedirects = 5, redirectsCount = 0) {
  if (redirectsCount > maxRedirects) {
    const error = new Error("Too many redirects");
    error.code = 'ERR_TOO_MANY_REDIRECTS';
    throw error;
  }

  const validation = await validateAndResolveUrl(targetUrl);
  if (!validation.isValid) {
    const error = new Error(validation.error);
    error.code = 'ERR_SSRF_BLOCKED';
    throw error;
  }

  const response = await fetch(targetUrl, {
    signal: signal,
    redirect: 'manual', // Intercept redirects to re-validate destination URL
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  // Handle redirects manually
  if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
    const location = response.headers.get('location');
    const nextUrl = new URL(location, targetUrl).href;
    
    // Discard body of the redirect to prevent socket leaks
    if (response.body && typeof response.body.cancel === 'function') {
      await response.body.cancel();
    } else {
      await response.arrayBuffer().catch(() => {});
    }

    return fetchWithSSRFProtection(nextUrl, signal, maxRedirects, redirectsCount + 1);
  }

  return response;
}

// Helper to stream response and limit size to prevent OOM
async function readStreamWithLimit(response) {
  const maxSize = 5 * 1024 * 1024; // 5MB limit
  
  if (!response.body) {
    return await response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let html = '';
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maxSize) {
        reader.cancel();
        const error = new Error("Response body is too large (exceeds 5MB).");
        error.code = 'FILE_TOO_LARGE';
        throw error;
      }

      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode(); // flush
  } finally {
    reader.releaseLock();
  }

  return html;
}

// Fetch HTML endpoint
app.post("/api/fetch-html", async (req, res) => {
  let { url } = req.body;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ code: "INVALID_URL", error: "URL is required" });
  }

  url = url.trim();
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url)) {
    url = `https://${url}`;
  }

  try {
    // We let fetchWithSSRFProtection handle URL parsing errors natively
    new URL(url); // Trigger early Invalid URL check
  } catch (err) {
    return res.status(400).json({ code: "INVALID_URL", error: "Invalid URL format." });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // Encompasses fetching AND reading

  try {
    const response = await fetchWithSSRFProtection(url, controller.signal);

    if (!response.ok) {
      const headers = {};
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (!['set-cookie', 'authorization', 'cookie'].includes(lowerKey)) {
          headers[key] = value;
        }
      });
      
      const responseBody = await readStreamWithLimit(response);
      const previewBody = responseBody.substring(0, 500);

      console.error("--- Diagnostic Log: Non-2xx Response ---");
      console.error(`Target URL: ${url}`);
      console.error(`HTTP Status: ${response.status} ${response.statusText}`);
      console.error("Safe Response Headers:", headers);
      console.error("Response Body Preview:", previewBody);
      console.error("------------------------------------------");

      clearTimeout(timeoutId);

      if (response.status === 403) {
        return res.status(403).json({ 
          code: "HTTP_403_FORBIDDEN", 
          error: "Access denied by target server (HTTP 403). It may be blocking scrapers." 
        });
      }

      return res.status(response.status).json({ 
        code: "HTTP_ERROR",
        error: `Failed to fetch URL. Status: ${response.status}` 
      });
    }

    // Validate Content-Type before reading body
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
       clearTimeout(timeoutId);
       return res.status(400).json({ 
         code: "INVALID_CONTENT",
         error: "Target URL does not return HTML content."
       });
    }

    const html = await readStreamWithLimit(response);
    clearTimeout(timeoutId);

    const $ = cheerio.load(html);
    
    const getMetaTag = (name) => {
      return (
        $(`meta[property="${name}"]`).attr("content") ||
        $(`meta[name="${name}"]`).attr("content") ||
        null
      );
    };

    const getFavicon = () => {
      let icon = $('link[rel="icon"]').attr("href") || 
                 $('link[rel="shortcut icon"]').attr("href") ||
                 $('link[rel="apple-touch-icon"]').attr("href");
      
      if (icon && !icon.startsWith("http")) {
        try {
          icon = new URL(icon, url).href;
        } catch (e) {
          icon = null;
        }
      }
      return icon;
    };

    let domain = "";
    try {
      domain = new URL(url).hostname;
    } catch(e) {}

    const metadata = {
      title: getMetaTag("og:title") || $("title").text() || null,
      description: getMetaTag("og:description") || $('meta[name="description"]').attr("content") || null,
      image: getMetaTag("og:image"),
      canonicalUrl: getMetaTag("og:url"),
      siteName: getMetaTag("og:site_name"),
      favicon: getFavicon(),
      domain: domain
    };

    res.json({
      success: true,
      url,
      metadata
    });
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.code === 'ERR_SSRF_BLOCKED') {
      return res.status(403).json({ code: "SSRF_BLOCKED", error: error.message });
    }
    if (error.code === 'ERR_TOO_MANY_REDIRECTS') {
      return res.status(400).json({ code: "TOO_MANY_REDIRECTS", error: "Too many redirects." });
    }
    if (error.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ code: "FILE_TOO_LARGE", error: error.message });
    }
    if (error.name === 'AbortError') {
      return res.status(504).json({ code: "TIMEOUT", error: "Request timed out." });
    }
    return res.status(500).json({ 
      code: "NETWORK_ERROR",
      error: "Failed to fetch URL.", 
      details: error.message 
    });
  }
});

// Image Proxy endpoint
app.get("/api/proxy-image", async (req, res) => {
  let { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).send("URL is required");
  }

  url = url.trim();
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url)) {
    url = `https://${url}`;
  }

  try {
    new URL(url);
  } catch (err) {
    return res.status(400).send("Invalid URL format.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetchWithSSRFProtection(url, controller.signal);

    if (!response.ok) {
      clearTimeout(timeoutId);
      return res.status(response.status).send(`Failed to fetch image. Status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      clearTimeout(timeoutId);
      return res.status(400).send("Target URL does not return an image.");
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    let bytesRead = 0;
    const chunks = [];

    if (!response.body) {
      clearTimeout(timeoutId);
      return res.status(500).send("No response body.");
    }

    req.on('close', () => {
      controller.abort();
    });

    for await (const chunk of response.body) {
      bytesRead += chunk.length;
      if (bytesRead > maxSize) {
        controller.abort();
        clearTimeout(timeoutId);
        return res.status(413).send("Image exceeds 10MB limit.");
      }
      chunks.push(chunk);
    }
    
    clearTimeout(timeoutId);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Disposition', 'inline');
    
    res.status(200).send(Buffer.concat(chunks));

  } catch (error) {
    clearTimeout(timeoutId);
    if (!res.headersSent) {
      if (error.code === 'ERR_SSRF_BLOCKED') {
        return res.status(403).send("SSRF Blocked.");
      }
      if (error.code === 'ERR_TOO_MANY_REDIRECTS') {
        return res.status(400).send("Too many redirects.");
      }
      if (error.name === 'AbortError') {
        return res.status(504).send("Request timed out.");
      }
      res.status(500).send("Failed to proxy image.");
    } else {
      res.end();
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});