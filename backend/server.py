from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Header
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import io
import hashlib
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="FaraLink - Point de Vente API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    """Hash password with SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Generate a secure token"""
    return secrets.token_urlsafe(32)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from token"""
    if not credentials:
        return None
    
    token = credentials.credentials
    session = await db.sessions.find_one({"token": token, "active": True}, {"_id": 0})
    
    if not session:
        return None
    
    # Check expiration
    if session.get("expires_at"):
        expires = datetime.fromisoformat(session["expires_at"]) if isinstance(session["expires_at"], str) else session["expires_at"]
        if expires < datetime.now(timezone.utc):
            await db.sessions.update_one({"token": token}, {"$set": {"active": False}})
            return None
    
    user = await db.users.find_one({"id": session["user_id"], "actif": True}, {"_id": 0, "mot_de_passe": 0})
    return user

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require authentication"""
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    return user

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require admin role"""
    user = await require_auth(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user

# ==================== MODELS ====================

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str
    email: str
    mot_de_passe: str
    role: str = "caissier"  # admin, gestionnaire, caissier
    telephone: Optional[str] = None
    actif: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    role: str = "caissier"
    telephone: Optional[str] = None

class UserUpdate(BaseModel):
    nom: Optional[str] = None
    email: Optional[str] = None
    mot_de_passe: Optional[str] = None
    role: Optional[str] = None
    telephone: Optional[str] = None
    actif: Optional[bool] = None

class UserLogin(BaseModel):
    email: str
    mot_de_passe: str

class UserResponse(BaseModel):
    id: str
    nom: str
    email: str
    role: str
    telephone: Optional[str] = None
    actif: bool
    created_at: datetime
    last_login: Optional[datetime] = None

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=30))

# Settings Model
class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "app_settings"
    nom_boutique: str = "FaraLink"
    slogan: str = "Votre partenaire de confiance"
    adresse: str = "Akwa, Douala Cameroun"
    telephone: str = "+237 699 397 286"
    email: Optional[str] = None
    site_web: Optional[str] = None
    message_ticket: str = "Merci pour votre achat !"
    devise: str = "FCFA"
    tva_active: bool = False
    taux_tva: float = 0.0
    couleur_principale: str = "#1e40af"
    logo_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppSettingsUpdate(BaseModel):
    nom_boutique: Optional[str] = None
    slogan: Optional[str] = None
    adresse: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    site_web: Optional[str] = None
    message_ticket: Optional[str] = None
    devise: Optional[str] = None
    tva_active: Optional[bool] = None
    taux_tva: Optional[float] = None
    couleur_principale: Optional[str] = None
    logo_url: Optional[str] = None

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
    tva: float = 0.0  # TVA désactivée
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
    tva: float = 0.0  # TVA désactivée

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

# ==================== POS MODELS ====================

# Sale Line Item (for POS)
class SaleLine(BaseModel):
    product_id: str
    product_code: str
    designation: str
    quantite: int
    prix_unitaire: float
    tva: float
    montant_ht: float
    montant_tva: float
    montant_ttc: float

# Sale/Ticket Model (replaces Invoice)
class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero_ticket: str
    date_vente: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    client_id: Optional[str] = None
    client_nom: Optional[str] = "Client Comptoir"
    lignes: List[SaleLine]
    montant_ht: float
    montant_tva: float
    montant_ttc: float
    montant_recu: float
    montant_rendu: float
    mode_paiement: str = "Espèces"
    caisse_id: Optional[str] = None
    vendeur: Optional[str] = None
    annulee: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleLineCreate(BaseModel):
    product_id: str
    quantite: int

class SaleCreate(BaseModel):
    client_id: Optional[str] = None
    lignes: List[SaleLineCreate]
    montant_recu: float
    mode_paiement: str = "Espèces"
    vendeur: Optional[str] = None

