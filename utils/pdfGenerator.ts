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
  const curveDepth = 5; // Amplitude of the curve
  doc.setDrawColor(20, 20, 20); // Dark grey
  doc.setLineWidth(0.5);

  // Left Parenthesis (
  // Draws a cubic bezier curve relative to the start point
  // Start point is shifted slightly right (x+2) so the belly of the curve sits near x
  doc.lines(
    [[
      'c',
      -curveDepth, height * 0.25, // Control point 1 (outwards, up)
      -curveDepth, height * 0.75, // Control point 2 (outwards, down)
      0, height                   // End point (straight down relative to start)
    ]],
    x + 2, 
    y
  );

  // Right Parenthesis )
  // Start point is shifted slightly left (x+width-2)
  doc.lines(
    [[
      'c',
      curveDepth, height * 0.25,
      curveDepth, height * 0.75,
      0, height
    ]],
    x + width - 2, 
    y
  );
};

// Render a single matrix block
const renderMatrixMath = (doc: jsPDF, matrix: Matrix, startY: number): number => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Check page break space (Needs ~40 units for header + matrix)
  if (startY > doc.internal.pageSize.height - 50) {
    doc.addPage();
    startY = 30; // Reset Y with margin
  }

  // 1. Matrix Name & Info (Left side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text(`${matrix.name} =`, 14, startY + 8);
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(getMatrixDescription(matrix), 14, startY + 13);
  
  // 2. Render Data Table
  const body = matrix.data.map(row => row.map(val => val.toString()));

  // Calculate table width to center brackets
  // We use autoTable but with 'plain' theme (no borders)
  autoTable(doc, {
    startY: startY,
    body: body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 10,
      textColor: [30, 41, 59], // Slate-800
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
      minCellWidth: 10
    },
    margin: { left: 45 }, // Indent past the name
    tableWidth: 'wrap',
    didDrawPage: (data) => {
      // Draw Parentheses around the table content
      const table = data.table;
      const finalY = table.finalY || 0;
      const initialY = data.settings.startY;
      const tableHeight = (finalY - initialY);
      const tableWidth = table.getWidth(pageWidth);
      const startX = data.settings.margin.left;

      if (tableHeight > 0) {
        // Adjust bracket position slightly outside the cells
        // Pass width + padding to ensure parentheses enclose the numbers
        drawMatrixParentheses(doc, startX - 2, initialY, tableWidth + 4, tableHeight);
      }
    }
  });

  // Return new Y position
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
  doc.setTextColor(219, 234, 254); // Blue-100
  doc.text(`Generado: ${timestamp.toLocaleString()}`, 14, 22);
  
  // Right aligned brand
  doc.text("MatrixSim Pro", pageWidth - 14, 16, { align: "right" });

  let currentY = 40;

  // --- Section 1: Operation Summary ---
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont("helvetica", "bold");
  doc.text('1. Definición de la Operación', 14, currentY);
  
  // Underline
  doc.setDrawColor(203, 213, 225); // Slate-300
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
    // Label step
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Paso ${index + 1}:`, 14, currentY - 5);
    
    // Render Matrix
    currentY = renderMatrixMath(doc, matrix, currentY);

    // Render Steps Text
    if (matrix.steps && matrix.steps.length > 0) {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 30;
      }

      // Steps Container Box (Light gray background)
      const boxStart = currentY - 5;
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // Slate-600
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
      
      // Draw left border line for steps context
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(16, boxStart + 2, 16, currentY - 2);
      
      currentY += 10;
    }
  });

  // --- Footer Page Numbers ---
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