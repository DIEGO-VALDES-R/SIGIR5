import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, Category, Transaction } from '../types';
import { CURRENCY_SYMBOL } from '../constants';

// Colores corporativos IPHONESHOP
const COLORS = {
  primary: [16, 185, 129],      // Emerald-600
  secondary: [52, 73, 94],      // Slate-700
  danger: [239, 68, 68],        // Red-500
  warning: [245, 158, 11],      // Amber-500
  success: [34, 197, 94],       // Green-500
  text: [51, 65, 85],           // Slate-700
  lightGray: [241, 245, 249],   // Slate-100
  iphoneBlack: [17, 17, 17]     // Negro corporativo IPHONESHOP
};

// Función auxiliar para agregar header IPHONESHOP
const addHeader = async (doc: any, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Fondo negro corporativo
  doc.setFillColor(...COLORS.iphoneBlack);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Franja verde decorativa
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 47, pageWidth, 3, 'F');
  
  // Nombre de la empresa (izquierda)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('IPHONESHOP', 14, 22);

  // Subtítulo empresa
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(16, 185, 129); // Verde emerald
  doc.text('Sistema de Inventario de Tecnología', 14, 31);

  // Línea divisoria en la derecha
  const centerX = pageWidth / 2;

  // Fecha en la esquina derecha del header
  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  const textWidth = doc.getTextWidth(`Fecha: ${today}`);
  doc.text(`Fecha: ${today}`, pageWidth - textWidth - 14, 20);

  // Línea divisoria dorada/verde
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.line(14, 52, pageWidth - 14, 52);
  
  // Título del reporte
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(title, centerX, 62, { align: 'center' });
  
  // Subtítulo
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, centerX, 69, { align: 'center' });
  }
  
  // Reset color
  doc.setTextColor(...COLORS.text);
};

// Función auxiliar para agregar footer
const addFooter = (doc: any, pageNumber: number, totalPages: number, additionalInfo?: string) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  // Línea decorativa
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
  
  // Información de la empresa
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'bold');
  doc.text('IPHONESHOP - Sistema de Inventario de Tecnología', 14, pageHeight - 15);
  
  // Información adicional
  if (additionalInfo) {
    doc.setFont(undefined, 'normal');
    doc.text(additionalInfo, 14, pageHeight - 11);
  }
  
  // Número de página
  const pageText = `Página ${pageNumber} de ${totalPages}`;
  const textWidth = doc.getTextWidth(pageText);
  doc.text(pageText, pageWidth - textWidth - 14, pageHeight - 15);
  
  // Línea de confidencialidad
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  const confidencial = 'Documento de uso interno - IPHONESHOP';
  const confWidth = doc.getTextWidth(confidencial);
  doc.text(confidencial, (pageWidth - confWidth) / 2, pageHeight - 7);
};

