import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ClipboardList,
  Truck,
  HardHat,
  ScanBarcode,
  X,
  Loader2
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
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from './supabaseClient';
import { EXPIRATION_WARNING_DAYS, PREDEFINED_PRODUCTS } from './constants';
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

const playScanSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1200Hz beep
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1); // 100ms duration
    } catch (e) {
        console.error("Audio playback failed", e);
    }
};

// --- Components ---

// --- Scanner Component ---
const ScannerModal = ({ isOpen, onClose, onScanSuccess }: { isOpen: boolean, onClose: () => void, onScanSuccess: (text: string) => void }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (isOpen && !scannerRef.current) {
            // Initialize scanner
            const scanner = new Html5QrcodeScanner(
                "reader",
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                /* verbose= */ false
            );
            
            scanner.render(
                (decodedText) => {
                    playScanSound();
                    onScanSuccess(decodedText);
                    scanner.clear().catch(err => console.error("Failed to clear scanner", err));
                    scannerRef.current = null;
                    onClose();
                },
                (errorMessage) => {
                    // Scanning...
                }
            );
            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner", error);
                });
                scannerRef.current = null;
            }
        };
    }, [isOpen, onScanSuccess, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <ScanBarcode size={20}/> Escanear Código
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-4 bg-black">
                     <div id="reader" className="w-full bg-white rounded-lg overflow-hidden"></div>
                     <p className="text-center text-slate-400 text-sm mt-4">Apunte la cámara al código de barras o QR</p>
                </div>
            </div>
        </div>
    );
};

