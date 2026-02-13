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
