import { Category, Product, ProductStatus, User } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Aseo y Limpieza', description: 'Desinfectantes, papel, bolsas' },
  { id: 'cat_2', name: 'Oficina', description: 'Papelería, toners, escritura' },
  { id: 'cat_3', name: 'Cocina y Cafetería', description: 'Insumos, descartables' },
  { id: 'cat_4', name: 'Tecnología', description: 'Periféricos, cables, repuestos' },
  { id: 'cat_5', name: 'Vehículos', description: 'Lubricantes, herramientas básicas' },
];

// Helper to calculate previous dates or future dates
const futureDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    code: 'LIM-001',
    name: 'Desinfectante Multiusos',
    description: 'Galón 5L, Aroma Lavanda',
    categoryId: 'cat_1',
    initialStock: 10,
    stock: 5,
    minStock: 10,
    unit: 'Galón',
    price: 15.50,
    expirationDate: '2024-12-01',
    status: ProductStatus.ACTIVE,
    location: 'Estante A1'
  },
  {
    id: 'prod_2',
    code: 'OFI-001',
    name: 'Papel Bond',
    description: 'Tamaño A4, 75g, Blancura 98%',
    categoryId: 'cat_2',
    initialStock: 200,
    stock: 150,
    minStock: 20,
    unit: 'Resma',
    price: 4.20,
    status: ProductStatus.ACTIVE,
    location: 'Bodega 2'
  },
  {
    id: 'prod_3',
    code: 'COC-005',
    name: 'Café Grano Tostado',
    description: 'Bolsa 1kg, Tueste Medio',
    categoryId: 'cat_3',
    initialStock: 10,
    stock: 2,
    minStock: 5,
    unit: 'Bolsa',
    price: 12.00,
    expirationDate: futureDate(20),
    status: ProductStatus.ACTIVE,
    location: 'Cocina'
  },
  {
    id: 'prod_4',
    code: 'TEC-020',
    name: 'Mouse Inalámbrico',
    description: 'Logitech M170, Negro',
    categoryId: 'cat_4',
    initialStock: 15,
    stock: 8,
    minStock: 5,
    unit: 'Unidad',
    price: 25.00,
    status: ProductStatus.ACTIVE,
    location: 'Armario TI'
  },
];

export const INITIAL_USERS: User[] = [
    { id: 'u1', username: 'admin', password: 'admin', name: 'Administrador Principal', role: 'admin' },
    { id: 'u2', username: 'visitante', password: '123', name: 'Usuario Vista', role: 'viewer' }
];

// Suggestions for autocomplete
export const PREDEFINED_PRODUCTS: Record<string, string[]> = {
    'cat_1': ['Cloro', 'Detergente en Polvo', 'Jabón Líquido', 'Papel Higiénico', 'Toallas de Papel', 'Bolsas de Basura', 'Limpia Vidrios'],
    'cat_2': ['Resma Carta', 'Resma Oficio', 'Bolígrafos Azul', 'Bolígrafos Negro', 'Marcadores', 'Grapas', 'Carpeta Archivadora', 'Toner HP', 'Notas Adhesivas'],
    'cat_3': ['Azúcar', 'Café Instantáneo', 'Vasos Desechables', 'Servilletas', 'Agua Mineral', 'Té Filtrante'],
    'cat_4': ['Teclado USB', 'Cable HDMI', 'Monitor 24"', 'Baterías AA', 'Baterías AAA', 'Limpiador de Contactos'],
    'cat_5': ['Aceite Motor 10W30', 'Refrigerante', 'Líquido de Frenos', 'Shampoo Autos', 'Cera Pulidora']
};

export const EXPIRATION_WARNING_DAYS = 30;
export const CURRENCY_SYMBOL = '$';