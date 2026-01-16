export interface Category {
  id: string;
  name: string;
  description?: string;
}

export enum ProductStatus {
  ACTIVE = 'Active',
  DISCONTINUED = 'Discontinued',
}

export enum AlertLevel {
  NONE = 'None',
  LOW_STOCK = 'Low Stock',
  EXPIRING_SOON = 'Expiring Soon',
  EXPIRED = 'Expired',
  OUT_OF_STOCK = 'Sin Inventario', // New status
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  categoryId: string;
  initialStock: number;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
  expirationDate?: string;
  status: ProductStatus;
  location?: string;
}

export enum TransactionType {
  IN = 'Entrada',
  OUT = 'Salida',
  WRITE_OFF = 'Baja',
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  type: TransactionType;
  quantity: number;
  date: string;
  reason?: string;
  user?: string;
  destination?: string;
  receiver?: string;
}

export type UserRole = 'admin' | 'viewer';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  expiredCount: number;
}