import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  FileDown, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Search,
  ArrowDownCircle,
  AlertOctagon,
  Calendar,
  LogOut,
  Users,
  Edit,
  Eye,
  Lock,
  Building2,
  UserCheck,
  ShoppingCart,
  ClipboardList
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, EXPIRATION_WARNING_DAYS, INITIAL_USERS, PREDEFINED_PRODUCTS } from './constants';
import { Product, Category, Transaction, TransactionType, AlertLevel, ProductStatus, User, UserRole } from './types';
import { generateInventoryPDF, generateTransactionHistoryPDF, generateReplenishmentPDF } from './utils/pdfGenerator';

// --- Helper Functions ---

const getAlertLevel = (product: Product): AlertLevel => {
  // Priority 1: Out of Stock
  if (product.stock === 0) return AlertLevel.OUT_OF_STOCK;

  // Priority 2: Low Stock
  if (product.stock <= product.minStock) return AlertLevel.LOW_STOCK;
  
  // Priority 3: Expiration
  if (product.expirationDate) {
    const today = new Date();
    const expDate = new Date(product.expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return AlertLevel.EXPIRED;
    if (diffDays <= EXPIRATION_WARNING_DAYS) return AlertLevel.EXPIRING_SOON;
  }
  
  return AlertLevel.NONE;
};

// --- Components ---

const LoginScreen = ({ onLogin, users }: { onLogin: (u: User) => void, users: User[] }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            onLogin(user);
        } else {
            setError('Credenciales inválidas');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                        <Package size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">CorpInventario</h1>
                    <p className="text-slate-500">Sistema de Gestión Interna</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                        <input 
                            type="text" 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                        <input 
                            type="password" 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition">
                        Ingresar
                    </button>
                    <div className="text-xs text-center text-slate-400 mt-4">
                        Demo: admin/admin o visitante/123
                    </div>
                </form>
            </div>
        </div>
    );
};

