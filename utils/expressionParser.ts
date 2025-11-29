import { Matrix, ExpressionError } from '../types';
import { 
  genericMultiply, 
  genericAdd, 
  genericSubtract, 
  powerMatrix, 
  transposeMatrix 
} from './matrixMath';

type Token = {
  type: 'NUMBER' | 'IDENTIFIER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA';
  value: string;
};

// Tokenizer
const tokenize = (expr: string): Token[] => {
  const tokens: Token[] = [];
  const regex = /([0-9]+(\.[0-9]+)?)|([a-zA-Z]+)|(['+\-*/^(),])|(\s+)/g;
  
  let match;
  while ((match = regex.exec(expr)) !== null) {
    const [full, num, _, id, op, space] = match;
    if (space) continue;
    
    if (num) tokens.push({ type: 'NUMBER', value: num });
    else if (id) tokens.push({ type: 'IDENTIFIER', value: id });
    else if (op) {
      if (op === '(') tokens.push({ type: 'LPAREN', value: '(' });
      else if (op === ')') tokens.push({ type: 'RPAREN', value: ')' });
      else tokens.push({ type: 'OPERATOR', value: op });
    }
  }
  return tokens;
};

// Shunting-yard algorithm to RPN
const toRPN = (tokens: Token[]): Token[] => {
  const outputQueue: Token[] = [];
  const operatorStack: Token[] = [];
  
  const precedence: Record<string, number> = {
    '+': 1, '-': 1,
    '*': 2, '/': 2,
    '^': 3,
    '\'': 4 // Transpose postfix
  };

  tokens.forEach((token, index) => {
    if (token.type === 'NUMBER' || token.type === 'IDENTIFIER') {
      outputQueue.push(token);
    } else if (token.type === 'OPERATOR') {
      // Handle Transpose (') as special postfix
      if (token.value === '\'') {
         // High precedence, left assoc, immediate
      }

      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type === 'OPERATOR' &&
        precedence[operatorStack[operatorStack.length - 1].value] >= precedence[token.value] &&
        token.value !== '^' // ^ is right associative usually, but for matrix strict left is safer/simpler
      ) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(token);
    } else if (token.type === 'LPAREN') {
      operatorStack.push(token);
    } else if (token.type === 'RPAREN') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type !== 'LPAREN') {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.pop(); // Pop (
    }
  });

  while (operatorStack.length > 0) {
    outputQueue.push(operatorStack.pop()!);
  }

  return outputQueue;
};

// Evaluator: Returns an Array of Matrices (The calculation trace)
export const evaluateExpression = (expression: string, availableMatrices: Matrix[]): Matrix[] => {
  if (!expression.trim()) throw new ExpressionError("La expresión está vacía.");

  // Map "A", "B", "C" to matrices
  const matrixMap: Record<string, Matrix> = {};
  availableMatrices.forEach((m, idx) => {
    // Strategy: Match by exact name OR by 'Matriz X' pattern suffix
    matrixMap[m.name.toUpperCase()] = m;
    
    // Auto-alias: If name is "Matriz A", map "A" to it.
    if (m.name.toUpperCase().startsWith("MATRIZ ")) {
      const shortName = m.name.substring(7).trim().toUpperCase();
      if (shortName) matrixMap[shortName] = m;
    }
    
    // Fallback: Use Char Code index if standard naming
    const charCode = String.fromCharCode(65 + idx);
    if (!matrixMap[charCode]) matrixMap[charCode] = m;
  });

  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  const stack: (Matrix | number)[] = [];
  const executionTrace: Matrix[] = []; // Store intermediate matrices

  const pushResult = (val: Matrix | number) => {
    if (typeof val === 'object') {
      // It's a matrix result (intermediate or final)
      // Check if it's already in the availableMatrices to avoid duplicating inputs
      const isInput = Object.values(matrixMap).some(m => m.id === val.id);
      if (!isInput) {
        executionTrace.push(val);
      }
    }
    stack.push(val);
  };

  for (const token of rpn) {
    if (token.type === 'NUMBER') {
      stack.push(parseFloat(token.value));
    } else if (token.type === 'IDENTIFIER') {
      const name = token.value.toUpperCase();
      const mat = matrixMap[name];
      if (!mat) throw new ExpressionError(`Matriz '${token.value}' no encontrada.`);
      stack.push(mat);
    } else if (token.type === 'OPERATOR') {
      let resultOp: Matrix | number;

      if (token.value === '\'') {
        const a = stack.pop();
        if (!a || typeof a === 'number') throw new ExpressionError("Transpuesta solo aplica a matrices.");
        resultOp = transposeMatrix(a);
      } else {
        const b = stack.pop();
        const a = stack.pop();

        if (a === undefined || b === undefined) throw new ExpressionError("Operación inválida (faltan operandos).");

        switch (token.value) {
          case '+':
            resultOp = genericAdd(a, b);
            break;
          case '-':
            resultOp = genericSubtract(a, b);
            break;
          case '*':
            resultOp = genericMultiply(a, b);
            break;
          case '^':
            if (typeof a !== 'object' || typeof b !== 'number') throw new ExpressionError("Potencia requiere base Matriz y exponente Numérico.");
            resultOp = powerMatrix(a, b);
            break;
          default:
            throw new ExpressionError(`Operador desconocido: ${token.value}`);
        }
      }
      pushResult(resultOp);
    }
  }

  if (stack.length !== 1) throw new ExpressionError("Error en la evaluación de la expresión.");
  
  const finalResult = stack[0];
  if (typeof finalResult === 'number') throw new ExpressionError("El resultado final debe ser una Matriz, no un número.");

  // Ensure unique IDs in the trace just in case
  return executionTrace;
};