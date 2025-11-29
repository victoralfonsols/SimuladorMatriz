import { Matrix, OperationType } from '../types';

// Helper to create a deep copy of matrix data
export const cloneMatrixData = (data: number[][]): number[][] => {
  return data.map(row => [...row]);
};

// Helper to create a new empty matrix
export const createEmptyMatrix = (rows: number, cols: number, initialValue = 0): number[][] => {
  return Array.from({ length: rows }, () => Array(cols).fill(initialValue));
};

// Generate random matrix
export const generateRandomData = (rows: number, cols: number): number[][] => {
  return Array.from({ length: rows }, () => 
    Array.from({ length: cols }, () => Math.floor(Math.random() * 20) - 10)
  );
};

// Validation: Check dimensions for Add/Sub
export const validateDimensionsMatch = (matrices: Matrix[]): boolean => {
  if (matrices.length < 2) return false;
  const first = matrices[0];
  return matrices.every(m => m.rows === first.rows && m.cols === first.cols);
};

// Validation: Check dimensions for Multiplication (Chain)
export const validateMultiplicationChain = (matrices: Matrix[]): boolean => {
  if (matrices.length < 2) return false;
  for (let i = 0; i < matrices.length - 1; i++) {
    if (matrices[i].cols !== matrices[i + 1].rows) {
      return false;
    }
  }
  return true;
};

// Operation: Add Matrices
export const addMatrices = (matrices: Matrix[]): Matrix => {
  const rows = matrices[0].rows;
  const cols = matrices[0].cols;
  const resultData = createEmptyMatrix(rows, cols);
  const steps: string[] = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      const stepParts: string[] = [];
      
      matrices.forEach(m => {
        const val = m.data[i][j];
        sum += val;
        stepParts.push(val < 0 ? `(${val})` : `${val}`);
      });
      
      resultData[i][j] = sum;
      steps.push(`c${i+1}${j+1} = ${stepParts.join(' + ')} = ${sum}`);
    }
  }

  // Smart Name
  const name = matrices.length <= 3 
    ? `(${matrices.map(m => m.name).join(' + ')})`
    : 'Suma Total';

  return {
    id: crypto.randomUUID(),
    name,
    rows,
    cols,
    data: resultData,
    steps: ["Sumando elementos en la misma posición:", ...steps]
  };
};

// Operation: Subtract Matrices (Sequential: A - B - C...)
export const subtractMatrices = (matrices: Matrix[]): Matrix => {
  const rows = matrices[0].rows;
  const cols = matrices[0].cols;
  const resultData = createEmptyMatrix(rows, cols);
  const steps: string[] = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let val = matrices[0].data[i][j];
      const stepParts: string[] = [val < 0 ? `(${val})` : `${val}`];

      for (let k = 1; k < matrices.length; k++) {
        const subVal = matrices[k].data[i][j];
        val -= subVal;
        stepParts.push(subVal < 0 ? `(${subVal})` : `${subVal}`);
      }
      
      resultData[i][j] = val;
      steps.push(`c${i+1}${j+1} = ${stepParts.join(' - ')} = ${val}`);
    }
  }

  // Smart Name
  const name = matrices.length <= 3 
    ? `(${matrices.map(m => m.name).join(' - ')})`
    : 'Resta Secuencial';

  return {
    id: crypto.randomUUID(),
    name,
    rows,
    cols,
    data: resultData,
    steps: ["Restando secuencialmente elementos en la misma posición:", ...steps]
  };
};

// Operation: Multiply Two Matrices (Strict Matrix x Matrix)
const multiplyTwoMatrices = (A: Matrix, B: Matrix): Matrix => {
  const resultData = createEmptyMatrix(A.rows, B.cols);
  const steps: string[] = [];
  
  for (let i = 0; i < A.rows; i++) {
    for (let j = 0; j < B.cols; j++) {
      let sum = 0;
      const calcParts: string[] = [];
      
      for (let k = 0; k < A.cols; k++) {
        const valA = A.data[i][k];
        const valB = B.data[k][j];
        sum += valA * valB;
        calcParts.push(`(${valA} · ${valB})`);
      }
      
      const finalVal = parseFloat(sum.toFixed(4));
      resultData[i][j] = finalVal;
      steps.push(`c${i+1}${j+1} = ${calcParts.join(' + ')} = ${finalVal}`);
    }
  }

  return {
    id: crypto.randomUUID(),
    name: `(${A.name} · ${B.name})`,
    rows: A.rows,
    cols: B.cols,
    data: resultData,
    steps: [`Producto fila por columna (${A.name} x ${B.name}):`, ...steps]
  };
};

// Operation: Multiply Chain
export const multiplyMatrices = (matrices: Matrix[]): Matrix => {
  let currentResult = matrices[0];
  let accumulatedSteps: string[] = [];

  for (let i = 1; i < matrices.length; i++) {
    const nextMatrix = matrices[i];
    const result = multiplyTwoMatrices(currentResult, nextMatrix);
    
    // Add header to distinguish steps if multiple multiplications
    if (matrices.length > 2) {
      accumulatedSteps.push(`--- Paso ${i}: ${currentResult.name} x ${nextMatrix.name} ---`);
    }
    if (result.steps) accumulatedSteps.push(...result.steps);
    
    currentResult = result;
    // Rename intermediate result for clarity in next steps if needed
    // currentResult.name is already updated by multiplyTwoMatrices
  }

  return {
    ...currentResult,
    steps: accumulatedSteps
  };
};

