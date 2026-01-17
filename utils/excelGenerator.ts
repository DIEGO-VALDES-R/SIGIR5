import * as XLSX from 'xlsx';
import { Product, Category, Transaction } from '../types';
import { CURRENCY_SYMBOL } from '../constants';

// --- REPORTE DE INVENTARIO EN EXCEL ---
export const generateInventoryExcel = (products: Product[], categories: Category[]) => {
  const workbook = XLSX.utils.book_new();
  
  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const lowStock = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStock = products.filter(p => p.stock === 0).length;
  
  // HOJA 1: RESUMEN
  const summaryData = [
    ['MINISTERIO DE DEFENSA NACIONAL'],
    ['POLICÍA NACIONAL'],
    ['REGIÓN DE POLICÍA No. 5 - LOGÍSTICA'],
    [''],
    ['REPORTE DE INVENTARIO GENERAL'],
    [`Fecha: ${today}`],
    [''],
    ['RESUMEN EJECUTIVO'],
    ['Indicador', 'Valor'],
    ['Total de Productos', totalProducts],
    ['Valor Total del Inventario', `${CURRENCY_SYMBOL}${totalValue.toLocaleString()}`],
    ['Productos con Stock Bajo', lowStock],
    ['Productos Agotados', outOfStock],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  
  // HOJA 2: INVENTARIO DETALLADO
  const inventoryHeaders = [
    'Código', 'Producto', 'Descripción', 'Categoría', 'Stock Inicial',
    'Stock Actual', 'Diferencia', 'Unidad', 'Precio Unitario', 'Valor Total',
    'Stock Mínimo', 'Estado', 'Fecha Vencimiento'
  ];
  
  const inventoryData = products.map(p => {
    const category = categories.find(c => c.id === p.categoryId);
    const difference = (p.initialStock || 0) - p.stock;
    const status = p.stock === 0 ? 'AGOTADO' : (p.stock <= p.minStock ? 'BAJO STOCK' : 'OK');
    const totalValue = p.stock * p.price;
    
    return [
      p.code, p.name, p.description || '-', category?.name || '-',
      p.initialStock || 0, p.stock, difference, p.unit, p.price, totalValue,
      p.minStock, status, p.expirationDate || '-'
    ];
  });
  
  const inventorySheet = XLSX.utils.aoa_to_sheet([inventoryHeaders, ...inventoryData]);
  inventorySheet['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
    { wch: 12 }, { wch: 12 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventario Completo');
  
  // HOJA 3: POR CATEGORÍA
  categories.forEach((cat) => {
    const catProducts = products.filter(p => p.categoryId === cat.id);
    if (catProducts.length === 0) return;
    
    const catHeaders = [`CATEGORÍA: ${cat.name.toUpperCase()}`, '', '', '', '', ''];
    const catTableHeaders = ['Código', 'Producto', 'Stock Actual', 'Unidad', 'Precio', 'Valor Total', 'Estado'];
    
    const catData = catProducts.map(p => {
      const status = p.stock === 0 ? 'AGOTADO' : (p.stock <= p.minStock ? 'BAJO' : 'OK');
      return [p.code, p.name, p.stock, p.unit, p.price, p.stock * p.price, status];
    });
    
    const catTotal = catProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const catTotals = ['', 'TOTAL CATEGORÍA:', '', '', '', catTotal, ''];
    
    const catSheet = XLSX.utils.aoa_to_sheet([catHeaders, [''], catTableHeaders, ...catData, [''], catTotals]);
    catSheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    
    const sheetName = cat.name.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, catSheet, sheetName);
  });
  
  // HOJA 4: ALERTAS
  const criticalProducts = products.filter(p => p.stock <= p.minStock);
  const alertHeaders = ['PRODUCTOS CRÍTICOS - REQUIEREN ATENCIÓN', '', '', '', ''];
  const alertTableHeaders = ['Código', 'Producto', 'Stock Actual', 'Stock Mínimo', 'Estado', 'Acción Sugerida'];
  
  const alertData = criticalProducts.map(p => {
    const status = p.stock === 0 ? 'AGOTADO' : 'BAJO STOCK';
    const action = p.stock === 0 ? 'REPOSICIÓN URGENTE' : 'Reposición Recomendada';
    return [p.code, p.name, p.stock, p.minStock, status, action];
  });
  
  const alertSheet = XLSX.utils.aoa_to_sheet([alertHeaders, [''], alertTableHeaders, ...alertData]);
  alertSheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, alertSheet, 'Alertas');
  
  XLSX.writeFile(workbook, `Inventario_PONAL_R5_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// --- HISTORIAL DE TRANSACCIONES EN EXCEL ---
export const generateTransactionHistoryExcel = (transactions: Transaction[]) => {
  const workbook = XLSX.utils.book_new();
  
  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const totalQty = transactions.reduce((sum, t) => sum + t.quantity, 0);
  const uniqueProducts = new Set(transactions.map(t => t.productName)).size;
  
  // HOJA 1: RESUMEN
  const summaryData = [
    ['MINISTERIO DE DEFENSA NACIONAL'],
    ['POLICÍA NACIONAL'],
    ['REGIÓN DE POLICÍA No. 5 - LOGÍSTICA'],
    [''],
    ['HISTORIAL DE SALIDAS Y BAJAS'],
    [`Fecha: ${today}`],
    [''],
    ['RESUMEN'],
    ['Indicador', 'Valor'],
    ['Total de Movimientos', transactions.length],
    ['Cantidad Total Retirada', totalQty],
    ['Productos Diferentes Afectados', uniqueProducts],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  
  // HOJA 2: HISTORIAL COMPLETO
  const historyHeaders = ['Fecha', 'Hora', 'Producto', 'Cantidad', 'Motivo', 'Destino/Departamento', 'Recibido Por', 'Usuario que Registró'];
  
  const historyData = transactions.map(t => {
    const date = new Date(t.date);
    return [
      date.toLocaleDateString('es-ES'),
      date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      t.productName, t.quantity, t.reason || '-', t.destination || '-',
      t.receiver || '-', t.user || 'Sistema'
    ];
  });
  
  const historySheet = XLSX.utils.aoa_to_sheet([historyHeaders, ...historyData]);
  historySheet['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 30 }, { wch: 10 },
    { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, historySheet, 'Historial Completo');
  
  // HOJA 3: POR PRODUCTO
  const productSummary = transactions.reduce((acc: any, t) => {
    if (!acc[t.productName]) {
      acc[t.productName] = { count: 0, totalQty: 0 };
    }
    acc[t.productName].count++;
    acc[t.productName].totalQty += t.quantity;
    return acc;
  }, {});
  
  const productHeaders = ['Producto', 'Número de Salidas', 'Cantidad Total'];
  const productData = Object.entries(productSummary).map(([product, data]: [string, any]) => [
    product, data.count, data.totalQty
  ]);
  
  const productSheet = XLSX.utils.aoa_to_sheet([productHeaders, ...productData]);
  productSheet['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, productSheet, 'Por Producto');
  
  // HOJA 4: POR MOTIVO
  const reasonSummary = transactions.reduce((acc: any, t) => {
    const reason = t.reason || 'Sin especificar';
    if (!acc[reason]) {
      acc[reason] = { count: 0, totalQty: 0 };
    }
    acc[reason].count++;
    acc[reason].totalQty += t.quantity;
    return acc;
  }, {});
  
  const reasonHeaders = ['Motivo', 'Número de Salidas', 'Cantidad Total'];
  const reasonData = Object.entries(reasonSummary).map(([reason, data]: [string, any]) => [
    reason, data.count, data.totalQty
  ]);
  
  const reasonSheet = XLSX.utils.aoa_to_sheet([reasonHeaders, ...reasonData]);
  reasonSheet['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, reasonSheet, 'Por Motivo');
  
  XLSX.writeFile(workbook, `Historial_Salidas_PONAL_R5_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// --- ORDEN DE REPOSICIÓN EN EXCEL ---
export const generateReplenishmentExcel = (products: Product[]) => {
  const workbook = XLSX.utils.book_new();
  
  const toOrder = products.filter(p => p.stock <= p.minStock);
  
  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const critical = toOrder.filter(p => p.stock === 0).length;
  const low = toOrder.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const totalSuggested = toOrder.reduce((sum, p) => sum + ((p.minStock * 2) - p.stock), 0);
  const totalCost = toOrder.reduce((sum, p) => {
    const suggested = Math.max((p.minStock * 2) - p.stock, 0);
    return sum + (suggested * p.price);
  }, 0);
  
  // HOJA 1: RESUMEN
  const summaryData = [
    ['MINISTERIO DE DEFENSA NACIONAL'],
    ['POLICÍA NACIONAL'],
    ['REGIÓN DE POLICÍA No. 5 - LOGÍSTICA'],
    [''],
    ['ORDEN DE PEDIDO SUGERIDA'],
    [`Fecha: ${today}`],
    [''],
    ['⚠ ANÁLISIS DE NECESIDADES'],
    ['Indicador', 'Valor'],
    ['Productos Agotados (Críticos)', critical],
    ['Productos con Stock Bajo', low],
    ['Total de Productos a Reponer', toOrder.length],
    ['Unidades Totales Sugeridas', totalSuggested],
    ['Costo Total Estimado', `${CURRENCY_SYMBOL}${totalCost.toLocaleString()}`],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  
  // HOJA 2: ORDEN DE PEDIDO
  const orderHeaders = [
    'Prioridad', 'Código', 'Producto', 'Stock Actual', 'Stock Mínimo',
    'Cantidad Sugerida', 'Unidad', 'Precio Unitario', 'Costo Total', 'Observaciones'
  ];
  
  const orderData = toOrder
    .sort((a, b) => a.stock - b.stock)
    .map(p => {
      const suggested = Math.max((p.minStock * 2) - p.stock, 0);
      const cost = suggested * p.price;
      const priority = p.stock === 0 ? 'URGENTE' : 'ALTA';
      const obs = p.stock === 0 ? 'PRODUCTO AGOTADO - Reposición inmediata' : 'Stock bajo nivel mínimo';
      
      return [priority, p.code, p.name, p.stock, p.minStock, suggested, p.unit, p.price, cost, obs];
    });
  
  const totalRow = ['', '', 'TOTAL GENERAL:', '', '', totalSuggested, '', '', totalCost, ''];
  
  const orderSheet = XLSX.utils.aoa_to_sheet([orderHeaders, ...orderData, [], totalRow]);
  orderSheet['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(workbook, orderSheet, 'Orden de Pedido');
  
  // HOJA 3: PRODUCTOS CRÍTICOS
  const criticalProducts = toOrder.filter(p => p.stock === 0);
  
  if (criticalProducts.length > 0) {
    const criticalHeaders = ['🚨 PRODUCTOS AGOTADOS - ACCIÓN INMEDIATA REQUERIDA', '', '', '', ''];
    const criticalTableHeaders = ['Código', 'Producto', 'Stock Mínimo', 'Cantidad Urgente', 'Costo Estimado'];
    
    const criticalData = criticalProducts.map(p => {
      const suggested = p.minStock * 2;
      return [p.code, p.name, p.minStock, suggested, suggested * p.price];
    });
    
    const criticalSheet = XLSX.utils.aoa_to_sheet([criticalHeaders, [], criticalTableHeaders, ...criticalData]);
    criticalSheet['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, criticalSheet, 'Críticos');
  }
  
  XLSX.writeFile(workbook, `Orden_Pedido_PONAL_R5_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// --- REPORTE COMPLETO ---
export const generateCompleteExcel = (
  products: Product[], 
  categories: Category[], 
  transactions: Transaction[]
) => {
  const workbook = XLSX.utils.book_new();
  
  // PORTADA
  const coverData = [
    [''], [''],
    ['MINISTERIO DE DEFENSA NACIONAL'],
    ['POLICÍA NACIONAL DE COLOMBIA'],
    ['REGIÓN DE POLICÍA No. 5'],
    ['LOGÍSTICA'],
    [''], [''],
    ['REPORTE INTEGRAL DE INVENTARIO'],
    [''],
    [`Generado el: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`],
    [''], [''],
    ['Este documento contiene:'],
    ['- Inventario General'],
    ['- Análisis por Categorías'],
    ['- Historial de Movimientos'],
    ['- Orden de Reposición'],
    ['- Alertas y Productos Críticos'],
    [''], [''],
    ['Documento de uso oficial - Manejo confidencial']
  ];
  
  const coverSheet = XLSX.utils.aoa_to_sheet(coverData);
  coverSheet['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, coverSheet, 'Portada');
  
  // INVENTARIO
  const inventoryHeaders = ['Código', 'Producto', 'Categoría', 'Stock', 'Precio', 'Estado'];
  const inventoryData = products.map(p => {
    const cat = categories.find(c => c.id === p.categoryId);
    const status = p.stock === 0 ? 'AGOTADO' : (p.stock <= p.minStock ? 'BAJO' : 'OK');
    return [p.code, p.name, cat?.name || '-', p.stock, p.price, status];
  });
  
  const invSheet = XLSX.utils.aoa_to_sheet([inventoryHeaders, ...inventoryData]);
  XLSX.utils.book_append_sheet(workbook, invSheet, 'Inventario');
  
  XLSX.writeFile(workbook, `Reporte_Completo_PONAL_R5_${new Date().toISOString().split('T')[0]}.xlsx`);
};