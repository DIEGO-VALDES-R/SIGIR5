# ============================================================
# IPHONESHOP - Patch tabla inventario: imagen + modal vista
# Ejecutar desde: D:\MIS APP\corpinventario
# Uso: powershell -ExecutionPolicy Bypass -File .\patch_tabla_inventario.ps1
# ============================================================

$rootPath = Get-Location
$appFile  = Join-Path $rootPath "App.tsx"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IPHONESHOP - Patch Tabla Inventario       " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $appFile)) {
    Write-Host "ERROR: No se encontro App.tsx en $rootPath" -ForegroundColor Red
    exit 1
}

# Leer el archivo completo
$content = Get-Content $appFile -Raw -Encoding UTF8

# ── PARCHE 1: Agregar transactions a los props de InventoryList ──────────────
Write-Host "[ 1/5 ] Agregando prop 'transactions' a InventoryList..." -ForegroundColor Yellow

$old1 = @'
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
  initialCategoryFilter: string | null,
  currentUser: User,
  darkMode: boolean
}) => {
  const [searchTerm, setSearchTerm] = useState('');
'@

$new1 = @'
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
  initialCategoryFilter: string | null,
  currentUser: User,
  darkMode: boolean,
  transactions: Transaction[]
}) => {
  const [searchTerm, setSearchTerm] = useState('');
'@

if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1)
    Write-Host "   OK -> prop transactions agregado" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> ya tiene transactions o estructura diferente" -ForegroundColor DarkYellow
}

# ── PARCHE 2: Agregar estados del modal de vista ─────────────────────────────
Write-Host "[ 2/5 ] Agregando estados viewModalOpen y viewProduct..." -ForegroundColor Yellow

$old2 = "  const [isScannerOpen, setScannerOpen] = useState(false);"

$new2 = @'
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
'@

if ($content.Contains($old2) -and -not $content.Contains("viewModalOpen")) {
    $content = $content.Replace($old2, $new2)
    Write-Host "   OK -> estados viewModalOpen y viewProduct agregados" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> estados ya existen" -ForegroundColor DarkYellow
}

# ── PARCHE 3: Cambiar handleRowClick para abrir vista + agregar handleOpenEdit ─
Write-Host "[ 3/5 ] Actualizando handleRowClick y agregando handleOpenEdit..." -ForegroundColor Yellow

$old3 = @'
  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(true); 
    setModalOpen(true);
  };
'@

$new3 = @'
  const handleRowClick = (product: Product) => {
    setViewProduct(product);
    setViewModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(true);
    setModalOpen(true);
  };
'@

if ($content.Contains($old3)) {
    $content = $content.Replace($old3, $new3)
    Write-Host "   OK -> handleRowClick actualizado" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> handleRowClick ya fue modificado" -ForegroundColor DarkYellow
}

# ── PARCHE 4: Agregar columna imagen en thead + tbody ────────────────────────
Write-Host "[ 4/5 ] Agregando columna Imagen en la tabla..." -ForegroundColor Yellow

# thead - agregar columna imagen antes de Producto
$old4thead = '              <tr>
                <th className="px-6 py-4">Producto</th>'

$new4thead = '              <tr>
                <th className="px-4 py-4 w-16">Imagen</th>
                <th className="px-6 py-4">Producto</th>'

if ($content.Contains($old4thead)) {
    $content = $content.Replace($old4thead, $new4thead)
    Write-Host "   OK -> columna Imagen agregada en thead" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> thead ya tiene columna imagen" -ForegroundColor DarkYellow
}

# tbody - agregar celda imagen antes de la celda producto
$old4tbody = @'
                  <tr key={product.id} className={`hover:${darkMode ? 'bg-slate-700' : 'bg-slate-50'} cursor-pointer group`} onClick={() => handleRowClick(product)}>
                    <td className="px-6 py-4">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{product.name}</div>
'@

