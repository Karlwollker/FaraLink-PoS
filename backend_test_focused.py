import requests
import sys
import json
from datetime import datetime

class FocusedAPITester:
    def __init__(self, base_url="https://inventory-excel-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

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

def main():
    print("🚀 Testing Commercial Management API with Existing Data")
    print("=" * 60)
    
    tester = FocusedAPITester()
    
    # Use existing data IDs
    existing_product_id = "26c40150-5a9d-4f5d-a5e8-fe7f0e028f67"  # PROD001 - Riz
    existing_client_id = "4ef867d0-7862-418f-ba61-02dbd4cbba84"   # CLI001 - Boutique Mamadou
    
    print("\n📊 Testing Core Functionality with Existing Data...")
    
    # Get initial product stock
    success, product_before = tester.run_test(
        "Get Product Stock Before Invoice", 
        "GET", 
        f"products/{existing_product_id}", 
        200
    )
    
    if not success:
        print("❌ Cannot get product data. Stopping invoice tests.")
        return 1
        
    initial_stock = product_before.get('quantite_stock', 0)
    print(f"   📦 Initial stock for {product_before.get('designation', 'Product')}: {initial_stock}")
    
    # Create Invoice with Stock Reduction Test
    invoice_data = {
        "client_id": existing_client_id,
        "lignes": [
            {
                "product_id": existing_product_id,
                "quantite": 3
            }
        ],
        "mode_paiement": "Mobile Money",
        "notes": "Test invoice - stock reduction verification"
    }
    
    success, invoice_response = tester.run_test(
        "Create Invoice with Stock Reduction",
        "POST",
        "invoices",
        200,  # API returns 200 for creates
        data=invoice_data
    )
    
    invoice_id = None
    if success and 'id' in invoice_response:
        invoice_id = invoice_response['id']
        print(f"   🧾 Invoice created: {invoice_response.get('numero', 'No number')}")
        print(f"   💰 Total: {invoice_response.get('montant_ttc', 0)} FCFA")
        
        # Verify stock was reduced
        success2, product_after = tester.run_test(
            "Verify Stock Reduction",
            "GET",
            f"products/{existing_product_id}",
            200
        )
        
        if success2:
            new_stock = product_after.get('quantite_stock', 0)
            expected_stock = initial_stock - 3
            if new_stock == expected_stock:
                print(f"   ✅ Stock correctly reduced: {initial_stock} → {new_stock}")
                tester.tests_passed += 1
            else:
                print(f"   ❌ Stock reduction error: Expected {expected_stock}, got {new_stock}")
            tester.tests_run += 1
    
    # Test Invoice Status Update
    if invoice_id:
        success, _ = tester.run_test(
            "Update Invoice Status to Paid",
            "PUT",
            f"invoices/{invoice_id}/status",
            200,
            data={"statut": "Payée", "mode_paiement": "Espèces"}
        )
    
    # Test Stock Movement
    movement_data = {
        "product_id": existing_product_id,
        "type_mouvement": "Entrée",
        "quantite": 10,
        "reference": "BL-TEST-2024",
        "motif": "Réapprovisionnement test"
    }
    
    success, movement_response = tester.run_test(
        "Create Manual Stock Movement",
        "POST",
        "stock-movements", 
        200,
        data=movement_data
    )
    
    # Test Inventory Creation
    inventory_data = {
        "lignes": [
            {
                "product_id": existing_product_id,
                "quantite_physique": 60  # Physical count different from theoretical
            }
        ],
        "notes": "Test inventory for stock adjustment"
    }
    
    success, inventory_response = tester.run_test(
        "Create Inventory",
        "POST", 
        "inventories",
        200,
        data=inventory_data
    )
    
    inventory_id = None
    if success and 'id' in inventory_response:
        inventory_id = inventory_response['id']
        print(f"   📋 Inventory created: {inventory_response.get('numero', 'No number')}")
        
        # Validate inventory to update stock
        success2, _ = tester.run_test(
            "Validate Inventory (Stock Update)",
            "POST",
            f"inventories/{inventory_id}/validate",
            200
        )
    
    # Test Dashboard and Reports
    success, stats = tester.run_test(
        "Dashboard Statistics",
        "GET",
        "dashboard/stats", 
        200
    )
    
    if success:
        print(f"   📊 Products: {stats.get('total_products', 0)}")
        print(f"   👥 Clients: {stats.get('total_clients', 0)}")
        print(f"   📈 CA Jour: {stats.get('chiffre_affaires_jour', 0)} FCFA")
        print(f"   📈 CA Mois: {stats.get('chiffre_affaires_mois', 0)} FCFA")
    
    # Test List Operations with Filters
    print("\n📋 Testing List Operations and Filters...")
    
    # Products with search
    tester.run_test("Products Search Filter", "GET", "products", 200, params={"search": "Riz"})
    
    # Products low stock
    tester.run_test("Products Low Stock Filter", "GET", "products", 200, params={"low_stock": "true"})
    
    # Invoices with status filter  
    tester.run_test("Invoices Status Filter", "GET", "invoices", 200, params={"statut": "Payée"})
    
    # Test Export Functions
    print("\n📊 Testing Export CSV Functions...")
    exports = [
        ("products", "Products CSV Export"),
        ("clients", "Clients CSV Export"),
        ("invoices", "Invoices CSV Export"),
        ("stock-movements", "Stock Movements CSV Export")
    ]
    
    for endpoint, name in exports:
        tester.run_test(name, "GET", f"export/{endpoint}", 200)
    
    # Test Chart Data
    tester.run_test("Sales Chart Data", "GET", "dashboard/sales-chart", 200)
    tester.run_test("Top Products Data", "GET", "dashboard/top-products", 200)
    
    # Print Results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if tester.tests_passed >= 20:  # Most critical tests passed
        print("✅ Critical API functionality is working!")
        return 0
    else:
        print("❌ Critical API issues found!")
        return 1

if __name__ == "__main__":
    sys.exit(main())