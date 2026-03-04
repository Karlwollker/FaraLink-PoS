import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import {
  LayoutDashboard, Package, Users, Truck, ShoppingCart, 
  BarChart3, Warehouse, ClipboardList, Plus, Search,
  Edit, Trash2, Eye, Download, AlertTriangle, TrendingUp,
  CheckCircle, Clock, X, Menu, Minus, CreditCard, Banknote,
  Smartphone, Receipt, DollarSign, XCircle, Calculator,
  RefreshCw, Printer
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

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ==================== SIDEBAR ====================
const Sidebar = ({ activeModule, setActiveModule, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'pos', label: 'Point de Vente', icon: ShoppingCart },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
    { id: 'stock', label: 'Stock', icon: Warehouse },
    { id: 'inventory', label: 'Inventaires', icon: ClipboardList },
    { id: 'reports', label: 'Rapports', icon: BarChart3 },
  ];

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h1 className="logo">GestCom</h1>
        <span className="logo-subtitle">Point de Vente</span>
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
const Dashboard = ({ setActiveModule }) => {
  const [stats, setStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, topRes, lowStockRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`),
        axios.get(`${API_URL}/api/dashboard/top-products`),
        axios.get(`${API_URL}/api/products?low_stock=true`)
      ]);
      setStats(statsRes.data);
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
          <div className="stat-icon"><Receipt /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_sales}</span>
            <span className="stat-label">Ventes</span>
          </div>
        </div>
        <div className={`stat-card ${stats.caisse_ouverte ? 'warning' : 'danger'}`}>
          <div className="stat-icon"><DollarSign /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.caisse_ouverte ? formatCurrency(stats.fond_caisse_actuel) : 'Fermée'}</span>
            <span className="stat-label">Caisse</span>
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

        <div className="dashboard-card quick-action">
          <h3><ShoppingCart /> Accès Rapide</h3>
          <button 
            className="btn btn-primary btn-large"
            onClick={() => setActiveModule('pos')}
            data-testid="quick-pos-btn"
          >
            <ShoppingCart size={24} />
            Ouvrir le Point de Vente
          </button>
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

// ==================== POINT OF SALE MODULE ====================
const POSModule = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [cashRegister, setCashRegister] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCashRegisterModal, setShowCashRegisterModal] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [todaySales, setTodaySales] = useState([]);
  const [fondCaisse, setFondCaisse] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [amountReceived, setAmountReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [productsRes, categoriesRes, clientsRes, registerRes] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/products/categories/list`),
        axios.get(`${API_URL}/api/clients`),
        axios.get(`${API_URL}/api/cash-register/current`)
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setClients(clientsRes.data);
      setCashRegister(registerRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    }
  };

  const fetchTodaySales = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/pos/sales/today`);
      setTodaySales(res.data);
    } catch (error) {
      console.error('Error fetching sales');
    }
  };

  const openCashRegister = async () => {
    if (!fondCaisse || parseFloat(fondCaisse) < 0) {
      toast.error('Entrez un fond de caisse valide');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/cash-register/open`, {
        fond_caisse: parseFloat(fondCaisse)
      });
      toast.success('Caisse ouverte avec succès');
      setShowCashRegisterModal(false);
      setFondCaisse('');
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ouverture');
    }
  };

  const closeCashRegister = async () => {
    const montant = prompt('Entrez le montant compté en caisse:');
    if (montant === null) return;
    
    try {
      const res = await axios.post(`${API_URL}/api/cash-register/close`, {
        montant_compte: parseFloat(montant)
      });
      toast.success(`Caisse fermée. Écart: ${formatCurrency(res.data.ecart)}`);
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la fermeture');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.categorie === selectedCategory;
    const matchesSearch = !searchQuery || 
      p.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code_barre && p.code_barre.includes(searchQuery));
    return matchesCategory && matchesSearch && p.quantite_stock > 0;
  });

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      if (existingItem.quantite >= product.quantite_stock) {
        toast.error('Stock insuffisant');
        return;
      }
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantite: item.quantite + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        code: product.code,
        designation: product.designation,
        prix_unitaire: product.prix_vente,
        quantite: 1,
        stock: product.quantite_stock
      }]);
    }
  };

  const updateCartQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantite + delta;
        if (newQty <= 0) return null;
        if (newQty > item.stock) {
          toast.error('Stock insuffisant');
          return item;
        }
        return { ...item, quantite: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient(null);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0);
  const cartTVA = cartTotal * 0.18;
  const cartTTC = cartTotal + cartTVA;

  const handleBarcodeScan = async (e) => {
    if (e.key === 'Enter' && searchQuery) {
      try {
        const res = await axios.get(`${API_URL}/api/products/search-barcode/${searchQuery}`);
        addToCart(res.data);
        setSearchQuery('');
      } catch (error) {
        // Not found by barcode, show filtered results
      }
    }
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

    const received = parseFloat(amountReceived) || 0;
    if (paymentMethod === 'Espèces' && received < cartTTC) {
      toast.error('Montant reçu insuffisant');
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/pos/sale`, {
        client_id: selectedClient?.id || null,
        lignes: cart.map(item => ({
          product_id: item.product_id,
          quantite: item.quantite
        })),
        montant_recu: received || cartTTC,
        mode_paiement: paymentMethod
      });
      
      setLastSale(res.data);
      setShowPayment(false);
      setShowReceipt(true);
      clearCart();
      setAmountReceived('');
      setPaymentMethod('Espèces');
      fetchInitialData();
      toast.success('Vente enregistrée !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la vente');
    }
  };

  const change = (parseFloat(amountReceived) || 0) - cartTTC;

  // Check if cash register is closed
  if (!cashRegister?.caisse_ouverte) {
    return (
      <div className="module pos-module" data-testid="pos-module">
        <div className="cash-register-closed">
          <div className="closed-message">
            <DollarSign size={64} />
            <h2>Caisse Fermée</h2>
            <p>Ouvrez la caisse pour commencer à vendre</p>
            <button 
              className="btn btn-primary btn-large"
              onClick={() => setShowCashRegisterModal(true)}
              data-testid="open-register-btn"
            >
              <DollarSign size={20} /> Ouvrir la Caisse
            </button>
          </div>
        </div>

        {showCashRegisterModal && (
          <div className="modal-overlay" onClick={() => setShowCashRegisterModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Ouvrir la Caisse</h3>
                <button className="btn-close" onClick={() => setShowCashRegisterModal(false)}><X /></button>
              </div>
              <div className="modal-form">
                <div className="form-group">
                  <label>Fond de Caisse (FCFA)</label>
                  <input
                    type="number"
                    value={fondCaisse}
                    onChange={(e) => setFondCaisse(e.target.value)}
                    placeholder="Ex: 50000"
                    autoFocus
                    data-testid="fond-caisse-input"
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowCashRegisterModal(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={openCashRegister} data-testid="confirm-open-btn">
                    Ouvrir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="module pos-module" data-testid="pos-module">
      <div className="pos-header">
        <div className="pos-header-left">
          <h2 className="page-title">Point de Vente</h2>
          <span className="register-status">
            <CheckCircle size={16} className="text-success" /> Caisse ouverte - Fond: {formatCurrency(cashRegister.fond_caisse)}
          </span>
        </div>
        <div className="pos-header-actions">
          <button className="btn btn-secondary" onClick={() => { fetchTodaySales(); setShowSalesHistory(true); }} data-testid="sales-history-btn">
            <Receipt size={18} /> Historique
          </button>
          <button className="btn btn-danger" onClick={closeCashRegister} data-testid="close-register-btn">
            <XCircle size={18} /> Fermer Caisse
          </button>
        </div>
      </div>

      <div className="pos-container">
        {/* Products Panel */}
        <div className="pos-products">
          <div className="pos-search">
            <div className="search-box">
              <Search size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher ou scanner un code-barres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeScan}
                data-testid="pos-search-input"
              />
            </div>
          </div>

          <div className="pos-categories">
            <button
              className={`category-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              Tous
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pos-products-grid">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="pos-product-card"
                onClick={() => addToCart(product)}
                data-testid={`product-card-${product.code}`}
              >
                <div className="product-info">
                  <span className="product-name">{product.designation}</span>
                  <span className="product-code">{product.code}</span>
                </div>
                <div className="product-footer">
                  <span className="product-price">{formatCurrency(product.prix_vente)}</span>
                  <span className="product-stock">Stock: {product.quantite_stock}</span>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <p className="no-data">Aucun produit trouvé</p>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="pos-cart">
          <div className="cart-header">
            <h3><ShoppingCart size={20} /> Panier</h3>
            {cart.length > 0 && (
              <button className="btn-icon danger" onClick={clearCart} title="Vider le panier">
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="cart-client">
            <select
              value={selectedClient?.id || ''}
              onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
              data-testid="client-select"
            >
              <option value="">Client Comptoir</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <ShoppingCart size={48} />
                <p>Panier vide</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product_id} className="cart-item">
                  <div className="cart-item-info">
                    <span className="item-name">{item.designation}</span>
                    <span className="item-price">{formatCurrency(item.prix_unitaire)}</span>
                  </div>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => updateCartQuantity(item.product_id, -1)}>
                      <Minus size={16} />
                    </button>
                    <span className="item-qty">{item.quantite}</span>
                    <button className="qty-btn" onClick={() => updateCartQuantity(item.product_id, 1)}>
                      <Plus size={16} />
                    </button>
                    <button className="btn-icon danger small" onClick={() => removeFromCart(item.product_id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="cart-item-total">
                    {formatCurrency(item.prix_unitaire * item.quantite)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Sous-total HT</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            <div className="summary-row">
              <span>TVA (18%)</span>
              <span>{formatCurrency(cartTVA)}</span>
            </div>
            <div className="summary-row total">
              <span>Total TTC</span>
              <span>{formatCurrency(cartTTC)}</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-pay"
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            data-testid="pay-btn"
          >
            <Banknote size={20} /> Payer {formatCurrency(cartTTC)}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal modal-payment" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Paiement</h3>
              <button className="btn-close" onClick={() => setShowPayment(false)}><X /></button>
            </div>
            <div className="payment-content">
              <div className="payment-total">
                <span>Total à payer</span>
                <span className="total-amount">{formatCurrency(cartTTC)}</span>
              </div>

              <div className="payment-methods">
                <button
                  className={`payment-method ${paymentMethod === 'Espèces' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Espèces')}
                  data-testid="payment-cash"
                >
                  <Banknote size={24} />
                  <span>Espèces</span>
                </button>
                <button
                  className={`payment-method ${paymentMethod === 'Mobile Money' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Mobile Money')}
                  data-testid="payment-mobile"
                >
                  <Smartphone size={24} />
                  <span>Mobile Money</span>
                </button>
                <button
                  className={`payment-method ${paymentMethod === 'Carte' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Carte')}
                  data-testid="payment-card"
                >
                  <CreditCard size={24} />
                  <span>Carte</span>
                </button>
              </div>

              {paymentMethod === 'Espèces' && (
                <div className="cash-input">
                  <label>Montant reçu (FCFA)</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    autoFocus
                    data-testid="amount-received-input"
                  />
                  <div className="quick-amounts">
                    {[1000, 2000, 5000, 10000, 20000, 50000].map(amount => (
                      <button
                        key={amount}
                        className="quick-amount-btn"
                        onClick={() => setAmountReceived(amount.toString())}
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                    <button
                      className="quick-amount-btn exact"
                      onClick={() => setAmountReceived(Math.ceil(cartTTC).toString())}
                    >
                      Exact
                    </button>
                  </div>
                  {amountReceived && (
                    <div className={`change-display ${change >= 0 ? 'positive' : 'negative'}`}>
                      <span>Monnaie à rendre:</span>
                      <span className="change-amount">{formatCurrency(Math.max(0, change))}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn-primary btn-large"
                onClick={processPayment}
                disabled={paymentMethod === 'Espèces' && change < 0}
                data-testid="confirm-payment-btn"
              >
                <CheckCircle size={20} /> Valider le Paiement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="modal-overlay" onClick={() => setShowReceipt(false)}>
          <div className="modal modal-receipt" onClick={e => e.stopPropagation()}>
            <div className="receipt">
              <div className="receipt-header">
                <h2>GestCom</h2>
                <p>Point de Vente</p>
              </div>
              <div className="receipt-info">
                <p><strong>Ticket:</strong> {lastSale.numero_ticket}</p>
                <p><strong>Date:</strong> {formatDateTime(lastSale.date_vente)}</p>
                <p><strong>Client:</strong> {lastSale.client_nom}</p>
              </div>
              <div className="receipt-items">
                {lastSale.lignes.map((ligne, i) => (
                  <div key={i} className="receipt-item">
                    <div className="receipt-item-name">{ligne.designation}</div>
                    <div className="receipt-item-detail">
                      {ligne.quantite} x {formatCurrency(ligne.prix_unitaire)} = {formatCurrency(ligne.montant_ttc)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="receipt-totals">
                <div className="receipt-row">
                  <span>Total HT:</span>
                  <span>{formatCurrency(lastSale.montant_ht)}</span>
                </div>
                <div className="receipt-row">
                  <span>TVA:</span>
                  <span>{formatCurrency(lastSale.montant_tva)}</span>
                </div>
                <div className="receipt-row total">
                  <span>Total TTC:</span>
                  <span>{formatCurrency(lastSale.montant_ttc)}</span>
                </div>
                <div className="receipt-row">
                  <span>Payé ({lastSale.mode_paiement}):</span>
                  <span>{formatCurrency(lastSale.montant_recu)}</span>
                </div>
                <div className="receipt-row">
                  <span>Rendu:</span>
                  <span>{formatCurrency(lastSale.montant_rendu)}</span>
                </div>
              </div>
              <div className="receipt-footer">
                <p>Merci de votre visite !</p>
              </div>
            </div>
            <div className="receipt-actions">
              <button className="btn btn-secondary" onClick={() => setShowReceipt(false)}>
                Fermer
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={18} /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales History Modal */}
      {showSalesHistory && (
        <div className="modal-overlay" onClick={() => setShowSalesHistory(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ventes du Jour</h3>
              <button className="btn-close" onClick={() => setShowSalesHistory(false)}><X /></button>
            </div>
            <div className="sales-history-content">
              <div className="sales-summary">
                <div className="summary-stat">
                  <span className="stat-value">{todaySales.nombre_ventes || 0}</span>
                  <span className="stat-label">Ventes</span>
                </div>
                <div className="summary-stat primary">
                  <span className="stat-value">{formatCurrency(todaySales.total || 0)}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Heure</th>
                      <th>Client</th>
                      <th>Montant</th>
                      <th>Paiement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(todaySales.ventes || []).map(sale => (
                      <tr key={sale.id}>
                        <td>{sale.numero_ticket}</td>
                        <td>{sale.date_vente?.substring(11, 16)}</td>
                        <td>{sale.client_nom}</td>
                        <td>{formatCurrency(sale.montant_ttc)}</td>
                        <td>{sale.mode_paiement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!todaySales.ventes || todaySales.ventes.length === 0) && (
                  <p className="no-data">Aucune vente aujourd'hui</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
                  <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required data-testid="product-code-input" />
                </div>
                <div className="form-group">
                  <label>Code Barre</label>
                  <input type="text" value={formData.code_barre} onChange={(e) => setFormData({...formData, code_barre: e.target.value})} data-testid="product-barcode-input" />
                </div>
              </div>
              <div className="form-group">
                <label>Désignation *</label>
                <input type="text" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} required data-testid="product-designation-input" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Catégorie *</label>
                  <input type="text" value={formData.categorie} onChange={(e) => setFormData({...formData, categorie: e.target.value})} required list="categories-list" data-testid="product-category-input" />
                  <datalist id="categories-list">
                    {categories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Unité</label>
                  <select value={formData.unite} onChange={(e) => setFormData({...formData, unite: e.target.value})} data-testid="product-unit-input">
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
                  <input type="number" value={formData.prix_achat} onChange={(e) => setFormData({...formData, prix_achat: e.target.value})} required min="0" data-testid="product-buy-price-input" />
                </div>
                <div className="form-group">
                  <label>Prix de Vente (FCFA) *</label>
                  <input type="number" value={formData.prix_vente} onChange={(e) => setFormData({...formData, prix_vente: e.target.value})} required min="0" data-testid="product-sell-price-input" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock Initial</label>
                  <input type="number" value={formData.quantite_stock} onChange={(e) => setFormData({...formData, quantite_stock: e.target.value})} min="0" data-testid="product-stock-input" />
                </div>
                <div className="form-group">
                  <label>Stock Minimum</label>
                  <input type="number" value={formData.stock_minimum} onChange={(e) => setFormData({...formData, stock_minimum: e.target.value})} min="0" data-testid="product-min-stock-input" />
                </div>
                <div className="form-group">
                  <label>TVA (%)</label>
                  <input type="number" value={formData.tva} onChange={(e) => setFormData({...formData, tva: e.target.value})} min="0" max="100" data-testid="product-tva-input" />
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
  const [formData, setFormData] = useState({ code: '', nom: '', telephone: '', email: '', adresse: '', ville: '' });

  const fetchClients = useCallback(async () => {
    try {
      const params = search ? `?search=${search}` : '';
      const res = await axios.get(`${API_URL}/api/clients${params}`);
      setClients(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des clients');
    }
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

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
    setFormData({ code: client.code, nom: client.nom, telephone: client.telephone || '', email: client.email || '', adresse: client.adresse || '', ville: client.ville || '' });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({ code: '', nom: '', telephone: '', email: '', adresse: '', ville: '' });
  };

  return (
    <div className="module" data-testid="clients-module">
      <div className="module-header">
        <h2 className="page-title">Gestion des Clients</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => window.open(`${API_URL}/api/export/clients`, '_blank')} data-testid="export-clients-btn">
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
          <input type="text" placeholder="Rechercher par code, nom, téléphone..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="client-search-input" />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Nom</th><th>Téléphone</th><th>Ville</th><th>Solde</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id}>
                <td>{client.code}</td>
                <td>{client.nom}</td>
                <td>{client.telephone || '-'}</td>
                <td>{client.ville || '-'}</td>
                <td className={client.solde > 0 ? 'debt' : ''}>{formatCurrency(client.solde)}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => handleEdit(client)} title="Modifier"><Edit size={16} /></button>
                    <button className="btn-icon danger" onClick={() => handleDelete(client.id)} title="Supprimer"><Trash2 size={16} /></button>
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
                  <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required data-testid="client-code-input" />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} required data-testid="client-name-input" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="tel" value={formData.telephone} onChange={(e) => setFormData({...formData, telephone: e.target.value})} data-testid="client-phone-input" />
                </div>
                <div className="form-group">
                  <label>Ville</label>
                  <input type="text" value={formData.ville} onChange={(e) => setFormData({...formData, ville: e.target.value})} data-testid="client-city-input" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" data-testid="client-submit-btn">{editingClient ? 'Modifier' : 'Créer'}</button>
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
  const [formData, setFormData] = useState({ code: '', nom: '', telephone: '', email: '', adresse: '', ville: '' });

  const fetchSuppliers = useCallback(async () => {
    try {
      const params = search ? `?search=${search}` : '';
      const res = await axios.get(`${API_URL}/api/suppliers${params}`);
      setSuppliers(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des fournisseurs');
    }
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`${API_URL}/api/suppliers/${editingSupplier.id}`, formData);
        toast.success('Fournisseur modifié');
      } else {
        await axios.post(`${API_URL}/api/suppliers`, formData);
        toast.success('Fournisseur créé');
      }
      setShowModal(false);
      setEditingSupplier(null);
      setFormData({ code: '', nom: '', telephone: '', email: '', adresse: '', ville: '' });
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce fournisseur ?')) return;
    try {
      await axios.delete(`${API_URL}/api/suppliers/${id}`);
      toast.success('Fournisseur supprimé');
      fetchSuppliers();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  return (
    <div className="module" data-testid="suppliers-module">
      <div className="module-header">
        <h2 className="page-title">Gestion des Fournisseurs</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => { setEditingSupplier(null); setFormData({ code: '', nom: '', telephone: '', email: '', adresse: '', ville: '' }); setShowModal(true); }} data-testid="add-supplier-btn">
            <Plus size={18} /> Nouveau Fournisseur
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="supplier-search-input" />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Nom</th><th>Téléphone</th><th>Ville</th><th>Actions</th></tr></thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id}>
                <td>{s.code}</td>
                <td>{s.nom}</td>
                <td>{s.telephone || '-'}</td>
                <td>{s.ville || '-'}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => { setEditingSupplier(s); setFormData({ code: s.code, nom: s.nom, telephone: s.telephone || '', email: s.email || '', adresse: s.adresse || '', ville: s.ville || '' }); setShowModal(true); }}><Edit size={16} /></button>
                    <button className="btn-icon danger" onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && <p className="no-data">Aucun fournisseur</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Modifier' : 'Nouveau'} Fournisseur</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group"><label>Code *</label><input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required /></div>
                <div className="form-group"><label>Nom *</label><input type="text" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Téléphone</label><input type="tel" value={formData.telephone} onChange={(e) => setFormData({...formData, telephone: e.target.value})} /></div>
                <div className="form-group"><label>Ville</label><input type="text" value={formData.ville} onChange={(e) => setFormData({...formData, ville: e.target.value})} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
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
  const [formData, setFormData] = useState({ product_id: '', type_mouvement: 'Entrée', quantite: 1, reference: '', motif: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movRes, prodRes] = await Promise.all([
          axios.get(`${API_URL}/api/stock-movements`),
          axios.get(`${API_URL}/api/products`)
        ]);
        setMovements(movRes.data);
        setProducts(prodRes.data);
      } catch (error) {
        toast.error('Erreur');
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/stock-movements`, { ...formData, quantite: parseInt(formData.quantite) });
      toast.success('Mouvement enregistré');
      setShowModal(false);
      setFormData({ product_id: '', type_mouvement: 'Entrée', quantite: 1, reference: '', motif: '' });
      const res = await axios.get(`${API_URL}/api/stock-movements`);
      setMovements(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
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
          <button className="btn btn-secondary" onClick={() => window.open(`${API_URL}/api/export/stock-movements`, '_blank')}><Download size={18} /> Exporter</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} data-testid="add-movement-btn"><Plus size={18} /> Nouveau Mouvement</button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Code</th><th>Désignation</th><th>Type</th><th>Qté</th><th>Avant</th><th>Après</th><th>Motif</th></tr></thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id}>
                <td>{formatDate(m.created_at)}</td>
                <td>{m.product_code}</td>
                <td>{m.designation}</td>
                <td><span className={`movement-badge ${getMovementClass(m.type_mouvement)}`}>{m.type_mouvement}</span></td>
                <td>{m.quantite}</td>
                <td>{m.quantite_avant}</td>
                <td>{m.quantite_apres}</td>
                <td>{m.motif || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <p className="no-data">Aucun mouvement</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nouveau Mouvement</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Produit *</label>
                <select value={formData.product_id} onChange={(e) => setFormData({...formData, product_id: e.target.value})} required data-testid="movement-product-select">
                  <option value="">Sélectionner</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.designation} (Stock: {p.quantite_stock})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select value={formData.type_mouvement} onChange={(e) => setFormData({...formData, type_mouvement: e.target.value})} required>
                    <option value="Entrée">Entrée</option>
                    <option value="Sortie">Sortie</option>
                    <option value="Ajustement">Ajustement</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantité *</label>
                  <input type="number" value={formData.quantite} onChange={(e) => setFormData({...formData, quantite: e.target.value})} required min="1" />
                </div>
              </div>
              <div className="form-group">
                <label>Motif</label>
                <input type="text" value={formData.motif} onChange={(e) => setFormData({...formData, motif: e.target.value})} placeholder="Raison du mouvement" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, prodRes] = await Promise.all([
          axios.get(`${API_URL}/api/inventories`),
          axios.get(`${API_URL}/api/products`)
        ]);
        setInventories(invRes.data);
        setProducts(prodRes.data);
      } catch (error) {
        toast.error('Erreur');
      }
    };
    fetchData();
  }, []);

  const startNewInventory = () => {
    setInventoryLines(products.map(p => ({
      product_id: p.id, product_code: p.code, designation: p.designation,
      quantite_theorique: p.quantite_stock, quantite_physique: p.quantite_stock
    })));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/inventories`, {
        lignes: inventoryLines.map(l => ({ product_id: l.product_id, quantite_physique: l.quantite_physique }))
      });
      toast.success('Inventaire créé');
      setShowModal(false);
      const res = await axios.get(`${API_URL}/api/inventories`);
      setInventories(res.data);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const viewInventory = async (inv) => {
    try {
      const res = await axios.get(`${API_URL}/api/inventories/${inv.id}`);
      setSelectedInventory(res.data);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const validateInventory = async (invId) => {
    if (!window.confirm('Valider cet inventaire ?')) return;
    try {
      await axios.post(`${API_URL}/api/inventories/${invId}/validate`);
      toast.success('Inventaire validé');
      setShowDetailModal(false);
      const res = await axios.get(`${API_URL}/api/inventories`);
      setInventories(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <div className="module" data-testid="inventory-module">
      <div className="module-header">
        <h2 className="page-title">Inventaires</h2>
        <button className="btn btn-primary" onClick={startNewInventory} data-testid="new-inventory-btn"><Plus size={18} /> Nouvel Inventaire</button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Numéro</th><th>Date</th><th>Produits</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {inventories.map(inv => (
              <tr key={inv.id}>
                <td>{inv.numero}</td>
                <td>{formatDate(inv.date_inventaire)}</td>
                <td>{inv.lignes?.length || 0}</td>
                <td><span className={`status-badge ${inv.statut === 'Validé' ? 'status-paid' : 'status-pending'}`}>{inv.statut}</span></td>
                <td><button className="btn-icon" onClick={() => viewInventory(inv)}><Eye size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventories.length === 0 && <p className="no-data">Aucun inventaire</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Nouvel Inventaire</h3><button className="btn-close" onClick={() => setShowModal(false)}><X /></button></div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="inventory-lines-container">
                <table className="inventory-table">
                  <thead><tr><th>Code</th><th>Désignation</th><th>Théorique</th><th>Physique</th><th>Écart</th></tr></thead>
                  <tbody>
                    {inventoryLines.map(l => (
                      <tr key={l.product_id} className={l.quantite_physique !== l.quantite_theorique ? 'has-diff' : ''}>
                        <td>{l.product_code}</td>
                        <td>{l.designation}</td>
                        <td>{l.quantite_theorique}</td>
                        <td><input type="number" value={l.quantite_physique} onChange={(e) => setInventoryLines(inventoryLines.map(line => line.product_id === l.product_id ? {...line, quantite_physique: parseInt(e.target.value) || 0} : line))} min="0" className="qty-input" /></td>
                        <td className={l.quantite_physique - l.quantite_theorique !== 0 ? 'diff-value' : ''}>{l.quantite_physique - l.quantite_theorique}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedInventory && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Inventaire {selectedInventory.numero}</h3><button className="btn-close" onClick={() => setShowDetailModal(false)}><X /></button></div>
            <div className="inventory-content">
              <p><strong>Date:</strong> {formatDate(selectedInventory.date_inventaire)} | <strong>Statut:</strong> <span className={`status-badge ${selectedInventory.statut === 'Validé' ? 'status-paid' : 'status-pending'}`}>{selectedInventory.statut}</span></p>
              <table className="inventory-table">
                <thead><tr><th>Code</th><th>Désignation</th><th>Théorique</th><th>Physique</th><th>Écart</th></tr></thead>
                <tbody>
                  {selectedInventory.lignes.map((l, i) => (
                    <tr key={i} className={l.ecart !== 0 ? 'has-diff' : ''}><td>{l.product_code}</td><td>{l.designation}</td><td>{l.quantite_theorique}</td><td>{l.quantite_physique}</td><td className={l.ecart !== 0 ? 'diff-value' : ''}>{l.ecart}</td></tr>
                  ))}
                </tbody>
              </table>
              {selectedInventory.statut === 'En cours' && (
                <div className="modal-actions"><button className="btn btn-primary" onClick={() => validateInventory(selectedInventory.id)}><CheckCircle size={18} /> Valider</button></div>
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, topRes] = await Promise.all([
          axios.get(`${API_URL}/api/dashboard/stats`),
          axios.get(`${API_URL}/api/dashboard/top-products`)
        ]);
        setStats(statsRes.data);
        setTopProducts(topRes.data);
      } catch (error) {
        toast.error('Erreur');
      }
    };
    fetchData();
  }, []);

  const exportAll = () => {
    window.open(`${API_URL}/api/export/products`, '_blank');
    setTimeout(() => window.open(`${API_URL}/api/export/clients`, '_blank'), 500);
    setTimeout(() => window.open(`${API_URL}/api/export/sales`, '_blank'), 1000);
    setTimeout(() => window.open(`${API_URL}/api/export/stock-movements`, '_blank'), 1500);
  };

  if (!stats) return <div className="loading">Chargement...</div>;

  return (
    <div className="module" data-testid="reports-module">
      <div className="module-header">
        <h2 className="page-title">Rapports & Statistiques</h2>
        <button className="btn btn-primary" onClick={exportAll}><Download size={18} /> Exporter Tout (CSV)</button>
      </div>

      <div className="reports-grid">
        <div className="report-card summary">
          <h3>Résumé</h3>
          <div className="summary-items">
            <div className="summary-item"><span className="label">Produits</span><span className="value">{stats.total_products}</span></div>
            <div className="summary-item"><span className="label">Clients</span><span className="value">{stats.total_clients}</span></div>
            <div className="summary-item"><span className="label">Fournisseurs</span><span className="value">{stats.total_suppliers}</span></div>
            <div className="summary-item"><span className="label">Ventes</span><span className="value">{stats.total_sales}</span></div>
          </div>
        </div>

        <div className="report-card revenue">
          <h3>Chiffre d'Affaires</h3>
          <div className="revenue-items">
            <div className="revenue-item"><span className="label">Aujourd'hui</span><span className="value">{formatCurrency(stats.chiffre_affaires_jour)}</span></div>
            <div className="revenue-item highlight"><span className="label">Ce Mois</span><span className="value">{formatCurrency(stats.chiffre_affaires_mois)}</span></div>
          </div>
        </div>

        <div className="report-card alerts">
          <h3>Alertes</h3>
          <div className="alert-items">
            <div className="alert-item warning"><AlertTriangle size={20} /><span>{stats.products_low_stock} produits en stock bas</span></div>
            <div className="alert-item info"><DollarSign size={20} /><span>Caisse: {stats.caisse_ouverte ? 'Ouverte' : 'Fermée'}</span></div>
          </div>
        </div>

        <div className="report-card top-products">
          <h3>Top 10 Produits Vendus</h3>
          {topProducts.length === 0 ? <p className="no-data">Aucune donnée</p> : (
            <table className="mini-table">
              <thead><tr><th>#</th><th>Produit</th><th>Qté</th><th>CA</th></tr></thead>
              <tbody>
                {topProducts.map((p, i) => <tr key={i}><td>{i + 1}</td><td>{p.designation}</td><td>{p.quantite_vendue}</td><td>{formatCurrency(p.montant_total)}</td></tr>)}
              </tbody>
            </table>
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
      case 'dashboard': return <Dashboard setActiveModule={setActiveModule} />;
      case 'pos': return <POSModule />;
      case 'products': return <ProductsModule />;
      case 'clients': return <ClientsModule />;
      case 'suppliers': return <SuppliersModule />;
      case 'stock': return <StockModule />;
      case 'inventory': return <InventoryModule />;
      case 'reports': return <ReportsModule />;
      default: return <Dashboard setActiveModule={setActiveModule} />;
    }
  };

  return (
    <div className="app">
      <Toaster position="top-right" richColors />
      <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} data-testid="mobile-menu-btn"><Menu /></button>
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <main className="main-content">{renderModule()}</main>
      {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />}
    </div>
  );
}

export default App;
