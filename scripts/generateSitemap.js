import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyA-f8yZEY-CAUl7V5zA2xHduhz3M56pAec",
  authDomain: "affliora.firebaseapp.com",
  projectId: "affliora",
  storageBucket: "affliora.firebasestorage.app",
  messagingSenderId: "37842165334",
  appId: "1:37842165334:web:2cd57f23a1906ac0b125f7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function generateSitemap() {
  console.log("🗺️  Generating sitemap...");
  
  try {
    // Get all published articles
    const articlesRef = collection(db, "articles");
    const q = query(articlesRef, where("published", "==", true));
    const snapshot = await getDocs(q);
    
    const baseUrl = "https://affliora.com";
    const today = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Articles Page -->
  <url>
    <loc>${baseUrl}/articles</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    
    // Add each article
    snapshot.docs.forEach(doc => {
      const article = doc.data();
      const articleDate = article.createdAt?.toDate?.() || new Date();
      const lastmod = articleDate.toISOString().split('T')[0];
      
      sitemap += `
  <!-- ${article.title} -->
  <url>
    <loc>${baseUrl}/articles/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    });
    
    sitemap += `
</urlset>`;
// Add products
const productsRef = collection(db, "products");
const productsQuery = query(productsRef, where("visible", "==", true));
const productsSnapshot = await getDocs(productsQuery);

productsSnapshot.docs.forEach(doc => {
  const product = doc.data();
  
  sitemap += `
  <!-- ${product.name} -->
  <url>
    <loc>${baseUrl}/products/${product.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
});
    
    // Save sitemap
    fs.writeFileSync('public/sitemap.xml', sitemap);
    
    console.log(`✅ Sitemap generated with ${snapshot.docs.length} articles!`);
    console.log(`📍 Saved to: public/sitemap.xml`);
    
  } catch (error) {
    console.error("❌ Sitemap generation failed:", error);
  }
}

generateSitemap();