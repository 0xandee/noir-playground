// Vercel Serverless Function for dynamic meta tags
import { IncomingMessage, ServerResponse } from 'http';

// Sanitization utilities to prevent XSS attacks
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function escapeJsonLd(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Simple snippet data fetcher
async function getSnippetData(id: string) {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/shared_snippets?id=eq.${id}`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || '',
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data[0] || null;
    }
  } catch (error) {
    console.error('Error fetching snippet:', error);
  }
  return null;
}

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] | undefined };
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  send: (body: string) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(404).json({ error: 'Not Found' });
  }

  // Check if this is a crawler/bot request
  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|slackbot|bot|crawler|spider/i.test(userAgent);

  if (isCrawler) {
    // Compute dynamic base URL from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'noir-playground.app';
    const baseUrl = `${protocol}://${host}`;

    // Fetch snippet data
    const snippet = await getSnippetData(id);

    // Sanitize snippet title to prevent XSS
    const sanitizedTitle = snippet?.title ? escapeHtml(snippet.title) : '';
    const sanitizedTitleJsonLd = snippet?.title ? escapeJsonLd(snippet.title) : '';

    // Generate meta tags
    const title = sanitizedTitle
      ? `${sanitizedTitle} - Noir Code Snippet | Noir Playground`
      : 'Noir Code Snippet | Noir Playground';

    const description = snippet?.code
      ? `Explore this Noir zero-knowledge proof snippet. Interactive code with Monaco editor, compilation, and proof generation.`
      : 'Interactive browser-based environment for developing zero-knowledge proofs with Noir.';

    const canonicalUrl = `${baseUrl}/share/${id}`;
    const ogImage = `${baseUrl}/noir-playground-og.png`;

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="robots" content="index, follow" />

    <!-- OpenGraph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Noir Playground" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />

    <!-- JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      "name": "${sanitizedTitleJsonLd || 'Noir Code Snippet'}",
      "description": "${description}",
      "url": "${canonicalUrl}",
      "programmingLanguage": "Noir",
      "creator": {
        "@type": "Organization",
        "name": "Noir Playground"
      }
    }
    </script>
  </head>
  <body>
    <div id="root">
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
        <div style="text-align: center;">
          <h1>${title}</h1>
          <p>Loading Noir Playground...</p>
          <p><a href="${baseUrl}">Visit Noir Playground</a></p>
        </div>
      </div>
    </div>

    <!-- Redirect script for human users -->
    <script>
      // Only redirect if not a bot/crawler
      if (!/bot|crawler|spider|crawling|facebookexternalhit|twitterbot/i.test(navigator.userAgent)) {
        window.location.href = '${baseUrl}/share/${id}';
      }
    </script>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(html);
  }

  // For regular users, redirect to the React app
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'noir-playground.app';
  const baseUrl = `${protocol}://${host}`;
  res.writeHead(302, { Location: `${baseUrl}/share/${id}` });
  res.end();
}