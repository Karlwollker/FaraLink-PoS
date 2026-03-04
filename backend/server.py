from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Gestion Commerciale API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Product Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    code_barre: Optional[str] = None
    designation: str
    categorie: str
    prix_achat: float
    prix_vente: float
    quantite_stock: int = 0
    stock_minimum: int = 10
    unite: str = "Pièce"
    tva: float = 18.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    code: str
    code_barre: Optional[str] = None
    designation: str
    categorie: str
    prix_achat: float
    prix_vente: float
    quantite_stock: int = 0
    stock_minimum: int = 10
    unite: str = "Pièce"
    tva: float = 18.0

class ProductUpdate(BaseModel):
    code: Optional[str] = None
    code_barre: Optional[str] = None
    designation: Optional[str] = None
    categorie: Optional[str] = None
    prix_achat: Optional[float] = None
    prix_vente: Optional[float] = None
    quantite_stock: Optional[int] = None
    stock_minimum: Optional[int] = None
    unite: Optional[str] = None
    tva: Optional[float] = None

# Client Models
class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    nom: str
    telephone: Optional[str] = None
    email: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    solde: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    code: str
    nom: str
    telephone: Optional[str] = None
    email: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None

class ClientUpdate(BaseModel):
    code: Optional[str] = None
    nom: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None

# Supplier Models
class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    nom: str
    telephone: Optional[str] = None
    email: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    solde: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierCreate(BaseModel):
    code: str
    nom: str
    telephone: Optional[str] = None
    email: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None

class SupplierUpdate(BaseModel):
    code: Optional[str] = None
    nom: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None

# Invoice Line Item
class InvoiceLine(BaseModel):
    product_id: str
    product_code: str
    designation: str
    quantite: int
    prix_unitaire: float
    tva: float
    montant_ht: float
    montant_tva: float
    montant_ttc: float

# Invoice Models
class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    date_facture: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    client_id: str
    client_nom: str
    lignes: List[InvoiceLine]
    montant_ht: float
    montant_tva: float
    montant_ttc: float
    statut: str = "En attente"  # En attente, Payée, Annulée
    mode_paiement: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceLineCreate(BaseModel):
    product_id: str
    quantite: int

class InvoiceCreate(BaseModel):
    client_id: str
    lignes: List[InvoiceLineCreate]
    mode_paiement: Optional[str] = None
    notes: Optional[str] = None

class InvoiceUpdateStatus(BaseModel):
    statut: str
    mode_paiement: Optional[str] = None

# Stock Movement Models
class StockMovement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_code: str
    designation: str
    type_mouvement: str  # Entrée, Sortie, Ajustement
    quantite: int
    quantite_avant: int
    quantite_apres: int
    reference: Optional[str] = None  # Numéro facture, bon de livraison, etc.
    motif: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockMovementCreate(BaseModel):
    product_id: str
    type_mouvement: str
    quantite: int
    reference: Optional[str] = None
    motif: Optional[str] = None

# Inventory Models
class InventoryLine(BaseModel):
    product_id: str
    product_code: str
    designation: str
    quantite_theorique: int
    quantite_physique: int
    ecart: int

class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    date_inventaire: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    lignes: List[InventoryLine]
    statut: str = "En cours"  # En cours, Validé
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryLineCreate(BaseModel):
    product_id: str
    quantite_physique: int

class InventoryCreate(BaseModel):
    lignes: List[InventoryLineCreate]
    notes: Optional[str] = None

# Dashboard Stats
class DashboardStats(BaseModel):
    total_products: int
    total_clients: int
    total_suppliers: int
    total_invoices: int
    chiffre_affaires_jour: float
    chiffre_affaires_mois: float
    products_low_stock: int
    invoices_pending: int

# ==================== HELPER FUNCTIONS ====================

async def get_next_numero(collection_name: str, prefix: str) -> str:
    """Generate next sequential number for invoices, inventories, etc."""
    today = datetime.now(timezone.utc)
    year_month = today.strftime("%Y%m")
    
    # Find the last document with this prefix and year_month
    last_doc = await db[collection_name].find_one(
        {"numero": {"$regex": f"^{prefix}{year_month}"}},
        sort=[("numero", -1)]
    )
    
    if last_doc:
        last_num = int(last_doc["numero"][-4:])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{year_month}{new_num:04d}"

