import { snippetService } from '../services/SnippetService';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapOptions {
  baseUrl?: string;
  includeSharedSnippets?: boolean;
  maxSnippets?: number;
}

export async function generateSitemap(options: SitemapOptions = {}): Promise<string> {
  const {
    baseUrl = 'https://noir-playground.app',
    includeSharedSnippets = true,
    maxSnippets = 1000
  } = options;

  const urls: SitemapUrl[] = [];

  // Add homepage
  urls.push({
    loc: baseUrl,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 1.0
  });

  // Add shared snippets if enabled
  if (includeSharedSnippets) {
    try {
      // Get public snippets (you may need to implement this method in SnippetService)
      const snippets = await getPublicSnippets(maxSnippets);
      
      for (const snippet of snippets) {
        urls.push({
          loc: `${baseUrl}/share/${snippet.id}`,
          lastmod: snippet.updatedAt ? new Date(snippet.updatedAt).toISOString().split('T')[0] : 
                   new Date(snippet.createdAt).toISOString().split('T')[0],
          changefreq: 'monthly',
          priority: 0.8
        });
      }
    } catch (error) {
      // Failed to load snippets for sitemap generation
    }
  }

  return generateSitemapXML(urls);
}

function generateSitemapXML(urls: SitemapUrl[]): string {
  const header = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
    '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n' +
    '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

  const urlsXML = urls.map(url => {
    let urlXML = `  <url>\n    <loc>${url.loc}</loc>\n`;
    
    if (url.lastmod) {
      urlXML += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    
    if (url.changefreq) {
      urlXML += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    
    if (url.priority !== undefined) {
      urlXML += `    <priority>${url.priority}</priority>\n`;
    }
    
    urlXML += '  </url>';
    return urlXML;
  }).join('\n');

  const footer = '\n</urlset>';

  return header + urlsXML + footer;
}

async function getPublicSnippets(maxSnippets: number) {
  // This is a placeholder - you'll need to implement a method in SnippetService
  // to get public/shareable snippets. For now, we'll return an empty array
  // since the current SnippetService only has getSnippet(id) method.
  
  // TODO: Implement snippetService.getPublicSnippets() method
  // This would require:
  // 1. Adding a 'public' field to snippets in the database
  // 2. Creating a method to query public snippets
  // 3. Potentially implementing pagination for large numbers of snippets
  
  try {
    // If you have a method to get all snippet IDs or public snippets, use it here
    // For now, returning empty array as we don't have access to list all snippets
    return [];
  } catch (error) {
    // Could not fetch public snippets
    return [];
  }
}

export async function generateSitemapIndex(): Promise<string> {
  // For larger sites, you might want to split sitemaps
  // This generates a sitemap index that references multiple sitemaps
  const baseUrl = 'https://noir-playground.app';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
</sitemapindex>`;
}

// Utility to save sitemap to public directory (for build-time generation)
export async function saveSitemapToPublic(sitemapXML: string, filename = 'sitemap.xml'): Promise<void> {
  if (typeof window === 'undefined') {
    // Only works in Node.js environment (build-time)
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const publicDir = path.join(process.cwd(), 'public');
      const sitemapPath = path.join(publicDir, filename);
      
      fs.writeFileSync(sitemapPath, sitemapXML, 'utf8');
      // Sitemap saved
    } catch (error) {
      // Could not save sitemap - Node.js modules not available in browser environment
    }
  }
}