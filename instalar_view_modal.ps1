# ============================================================
# IPHONESHOP - Script de instalacion de ProductViewModal
# Ejecutar desde: D:\MIS APP\corpinventario
# Uso: .\instalar_view_modal.ps1
# ============================================================

$rootPath = $PSScriptRoot
if (-not $rootPath) { $rootPath = Get-Location }

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IPHONESHOP - Instalando ProductViewModal  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Crear ProductViewModal.tsx ──────────────────────────
$modalPath = Join-Path $rootPath "ProductViewModal.tsx"

Write-Host "[ 1/3 ] Creando ProductViewModal.tsx..." -ForegroundColor Yellow

$modalContent = @'
// ============================================================
// COMPONENTE: ProductViewModal - IPHONESHOP
// Pegar en App.tsx ANTES del componente InventoryList
// ============================================================

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
'@

Set-Content -Path $modalPath -Value $modalContent -Encoding UTF8
Write-Host "   OK -> ProductViewModal.tsx creado" -ForegroundColor Green

# ── 2. Crear INSTRUCCIONES_APP.md ─────────────────────────
$instrPath = Join-Path $rootPath "INSTRUCCIONES_APP.md"

Write-Host "[ 2/3 ] Creando INSTRUCCIONES_APP.md..." -ForegroundColor Yellow

$instrContent = @'
# Instrucciones para integrar ProductViewModal en App.tsx

## PASO 1 - Pegar el componente
Abre `ProductViewModal.tsx` y copia TODO su contenido.
Pegalo en `App.tsx` justo ANTES de la linea:

```
const InventoryList = ({
```

---

## PASO 2 - Agregar `transactions` a los props de InventoryList

### ANTES:
```tsx
const InventoryList = ({ 
  products, 
  categories,
  onAddProduct,
  ...
}: { 
  products: Product[], 
  categories: Category[],
  onAddProduct: (p: Product) => void,
  ...
```

### DESPUES:
```tsx
const InventoryList = ({ 
  products, 
  categories,
  transactions,
  onAddProduct,
  ...
}: { 
  products: Product[], 
  categories: Category[],
  transactions: Transaction[],
  onAddProduct: (p: Product) => void,
  ...
```

---

## PASO 3 - Agregar estados del modal de vista

Despues de:
```tsx
const [isScannerOpen, setScannerOpen] = useState(false);
```

Agregar:
```tsx
const [viewModalOpen, setViewModalOpen] = useState(false);
const [viewProduct, setViewProduct] = useState<Product | null>(null);
```

---

## PASO 4 - Cambiar handleRowClick

### ANTES:
```tsx
const handleRowClick = (product: Product) => {
  setSelectedProduct(product);
  setIsEditMode(true); 
  setModalOpen(true);
};
```

### DESPUES:
```tsx
const handleRowClick = (product: Product) => {
  setViewProduct(product);
  setViewModalOpen(true);
};

const handleOpenEdit = (product: Product) => {
  setSelectedProduct(product);
  setIsEditMode(true);
  setModalOpen(true);
};
```

---

## PASO 5 - Actualizar el boton ojo en la tabla

### ANTES:
```tsx
<button onClick={() => handleRowClick(product)} ...>
  <Eye size={16} />
</button>
```

### DESPUES:
```tsx
<button
  onClick={(e) => { e.stopPropagation(); setViewProduct(product); setViewModalOpen(true); }}
  className={`p-2 rounded-full transition ${darkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
  title="Ver producto"
>
  <Eye size={16} />
</button>
```

---

## PASO 6 - Agregar ProductViewModal al return de InventoryList

Justo despues de `</ScannerModal>` agregar:

```tsx
<ProductViewModal
  isOpen={viewModalOpen}
  onClose={() => setViewModalOpen(false)}
  product={viewProduct}
  categories={categories}
  transactions={transactions}
  darkMode={darkMode}
  onEdit={() => {
    setViewModalOpen(false);
    if (viewProduct) handleOpenEdit(viewProduct);
  }}
/>
```

---

## PASO 7 - Pasar transactions donde se usa InventoryList

En el return del App, buscar `<InventoryList` y agregar el prop:

```tsx
<InventoryList 
  products={products} 
  categories={categories}
  transactions={transactions}   // <- AGREGAR ESTA LINEA
  onAddProduct={addProduct}
  onEditProduct={editProduct}
  onDeleteProduct={deleteProduct}
  onImport={handleImport}
  initialCategoryFilter={null}
  currentUser={user}
  darkMode={darkMode}
/>
```
'@

Set-Content -Path $instrPath -Value $instrContent -Encoding UTF8
Write-Host "   OK -> INSTRUCCIONES_APP.md creado" -ForegroundColor Green

# ── 3. Git add + commit ────────────────────────────────────
Write-Host "[ 3/3 ] Realizando commit en git..." -ForegroundColor Yellow

Set-Location $rootPath
git add ProductViewModal.tsx INSTRUCCIONES_APP.md
git commit -m "feat: agregar ProductViewModal con imagen, ficha tecnica e historial de movimientos"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LISTO! Archivos creados y commit hecho   " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Archivos creados:" -ForegroundColor White
Write-Host "   -> ProductViewModal.tsx" -ForegroundColor White
Write-Host "   -> INSTRUCCIONES_APP.md" -ForegroundColor White
Write-Host ""
Write-Host "  Siguiente paso:" -ForegroundColor Yellow
Write-Host "   Sigue los pasos en INSTRUCCIONES_APP.md" -ForegroundColor Yellow
Write-Host "   para integrar el modal en App.tsx" -ForegroundColor Yellow
Write-Host ""
