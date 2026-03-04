"""
PWA (Progressive Web App) Tests for FaraLink POS
Tests manifest.json, service worker, and PWA icons accessibility
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestPWAManifest:
    """Test manifest.json for PWA configuration"""
    
    def test_manifest_accessible(self):
        """manifest.json should be accessible at /manifest.json"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: manifest.json is accessible")
    
    def test_manifest_name(self):
        """manifest.json should have correct app name"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        assert data.get("name") == "FaraLink POS", f"Expected 'FaraLink POS', got {data.get('name')}"
        print("PASS: manifest.json has correct name 'FaraLink POS'")
    
    def test_manifest_display_standalone(self):
        """manifest.json should have display=standalone"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        assert data.get("display") == "standalone", f"Expected 'standalone', got {data.get('display')}"
        print("PASS: manifest.json has display=standalone")
    
    def test_manifest_has_8_icons(self):
        """manifest.json should have 8 icons"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        icons = data.get("icons", [])
        assert len(icons) == 8, f"Expected 8 icons, got {len(icons)}"
        print(f"PASS: manifest.json has {len(icons)} icons")
    
    def test_manifest_icon_sizes(self):
        """manifest.json icons should include 192x192 and 512x512"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        icons = data.get("icons", [])
        sizes = [icon.get("sizes") for icon in icons]
        assert "192x192" in sizes, "Missing 192x192 icon"
        assert "512x512" in sizes, "Missing 512x512 icon"
        print("PASS: manifest.json includes required icon sizes (192x192, 512x512)")


class TestServiceWorker:
    """Test Service Worker accessibility"""
    
    def test_service_worker_accessible(self):
        """sw.js should be accessible at /sw.js"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: sw.js is accessible")
    
    def test_service_worker_is_javascript(self):
        """sw.js should contain JavaScript code"""
        response = requests.get(f"{BASE_URL}/sw.js")
        content = response.text
        # Check for typical service worker code patterns
        assert "self.addEventListener" in content, "sw.js should contain event listeners"
        assert "caches" in content or "cache" in content, "sw.js should reference cache"
        print("PASS: sw.js contains valid Service Worker code")
    
    def test_service_worker_has_install_handler(self):
        """sw.js should have install event handler"""
        response = requests.get(f"{BASE_URL}/sw.js")
        content = response.text
        assert "install" in content, "sw.js should handle install event"
        print("PASS: sw.js has install event handler")
    
    def test_service_worker_has_fetch_handler(self):
        """sw.js should have fetch event handler"""
        response = requests.get(f"{BASE_URL}/sw.js")
        content = response.text
        assert "fetch" in content, "sw.js should handle fetch event"
        print("PASS: sw.js has fetch event handler")


class TestPWAIcons:
    """Test PWA icons accessibility"""
    
    def test_icon_192x192(self):
        """192x192 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-192x192.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "image/png" in response.headers.get("content-type", ""), "Should be PNG image"
        print("PASS: icon-192x192.png is accessible")
    
    def test_icon_512x512(self):
        """512x512 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-512x512.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "image/png" in response.headers.get("content-type", ""), "Should be PNG image"
        print("PASS: icon-512x512.png is accessible")
    
    def test_icon_72x72(self):
        """72x72 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-72x72.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: icon-72x72.png is accessible")
    
    def test_icon_96x96(self):
        """96x96 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-96x96.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: icon-96x96.png is accessible")
    
    def test_icon_128x128(self):
        """128x128 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-128x128.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: icon-128x128.png is accessible")
    
    def test_icon_144x144(self):
        """144x144 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-144x144.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: icon-144x144.png is accessible")
    
    def test_icon_152x152(self):
        """152x152 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-152x152.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: icon-152x152.png is accessible")
    
    def test_icon_384x384(self):
        """384x384 icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-384x384.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: icon-384x384.png is accessible")
    
    def test_apple_touch_icon(self):
        """apple-touch-icon should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/apple-touch-icon.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "image/png" in response.headers.get("content-type", ""), "Should be PNG image"
        print("PASS: apple-touch-icon.png is accessible")


class TestFavicon:
    """Test favicon accessibility"""
    
    def test_favicon_accessible(self):
        """favicon.ico should be accessible"""
        response = requests.get(f"{BASE_URL}/favicon.ico")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: favicon.ico is accessible")


class TestIndexHTML:
    """Test index.html for PWA meta tags"""
    
    def test_index_accessible(self):
        """index.html should be accessible at root"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: index.html is accessible")
    
    def test_has_manifest_link(self):
        """index.html should have manifest link"""
        response = requests.get(f"{BASE_URL}/")
        content = response.text
        assert 'rel="manifest"' in content, "Missing manifest link"
        assert 'manifest.json' in content, "manifest.json not referenced"
        print("PASS: index.html has manifest link")
    
    def test_has_theme_color_meta(self):
        """index.html should have theme-color meta tag"""
        response = requests.get(f"{BASE_URL}/")
        content = response.text
        assert 'name="theme-color"' in content, "Missing theme-color meta tag"
        print("PASS: index.html has theme-color meta tag")
    
    def test_has_apple_mobile_web_app_capable(self):
        """index.html should have apple-mobile-web-app-capable meta"""
        response = requests.get(f"{BASE_URL}/")
        content = response.text
        assert 'name="apple-mobile-web-app-capable"' in content, "Missing apple-mobile-web-app-capable meta"
        print("PASS: index.html has apple-mobile-web-app-capable meta tag")
    
    def test_has_apple_touch_icon_link(self):
        """index.html should have apple-touch-icon link"""
        response = requests.get(f"{BASE_URL}/")
        content = response.text
        assert 'rel="apple-touch-icon"' in content, "Missing apple-touch-icon link"
        print("PASS: index.html has apple-touch-icon link")


class TestCoreAPI:
    """Test core API endpoints still work (regression)"""
    
    def test_auth_login(self):
        """Login endpoint should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@faralink.com",
            "mot_de_passe": "password123"
        })
        assert response.status_code == 200, f"Login failed with status {response.status_code}"
        data = response.json()
        assert "token" in data, "Login response missing token"
        print("PASS: Login endpoint works correctly")
    
    def test_products_api(self):
        """Products endpoint should work when authenticated"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@faralink.com",
            "mot_de_passe": "password123"
        })
        token = login_res.json().get("token")
        
        # Fetch products
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        assert response.status_code == 200, f"Products API failed with status {response.status_code}"
        print("PASS: Products API works correctly")
    
    def test_dashboard_api(self):
        """Dashboard stats endpoint should work"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@faralink.com",
            "mot_de_passe": "password123"
        })
        token = login_res.json().get("token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Dashboard API failed with status {response.status_code}"
        print("PASS: Dashboard stats API works correctly")
