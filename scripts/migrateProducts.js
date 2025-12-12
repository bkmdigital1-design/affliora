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

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 60);
};

async function migrateProducts() {
  console.log("🔄 Starting product migration...");
  
  try {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    
    let updated = 0;
    let skipped = 0;
    
    for (const docSnap of snapshot.docs) {
      const product = docSnap.data();
      
      // Skip if slug already exists
      if (product.slug) {
        console.log(`⏭️  Skipping "${product.name}" - already has slug: ${product.slug}`);
        skipped++;
        continue;
      }
      
      // Generate new slug
      const slug = generateSlug(product.name);
      
      // Update product with slug
      await updateDoc(doc(db, "products", docSnap.id), {
        slug: slug,
        oldHashId: docSnap.id
      });
      
      console.log(`✅ Updated "${product.name}" with slug: ${slug}`);
      updated++;
    }
    
    console.log(`
✨ Migration Complete!
✅ Updated: ${updated} products
⏭️  Skipped: ${skipped} products
    `);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

migrateProducts();