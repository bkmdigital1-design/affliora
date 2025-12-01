// App.jsx (replace your current file contents with this)
// Required packages: firebase, lucide-react, chart.js (optional if you want charts), tailwindcss for styles used
import React, { useState, useEffect, useRef } from "react";
import {
  ExternalLink, Plus, Edit2, Trash2, X, LogOut, Search, Facebook,
  Instagram, Twitter, MessageCircle, Upload, Eye, EyeOff, BarChart3,
  TrendingUp
} from "lucide-react";



import { initializeApp } from "firebase/app";

import {
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, increment, query, orderBy, serverTimestamp
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// ---------- Firebase config (your keys) ----------
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
const storage = getStorage(app);
const auth = getAuth(app);

// ---------- Helpers ----------
const generateSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

const ProductSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
    <div className="w-full h-44 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
      <div className="h-10 bg-gray-200 rounded-lg w-full mt-3" />
    </div>
  </div>
);
// Add this helper function BEFORE "export default function App() {"
const updateMetaTags = ({ title, description, image, url }) => {
  const metaTitle = document.querySelector('meta[property="og:title"]');
  if (metaTitle) metaTitle.content = title;
  
  const twitterTitle = document.querySelector('meta[property="twitter:title"]');
  if (twitterTitle) twitterTitle.content = title;
  
  const metaDesc = document.querySelector('meta[property="og:description"]');
  if (metaDesc) metaDesc.content = description;
  
  const twitterDesc = document.querySelector('meta[property="twitter:description"]');
  if (twitterDesc) twitterDesc.content = description;
  
  const regularDesc = document.querySelector('meta[name="description"]');
  if (regularDesc) regularDesc.content = description;
  
  const metaImage = document.querySelector('meta[property="og:image"]');
  if (metaImage) metaImage.content = image;
  
  const twitterImage = document.querySelector('meta[property="twitter:image"]');
  if (twitterImage) twitterImage.content = image;
  
  const metaUrl = document.querySelector('meta[property="og:url"]');
  if (metaUrl) metaUrl.content = url;
  
  const twitterUrl = document.querySelector('meta[property="twitter:url"]');
  if (twitterUrl) twitterUrl.content = url;
};

// ---------- Main Component ----------
export default function App() {
  const isAdminRoute = typeof window !== "undefined" && (window.location.pathname === "/admin" || window.location.hash === "#admin");


  // auth
  const [user, setUser] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // products
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // admin UI
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  const [darkMode, setDarkMode] = useState(false);

  // form
  const [formData, setFormData] = useState({
    name: "",
    image: "", // either url or uploaded downloadURL
    description: "",
    link: "",
    category: "Digital Products",
    visible: true,
    featured: false,
    slug: ""
  });
  const [filePreview, setFilePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // filters + pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // chart refs (if you add charts later)
  const CATEGORIES = ["All", "Digital Products", "Courses", "E-books", "Tools", "Templates", "Services", "Other"];

  const SOCIAL_LINKS = {
    tiktok: "https://tiktok.com/@affliora_official",
    instagram: "https://instagram.com/affliora_official",
    whatsapp: "https://wa.me/254712762175",
    facebook: "https://www.facebook.com/share/15QLmZD4dmS/",
    twitter: "https://twitter.com/affliora"
  };

  

  // auth listener (for admin)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // load products
  useEffect(() => {
    loadProducts();
  }, []);

  // filter + paginate whenever inputs change
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, searchQuery, selectedCategory, page]);
  // Update Open Graph meta tags
