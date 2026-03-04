import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import {
  LayoutDashboard, Package, Users, Truck, FileText, 
  BarChart3, Warehouse, ClipboardList, Plus, Search,
  Edit, Trash2, Eye, Download, AlertTriangle, TrendingUp,
  CheckCircle, Clock, X, Menu, ChevronDown, ArrowUpDown
} from 'lucide-react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format currency in FCFA
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + ' FCFA';
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// ==================== SIDEBAR ====================
const Sidebar = ({ activeModule, setActiveModule, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
    { id: 'invoices', label: 'Factures', icon: FileText },
    { id: 'stock', label: 'Stock', icon: Warehouse },
    { id: 'inventory', label: 'Inventaires', icon: ClipboardList },
    { id: 'reports', label: 'Rapports', icon: BarChart3 },
  ];

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h1 className="logo">GestCom</h1>
        <span className="logo-subtitle">Gestion Commerciale</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            data-testid={`nav-${item.id}`}
            className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveModule(item.id);
              setIsMobileMenuOpen(false);
            }}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span>Devise: FCFA</span>
      </div>
    </aside>
  );
};

// ==================== DASHBOARD ====================
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartRes, topRes, lowStockRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`),
        axios.get(`${API_URL}/api/dashboard/sales-chart`),
        axios.get(`${API_URL}/api/dashboard/top-products`),
        axios.get(`${API_URL}/api/products?low_stock=true`)
      ]);
      setStats(statsRes.data);
      setSalesChart(chartRes.data);
      setTopProducts(topRes.data);
      setLowStockProducts(lowStockRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du tableau de bord');
    }
  };

  if (!stats) return <div className="loading">Chargement...</div>;

  return (
    <div className="dashboard" data-testid="dashboard">
      <h2 className="page-title">Tableau de Bord</h2>
      
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon"><TrendingUp /></div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.chiffre_affaires_jour)}</span>
            <span className="stat-label">CA du Jour</span>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon"><BarChart3 /></div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.chiffre_affaires_mois)}</span>
            <span className="stat-label">CA du Mois</span>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon"><Package /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_products}</span>
            <span className="stat-label">Produits</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon"><Users /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_clients}</span>
            <span className="stat-label">Clients</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card alerts">
          <h3><AlertTriangle className="icon-warning" /> Alertes Stock</h3>
          {lowStockProducts.length === 0 ? (
            <p className="no-data">Aucune alerte de stock</p>
          ) : (
            <ul className="alert-list">
              {lowStockProducts.slice(0, 5).map(p => (
                <li key={p.id} className="alert-item">
                  <span className="alert-product">{p.designation}</span>
                  <span className="alert-stock">Stock: {p.quantite_stock} / Min: {p.stock_minimum}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-card pending">
          <h3><Clock /> Factures en Attente</h3>
          <div className="pending-count">
            <span className="count">{stats.invoices_pending}</span>
            <span className="label">factures</span>
          </div>
        </div>

        <div className="dashboard-card top-products">
          <h3><TrendingUp /> Top Produits Vendus</h3>
          {topProducts.length === 0 ? (
            <p className="no-data">Aucune vente enregistrée</p>
          ) : (
            <ul className="top-list">
              {topProducts.slice(0, 5).map((p, index) => (
                <li key={index} className="top-item">
                  <span className="rank">#{index + 1}</span>
                  <span className="product-name">{p.designation}</span>
                  <span className="quantity">{p.quantite_vendue} vendus</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== PRODUCTS MODULE ====================
const ProductsModule = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    code: '', code_barre: '', designation: '', categorie: '',
    prix_achat: '', prix_vente: '', quantite_stock: 0, stock_minimum: 10,
    unite: 'Pièce', tva: 18
  });

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('categorie', selectedCategory);
      if (showLowStock) params.append('low_stock', 'true');
      
      const res = await axios.get(`${API_URL}/api/products?${params}`);
      setProducts(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des produits');
    }
  }, [search, selectedCategory, showLowStock]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products/categories/list`);
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        prix_achat: parseFloat(formData.prix_achat),
        prix_vente: parseFloat(formData.prix_vente),
        quantite_stock: parseInt(formData.quantite_stock),
        stock_minimum: parseInt(formData.stock_minimum),
        tva: parseFloat(formData.tva)
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/${editingProduct.id}`, data);
        toast.success('Produit modifié avec succès');
      } else {
        await axios.post(`${API_URL}/api/products`, data);
        toast.success('Produit créé avec succès');
      }
      setShowModal(false);
      resetForm();
      fetchProducts();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    try {
      await axios.delete(`${API_URL}/api/products/${id}`);
      toast.success('Produit supprimé');
      fetchProducts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      code_barre: product.code_barre || '',
      designation: product.designation,
      categorie: product.categorie,
      prix_achat: product.prix_achat,
      prix_vente: product.prix_vente,
      quantite_stock: product.quantite_stock,
      stock_minimum: product.stock_minimum,
      unite: product.unite,
      tva: product.tva
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      code: '', code_barre: '', designation: '', categorie: '',
      prix_achat: '', prix_vente: '', quantite_stock: 0, stock_minimum: 10,
      unite: 'Pièce', tva: 18
    });
  };

  const exportProducts = () => {
    window.open(`${API_URL}/api/export/products`, '_blank');
  };

  return (
    <div className="module" data-testid="products-module">
      <div className="module-header">
        <h2 className="page-title">Gestion des Produits</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportProducts} data-testid="export-products-btn">
            <Download size={18} /> Exporter
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-product-btn">
            <Plus size={18} /> Nouveau Produit
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par code, désignation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="product-search-input"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="filter-select"
          data-testid="category-filter"
        >
          <option value="">Toutes catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            data-testid="low-stock-filter"
          />
          Stock bas uniquement
        </label>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Désignation</th>
              <th>Catégorie</th>
              <th>Prix Achat</th>
              <th>Prix Vente</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className={product.quantite_stock <= product.stock_minimum ? 'low-stock' : ''}>
                <td>{product.code}</td>
                <td>{product.designation}</td>
                <td>{product.categorie}</td>
                <td>{formatCurrency(product.prix_achat)}</td>
                <td>{formatCurrency(product.prix_vente)}</td>
                <td>
                  <span className={`stock-badge ${product.quantite_stock <= product.stock_minimum ? 'low' : 'ok'}`}>
                    {product.quantite_stock}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => handleEdit(product)} title="Modifier">
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(product.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="no-data">Aucun produit trouvé</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                    data-testid="product-code-input"
                  />
                </div>
                <div className="form-group">
                  <label>Code Barre</label>
                  <input
                    type="text"
                    value={formData.code_barre}
                    onChange={(e) => setFormData({...formData, code_barre: e.target.value})}
                    data-testid="product-barcode-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Désignation *</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  required
                  data-testid="product-designation-input"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Catégorie *</label>
                  <input
                    type="text"
                    value={formData.categorie}
                    onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                    required
                    list="categories-list"
                    data-testid="product-category-input"
                  />
                  <datalist id="categories-list">
                    {categories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Unité</label>
                  <select
                    value={formData.unite}
                    onChange={(e) => setFormData({...formData, unite: e.target.value})}
                    data-testid="product-unit-input"
                  >
                    <option value="Pièce">Pièce</option>
                    <option value="Kg">Kg</option>
                    <option value="Litre">Litre</option>
                    <option value="Mètre">Mètre</option>
                    <option value="Carton">Carton</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prix d'Achat (FCFA) *</label>
                  <input
                    type="number"
                    value={formData.prix_achat}
                    onChange={(e) => setFormData({...formData, prix_achat: e.target.value})}
                    required
                    min="0"
                    data-testid="product-buy-price-input"
                  />
                </div>
                <div className="form-group">
                  <label>Prix de Vente (FCFA) *</label>
                  <input
                    type="number"
                    value={formData.prix_vente}
                    onChange={(e) => setFormData({...formData, prix_vente: e.target.value})}
                    required
                    min="0"
                    data-testid="product-sell-price-input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock Initial</label>
                  <input
                    type="number"
                    value={formData.quantite_stock}
                    onChange={(e) => setFormData({...formData, quantite_stock: e.target.value})}
                    min="0"
                    data-testid="product-stock-input"
                  />
                </div>
                <div className="form-group">
                  <label>Stock Minimum</label>
                  <input
                    type="number"
                    value={formData.stock_minimum}
                    onChange={(e) => setFormData({...formData, stock_minimum: e.target.value})}
                    min="0"
                    data-testid="product-min-stock-input"
                  />
                </div>
                <div className="form-group">
                  <label>TVA (%)</label>
                  <input
                    type="number"
                    value={formData.tva}
                    onChange={(e) => setFormData({...formData, tva: e.target.value})}
                    min="0"
                    max="100"
                    data-testid="product-tva-input"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" data-testid="product-submit-btn">
                  {editingProduct ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== CLIENTS MODULE ====================
const ClientsModule = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    code: '', nom: '', telephone: '', email: '', adresse: '', ville: ''
  });

  const fetchClients = useCallback(async () => {
    try {
      const params = search ? `?search=${search}` : '';
      const res = await axios.get(`${API_URL}/api/clients${params}`);
      setClients(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des clients');
    }
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await axios.put(`${API_URL}/api/clients/${editingClient.id}`, formData);
        toast.success('Client modifié avec succès');
      } else {
        await axios.post(`${API_URL}/api/clients`, formData);
        toast.success('Client créé avec succès');
      }
      setShowModal(false);
      resetForm();
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    try {
      await axios.delete(`${API_URL}/api/clients/${id}`);
      toast.success('Client supprimé');
      fetchClients();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      code: client.code,
      nom: client.nom,
      telephone: client.telephone || '',
      email: client.email || '',
      adresse: client.adresse || '',
      ville: client.ville || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({ code: '', nom: '', telephone: '', email: '', adresse: '', ville: '' });
  };

  const exportClients = () => {
    window.open(`${API_URL}/api/export/clients`, '_blank');
  };

  return (
    <div className="module" data-testid="clients-module">
      <div className="module-header">
        <h2 className="page-title">Gestion des Clients</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportClients} data-testid="export-clients-btn">
            <Download size={18} /> Exporter
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-client-btn">
            <Plus size={18} /> Nouveau Client
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par code, nom, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="client-search-input"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Ville</th>
              <th>Solde</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id}>
                <td>{client.code}</td>
                <td>{client.nom}</td>
                <td>{client.telephone || '-'}</td>
                <td>{client.email || '-'}</td>
                <td>{client.ville || '-'}</td>
                <td className={client.solde > 0 ? 'debt' : ''}>
                  {formatCurrency(client.solde)}
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => handleEdit(client)} title="Modifier">
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(client.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && <p className="no-data">Aucun client trouvé</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClient ? 'Modifier le Client' : 'Nouveau Client'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                    data-testid="client-code-input"
                  />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    required
                    data-testid="client-name-input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    data-testid="client-phone-input"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    data-testid="client-email-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({...formData, adresse: e.target.value})}
                  data-testid="client-address-input"
                />
              </div>
              <div className="form-group">
                <label>Ville</label>
                <input
                  type="text"
                  value={formData.ville}
                  onChange={(e) => setFormData({...formData, ville: e.target.value})}
                  data-testid="client-city-input"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" data-testid="client-submit-btn">
                  {editingClient ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SUPPLIERS MODULE ====================
const SuppliersModule = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    code: '', nom: '', telephone: '', email: '', adresse: '', ville: ''
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const params = search ? `?search=${search}` : '';
      const res = await axios.get(`${API_URL}/api/suppliers${params}`);
      setSuppliers(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des fournisseurs');
    }
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`${API_URL}/api/suppliers/${editingSupplier.id}`, formData);
        toast.success('Fournisseur modifié avec succès');
      } else {
        await axios.post(`${API_URL}/api/suppliers`, formData);
        toast.success('Fournisseur créé avec succès');
      }
      setShowModal(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    try {
      await axios.delete(`${API_URL}/api/suppliers/${id}`);
      toast.success('Fournisseur supprimé');
      fetchSuppliers();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      nom: supplier.nom,
      telephone: supplier.telephone || '',
      email: supplier.email || '',
      adresse: supplier.adresse || '',
      ville: supplier.ville || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({ code: '', nom: '', telephone: '', email: '', adresse: '', ville: '' });
  };

  return (
    <div className="module" data-testid="suppliers-module">
      <div className="module-header">
        <h2 className="page-title">Gestion des Fournisseurs</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-supplier-btn">
            <Plus size={18} /> Nouveau Fournisseur
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par code, nom, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="supplier-search-input"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Ville</th>
              <th>Solde</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(supplier => (
              <tr key={supplier.id}>
                <td>{supplier.code}</td>
                <td>{supplier.nom}</td>
                <td>{supplier.telephone || '-'}</td>
                <td>{supplier.email || '-'}</td>
                <td>{supplier.ville || '-'}</td>
                <td className={supplier.solde > 0 ? 'debt' : ''}>
                  {formatCurrency(supplier.solde)}
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => handleEdit(supplier)} title="Modifier">
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(supplier.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && <p className="no-data">Aucun fournisseur trouvé</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                    data-testid="supplier-code-input"
                  />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    required
                    data-testid="supplier-name-input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    data-testid="supplier-phone-input"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    data-testid="supplier-email-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({...formData, adresse: e.target.value})}
                  data-testid="supplier-address-input"
                />
              </div>
              <div className="form-group">
                <label>Ville</label>
                <input
                  type="text"
                  value={formData.ville}
                  onChange={(e) => setFormData({...formData, ville: e.target.value})}
                  data-testid="supplier-city-input"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" data-testid="supplier-submit-btn">
                  {editingSupplier ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== INVOICES MODULE ====================
const InvoicesModule = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    lignes: [],
    mode_paiement: '',
    notes: ''
  });
  const [newLine, setNewLine] = useState({ product_id: '', quantite: 1 });

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('statut', statusFilter);
      
      const res = await axios.get(`${API_URL}/api/invoices?${params}`);
      setInvoices(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des factures');
    }
  }, [search, statusFilter]);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/clients`);
      setClients(res.data);
    } catch (error) {
      console.error('Error fetching clients');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products`);
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products');
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    fetchProducts();
  }, [fetchInvoices]);

  const addLine = () => {
    if (!newLine.product_id || newLine.quantite < 1) return;
    
    const product = products.find(p => p.id === newLine.product_id);
    if (!product) return;

    if (product.quantite_stock < newLine.quantite) {
      toast.error(`Stock insuffisant. Disponible: ${product.quantite_stock}`);
      return;
    }

    setFormData({
      ...formData,
      lignes: [...formData.lignes, {
        product_id: product.id,
        product_code: product.code,
        designation: product.designation,
        quantite: newLine.quantite,
        prix_unitaire: product.prix_vente,
        stock_dispo: product.quantite_stock
      }]
    });
    setNewLine({ product_id: '', quantite: 1 });
  };

  const removeLine = (index) => {
    setFormData({
      ...formData,
      lignes: formData.lignes.filter((_, i) => i !== index)
    });
  };

  const calculateTotal = () => {
    return formData.lignes.reduce((sum, l) => sum + (l.quantite * l.prix_unitaire), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.lignes.length === 0) {
      toast.error('Ajoutez au moins une ligne de produit');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/invoices`, {
        client_id: formData.client_id,
        lignes: formData.lignes.map(l => ({
          product_id: l.product_id,
          quantite: l.quantite
        })),
        mode_paiement: formData.mode_paiement || null,
        notes: formData.notes || null
      });
      toast.success('Facture créée avec succès');
      setShowModal(false);
      resetForm();
      fetchInvoices();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const updateStatus = async (invoiceId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/invoices/${invoiceId}/status`, { statut: newStatus });
      toast.success('Statut mis à jour');
      fetchInvoices();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const viewInvoice = async (invoice) => {
    try {
      const res = await axios.get(`${API_URL}/api/invoices/${invoice.id}`);
      setSelectedInvoice(res.data);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Erreur lors du chargement de la facture');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      lignes: [],
      mode_paiement: '',
      notes: ''
    });
    setNewLine({ product_id: '', quantite: 1 });
  };

  const exportInvoices = () => {
    window.open(`${API_URL}/api/export/invoices`, '_blank');
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Payée': return 'status-paid';
      case 'Annulée': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  return (
    <div className="module" data-testid="invoices-module">
      <div className="module-header">
        <h2 className="page-title">Gestion des Factures</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportInvoices} data-testid="export-invoices-btn">
            <Download size={18} /> Exporter
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-invoice-btn">
            <Plus size={18} /> Nouvelle Facture
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par numéro, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="invoice-search-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
          data-testid="invoice-status-filter"
        >
          <option value="">Tous les statuts</option>
          <option value="En attente">En attente</option>
          <option value="Payée">Payée</option>
          <option value="Annulée">Annulée</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Date</th>
              <th>Client</th>
              <th>Montant TTC</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td>{invoice.numero}</td>
                <td>{formatDate(invoice.date_facture)}</td>
                <td>{invoice.client_nom}</td>
                <td>{formatCurrency(invoice.montant_ttc)}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(invoice.statut)}`}>
                    {invoice.statut}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => viewInvoice(invoice)} title="Voir">
                      <Eye size={16} />
                    </button>
                    {invoice.statut === 'En attente' && (
                      <>
                        <button 
                          className="btn-icon success" 
                          onClick={() => updateStatus(invoice.id, 'Payée')} 
                          title="Marquer payée"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button 
                          className="btn-icon danger" 
                          onClick={() => updateStatus(invoice.id, 'Annulée')} 
                          title="Annuler"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && <p className="no-data">Aucune facture trouvée</p>}
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nouvelle Facture</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Client *</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    required
                    data-testid="invoice-client-select"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Mode de Paiement</label>
                  <select
                    value={formData.mode_paiement}
                    onChange={(e) => setFormData({...formData, mode_paiement: e.target.value})}
                    data-testid="invoice-payment-select"
                  >
                    <option value="">-</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Virement">Virement</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Crédit">Crédit</option>
                  </select>
                </div>
              </div>

              <div className="invoice-lines-section">
                <h4>Lignes de Facture</h4>
                <div className="add-line-row">
                  <select
                    value={newLine.product_id}
                    onChange={(e) => setNewLine({...newLine, product_id: e.target.value})}
                    data-testid="invoice-product-select"
                  >
                    <option value="">Sélectionner un produit</option>
                    {products.filter(p => p.quantite_stock > 0).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.designation} (Stock: {p.quantite_stock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newLine.quantite}
                    onChange={(e) => setNewLine({...newLine, quantite: parseInt(e.target.value) || 1})}
                    min="1"
                    placeholder="Qté"
                    data-testid="invoice-quantity-input"
                  />
                  <button type="button" className="btn btn-secondary" onClick={addLine} data-testid="add-line-btn">
                    <Plus size={18} />
                  </button>
                </div>

                {formData.lignes.length > 0 && (
                  <table className="lines-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Désignation</th>
                        <th>Qté</th>
                        <th>Prix Unit.</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.lignes.map((ligne, index) => (
                        <tr key={index}>
                          <td>{ligne.product_code}</td>
                          <td>{ligne.designation}</td>
                          <td>{ligne.quantite}</td>
                          <td>{formatCurrency(ligne.prix_unitaire)}</td>
                          <td>{formatCurrency(ligne.quantite * ligne.prix_unitaire)}</td>
                          <td>
                            <button type="button" className="btn-icon danger" onClick={() => removeLine(index)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4" className="total-label">Total HT:</td>
                        <td colSpan="2" className="total-value">{formatCurrency(calculateTotal())}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="2"
                  data-testid="invoice-notes-input"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" data-testid="invoice-submit-btn">Créer la Facture</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-large invoice-detail" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Facture {selectedInvoice.numero}</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}><X /></button>
            </div>
            <div className="invoice-content">
              <div className="invoice-header-info">
                <div className="invoice-info">
                  <p><strong>Date:</strong> {formatDate(selectedInvoice.date_facture)}</p>
                  <p><strong>Client:</strong> {selectedInvoice.client_nom}</p>
                  <p><strong>Statut:</strong> <span className={`status-badge ${getStatusClass(selectedInvoice.statut)}`}>{selectedInvoice.statut}</span></p>
                </div>
              </div>

              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th>Qté</th>
                    <th>Prix Unit.</th>
                    <th>TVA</th>
                    <th>Montant TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.lignes.map((ligne, index) => (
                    <tr key={index}>
                      <td>{ligne.product_code}</td>
                      <td>{ligne.designation}</td>
                      <td>{ligne.quantite}</td>
                      <td>{formatCurrency(ligne.prix_unitaire)}</td>
                      <td>{ligne.tva}%</td>
                      <td>{formatCurrency(ligne.montant_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-totals">
                <div className="total-row">
                  <span>Total HT:</span>
                  <span>{formatCurrency(selectedInvoice.montant_ht)}</span>
                </div>
                <div className="total-row">
                  <span>TVA:</span>
                  <span>{formatCurrency(selectedInvoice.montant_tva)}</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total TTC:</span>
                  <span>{formatCurrency(selectedInvoice.montant_ttc)}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="invoice-notes">
                  <strong>Notes:</strong> {selectedInvoice.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== STOCK MODULE ====================
const StockModule = () => {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    type_mouvement: 'Entrée',
    quantite: 1,
    reference: '',
    motif: ''
  });

  const fetchMovements = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/stock-movements`);
      setMovements(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des mouvements');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products`);
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products');
    }
  };

  useEffect(() => {
    fetchMovements();
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/stock-movements`, {
        ...formData,
        quantite: parseInt(formData.quantite)
      });
      toast.success('Mouvement enregistré');
      setShowModal(false);
      resetForm();
      fetchMovements();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      type_mouvement: 'Entrée',
      quantite: 1,
      reference: '',
      motif: ''
    });
  };

  const exportMovements = () => {
    window.open(`${API_URL}/api/export/stock-movements`, '_blank');
  };

  const getMovementClass = (type) => {
    switch (type) {
      case 'Entrée': return 'movement-in';
      case 'Sortie': return 'movement-out';
      default: return 'movement-adjust';
    }
  };

  return (
    <div className="module" data-testid="stock-module">
      <div className="module-header">
        <h2 className="page-title">Gestion du Stock</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportMovements} data-testid="export-movements-btn">
            <Download size={18} /> Exporter
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-movement-btn">
            <Plus size={18} /> Nouveau Mouvement
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Code</th>
              <th>Désignation</th>
              <th>Type</th>
              <th>Quantité</th>
              <th>Stock Avant</th>
              <th>Stock Après</th>
              <th>Motif</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id}>
                <td>{formatDate(m.created_at)}</td>
                <td>{m.product_code}</td>
                <td>{m.designation}</td>
                <td>
                  <span className={`movement-badge ${getMovementClass(m.type_mouvement)}`}>
                    {m.type_mouvement}
                  </span>
                </td>
                <td>{m.quantite}</td>
                <td>{m.quantite_avant}</td>
                <td>{m.quantite_apres}</td>
                <td>{m.motif || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <p className="no-data">Aucun mouvement de stock</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nouveau Mouvement de Stock</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Produit *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                  required
                  data-testid="movement-product-select"
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.designation} (Stock: {p.quantite_stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type de Mouvement *</label>
                  <select
                    value={formData.type_mouvement}
                    onChange={(e) => setFormData({...formData, type_mouvement: e.target.value})}
                    required
                    data-testid="movement-type-select"
                  >
                    <option value="Entrée">Entrée</option>
                    <option value="Sortie">Sortie</option>
                    <option value="Ajustement">Ajustement</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantité *</label>
                  <input
                    type="number"
                    value={formData.quantite}
                    onChange={(e) => setFormData({...formData, quantite: e.target.value})}
                    required
                    min="1"
                    data-testid="movement-quantity-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Référence</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder="N° bon de livraison, etc."
                  data-testid="movement-reference-input"
                />
              </div>
              <div className="form-group">
                <label>Motif</label>
                <input
                  type="text"
                  value={formData.motif}
                  onChange={(e) => setFormData({...formData, motif: e.target.value})}
                  placeholder="Raison du mouvement"
                  data-testid="movement-motif-input"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" data-testid="movement-submit-btn">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== INVENTORY MODULE ====================
const InventoryModule = () => {
  const [inventories, setInventories] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [inventoryLines, setInventoryLines] = useState([]);
  const [notes, setNotes] = useState('');

  const fetchInventories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/inventories`);
      setInventories(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des inventaires');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products`);
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products');
    }
  };

  useEffect(() => {
    fetchInventories();
    fetchProducts();
  }, []);

  const startNewInventory = () => {
    setInventoryLines(products.map(p => ({
      product_id: p.id,
      product_code: p.code,
      designation: p.designation,
      quantite_theorique: p.quantite_stock,
      quantite_physique: p.quantite_stock
    })));
    setNotes('');
    setShowModal(true);
  };

  const updatePhysicalQty = (productId, qty) => {
    setInventoryLines(inventoryLines.map(l => 
      l.product_id === productId 
        ? { ...l, quantite_physique: parseInt(qty) || 0 }
        : l
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/inventories`, {
        lignes: inventoryLines.map(l => ({
          product_id: l.product_id,
          quantite_physique: l.quantite_physique
        })),
        notes: notes || null
      });
      toast.success('Inventaire créé');
      setShowModal(false);
      fetchInventories();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const viewInventory = async (inv) => {
    try {
      const res = await axios.get(`${API_URL}/api/inventories/${inv.id}`);
      setSelectedInventory(res.data);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    }
  };

  const validateInventory = async (invId) => {
    if (!window.confirm('Valider cet inventaire ? Les stocks seront mis à jour.')) return;
    try {
      await axios.post(`${API_URL}/api/inventories/${invId}/validate`);
      toast.success('Inventaire validé');
      fetchInventories();
      fetchProducts();
      setShowDetailModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la validation');
    }
  };

  return (
    <div className="module" data-testid="inventory-module">
      <div className="module-header">
        <h2 className="page-title">Inventaires</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={startNewInventory} data-testid="new-inventory-btn">
            <Plus size={18} /> Nouvel Inventaire
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Date</th>
              <th>Nb Produits</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventories.map(inv => (
              <tr key={inv.id}>
                <td>{inv.numero}</td>
                <td>{formatDate(inv.date_inventaire)}</td>
                <td>{inv.lignes?.length || 0}</td>
                <td>
                  <span className={`status-badge ${inv.statut === 'Validé' ? 'status-paid' : 'status-pending'}`}>
                    {inv.statut}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => viewInventory(inv)} title="Voir">
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventories.length === 0 && <p className="no-data">Aucun inventaire</p>}
      </div>

      {/* New Inventory Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nouvel Inventaire</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="inventory-lines-container">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Désignation</th>
                      <th>Stock Théorique</th>
                      <th>Stock Physique</th>
                      <th>Écart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryLines.map(l => (
                      <tr key={l.product_id} className={l.quantite_physique !== l.quantite_theorique ? 'has-diff' : ''}>
                        <td>{l.product_code}</td>
                        <td>{l.designation}</td>
                        <td>{l.quantite_theorique}</td>
                        <td>
                          <input
                            type="number"
                            value={l.quantite_physique}
                            onChange={(e) => updatePhysicalQty(l.product_id, e.target.value)}
                            min="0"
                            className="qty-input"
                          />
                        </td>
                        <td className={l.quantite_physique - l.quantite_theorique !== 0 ? 'diff-value' : ''}>
                          {l.quantite_physique - l.quantite_theorique}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                  data-testid="inventory-notes-input"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" data-testid="inventory-submit-btn">Créer l'Inventaire</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Detail Modal */}
      {showDetailModal && selectedInventory && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Inventaire {selectedInventory.numero}</h3>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}><X /></button>
            </div>
            <div className="inventory-content">
              <div className="inventory-info">
                <p><strong>Date:</strong> {formatDate(selectedInventory.date_inventaire)}</p>
                <p><strong>Statut:</strong> <span className={`status-badge ${selectedInventory.statut === 'Validé' ? 'status-paid' : 'status-pending'}`}>{selectedInventory.statut}</span></p>
              </div>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th>Stock Théorique</th>
                    <th>Stock Physique</th>
                    <th>Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInventory.lignes.map((l, i) => (
                    <tr key={i} className={l.ecart !== 0 ? 'has-diff' : ''}>
                      <td>{l.product_code}</td>
                      <td>{l.designation}</td>
                      <td>{l.quantite_theorique}</td>
                      <td>{l.quantite_physique}</td>
                      <td className={l.ecart !== 0 ? 'diff-value' : ''}>{l.ecart}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedInventory.statut === 'En cours' && (
                <div className="modal-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => validateInventory(selectedInventory.id)}
                    data-testid="validate-inventory-btn"
                  >
                    <CheckCircle size={18} /> Valider l'Inventaire
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== REPORTS MODULE ====================
const ReportsModule = () => {
  const [stats, setStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [salesChart, setSalesChart] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, topRes, chartRes] = await Promise.all([
          axios.get(`${API_URL}/api/dashboard/stats`),
          axios.get(`${API_URL}/api/dashboard/top-products`),
          axios.get(`${API_URL}/api/dashboard/sales-chart`)
        ]);
        setStats(statsRes.data);
        setTopProducts(topRes.data);
        setSalesChart(chartRes.data);
      } catch (error) {
        toast.error('Erreur lors du chargement des rapports');
      }
    };
    fetchData();
  }, []);

  const exportAll = () => {
    window.open(`${API_URL}/api/export/products`, '_blank');
    setTimeout(() => window.open(`${API_URL}/api/export/clients`, '_blank'), 500);
    setTimeout(() => window.open(`${API_URL}/api/export/invoices`, '_blank'), 1000);
    setTimeout(() => window.open(`${API_URL}/api/export/stock-movements`, '_blank'), 1500);
  };

  if (!stats) return <div className="loading">Chargement...</div>;

  return (
    <div className="module" data-testid="reports-module">
      <div className="module-header">
        <h2 className="page-title">Rapports & Statistiques</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={exportAll} data-testid="export-all-btn">
            <Download size={18} /> Exporter Tout (CSV)
          </button>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card summary">
          <h3>Résumé</h3>
          <div className="summary-items">
            <div className="summary-item">
              <span className="label">Produits</span>
              <span className="value">{stats.total_products}</span>
            </div>
            <div className="summary-item">
              <span className="label">Clients</span>
              <span className="value">{stats.total_clients}</span>
            </div>
            <div className="summary-item">
              <span className="label">Fournisseurs</span>
              <span className="value">{stats.total_suppliers}</span>
            </div>
            <div className="summary-item">
              <span className="label">Factures</span>
              <span className="value">{stats.total_invoices}</span>
            </div>
          </div>
        </div>

        <div className="report-card revenue">
          <h3>Chiffre d'Affaires</h3>
          <div className="revenue-items">
            <div className="revenue-item">
              <span className="label">Aujourd'hui</span>
              <span className="value">{formatCurrency(stats.chiffre_affaires_jour)}</span>
            </div>
            <div className="revenue-item highlight">
              <span className="label">Ce Mois</span>
              <span className="value">{formatCurrency(stats.chiffre_affaires_mois)}</span>
            </div>
          </div>
        </div>

        <div className="report-card alerts">
          <h3>Alertes</h3>
          <div className="alert-items">
            <div className="alert-item warning">
              <AlertTriangle size={20} />
              <span>{stats.products_low_stock} produits en stock bas</span>
            </div>
            <div className="alert-item info">
              <Clock size={20} />
              <span>{stats.invoices_pending} factures en attente</span>
            </div>
          </div>
        </div>

        <div className="report-card top-products">
          <h3>Top 10 Produits Vendus</h3>
          {topProducts.length === 0 ? (
            <p className="no-data">Aucune donnée</p>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>CA</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{p.designation}</td>
                    <td>{p.quantite_vendue}</td>
                    <td>{formatCurrency(p.montant_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="report-card sales-trend">
          <h3>Ventes des 30 Derniers Jours</h3>
          {salesChart.length === 0 ? (
            <p className="no-data">Aucune donnée</p>
          ) : (
            <div className="chart-container">
              <div className="simple-chart">
                {salesChart.slice(-15).map((day, i) => (
                  <div key={i} className="chart-bar-container">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${Math.max(5, (day.montant / Math.max(...salesChart.map(d => d.montant))) * 100)}%` 
                      }}
                      title={`${day.date}: ${formatCurrency(day.montant)}`}
                    />
                    <span className="chart-label">{day.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <Dashboard />;
      case 'products': return <ProductsModule />;
      case 'clients': return <ClientsModule />;
      case 'suppliers': return <SuppliersModule />;
      case 'invoices': return <InvoicesModule />;
      case 'stock': return <StockModule />;
      case 'inventory': return <InventoryModule />;
      case 'reports': return <ReportsModule />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Toaster position="top-right" richColors />
      
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        data-testid="mobile-menu-btn"
      >
        <Menu />
      </button>

      <Sidebar 
        activeModule={activeModule} 
        setActiveModule={setActiveModule}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      
      <main className="main-content">
        {renderModule()}
      </main>

      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}

export default App;
