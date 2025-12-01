import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Matrix } from '../types';

// Helper: Determine Matrix Type Description
const getMatrixDescription = (m: Matrix): string => {
  if (m.rows === 1 && m.cols === 1) return "Escalar (1x1)";
  if (m.rows === m.cols) return `Matriz Cuadrada (${m.rows}x${m.cols})`;
  if (m.rows === 1) return `Vector Fila (1x${m.cols})`;
  if (m.cols === 1) return `Vector Columna (${m.rows}x1)`;
  return `Matriz Rectangular (${m.rows}x${m.cols})`;
};

// Helper: Draw professional matrix parentheses ( )
const drawMatrixParentheses = (doc: jsPDF, x: number, y: number, width: number, height: number) => {
  const depth = Math.min(width * 0.15, 5); 
  
  doc.setDrawColor(0, 0, 0); // Black
  doc.setLineWidth(0.5);

  // Left Parenthesis
  const lTopX = x + depth, lTopY = y;
  const lBotX = x + depth, lBotY = y + height;
  doc.moveTo(lTopX, lTopY);
  doc.curveTo(x, y + height/3, x, y + 2*height/3, lBotX, lBotY);
  doc.stroke();

  // Right Parenthesis
  const rTopX = x + width - depth, rTopY = y;
  const rBotX = x + width - depth, rBotY = y + height;
  doc.moveTo(rTopX, rTopY);
  doc.curveTo(x + width, y + height/3, x + width, y + 2*height/3, rBotX, rBotY);
  doc.stroke();
};

// Render a single matrix block
const renderMatrixMath = (doc: jsPDF, matrix: Matrix, startY: number): number => {
  // Check page break
  if (startY > doc.internal.pageSize.height - 50) {
    doc.addPage();
    startY = 30; 
  }

  // 1. Matrix Name Rendering (Complex Parser)
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138); // Blue-900

  let cursorX = 14;
  const cursorY = startY + 8;
  const rawName = matrix.name;

  // Regex to split by Transpose (\u1D40) or Power (^N)
  const regex = /(\u1D40|\^[0-9]+)/g;
  
  const parts = rawName.split(regex);

  parts.forEach((part) => {
    if (!part) return;

    if (part === '\u1D40') {
      // Case: Transpose Symbol (Detected via Regex)
      doc.setFontSize(10);
      doc.text('t', cursorX, cursorY - 3); // Superscript 't'
      cursorX += doc.getTextWidth('t') + 0.5;

    } else if (part.startsWith('^')) {
      // Case: Power (^2, ^3...)
      const exponent = part.substring(1); // Remove ^
      doc.setFontSize(10);
      doc.text(exponent, cursorX, cursorY - 3); // Superscript Number
      cursorX += doc.getTextWidth(exponent) + 0.5;

    } else {
      // Case: Normal Text (Scalars, Parentheses, Matrix Names)
      doc.setFontSize(14);
      doc.text(part, cursorX, cursorY);
      cursorX += doc.getTextWidth(part);
    }
  });

  // Draw Equals
  doc.setFontSize(14);
  const equalsText = ' =';
  doc.text(equalsText, cursorX + 1, cursorY);
  
  // Calculate dynamic margin for the table based on text width
  // We want at least 45 units (standard alignment), but if text is longer, we push it right.
  const equalsWidth = doc.getTextWidth(equalsText);
  const textEndPos = cursorX + 1 + equalsWidth;
  const tableMarginLeft = Math.max(45, textEndPos + 4);

  // Description
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(getMatrixDescription(matrix), 14, startY + 13);
  
  // 2. Render Data Table
  const body = matrix.data.map(row => row.map(val => val.toString()));

  autoTable(doc, {
    startY: startY,
    body: body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 11,
      textColor: [30, 41, 59],
      halign: 'center',
      valign: 'middle',
      cellPadding: 4,
      minCellWidth: 12
    },
    margin: { left: tableMarginLeft }, // Use dynamic margin
    tableWidth: 'wrap',
    didDrawPage: (data) => {
      const table = data.table;
      const startX = data.settings.margin.left;
      const initialY = data.settings.startY;
      
      let tableWidth = 0;
      if (table.columns && table.columns.length > 0) {
        tableWidth = table.columns.reduce((sum, col) => sum + (col.width || 20), 0);
      } else {
        tableWidth = matrix.cols * 15;
      }

      const currentBottomY = data.cursor?.y || (initialY + 20);
      const tableHeight = currentBottomY - initialY;

      if (tableHeight > 5) {
         drawMatrixParentheses(doc, startX - 3, initialY - 1, tableWidth + 6, tableHeight + 2);
      }
    }
  });

  return (doc as any).lastAutoTable.finalY + 15;
};

export const generatePDFReport = (
  matrices: Matrix[],
  results: Matrix[],
  operationType: string,
  scalar: number | null,
  timestamp: Date
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // --- Brand Header ---
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Reporte de Operaciones Matriciales", 14, 16);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(219, 234, 254);
  doc.text(`Generado: ${timestamp.toLocaleString()}`, 14, 22);
  
  doc.text("MatrixSim Pro", pageWidth - 14, 16, { align: "right" });

  let currentY = 40;

  // --- Section 1: Operation Summary ---
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text('1. Definición de la Operación', 14, currentY);
  
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
  
  currentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`• Operación: ${operationType}`, 20, currentY);
  if (scalar !== null) {
    currentY += 6;
    doc.text(`• Escalar aplicado (k): ${scalar}`, 20, currentY);
  }
  currentY += 15;

  // --- Section 2: Inputs ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text('2. Matrices de Entrada', 14, currentY);
  doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
  currentY += 12;

  matrices.forEach((matrix) => {
    currentY = renderMatrixMath(doc, matrix, currentY);
  });

  // --- Section 3: Results ---
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 30;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(21, 128, 61); // Green-700
  doc.text('3. Resultados y Procedimiento', 14, currentY);
  doc.setDrawColor(21, 128, 61);
  doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
  currentY += 15;

  results.forEach((matrix, index) => {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Paso ${index + 1}:`, 14, currentY - 5);
    
    currentY = renderMatrixMath(doc, matrix, currentY);

    if (matrix.steps && matrix.steps.length > 0) {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 30;
      }

      const boxStart = currentY - 5;
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); 
      doc.setFont("helvetica", "bold");
      doc.text('Detalle del cálculo:', 14, currentY);
      currentY += 6;
      
      doc.setFontSize(9);
      doc.setFont("courier", "normal"); 
      
      matrix.steps.forEach(step => {
        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 30;
        }
        
        const cleanStep = step.replace(/\s+/g, ' '); 
        const lines = doc.splitTextToSize(cleanStep, pageWidth - 35);
        
        doc.setTextColor(30);
        doc.text('•', 18, currentY);
        doc.text(lines, 24, currentY);
        
        currentY += (lines.length * 4) + 2;
      });
      
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(16, boxStart + 2, 16, currentY - 2);
      
      currentY += 10;
    }
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  doc.save(`MatrixSim_Report_${Date.now()}.pdf`);
};

export const exportToCSV = (matrix: Matrix) => {
  const csvContent = matrix.data.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${matrix.name}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToTXT = (matrix: Matrix) => {
  let content = `Matriz: ${matrix.name}\n`;
  content += `Tipo: ${getMatrixDescription(matrix)}\n\n`;
  content += matrix.data.map(row => row.join("\t")).join("\n");
  
  if (matrix.steps) {
    content += "\n\n--- Procedimiento ---\n";
    content += matrix.steps.join("\n");
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${matrix.name}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
