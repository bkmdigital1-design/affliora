import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("slug", "==", slug));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return new Response("Product not found", { status: 404 });
    }
    
    const product = snapshot.docs[0].data();
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>${product.name} | Affliora</title>
  <meta name="description" content="${product.description}">
  <meta name="keywords" content="${product.category}, ${product.platform || 'digital product'}, affiliate">
  
  <meta property="og:title" content="${product.name}">
  <meta property="og:description" content="${product.description}">
  <meta property="og:image" content="${product.image}">
  <meta property="og:url" content="https://affliora.com/products/${slug}">
  <meta property="og:type" content="product">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${product.name}">
  <meta name="twitter:description" content="${product.description}">
  <meta name="twitter:image" content="${product.image}">
  
  <link rel="canonical" href="https://affliora.com/products/${slug}">
  
  <script type="module" src="/src/main.jsx"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__PRODUCT_DATA__ = ${JSON.stringify(product)};
    window.__PRODUCT_SLUG__ = "${slug}";
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
    console.error("Error loading product:", error);
    return new Response("Error loading product", { status: 500 });
  }
}