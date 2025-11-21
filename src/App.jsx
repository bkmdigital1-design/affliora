import React, { useState, useEffect } from 'react';
import { ExternalLink, Plus, Edit2, Trash2, X, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-f8yZEY-CAUl7V5zA2xHduhz3M56pAec",
  authDomain: "affliora.firebaseapp.com",
  projectId: "affliora",
  storageBucket: "affliora.firebasestorage.app",
  messagingSenderId: "37842165334",
  appId: "1:37842165334:web:2cd57f23a1906ac0b125f7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const isAdminRoute = window.location.pathname === '/admin';
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    description: '',
    link: ''
  });

  const ADMIN_PASSWORD = 'admin123'; // Change this to your secure password

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
    } else {
      alert('Incorrect password');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', image: '', description: '', link: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.image || !formData.description || !formData.link) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      if (editingId) {
        // Update existing product
        const productRef = doc(db, 'products', editingId);
        await updateDoc(productRef, formData);
        setProducts(products.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
        setEditingId(null);
      } else {
        // Add new product
        const docRef = await addDoc(collection(db, 'products'), formData);
        setProducts([...products, { id: docRef.id, ...formData }]);
      }
      
      setFormData({ name: '', image: '', description: '', link: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      image: product.image,
      description: product.description,
      link: product.link
    });
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', image: '', description: '', link: '' });
  };

  // PUBLIC SITE VIEW
  if (!isAdminRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Affliora</h1>
            <p className="text-gray-600 mt-1">Discover amazing products curated just for you</p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">Loading products...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                      <a
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition flex items-center justify-center gap-2"
                      >
                        Get This Product
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {products.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg">No products available yet. Check back soon!</p>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="bg-white mt-16 py-6 shadow-inner">
          <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
            <p>© 2025 Affliora. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // ADMIN LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Affliora Admin</h1>
              <p className="text-gray-600">Manage your affiliate products</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter admin password"
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Login to Admin Panel
              </button>
              <a
                href="/"
                className="block text-center text-purple-600 hover:text-purple-700 mt-4"
              >
                ← Back to Public Site
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Affliora Admin</h1>
            <p className="text-gray-600 mt-1">Manage your affiliate products</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View Public Site
            </a>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => setIsAdding(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            Add New Product
          </button>
        </div>

        {isAdding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.image && (
                    <img 
                      src={formData.image} 
                      alt="Preview" 
                      className="mt-2 w-full h-32 object-cover rounded-lg"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows="3"
                    placeholder="Brief description of the product"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Affiliate Link
                  </label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({...formData, link: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://selar.co/your-affiliate-link"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
                  >
                    {editingId ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition group">
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-100"
                  >
                    <Edit2 size={16} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-100"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
              
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                <div className="text-xs text-gray-500 truncate">
                  Link: {product.link}
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && !isAdding && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No products yet. Click "Add New Product" to get started!</p>
          </div>
        )}
      </main>

      <footer className="bg-white mt-16 py-6 shadow-inner">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
          <p>© 2025 Affliora Admin Panel</p>
        </div>
      </footer>
    </div>
  );
}