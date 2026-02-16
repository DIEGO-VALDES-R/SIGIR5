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
  RefreshCw,
  FileSpreadsheet
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
import { Toaster, toast } from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';

// IMPORTANTE: Asegúrate de que esta ruta es correcta en tu proyecto
import { supabase } from './supabaseClient';

import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, EXPIRATION_WARNING_DAYS, INITIAL_USERS, PREDEFINED_PRODUCTS } from './constants';
import { Product, Category, Transaction, TransactionType, AlertLevel, ProductStatus, User, UserRole } from './types';
import { ImageUploader } from './components/ImageUploader';
import { uploadProductImage, deleteProductImage } from './utils/imageHandler';
import { generateInventoryPDF, generateTransactionHistoryPDF, generateReplenishmentPDF } from './utils/pdfGenerator';
import { 
  generateInventoryExcel,
  generateTransactionHistoryExcel,
  generateReplenishmentExcel,
  generateCompleteExcel
} from './utils/excelGenerator';

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

const LoginScreen = ({ onLogin, users, darkMode }: { onLogin: (u: User) => void, users: User[], darkMode: boolean }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            onLogin(user);
            toast.success(`Bienvenido, ${user.name}`);
        } else {
            setError('Credenciales inválidas');
            toast.error('Usuario o contraseña incorrectos');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 dark:bg-slate-950 transition-colors duration-300">
            <div className={`rounded-2xl p-8 w-full max-w-md shadow-2xl transition-colors duration-300 ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${darkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Package size={32} />
                    </div>
                    <h1 className="text-2xl font-bold">IPHONESHOP</h1>
                    <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sistema de Inventario de Tecnología</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Usuario</label>
                        <input 
                            type="text" 
                            className={`w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Contraseña</label>
                        <input 
                            type="password" 
                            className={`w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition">
                        Ingresar
                    </button>
                    <div className={`text-xs text-center mt-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Demo: usuario/clave o visitante/123
                    </div>
                </form>
            </div>
        </div>
    );
};

const Dashboard = ({ 
  products, 
  categories,
  onCategoryClick,
  darkMode
}: { 
  products: Product[], 
  categories: Category[],
  onCategoryClick: (catId: string) => void,
  darkMode: boolean
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
      <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Panel de Control</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Productos</div>
          <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.totalCount}</div>
        </div>
        <div className={`p-4 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Valor Inventario</div>
          <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>${stats.totalVal.toLocaleString()}</div>
        </div>
        <div className={`p-4 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-800 border-red-900' : 'bg-red-50 border-red-200'}`}>
          <div className="text-red-600 text-sm font-medium flex items-center gap-2">
            <AlertOctagon size={16} /> Críticos / Agotados
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.outOfStock + stats.lowStock}</div>
        </div>
        <div className={`p-4 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-800 border-amber-900' : 'bg-amber-50 border-amber-200'}`}>
          <div className="text-amber-600 text-sm font-medium flex items-center gap-2">
            <Calendar size={16} /> Vencidos / Por Vencer
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.expired + stats.expiringSoon}</div>
        </div>
      </div>

      <div className={`rounded-xl p-6 text-white shadow-lg transition-colors ${darkMode ? 'bg-blue-900' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-1">Reporte Integral</h3>
            <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-100'}`}>Descarga todos los datos en un solo archivo Excel</p>
          </div>
          <button 
            onClick={() => generateCompleteExcel(products, categories, [])}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 font-bold transition-colors shadow-lg ${darkMode ? 'bg-blue-800 hover:bg-blue-700' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
          >
            <FileSpreadsheet size={20} /> Descargar Completo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart / Categories Navigation */}
        <div className={`p-6 rounded-xl shadow-sm border lg:col-span-2 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Stock por Categoría (Click para filtrar)</h3>
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
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke={darkMode ? "#94a3b8" : "#64748b"} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={darkMode ? "#94a3b8" : "#64748b"} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#000', borderRadius: '8px' }} />
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
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${darkMode ? 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}`}
                >
                    {cat.name}
                </button>
            ))}
          </div>
        </div>

        {/* Active Alerts List */}
        <div className={`p-6 rounded-xl shadow-sm border flex flex-col h-full transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Alertas Activas</h3>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 max-h-[300px]">
            {alerts.length === 0 ? (
                <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No hay alertas activas.</p>
            ) : (
                alerts.map((item) => (
                <div key={item.product.id} className={`p-3 rounded-lg border flex justify-between items-start ${
                    item.level === AlertLevel.OUT_OF_STOCK ? 'bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-600' :
                    item.level === AlertLevel.EXPIRED ? 'bg-red-50 border-red-100 dark:bg-red-900/30 dark:border-red-800' :
                    item.level === AlertLevel.LOW_STOCK ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/30 dark:border-orange-800' :
                    'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/30 dark:border-yellow-800'
                }`}>
                    <div>
                    <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>{item.product.name}</div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.product.code}</div>
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
const UserManagement = ({ users, onAddUser, currentUser, darkMode }: { users: User[], onAddUser: (u: User) => void, currentUser: User, darkMode: boolean }) => {
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
            toast.success('Usuario creado exitosamente');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Gestión de Usuarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`md:col-span-1 p-6 rounded-xl shadow-sm border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h3 className="font-bold mb-4">Nuevo Usuario</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <input className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white`} placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                        <input className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white`} placeholder="Usuario" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                        <input className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white`} type="password" placeholder="Contraseña" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                        <select className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white`} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                            <option value="viewer">Vista (Solo lectura)</option>
                            <option value="admin">Administrador</option>
                        </select>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">Crear Usuario</button>
                    </form>
                </div>
                <div className={`md:col-span-2 rounded-xl shadow-sm border overflow-hidden transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <table className="w-full text-left text-sm">
                        <thead className={`${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}><tr><th className="p-4">Nombre</th><th className="p-4">Usuario</th><th className="p-4">Rol</th></tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <td className="p-4">{u.name}</td>
                                    <td className={`p-4 font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{u.username}</td>
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
const ProductModal = ({ isOpen, onClose, product, categories, isEditMode, onSave, userRole, darkMode }: any) => {
    const [formData, setFormData] = useState<Partial<Product>>({
        categoryId: categories[0]?.id,
        stock: 0,
        initialStock: 0,
        minStock: 5,
        status: ProductStatus.ACTIVE,
        name: '',
        description: '',
        unit: 'Unidad',
        price: 0,
        location: '',
        supplier: '',
        imageUrl: '',
        imagePublicId: '',
        imageFile: null as File | null,
        brand: '',
        model: '',
        warranty: '',
        serial: ''
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
                price: 0,
                location: '',
                supplier: '',
                imageUrl: '',
                imagePublicId: '',
                imageFile: null as File | null,
                brand: '',
                model: '',
                warranty: '',
                serial: ''
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
            <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {product ? (isEditMode ? 'Editar Producto' : 'Detalles del Producto') : 'Nuevo Producto'}
                    </h3>
                    <button onClick={onClose} className={`transition-colors text-2xl leading-none ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>&times;</button>
                </div>
                
                <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); onSave(formData as Product); }} className="p-6 overflow-y-auto space-y-5">
                    
                    {/* Primary Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Categoría</label>
                            <select 
                                disabled={readOnly}
                                className={`w-full border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border bg-white disabled:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                                value={formData.categoryId} 
                                onChange={e => handleCategoryChange(e.target.value)}
                            >
                                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Código</label>
                            <input 
                                disabled={readOnly} 
                                required 
                                type="text" 
                                className={`w-full border-slate-300 rounded-lg p-2.5 text-sm border disabled:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
                                value={formData.code || ''} 
                                onChange={e => handleChange('code', e.target.value)} 
                            />
                        </div>
                    </div>

                    {/* CAMPO DE SERIAL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Serial / IMEI</label>
                            <div className="relative">
                                <input 
                                    disabled={readOnly} 
                                    type="text" 
                                    className={`w-full border-slate-300 rounded-lg p-2.5 text-sm border disabled:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
                                    value={formData.serial || ''} 
                                    onChange={e => handleChange('serial', e.target.value)}
                                    placeholder="Escanea o escribe el serial"
                                />
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            toast.info('Presiona el botón 📷 Escanear en la barra superior');
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                                        title="Escanear serial"
                                    >
                                        📷
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            {/* Espacio vacío para mantener grid de 2 columnas */}
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nombre del Producto</label>
                        <input 
                            list="product-suggestions"
                            disabled={readOnly} 
                            required 
                            type="text" 
                            className={`w-full border-slate-300 rounded-lg p-2.5 text-sm border focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 font-semibold dark:bg-slate-700 dark:border-slate-600 dark:text-white ${darkMode ? 'text-white' : 'text-slate-800'}`}
                            value={formData.name || ''} 
                            onChange={e => handleChange('name', e.target.value)} 
                            placeholder="Ej. iPhone 15 Pro"
                        />
                        <datalist id="product-suggestions">
                            {suggestions.map((s: string, i: number) => <option key={i} value={s} />)}
                        </datalist>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Descripción / Detalles</label>
                        <textarea 
                            disabled={readOnly}
                            className={`w-full border-slate-300 rounded-lg p-2.5 text-sm border focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                            rows={2}
                            placeholder="Ej: 256GB Titanio Natural, Estado: Nuevo"
                            value={formData.description || ''}
                            onChange={e => handleChange('description', e.target.value)}
                        />
                    </div>

                    {/* IMAGE UPLOADER */}
                    <ImageUploader
                        currentImageUrl={formData.imageUrl}
                        onImageSelect={(file) => {
                            setFormData(prev => ({ 
                                ...prev, 
                                imageFile: file 
                            }));
                        }}
                        disabled={readOnly}
                        darkMode={darkMode}
                    />

                    {/* UBICACIÓN Y PROVEEDOR */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ubicación</label>
                            <input 
                                disabled={readOnly} 
                                type="text" 
                                className={`w-full border-slate-300 rounded-lg p-2.5 text-sm border focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
                                value={formData.location || ''} 
                                onChange={e => handleChange('location', e.target.value)} 
                                placeholder="Ej. Estantería A, Depósito..."
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Proveedor</label>
                            <input 
                                disabled={readOnly} 
                                type="text" 
                                className={`w-full border-slate-300 rounded-lg p-2.5 text-sm border focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
                                value={formData.supplier || ''} 
                                onChange={e => handleChange('supplier', e.target.value)} 
                                placeholder="Ej. Papelera S.A."
                            />
                        </div>
                    </div>

                    {/* Stock Section */}
                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}><Package size={16}/> Control de Inventario</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cant. Inicial</label>
                                <input disabled={readOnly} type="number" min="0" className={`w-full border rounded p-2 text-sm text-center font-medium dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
                                    value={formData.initialStock} onChange={e => handleChange('initialStock', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cant. Actual</label>
                                <input disabled={readOnly} type="number" min="0" className={`w-full border rounded p-2 text-sm text-center font-bold text-emerald-700 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-emerald-400`} 
                                    value={formData.stock} onChange={e => handleChange('stock', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Diferencia</label>
                                <div className={`w-full p-2 text-sm text-center font-bold border rounded ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-slate-100'}`}>
                                    {(formData.initialStock || 0) - (formData.stock || 0)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unidad</label>
                            <input disabled={readOnly} required type="text" className={`w-full border rounded p-2.5 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
                                value={formData.unit || ''} onChange={e => handleChange('unit', e.target.value)} />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Min Stock</label>
                            <input disabled={readOnly} type="number" className={`w-full border rounded p-2.5 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
                                value={formData.minStock || 0} onChange={e => handleChange('minStock', parseInt(e.target.value))} />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Precio Unit.</label>
                            <input disabled={readOnly} type="number" step="0.01" className={`w-full border rounded p-2.5 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
                                value={formData.price || 0} onChange={e => handleChange('price', parseFloat(e.target.value))} />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Vencimiento</label>
                        <input disabled={readOnly} type="date" className={`w-full border rounded p-2.5 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white`} 
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

// --- Scanner Component ---
const ScannerModal = ({ isOpen, onClose, onScan, darkMode }: { isOpen: boolean, onClose: () => void, onScan: (decodedText: string) => void, darkMode: boolean }) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        setError(null);
        setIsScanning(true);
        
        html5QrCode = new Html5Qrcode("reader");
        
        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };
        
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          (decodedText) => {
            console.log("Código detectado:", decodedText);
            onScan(decodedText);
            toast.success('Código detectado', { icon: '📷' });
            
            if(html5QrCode) {
                html5QrCode.stop().then(() => {
                    setIsScanning(false);
                    onClose(); 
                }).catch(err => console.error("Error al detener", err));
            }
          },
          (errorMessage) => {
            // Ignorar errores de escaneo continuo
          }
        );
        
        setIsScanning(true);
        
      } catch (err: any) {
        console.error("Error iniciando escáner", err);
        setIsScanning(false);
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara.');
          toast.error("Permiso de cámara denegado");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No se encontró ninguna cámara en este dispositivo.');
          toast.error("No se encontró cámara");
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('La cámara está siendo usada por otra aplicación.');
          toast.error("Cámara en uso");
        } else {
          setError('Error al acceder a la cámara. Intenta desde un dispositivo móvil.');
          toast.error("Error al acceder a la cámara");
        }
      }
    };

    if (isOpen) {
      setTimeout(startScanner, 100);
    } else {
      if (html5QrCode) {
        html5QrCode.stop().catch(err => console.log(err));
        setIsScanning(false);
      }
    }

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(err => console.log(err));
        setIsScanning(false);
      }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transition-colors ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
        <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-lg font-bold flex items-center gap-2`}>
                {isScanning && <div className="w-2 h-6 bg-emerald-500 rounded-full animate-pulse"></div>}
                Escáner de Productos
            </h3>
            <button onClick={onClose} className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                ✕
            </button>
        </div>

        <div className="p-6 bg-black relative flex items-center justify-center min-h-[300px]">
            {error ? (
              <div className="text-center text-white p-6">
                <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
                <p className="text-lg font-semibold mb-2">Error de Cámara</p>
                <p className="text-sm text-slate-300">{error}</p>
                <button 
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div id="reader" className="w-full max-w-[400px]"></div>
                {isScanning && (
                  <div className="absolute pointer-events-none border-4 border-emerald-500/50 w-64 h-64 rounded-lg border-dashed"></div>
                )}
              </>
            )}
        </div>

        {!error && (
          <div className={`p-6 text-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {isScanning ? 'Apunta el código de barras o QR a la cámara' : 'Iniciando cámara...'}
              </p>
              <p className="text-xs opacity-60">
                  Asegúrate de tener buena iluminación
              </p>
              <button 
                  onClick={onClose}
                  className={`mt-4 px-6 py-2 rounded-lg font-bold transition ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
              >
                  Cancelar
              </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- ProductViewModal Component ---
const ProductViewModal = ({
  isOpen,
  onClose,
  product,
  categories,
  transactions,
  darkMode,
  onEdit
}: {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  transactions: Transaction[];
  darkMode: boolean;
  onEdit: () => void;
}) => {
  if (!isOpen || !product) return null;

  const category = categories.find(c => c.id === product.categoryId);
  const alert = getAlertLevel(product);
  const difference = (product.initialStock || 0) - product.stock;

  const productTransactions = transactions
    .filter(tx => tx.productId === product.id)
    .slice(0, 10);

  const stockPercent = product.initialStock > 0
    ? Math.min(Math.round((product.stock / product.initialStock) * 100), 100)
    : 0;

  const alertBadge: Record<string, string> = {
    [AlertLevel.OUT_OF_STOCK]:  'bg-slate-800 text-white',
    [AlertLevel.EXPIRED]:       'bg-red-500 text-white',
    [AlertLevel.LOW_STOCK]:     'bg-orange-400 text-white',
    [AlertLevel.EXPIRING_SOON]: 'bg-yellow-400 text-slate-900',
    [AlertLevel.NONE]:          'bg-emerald-500 text-white',
  };

  const stockBarColor =
    stockPercent === 0   ? 'bg-slate-500' :
    stockPercent <= 30   ? 'bg-red-500'   :
    stockPercent <= 60   ? 'bg-amber-400' : 'bg-emerald-500';

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div className={`flex flex-col gap-0.5 p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>

        {/* HEADER */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${alertBadge[alert] ?? alertBadge[AlertLevel.NONE]}`}>
              {alert === AlertLevel.NONE ? 'OK' : alert}
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-bold truncate">{product.name}</h3>
              {(product.brand || product.model) && (
                <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {[product.brand, product.model].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition"
            >
              <Edit size={14} /> Editar
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition text-xl leading-none ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
            >
              x
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto flex-1">

          {/* BLOQUE 1: imagen + datos basicos */}
          <div className={`grid grid-cols-1 md:grid-cols-2 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>

            {/* Imagen */}
            <div className={`flex items-center justify-center p-6 border-b md:border-b-0 md:border-r ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="max-h-56 max-w-full object-contain rounded-xl shadow-md"
                />
              ) : (
                <div className={`flex flex-col items-center justify-center w-48 h-48 rounded-2xl border-2 border-dashed ${darkMode ? 'border-slate-600 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                  <Package size={48} className="mb-2 opacity-30" />
                  <span className="text-sm">Sin imagen</span>
                </div>
              )}
            </div>

            {/* Datos */}
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs font-mono px-2 py-1 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  {product.code}
                </span>
                {category && (
                  <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                    {category.name}
                  </span>
                )}
                {product.status && (
                  <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                    {product.status}
                  </span>
                )}
              </div>

              {product.description && (
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{product.description}</p>
              )}

              {/* Barra de stock */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Stock actual</span>
                  <span className="font-bold">{product.stock} / {product.initialStock} {product.unit}</span>
                </div>
                <div className={`w-full h-2.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className={`h-2.5 rounded-full transition-all ${stockBarColor}`} style={{ width: `${stockPercent}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>Min: {product.minStock}</span>
                  <span className={`font-semibold ${stockBarColor.replace('bg-', 'text-')}`}>{stockPercent}%</span>
                </div>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <div className={`text-xs mb-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Precio unitario</div>
                  <div className="font-bold text-emerald-500">${(product.price ?? 0).toLocaleString()}</div>
                </div>
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <div className={`text-xs mb-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Valor en stock</div>
                  <div className="font-bold">${((product.price ?? 0) * product.stock).toLocaleString()}</div>
                </div>
              </div>

              {difference !== 0 && (
                <div className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Diferencia vs inicial</span>
                  <span className={`font-bold ${difference > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {difference > 0 ? `-${difference}` : `+${Math.abs(difference)}`} {product.unit}
                  </span>
                </div>
              )}

              {product.expirationDate && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                  <Calendar size={14} />
                  Vencimiento: {new Date(product.expirationDate).toLocaleDateString('es-ES')}
                </div>
              )}
            </div>
          </div>

          {/* BLOQUE 2: ficha tecnica */}
          {(product.brand || product.model || product.warranty || product.specifications || product.location || product.supplier) && (
            <div className={`px-6 py-5 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Ficha Tecnica
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <InfoRow label="Marca"     value={product.brand} />
                <InfoRow label="Modelo"    value={product.model} />
                <InfoRow label="Garantia"  value={product.warranty} />
                <InfoRow label="Ubicacion" value={product.location} />
                <InfoRow label="Proveedor" value={product.supplier} />
                {product.specifications && (
                  <div className={`col-span-2 md:col-span-3 flex flex-col gap-0.5 p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Especificaciones</span>
                    <span className="text-sm font-medium whitespace-pre-wrap">{product.specifications}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BLOQUE 3: historial */}
          <div>
            <div className={`px-6 py-3 flex items-center gap-3 border-b ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <ClipboardList size={16} className="text-slate-400 shrink-0" />
              <h4 className={`font-semibold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                Historial de Salidas
              </h4>
              {productTransactions.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                  {productTransactions.length}
                </span>
              )}
            </div>

            {productTransactions.length === 0 ? (
              <div className={`px-6 py-10 text-center text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <Package size={36} className="mx-auto mb-2 opacity-25" />
                Sin movimientos registrados para este producto.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase tracking-wider ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-center">Cant.</th>
                      <th className="px-4 py-3 text-left">Motivo</th>
                      <th className="px-4 py-3 text-left">Destino</th>
                      <th className="px-4 py-3 text-left">Recibio</th>
                      <th className="px-4 py-3 text-left">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                    {productTransactions.map(tx => (
                      <tr key={tx.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <div>{new Date(tx.date).toLocaleDateString('es-ES')}</div>
                          <div className="text-xs opacity-60">
                            {new Date(tx.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-red-500">-{tx.quantity}</span>
                        </td>
                        <td className={`px-4 py-3 max-w-[160px] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          <span className="block truncate">{tx.reason || '-'}</span>
                        </td>
                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {tx.destination || '-'}
                        </td>
                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {tx.receiver || '-'}
                        </td>
                        <td className={`px-4 py-3 text-xs font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {tx.user || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className={`px-6 py-3 border-t shrink-0 flex justify-between items-center text-xs ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
          <span>ID: <span className="font-mono">{product.id}</span></span>
          {(product as any).created_at && (
            <span>Creado: {new Date((product as any).created_at).toLocaleDateString('es-ES')}</span>
          )}
        </div>

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
  onImport,
  initialCategoryFilter,
  currentUser,
  darkMode
}: { 
  products: Product[], 
  categories: Category[],
  onAddProduct: (p: Product) => void,
  onEditProduct: (p: Product) => void,
  onDeleteProduct: (id: string) => void,
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
  initialCategoryFilter: string | null,
  currentUser: User,
  darkMode: boolean
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const isSavingRef = useRef(false);

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
    setIsEditMode(true); 
    setModalOpen(true);
  };

  const handleSaveFromModal = async (productData: Product) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    const productId = selectedProduct?.id || `prod_${Date.now()}`;

    let imageUrl = productData.imageUrl;
    let imagePublicId = productData.imagePublicId;

    try {
        if (productData.imageFile) {
            toast.loading('Subiendo imagen...', { id: 'upload-image' });
            const result = await uploadProductImage(productData.imageFile, productId);
            if (result) {
                imageUrl = result.url;
                imagePublicId = result.publicId;
                if (selectedProduct?.imagePublicId && selectedProduct.imagePublicId !== imagePublicId) {
                    await deleteProductImage(selectedProduct.imagePublicId);
                }
                toast.dismiss('upload-image');
                toast.success('Imagen subida correctamente');
            } else {
                toast.dismiss('upload-image');
                toast.error('Error al subir la imagen');
            }
        }

        const { imageFile, ...finalProduct } = { ...productData, imageUrl, imagePublicId };

        if (selectedProduct && selectedProduct.id) {
            onEditProduct(finalProduct);
        } else {
            onAddProduct({ ...finalProduct, id: productId });
        }

        setModalOpen(false);
    } finally {
        isSavingRef.current = false;
    }
};

  const switchToEdit = () => {
      setIsEditMode(true);
  };

  const handleScanSuccess = (decodedCode: string) => {
    setSearchTerm(decodedCode);
    toast.success(`Buscando código: ${decodedCode}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Inventario General</h2>
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
            {/* Botón PDF */}
            <button 
                onClick={() => generateInventoryPDF(filteredProducts, categories)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md">
                <FileDown size={18} /> PDF
            </button>
            
            {/* Botón Excel */}
            <button 
                onClick={() => generateInventoryExcel(filteredProducts, categories)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md">
                <FileSpreadsheet size={18} /> Excel
            </button>

            {/* Botón Importar */}
            <div className="relative">
                <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={(e) => {
                        onImport(e);
                        e.target.value = ''; 
                    }}
                    className="hidden" 
                    id="importInput"
                />
                <label 
                    htmlFor="importInput"
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold shadow-md cursor-pointer border border-amber-400"
                >
                    📥 Importar Excel
                </label>
            </div>

            {/* Botón Escáner */}
            <button 
                onClick={() => setScannerOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md">
                📷 Escanear
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

      <div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Filters */}
        <div className={`p-4 border-b flex flex-col md:flex-row items-center gap-3 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <div className="relative flex-1 w-full">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
            <input 
                type="text" 
                placeholder="Buscar por nombre, código o descripción..." 
                className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className={`w-full md:w-64 py-2 px-3 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
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
            <thead className={`${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-50 text-slate-500'} font-semibold uppercase tracking-wider text-xs`}>
              <tr>
                <th className="px-6 py-4 w-20">Imagen</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4 text-center">Inicial</th>
                <th className="px-6 py-4 text-center">Actual</th>
                <th className="px-6 py-4 text-center">Dif.</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {filteredProducts.map(product => {
                const category = categories.find(c => c.id === product.categoryId);
                const alert = getAlertLevel(product);
                const difference = (product.initialStock || 0) - product.stock;
                
                return (
                  <tr key={product.id} className={`hover:${darkMode ? 'bg-slate-700' : 'bg-slate-50'} cursor-pointer group`} onClick={() => handleRowClick(product)}>
                    
                    {/* CELDA DE IMAGEN */}
                    <td className="px-6 py-4">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-14 h-14 object-cover rounded-lg shadow-sm border border-slate-200 dark:border-slate-600"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.img-fallback')) {
                              const fallback = document.createElement('div');
                              fallback.className = `img-fallback w-14 h-14 flex items-center justify-center rounded-lg border-2 border-dashed ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-slate-50'}`;
                              fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-30"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className={`w-14 h-14 flex items-center justify-center rounded-lg border-2 border-dashed ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-slate-50'}`}>
                          <Package size={20} className="opacity-30" />
                        </div>
                      )}
                    </td>
                    
                    {/* PRODUCTO */}
                    <td className="px-6 py-4">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{product.name}</div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{product.description}</div>
                        <div className={`text-xs font-mono mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{product.code}</div>
                    </td>
                    
                    {/* CATEGORÍA */}
                    <td className={`px-6 py-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className={`inline-block px-2 py-1 rounded text-xs ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{category?.name}</span>
                    </td>
                    
                    {/* UBICACIÓN */}
                    <td className={`px-6 py-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {product.location || '-'}
                    </td>
                    
                    {/* PROVEEDOR */}
                    <td className={`px-6 py-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {product.supplier || '-'}
                    </td>
                    
                    {/* INICIAL */}
                    <td className={`px-6 py-4 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{product.initialStock}</td>
                    
                    {/* ACTUAL */}
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded font-bold ${
                            product.stock === 0 ? 'text-slate-200 bg-slate-800' : 
                            product.stock <= product.minStock ? 'text-red-600 bg-red-50' : 'text-slate-700'
                        }`}>
                            {product.stock}
                        </span>
                    </td>
                    
                    {/* DIFERENCIA */}
                    <td className={`px-6 py-4 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="text-xs font-mono">{difference > 0 ? `-${difference}` : difference}</span>
                    </td>
                    
                    {/* ESTADO */}
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
                    
                    {/* ACCIONES */}
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleRowClick(product)} className={`p-2 rounded-full transition ${darkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                <Eye size={16} />
                            </button>
                            {currentUser.role === 'admin' && (
                                <button onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }} className={`p-2 rounded-full transition ${darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
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
        darkMode={darkMode}
      />
      
      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={handleScanSuccess}
        darkMode={darkMode}
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

// --- WriteOffModule Component ---
const WriteOffModule = ({
    products,
    transactions,
    onProcessBaja,
    darkMode
}: {
    products: Product[],
    transactions: Transaction[],
    onProcessBaja: (
        productId: string, 
        qty: number, 
        reason: string, 
        dest?: string, 
        receiver?: string,
        attachment?: File
    ) => void,
    darkMode: boolean
}) => {
    const [selectedId, setSelectedId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('Consumo');
    const [destination, setDestination] = useState('');
    const [receiver, setReceiver] = useState('');
    const [notes, setNotes] = useState('');
    
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedProduct = products.find(p => p.id === selectedId);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('El archivo es demasiado grande. Máximo 10MB');
                return;
            }
            
            const validTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            
            if (!validTypes.includes(file.type)) {
                toast.error('Solo se permiten archivos PDF o Word (.doc, .docx)');
                return;
            }
            
            setAttachment(file);
            toast.success(`Archivo seleccionado: ${file.name}`);
        }
    };

    const handleRemoveFile = () => {
        setAttachment(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedProduct && quantity > 0 && quantity <= selectedProduct.stock) {
            onProcessBaja(
                selectedProduct.id, 
                quantity, 
                `${reason}: ${notes}`, 
                destination, 
                receiver,
                attachment || undefined
            );
            
            setQuantity(1);
            setNotes('');
            setDestination('');
            setReceiver('');
            setAttachment(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } 
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileIcon = (type?: string) => {
        if (type?.includes('pdf')) return '📄';
        if (type?.includes('word') || type?.includes('document')) return '📝';
        return '📎';
    };

    return (
        <div className="space-y-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    <ArrowDownCircle className="text-red-500" />
                    Registrar Salida / Baja
                </h2>
                
                <div className={`p-8 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Seleccionar Producto
                            </label>
                            <select 
                                className={`w-full border-slate-200 rounded-lg p-3 text-slate-700 border focus:ring-2 focus:ring-red-100 outline-none bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                required
                            >
                                <option value="">-- Seleccione un producto --</option>
                                {products.filter(p => p.stock > 0).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.code} - {p.name} ({p.description})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedProduct && (
                            <div className={`p-4 rounded-lg border grid grid-cols-2 gap-4 text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <div>
                                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Stock Actual:</span> 
                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}> {selectedProduct.stock} {selectedProduct.unit}</span>
                                </div>
                                <div>
                                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Ubicación:</span> 
                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}> {selectedProduct.location || 'N/A'}</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Cantidad a Retirar
                                </label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={selectedProduct?.stock || 1} 
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className={`w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-red-100 transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Motivo de Salida
                                </label>
                                <select 
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className={`w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-red-100 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                                >
                                    <option value="Consumo">Consumo Interno / Entrega</option>
                                    <option value="Venta">Venta</option>
                                    <option value="Solicitud">Solicitud de Área</option>
                                    <option value="Deterioro">Deterioro / Daño</option>
                                    <option value="Vencimiento">Vencimiento</option>
                                    <option value="Obsolescencia">Obsolescencia Técnica</option>
                                    <option value="Pérdida">Pérdida / Robo</option>
                                </select>
                            </div>
                        </div>

                        <div className={`p-4 border rounded-lg space-y-4 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <h4 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <Building2 size={16}/> Datos de Entrega
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                        Oficina / Departamento Destino
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Contabilidad, RRHH..."
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className={`w-full border-slate-200 rounded-lg p-2.5 border outline-none focus:ring-2 focus:ring-blue-100 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                        Recibido por (Nombre)
                                    </label>
                                    <div className="relative">
                                        <UserCheck size={16} className={`absolute left-3 top-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}/>
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del responsable"
                                            value={receiver}
                                            onChange={(e) => setReceiver(e.target.value)}
                                            className={`w-full border-slate-200 rounded-lg pl-9 pr-3 py-2.5 border outline-none focus:ring-2 focus:ring-blue-100 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`p-5 border-2 border-dashed rounded-xl space-y-4 ${darkMode ? 'bg-slate-900 border-slate-600' : 'bg-blue-50 border-blue-300'}`}>
                            <h4 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                📎 Documento de Soporte (Opcional)
                            </h4>
                            
                            {!attachment ? (
                                <div className="space-y-3">
                                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Adjunta un documento PDF o Word que respalde esta operación
                                    </p>
                                    
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    
                                    <label 
                                        htmlFor="file-upload"
                                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg cursor-pointer transition-all font-medium text-sm border-2 ${
                                            darkMode 
                                                ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' 
                                                : 'bg-white border-blue-400 text-blue-700 hover:bg-blue-50'
                                        }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        Seleccionar Archivo
                                    </label>
                                    
                                    <p className={`text-xs text-center ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                        Formatos: PDF, DOC, DOCX • Tamaño máximo: 10MB
                                    </p>
                                </div>
                            ) : (
                                <div className={`flex items-center justify-between p-4 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-blue-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-3xl">
                                            {getFileIcon(attachment.type)}
                                        </div>
                                        <div>
                                            <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {attachment.name}
                                            </p>
                                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {formatFileSize(attachment.size)}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                                        title="Eliminar archivo"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Notas Adicionales
                            </label>
                            <textarea 
                                rows={2} 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className={`w-full border-slate-200 rounded-lg p-3 border outline-none focus:ring-2 focus:ring-red-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white`}
                                placeholder="Detalle opcional sobre la operación..."
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={!selectedId}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-100"
                        >
                            {attachment ? '📎 Procesar Salida con Documento' : 'Procesar Salida'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        <ClipboardList className="text-slate-500" />
                        Historial de Salidas
                    </h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => generateTransactionHistoryPDF(transactions)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md">
                            <FileDown size={18} /> PDF
                        </button>
                        <button 
                            onClick={() => generateTransactionHistoryExcel(transactions)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md">
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                    </div>
                </div>
                
                <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left text-sm">
                            <thead className={`sticky top-0 ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-50'}`}>
                                <tr>
                                    <th className={`px-6 py-4 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Fecha</th>
                                    <th className={`px-6 py-4 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Producto</th>
                                    <th className={`px-6 py-4 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Cant.</th>
                                    <th className={`px-6 py-4 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Motivo</th>
                                    <th className={`px-6 py-4 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Destino</th>
                                    <th className={`px-6 py-4 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Recibido Por</th>
                                    <th className={`px-6 py-4 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Documento</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            No hay movimientos registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map(tx => (
                                        <tr key={tx.id} className={`hover:${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                            <td className={`px-6 py-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {new Date(tx.date).toLocaleDateString()} 
                                                <span className="text-xs block">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className={`px-6 py-4 font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {tx.productName}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-red-600">-{tx.quantity}</td>
                                            <td className={`px-6 py-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {tx.reason}
                                            </td>
                                            <td className={`px-6 py-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {tx.destination || '-'}
                                            </td>
                                            <td className={`px-6 py-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {tx.receiver || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {tx.attachmentUrl ? (
                                                    <a 
                                                        href={tx.attachmentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                            darkMode 
                                                                ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' 
                                                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                        }`}
                                                        title={tx.attachmentName}
                                                    >
                                                        {getFileIcon(tx.attachmentType)}
                                                        <span className="max-w-[100px] truncate">
                                                            {tx.attachmentName}
                                                        </span>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                ) : (
                                                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        Sin adjunto
                                                    </span>
                                                )}
                                            </td>
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

// --- ReplenishmentModule ---
const ReplenishmentModule = ({ products, darkMode }: { products: Product[], darkMode: boolean }) => {
    const neededProducts = products.filter(p => p.stock <= p.minStock);

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    <ShoppingCart className="text-blue-600" />
                    Pedidos y Reabastecimiento
                </h2>
                <div className="flex gap-2 flex-wrap">
                    <button 
                        onClick={() => generateReplenishmentPDF(products)}
                        disabled={neededProducts.length === 0}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileDown size={18} /> PDF
                    </button>
                    <button 
                        onClick={() => generateReplenishmentExcel(products)}
                        disabled={neededProducts.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileSpreadsheet size={18} /> Excel
                    </button>
                </div>
             </div>

             <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`p-4 text-sm ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                    Mostrando productos con stock igual o inferior al mínimo permitido. Se sugiere reponer inventario.
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={darkMode ? 'bg-slate-700' : 'bg-slate-50'}>
                            <tr>
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4 text-center">Stock Actual</th>
                                <th className="px-6 py-4 text-center">Stock Mínimo</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Sugerido (Compra)</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {neededProducts.length === 0 ? (
                                <tr><td colSpan={5} className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Todo el inventario está en niveles óptimos.</td></tr>
                            ) : (
                                neededProducts.map(p => {
                                    const suggested = (p.minStock * 2) - p.stock;
                                    return (
                                        <tr key={p.id} className={`hover:${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                            <td className="px-6 py-4">
                                                <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                                                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-bold ${p.stock === 0 ? 'text-slate-800' : 'text-red-600'}`}>
                                                    {p.stock}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.minStock}</td>
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

// CategoryManager
const CategoryManager = ({
    categories,
    onAddCategory,
    darkMode
}: {
    categories: Category[],
    onAddCategory: (name: string, desc: string) => void,
    darkMode: boolean
}) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name) {
            onAddCategory(name, desc);
            setName('');
            setDesc('');
            toast.success('Categoría creada');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <div className={`p-6 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h3 className="font-bold mb-4">Nueva Categoría</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nombre</label>
                            <input required value={name} onChange={(e) => setName(e.target.value)} className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white`} />
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Descripción</label>
                            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white`} rows={3} />
                        </div>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">Crear Categoría</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2">
                 <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <table className="w-full text-left text-sm">
                        <thead className={darkMode ? 'bg-slate-700' : 'bg-slate-50'}>
                            <tr>
                                <th className="px-6 py-4 font-medium text-slate-500">Nombre</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Descripción</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {categories.map(cat => (
                                <tr key={cat.id}>
                                    <td className="px-6 py-4 font-medium">{cat.name}</td>
                                    <td className={`px-6 py-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{cat.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

// --- Main App with Supabase Integration ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'bajas' | 'replenishment' | 'categories' | 'users'>('dashboard');
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // --- Dark Mode Effect ---
  useEffect(() => {
    if (darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Audit Log Helper ---
  const logAudit = async (action: string, details: any, currentUser: User | null) => {
    if (!currentUser) return;
    try {
      await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        username: currentUser.name,
        action: action,
        target_table: 'products', 
        target_id: details.id,
        details: details
      });
    } catch (error) {
      console.error('Error guardando auditoría:', error);
    }
  };

  // ============================================================
  // 1️⃣ REFRESH PRODUCTS - Mejorado con logging
  // ============================================================
  const refreshProducts = async () => {
      console.log('🔄 Refrescando productos desde Supabase...');
      try {
          const { data, error } = await supabase
              .from('products')
              .select('*')
              .order('created_at', { ascending: false });
          
          if (error) {
              console.error('❌ Error refrescando productos:', error);
              toast.error('Error al actualizar productos');
              return;
          }
          
          if (data) {
              console.log(`✅ ${data.length} productos cargados`);
              console.log('🖼️ Productos con imagen:', data.filter(p => p.imageUrl).length);
              setProducts(data);
          }
      } catch (err) {
          console.error('💥 Error crítico:', err);
          toast.error('Error de conexión');
      }
  };

  // ============================================================
  // 2️⃣ LOAD DATA - Mejorado con logging detallado
  // ============================================================
  const loadData = async () => {
      console.log('📥 Cargando datos desde Supabase...');
      setLoading(true);
      
      try {
          const [productsRes, categoriesRes, usersRes, txRes] = await Promise.all([
              supabase.from('products').select('*').order('created_at', { ascending: false }),
              supabase.from('categories').select('*'),
              supabase.from('users').select('*'),
              supabase.from('transactions').select('*').order('date', { ascending: false })
          ]);
          
          if (productsRes.error) {
              console.error('❌ Error productos:', productsRes.error);
              toast.error('Error cargando productos');
          } else {
              console.log(`✅ ${productsRes.data?.length || 0} productos cargados`);
              console.log('🖼️ Con imagen:', productsRes.data?.filter(p => p.imageUrl).length || 0);
              setProducts(productsRes.data || []);
          }

          if (categoriesRes.error) {
              console.error('❌ Error categorías:', categoriesRes.error);
              toast.error('Error cargando categorías');
          } else {
              setCategories(categoriesRes.data || []);
          }

          if (usersRes.error) {
              console.error('❌ Error usuarios:', usersRes.error);
              setUsers(INITIAL_USERS); 
          } else {
              setUsers(usersRes.data || []);
          }

          if (txRes.error) {
              console.error('❌ Error transacciones:', txRes.error);
          } else {
              setTransactions(txRes.data || []);
          }

          toast.success('Datos cargados correctamente');
          
      } catch (err) {
          console.error('💥 Error general cargando datos:', err);
          toast.error('Error de conexión con la base de datos');
      } finally {
          setLoading(false);
      }
  };

  // --- Import Handler ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.loading('Procesando archivo...', { id: 'import-toast' });

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; 
        const sheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error("El archivo está vacío o no tiene formato válido");
        }

        let successCount = 0;
        let errorCount = 0;

        for (const row of jsonData as any) {
            if (row.code && row.name && row.categoryId) {
                const newProd: Product = {
                    id: `prod_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    code: row.code,
                    name: row.name,
                    description: row.description || '',
                    categoryId: row.categoryId, 
                    stock: parseInt(row.stock) || 0,
                    initialStock: parseInt(row.stock) || 0,
                    minStock: parseInt(row.minStock) || 10,
                    unit: row.unit || 'Unidad',
                    price: parseFloat(row.price) || 0,
                    status: ProductStatus.ACTIVE,
                    expirationDate: row.expirationDate || undefined,
                    location: row.location || 'Sin Ubicación',
                    supplier: row.supplier || 'Sin Proveedor'
                };

                const { error } = await supabase.from('products').insert(newProd);
                if (!error) {
                    successCount++;
                    logAudit('IMPORTED', { id: newProd.id, name: newProd.name }, user);
                } else {
                    errorCount++;
                    console.error('Error importando:', row, error);
                }
            }
        }

        await loadData();
        toast.dismiss('import-toast');
        toast.success(`Importación finalizada: ${successCount} productos cargados. ${errorCount} errores.`);

    } catch (error) {
        console.error(error);
        toast.dismiss('import-toast');
        toast.error('Error al leer el archivo. Verifica el formato.');
    }
  };

  const syncInitialData = async () => {
    console.log('🔄 Sincronizando datos iniciales...');
    setSyncing(true);
    
    try {
      for (const cat of INITIAL_CATEGORIES) {
        const { error } = await supabase
          .from('categories')
          .upsert(cat, { onConflict: 'id' });
        if (error) console.error('Error sync cat:', error);
      }

      for (const prod of INITIAL_PRODUCTS) {
        const { error } = await supabase
          .from('products')
          .upsert(prod, { onConflict: 'id' });
        if (error) console.error('Error sync prod:', error);
      }

      toast.success('Sincronización completada con éxito', { icon: '🔄' });
      await loadData();
      
    } catch (err) {
      console.error('Error en sincronización:', err);
      toast.error('Hubo un error durante la sincronización');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Handlers (Local State + Supabase + Audit) ---

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => {
      setUser(null);
      toast('Sesión cerrada');
  };

  // ============================================================
  // 3️⃣ ADD PRODUCT - Con refresh inmediato
  // ============================================================
  const addProduct = async (product: Product) => {
      const { imageFile, ...productForDB } = product;

      console.log('📦 Guardando producto:', {
          id: productForDB.id,
          name: productForDB.name,
          hasImage: !!productForDB.imageUrl,
          imageUrl: productForDB.imageUrl
      });

      const { error, data } = await supabase
          .from('products')
          .insert(productForDB)
          .select()
          .single();

      if (error) {
          console.error('❌ Error Supabase:', error);
          toast.error('Error al guardar en base de datos');
          if (productForDB.imagePublicId) {
              await deleteProductImage(productForDB.imagePublicId);
          }
      } else {
          console.log('✅ Producto guardado en DB:', data);
          toast.success('Producto agregado');
          logAudit('CREATED', { id: data.id, name: data.name, hasImage: !!data.imageUrl }, user);
          
          // ✅ CRÍTICO: Refrescar inmediatamente
          await refreshProducts();
      }
  };

  // ============================================================
  // 4️⃣ EDIT PRODUCT - Con refresh inmediato
  // ============================================================
  const editProduct = async (updatedProduct: Product) => {
      const oldProduct = products.find(p => p.id === updatedProduct.id);
      const { imageFile, ...productForDB } = updatedProduct;
      const { id, created_at, ...fieldsToUpdate } = productForDB as any;

      console.log('✏️ Actualizando producto:', {
          id: updatedProduct.id,
          name: updatedProduct.name,
          imageUrl: updatedProduct.imageUrl
      });

      const { data, error } = await supabase
          .from('products')
          .update(fieldsToUpdate)
          .eq('id', updatedProduct.id)
          .select()
          .single();

      if (error) {
          console.error('❌ Error Supabase:', error);
          toast.error('Error al actualizar producto');
          if (oldProduct) {
              setProducts(prev => prev.map(p => p.id === updatedProduct.id ? oldProduct : p));
          }
      } else {
          console.log('✅ Producto actualizado en DB:', data);
          toast.success('Producto actualizado');
          logAudit('UPDATED', { id: data.id, name: data.name, imageUpdated: !!data.imageUrl }, user);
          
          // ✅ CRÍTICO: Refrescar inmediatamente
          await refreshProducts();
      }
  };

  // ✅ deleteProduct - con rollback si falla
  const deleteProduct = async (id: string) => {
    const productToDelete = products.find(p => p.id === id);
    if (!confirm('¿Está seguro de eliminar este producto? También se eliminarán sus transacciones.')) return;

    setProducts(prev => prev.filter(p => p.id !== id));

    await supabase
        .from('transactions')
        .delete()
        .eq('productId', id);

    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('❌ Error eliminando producto:', error);
        toast.error('Error al eliminar producto');
        if (productToDelete) {
            setProducts(prev => [...prev, productToDelete]);
        }
    } else {
        setTransactions(prev => prev.filter(tx => tx.productId !== id));
        toast.success('Producto eliminado');
        logAudit('DELETED', { id, name: productToDelete?.name }, user);
    }
  };

  // --- processBaja ---
  const processBaja = async (
    productId: string, 
    qty: number, 
    reason: string, 
    destination?: string, 
    receiver?: string,
    attachment?: File
  ) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (qty > product.stock) {
        toast.error(`Stock insuficiente. Disponible: ${product.stock}`, { icon: '📉' });
        return;
    }

    toast.loading('Procesando salida...', { id: 'process-baja' });

    try {
        const newStock = product.stock - qty;
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
        await supabase.from('products').update({ stock: newStock }).eq('id', productId);

        let attachmentUrl = '';
        let attachmentName = '';
        let attachmentType = '';
        let attachmentSize = 0;

        if (attachment && supabase.storage) {
            const fileExt = attachment.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `transaction-attachments/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, attachment);

            if (uploadError) {
                console.error('Error subiendo archivo:', uploadError);
                toast.error('Error al subir el documento adjunto');
            } else {
                const { data: urlData } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);

                attachmentUrl = urlData.publicUrl;
                attachmentName = attachment.name;
                attachmentType = attachment.type;
                attachmentSize = attachment.size;
                
                toast.success('Documento adjunto subido correctamente', { icon: '📎' });
            }
        }

        const newTx: Transaction = {
            id: `tx_${Date.now()}`,
            productId,
            productName: product.name,
            type: TransactionType.OUT,
            quantity: qty,
            date: new Date().toISOString(),
            reason,
            user: user?.username || 'Unknown',
            destination,
            receiver,
            attachmentName,
            attachmentUrl,
            attachmentType,
            attachmentSize
        };
        
        setTransactions(prev => [newTx, ...prev]);
        
        const { error: txError } = await supabase.from('transactions').insert(newTx);
        if (txError) {
            console.warn('Transacción no guardada:', txError);
        }
        
        toast.dismiss('process-baja');
        toast.success(`Salida registrada: -${qty} ${product.unit}`, {
            icon: '📦',
            duration: 5000,
        });

        logAudit('STOCK_OUT', { 
            id: product.id, 
            name: product.name, 
            quantity: qty, 
            new_stock: newStock,
            reason: reason,
            hasAttachment: !!attachment
        }, user);

    } catch (error) {
        toast.dismiss('process-baja');
        console.error('Error procesando baja:', error);
        toast.error('Error al procesar la salida');
    }
  };

  const addCategory = async (name: string, description: string) => {
    const newCat: Category = { id: `cat_${Date.now()}`, name, description };
    setCategories(prev => [...prev, newCat]);
    const { error } = await supabase.from('categories').insert(newCat);
    if (error) {
        console.error('Error creando categoría:', error);
        toast.error('Error al crear categoría');
    }
  };

  const addUser = (newUser: User) => {
      setUsers(prev => [...prev, newUser]);
      toast.success('Usuario añadido localmente');
      console.log('Usuario añadido localmente:', newUser);
  };

  const navigateToCategory = (catId: string) => {
      setActiveTab('inventory');
  };

  if (!user) {
      return <LoginScreen onLogin={handleLogin} users={users} darkMode={darkMode} />;
  }

  if (loading) {
      return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-900'}`}>
            <div className="text-center">
                <RefreshCw className="animate-spin mx-auto mb-4 text-emerald-600" size={48} />
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-white'}`}>Cargando datos de Supabase...</p>
            </div>
        </div>
      );
  }

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          className: darkMode ? 'bg-slate-800 text-white border border-slate-700' : '',
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
        }} 
      />

      <aside className={`w-64 flex flex-col fixed h-full shadow-xl z-20 transition-colors duration-300 border-r ${darkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-900 text-slate-300'}`}>
        <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-800'}`}>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <Package className="text-emerald-500" />
            IPHONESHOP
          </h1>
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>

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

        <div className={`p-4 border-t space-y-2 ${darkMode ? 'border-slate-800' : 'border-slate-800'}`}>
            {user.role === 'admin' && (
                 <button 
                    onClick={syncInitialData} 
                    disabled={syncing}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {syncing ? <RefreshCw size={16} className="animate-spin"/> : <RefreshCw size={16} />}
                    {syncing ? 'Sincronizando...' : 'Sincronizar DB'}
                </button>
            )}
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </aside>

      <main className={`ml-64 flex-1 p-8 overflow-y-auto min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        {activeTab === 'dashboard' && <Dashboard products={products} categories={categories} onCategoryClick={navigateToCategory} darkMode={darkMode} />}
        {activeTab === 'inventory' && (
            <InventoryList 
                products={products} 
                categories={categories} 
                onAddProduct={addProduct}
                onEditProduct={editProduct}
                onDeleteProduct={deleteProduct}
                onImport={handleImport}
                initialCategoryFilter={null}
                currentUser={user}
                darkMode={darkMode}
            />
        )}
        {activeTab === 'bajas' && user.role === 'admin' && <WriteOffModule products={products} transactions={transactions} onProcessBaja={processBaja} darkMode={darkMode} />}
        {activeTab === 'replenishment' && user.role === 'admin' && <ReplenishmentModule products={products} darkMode={darkMode} />}
        {activeTab === 'categories' && user.role === 'admin' && <CategoryManager categories={categories} onAddCategory={addCategory} darkMode={darkMode} />}
        {activeTab === 'users' && user.role === 'admin' && <UserManagement users={users} onAddUser={addUser} currentUser={user} darkMode={darkMode} />}
        
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