# Cash Register (Caisse) Model
class CashRegister(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date_ouverture: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    date_fermeture: Optional[datetime] = None
    fond_caisse: float  # Opening cash
    total_especes: float = 0.0
    total_mobile_money: float = 0.0
    total_carte: float = 0.0
    total_ventes: float = 0.0
    nombre_tickets: int = 0
    ecart: float = 0.0
    statut: str = "Ouverte"  # Ouverte, Fermée
    vendeur: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CashRegisterOpen(BaseModel):
    fond_caisse: float
    vendeur: Optional[str] = None

class CashRegisterClose(BaseModel):
    montant_compte: float  # Counted cash at closing
    notes: Optional[str] = None

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
    reference: Optional[str] = None
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
    statut: str = "En cours"
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
    total_sales: int
    chiffre_affaires_jour: float
    chiffre_affaires_mois: float
    products_low_stock: int
    caisse_ouverte: bool
    fond_caisse_actuel: float

# ==================== HELPER FUNCTIONS ====================

async def get_next_numero(collection_name: str, prefix: str) -> str:
    """Generate next sequential number"""
    today = datetime.now(timezone.utc)
    year_month_day = today.strftime("%Y%m%d")
    
    last_doc = await db[collection_name].find_one(
        {"numero_ticket": {"$regex": f"^{prefix}{year_month_day}"}} if collection_name == "sales" else {"numero": {"$regex": f"^{prefix}{year_month_day}"}},
        sort=[("created_at", -1)]
    )
    
    if last_doc:
        key = "numero_ticket" if collection_name == "sales" else "numero"
        last_num = int(last_doc[key][-4:])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{year_month_day}{new_num:04d}"

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc: dict) -> dict:
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
    if not doc:
        return doc
    
    datetime_fields = ['created_at', 'updated_at', 'date_vente', 'date_inventaire', 'date_ouverture', 'date_fermeture']
    for field in datetime_fields:
        if field in doc and isinstance(doc[field], str):
            doc[field] = datetime.fromisoformat(doc[field])
    return doc

async def get_current_cash_register():
    """Get current open cash register"""
    register = await db.cash_registers.find_one({"statut": "Ouverte"}, {"_id": 0})
    return deserialize_doc(register) if register else None

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "API FaraLink - Point de Vente - FCFA"}

# ==================== AUTHENTICATION ====================

