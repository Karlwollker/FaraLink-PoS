import requests
import sys
import json
from datetime import datetime

class POSSystemAPITester:
    def __init__(self, base_url="https://faralink-pwa.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_sales = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard_stats_with_caisse(self):
        """Test dashboard statistics showing caisse status"""
        success, response = self.run_test(
            "Dashboard Stats with Caisse Status",
            "GET", 
            "dashboard/stats",
            200
        )
        
        if success:
            caisse_ouverte = response.get('caisse_ouverte', False)
            fond_caisse = response.get('fond_caisse_actuel', 0)
            ca_jour = response.get('chiffre_affaires_jour', 0)
            
            print(f"   💰 Caisse Status: {'OUVERTE' if caisse_ouverte else 'FERMÉE'}")
            print(f"   💰 Fond de Caisse: {fond_caisse} FCFA")
            print(f"   📊 CA Jour: {ca_jour} FCFA")
            
            if caisse_ouverte:
                print(f"   ✅ Cash register is open - ready for POS sales")
            else:
                print(f"   ⚠️  Cash register is closed - POS sales not possible")
        
        return success

    def test_cash_register_current_status(self):
        """Test current cash register status"""
        success, response = self.run_test(
            "Current Cash Register Status",
            "GET",
            "cash-register/current", 
            200
        )
        
        if success:
            caisse_ouverte = response.get('caisse_ouverte', False)
            if caisse_ouverte:
                print(f"   💰 Fond: {response.get('fond_caisse', 0)} FCFA")
                print(f"   🎫 Tickets: {response.get('nombre_tickets', 0)}")
                print(f"   💵 Ventes: {response.get('total_ventes', 0)} FCFA")
                print(f"   💸 Espèces: {response.get('total_especes', 0)} FCFA")
                print(f"   📱 Mobile Money: {response.get('total_mobile_money', 0)} FCFA")
        
        return success

    def test_pos_sale_creation(self, client_id=None):
        """Test POS sale creation with stock reduction"""
        # Get existing products
        success, products = self.run_test(
            "Get Products for Sale",
            "GET",
            "products",
            200
        )
        
        if not success or not products:
            print("   ❌ No products available for sale")
            return False
            
        # Use PROD001 (Riz) and PROD002 (Huile) as mentioned in context
        riz_product = next((p for p in products if p['code'] == 'PROD001'), None)
        huile_product = next((p for p in products if p['code'] == 'PROD002'), None)
        
        if not riz_product or not huile_product:
            print("   ❌ Test products PROD001 or PROD002 not found")
            return False
            
        # Record initial stock
        riz_stock_before = riz_product['quantite_stock']
        huile_stock_before = huile_product['quantite_stock']
        
        print(f"   📦 Stock before sale - Riz: {riz_stock_before}, Huile: {huile_stock_before}")
        
        # Create POS sale
        sale_data = {
            "client_id": client_id,
            "lignes": [
                {
                    "product_id": riz_product['id'],
                    "quantite": 2
                },
                {
                    "product_id": huile_product['id'], 
                    "quantite": 1
                }
            ],
            "montant_recu": 45000,  # Enough to cover (2*18000 + 1*6500) = 42500
            "mode_paiement": "Espèces",
            "vendeur": "Test Vendeur"
        }
        
        success, response = self.run_test(
            "Create POS Sale",
            "POST",
            "pos/sale",
            200,
            data=sale_data
        )
        
        if success and 'id' in response:
            sale_id = response['id']
            self.created_sales.append(sale_id)
            
            print(f"   🎫 Sale created: {response.get('numero_ticket')}")
            print(f"   💰 Total: {response.get('montant_ttc')} FCFA")
            print(f"   💸 Received: {response.get('montant_recu')} FCFA")
            print(f"   🔄 Change: {response.get('montant_rendu')} FCFA")
            
            # Verify stock reduction
            success2, updated_products = self.run_test(
                "Get Products After Sale",
                "GET",
                "products",
                200
            )
            
            if success2:
                riz_updated = next((p for p in updated_products if p['code'] == 'PROD001'), None)
                huile_updated = next((p for p in updated_products if p['code'] == 'PROD002'), None)
                
                if riz_updated and huile_updated:
                    riz_stock_after = riz_updated['quantite_stock']
                    huile_stock_after = huile_updated['quantite_stock']
                    
                    print(f"   📦 Stock after sale - Riz: {riz_stock_after}, Huile: {huile_stock_after}")
                    
                    # Verify expected reductions
                    riz_expected = riz_stock_before - 2
                    huile_expected = huile_stock_before - 1
                    
                    if riz_stock_after == riz_expected and huile_stock_after == huile_expected:
                        print(f"   ✅ Stock correctly reduced")
                    else:
                        print(f"   ❌ Stock reduction error")
                        return False
            
            return sale_id
            
        return False

    def test_pos_payment_methods(self, client_id=None):
        """Test different payment methods"""
        # Get a product for testing different payments
        success, products = self.run_test(
            "Get Products for Payment Test",
            "GET",
            "products",
            200
        )
        
        if not success or not products:
            return False
            
        test_product = products[0]  # Use first available product
        
        payment_methods = [
            ("Mobile Money", "📱"),
            ("Carte", "💳"),
            ("Espèces", "💵")
        ]
        
        all_success = True
        
        for method, icon in payment_methods:
            sale_data = {
                "client_id": client_id,
                "lignes": [
                    {
                        "product_id": test_product['id'],
                        "quantite": 1
                    }
                ],
                "montant_recu": test_product['prix_vente'] * 1.18,  # With TVA
                "mode_paiement": method,
                "vendeur": "Test Vendeur"
            }
            
            success, response = self.run_test(
                f"POS Sale with {method}",
                "POST",
                "pos/sale",
                200,
                data=sale_data
            )
            
            if success and 'id' in response:
                self.created_sales.append(response['id'])
                print(f"   {icon} Payment method: {method} - ✅")
            else:
                print(f"   {icon} Payment method: {method} - ❌")
                all_success = False
                
        return all_success

    def test_pos_sales_history(self):
        """Test POS sales history and today's sales"""
        # Test general sales history
        success1, response1 = self.run_test(
            "Get Sales History",
            "GET",
            "pos/sales",
            200
        )
        
        if success1:
            print(f"   🎫 Total sales found: {len(response1)}")
        
        # Test today's sales summary
        success2, response2 = self.run_test(
            "Get Today's Sales Summary",
            "GET",
            "pos/sales/today",
            200
        )
        
        if success2:
            print(f"   📅 Today's sales count: {response2.get('nombre_ventes', 0)}")
            print(f"   💰 Today's total: {response2.get('total', 0)} FCFA")
            payment_breakdown = response2.get('par_mode_paiement', {})
            for method, amount in payment_breakdown.items():
                print(f"      {method}: {amount} FCFA")
                
        return success1 and success2

    def test_pos_receipt_functionality(self):
        """Test receipt generation by getting sale details"""
        if not self.created_sales:
            print("   ⚠️  No sales created yet for receipt test")
            return True
            
        sale_id = self.created_sales[0]  # Use first created sale
        
        success, response = self.run_test(
            "Get Sale Details (Receipt)",
            "GET",
            f"pos/sales/{sale_id}",
            200
        )
        
        if success:
            print(f"   🧾 Receipt for: {response.get('numero_ticket')}")
            print(f"   👤 Client: {response.get('client_nom')}")
            print(f"   📅 Date: {response.get('date_vente', '')[:19]}")
            print(f"   💰 Total: {response.get('montant_ttc')} FCFA")
            
            lignes = response.get('lignes', [])
            print(f"   📋 Items: {len(lignes)}")
            for ligne in lignes[:3]:  # Show first 3 items
                print(f"      - {ligne.get('designation')}: {ligne.get('quantite')}x{ligne.get('prix_unitaire')} = {ligne.get('montant_ttc')} FCFA")
                
        return success

    def test_products_crud_operations(self):
        """Test basic products CRUD for POS"""
        # Test getting products with categories (for POS grid)
        success1, products = self.run_test(
            "Get Products for POS Grid",
            "GET",
            "products",
            200
        )
        
        if success1:
            categories = set(p['categorie'] for p in products)
            print(f"   🏷️  Categories available: {', '.join(categories)}")
            in_stock = [p for p in products if p['quantite_stock'] > 0]
            print(f"   📦 Products in stock: {len(in_stock)}/{len(products)}")
        
        # Test getting categories list
        success2, categories = self.run_test(
            "Get Product Categories",
            "GET",
            "products/categories/list",
            200
        )
        
        if success2:
            print(f"   🏷️  Category filter options: {len(categories)}")
            
        # Test barcode search (POS feature)
        success3, product = self.run_test(
            "Search Product by Barcode/Code",
            "GET",
            "products/search-barcode/PROD001",
            200
        )
        
        if success3:
            print(f"   🔍 Barcode search found: {product.get('designation')}")
            
        return success1 and success2 and success3

    def test_clients_for_pos(self):
        """Test clients functionality for POS"""
        success, clients = self.run_test(
            "Get Clients for POS",
            "GET",
            "clients",
            200
        )
        
        if success:
            print(f"   👥 Clients available for POS: {len(clients)}")
            for client in clients[:3]:  # Show first 3
                print(f"      - {client.get('code')}: {client.get('nom')}")
                
        return success

    def test_stock_movements_after_sales(self):
        """Test that stock movements are created for POS sales"""
        success, movements = self.run_test(
            "Get Stock Movements",
            "GET",
            "stock-movements", 
            200
        )
        
        if success:
            pos_movements = [m for m in movements if m.get('motif') == 'Vente POS']
            print(f"   📦 POS-related stock movements: {len(pos_movements)}")
            
            if pos_movements:
                latest = pos_movements[0]  # Most recent
                print(f"   📦 Latest POS movement: {latest.get('product_code')} - {latest.get('type_mouvement')} {latest.get('quantite')}")
                
        return success

    def test_export_functionality(self):
        """Test export functionality for POS data"""
        exports = [
            ("products", "Products CSV"),
            ("clients", "Clients CSV"), 
            ("sales", "Sales/Ventes CSV"),  # This replaced invoices
            ("stock-movements", "Stock Movements CSV")
        ]
        
        all_success = True
        for endpoint, name in exports:
            success, _ = self.run_test(
                f"Export {name}",
                "GET",
                f"export/{endpoint}",
                200
            )
            if not success:
                all_success = False
                
        return all_success

def main():
    print("🚀 Starting POS System API Tests")
    print("=" * 60)
    
    tester = POSSystemAPITester()
    
    # Test basic API connectivity
    success, _ = tester.run_test("API Root", "GET", "", 200)
    if not success:
        print("❌ Cannot connect to API. Stopping tests.")
        return 1
    
    print("\n📊 Testing Dashboard with Caisse Status...")
    tester.test_dashboard_stats_with_caisse()
    
    print("\n💰 Testing Cash Register Status...")
    tester.test_cash_register_current_status()
    
    print("\n📦 Testing Products for POS...")
    tester.test_products_crud_operations()
    
    print("\n👥 Testing Clients for POS...")
    # Get CLI001 client for testing
    clients_success, clients = tester.run_test("Get Clients", "GET", "clients", 200)
    cli001_id = None
    if clients_success:
        cli001 = next((c for c in clients if c['code'] == 'CLI001'), None)
        if cli001:
            cli001_id = cli001['id']
            print(f"   Found CLI001: {cli001['nom']}")
    
    tester.test_clients_for_pos()
    
    print("\n🛒 Testing POS Sales Creation...")
    tester.test_pos_sale_creation(cli001_id)
    
    print("\n💳 Testing Payment Methods...")
    tester.test_pos_payment_methods(cli001_id)
    
    print("\n🎫 Testing Sales History...")
    tester.test_pos_sales_history()
    
    print("\n🧾 Testing Receipt Functionality...")
    tester.test_pos_receipt_functionality()
    
    print("\n📦 Testing Stock Movements after Sales...")
    tester.test_stock_movements_after_sales()
    
    print("\n📊 Testing Export Functionality...")
    tester.test_export_functionality()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Tests Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All POS API tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} POS API tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())