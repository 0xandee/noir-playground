# 🚀 Vercel Deployment Guide for Noir Playground

## Phase 1: Vercel Setup

### 1. Connect Repository to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your repository: `https://github.com/0xandee/noir-playground`
4. Configure build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2. Environment Variables (if needed)
- No special environment variables required for this project
- WASM files are handled automatically

### 3. Deploy
- Click "Deploy" and wait for build to complete
- You'll get a Vercel subdomain like: `noir-playground-xyz.vercel.app`

## Phase 2: Custom Domain Setup

### 1. Add Domain in Vercel
1. Go to your project dashboard on Vercel
2. Click "Settings" → "Domains"
3. Add domain: `noir-playground.app`
4. Add domain: `www.noir-playground.app` (will redirect to apex)

### 2. DNS Configuration in GoDaddy

#### For Apex Domain (noir-playground.app):
```
Type: A
Name: @
Value: 76.76.19.19
TTL: 600 seconds
```

#### For WWW Subdomain:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com.
TTL: 600 seconds
```

### 3. Verify Domain
- Vercel will automatically verify domain ownership
- SSL certificate will be provisioned automatically (takes 1-5 minutes)

## Phase 3: DNS Propagation & Testing

### 1. Check DNS Propagation
- Use [whatsmydns.net](https://whatsmydns.net) to check global DNS propagation
- Should take 5-30 minutes for full propagation

### 2. Test Your Site
- Visit `https://noir-playground.app`
- Test WASM loading works
- Verify favicon displays
- Check social media preview: [Facebook Debugger](https://developers.facebook.com/tools/debug/)

## Phase 4: Search Engine Optimization

### 1. Submit to Search Engines
- **Google Search Console**: Add property for `https://noir-playground.app`
- **Bing Webmaster Tools**: Submit sitemap
- Submit sitemap: `https://noir-playground.app/sitemap.xml`

### 2. Social Media Images
1. Open `create-social-images.html` in browser
2. Set browser to 1200x630 resolution
3. Take screenshot and save as:
   - `public/noir-playground-og.png`
   - `public/noir-playground-twitter.png`
4. Redeploy to update images

## Troubleshooting

### WASM Files Not Loading
- Check `vercel.json` configuration is deployed
- Verify CORS headers are set correctly
- Check browser console for errors

### Domain Not Working
- Verify DNS records are correct in GoDaddy
- Check domain status in Vercel dashboard
- Wait for DNS propagation (up to 48 hours max)

### Build Failures
- Check build logs in Vercel dashboard
- Verify all dependencies install correctly
- Ensure TypeScript types are correct

## Performance Optimization

### After Deployment
1. Run Lighthouse audit
2. Check Core Web Vitals
3. Monitor bundle sizes
4. Test on mobile devices

## Security
- HTTPS enforced automatically
- CORS headers configured
- No sensitive data exposed
- Regular dependency updates recommended

---

**Next Steps After Deployment:**
1. Update README.md with live demo URL
2. Share on social media
3. Submit to developer communities
4. Monitor analytics and performance