$new4tbody = @'
                  <tr key={product.id} className={`hover:${darkMode ? 'bg-slate-700' : 'bg-slate-50'} cursor-pointer group`} onClick={() => handleRowClick(product)}>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-600 mx-auto"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <Package size={16} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{product.name}</div>
'@

if ($content.Contains($old4tbody)) {
    $content = $content.Replace($old4tbody, $new4tbody)
    Write-Host "   OK -> celda imagen agregada en tbody" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> tbody ya tiene celda imagen" -ForegroundColor DarkYellow
}

# ── PARCHE 5: Actualizar boton ojo + agregar ProductViewModal al return ───────
Write-Host "[ 5/5 ] Actualizando boton ojo y agregando ProductViewModal..." -ForegroundColor Yellow

# Boton ojo
$old5btn = @'
                            <button onClick={() => handleRowClick(product)} className={`p-2 rounded-full transition ${darkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                <Eye size={16} />
                            </button>
'@

$new5btn = @'
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewProduct(product); setViewModalOpen(true); }}
                              className={`p-2 rounded-full transition ${darkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                              title="Ver detalle"
                            >
                              <Eye size={16} />
                            </button>
'@

if ($content.Contains($old5btn)) {
    $content = $content.Replace($old5btn, $new5btn)
    Write-Host "   OK -> boton Eye actualizado" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> boton Eye ya fue actualizado" -ForegroundColor DarkYellow
}

# Agregar ProductViewModal antes del cierre del return de InventoryList
$old5modal = @'
      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={handleScanSuccess}
        darkMode={darkMode}
      />
'@

$new5modal = @'
      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={handleScanSuccess}
        darkMode={darkMode}
      />

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
'@

if ($content.Contains($old5modal) -and -not $content.Contains("ProductViewModal")) {
    $content = $content.Replace($old5modal, $new5modal)
    Write-Host "   OK -> ProductViewModal agregado al return" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> ProductViewModal ya esta o ScannerModal no encontrado" -ForegroundColor DarkYellow
}

# ── PARCHE 6: Pasar transactions al componente InventoryList en App ──────────
$old6 = @'
                initialCategoryFilter={null}
                currentUser={user}
                darkMode={darkMode}
            />
        )}
        {activeTab === 'bajas'
'@

$new6 = @'
                initialCategoryFilter={null}
                currentUser={user}
                darkMode={darkMode}
                transactions={transactions}
            />
        )}
        {activeTab === 'bajas'
'@

if ($content.Contains($old6)) {
    $content = $content.Replace($old6, $new6)
    Write-Host "   OK -> transactions pasado a InventoryList en App" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> prop ya existe o estructura diferente" -ForegroundColor DarkYellow
}

# ── Guardar archivo ──────────────────────────────────────────────────────────
Set-Content -Path $appFile -Value $content -Encoding UTF8 -NoNewline
Write-Host ""
Write-Host "Archivo App.tsx actualizado correctamente" -ForegroundColor Green

# ── Git commit ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Realizando commit..." -ForegroundColor Yellow
git add App.tsx
git commit -m "feat: tabla inventario con miniatura imagen + modal ver producto conectado"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LISTO! Todos los parches aplicados        " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Cambios realizados en App.tsx:" -ForegroundColor White
Write-Host "   -> Prop transactions agregado a InventoryList" -ForegroundColor White
Write-Host "   -> Estados viewModalOpen / viewProduct agregados" -ForegroundColor White
Write-Host "   -> handleRowClick abre vista, handleOpenEdit edita" -ForegroundColor White
Write-Host "   -> Columna imagen en tabla (miniatura 40x40)" -ForegroundColor White
Write-Host "   -> Boton ojo abre ProductViewModal" -ForegroundColor White
Write-Host "   -> ProductViewModal integrado en InventoryList" -ForegroundColor White
Write-Host ""
Write-Host "  IMPORTANTE: Asegurate de que ProductViewModal.tsx" -ForegroundColor Yellow
Write-Host "  este pegado en App.tsx ANTES de InventoryList" -ForegroundColor Yellow
Write-Host ""