const LoginScreen = ({ onLogin, loading }: { onLogin: (u: string, p: string) => void, loading: boolean }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border-t-4 border-emerald-500">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 text-slate-800 mb-4 border-2 border-slate-200">
                        <Truck size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">SGI Abastecimiento</h1>
                    <p className="text-slate-500">Gestión de Almacén Corporativo</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                        <input 
                            type="text" 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                        <input 
                            type="password" 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-emerald-700 text-white py-3 rounded-lg font-bold hover:bg-emerald-800 transition shadow-lg flex justify-center items-center gap-2">
                        {loading && <Loader2 className="animate-spin" size={20}/>}
                        {loading ? 'Verificando...' : 'Acceder al Almacén'}
                    </button>
                    <div className="text-xs text-center text-slate-400 mt-4">
                        Conectado a Supabase
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
      name: cat.name.split(' ')[0], // Shorten name for chart
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
      <h2 className="text-2xl font-bold text-slate-800">Panel General de Abastecimiento</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <div className="text-slate-500 text-sm font-medium">Items en Inventario</div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <div className="text-slate-500 text-sm font-medium">Valorización Total</div>
          <div className="text-2xl font-bold text-slate-900">${stats.totalVal.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <div className="text-red-600 text-sm font-medium flex items-center gap-2">
            <AlertOctagon size={16} /> Críticos / Agotados
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.outOfStock + stats.lowStock}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
          <div className="text-amber-600 text-sm font-medium flex items-center gap-2">
            <Calendar size={16} /> Caducidad Próxima
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.expired + stats.expiringSoon}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart / Categories Navigation */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Niveles de Stock por Categoría</h3>
          <div className="h-64 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stockByCategory} 
                onClick={(data) => {
                    if (data && data.activePayload && data.activePayload.length > 0) {
                        const catName = data.activePayload[0].payload.name;
                        // Find category by partial name match
                        const cat = categories.find(c => c.name.startsWith(catName));
                        if (cat) onCategoryClick(cat.id);
                    }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="stock" fill="#0f766e" radius={[4, 4, 0, 0]} />
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
          <h3 className="text-lg font-semibold mb-4">Alertas de Reposición</h3>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 max-h-[300px]">
            {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                    <UserCheck size={32} className="mb-2 opacity-50"/>
                    Todo en orden
                </div>
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
                    {item.level === AlertLevel.OUT_OF_STOCK ? 'AGOTADO' : 
                     item.level === AlertLevel.LOW_STOCK ? 'BAJO' : 
                     item.level === AlertLevel.EXPIRED ? 'VENCIDO' : 'POR VENCER'}
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
    const [newUser, setNewUser] = useState<Partial<User>>({ role: 'viewer', username: '', password: '', name: '' });

    if (currentUser.role !== 'admin') return <div className="p-8 text-center text-slate-500">Acceso denegado.</div>;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUser.username && newUser.password && newUser.name && newUser.role) {
            onAddUser(newUser as User);
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
                            <option value="viewer">Vista (Operador)</option>
                            <option value="admin">Administrador (Jefe Almacén)</option>
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
                                            {u.role === 'admin' ? 'Jefe Almacén' : 'Operador'}
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
const ProductModal = ({ isOpen, onClose, product, categories, isEditMode, onSave, userRole }: any) => {
    const [formData, setFormData] = useState<Partial<Product>>({
        categoryId: categories[0]?.id,
        stock: 0,
        initialStock: 0,
        minStock: 10,
        status: ProductStatus.ACTIVE,
        name: '',
        description: '',
        unit: 'Unidad',
        price: 0,
        supplier: '',
        location: ''
    });
    
    const [scannerOpen, setScannerOpen] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({ ...product });
        } else {
            setFormData({
                categoryId: categories[0]?.id,
                stock: 0,
                initialStock: 0,
                minStock: 10,
                status: ProductStatus.ACTIVE,
                name: '',
                description: '',
                unit: 'Unidad',
                price: 0,
                supplier: '',
                location: ''
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

    const handleScanResult = (code: string) => {
        handleChange('code', code);
    };

    const suggestions = formData.categoryId ? PREDEFINED_PRODUCTS[formData.categoryId] || [] : [];
    const readOnly = userRole === 'viewer' || (!isEditMode && !!product);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {product ? (isEditMode ? 'Editar Material / EPP' : 'Ficha de Material') : 'Ingreso Nuevo Material'}
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Código Interno / Barras</label>
                            <div className="flex gap-2">
                                <input disabled={readOnly} required type="text" className="w-full border-slate-300 rounded-lg p-2.5 text-sm border disabled:bg-slate-100" 
                                    value={formData.code || ''} onChange={e => handleChange('code', e.target.value)} placeholder="Escanee o escriba..." />
                                {!readOnly && (
                                    <button 
                                        type="button" 
                                        onClick={() => setScannerOpen(true)}
                                        className="bg-slate-800 text-white p-2.5 rounded-lg hover:bg-slate-700 transition"
                                        title="Escanear Código"
                                    >
                                        <ScanBarcode size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Material / EPP</label>
                        <input 
                            list="product-suggestions"
                            disabled={readOnly} 
                            required 
                            type="text" 
                            className="w-full border-slate-300 rounded-lg p-2.5 text-sm border focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 font-semibold text-slate-800"
                            value={formData.name || ''} 
                            onChange={e => handleChange('name', e.target.value)} 
                            placeholder="Ej. Guantes de Seguridad"
                        />
                        <datalist id="product-suggestions">
                            {suggestions.map((s: string, i: number) => <option key={i} value={s} />)}
                        </datalist>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Proveedor Principal</label>
                             <input disabled={readOnly} type="text" className="w-full border-slate-300 rounded-lg p-2.5 text-sm border disabled:bg-slate-100" 
                                placeholder="Empresa S.A."
                                value={formData.supplier || ''} onChange={e => handleChange('supplier', e.target.value)} />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ubicación Física</label>
                             <input disabled={readOnly} type="text" className="w-full border-slate-300 rounded-lg p-2.5 text-sm border disabled:bg-slate-100" 
                                placeholder="Estante/Pasillo"
                                value={formData.location || ''} onChange={e => handleChange('location', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Especificaciones Técnicas</label>
                        <textarea 
                            disabled={readOnly}
                            className="w-full border-slate-300 rounded-lg p-2.5 text-sm border focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
                            rows={2}
                            placeholder="Dimensiones, material, marca, talla..."
                            value={formData.description || ''}
                            onChange={e => handleChange('description', e.target.value)}
                        />
                    </div>

                    {/* Stock Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Package size={16}/> Control de Existencias</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Stock Inicial</label>
                                <input disabled={readOnly} type="number" min="0" className="w-full border rounded p-2 text-sm text-center font-medium" 
                                    value={formData.initialStock} onChange={e => handleChange('initialStock', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Stock Actual</label>
                                <input disabled={readOnly} type="number" min="0" className="w-full border rounded p-2 text-sm text-center font-bold text-emerald-700 bg-white" 
                                    value={formData.stock} onChange={e => handleChange('stock', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Unidad Medida</label>
                                <input disabled={readOnly} required type="text" className="w-full border rounded p-2 text-sm text-center" 
                                    placeholder="Und/Kg/Lt"
                                    value={formData.unit || ''} onChange={e => handleChange('unit', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Min Stock</label>
                            <input disabled={readOnly} type="number" className="w-full border rounded p-2.5 text-sm" 
                                value={formData.minStock || 0} onChange={e => handleChange('minStock', parseInt(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Unit.</label>
                            <input disabled={readOnly} type="number" step="0.01" className="w-full border rounded p-2.5 text-sm" 
                                value={formData.price || 0} onChange={e => handleChange('price', parseFloat(e.target.value))} />
                        </div>
                        <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Caducidad</label>
                         <input disabled={readOnly} type="date" className="w-full border rounded p-2.5 text-sm" 
                            value={formData.expirationDate || ''} onChange={e => handleChange('expirationDate', e.target.value)} />
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="pt-2">
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all">
                                {product && product.id ? 'Guardar Cambios' : 'Registrar Material'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
            <ScannerModal 
                isOpen={scannerOpen} 
                onClose={() => setScannerOpen(false)} 
                onScanSuccess={handleScanResult} 
            />
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
  const [scannerOpen, setScannerOpen] = useState(false);
  
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
                          (p.supplier && p.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
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
        onAddProduct(productData);
    }
    setModalOpen(false);
  };

  const switchToEdit = () => {
      setIsEditMode(true);
  };

  const handleScanSearch = (code: string) => {
      setSearchTerm(code);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Inventario de Materiales</h2>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => generateInventoryPDF(filteredProducts, categories)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                <FileDown size={18} /> Reporte PDF
            </button>
            {currentUser.role === 'admin' && (
                <button 
                    onClick={handleOpenCreate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md shadow-emerald-200">
                    <Plus size={18} /> Nuevo Material
                </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full flex gap-2">
             <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por material, código o proveedor..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <button 
                onClick={() => setScannerOpen(true)}
                className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 transition flex items-center justify-center"
                title="Escanear Código"
             >
                <ScanBarcode size={20} />
             </button>
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
                <th className="px-6 py-4">Material / Descripción</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Unidad</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => {
                const category = categories.find(c => c.id === product.categoryId);
                const alert = getAlertLevel(product);
                
                return (
                  <tr key={product.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => handleRowClick(product)}>
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.description}</div>
                        <div className="text-xs font-mono text-slate-400 mt-1">{product.code}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                        <span className="inline-block bg-slate-100 px-2 py-1 rounded text-xs whitespace-nowrap">{category?.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">
                        {product.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded font-bold ${
                            product.stock === 0 ? 'text-slate-200 bg-slate-800' : 
                            product.stock <= product.minStock ? 'text-red-600 bg-red-50' : 'text-slate-700'
                        }`}>
                            {product.stock}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="text-xs text-slate-500">{product.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        {alert !== AlertLevel.NONE ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                alert === AlertLevel.OUT_OF_STOCK ? 'bg-slate-800 text-white' :
                                alert === AlertLevel.EXPIRED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                <AlertTriangle size={12} /> {alert === AlertLevel.OUT_OF_STOCK ? 'AGOTADO' : 'ALERTA'}
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
                  <Edit size={20} /> Editar Ficha
              </button>
          </div>
      )}

      <ScannerModal 
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSearch}
      />
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
    const [reason, setReason] = useState('Despacho a Obra');
    const [destination, setDestination] = useState('');
    const [receiver, setReceiver] = useState('');
    const [notes, setNotes] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const selectedProduct = products.find(p => p.id === selectedId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedProduct && quantity > 0 && quantity <= selectedProduct.stock) {
            setLoading(true);
            await onProcessBaja(selectedProduct.id, quantity, `${reason}: ${notes}`, destination, receiver);
            setLoading(false);
            setQuantity(1);
            setNotes('');
            setDestination('');
            setReceiver('');
            alert('Despacho procesado correctamente');
        } else {
            alert('Error: Verifique el stock disponible');
        }
    };

    const handleScanResult = (code: string) => {
        const prod = products.find(p => p.code === code);
        if (prod) {
            if (prod.stock === 0) {
                 alert(`¡ALERTA! El producto "${prod.name}" no tiene stock disponible.`);
            } else {
                 setSelectedId(prod.id);
            }
        } else {
            alert(`Producto con código ${code} no encontrado.`);
        }
    };

    return (
        <div className="space-y-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Truck className="text-blue-600" />
                    Despacho / Salida de Materiales
                </h2>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Material</label>
                            <div className="flex gap-2">
                                <select 
                                    className="w-full border-slate-200 rounded-lg p-3 text-slate-700 border focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                                    value={selectedId}
                                    onChange={(e) => setSelectedId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Buscar en Inventario --</option>
                                    {products.filter(p => p.stock > 0).map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.unit})</option>
                                    ))}
                                </select>
                                <button 
                                    type="button" 
                                    onClick={() => setScannerOpen(true)}
                                    className="bg-slate-800 text-white p-3 rounded-lg hover:bg-slate-700 transition"
                                    title="Escanear Material"
                                >
                                    <ScanBarcode size={24} />
                                </button>
                            </div>
                        </div>

                        {selectedProduct && (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500">Disponible:</span> <span className="font-bold text-slate-800 text-lg">{selectedProduct.stock} {selectedProduct.unit}</span></div>
                                <div><span className="text-slate-500">Ubicación:</span> <span className="font-bold text-slate-800">{selectedProduct.location || 'N/A'}</span></div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad a Despachar</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={selectedProduct?.stock || 1} 
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-blue-100 transition-all font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Movimiento</label>
                                <select 
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                >
                                    <option value="Despacho a Obra">Despacho a Obra / Proyecto</option>
                                    <option value="Entrega a Personal">Entrega EPP a Personal</option>
                                    <option value="Mantenimiento">Uso en Mantenimiento</option>
                                    <option value="Transferencia">Transferencia entre Almacenes</option>
                                    <option value="Deterioro">Baja por Deterioro / Caducidad</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-4">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Building2 size={16}/> Datos de Destino
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Destino (Obra / Área)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Obra Central, Taller Mecánico"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="w-full border-slate-200 rounded-lg p-2.5 border outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Receptor (Quien recibe)</label>
                                    <div className="relative">
                                        <HardHat size={16} className="absolute left-3 top-3 text-slate-400"/>
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
                            <label className="block text-sm font-medium text-slate-700 mb-2">Observaciones</label>
                            <textarea 
                                rows={2} 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder="Detalles adicionales..."
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            disabled={!selectedId || loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-100 flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={20}/>}
                            Confirmar Salida
                        </button>
                    </form>
                </div>
            </div>

            {/* History Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardList className="text-slate-500" />
                        Historial de Movimientos
                    </h2>
                    <button 
                        onClick={() => generateTransactionHistoryPDF(transactions)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
                        <FileDown size={18} /> Reporte Movimientos
                    </button>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Fecha</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Material</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Cant.</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Tipo/Motivo</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Destino</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Receptor</th>
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
            
            <ScannerModal 
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScanSuccess={handleScanResult}
            />
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
                    <ShoppingCart className="text-emerald-600" />
                    Solicitudes de Compra (Reposición)
                </h2>
                <button 
                    onClick={() => generateReplenishmentPDF(products)}
                    disabled={neededProducts.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <FileDown size={18} /> Generar Orden de Compra
                </button>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-sm">
                    Mostrando materiales con stock crítico que requieren reabastecimiento inmediato.
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4">Material</th>
                                <th className="px-6 py-4">Proveedor Habitual</th>
                                <th className="px-6 py-4 text-center">Stock Actual</th>
                                <th className="px-6 py-4 text-center">Stock Mínimo</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Pedido Sugerido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {neededProducts.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Almacén abastecido correctamente.</td></tr>
                            ) : (
                                neededProducts.map(p => {
                                    const suggested = (p.minStock * 2) - p.stock;
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{p.name}</div>
                                                <div className="text-xs text-slate-500">{p.code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {p.supplier || 'No Asignado'}
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
                                                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">CRÍTICO</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name) {
            await onAddCategory(name, desc);
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
                            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Ej: Herramientas Eléctricas" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full border rounded p-2 text-sm" rows={3} placeholder="Detalles de la categoría" />
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
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [inventoryFilter, setInventoryFilter] = useState<string | null>(null);

  // --- Data Fetching ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: p } = await supabase.from('products').select('*');
        const { data: c } = await supabase.from('categories').select('*');
        const { data: u } = await supabase.from('users').select('*');
        const { data: t } = await supabase.from('transactions').select('*').order('date', { ascending: false });

        if (p) setProducts(p as Product[]);
        if (c) setCategories(c as Category[]);
        if (u) setUsers(u as User[]);
        if (t) setTransactions(t as Transaction[]);

    } catch (err) {
        console.error("Error fetching data:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleLogin = async (u: string, p: string) => {
    setAuthLoading(true);
    // In a real app, use Supabase Auth. This simulates the existing logic with DB lookup.
    const { data, error } = await supabase.from('users').select('*').eq('username', u).eq('password', p).single();
    
    setAuthLoading(false);
    if (data) {
        setUser(data as User);
    } else {
        alert("Credenciales inválidas");
    }
  };

  const handleLogout = () => setUser(null);

  // --- CRUD Operations ---

  const addProduct = async (product: Product) => {
    // Remove temporary ID if any
    const { id, ...newProd } = product; 
    const { data, error } = await supabase.from('products').insert([newProd]).select();
    if (data) {
        setProducts(prev => [...prev, data[0] as Product]);
    } else {
        console.error(error);
        alert("Error al crear producto");
    }
  };

  const editProduct = async (updatedProduct: Product) => {
    const { data, error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', updatedProduct.id)
        .select();
    
    if (data) {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? (data[0] as Product) : p));
    } else {
        console.error(error);
        alert("Error al actualizar producto");
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este material del sistema?')) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
            setProducts(prev => prev.filter(p => p.id !== id));
        } else {
            alert("Error al eliminar (puede tener transacciones asociadas)");
        }
    }
  };

  const processBaja = async (productId: string, qty: number, reason: string, destination?: string, receiver?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // 1. Update Stock
    const newStock = product.stock - qty;
    const { error: stockError } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
    
    if (stockError) {
        alert("Error al actualizar stock");
        return;
    }

    // 2. Create Transaction
    const newTx = {
        productId,
        productName: product.name,
        type: TransactionType.OUT,
        quantity: qty,
        date: new Date().toISOString(),
        reason,
        user: user?.username || 'Unknown',
        destination,
        receiver
    };

    const { data: txData, error: txError } = await supabase.from('transactions').insert([newTx]).select();

    if (txData) {
        // Update local state
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
        setTransactions(prev => [txData[0] as Transaction, ...prev]);
    }
  };

  const addCategory = async (name: string, description: string) => {
    const { data, error } = await supabase.from('categories').insert([{ name, description }]).select();
    if (data) {
        setCategories(prev => [...prev, data[0] as Category]);
    }
  };

  const addUser = async (newUser: User) => {
      // Remove temporary ID
      const { id, ...userObj } = newUser;
      const { data, error } = await supabase.from('users').insert([userObj]).select();
      if (data) {
          setUsers(prev => [...prev, data[0] as User]);
      }
  };

  const navigateToCategory = (catId: string) => {
      setInventoryFilter(catId);
      setActiveTab('inventory');
  };

  if (!user) {
      return <LoginScreen onLogin={handleLogin} loading={authLoading} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full shadow-xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Truck className="text-emerald-500" />
            Abastecimiento
          </h1>
          <div className="mt-4 flex items-center gap-3 bg-slate-800 p-2 rounded-lg">
             <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold border border-emerald-400">
                 {user.name.charAt(0)}
             </div>
             <div className="overflow-hidden">
                 <p className="text-sm font-medium text-white truncate">{user.name}</p>
                 <p className="text-xs text-slate-400 capitalize">{user.role === 'admin' ? 'Administrador' : 'Operador'}</p>
             </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-700 text-white' : 'hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-emerald-700 text-white' : 'hover:bg-slate-800'}`}>
            <Package size={20} /> Inventario
          </button>
          
          {user.role === 'admin' && (
              <>
                <button onClick={() => setActiveTab('bajas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'bajas' ? 'bg-emerald-700 text-white' : 'hover:bg-slate-800'}`}>
                    <Truck size={20} /> Despacho / Salidas
                </button>
                <button onClick={() => setActiveTab('replenishment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'replenishment' ? 'bg-emerald-700 text-white' : 'hover:bg-slate-800'}`}>
                    <ShoppingCart size={20} /> Compras
                </button>
                <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'categories' ? 'bg-emerald-700 text-white' : 'hover:bg-slate-800'}`}>
                    <Tags size={20} /> Categorías
                </button>
                <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-emerald-700 text-white' : 'hover:bg-slate-800'}`}>
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
      <main className="ml-64 flex-1 p-8 overflow-y-auto min-h-screen relative">
        {loading && (
             <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center">
                 <Loader2 className="animate-spin text-emerald-600" size={48} />
             </div>
        )}

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