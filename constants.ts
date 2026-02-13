import { Category, Product, ProductStatus, User } from './types';

export const CURRENCY_SYMBOL = '$';
export const EXPIRATION_WARNING_DAYS = 90; // Garantía de productos

// Categorías de tecnología
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Smartphones', description: 'iPhone, Samsung, Google Pixel' },
  { id: 'cat_2', name: 'Tablets', description: 'iPad, Samsung Tab, Surface' },
  { id: 'cat_3', name: 'Laptops', description: 'MacBook, Surface, ThinkPad' },
  { id: 'cat_4', name: 'Accesorios', description: 'Cables, cargadores, fundas' },
  { id: 'cat_5', name: 'Audio', description: 'AirPods, audífonos, parlantes' },
  { id: 'cat_6', name: 'Smartwatches', description: 'Apple Watch, Galaxy Watch' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    code: 'IPH-15-PRO-256-TIT',
    name: 'iPhone 15 Pro',
    description: '256GB Titanio Natural',
    categoryId: 'cat_1',
    initialStock: 15,
    stock: 12,
    minStock: 5,
    unit: 'Unidad',
    price: 1299.99,
    status: ProductStatus.ACTIVE,
    imageUrl: '', // Se agregará
    warranty: '12 meses',
    brand: 'Apple',
    model: 'A2848'
  },
  {
    id: 'prod_2',
    code: 'IPH-15-128-BLU',
    name: 'iPhone 15',
    description: '128GB Azul',
    categoryId: 'cat_1',
    initialStock: 20,
    stock: 18,
    minStock: 8,
    unit: 'Unidad',
    price: 899.99,
    status: ProductStatus.ACTIVE,
    imageUrl: '',
    warranty: '12 meses',
    brand: 'Apple',
    model: 'A2846'
  },
  {
    id: 'prod_3',
    code: 'IPAD-AIR-M2-256',
    name: 'iPad Air M2',
    description: '256GB WiFi Space Gray',
    categoryId: 'cat_2',
    initialStock: 10,
    stock: 7,
    minStock: 3,
    unit: 'Unidad',
    price: 749.99,
    status: ProductStatus.ACTIVE,
    imageUrl: '',
    warranty: '12 meses',
    brand: 'Apple',
    model: 'MUWC3LL/A'
  },
  {
    id: 'prod_4',
    code: 'AIRPODS-PRO-2',
    name: 'AirPods Pro (2nd Gen)',
    description: 'USB-C Cancelación de ruido',
    categoryId: 'cat_5',
    initialStock: 30,
    stock: 22,
    minStock: 10,
    unit: 'Unidad',
    price: 249.99,
    status: ProductStatus.ACTIVE,
    imageUrl: '',
    warranty: '12 meses',
    brand: 'Apple',
    model: 'MTJV3AM/A'
  },
  {
    id: 'prod_5',
    code: 'MACBOOK-AIR-M3',
    name: 'MacBook Air M3',
    description: '15" 16GB RAM 512GB SSD',
    categoryId: 'cat_3',
    initialStock: 8,
    stock: 5,
    minStock: 2,
    unit: 'Unidad',
    price: 1699.99,
    status: ProductStatus.ACTIVE,
    imageUrl: '',
    warranty: '12 meses',
    brand: 'Apple',
    model: 'MRYN3LL/A'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    username: 'admin',
    password: 'admin',
    name: 'Administrador',
    role: 'admin'
  },
  {
    id: 'u2',
    username: 'vendedor',
    password: '123',
    name: 'Vendedor',
    role: 'viewer'
  }
];

// Productos predefinidos por categoría para autocompletar
export const PREDEFINED_PRODUCTS: Record<string, string[]> = {
  'cat_1': [
    'iPhone 15 Pro Max',
    'iPhone 15 Pro',
    'iPhone 15 Plus',
    'iPhone 15',
    'Samsung Galaxy S24 Ultra',
    'Samsung Galaxy S24+',
    'Google Pixel 8 Pro'
  ],
  'cat_2': [
    'iPad Pro 12.9"',
    'iPad Air M2',
    'iPad 10th Gen',
    'Samsung Galaxy Tab S9',
    'Microsoft Surface Pro 9'
  ],
  'cat_3': [
    'MacBook Pro 16" M3',
    'MacBook Air 15" M3',
    'MacBook Air 13" M2',
    'Dell XPS 15',
    'Lenovo ThinkPad X1 Carbon'
  ],
  'cat_4': [
    'USB-C Cable 1m',
    'Lightning Cable',
    'Cargador 20W USB-C',
    'Funda MagSafe',
    'Protector de pantalla',
    'Adaptador HDMI'
  ],
  'cat_5': [
    'AirPods Pro 2nd Gen',
    'AirPods Max',
    'AirPods 3rd Gen',
    'Sony WH-1000XM5',
    'JBL Flip 6',
    'HomePod mini'
  ],
  'cat_6': [
    'Apple Watch Series 9',
    'Apple Watch SE',
    'Apple Watch Ultra 2',
    'Samsung Galaxy Watch 6',
    'Garmin Fenix 7'
  ]
};