const Dashboard = ({ 
  products, 
  categories,
  onCategoryClick
}: { 
  products: Product[], 
  categories: Category[],
  onCategoryClick: (catId: string) => void
}) => {
  const stats = useMemo(() => {
    let lowStock = 0;
    let outOfStock = 0;
    let expired = 0;
    let expiringSoon = 0;
    let totalVal = 0;

    products.forEach(p => {
      totalVal += p.stock * p.price;
      const alert = getAlertLevel(p);
      if (alert === AlertLevel.OUT_OF_STOCK) outOfStock++;
      if (alert === AlertLevel.LOW_STOCK) lowStock++;
      if (alert === AlertLevel.EXPIRED) expired++;
      if (alert === AlertLevel.EXPIRING_SOON) expiringSoon++;
    });

    return { lowStock, outOfStock, expired, expiringSoon, totalVal, totalCount: products.length };
  }, [products]);

  const stockByCategory = useMemo(() => {
    return categories.map(cat => ({
      name: cat.name,
      stock: products.filter(p => p.categoryId === cat.id).reduce((acc, curr) => acc + curr.stock, 0)
    }));
  }, [products, categories]);

  const alerts = products
    .map(p => ({ product: p, level: getAlertLevel(p) }))
    .filter(a => a.level !== AlertLevel.NONE)
    .sort((a, b) => {
        const priority = { [AlertLevel.OUT_OF_STOCK]: 4, [AlertLevel.EXPIRED]: 3, [AlertLevel.LOW_STOCK]: 2, [AlertLevel.EXPIRING_SOON]: 1, [AlertLevel.NONE]: 0 };
        return priority[b.level] - priority[a.level];
    });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Panel de Control</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-sm font-medium">Total Productos</div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-sm font-medium">Valor Inventario</div>
          <div className="text-2xl font-bold text-slate-900">${stats.totalVal.toLocaleString()}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
          <div className="text-red-600 text-sm font-medium flex items-center gap-2">
            <AlertOctagon size={16} /> Críticos / Agotados
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.outOfStock + stats.lowStock}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl shadow-sm border border-amber-200">
          <div className="text-amber-600 text-sm font-medium flex items-center gap-2">
            <Calendar size={16} /> Vencidos / Por Vencer
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.expired + stats.expiringSoon}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart / Categories Navigation */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Stock por Categoría (Click para filtrar)</h3>
          <div className="h-64 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stockByCategory} 
                onClick={(data) => {
                    if (data && data.activePayload && data.activePayload.length > 0) {
                        const catName = data.activePayload[0].payload.name;
                        const cat = categories.find(c => c.name === catName);
                        if (cat) onCategoryClick(cat.id);
                    }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Quick Links */}
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map(cat => (
                <button 
                    key={cat.id} 
                    onClick={() => onCategoryClick(cat.id)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full border border-slate-300 transition-colors"
                >
                    {cat.name}
                </button>
            ))}
          </div>
        </div>

        {/* Active Alerts List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
          <h3 className="text-lg font-semibold mb-4">Alertas Activas</h3>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 max-h-[300px]">
            {alerts.length === 0 ? (
                <p className="text-slate-400 text-sm">No hay alertas activas.</p>
            ) : (
                alerts.map((item) => (
                <div key={item.product.id} className={`p-3 rounded-lg border flex justify-between items-start ${
                    item.level === AlertLevel.OUT_OF_STOCK ? 'bg-slate-100 border-slate-300' :
                    item.level === AlertLevel.EXPIRED ? 'bg-red-50 border-red-100' :
                    item.level === AlertLevel.LOW_STOCK ? 'bg-orange-50 border-orange-100' :
                    'bg-yellow-50 border-yellow-100'
                }`}>
                    <div>
                    <div className="font-medium text-sm text-slate-800">{item.product.name}</div>
                    <div className="text-xs text-slate-500">{item.product.code}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    item.level === AlertLevel.OUT_OF_STOCK ? 'bg-slate-800 text-white' :
                    item.level === AlertLevel.EXPIRED ? 'bg-red-200 text-red-800' :
                    item.level === AlertLevel.LOW_STOCK ? 'bg-orange-200 text-orange-800' :
                    'bg-yellow-200 text-yellow-800'
                    }`}>
                    {item.level}
                    </span>
                </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- User Management Component ---
const UserManagement = ({ users, onAddUser, currentUser }: { users: User[], onAddUser: (u: User) => void, currentUser: User }) => {
    // ... (No changes here, kept for completeness)
    const [newUser, setNewUser] = useState<Partial<User>>({ role: 'viewer', username: '', password: '', name: '' });

    if (currentUser.role !== 'admin') return <div className="p-8 text-center text-slate-500">Acceso denegado.</div>;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUser.username && newUser.password && newUser.name && newUser.role) {
            onAddUser({
                id: `user_${Date.now()}`,
                ...newUser
            } as User);
            setNewUser({ role: 'viewer', username: '', password: '', name: '' });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold mb-4">Nuevo Usuario</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <input className="w-full border p-2 rounded text-sm" placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-sm" placeholder="Usuario" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-sm" type="password" placeholder="Contraseña" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                        <select className="w-full border p-2 rounded text-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                            <option value="viewer">Vista (Solo lectura)</option>
                            <option value="admin">Administrador</option>
                        </select>
                        <button className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">Crear Usuario</button>
                    </form>
                </div>
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50"><tr><th className="p-4">Nombre</th><th className="p-4">Usuario</th><th className="p-4">Rol</th></tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-t border-slate-100">
                                    <td className="p-4">{u.name}</td>
                                    <td className="p-4 font-mono text-slate-500">{u.username}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {u.role === 'admin' ? 'Administrador' : 'Vista'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Product Modal (Add/Edit/View) ---
// ... (No logic changes, just ensuring it uses the new AlertLevel properly if needed)
const ProductModal = ({ isOpen, onClose, product, categories, isEditMode, onSave, userRole }: any) => {
    // Reuse existing code logic, but ensure we render the difference correctly.
    // The previous implementation is fine.
    const [formData, setFormData] = useState<Partial<Product>>({
        categoryId: categories[0]?.id,
        stock: 0,
        initialStock: 0,
        minStock: 5,
        status: ProductStatus.ACTIVE,
        name: '',
        description: '',
        unit: 'Unidad',
        price: 0
    });

    useEffect(() => {
        if (product) {
            setFormData({ ...product });
        } else {
            setFormData({
                categoryId: categories[0]?.id,
                stock: 0,
                initialStock: 0,
                minStock: 5,
                status: ProductStatus.ACTIVE,
                name: '',
                description: '',
                unit: 'Unidad',
                price: 0
            });
        }
    }, [product, isOpen, categories]);

    if (!isOpen) return null;

    const handleChange = (field: keyof Product, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (catId: string) => {
        setFormData(prev => ({ ...prev, categoryId: catId }));
    };

    const suggestions = formData.categoryId ? PREDEFINED_PRODUCTS[formData.categoryId] || [] : [];
    const readOnly = userRole === 'viewer' || (!isEditMode && !!product);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800">
                        {product ? (isEditMode ? 'Editar Producto' : 'Detalles del Producto') : 'Nuevo Producto'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none">&times;</button>
                </div>
                
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData as Product); }} className="p-6 overflow-y-auto space-y-5">
                    
                    {/* Primary Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
                            <select 
                                disabled={readOnly}
                                className="w-full border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border bg-white disabled:bg-slate-100"
                                value={formData.categoryId} 
                                onChange={e => handleCategoryChange(e.target.value)}
                            >
                                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Código</label>
                            <input disabled={readOnly} required type="text" className="w-full border-slate-300 rounded-lg p-2.5 text-sm border disabled:bg-slate-100" 
                                value={formData.code || ''} onChange={e => handleChange('code', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Producto</label>
                        <input 
                            list="product-suggestions"
                            disabled={readOnly} 
                            required 
                            type="text" 
                            className="w-full border-slate-300 rounded-lg p-2.5 text-sm border focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 font-semibold text-slate-800"
                            value={formData.name || ''} 
                            onChange={e => handleChange('name', e.target.value)} 
                            placeholder="Ej. Resma de Papel"
                        />
                        <datalist id="product-suggestions">
                            {suggestions.map((s: string, i: number) => <option key={i} value={s} />)}
                        </datalist>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción / Detalles</label>
                        <textarea 
                            disabled={readOnly}
                            className="w-full border-slate-300 rounded-lg p-2.5 text-sm border focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
                            rows={2}
                            placeholder="Ej: Tamaño Oficio, Carta, Color..."
                            value={formData.description || ''}
                            onChange={e => handleChange('description', e.target.value)}
                        />
                    </div>

                    {/* Stock Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Package size={16}/> Control de Inventario</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Cant. Inicial</label>
                                <input disabled={readOnly} type="number" min="0" className="w-full border rounded p-2 text-sm text-center font-medium" 
                                    value={formData.initialStock} onChange={e => handleChange('initialStock', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Cant. Actual</label>
                                <input disabled={readOnly} type="number" min="0" className="w-full border rounded p-2 text-sm text-center font-bold text-emerald-700 bg-white" 
                                    value={formData.stock} onChange={e => handleChange('stock', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Diferencia</label>
                                <div className="w-full p-2 text-sm text-center font-bold text-slate-700 border rounded bg-slate-100">
                                    {(formData.initialStock || 0) - (formData.stock || 0)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unidad</label>
                            <input disabled={readOnly} required type="text" className="w-full border rounded p-2.5 text-sm" 
                                value={formData.unit || ''} onChange={e => handleChange('unit', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Min Stock</label>
                            <input disabled={readOnly} type="number" className="w-full border rounded p-2.5 text-sm" 
                                value={formData.minStock || 0} onChange={e => handleChange('minStock', parseInt(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Unit.</label>
                            <input disabled={readOnly} type="number" step="0.01" className="w-full border rounded p-2.5 text-sm" 
                                value={formData.price || 0} onChange={e => handleChange('price', parseFloat(e.target.value))} />
                        </div>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vencimiento</label>
                         <input disabled={readOnly} type="date" className="w-full border rounded p-2.5 text-sm" 
                            value={formData.expirationDate || ''} onChange={e => handleChange('expirationDate', e.target.value)} />
                    </div>

                    {!readOnly && (
                        <div className="pt-2">
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all">
                                {product && product.id ? 'Guardar Cambios' : 'Crear Producto'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

// --- Inventory Component ---

const InventoryList = ({ 
  products, 
  categories,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  initialCategoryFilter,
  currentUser
}: { 
  products: Product[], 
  categories: Category[],
  onAddProduct: (p: Product) => void,
  onEditProduct: (p: Product) => void,
  onDeleteProduct: (id: string) => void,
  initialCategoryFilter: string | null,
  currentUser: User
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (initialCategoryFilter) setCategoryFilter(initialCategoryFilter);
  }, [initialCategoryFilter]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setIsEditMode(true);
    setModalOpen(true);
  };

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(false); // Default to view mode
    setModalOpen(true);
  };

  const handleSaveFromModal = (productData: Product) => {
    if (selectedProduct && selectedProduct.id) {
        onEditProduct(productData);
    } else {
        // Create new
        const newId = `prod_${Date.now()}`;
        onAddProduct({ ...productData, id: newId });
    }
    setModalOpen(false);
  };

  const switchToEdit = () => {
      setIsEditMode(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Inventario General</h2>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => generateInventoryPDF(filteredProducts, categories)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                <FileDown size={18} /> PDF
            </button>
            {currentUser.role === 'admin' && (
                <button 
                    onClick={handleOpenCreate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md shadow-emerald-200">
                    <Plus size={18} /> Nuevo Producto
                </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                type="text" 
                placeholder="Buscar por nombre, código o descripción..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="w-full md:w-64 py-2 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-center">Inicial</th>
                <th className="px-6 py-4 text-center">Actual</th>
                <th className="px-6 py-4 text-center">Dif.</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => {
                const category = categories.find(c => c.id === product.categoryId);
                const alert = getAlertLevel(product);
                const difference = (product.initialStock || 0) - product.stock;
                
                return (
                  <tr key={product.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => handleRowClick(product)}>
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.description}</div>
                        <div className="text-xs font-mono text-slate-400 mt-1">{product.code}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                        <span className="inline-block bg-slate-100 px-2 py-1 rounded text-xs">{category?.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500">{product.initialStock}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded font-bold ${
                            product.stock === 0 ? 'text-slate-200 bg-slate-800' : 
                            product.stock <= product.minStock ? 'text-red-600 bg-red-50' : 'text-slate-700'
                        }`}>
                            {product.stock}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="text-xs font-mono text-slate-500">{difference > 0 ? `-${difference}` : difference}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        {alert !== AlertLevel.NONE ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                alert === AlertLevel.OUT_OF_STOCK ? 'bg-slate-800 text-white' :
                                alert === AlertLevel.EXPIRED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                <AlertTriangle size={12} /> {alert}
                            </span>
                        ) : (
                            <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">OK</span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleRowClick(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition">
                                <Eye size={16} />
                            </button>
                            {currentUser.role === 'admin' && (
                                <button onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        product={selectedProduct} 
        categories={categories}
        isEditMode={isEditMode}
        onSave={handleSaveFromModal}
        userRole={currentUser.role}
      />
      
      {modalOpen && !isEditMode && currentUser.role === 'admin' && (
          <div className="fixed z-[60] bottom-10 right-10">
              <button onClick={switchToEdit} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center gap-2">
                  <Edit size={20} /> Editar
              </button>
          </div>
      )}
    </div>
  );
};

// --- Write-Off / Salidas Module ---

const WriteOffModule = ({
    products,
    transactions,
    onProcessBaja
}: {
    products: Product[],
    transactions: Transaction[],
    onProcessBaja: (productId: string, qty: number, reason: string, dest?: string, receiver?: string) => void
}) => {
    const [selectedId, setSelectedId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('Consumo');
    const [destination, setDestination] = useState('');
    const [receiver, setReceiver] = useState('');
    const [notes, setNotes] = useState('');

    const selectedProduct = products.find(p => p.id === selectedId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedProduct && quantity > 0 && quantity <= selectedProduct.stock) {
            onProcessBaja(selectedProduct.id, quantity, `${reason}: ${notes}`, destination, receiver);
            setQuantity(1);
            setNotes('');
            setDestination('');
            setReceiver('');
            alert('Salida procesada correctamente');
        } else {
            alert('Error: Verifique el stock disponible');
        }
    };

    return (
        <div className="space-y-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ArrowDownCircle className="text-red-500" />
                    Registrar Salida / Baja
                </h2>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Producto</label>
                            <select 
                                className="w-full border-slate-200 rounded-lg p-3 text-slate-700 border focus:ring-2 focus:ring-red-100 outline-none bg-white"
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                required
                            >
                                <option value="">-- Seleccione un producto --</option>
                                {products.filter(p => p.stock > 0).map(p => (
                                    <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.description})</option>
                                ))}
                            </select>
                        </div>

                        {selectedProduct && (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500">Stock Actual:</span> <span className="font-bold text-slate-800">{selectedProduct.stock} {selectedProduct.unit}</span></div>
                                <div><span className="text-slate-500">Ubicación:</span> <span className="font-bold text-slate-800">{selectedProduct.location || 'N/A'}</span></div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad a Retirar</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={selectedProduct?.stock || 1} 
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-red-100 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Motivo de Salida</label>
                                <select 
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-red-100 bg-white"
                                >
                                    <option value="Consumo">Consumo Interno / Entrega</option>
                                    <option value="Solicitud">Solicitud de Área</option>
                                    <option value="Deterioro">Deterioro / Daño</option>
                                    <option value="Vencimiento">Vencimiento</option>
                                    <option value="Obsolescencia">Obsolescencia Técnica</option>
                                    <option value="Pérdida">Pérdida / Robo</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-4">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Building2 size={16}/> Datos de Entrega
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Oficina / Departamento Destino</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Contabilidad, RRHH..."
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="w-full border-slate-200 rounded-lg p-2.5 border outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Recibido por (Nombre)</label>
                                    <div className="relative">
                                        <UserCheck size={16} className="absolute left-3 top-3 text-slate-400"/>
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del responsable"
                                            value={receiver}
                                            onChange={(e) => setReceiver(e.target.value)}
                                            className="w-full border-slate-200 rounded-lg pl-9 pr-3 py-2.5 border outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Notas Adicionales</label>
                            <textarea 
                                rows={2} 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-red-100"
                                placeholder="Detalle opcional sobre la operación..."
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            disabled={!selectedId}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-100"
                        >
                            Procesar Salida
                        </button>
                    </form>
                </div>
            </div>

            {/* History Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardList className="text-slate-500" />
                        Historial de Salidas
                    </h2>
                    <button 
                        onClick={() => generateTransactionHistoryPDF(transactions)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                        <FileDown size={18} /> Descargar Reporte
                    </button>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Fecha</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Producto</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Cant.</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Motivo</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Destino</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Recibido Por</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">No hay movimientos registrados.</td></tr>
                                ) : (
                                    transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(tx.date).toLocaleDateString()} <span className="text-xs">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{tx.productName}</td>
                                            <td className="px-6 py-4 font-bold text-red-600">-{tx.quantity}</td>
                                            <td className="px-6 py-4 text-slate-600">{tx.reason}</td>
                                            <td className="px-6 py-4 text-slate-600">{tx.destination || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600">{tx.receiver || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- New Module: Replenishment ---
const ReplenishmentModule = ({ products }: { products: Product[] }) => {
    // Filter products that are low stock or out of stock
    const neededProducts = products.filter(p => p.stock <= p.minStock);

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="text-blue-600" />
                    Pedidos y Reabastecimiento
                </h2>
                <button 
                    onClick={() => generateReplenishmentPDF(products)}
                    disabled={neededProducts.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <FileDown size={18} /> Descargar Orden
                </button>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-blue-50 border-b border-blue-100 text-blue-800 text-sm">
                    Mostrando productos con stock igual o inferior al mínimo permitido. Se sugiere reponer inventario.
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4 text-center">Stock Actual</th>
                                <th className="px-6 py-4 text-center">Stock Mínimo</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Sugerido (Compra)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {neededProducts.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Todo el inventario está en niveles óptimos.</td></tr>
                            ) : (
                                neededProducts.map(p => {
                                    const suggested = (p.minStock * 2) - p.stock;
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{p.name}</div>
                                                <div className="text-xs text-slate-500">{p.code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-bold ${p.stock === 0 ? 'text-slate-800' : 'text-red-600'}`}>
                                                    {p.stock}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-500">{p.minStock}</td>
                                            <td className="px-6 py-4 text-center">
                                                {p.stock === 0 ? (
                                                    <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded-full font-bold">AGOTADO</span>
                                                ) : (
                                                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">BAJO STOCK</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                                    +{suggested} {p.unit}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>
    );
};

// ... CategoryManager remains the same ...
const CategoryManager = ({
    categories,
    onAddCategory
}: {
    categories: Category[],
    onAddCategory: (name: string, desc: string) => void
}) => {
    // Reuse existing
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name) {
            onAddCategory(name, desc);
            setName('');
            setDesc('');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold mb-4">Nueva Categoría</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full border rounded p-2 text-sm" rows={3} />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">Crear Categoría</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 font-medium text-slate-500">Nombre</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Descripción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {categories.map(cat => (
                                <tr key={cat.id}>
                                    <td className="px-6 py-4 font-medium">{cat.name}</td>
                                    <td className="px-6 py-4 text-slate-500">{cat.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'bajas' | 'replenishment' | 'categories' | 'users'>('dashboard');
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('corp_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('corp_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('corp_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  
  // Store transactions locally
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
      const saved = localStorage.getItem('corp_transactions');
      return saved ? JSON.parse(saved) : [];
  });

  const [inventoryFilter, setInventoryFilter] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('corp_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('corp_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('corp_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('corp_transactions', JSON.stringify(transactions)); }, [transactions]);

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => setUser(null);

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const editProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const deleteProduct = (id: string) => {
    if (confirm('¿Está seguro de eliminar este producto?')) {
        setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const processBaja = (productId: string, qty: number, reason: string, destination?: string, receiver?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Update Product Stock
    setProducts(prev => prev.map(p => {
        if (p.id === productId) {
            return { ...p, stock: p.stock - qty };
        }
        return p;
    }));

    // Record Transaction
    const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        productId,
        productName: product.name,
        type: TransactionType.OUT, // Use OUT for deliveries/bajas generally here
        quantity: qty,
        date: new Date().toISOString(),
        reason,
        user: user?.username || 'Unknown',
        destination,
        receiver
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const addCategory = (name: string, description: string) => {
    const newCat: Category = { id: `cat_${Date.now()}`, name, description };
    setCategories(prev => [...prev, newCat]);
  };

  const addUser = (newUser: User) => {
      setUsers(prev => [...prev, newUser]);
  };

  const navigateToCategory = (catId: string) => {
      setInventoryFilter(catId);
      setActiveTab('inventory');
  };

  if (!user) {
      return <LoginScreen onLogin={handleLogin} users={users} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full shadow-xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="text-emerald-500" />
            CorpInventario
          </h1>
          <div className="mt-4 flex items-center gap-3 bg-slate-800 p-2 rounded-lg">
             <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                 {user.name.charAt(0)}
             </div>
             <div className="overflow-hidden">
                 <p className="text-sm font-medium text-white truncate">{user.name}</p>
                 <p className="text-xs text-slate-400 capitalize">{user.role}</p>
             </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
            <Tags size={20} /> Inventario
          </button>
          
          {user.role === 'admin' && (
              <>
                <button onClick={() => setActiveTab('bajas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'bajas' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
                    <ArrowDownCircle size={20} /> Salidas y Bajas
                </button>
                <button onClick={() => setActiveTab('replenishment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'replenishment' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
                    <ShoppingCart size={20} /> Pedidos
                </button>
                <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'categories' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
                    <AlertOctagon size={20} /> Categorías
                </button>
                <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
                    <Users size={20} /> Usuarios
                </button>
              </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8 overflow-y-auto min-h-screen">
        {activeTab === 'dashboard' && <Dashboard products={products} categories={categories} onCategoryClick={navigateToCategory} />}
        {activeTab === 'inventory' && (
            <InventoryList 
                products={products} 
                categories={categories} 
                onAddProduct={addProduct}
                onEditProduct={editProduct}
                onDeleteProduct={deleteProduct}
                initialCategoryFilter={inventoryFilter}
                currentUser={user}
            />
        )}
        {activeTab === 'bajas' && user.role === 'admin' && <WriteOffModule products={products} transactions={transactions} onProcessBaja={processBaja} />}
        {activeTab === 'replenishment' && user.role === 'admin' && <ReplenishmentModule products={products} />}
        {activeTab === 'categories' && user.role === 'admin' && <CategoryManager categories={categories} onAddCategory={addCategory} />}
        {activeTab === 'users' && user.role === 'admin' && <UserManagement users={users} onAddUser={addUser} currentUser={user} />}
        
        {/* Permission Denied Fallback */}
        {(activeTab === 'bajas' || activeTab === 'replenishment' || activeTab === 'categories' || activeTab === 'users') && user.role !== 'admin' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Lock size={48} className="mb-4" />
                <h2 className="text-xl font-bold">Acceso Restringido</h2>
                <p>No tiene permisos para ver esta sección.</p>
            </div>
        )}
      </main>
    </div>
  );
}