// --- INVENTARIO ---
export const generateInventoryPDF = async (products: Product[], categories: Category[]) => {
  const doc: any = new jsPDF();
  
  await addHeader(doc, 'Reporte de Inventario General', 'Estado completo del inventario por categorías');
  
  let finalY = 75;
  
  // Calcular totales
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const lowStock = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStock = products.filter(p => p.stock === 0).length;
  
  // Panel de resumen
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(14, finalY, doc.internal.pageSize.width - 28, 28, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLORS.text);
  
  const col1 = 20;
  const col2 = 70;
  const col3 = 130;
  
  doc.text('Total Productos:', col1, finalY + 8);
  doc.setFont(undefined, 'normal');
  doc.text(totalProducts.toString(), col1, finalY + 14);
  
  doc.setFont(undefined, 'bold');
  doc.text('Valor Inventario:', col2, finalY + 8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.success);
  doc.text(`${CURRENCY_SYMBOL}${totalValue.toLocaleString()}`, col2, finalY + 14);
  
  doc.setTextColor(...COLORS.text);
  doc.setFont(undefined, 'bold');
  doc.text('Stock Bajo:', col3, finalY + 8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.warning);
  doc.text(lowStock.toString(), col3, finalY + 14);
  
  doc.setTextColor(...COLORS.text);
  doc.setFont(undefined, 'bold');
  doc.text('Agotados:', col3, finalY + 20);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.danger);
  doc.text(outOfStock.toString(), col3, finalY + 26);
  
  finalY += 35;
  
  // Tablas por categoría
  for (const cat of categories) {
    const catProducts = products.filter(p => p.categoryId === cat.id);
    if (catProducts.length === 0) continue;
    
    // Verificar espacio para nueva categoría
    if (finalY > doc.internal.pageSize.height - 80) {
      doc.addPage();
      await addHeader(doc, 'Reporte de Inventario General', 'Continuación');
      finalY = 75;
    }
    
    // Título de categoría con badge
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(14, finalY, 50, 8, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(cat.name, 16, finalY + 5.5);
    
    doc.setTextColor(...COLORS.text);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`(${catProducts.length} productos)`, 66, finalY + 5.5);
    
    const tableData = catProducts.map(p => {
      const difference = p.initialStock - p.stock;
      const status = p.stock === 0 ? 'AGOTADO' : (p.stock <= p.minStock ? 'BAJO' : 'OK');
      return [
        p.code,
        p.name,
        p.initialStock.toString(),
        p.stock.toString(),
        difference.toString(),
        p.unit,
        `${CURRENCY_SYMBOL}${p.price.toFixed(2)}`,
        `${CURRENCY_SYMBOL}${(p.stock * p.price).toFixed(2)}`,
        status
      ];
    });
    
    autoTable(doc, {
      startY: finalY + 12,
      head: [['Código', 'Producto', 'Inicial', 'Actual', 'Dif.', 'Unid.', 'Precio', 'Valor', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: COLORS.secondary,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 20 },
        1: { cellWidth: 45 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 15 },
        6: { halign: 'right', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
        8: { halign: 'center', fontStyle: 'bold', cellWidth: 18 }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === 8) {
          if (data.cell.raw === 'AGOTADO') {
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fillColor = COLORS.danger;
          } else if (data.cell.raw === 'BAJO') {
            data.cell.styles.textColor = COLORS.warning;
          } else {
            data.cell.styles.textColor = COLORS.success;
          }
        }
        if (data.section === 'body' && data.column.index === 3) {
          const stockValue = parseInt(data.cell.raw);
          if (stockValue === 0) {
            data.cell.styles.textColor = COLORS.danger;
          }
        }
      },
      margin: { bottom: 30 }
    });
    
    finalY = doc.lastAutoTable.finalY + 8;
  }
  
  // Footer en todas las páginas
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, `Total productos: ${totalProducts} | Valor: ${CURRENCY_SYMBOL}${totalValue.toLocaleString()}`);
  }
  
  doc.save(`Inventario_IPHONESHOP_${new Date().toISOString().split('T')[0]}.pdf`);
};

// --- HISTORIAL DE TRANSACCIONES ---
export const generateTransactionHistoryPDF = async (transactions: Transaction[]) => {
  const doc: any = new jsPDF();
  
  await addHeader(doc, 'Historial de Salidas y Bajas', 'Registro completo de movimientos de inventario');
  
  let finalY = 75;
  
  // Resumen de transacciones
  const totalQty = transactions.reduce((sum, t) => sum + t.quantity, 0);
  const uniqueProducts = new Set(transactions.map(t => t.productName)).size;
  
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(14, finalY, doc.internal.pageSize.width - 28, 20, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLORS.text);
  
  doc.text('Total Movimientos:', 20, finalY + 8);
  doc.setFont(undefined, 'normal');
  doc.text(transactions.length.toString(), 20, finalY + 14);
  
  doc.setFont(undefined, 'bold');
  doc.text('Cantidad Total:', 80, finalY + 8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.danger);
  doc.text(`-${totalQty}`, 80, finalY + 14);
  
  doc.setTextColor(...COLORS.text);
  doc.setFont(undefined, 'bold');
  doc.text('Productos Afectados:', 130, finalY + 8);
  doc.setFont(undefined, 'normal');
  doc.text(uniqueProducts.toString(), 130, finalY + 14);
  
  finalY += 28;
  
  const tableData = transactions.map(t => [
    new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    new Date(t.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    t.productName,
    t.quantity.toString(),
    t.reason || '-',
    t.destination || 'N/A',
    t.receiver || 'N/A',
    t.user || 'Sistema'
  ]);
  
  autoTable(doc, {
    startY: finalY,
    head: [['Fecha', 'Hora', 'Producto', 'Cant.', 'Motivo', 'Destino', 'Recibe', 'Registró']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: COLORS.danger,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 7,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 40, fontStyle: 'bold' },
      3: { cellWidth: 12, halign: 'center', textColor: COLORS.danger, fontStyle: 'bold' },
      4: { cellWidth: 30 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 },
      7: { cellWidth: 20, fontSize: 7 }
    },
    margin: { bottom: 30 }
  });
  
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, `Total movimientos: ${transactions.length} | Cantidad total: ${totalQty} unidades`);
  }
  
  doc.save(`Historial_Salidas_IPHONESHOP_${new Date().toISOString().split('T')[0]}.pdf`);
};

