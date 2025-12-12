import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 60); // Limit to 60 chars
};

async function migrateArticles() {
  console.log("🔄 Starting article migration...");
  
  try {
    const articlesRef = collection(db, "articles");
    const snapshot = await getDocs(articlesRef);
    
    let updated = 0;
    let skipped = 0;
    
    for (const docSnap of snapshot.docs) {
      const article = docSnap.data();
      
      // Skip if slug already exists
      if (article.slug) {
        console.log(`⏭️  Skipping "${article.title}" - already has slug: ${article.slug}`);
        skipped++;
        continue;
      }
      
      // Generate new slug
      const slug = generateSlug(article.title);
      
      // Update article with slug
      await updateDoc(doc(db, "articles", docSnap.id), {
        slug: slug,
        oldHashId: docSnap.id // Keep old ID for redirects
      });
      
      console.log(`✅ Updated "${article.title}" with slug: ${slug}`);
      updated++;
    }
    
    console.log(`
✨ Migration Complete!
✅ Updated: ${updated} articles
⏭️  Skipped: ${skipped} articles
    `);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

migrateArticles();