// generate-sitemap.js - ES Module version
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://affliora.com';
const FIREBASE_PROJECT = 'affliora';

async function fetchCollection(collectionName) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collectionName}`;
    
    console.log(`Fetching ${url}...`);
    
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

function generateSitemap(products, articles) {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${today}</lastmod>
  </url>

  <url>
    <loc>${SITE_URL}/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <lastmod>${today}</lastmod>
  </url>

`;

  products.forEach(product => {
    if (!product.slug) return;
    if (product.visible === 'false' || product.visible === false) return;
    
    xml += `  <url>
    <loc>${SITE_URL}/products/${product.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>

`;
  });

  xml += `  <url>
    <loc>${SITE_URL}/articles</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>

`;

  articles.forEach(article => {
    if (!article.slug) return;
    if (article.published === 'false' || article.published === false) return;
    
    xml += `  <url>
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

async function main() {
  console.log('🗺️  Generating sitemap for Affliora...\n');
  
  try {
    console.log('📦 Fetching products...');
    const products = await fetchCollection('products');
    console.log(`   Found ${products.length} products`);
    
    console.log('📦 Fetching articles...');
    const articles = await fetchCollection('articles');
    console.log(`   Found ${articles.length} articles\n`);
    
    const sitemap = generateSitemap(products, articles);
    
    // Save to public folder
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    const publicPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(publicPath, sitemap);
    console.log('✅ Sitemap saved to: public/sitemap.xml');
    
    // Also save to dist if it exists
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      const distPath = path.join(distDir, 'sitemap.xml');
      fs.writeFileSync(distPath, sitemap);
      console.log('✅ Sitemap saved to: dist/sitemap.xml');
    }
    
    const visibleProducts = products.filter(p => p.slug && p.visible !== false && p.visible !== 'false');
    const publishedArticles = articles.filter(a => a.slug && a.published !== false && a.published !== 'false');
    
    console.log('\n📊 Sitemap Statistics:');
    console.log(`   Total URLs: ${visibleProducts.length + publishedArticles.length + 3}`);
    console.log(`   Products: ${visibleProducts.length}`);
    console.log(`   Articles: ${publishedArticles.length}`);
    console.log(`   Other pages: 3 (homepage, products, articles)`);
    
    console.log('\n✨ Done! Submit to Google Search Console:');
    console.log(`   ${SITE_URL}/sitemap.xml\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();