// --- ORDEN DE REPOSICIÓN ---
export const generateReplenishmentPDF = async (products: Product[]) => {
  const doc: any = new jsPDF();
  
  const toOrder = products.filter(p => p.stock <= p.minStock);
  
  await addHeader(doc, 'Orden de Pedido Sugerida', 'Productos con stock crítico que requieren reposición');
  
  let finalY = 75;
  
  // Resumen crítico
  const critical = toOrder.filter(p => p.stock === 0).length;
  const low = toOrder.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const totalSuggested = toOrder.reduce((sum, p) => sum + ((p.minStock * 2) - p.stock), 0);
  
  doc.setFillColor(254, 242, 242); // Red-50
  doc.roundedRect(14, finalY, doc.internal.pageSize.width - 28, 25, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLORS.danger);
  
  doc.text('⚠ PRODUCTOS CRÍTICOS', 20, finalY + 8);
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('Agotados:', 20, finalY + 15);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.danger);
  doc.text(critical.toString(), 20, finalY + 20);
  
  doc.setTextColor(...COLORS.text);
  doc.setFont(undefined, 'bold');
  doc.text('Stock Bajo:', 70, finalY + 15);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.warning);
  doc.text(low.toString(), 70, finalY + 20);
  
  doc.setTextColor(...COLORS.text);
  doc.setFont(undefined, 'bold');
  doc.text('Total a Pedir:', 120, finalY + 15);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.primary);
  doc.text(`${totalSuggested} unidades`, 120, finalY + 20);
  
  finalY += 33;
  
  const tableData = toOrder.map(p => {
    const suggested = Math.max((p.minStock * 2) - p.stock, 0);
    const status = p.stock === 0 ? 'AGOTADO' : 'BAJO';
    return [
      p.code,
      p.name,
      p.stock === 0 ? 'AGOTADO' : p.stock.toString(),
      p.minStock.toString(),
      suggested.toString(),
      p.unit,
      `${CURRENCY_SYMBOL}${p.price.toFixed(2)}`,
      `${CURRENCY_SYMBOL}${(suggested * p.price).toFixed(2)}`,
      status
    ];
  });
  
  autoTable(doc, {
    startY: finalY,
    head: [['Código', 'Producto', 'Stock', 'Mín.', 'Pedir', 'Unid.', 'Precio', 'Costo', 'Estado']],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: COLORS.warning,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'center', cellWidth: 15, fontStyle: 'bold', textColor: COLORS.primary },
      5: { halign: 'center', cellWidth: 15 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 20 }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 8) {
        if (data.cell.raw === 'AGOTADO') {
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fillColor = COLORS.danger;
        } else {
          data.cell.styles.textColor = COLORS.warning;
        }
      }
      if (data.section === 'body' && data.column.index === 2) {
        if (data.cell.raw === 'AGOTADO') {
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fillColor = COLORS.danger;
        }
      }
    },
    didDrawPage: function(data: any) {
      if (data.pageNumber === doc.internal.pages.length - 1) {
        const pageHeight = doc.internal.pageSize.height;
        const finalTableY = data.cursor.y;
        
        if (finalTableY < pageHeight - 60) {
          const totalCost = toOrder.reduce((sum, p) => {
            const suggested = Math.max((p.minStock * 2) - p.stock, 0);
            return sum + (suggested * p.price);
          }, 0);
          
          doc.setFillColor(...COLORS.primary);
          doc.roundedRect(120, finalTableY + 5, 75, 12, 2, 2, 'F');
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('COSTO TOTAL ESTIMADO:', 125, finalTableY + 12);
          doc.text(`${CURRENCY_SYMBOL}${totalCost.toLocaleString()}`, 170, finalTableY + 12);
        }
      }
    },
    margin: { bottom: 30 }
  });
  
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, `Productos a reponer: ${toOrder.length} | Prioridad: ${critical} críticos`);
  }
  
  doc.save(`Pedido_Reposicion_IPHONESHOP_${new Date().toISOString().split('T')[0]}.pdf`);
};