def serialize_datetime(obj):
    """Convert datetime to ISO string for MongoDB"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc: dict) -> dict:
    """Serialize document for MongoDB storage"""
    result = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else serialize_datetime(item) for item in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result

def deserialize_doc(doc: dict) -> dict:
    """Deserialize document from MongoDB"""
    if not doc:
        return doc
    
    datetime_fields = ['created_at', 'updated_at', 'date_facture', 'date_inventaire']
    for field in datetime_fields:
        if field in doc and isinstance(doc[field], str):
            doc[field] = datetime.fromisoformat(doc[field])
    return doc

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "API Gestion Commerciale - FCFA"}

# ==================== PRODUCTS ====================

@api_router.post("/products", response_model=Product)
async def create_product(input: ProductCreate):
    # Check if code already exists
    existing = await db.products.find_one({"code": input.code})
    if existing:
        raise HTTPException(status_code=400, detail="Ce code produit existe déjà")
    
    product = Product(**input.model_dump())
    doc = serialize_doc(product.model_dump())
    await db.products.insert_one(doc)
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(
    search: Optional[str] = None,
    categorie: Optional[str] = None,
    low_stock: bool = False
):
    query = {}
    if search:
        query["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"designation": {"$regex": search, "$options": "i"}},
            {"code_barre": {"$regex": search, "$options": "i"}}
        ]
    if categorie:
        query["categorie"] = categorie
    if low_stock:
        query["$expr"] = {"$lte": ["$quantite_stock", "$stock_minimum"]}
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_doc(p) for p in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return deserialize_doc(product)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, input: ProductUpdate):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return deserialize_doc(updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé"}

@api_router.get("/products/categories/list")
async def get_categories():
    categories = await db.products.distinct("categorie")
    return categories

# ==================== CLIENTS ====================

@api_router.post("/clients", response_model=Client)
async def create_client(input: ClientCreate):
    existing = await db.clients.find_one({"code": input.code})
    if existing:
        raise HTTPException(status_code=400, detail="Ce code client existe déjà")
    
    client = Client(**input.model_dump())
    doc = serialize_doc(client.model_dump())
    await db.clients.insert_one(doc)
    return client

@api_router.get("/clients", response_model=List[Client])
async def get_clients(search: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"nom": {"$regex": search, "$options": "i"}},
            {"telephone": {"$regex": search, "$options": "i"}}
        ]
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_doc(c) for c in clients]

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return deserialize_doc(client)

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, input: ClientUpdate):
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return deserialize_doc(updated)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Client supprimé"}

# ==================== SUPPLIERS ====================

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(input: SupplierCreate):
    existing = await db.suppliers.find_one({"code": input.code})
    if existing:
        raise HTTPException(status_code=400, detail="Ce code fournisseur existe déjà")
    
    supplier = Supplier(**input.model_dump())
    doc = serialize_doc(supplier.model_dump())
    await db.suppliers.insert_one(doc)
    return supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(search: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"nom": {"$regex": search, "$options": "i"}},
            {"telephone": {"$regex": search, "$options": "i"}}
        ]
    
    suppliers = await db.suppliers.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_doc(s) for s in suppliers]

@api_router.get("/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(supplier_id: str):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    return deserialize_doc(supplier)

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, input: SupplierUpdate):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.suppliers.update_one({"id": supplier_id}, {"$set": update_data})
    
    updated = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    return deserialize_doc(updated)

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    result = await db.suppliers.delete_one({"id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    return {"message": "Fournisseur supprimé"}

# ==================== INVOICES ====================

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(input: InvoiceCreate):
    # Get client
    client = await db.clients.find_one({"id": input.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Process invoice lines
    lignes = []
    montant_ht_total = 0.0
    montant_tva_total = 0.0
    montant_ttc_total = 0.0
    
    for ligne_input in input.lignes:
        product = await db.products.find_one({"id": ligne_input.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {ligne_input.product_id} non trouvé")
        
        # Check stock
        if product["quantite_stock"] < ligne_input.quantite:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuffisant pour {product['designation']}. Disponible: {product['quantite_stock']}"
            )
        
        montant_ht = ligne_input.quantite * product["prix_vente"]
        montant_tva = montant_ht * (product["tva"] / 100)
        montant_ttc = montant_ht + montant_tva
        
        ligne = InvoiceLine(
            product_id=product["id"],
            product_code=product["code"],
            designation=product["designation"],
            quantite=ligne_input.quantite,
            prix_unitaire=product["prix_vente"],
            tva=product["tva"],
            montant_ht=montant_ht,
            montant_tva=montant_tva,
            montant_ttc=montant_ttc
        )
        lignes.append(ligne)
        
        montant_ht_total += montant_ht
        montant_tva_total += montant_tva
        montant_ttc_total += montant_ttc
        
        # Update stock
        new_stock = product["quantite_stock"] - ligne_input.quantite
        await db.products.update_one(
            {"id": product["id"]},
            {"$set": {"quantite_stock": new_stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Create stock movement
        movement = StockMovement(
            product_id=product["id"],
            product_code=product["code"],
            designation=product["designation"],
            type_mouvement="Sortie",
            quantite=ligne_input.quantite,
            quantite_avant=product["quantite_stock"],
            quantite_apres=new_stock,
            motif="Vente"
        )
        await db.stock_movements.insert_one(serialize_doc(movement.model_dump()))
    
    # Create invoice
    numero = await get_next_numero("invoices", "FAC")
    invoice = Invoice(
        numero=numero,
        client_id=input.client_id,
        client_nom=client["nom"],
        lignes=[l.model_dump() for l in lignes],
        montant_ht=montant_ht_total,
        montant_tva=montant_tva_total,
        montant_ttc=montant_ttc_total,
        mode_paiement=input.mode_paiement,
        notes=input.notes
    )
    
    doc = serialize_doc(invoice.model_dump())
    await db.invoices.insert_one(doc)
    
    # Update client balance
    await db.clients.update_one(
        {"id": input.client_id},
        {"$inc": {"solde": montant_ttc_total}}
    )
    
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    search: Optional[str] = None,
    statut: Optional[str] = None,
    client_id: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None
):
    query = {}
    if search:
        query["$or"] = [
            {"numero": {"$regex": search, "$options": "i"}},
            {"client_nom": {"$regex": search, "$options": "i"}}
        ]
    if statut:
        query["statut"] = statut
    if client_id:
        query["client_id"] = client_id
    if date_debut:
        query["date_facture"] = {"$gte": date_debut}
    if date_fin:
        if "date_facture" in query:
            query["date_facture"]["$lte"] = date_fin
        else:
            query["date_facture"] = {"$lte": date_fin}
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("date_facture", -1).to_list(1000)
    return [deserialize_doc(i) for i in invoices]

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return deserialize_doc(invoice)

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, input: InvoiceUpdateStatus):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    update_data = {"statut": input.statut}
    if input.mode_paiement:
        update_data["mode_paiement"] = input.mode_paiement
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    
    # If paid, update client balance
    if input.statut == "Payée" and invoice["statut"] != "Payée":
        await db.clients.update_one(
            {"id": invoice["client_id"]},
            {"$inc": {"solde": -invoice["montant_ttc"]}}
        )
    
    return {"message": "Statut mis à jour"}

# ==================== STOCK MOVEMENTS ====================

@api_router.post("/stock-movements", response_model=StockMovement)
async def create_stock_movement(input: StockMovementCreate):
    product = await db.products.find_one({"id": input.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    quantite_avant = product["quantite_stock"]
    
    if input.type_mouvement == "Entrée":
        quantite_apres = quantite_avant + input.quantite
    elif input.type_mouvement == "Sortie":
        if quantite_avant < input.quantite:
            raise HTTPException(status_code=400, detail="Stock insuffisant")
        quantite_apres = quantite_avant - input.quantite
    else:  # Ajustement
        quantite_apres = input.quantite
    
    # Update product stock
    await db.products.update_one(
        {"id": input.product_id},
        {"$set": {"quantite_stock": quantite_apres, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create movement record
    movement = StockMovement(
        product_id=product["id"],
        product_code=product["code"],
        designation=product["designation"],
        type_mouvement=input.type_mouvement,
        quantite=input.quantite,
        quantite_avant=quantite_avant,
        quantite_apres=quantite_apres,
        reference=input.reference,
        motif=input.motif
    )
    
    doc = serialize_doc(movement.model_dump())
    await db.stock_movements.insert_one(doc)
    
    return movement

@api_router.get("/stock-movements", response_model=List[StockMovement])
async def get_stock_movements(
    product_id: Optional[str] = None,
    type_mouvement: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None
):
    query = {}
    if product_id:
        query["product_id"] = product_id
    if type_mouvement:
        query["type_mouvement"] = type_mouvement
    if date_debut:
        query["created_at"] = {"$gte": date_debut}
    if date_fin:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_fin
        else:
            query["created_at"] = {"$lte": date_fin}
    
    movements = await db.stock_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [deserialize_doc(m) for m in movements]

# ==================== INVENTORY ====================

@api_router.post("/inventories", response_model=Inventory)
async def create_inventory(input: InventoryCreate):
    lignes = []
    
    for ligne_input in input.lignes:
        product = await db.products.find_one({"id": ligne_input.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {ligne_input.product_id} non trouvé")
        
        ecart = ligne_input.quantite_physique - product["quantite_stock"]
        
        ligne = InventoryLine(
            product_id=product["id"],
            product_code=product["code"],
            designation=product["designation"],
            quantite_theorique=product["quantite_stock"],
            quantite_physique=ligne_input.quantite_physique,
            ecart=ecart
        )
        lignes.append(ligne)
    
    numero = await get_next_numero("inventories", "INV")
    inventory = Inventory(
        numero=numero,
        lignes=[l.model_dump() for l in lignes],
        notes=input.notes
    )
    
    doc = serialize_doc(inventory.model_dump())
    await db.inventories.insert_one(doc)
    
    return inventory

@api_router.get("/inventories", response_model=List[Inventory])
async def get_inventories():
    inventories = await db.inventories.find({}, {"_id": 0}).sort("date_inventaire", -1).to_list(100)
    return [deserialize_doc(i) for i in inventories]

@api_router.get("/inventories/{inventory_id}", response_model=Inventory)
async def get_inventory(inventory_id: str):
    inventory = await db.inventories.find_one({"id": inventory_id}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventaire non trouvé")
    return deserialize_doc(inventory)

@api_router.post("/inventories/{inventory_id}/validate")
async def validate_inventory(inventory_id: str):
    inventory = await db.inventories.find_one({"id": inventory_id}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventaire non trouvé")
    
    if inventory["statut"] == "Validé":
        raise HTTPException(status_code=400, detail="Inventaire déjà validé")
    
    # Update stock for all products with discrepancies
    for ligne in inventory["lignes"]:
        if ligne["ecart"] != 0:
            # Update product stock
            await db.products.update_one(
                {"id": ligne["product_id"]},
                {"$set": {"quantite_stock": ligne["quantite_physique"], "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Create stock movement
            movement = StockMovement(
                product_id=ligne["product_id"],
                product_code=ligne["product_code"],
                designation=ligne["designation"],
                type_mouvement="Ajustement",
                quantite=abs(ligne["ecart"]),
                quantite_avant=ligne["quantite_theorique"],
                quantite_apres=ligne["quantite_physique"],
                reference=inventory["numero"],
                motif=f"Régularisation inventaire {inventory['numero']}"
            )
            await db.stock_movements.insert_one(serialize_doc(movement.model_dump()))
    
    # Update inventory status
    await db.inventories.update_one({"id": inventory_id}, {"$set": {"statut": "Validé"}})
    
    return {"message": "Inventaire validé et stock mis à jour"}

# ==================== DASHBOARD & STATS ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total_products = await db.products.count_documents({})
    total_clients = await db.clients.count_documents({})
    total_suppliers = await db.suppliers.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    
    # Products with low stock
    products_low_stock = await db.products.count_documents({
        "$expr": {"$lte": ["$quantite_stock", "$stock_minimum"]}
    })
    
    # Pending invoices
    invoices_pending = await db.invoices.count_documents({"statut": "En attente"})
    
    # Today's sales
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_invoices = await db.invoices.find({
        "date_facture": {"$gte": today.isoformat()},
        "statut": {"$ne": "Annulée"}
    }, {"_id": 0}).to_list(1000)
    chiffre_affaires_jour = sum(inv.get("montant_ttc", 0) for inv in today_invoices)
    
    # This month's sales
    first_of_month = today.replace(day=1)
    month_invoices = await db.invoices.find({
        "date_facture": {"$gte": first_of_month.isoformat()},
        "statut": {"$ne": "Annulée"}
    }, {"_id": 0}).to_list(1000)
    chiffre_affaires_mois = sum(inv.get("montant_ttc", 0) for inv in month_invoices)
    
    return DashboardStats(
        total_products=total_products,
        total_clients=total_clients,
        total_suppliers=total_suppliers,
        total_invoices=total_invoices,
        chiffre_affaires_jour=chiffre_affaires_jour,
        chiffre_affaires_mois=chiffre_affaires_mois,
        products_low_stock=products_low_stock,
        invoices_pending=invoices_pending
    )

@api_router.get("/dashboard/sales-chart")
async def get_sales_chart():
    """Get sales data for the last 30 days"""
    from datetime import timedelta
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)
    
    invoices = await db.invoices.find({
        "date_facture": {"$gte": start_date.isoformat()},
        "statut": {"$ne": "Annulée"}
    }, {"_id": 0}).to_list(1000)
    
    # Group by date
    sales_by_date = {}
    for inv in invoices:
        date_str = inv["date_facture"][:10]  # Get just the date part
        if date_str not in sales_by_date:
            sales_by_date[date_str] = 0
        sales_by_date[date_str] += inv.get("montant_ttc", 0)
    
    # Create chart data
    chart_data = [{"date": date, "montant": amount} for date, amount in sorted(sales_by_date.items())]
    
    return chart_data

@api_router.get("/dashboard/top-products")
async def get_top_products():
    """Get top selling products"""
    invoices = await db.invoices.find({"statut": {"$ne": "Annulée"}}, {"_id": 0}).to_list(1000)
    
    product_sales = {}
    for inv in invoices:
        for ligne in inv.get("lignes", []):
            pid = ligne["product_id"]
            if pid not in product_sales:
                product_sales[pid] = {
                    "product_code": ligne["product_code"],
                    "designation": ligne["designation"],
                    "quantite_vendue": 0,
                    "montant_total": 0
                }
            product_sales[pid]["quantite_vendue"] += ligne["quantite"]
            product_sales[pid]["montant_total"] += ligne["montant_ttc"]
    
    # Sort by quantity sold
    top_products = sorted(product_sales.values(), key=lambda x: x["quantite_vendue"], reverse=True)[:10]
    
    return top_products

# ==================== EXPORT ====================

@api_router.get("/export/products")
async def export_products():
    """Export products to CSV"""
    import csv
    
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Header
    writer.writerow([
        "Code", "Code Barre", "Désignation", "Catégorie", 
        "Prix Achat", "Prix Vente", "Stock", "Stock Minimum", "Unité", "TVA"
    ])
    
    for p in products:
        writer.writerow([
            p.get("code", ""),
            p.get("code_barre", ""),
            p.get("designation", ""),
            p.get("categorie", ""),
            p.get("prix_achat", 0),
            p.get("prix_vente", 0),
            p.get("quantite_stock", 0),
            p.get("stock_minimum", 0),
            p.get("unite", ""),
            p.get("tva", 0)
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=produits.csv"}
    )

@api_router.get("/export/clients")
async def export_clients():
    """Export clients to CSV"""
    import csv
    
    clients = await db.clients.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    writer.writerow(["Code", "Nom", "Téléphone", "Email", "Adresse", "Ville", "Solde"])
    
    for c in clients:
        writer.writerow([
            c.get("code", ""),
            c.get("nom", ""),
            c.get("telephone", ""),
            c.get("email", ""),
            c.get("adresse", ""),
            c.get("ville", ""),
            c.get("solde", 0)
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clients.csv"}
    )

@api_router.get("/export/invoices")
async def export_invoices():
    """Export invoices to CSV"""
    import csv
    
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    writer.writerow([
        "Numéro", "Date", "Client", "Montant HT", "TVA", "Montant TTC", "Statut", "Mode Paiement"
    ])
    
    for inv in invoices:
        writer.writerow([
            inv.get("numero", ""),
            inv.get("date_facture", "")[:10] if inv.get("date_facture") else "",
            inv.get("client_nom", ""),
            inv.get("montant_ht", 0),
            inv.get("montant_tva", 0),
            inv.get("montant_ttc", 0),
            inv.get("statut", ""),
            inv.get("mode_paiement", "")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=factures.csv"}
    )

@api_router.get("/export/stock-movements")
async def export_stock_movements():
    """Export stock movements to CSV"""
    import csv
    
    movements = await db.stock_movements.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    writer.writerow([
        "Date", "Code Produit", "Désignation", "Type", 
        "Quantité", "Stock Avant", "Stock Après", "Référence", "Motif"
    ])
    
    for m in movements:
        writer.writerow([
            m.get("created_at", "")[:10] if m.get("created_at") else "",
            m.get("product_code", ""),
            m.get("designation", ""),
            m.get("type_mouvement", ""),
            m.get("quantite", 0),
            m.get("quantite_avant", 0),
            m.get("quantite_apres", 0),
            m.get("reference", ""),
            m.get("motif", "")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mouvements_stock.csv"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
