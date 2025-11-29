import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Matrix } from '../types';

// Helper to draw brackets around the matrix
const drawBrackets = (doc: jsPDF, x: number, y: number, width: number, height: number) => {
  const bracketDepth = 3; // Depth of the bracket arms
  const lineWidth = 0.5;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(lineWidth);

  // Left Bracket [
  doc.line(x + bracketDepth, y, x, y); // Top arm
  doc.line(x, y, x, y + height);       // Vertical line
  doc.line(x, y + height, x + bracketDepth, y + height); // Bottom arm

  // Right Bracket ]
  const rightX = x + width;
  doc.line(rightX - bracketDepth, y, rightX, y); // Top arm
  doc.line(rightX, y, rightX, y + height);       // Vertical line
  doc.line(rightX, y + height, rightX - bracketDepth, y + height); // Bottom arm
};

const renderMatrixMath = (doc: jsPDF, matrix: Matrix, startY: number): number => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Check for page break space (approx header + 3 rows)
  if (startY > doc.internal.pageSize.height - 40) {
    doc.addPage();
    startY = 20;
  }

  // Draw Matrix Name
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(`${matrix.name} =`, 14, startY + 5); // Label on the left
  
  // Prepare data
  const body = matrix.data.map(row => row.map(val => val.toString()));

  // Render numbers without borders (Plain theme)
  autoTable(doc, {
    startY: startY - 2, // Align roughly with the text "A ="
    body: body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 10,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2,
      minCellWidth: 8
    },
    margin: { left: 35 }, // Indent to make room for "Name ="
    tableWidth: 'wrap',   // Only take necessary width
    didDrawPage: (data) => {
      // Draw brackets using the calculated table dimensions
      const table = data.table;
      const finalY = table.finalY || 0;
      const initialY = data.settings.startY;
      const tableHeight = (finalY - initialY);
      
      // Calculate width strictly based on content
      const tableWidth = table.getWidth(pageWidth);
      const startX = data.settings.margin.left;

      if (tableHeight > 0) {
        drawBrackets(doc, startX, initialY, tableWidth, tableHeight);
      }
    }
  });

  return (doc as any).lastAutoTable.finalY + 10;
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

  // --- Header ---
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text('Reporte de Operaciones Matriciales', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generado: ${timestamp.toLocaleString()}`, 14, 28);
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 32, pageWidth - 14, 32);

  let currentY = 45;

  // --- Operation Info ---
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text('1. Definición de la Operación', 14, currentY);
  currentY += 8;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Tipo: ${operationType}`, 20, currentY);
  currentY += 6;
  if (scalar !== null) {
    doc.text(`Escalar (k): ${scalar}`, 20, currentY);
    currentY += 6;
  }
  currentY += 4;

  // --- Input Matrices ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text('2. Matrices de Entrada', 14, currentY);
  currentY += 10;

  matrices.forEach((matrix) => {
    currentY = renderMatrixMath(doc, matrix, currentY);
  });

  // --- Results ---
  if (currentY > doc.internal.pageSize.height - 50) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 5;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 80, 0);
  doc.text('3. Resultado', 14, currentY);
  currentY += 10;

  results.forEach((matrix) => {
    // Render Result Matrix
    currentY = renderMatrixMath(doc, matrix, currentY);

    // --- Step by Step ---
    if (matrix.steps && matrix.steps.length > 0) {
      if (currentY > doc.internal.pageSize.height - 40) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "bold italic");
      doc.text('Procedimiento detallado:', 14, currentY);
      currentY += 6;
      
      doc.setFontSize(9);
      doc.setFont("courier", "normal"); // Monospace for alignment
      
      matrix.steps.forEach(step => {
        if (currentY > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = 20;
        }
        
        // Clean up step string just in case
        const cleanStep = step.replace(/\s+/g, ' '); 
        const lines = doc.splitTextToSize(cleanStep, pageWidth - 30);
        
        // Bullet point
        doc.text('•', 16, currentY);
        doc.text(lines, 22, currentY);
        
        currentY += (lines.length * 4) + 2;
      });

      currentY += 10;
    }
  });

  // --- Footer ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `MatrixSim Pro - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`reporte_matrices_${Date.now()}.pdf`);
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
  let content = `Matriz: ${matrix.name}\nDimensiones: ${matrix.rows}x${matrix.cols}\n\n`;
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
