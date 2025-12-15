// generate-sitemap.js
// Run this script to generate sitemap.xml from your Firebase data
// Usage: node generate-sitemap.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://affliora.com';
const FIREBASE_PROJECT = 'affliora';

// Fetch data from Firestore REST API (no authentication needed for public data)
async function fetchCollection(collectionName) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collectionName}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.documents) {
            console.log(`No documents found in ${collectionName}`);
            resolve([]);
            return;
          }
          
          const items = json.documents.map(doc => {
            const id = doc.name.split('/').pop();
            const fields = {};
            
            Object.keys(doc.fields || {}).forEach(key => {
              const field = doc.fields[key];
              fields[key] = field.stringValue || field.integerValue || field.booleanValue || '';
            });
            
            return { id, ...fields };
          });
          
          resolve(items);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// Generate sitemap XML
function generateSitemap(products, articles) {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">

  <!-- Homepage -->
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${today}</lastmod>
  </url>

  <!-- Products Listing -->
  <url>
    <loc>${SITE_URL}/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <lastmod>${today}</lastmod>
  </url>

`;

  // Add all products
  products.forEach(product => {
    if (!product.slug) return; // Skip products without slugs
    if (product.visible === false) return; // Skip hidden products
    
    xml += `  <!-- ${product.name} -->
  <url>
    <loc>${SITE_URL}/products/${product.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>

`;
  });

  // Articles listing
  xml += `  <!-- Articles Listing -->
  <url>
    <loc>${SITE_URL}/articles</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>

`;

  // Add all articles
  articles.forEach(article => {
    if (!article.slug) return; // Skip articles without slugs
    if (article.published === false) return; // Skip unpublished articles
    
    xml += `  <!-- ${article.title} -->
  <url>
    <loc>${SITE_URL}/articles/${article.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>${today}</lastmod>
  </url>

`;
  });

  xml += `</urlset>`;
  
  return xml;
}

// Main function
async function main() {
  console.log('🗺️  Generating sitemap for Affliora...\n');
  
  try {
    // Fetch data from Firebase
    console.log('📦 Fetching products...');
    const products = await fetchCollection('products');
    console.log(`   Found ${products.length} products`);
    
    console.log('📦 Fetching articles...');
    const articles = await fetchCollection('articles');
    console.log(`   Found ${articles.length} articles\n`);
    
    // Generate sitemap
    const sitemap = generateSitemap(products, articles);
    
    // Save to public folder (for development)
    const publicPath = path.join(__dirname, 'public', 'sitemap.xml');
    fs.writeFileSync(publicPath, sitemap);
    console.log('✅ Sitemap saved to: public/sitemap.xml');
    
    // Also save to dist folder (if it exists)
    const distPath = path.join(__dirname, 'dist', 'sitemap.xml');
    if (fs.existsSync(path.join(__dirname, 'dist'))) {
      fs.writeFileSync(distPath, sitemap);
      console.log('✅ Sitemap saved to: dist/sitemap.xml');
    }
    
    // Summary
    console.log('\n📊 Sitemap Statistics:');
    console.log(`   Total URLs: ${products.filter(p => p.slug && p.visible !== false).length + articles.filter(a => a.slug && a.published !== false).length + 3}`);
    console.log(`   Products: ${products.filter(p => p.slug && p.visible !== false).length}`);
    console.log(`   Articles: ${articles.filter(a => a.slug && a.published !== false).length}`);
    console.log(`   Other pages: 3 (homepage, products listing, articles listing)`);
    
    console.log('\n✨ Done! Submit this to Google Search Console:');
    console.log(`   ${SITE_URL}/sitemap.xml\n`);
    
  } catch (err) {
    console.error('❌ Error generating sitemap:', err);
    process.exit(1);
  }
}

main();