// Operation: Transpose
export const transposeMatrix = (matrix: Matrix): Matrix => {
  const newRows = matrix.cols;
  const newCols = matrix.rows;
  const resultData = createEmptyMatrix(newRows, newCols);
  const steps: string[] = [];

  for (let i = 0; i < matrix.rows; i++) {
    for (let j = 0; j < matrix.cols; j++) {
      resultData[j][i] = matrix.data[i][j];
      steps.push(`c${j+1}${i+1} toma el valor de a${i+1}${j+1} (${matrix.data[i][j]})`);
    }
  }

  return {
    id: crypto.randomUUID(),
    name: `${matrix.name}ᵀ`,
    rows: newRows,
    cols: newCols,
    data: resultData,
    steps: ["Intercambiando filas por columnas:", ...steps]
  };
};

// Operation: Power
export const powerMatrix = (matrix: Matrix, exponent: number): Matrix => {
  if (matrix.rows !== matrix.cols) {
    throw new Error(`La matriz ${matrix.name} debe ser cuadrada para elevar a potencia.`);
  }
  if (!Number.isInteger(exponent) || exponent < 1) {
    throw new Error("El exponente debe ser un entero positivo mayor o igual a 1.");
  }

  if (exponent === 1) {
    return { ...matrix, id: crypto.randomUUID(), name: `${matrix.name}^1`, steps: ["Potencia 1 es la misma matriz."] };
  }

  let result = matrix;
  let allSteps: string[] = [];

  for (let i = 1; i < exponent; i++) {
    const nextResult = multiplyTwoMatrices(result, matrix);
    allSteps.push(`--- Potencia ${i+1} ---`);
    if (nextResult.steps) allSteps.push(...nextResult.steps);
    result = nextResult;
  }

  return {
    ...result,
    name: `${matrix.name}^${exponent}`,
    id: crypto.randomUUID(),
    steps: allSteps
  };
};

// Operation: Scalar
export const scalarOperation = (matrix: Matrix, scalar: number, type: OperationType): Matrix => {
  const steps: string[] = [];
  
  const resultData = matrix.data.map((row, i) => 
    row.map((val, j) => {
      let res = val;
      let opSymbol = '';
      
      if (type === OperationType.SCALAR_ADD) { res = val + scalar; opSymbol = '+'; }
      if (type === OperationType.SCALAR_SUB) { res = val - scalar; opSymbol = '-'; }
      if (type === OperationType.SCALAR_MUL) { res = val * scalar; opSymbol = '·'; }
      
      res = parseFloat(res.toFixed(4));
      steps.push(`c${i+1}${j+1} = ${val} ${opSymbol} ${scalar} = ${res}`);
      return res;
    })
  );

  return {
    id: crypto.randomUUID(),
    name: `${scalar}(${matrix.name})`, 
    rows: matrix.rows,
    cols: matrix.cols,
    data: resultData,
    steps: [`Aplicando escalar (${scalar}) a cada elemento:`, ...steps]
  };
};

// --- Helpers for Parser ---

// Generic Multiply (Matrix*Matrix or Scalar*Matrix or Matrix*Scalar)
export const genericMultiply = (a: Matrix | number, b: Matrix | number): Matrix | number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a * b;
  }
  
  if (typeof a === 'number' && typeof b !== 'number') {
    return scalarOperation(b, a, OperationType.SCALAR_MUL);
  }

  if (typeof a !== 'number' && typeof b === 'number') {
    return scalarOperation(a, b, OperationType.SCALAR_MUL);
  }

  // Both matrices
  const mA = a as Matrix;
  const mB = b as Matrix;
  
  if (mA.cols !== mB.rows) {
    throw new Error(`Dimensiones incompatibles para multiplicación: ${mA.rows}x${mA.cols} y ${mB.rows}x${mB.cols}`);
  }

  return multiplyTwoMatrices(mA, mB);
};

export const genericAdd = (a: Matrix | number, b: Matrix | number): Matrix | number => {
  if (typeof a === 'number' && typeof b === 'number') return a + b;
  if (typeof a !== 'object' || typeof b !== 'object') throw new Error("No se puede sumar un escalar con una matriz directamente (solo operaciones elementales definidas).");
  
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error(`Dimensiones incompatibles para suma: ${a.rows}x${a.cols} vs ${b.rows}x${b.cols}`);
  }
  return addMatrices([a, b]);
};

export const genericSubtract = (a: Matrix | number, b: Matrix | number): Matrix | number => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a !== 'object' || typeof b !== 'object') throw new Error("No se puede restar un escalar con una matriz directamente.");
  
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw new Error(`Dimensiones incompatibles para resta: ${a.rows}x${a.cols} vs ${b.rows}x${b.cols}`);
  }
  return subtractMatrices([a, b]);
};