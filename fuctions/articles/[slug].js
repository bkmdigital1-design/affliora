import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

// Initialize Firebase
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

export async function onRequest(context) {
  const { params } = context;
  const slug = params.slug;
  
  try {
    // Query article by slug
    const articlesRef = collection(db, "articles");
    const q = query(articlesRef, where("slug", "==", slug));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return new Response("Article not found", { status: 404 });
    }
    
    const article = snapshot.docs[0].data();
    
    // Generate HTML with proper meta tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO Meta Tags -->
  <title>${article.title} | Affliora</title>
  <meta name="description" content="${article.excerpt}">
  <meta name="keywords" content="${article.category}, digital products, affiliate">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${article.title}">
  <meta property="og:description" content="${article.excerpt}">
  <meta property="og:image" content="${article.image || 'https://affliora.com/og-image.jpg'}">
  <meta property="og:url" content="https://affliora.com/articles/${slug}">
  <meta property="og:type" content="article">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${article.title}">
  <meta name="twitter:description" content="${article.excerpt}">
  <meta name="twitter:image" content="${article.image || 'https://affliora.com/og-image.jpg'}">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://affliora.com/articles/${slug}">
  
  <script type="module" src="/src/main.jsx"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    // Pass article data to React app
    window.__ARTICLE_DATA__ = ${JSON.stringify(article)};
    window.__ARTICLE_SLUG__ = "${slug}";
  </script>
</body>
</html>
    `;
    
    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
      },
    });
    
  } catch (error) {
    console.error("Error loading article:", error);
    return new Response("Error loading article", { status: 500 });
  }
}