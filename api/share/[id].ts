// Vercel Edge Function for dynamic meta tags
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

// Simple snippet data fetcher (you'd connect to your actual Supabase in production)
async function getSnippetData(id: string) {
  try {
    // This would be your actual Supabase call
    // For now, we'll create a mock response structure
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

function generateMetaHTML(snippet: any) {
  const title = snippet?.title 
    ? `${snippet.title} - Noir Code Snippet | Noir Playground`
    : 'Noir Code Snippet | Noir Playground';
    
  const description = snippet?.code 
    ? `Explore this Noir zero-knowledge proof snippet. Interactive code with Monaco editor, compilation, and proof generation.`
    : 'Interactive browser-based environment for developing zero-knowledge proofs with Noir.';
    
  const canonicalUrl = `https://noir-playground.app/share/${snippet?.id || ''}`;
  const ogImage = 'https://noir-playground.app/noir-playground-og.png';

  return `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    
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
  `;
}

export default async function handler(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const id = pathname.split('/').pop();
  
  if (!id) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Check if this is a crawler/bot request
  const userAgent = req.headers.get('user-agent') || '';
  const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|slackbot/i.test(userAgent);
  
  if (isCrawler) {
    // Fetch snippet data
    const snippet = await getSnippetData(id);
    
    // Generate dynamic meta tags
    const metaTags = generateMetaHTML(snippet);
    
    // Read the base index.html and inject meta tags
    const baseHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${metaTags}
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#000000" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    
    <!-- Redirect crawlers to React app after meta tags are read -->
    <script>
      // Only redirect if not a crawler
      if (!/bot|crawler|spider|crawling/i.test(navigator.userAgent)) {
        window.location.href = '/share/${id}';
      }
    </script>
  </head>
  <body>
    <div id="root">
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
        <div style="text-align: center;">
          <h1>Loading Noir Playground...</h1>
          <p>If you're not redirected, <a href="/share/${id}">click here</a>.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

    return new NextResponse(baseHTML, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  }
  
  // For regular users, redirect to the React app
  return NextResponse.redirect(new URL(`/share/${id}`, req.url));
}