const DB_NAME = 'faralink-offline';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_sales')) {
        db.createObjectStore('offline_sales', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cached_products')) {
        db.createObjectStore('cached_products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_clients')) {
        db.createObjectStore('cached_clients', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSale(saleData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    const request = store.add({ ...saleData, created_at: new Date().toISOString(), synced: false });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineSales() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readonly');
    const store = tx.objectStore('offline_sales');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOfflineSale(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function cacheProducts(products) {
  const db = await openDB();
  const tx = db.transaction('cached_products', 'readwrite');
  const store = tx.objectStore('cached_products');
  store.clear();
  products.forEach((p) => store.put(p));
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
}

export async function getCachedProducts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_products', 'readonly');
    const store = tx.objectStore('cached_products');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheClients(clients) {
  const db = await openDB();
  const tx = db.transaction('cached_clients', 'readwrite');
  const store = tx.objectStore('cached_clients');
  store.clear();
  clients.forEach((c) => store.put(c));
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
}

export async function getCachedClients() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_clients', 'readonly');
    const store = tx.objectStore('cached_clients');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineSalesCount() {
  const sales = await getOfflineSales();
  return sales.filter(s => !s.synced).length;
}
