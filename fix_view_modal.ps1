# ============================================================
# IPHONESHOP - Fix final: conectar ProductViewModal
# Ejecutar desde: D:\MIS APP\corpinventario
# Uso: powershell -ExecutionPolicy Bypass -File .\fix_view_modal.ps1
# ============================================================

$rootPath = Get-Location
$appFile  = Join-Path $rootPath "App.tsx"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IPHONESHOP - Fix conexion ProductViewModal " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $appFile)) {
    Write-Host "ERROR: No se encontro App.tsx en $rootPath" -ForegroundColor Red
    exit 1
}

$content = Get-Content $appFile -Raw -Encoding UTF8

# ── FIX 1: Agregar transactions a los props de InventoryList ─────────────────
Write-Host "[ 1/4 ] Agregando prop 'transactions' a InventoryList..." -ForegroundColor Yellow

$old1 = 'const InventoryList = ({ 
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
})'

$new1 = 'const InventoryList = ({ 
  products, 
  categories,
  transactions,
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
  transactions: Transaction[],
  onAddProduct: (p: Product) => void,
  onEditProduct: (p: Product) => void,
  onDeleteProduct: (id: string) => void,
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
  initialCategoryFilter: string | null,
  currentUser: User,
  darkMode: boolean
})'

if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1)
    Write-Host "   OK -> prop transactions agregado a InventoryList" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> ya tiene transactions o no encontro el bloque exacto" -ForegroundColor DarkYellow
}

# ── FIX 2: Cambiar handleRowClick para abrir vista + agregar handleOpenEdit ───
Write-Host "[ 2/4 ] Corrigiendo handleRowClick..." -ForegroundColor Yellow

$old2 = '  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(true); 
    setModalOpen(true);
  };

  const handleSaveFromModal'

$new2 = '  const handleRowClick = (product: Product) => {
    setViewProduct(product);
    setViewModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(true);
    setModalOpen(true);
  };

  const handleSaveFromModal'

if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2)
    Write-Host "   OK -> handleRowClick corregido, handleOpenEdit agregado" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> handleRowClick ya fue modificado anteriormente" -ForegroundColor DarkYellow
}

# ── FIX 3: Actualizar boton Eye para abrir vista en lugar de editar ───────────
Write-Host "[ 3/4 ] Corrigiendo boton ojo (Eye)..." -ForegroundColor Yellow

$old3 = '                            <button onClick={() => handleRowClick(product)} className={`p-2 rounded-full transition ${darkMode ? ''text-slate-400 hover:text-blue-400 hover:bg-slate-700'' : ''text-slate-400 hover:text-blue-600 hover:bg-blue-50''}`}>
                                <Eye size={16} />
                            </button>'

$new3 = '                            <button
                              onClick={(e) => { e.stopPropagation(); setViewProduct(product); setViewModalOpen(true); }}
                              className={`p-2 rounded-full transition ${darkMode ? ''text-slate-400 hover:text-blue-400 hover:bg-slate-700'' : ''text-slate-400 hover:text-blue-600 hover:bg-blue-50''}`}
                              title="Ver detalle"
                            >
                              <Eye size={16} />
                            </button>'

if ($content.Contains($old3)) {
    $content = $content.Replace($old3, $new3)
    Write-Host "   OK -> boton Eye corregido" -ForegroundColor Green
} else {
    # Intento alternativo con comillas dobles
    $old3b = "                            <button onClick={() => handleRowClick(product)} className={``p-2 rounded-full transition `${darkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}``}>
                                <Eye size={16} />
                            </button>"
    Write-Host "   SKIP -> Aplicando fix manual al boton Eye..." -ForegroundColor DarkYellow
    
    # Buscar y reemplazar con regex
    $pattern = '(?s)<button onClick=\{.*?handleRowClick\(product\).*?<Eye size=\{16\} />\s*</button>'
    $replacement = '<button
                              onClick={(e) => { e.stopPropagation(); setViewProduct(product); setViewModalOpen(true); }}
                              className={`p-2 rounded-full transition ${darkMode ? ''text-slate-400 hover:text-blue-400 hover:bg-slate-700'' : ''text-slate-400 hover:text-blue-600 hover:bg-blue-50''}`}
                              title="Ver detalle"
                            >
                              <Eye size={16} />
                            </button>'
    $newContent = [regex]::Replace($content, $pattern, $replacement)
    if ($newContent -ne $content) {
        $content = $newContent
        Write-Host "   OK -> boton Eye corregido con regex" -ForegroundColor Green
    } else {
        Write-Host "   WARN -> No se pudo corregir el boton Eye automaticamente" -ForegroundColor Red
        Write-Host "   INFO -> Hazlo manual: busca '<Eye size={16} />' y cambia su onClick" -ForegroundColor Yellow
    }
}

# ── FIX 4: Agregar ProductViewModal al return + ScannerModal ─────────────────
Write-Host "[ 4/4 ] Agregando ProductViewModal al return de InventoryList..." -ForegroundColor Yellow

$old4 = '      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={handleScanSuccess}
        darkMode={darkMode}
      />

      {modalOpen && !isEditMode'

$new4 = '      <ScannerModal 
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

      {modalOpen && !isEditMode'

if ($content.Contains($old4)) {
    $content = $content.Replace($old4, $new4)
    Write-Host "   OK -> ProductViewModal agregado al return" -ForegroundColor Green
} elseif ($content.Contains("ProductViewModal") -and $content.Contains("viewModalOpen")) {
    Write-Host "   SKIP -> ProductViewModal ya esta en el return" -ForegroundColor DarkYellow
} else {
    Write-Host "   WARN -> No se encontro el bloque ScannerModal exacto" -ForegroundColor Red
}

# ── FIX 5: Pasar transactions={transactions} al InventoryList en App ──────────
Write-Host "[ 5/5 ] Pasando transactions al componente InventoryList en App..." -ForegroundColor Yellow

$old5 = '            <InventoryList 
                products={products} 
                categories={categories} 
                onAddProduct={addProduct}
                onEditProduct={editProduct}
                onDeleteProduct={deleteProduct}
                onImport={handleImport}
                initialCategoryFilter={null}
                currentUser={user}
                darkMode={darkMode}
            />'

$new5 = '            <InventoryList 
                products={products} 
                categories={categories}
                transactions={transactions}
                onAddProduct={addProduct}
                onEditProduct={editProduct}
                onDeleteProduct={deleteProduct}
                onImport={handleImport}
                initialCategoryFilter={null}
                currentUser={user}
                darkMode={darkMode}
            />'

if ($content.Contains($old5)) {
    $content = $content.Replace($old5, $new5)
    Write-Host "   OK -> transactions={transactions} agregado al uso de InventoryList" -ForegroundColor Green
} else {
    Write-Host "   SKIP -> ya tiene transactions o estructura diferente" -ForegroundColor DarkYellow
}

# ── Guardar ──────────────────────────────────────────────────────────────────
Set-Content -Path $appFile -Value $content -Encoding UTF8 -NoNewline
Write-Host ""
Write-Host "App.tsx guardado correctamente" -ForegroundColor Green

# ── Git commit ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Realizando commit..." -ForegroundColor Yellow
git add App.tsx
git commit -m "fix: conectar ProductViewModal con transactions, handleRowClick y boton Eye"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LISTO! Abre el navegador y prueba el ojo  " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  El boton ojo ahora abre la vista del producto" -ForegroundColor White
Write-Host "  con imagen, ficha tecnica e historial." -ForegroundColor White
Write-Host ""