@api_router.post("/auth/register")
async def register_user(input: UserCreate):
    """Register a new user (admin only or first user)"""
    # Check if first user (will be admin)
    user_count = await db.users.count_documents({})
    
    # Check if email exists
    existing = await db.users.find_one({"email": input.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # First user becomes admin
    role = "admin" if user_count == 0 else input.role
    
    user = User(
        nom=input.nom,
        email=input.email.lower(),
        mot_de_passe=hash_password(input.mot_de_passe),
        role=role,
        telephone=input.telephone
    )
    
    doc = serialize_doc(user.model_dump())
    await db.users.insert_one(doc)
    
    # Return user without password
    user_data = user.model_dump()
    del user_data["mot_de_passe"]
    
    return {"message": "Utilisateur créé avec succès", "user": user_data}

@api_router.post("/auth/login")
async def login_user(input: UserLogin):
    """Login and get session token"""
    user = await db.users.find_one({
        "email": input.email.lower(),
        "mot_de_passe": hash_password(input.mot_de_passe),
        "actif": True
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Create session
    token = generate_token()
    session = Session(
        user_id=user["id"],
        token=token
    )
    
    await db.sessions.insert_one(serialize_doc(session.model_dump()))
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Return user info without password
    user_response = {k: v for k, v in user.items() if k != "mot_de_passe"}
    
    return {
        "token": token,
        "user": user_response,
        "expires_at": session.expires_at.isoformat()
    }

@api_router.post("/auth/logout")
async def logout_user(user: dict = Depends(require_auth)):
    """Logout current session"""
    # Deactivate all sessions for this user from this request
    # In real app, you'd get the specific token from header
    await db.sessions.update_many(
        {"user_id": user["id"]},
        {"$set": {"active": False}}
    )
    return {"message": "Déconnexion réussie"}

@api_router.get("/auth/me")
async def get_current_user_info(user: dict = Depends(require_auth)):
    """Get current user info"""
    return user

@api_router.put("/auth/password")
async def change_password(
    old_password: str,
    new_password: str,
    user: dict = Depends(require_auth)
):
    """Change password"""
    # Verify old password
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if db_user["mot_de_passe"] != hash_password(old_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
    
    # Update password
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"mot_de_passe": hash_password(new_password)}}
    )
    
    return {"message": "Mot de passe modifié avec succès"}

# ==================== USER MANAGEMENT (Admin) ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(admin: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "mot_de_passe": 0}).to_list(100)
    return [deserialize_doc(u) for u in users]

@api_router.post("/users", response_model=UserResponse)
async def create_user(input: UserCreate, admin: dict = Depends(require_admin)):
    """Create a new user (admin only)"""
    existing = await db.users.find_one({"email": input.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    user = User(
        nom=input.nom,
        email=input.email.lower(),
        mot_de_passe=hash_password(input.mot_de_passe),
        role=input.role,
        telephone=input.telephone
    )
    
    doc = serialize_doc(user.model_dump())
    await db.users.insert_one(doc)
    
    user_data = user.model_dump()
    del user_data["mot_de_passe"]
    return user_data

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, input: UserUpdate, admin: dict = Depends(require_admin)):
    """Update a user (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if "mot_de_passe" in update_data:
        update_data["mot_de_passe"] = hash_password(update_data["mot_de_passe"])
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "mot_de_passe": 0})
    return deserialize_doc(updated)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Deactivate a user (admin only)"""
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"actif": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Deactivate all sessions
    await db.sessions.update_many({"user_id": user_id}, {"$set": {"active": False}})
    
    return {"message": "Utilisateur désactivé"}

# ==================== SETTINGS ====================

@api_router.get("/settings", response_model=AppSettings)
async def get_settings():
    """Get application settings"""
    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = AppSettings()
        doc = serialize_doc(default_settings.model_dump())
        await db.settings.insert_one(doc)
        return default_settings
    return deserialize_doc(settings)

@api_router.put("/settings", response_model=AppSettings)
async def update_settings(input: AppSettingsUpdate):
    """Update application settings"""
    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not settings:
        default_settings = AppSettings()
        doc = serialize_doc(default_settings.model_dump())
        await db.settings.insert_one(doc)
        settings = default_settings.model_dump()
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.settings.update_one({"id": "app_settings"}, {"$set": update_data})
    
    updated = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    return deserialize_doc(updated)

# ==================== PRODUCTS ====================

@api_router.post("/products", response_model=Product)
async def create_product(input: ProductCreate):
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

@api_router.get("/products/search-barcode/{barcode}")
async def search_by_barcode(barcode: str):
    """Quick search by barcode for POS"""
    product = await db.products.find_one(
        {"$or": [{"code_barre": barcode}, {"code": barcode}]},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return deserialize_doc(product)

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

# ==================== CASH REGISTER (CAISSE) ====================

@api_router.post("/cash-register/open")
async def open_cash_register(input: CashRegisterOpen):
    """Open a new cash register session"""
    existing = await get_current_cash_register()
    if existing:
        raise HTTPException(status_code=400, detail="Une caisse est déjà ouverte. Fermez-la d'abord.")
    
    register = CashRegister(
        fond_caisse=input.fond_caisse,
        vendeur=input.vendeur
    )
    doc = serialize_doc(register.model_dump())
    await db.cash_registers.insert_one(doc)
    
    return {"message": "Caisse ouverte", "caisse_id": register.id, "fond_caisse": input.fond_caisse}

@api_router.get("/cash-register/current")
async def get_current_register():
    """Get current open cash register status"""
    register = await get_current_cash_register()
    if not register:
        return {"statut": "Fermée", "caisse_ouverte": False}
    return {**register, "caisse_ouverte": True}

@api_router.post("/cash-register/close")
async def close_cash_register(input: CashRegisterClose):
    """Close current cash register session"""
    register = await get_current_cash_register()
    if not register:
        raise HTTPException(status_code=400, detail="Aucune caisse ouverte")
    
    # Calculate expected cash
    expected_cash = register["fond_caisse"] + register["total_especes"]
    ecart = input.montant_compte - expected_cash
    
    update_data = {
        "statut": "Fermée",
        "date_fermeture": datetime.now(timezone.utc).isoformat(),
        "ecart": ecart,
        "notes": input.notes
    }
    
    await db.cash_registers.update_one({"id": register["id"]}, {"$set": update_data})
    
    return {
        "message": "Caisse fermée",
        "fond_caisse": register["fond_caisse"],
        "total_ventes": register["total_ventes"],
        "total_especes": register["total_especes"],
        "total_mobile_money": register["total_mobile_money"],
        "nombre_tickets": register["nombre_tickets"],
        "montant_attendu": expected_cash,
        "montant_compte": input.montant_compte,
        "ecart": ecart
    }

@api_router.get("/cash-register/history")
async def get_cash_register_history():
    """Get history of cash register sessions"""
    registers = await db.cash_registers.find({}, {"_id": 0}).sort("date_ouverture", -1).to_list(100)
    return [deserialize_doc(r) for r in registers]

# ==================== POINT OF SALE (POS) ====================

@api_router.post("/pos/sale", response_model=Sale)
async def create_sale(input: SaleCreate):
    """Create a new sale (ticket de caisse)"""
    # Check if cash register is open
    register = await get_current_cash_register()
    if not register:
        raise HTTPException(status_code=400, detail="La caisse n'est pas ouverte. Ouvrez la caisse d'abord.")
    
    # Get client if specified
    client_nom = "Client Comptoir"
    if input.client_id:
        client = await db.clients.find_one({"id": input.client_id}, {"_id": 0})
        if client:
            client_nom = client["nom"]
    
    # Process sale lines
    lignes = []
    montant_ht_total = 0.0
    montant_tva_total = 0.0
    montant_ttc_total = 0.0
    
    for ligne_input in input.lignes:
        product = await db.products.find_one({"id": ligne_input.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit non trouvé")
        
        # Check stock
        if product["quantite_stock"] < ligne_input.quantite:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuffisant pour {product['designation']}. Disponible: {product['quantite_stock']}"
            )
        
        montant_ht = ligne_input.quantite * product["prix_vente"]
        montant_tva = montant_ht * (product["tva"] / 100)
        montant_ttc = montant_ht + montant_tva
        
        ligne = SaleLine(
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
            motif="Vente POS"
        )
        await db.stock_movements.insert_one(serialize_doc(movement.model_dump()))
    
    # Calculate change
    montant_rendu = max(0, input.montant_recu - montant_ttc_total)
    
    # Create sale
    numero = await get_next_numero("sales", "TK")
    sale = Sale(
        numero_ticket=numero,
        client_id=input.client_id,
        client_nom=client_nom,
        lignes=[l.model_dump() for l in lignes],
        montant_ht=montant_ht_total,
        montant_tva=montant_tva_total,
        montant_ttc=montant_ttc_total,
        montant_recu=input.montant_recu,
        montant_rendu=montant_rendu,
        mode_paiement=input.mode_paiement,
        caisse_id=register["id"],
        vendeur=input.vendeur
    )
    
    doc = serialize_doc(sale.model_dump())
    await db.sales.insert_one(doc)
    
    # Update cash register totals
    update_register = {
        "$inc": {
            "total_ventes": montant_ttc_total,
            "nombre_tickets": 1
        }
    }
    
    if input.mode_paiement == "Espèces":
        update_register["$inc"]["total_especes"] = montant_ttc_total
    elif input.mode_paiement in ["Mobile Money", "Orange Money", "Wave"]:
        update_register["$inc"]["total_mobile_money"] = montant_ttc_total
    else:
        update_register["$inc"]["total_carte"] = montant_ttc_total
    
    await db.cash_registers.update_one({"id": register["id"]}, update_register)
    
    return sale

@api_router.get("/pos/sales", response_model=List[Sale])
async def get_sales(
    date: Optional[str] = None,
    client_id: Optional[str] = None
):
    """Get sales history"""
    query = {"annulee": False}
    if date:
        query["date_vente"] = {"$regex": f"^{date}"}
    if client_id:
        query["client_id"] = client_id
    
    sales = await db.sales.find(query, {"_id": 0}).sort("date_vente", -1).to_list(500)
    return [deserialize_doc(s) for s in sales]

@api_router.get("/pos/sales/today")
async def get_today_sales():
    """Get today's sales summary"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    sales = await db.sales.find(
        {"date_vente": {"$regex": f"^{today}"}, "annulee": False},
        {"_id": 0}
    ).to_list(1000)
    
    total = sum(s.get("montant_ttc", 0) for s in sales)
    count = len(sales)
    
    # Group by payment method
    by_payment = {}
    for s in sales:
        method = s.get("mode_paiement", "Espèces")
        by_payment[method] = by_payment.get(method, 0) + s.get("montant_ttc", 0)
    
    return {
        "date": today,
        "nombre_ventes": count,
        "total": total,
        "par_mode_paiement": by_payment,
        "ventes": [deserialize_doc(s) for s in sales[:20]]  # Last 20
    }

@api_router.get("/pos/sales/{sale_id}", response_model=Sale)
async def get_sale(sale_id: str):
    """Get a specific sale"""
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    return deserialize_doc(sale)

@api_router.post("/pos/sales/{sale_id}/cancel")
async def cancel_sale(sale_id: str):
    """Cancel a sale and restore stock"""
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    if sale.get("annulee"):
        raise HTTPException(status_code=400, detail="Cette vente est déjà annulée")
    
    # Restore stock for each line
    for ligne in sale.get("lignes", []):
        product = await db.products.find_one({"id": ligne["product_id"]}, {"_id": 0})
        if product:
            new_stock = product["quantite_stock"] + ligne["quantite"]
            await db.products.update_one(
                {"id": ligne["product_id"]},
                {"$set": {"quantite_stock": new_stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Create stock movement for return
            movement = StockMovement(
                product_id=ligne["product_id"],
                product_code=ligne["product_code"],
                designation=ligne["designation"],
                type_mouvement="Entrée",
                quantite=ligne["quantite"],
                quantite_avant=product["quantite_stock"],
                quantite_apres=new_stock,
                reference=sale["numero_ticket"],
                motif="Annulation vente"
            )
            await db.stock_movements.insert_one(serialize_doc(movement.model_dump()))
    
    # Mark sale as cancelled
    await db.sales.update_one({"id": sale_id}, {"$set": {"annulee": True}})
    
    # Update cash register if still open
    register = await get_current_cash_register()
    if register and register["id"] == sale.get("caisse_id"):
        update_register = {
            "$inc": {
                "total_ventes": -sale["montant_ttc"],
                "nombre_tickets": -1
            }
        }
        if sale["mode_paiement"] == "Espèces":
            update_register["$inc"]["total_especes"] = -sale["montant_ttc"]
        elif sale["mode_paiement"] in ["Mobile Money", "Orange Money", "Wave"]:
            update_register["$inc"]["total_mobile_money"] = -sale["montant_ttc"]
        else:
            update_register["$inc"]["total_carte"] = -sale["montant_ttc"]
        
        await db.cash_registers.update_one({"id": register["id"]}, update_register)
    
    return {"message": "Vente annulée, stock restauré"}

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
    
    await db.products.update_one(
        {"id": input.product_id},
        {"$set": {"quantite_stock": quantite_apres, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
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
    type_mouvement: Optional[str] = None
):
    query = {}
    if product_id:
        query["product_id"] = product_id
    if type_mouvement:
        query["type_mouvement"] = type_mouvement
    
    movements = await db.stock_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [deserialize_doc(m) for m in movements]

# ==================== INVENTORY ====================

@api_router.post("/inventories", response_model=Inventory)
async def create_inventory(input: InventoryCreate):
    lignes = []
    
    for ligne_input in input.lignes:
        product = await db.products.find_one({"id": ligne_input.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit non trouvé")
        
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
    
    for ligne in inventory["lignes"]:
        if ligne["ecart"] != 0:
            await db.products.update_one(
                {"id": ligne["product_id"]},
                {"$set": {"quantite_stock": ligne["quantite_physique"], "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            movement = StockMovement(
                product_id=ligne["product_id"],
                product_code=ligne["product_code"],
                designation=ligne["designation"],
                type_mouvement="Ajustement",
                quantite=abs(ligne["ecart"]),
                quantite_avant=ligne["quantite_theorique"],
                quantite_apres=ligne["quantite_physique"],
                reference=inventory["numero"],
                motif=f"Régularisation inventaire"
            )
            await db.stock_movements.insert_one(serialize_doc(movement.model_dump()))
    
    await db.inventories.update_one({"id": inventory_id}, {"$set": {"statut": "Validé"}})
    
    return {"message": "Inventaire validé et stock mis à jour"}

# ==================== DASHBOARD & STATS ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total_products = await db.products.count_documents({})
    total_clients = await db.clients.count_documents({})
    total_suppliers = await db.suppliers.count_documents({})
    total_sales = await db.sales.count_documents({"annulee": False})
    
    products_low_stock = await db.products.count_documents({
        "$expr": {"$lte": ["$quantite_stock", "$stock_minimum"]}
    })
    
    # Today's sales
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_sales = await db.sales.find({
        "date_vente": {"$regex": f"^{today}"},
        "annulee": False
    }, {"_id": 0}).to_list(1000)
    chiffre_affaires_jour = sum(s.get("montant_ttc", 0) for s in today_sales)
    
    # This month's sales
    this_month = datetime.now(timezone.utc).strftime("%Y-%m")
    month_sales = await db.sales.find({
        "date_vente": {"$regex": f"^{this_month}"},
        "annulee": False
    }, {"_id": 0}).to_list(1000)
    chiffre_affaires_mois = sum(s.get("montant_ttc", 0) for s in month_sales)
    
    # Cash register status
    register = await get_current_cash_register()
    caisse_ouverte = register is not None
    fond_caisse_actuel = register["fond_caisse"] + register.get("total_especes", 0) if register else 0
    
    return DashboardStats(
        total_products=total_products,
        total_clients=total_clients,
        total_suppliers=total_suppliers,
        total_sales=total_sales,
        chiffre_affaires_jour=chiffre_affaires_jour,
        chiffre_affaires_mois=chiffre_affaires_mois,
        products_low_stock=products_low_stock,
        caisse_ouverte=caisse_ouverte,
        fond_caisse_actuel=fond_caisse_actuel
    )

@api_router.get("/dashboard/sales-chart")
async def get_sales_chart():
    """Get sales data for the last 30 days"""
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)
    
    sales = await db.sales.find({
        "date_vente": {"$gte": start_date.isoformat()},
        "annulee": False
    }, {"_id": 0}).to_list(1000)
    
    sales_by_date = {}
    for s in sales:
        date_str = s["date_vente"][:10]
        if date_str not in sales_by_date:
            sales_by_date[date_str] = 0
        sales_by_date[date_str] += s.get("montant_ttc", 0)
    
    chart_data = [{"date": date, "montant": amount} for date, amount in sorted(sales_by_date.items())]
    
    return chart_data

@api_router.get("/dashboard/top-products")
async def get_top_products():
    """Get top selling products"""
    sales = await db.sales.find({"annulee": False}, {"_id": 0}).to_list(1000)
    
    product_sales = {}
    for s in sales:
        for ligne in s.get("lignes", []):
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
    
    top_products = sorted(product_sales.values(), key=lambda x: x["quantite_vendue"], reverse=True)[:10]
    
    return top_products

# ==================== EXPORT ====================

@api_router.get("/export/products")
async def export_products():
    import csv
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Code", "Code Barre", "Désignation", "Catégorie", "Prix Achat", "Prix Vente", "Stock", "Stock Minimum", "Unité", "TVA"])
    
    for p in products:
        writer.writerow([
            p.get("code", ""), p.get("code_barre", ""), p.get("designation", ""),
            p.get("categorie", ""), p.get("prix_achat", 0), p.get("prix_vente", 0),
            p.get("quantite_stock", 0), p.get("stock_minimum", 0), p.get("unite", ""), p.get("tva", 0)
        ])
    
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=produits.csv"})

@api_router.get("/export/clients")
async def export_clients():
    import csv
    clients = await db.clients.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Code", "Nom", "Téléphone", "Email", "Adresse", "Ville", "Solde"])
    
    for c in clients:
        writer.writerow([
            c.get("code", ""), c.get("nom", ""), c.get("telephone", ""),
            c.get("email", ""), c.get("adresse", ""), c.get("ville", ""), c.get("solde", 0)
        ])
    
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clients.csv"})

@api_router.get("/export/sales")
async def export_sales():
    import csv
    sales = await db.sales.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Ticket", "Date", "Client", "Montant HT", "TVA", "Montant TTC", "Mode Paiement", "Annulée"])
    
    for s in sales:
        writer.writerow([
            s.get("numero_ticket", ""), s.get("date_vente", "")[:19] if s.get("date_vente") else "",
            s.get("client_nom", ""), s.get("montant_ht", 0), s.get("montant_tva", 0),
            s.get("montant_ttc", 0), s.get("mode_paiement", ""), "Oui" if s.get("annulee") else "Non"
        ])
    
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ventes.csv"})

@api_router.get("/export/stock-movements")
async def export_stock_movements():
    import csv
    movements = await db.stock_movements.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Date", "Code Produit", "Désignation", "Type", "Quantité", "Stock Avant", "Stock Après", "Référence", "Motif"])
    
    for m in movements:
        writer.writerow([
            m.get("created_at", "")[:19] if m.get("created_at") else "",
            m.get("product_code", ""), m.get("designation", ""), m.get("type_mouvement", ""),
            m.get("quantite", 0), m.get("quantite_avant", 0), m.get("quantite_apres", 0),
            m.get("reference", ""), m.get("motif", "")
        ])
    
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mouvements_stock.csv"})

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
