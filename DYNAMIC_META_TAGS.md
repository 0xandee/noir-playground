# Dynamic Meta Tags for Social Media Sharing

This document explains how dynamic meta tags work for shared Noir code snippets.

## Problem

Social media crawlers (Facebook, Twitter, LinkedIn, Telegram) don't execute JavaScript, so they only see static meta tags from `index.html` instead of the dynamic React-generated tags.

## Solution

We've implemented serverless functions that detect crawler requests and serve HTML with dynamic meta tags while redirecting human users to the React app.

## How It Works

1. **Crawler Request**: Social media crawler requests `/share/snippet-id`
2. **Bot Detection**: Serverless function detects crawler via User-Agent
3. **Data Fetch**: Function fetches snippet data from Supabase
4. **Dynamic HTML**: Generates HTML with dynamic OpenGraph/Twitter meta tags
5. **Human Redirect**: Regular users get redirected to React app

## Deployment Platforms

### Netlify
- Function: `netlify/functions/share.js`
- Config: `netlify.toml` redirects `/share/*` to function
- Environment variables needed in Netlify dashboard

### Vercel
- Function: `api/share.js`
- Config: `vercel.json` rewrites `/share/*` to API route
- Environment variables needed in Vercel dashboard

### Other Platforms
- Can be adapted for other serverless platforms
- Core logic is in the bot detection and HTML generation

## Environment Variables Required

For production deployment, set these environment variables:

```bash
# In your deployment platform (Netlify/Vercel/etc.)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing

1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
4. **Telegram**: Share link in Telegram to see preview

## What Gets Generated

For a shared snippet URL like `/share/abc123`, crawlers will see:

```html
<title>My Function - Noir Code Snippet | Noir Playground</title>
<meta property="og:title" content="My Function - Noir Code Snippet | Noir Playground" />
<meta property="og:description" content="Explore this Noir zero-knowledge proof snippet..." />
<meta property="og:url" content="https://noir-playground.app/share/abc123" />
<meta property="og:image" content="https://noir-playground.app/noir-playground-og.png" />
<!-- + Twitter Cards, JSON-LD structured data -->
```

## Future Enhancements

1. **Dynamic Preview Images**: Generate code preview images per snippet
2. **Better Code Analysis**: Smarter description generation from code
3. **Caching**: Redis/CDN caching for performance
4. **Analytics**: Track social media sharing performance

## Troubleshooting

### Meta Tags Not Updating
- Clear social media cache (Facebook debugger "Fetch new scrape information")
- Check environment variables are set in deployment platform
- Verify Supabase connection in function logs

### Function Not Deploying
- Check serverless function syntax
- Verify deployment platform configuration
- Check function logs for errors

### Bot Detection Issues
- Update User-Agent detection patterns if needed
- Test with different crawler user agents
- Monitor function logs for bot detection accuracy