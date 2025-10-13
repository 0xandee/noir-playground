#!/usr/bin/env node

/**
 * Build-time sitemap generator
 * This script generates a sitemap.xml file in the public directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSitemap() {
  const baseUrl = 'https://noir-playground.app';
  const currentDate = new Date().toISOString().split('T')[0];

  const urls = [
    {
      loc: baseUrl,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: 1.0
    }
    // Note: In a production environment with access to the database,
    // you would fetch shared snippets here and add them to the sitemap
  ];

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
  const sitemapXML = header + urlsXML + footer;

  // Save to public directory
  const publicDir = path.join(path.dirname(__dirname), 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  
  try {
    fs.writeFileSync(sitemapPath, sitemapXML, 'utf8');
    // Sitemap generated successfully
  } catch (error) {
    // Failed to generate sitemap
    process.exit(1);
  }
}

// Run the generator
generateSitemap();