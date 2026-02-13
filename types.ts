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
  EXPIRING_SOON = 'Garantía próxima a vencer',
  EXPIRED = 'Garantía vencida',
  OUT_OF_STOCK = 'Sin Inventario',
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
  expirationDate?: string; // Fecha de vencimiento de garantía
  status: ProductStatus;
  location?: string;
  supplier?: string;
  // NUEVOS CAMPOS PARA TECNOLOGÍA
  imageUrl?: string;
  imagePublicId?: string; // ID en Supabase Storage
  brand?: string; // Marca (Apple, Samsung, etc.)
  model?: string; // Modelo específico
  warranty?: string; // Garantía (12 meses, 24 meses)
  specifications?: string; // Especificaciones técnicas JSON
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
  reason: string;
  user: string;
  destination?: string;
  receiver?: string;
  // Campos para archivos adjuntos
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentSize?: number;
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