useEffect(() => {
  if (selectedProduct) {
    document.title = `${selectedProduct.name} - Affliora`;
    updateMetaTags({
      title: selectedProduct.name,
      description: selectedProduct.description,
      image: selectedProduct.image,
      url: `${window.location.origin}/products/${selectedProduct.slug || selectedProduct.id}`
    });
  } else {
    document.title = "Affliora - Your Gateway to Premium Digital Products";
    updateMetaTags({
      title: "Affliora - Your Gateway to Premium Digital Products",
      description: "Discover curated digital products, courses, e-books, tools, and templates. Find the best resources for your needs.",
      image: `${window.location.origin}/og-image.jpg`,
      url: window.location.origin
    });
  }
}, [selectedProduct]);
  // ---------- Firestore: load products ----------
  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(list);
    } catch (err) {
      console.error("loadProducts", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Filtering + Pagination ----------
  const applyFilters = () => {
    let visible = products.filter((p) => p.visible !== false);

    if (selectedCategory !== "All") {
      visible = visible.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      visible = visible.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }

    const start = (page - 1) * PAGE_SIZE;
    setFilteredProducts(visible.slice(start, start + PAGE_SIZE));
  };

  // ---------- Form Validation Helpers ----------
  const validateForm = () => {
    const errors = {};
    if (!formData.name || !formData.name.trim()) errors.name = "Title is required";
    if (!formData.description || !formData.description.trim()) errors.description = "Short description required";
    if (!formData.link || !formData.link.trim()) errors.link = "Affiliate URL is required";
    // image can be url or uploaded
    if (!formData.image || !formData.image.trim()) errors.image = "Please upload or paste an image URL";

    // basic URL validation for affiliate link
    try {
      new URL(formData.link);
    } catch (_) {
      errors.link = "Affiliate URL is invalid";
    }

    return errors;
  };

  // inline error state (simple)
  const [fieldErrors, setFieldErrors] = useState({});

  // ---------- Image upload with preview + validation ----------
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // validation
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    // preview
    const reader = new FileReader();
    reader.onload = () => setFilePreview(reader.result);
    reader.readAsDataURL(file);

    // upload
    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setFormData((f) => ({ ...f, image: downloadURL }));
    } catch (err) {
      console.error("upload image", err);
      alert("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  // ---------- Analytics: view + click logs ----------
  const logView = async (productId) => {
    try {
      await addDoc(collection(db, "viewLogs"), { productId, timestamp: serverTimestamp(), source: document.referrer || "direct" });
      // optionally increment 'views' counter on product doc (uncomment if desired)
      // await updateDoc(doc(db, 'products', productId), { views: increment(1) });
    } catch (err) {
      console.error("logView", err);
    }
  };

  const trackClick = async (productId, productLink) => {
    try {
      await updateDoc(doc(db, "products", productId), { clicks: increment(1), lastClicked: new Date().toISOString() });
      await addDoc(collection(db, "clickLogs"), { productId, url: productLink, timestamp: serverTimestamp(), source: document.referrer || "direct" });
    } catch (err) {
      console.error("trackClick", err);
    }
    // open after logging
    window.open(productLink, "_blank");
  };

  // ---------- Admin Auth (Firebase email/password) ----------
  const handleAdminLogin = async () => {
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    setAdminEmail("");
    setAdminPassword("");
    // Successfully logged in - the onAuthStateChanged will handle the UI update
    // Log activity silently (don't wait for it)
    addDoc(collection(db, "activityLogs"), { 
      action: "login", 
      details: "Admin logged in", 
      user: auth.currentUser?.email || "admin", 
      timestamp: serverTimestamp() 
    }).catch(err => console.error("Log activity error:", err));
  } catch (err) {
    console.error("admin login error:", err);
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    
    // Show specific error messages
    if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
      alert("Invalid email or password. Please check your credentials.");
    } else if (err.code === "auth/invalid-email") {
      alert("Invalid email format.");
    } else if (err.code === "auth/too-many-requests") {
      alert("Too many failed attempts. Please try again later.");
    } else {
      alert("Login failed: " + err.message);
    }
  }
};

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
      setIsAdding(false);
      setEditingId(null);
      await addDoc(collection(db, "activityLogs"), { action: "logout", details: "Admin logged out", user: user?.email || "admin", timestamp: serverTimestamp() });
    } catch (err) {
      console.error("admin logout", err);
    }
  };

  // ---------- Add / Update Product (with validation + slug) ----------
  const handleSubmit = async () => {
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // scroll first error into view (optional)
      alert("Please fix errors before saving.");
      return;
    }

    try {
      // ensure slug
      const slug = formData.slug && formData.slug.trim() ? formData.slug.trim() : generateSlug(formData.name);

      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        link: formData.link.trim(),
        slug,
        clicks: formData.clicks || 0,
        createdAt: formData.createdAt || new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, "products", editingId), payload);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...payload } : p)));
        await addDoc(collection(db, "activityLogs"), { action: "edit_product", details: payload.name, user: user?.email || "admin", timestamp: serverTimestamp() });
        setEditingId(null);
      } else {
        const docRef = await addDoc(collection(db, "products"), payload);
        setProducts((prev) => [{ id: docRef.id, ...payload }, ...prev]);
        await addDoc(collection(db, "activityLogs"), { action: "add_product", details: payload.name, user: user?.email || "admin", timestamp: serverTimestamp() });
      }

      // reset
      setFormData({ name: "", image: "", description: "", link: "", category: "Digital Products", visible: true, featured: false, slug: "" });
      setFilePreview(null);
      setIsAdding(false);
      setFieldErrors({});
    } catch (err) {
      console.error("save product", err);
      alert("Error saving product");
    }
  };

  // ---------- Edit / Delete ----------
  const handleEdit = (product) => {
    setFormData({ ...product });
    setFilePreview(product.image || null);
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      await addDoc(collection(db, "activityLogs"), { action: "delete_product", details: id, user: user?.email || "admin", timestamp: serverTimestamp() });
    } catch (err) {
      console.error("delete", err);
      alert("Delete failed");
    }
  };

  // ---------- Tiny helpers ----------
  const getTotalClicks = () => products.reduce((s, p) => s + (p.clicks || 0), 0);
  const getTopProducts = () => [...products].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 5);
  const featured = products.find((p) => p.featured && p.visible !== false);
  const openProductDetail = (product) => {
  setSelectedProduct(product);
  logView(product.id);
};

  // ---------- UI: Public site (no admin link in header) ----------
  if (!isAdminRoute) {
    return (
      <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"}`}>
        <header className={`${darkMode ? "bg-gray-800" : "bg-white"} shadow-md sticky top-0 z-50`}>
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl font-bold">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Affliora</h1>
                <p className="text-sm text-gray-500">Your Gateway to Premium Digital Products</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
  {/* Admin link removed intentionally */}
             <a href="#admin" className="text-xs text-gray-300 hover:text-gray-500 transition">•</a>
            </div>

          </div>

          <div className="max-w-7xl mx-auto px-4 pb-6">
            <div className="mt-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white"
                />
              </div>
              <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }} className="px-4 py-3 border rounded-xl bg-white bg-white text-gray-600 font-medium">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-12">
          {/* HERO + FEATURED */}
          <section className="mb-8">
            <div className="bg-white dark:bg-gray-200 rounded-2xl p-6 shadow-md flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mt-2 text-gray-600 dark:text-gray-600">Find the best digital tools and courses</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-700">A curated collection of affiliate products - tutorials, tools, templates and more. Click any product to learn more and buy.</p>
                <div className="mt-4 flex gap-3">
                  <a className="px-4 py-2 rounded bg-gradient-to-r from-purple-500 to-purple-500 text-white" href="#products">Browse Products</a>
                </div>
              </div>

              <div className="w-full md:w-1/3">
                {featured ? (
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-xl">
                    <h3 className="font-semibold">Featured</h3>
                    <p className="text-lg font-bold mt-2">{featured.name}</p>
                    <p className="mt-2 text-sm line-clamp-3">{featured.description}</p>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => trackClick(featured.id, featured.link)} className="bg-white text-purple-700 px-3 py-2 rounded">Get Product</button>
                      <a href={`/products/${featured.slug}`} className="underline">View</a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-300 p-4 rounded-xl text-center text-gray-500 font-medium">No featured product yet</div>
                )}
              </div>
            </div>
          </section>

          {/* Grid: 4 columns desktop, 2 mobile */}
          <section id="products">
            {loading ? (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : (
              <>
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                      <article key={product.id} className="bg-gray-100 dark:bg-gray-200 rounded-xl overflow-hidden shadow">
                        <div className="flex flex-row gap-2 p-3">
                          {/* Left: Product Image */}
                          <button
                            onClick={() => openProductDetail(product)}
                            className="flex-shrink-0 cursor-pointer"
                          >
                            <img 
                             src={product.image} 
                             alt={product.name} 
                             className="w-28 h-28 md:w-32 md:h-32 object-contain rounded-md bg-gray-50" 
                             loading="lazy"
                             onError={(e) => e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'}
                            />
                          </button>

                          {/* Right: Content */}
                          <div className="flex-1 flex flex-col gap-2">
                            <button
                              onClick={() => openProductDetail(product)}
                              className="text-left focus:outline-none"
                            >
                              <h3 className="font-bold text-base line-clamp-2 text-gray-900">
                                {product.name}
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                {product.description}
                              </p>
                            </button>
                            
                            <button 
                              onClick={() => trackClick(product.id, product.link)} 
                              className="w-full bg-gradient-to-r from-purple-600 to-purple-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:from-purple-700 hover:to-purple-700 hover:shadow-lg transition-all mt-auto transform hover:scale-105"
                            >
                              Get Product
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                   <div className="text-gray-400 mb-2">
                     <Search size={48} className="mx-auto mb-3" />
                   </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                )}
                {/* Pagination */}
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition">Prev</button>
                  <span className="text-gray-600 font-medium">Page {page} / {Math.max(1, Math.ceil(products.filter(p => p.visible !== false && (selectedCategory === 'All' || p.category === selectedCategory) && ((p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()))).length / PAGE_SIZE))}</span>
                  <button disabled={(page * PAGE_SIZE) >= products.filter(p => p.visible !== false && (selectedCategory === 'All' || p.category === selectedCategory) && ((p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()))).length} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition">Next</button>
                </div>
              </>
            )}
          </section>
        </main>

        <footer className="bg-white mt-12 py-8 shadow-inner">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col items-center gap-6">
              <div className="flex gap-6">
                <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-purple-600 transition-colors">
                  {/* small svg icon kept inline for tiktok */}
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                </a>
                <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-pink-600 transition-colors">
                  <Instagram size={24} />
                </a>
                <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-green-600 transition-colors">
                  <MessageCircle size={24} />
                </a>
                <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                  <Facebook size={24} />
                </a>
                <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-400 transition-colors">
                  <Twitter size={24} />
                </a>
              </div>
              <p className="text-gray-600 text-center">© 2025 Affliora. All rights reserved.</p>
            </div>
          </div>
        </footer>
        {/* Product Detail Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedProduct(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="absolute top-4 right-4 bg-gray-900 text-white rounded-full p-2 shadow-lg hover:bg-gray-700 z-10"
                  >
                  <X size={20} />
                </button>
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name} 
                  className="w-full max-h-64 md:max-h-80 object-contain rounded-t-2xl bg-gray-100" 
                />
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-2">
                    {selectedProduct.category}
                  </span>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                    {selectedProduct.name}
                  </h2>
                </div>
                
                <p className="text-gray-700 text-sm leading-relaxed">
                    {selectedProduct.description}
                </p>
                
                
                
                <button 
                  onClick={() => {
                    trackClick(selectedProduct.id, selectedProduct.link);
                    setSelectedProduct(null);
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Get Product <ExternalLink className="inline ml-2" size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .animate-shimmer { animation: shimmer 1.5s infinite; background-size: 200% 100%; }
          .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        `}</style>
      </div>
    );
  }

  // ---------- ADMIN ROUTES ----------
  // Admin login page (uses Firebase Auth)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-lg">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-3xl font-bold">A</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Affliora Admin</h2>
            <p className="text-sm text-gray-600">Login with your admin email</p>
          </div>

          <input 
           value={adminEmail} 
           onChange={(e) => setAdminEmail(e.target.value.trim())} 
           placeholder="Email" 
           className="w-full p-3 border rounded text-gray-900 bg-white" 
           type="email"
           autoComplete="email"
           autoCapitalize="none"
           autoCorrect="off"
           spellCheck="false"
          />
          <div className="relative mb-3">
            <input 
            value={adminPassword} 
            onChange={(e) => setAdminPassword(e.target.value.trim())} 
            type={showPassword ? "text" : "password"} 
            placeholder="Password" 
            className="w-full p-3 border rounded text-gray-900 bg-white pr-12" 
            onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()} 
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            />
            <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
            >
           {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
           </button>
          </div>
          <div className="flex gap-3">
           <button onClick={handleAdminLogin} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded font-medium">Login</button>
           <button onClick={() => (window.location.href = "/")} className="flex-1 border border-gray-300 p-3 rounded flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-gray-900 font-medium hover:bg-gray-50 transition">Public</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- ADMIN DASHBOARD (when logged in) ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <header className="bg-white shadow p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Affliora Admin</h1>
            <p className="text-sm text-gray-600">Manage products & view analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowStats((s) => !s)} className="px-3 py-2 bg-purple-600 text-white rounded">Stats</button>
            <button onClick={() => { setIsAdding(true); setEditingId(null); }} className="px-3 py-2 bg-blue-600 text-white rounded">Add Product</button>
            <button onClick={handleAdminLogout} className="px-3 py-2 bg-red-500 text-white rounded">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded shadow text-gray-900 font-medium">Total Products: {products.length}</div>
            <div className="bg-white p-4 rounded shadow text-gray-900 font-medium">Total Clicks: {getTotalClicks()}</div>
            <div className="bg-white p-4 rounded shadow text-gray-900 font-medium">Visible: {products.filter((p) => p.visible !== false).length}</div>

            <div className="md:col-span-3 bg-white p-4 rounded shadow mt-4">
               <h3 className="mb-3 text-gray-700 font-bold">Top Products</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getTopProducts().map((p) => (
                  <div key={p.id} className="p-3 border rounded flex items-center gap-3">
                    <img src={p.image} className="w-12 h-12 object-cover rounded" alt="" />
                    <div>
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-600">{p.clicks || 0} clicks</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-bold text-gray-900">{editingId ? "Edit" : "Add"} Product</h3>
                <button onClick={() => { setIsAdding(false); setEditingId(null); }}><X /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-gray-900 font-medium">Image URL</label>
                  {formData.image && <img src={formData.image} className="w-full h-40 object-cover rounded mb-2" alt="preview" />}
                  <input 
                  type="url" 
                  value={formData.image} 
                  onChange={(e) => setFormData((f) => ({ ...f, image: e.target.value }))} 
                  placeholder="Paste image URL (e.g., https://example.com/image.jpg)" 
                  className="w-full p-3 border rounded text-gray-900 bg-white" 
                  />
                  <p className="text-xs text-gray-600 mt-1">Tip: Upload images to ImgBB, Imgur, or Cloudinary for free hosting</p>
                  {fieldErrors.image && <div className="text-red-500 text-sm mt-1">{fieldErrors.image}</div>}
                </div>

                <input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} placeholder="Name" className="w-full p-3 border rounded text-gray-900 bg-white" />
                {fieldErrors.name && <div className="text-red-500 text-sm">{fieldErrors.name}</div>}

                <input value={formData.slug} onChange={(e) => setFormData((f) => ({ ...f, slug: e.target.value }))} placeholder="Slug (auto-generated if blank)" className="w-full p-3 border rounded text-gray-900 bg-white" />

                <select value={formData.category} onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))} className="w-full p-3 border rounded text-gray-900 bg-white">
                  {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <textarea value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} className="w-full p-3 border rounded text-gray-900 bg-white" placeholder="Short description (2-3 lines)" rows={4} />
                {fieldErrors.description && <div className="text-red-500 text-sm">{fieldErrors.description}</div>}

                <input value={formData.link} onChange={(e) => setFormData((f) => ({ ...f, link: e.target.value }))} placeholder="Affiliate URL" className="w-full p-3 border rounded text-gray-900 bg-white" />
                {fieldErrors.link && <div className="text-red-500 text-sm">{fieldErrors.link}</div>}

                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-2 text-gray-900 bg-white"><input type="checkbox" checked={formData.visible !== false} onChange={(e) => setFormData((f) => ({ ...f, visible: e.target.checked }))} /> Visible</label>
                  <label className="flex items-center gap-2 text-gray-900 bg-white"><input type="checkbox" checked={formData.featured || false} onChange={(e) => setFormData((f) => ({ ...f, featured: e.target.checked }))} /> Featured</label>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleSubmit} disabled={uploadingImage} className="flex-1 bg-purple-600 text-white p-3 rounded text-gray-900 bg-white">{editingId ? "Update" : "Add"}</button>
                  <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="flex-1 border p-3 rounded">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product list for admin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((product) => (
  <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden relative hover:shadow-lg transition">
    {!product.visible && (
      <div className="absolute left-0 top-0 bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded-br-lg z-10">
        HIDDEN
      </div>
    )}
    {product.featured && (
      <div className="absolute right-0 top-0 bg-purple-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg z-10">
        FEATURED
      </div>
    )}
    
    <div className="flex flex-row gap-3 p-3">
      <div className="flex-shrink-0">
        <img 
          src={product.image} 
          className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-lg" 
          alt={product.name} 
        />
      </div>
      
      <div className="flex-1 flex flex-col gap-2">
        <div>
          <h4 className="font-bold text-base text-gray-900 line-clamp-2">{product.name}</h4>
          <p className="text-xs text-gray-600 mt-1">
            <span className="inline-block bg-gray-100 px-2 py-1 rounded">{product.category}</span>
          </p>
          {product.clicks !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              👁️ {product.clicks} clicks
            </p>
          )}
        </div>
        
        <div className="flex gap-2 mt-auto">
          <button 
            onClick={() => handleEdit(product)} 
            className="flex-1 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-1"
          >
            <Edit2 size={16} />
            <span className="text-sm font-medium">Edit</span>
          </button>
          <button 
            onClick={() => handleDelete(product.id)} 
            className="flex-1 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-1"
          >
            <Trash2 size={16} />
            <span className="text-sm font-medium">Delete</span>
          </button>
        </div>
        
        <a 
          href={`/products/${product.slug || product.id}`} 
          target="_blank" 
          rel="noreferrer" 
          className="text-xs text-purple-600 hover:text-purple-700 underline text-center"
        >
          View Public Page
        </a>
      </div>
    </div>
  </div>
))}
        </div>

        {/* activity logs preview */}
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h4 className="font-bold mb-2 text-gray-900">Recent Activity</h4>
          <ul className="space-y-2 max-h-40 overflow-auto">
            {activityLogs.length === 0 && <li className="text-sm text-gray-700">No recent activity</li>}
            {activityLogs.map((a, i) => (
              <li key={i} className="text-sm">
                <strong>{a.action}</strong> — {a.details}
                <div className="text-xs text-gray-400">by {a.user} • {new Date(a.timestamp || Date.now()).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="py-4 text-center text-gray-900">Affliora Admin</footer>
    </div>
  );
}