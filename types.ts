export interface Matrix {
  id: string;
  name: string;
  rows: number;
  cols: number;
  data: number[][];
  steps?: string[]; // Array of strings describing the calculation steps
}

export enum OperationType {
  ADD = 'SUMA',
  SUBTRACT = 'RESTA',
  MULTIPLY = 'MULTIPLICACION',
  SCALAR_ADD = 'SUMA_ESCALAR',
  SCALAR_SUB = 'RESTA_ESCALAR',
  SCALAR_MUL = 'MULT_ESCALAR',
  TRANSPOSE = 'TRANSPUESTA',
  POWER = 'POTENCIA',
  EXPRESSION = 'EXPRESION_LIBRE',
}

export interface OperationLog {
  id: string;
  timestamp: Date;
  type: OperationType;
  details: string;
  inputMatrices: string[]; // Names of matrices used
  scalar?: number;
  result: Matrix | Matrix[];
}

export type Theme = 'light' | 'dark';

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpressionError';
  }
}