import React, { useState, useEffect } from 'react';
import { Matrix, OperationType } from './types';
import { 
  addMatrices, 
  subtractMatrices, 
  multiplyMatrices, 
  scalarOperation, 
  transposeMatrix, 
  powerMatrix,
  createEmptyMatrix,
  generateRandomData,
  validateDimensionsMatch,
  validateMultiplicationChain
} from './utils/matrixMath';
import { evaluateExpression } from './utils/expressionParser';
import { generatePDFReport, exportToCSV, exportToTXT } from './utils/pdfGenerator';
import MatrixCard from './components/MatrixCard';
import { DEFAULT_ROWS, DEFAULT_COLS, MAX_ROWS, MAX_COLS } from './constants';

const App: React.FC = () => {
  // State
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  // Store selected IDs in order of selection [id1, id2, id3]
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [results, setResults] = useState<Matrix[]>([]);
  
  // Params
  const [scalar, setScalar] = useState<number>(3);
  const [exponent, setExponent] = useState<number>(2);
  const [autoAddResult, setAutoAddResult] = useState<boolean>(false);
  const [expression, setExpression] = useState<string>('');

  // Config
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [newMatrixConfig, setNewMatrixConfig] = useState({ rows: DEFAULT_ROWS, cols: DEFAULT_COLS });
  const [error, setError] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<string | null>(null);

  // Initialize theme
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // Matrix Management
  const addMatrix = () => {
    const id = crypto.randomUUID();
    const name = `Matriz ${String.fromCharCode(65 + (matrices.length % 26))}${Math.floor(matrices.length / 26) || ''}`;
    const newMatrix: Matrix = {
      id,
      name,
      rows: newMatrixConfig.rows,
      cols: newMatrixConfig.cols,
      data: createEmptyMatrix(newMatrixConfig.rows, newMatrixConfig.cols)
    };
    setMatrices([...matrices, newMatrix]);
    // Auto select new matrix is annoying if building complex equations, removed.
    setError(null);
  };

  const addRandomMatrix = () => {
    const id = crypto.randomUUID();
    const name = `Matriz ${String.fromCharCode(65 + (matrices.length % 26))}`;
    const newMatrix: Matrix = {
      id,
      name,
      rows: newMatrixConfig.rows,
      cols: newMatrixConfig.cols,
      data: generateRandomData(newMatrixConfig.rows, newMatrixConfig.cols)
    };
    setMatrices([...matrices, newMatrix]);
    setError(null);
  };

  const promoteResultToInput = (resultMatrix: Matrix) => {
    // Clone to avoid reference issues
    const newMatrix = {
      ...resultMatrix,
      id: crypto.randomUUID(),
      name: `R${matrices.length + 1}` // Keep names simple for parser
    };
    setMatrices([...matrices, newMatrix]);
    // Automatically select the new matrix for flow
    setSelectedIds([...selectedIds, newMatrix.id]);
    setResults(results.filter(r => r.id !== resultMatrix.id)); // Remove from results once used
  };

  const updateMatrixData = (id: string, r: number, c: number, val: number) => {
    setMatrices(matrices.map(m => {
      if (m.id === id) {
        // Deep copy of the data array to ensure immutability
        const newData = m.data.map((row, rowIndex) => {
           if (rowIndex === r) {
             const newRow = [...row];
             newRow[c] = val;
             return newRow;
           }
           return row;
        });
        return { ...m, data: newData };
      }
      return m;
    }));
  };

  const deleteMatrix = (id: string) => {
    setMatrices(matrices.filter(m => m.id !== id));
    setSelectedIds(selectedIds.filter(sid => sid !== id));
  };

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      // Remove keeping order of others
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      // Append to end (preserving order)
      setSelectedIds([...selectedIds, id]);
    }
  };

  const clearAll = () => {
    setMatrices([]);
    setSelectedIds([]);
    setResults([]);
    setError(null);
    setExpression('');
    setLastOperation(null);
  };

  // Expression Solver
  const handleSolveExpression = () => {
    setError(null);
    setResults([]);
    if (!expression.trim()) return;

    try {
      // Parser now returns an array of matrices (calculation trace)
      const executionTrace = evaluateExpression(expression, matrices);
      
      setResults(executionTrace);
      setLastOperation(`Expresión: ${expression}`);
      
      if (autoAddResult && executionTrace.length > 0) {
        // Only promote final result
        promoteResultToInput(executionTrace[executionTrace.length - 1]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Operations
  const performOperation = (op: OperationType) => {
    setError(null);
    setResults([]);
    
    // Get matrices IN ORDER of selection
    const selectedMatrices = selectedIds
      .map(id => matrices.find(m => m.id === id))
      .filter((m): m is Matrix => !!m);
    
    if (selectedMatrices.length === 0) {
      setError("Seleccione al menos una matriz.");
      return;
    }

    try {
      let calcResults: Matrix[] = [];

      // Unary / Transformation Operations (Apply to EACH selected matrix individually)
      if ([OperationType.TRANSPOSE, OperationType.POWER, OperationType.SCALAR_ADD, OperationType.SCALAR_SUB, OperationType.SCALAR_MUL].includes(op)) {
        calcResults = selectedMatrices.map(m => {
          if (op === OperationType.TRANSPOSE) return transposeMatrix(m);
          if (op === OperationType.POWER) return powerMatrix(m, exponent);
          return scalarOperation(m, scalar, op);
        });
      } 
      // Binary / Aggregate Operations (Combine ALL selected matrices)
      else {
        if (selectedMatrices.length < 2) throw new Error("Esta operación requiere al menos 2 matrices.");

        switch (op) {
          case OperationType.ADD:
            if (!validateDimensionsMatch(selectedMatrices)) throw new Error("Dimensiones incompatibles para suma.");
            calcResults = [addMatrices(selectedMatrices)];
            break;

          case OperationType.SUBTRACT:
            if (!validateDimensionsMatch(selectedMatrices)) throw new Error("Dimensiones incompatibles para resta.");
            calcResults = [subtractMatrices(selectedMatrices)];
            break;

          case OperationType.MULTIPLY:
            if (!validateMultiplicationChain(selectedMatrices)) throw new Error("Dimensiones incompatibles para multiplicación en cadena (Cols A != Filas B).");
            calcResults = [multiplyMatrices(selectedMatrices)];
            break;
        }
      }

      // Handle Auto-Add flow
      if (autoAddResult) {
        const promotedMatrices = calcResults.map(r => ({
          ...r,
          id: crypto.randomUUID(),
          name: `(${r.name})`
        }));
        setMatrices(prev => [...prev, ...promotedMatrices]);
        setSelectedIds([]);
        setLastOperation(`${op} (Auto-agregado)`);
      } else {
        setResults(calcResults);
        setLastOperation(op);
      }

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportPDF = () => {
    if (results.length === 0 && matrices.length === 0) return;
    const selectedMatrices = selectedIds.map(id => matrices.find(m => m.id === id)!).filter(Boolean);
    
    // If we have an expression result, we want to export all the matrices in the 'results' array (which includes intermediates)
    generatePDFReport(
      selectedMatrices.length > 0 ? selectedMatrices : matrices,
      results,
      lastOperation || 'Reporte General',
      lastOperation?.includes('ESCALAR') ? scalar : null,
      new Date()
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary selection:text-white bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b dark:border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-2.5 rounded-lg shadow-sm">
              <i className="fas fa-layer-group text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight tracking-tight">MatrixSim Pro</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block font-medium">Simulador Algebraico Profesional</p>
            </div>
          </div>
          
          <div className="flex gap-2">
             <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition flex items-center justify-center"
            >
              <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`}></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 grid lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Configuration & Operations */}
        <aside className="lg:col-span-3 space-y-6">
          
          {/* Creation Panel */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <i className="fas fa-plus-circle text-primary"></i> Nueva Matriz
            </h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Filas</label>
                <input 
                  type="number" 
                  min="1" max={MAX_ROWS}
                  value={newMatrixConfig.rows}
                  onChange={(e) => setNewMatrixConfig({...newMatrixConfig, rows: parseInt(e.target.value) || 1})}
                  className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white text-center focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Cols</label>
                <input 
                  type="number" 
                  min="1" max={MAX_COLS}
                  value={newMatrixConfig.cols}
                  onChange={(e) => setNewMatrixConfig({...newMatrixConfig, cols: parseInt(e.target.value) || 1})}
                  className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white text-center focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={addMatrix}
                className="py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-medium transition text-sm flex flex-col items-center justify-center gap-1"
              >
                <i className="fas fa-border-all"></i> Vacía
              </button>
              <button 
                onClick={addRandomMatrix}
                className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-transparent dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 text-slate-700 rounded-lg font-medium transition text-sm flex flex-col items-center justify-center gap-1"
              >
                <i className="fas fa-dice"></i> Random
              </button>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
             <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox" 
                  id="autoAdd"
                  checked={autoAddResult}
                  onChange={(e) => setAutoAddResult(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <label htmlFor="autoAdd" className="text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Auto-agregar resultado
                </label>
             </div>
             <p className="text-xs text-slate-500 leading-tight">
               Útil para operaciones secuenciales.
             </p>
          </div>

          {/* Operations Panel */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <i className="fas fa-calculator text-primary"></i> Manual
            </h2>

            {/* Transformaciones (Unarias) */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b dark:border-slate-700 pb-1">
                Individuales
              </div>
              
              {/* Scalar */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">k =</span>
                  <input 
                    type="number" 
                    value={scalar}
                    onChange={(e) => setScalar(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1">
                   <button onClick={() => performOperation(OperationType.SCALAR_MUL)} className="text-xs py-1.5 px-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded hover:text-primary dark:hover:text-primary transition font-medium">* k</button>
                   <button onClick={() => performOperation(OperationType.SCALAR_ADD)} className="text-xs py-1.5 px-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded hover:text-primary dark:hover:text-primary transition font-medium">+ k</button>
                   <button onClick={() => performOperation(OperationType.SCALAR_SUB)} className="text-xs py-1.5 px-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded hover:text-primary dark:hover:text-primary transition font-medium">- k</button>
                </div>
              </div>

              {/* Power / Transpose */}
              <div className="grid grid-cols-2 gap-2">
                 <button 
                  onClick={() => performOperation(OperationType.TRANSPOSE)}
                  className="py-2 px-3 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 rounded-lg text-sm font-medium transition"
                 >
                   Transpuesta
                 </button>
                 
                 <div className="flex rounded-lg shadow-sm">
                   <input 
                      type="number" 
                      min="1"
                      value={exponent}
                      onChange={(e) => setExponent(parseInt(e.target.value) || 1)}
                      className="w-10 p-1 text-center text-sm border-y border-l rounded-l-lg bg-gray-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none"
                    />
                   <button 
                    onClick={() => performOperation(OperationType.POWER)}
                    className="flex-grow py-1 px-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 rounded-r-lg text-sm font-medium transition border-l-0"
                   >
                     Pot. (n)
                   </button>
                 </div>
              </div>
            </div>

            {/* Combinaciones (Binarias) */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b dark:border-slate-700 pb-1">
                Grupales
              </div>
              <p className="text-[10px] text-slate-500 italic">
                El orden de selección importa
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => performOperation(OperationType.ADD)} className="op-btn-primary" title="Suma Matr 1 + Matr 2 + ...">
                  <i className="fas fa-plus mr-2"></i> Sumar
                </button>
                <button onClick={() => performOperation(OperationType.SUBTRACT)} className="op-btn-primary" title="Resta Matr 1 - Matr 2 - ...">
                  <i className="fas fa-minus mr-2"></i> Restar
                </button>
                <button onClick={() => performOperation(OperationType.MULTIPLY)} className="op-btn-primary" title="Multiplicar Matr 1 x Matr 2 x ...">
                  <i className="fas fa-times mr-2"></i> Multiplicar
                </button>
              </div>
            </div>

            <div className="pt-4 border-t dark:border-slate-700">
              <button 
                onClick={clearAll}
                className="w-full py-2.5 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900 dark:text-red-300 rounded-lg transition font-medium text-sm flex items-center justify-center"
              >
                <i className="fas fa-trash-alt mr-2"></i> Reiniciar Todo
              </button>
            </div>
          </div>
        </aside>

        {/* Center Panel: Workspace */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r shadow-sm flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <i className="fas fa-exclamation-circle text-xl"></i>
                <p className="font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="hover:bg-red-100 p-1 rounded"><i className="fas fa-times"></i></button>
            </div>
          )}

          {/* Advanced Expression Solver */}
          <section className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 shadow-lg text-white">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <i className="fas fa-code-branch"></i> Calculadora de Expresiones
            </h2>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-grow relative">
                <input 
                  type="text" 
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="Ej: 3*A' - B^2 + C  (Usa las letras de las matrices)"
                  className="w-full p-3 rounded-lg border-none focus:ring-2 focus:ring-blue-400 bg-slate-600 text-white placeholder-slate-400 font-mono text-lg shadow-inner"
                />
                <div className="absolute right-3 top-3 text-xs text-slate-400 bg-slate-700 px-2 rounded pointer-events-none">
                  Soporta: +, -, *, ^, '
                </div>
              </div>
              <button 
                onClick={handleSolveExpression}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg shadow-md transition transform active:scale-95 whitespace-nowrap"
              >
                Calculadora <i className="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-300 font-mono">
              <span><span className="text-blue-300 font-bold">A'</span> = Transpuesta</span>
              <span><span className="text-blue-300 font-bold">^2</span> = Potencia</span>
              <span><span className="text-blue-300 font-bold">3*A</span> = Escalar</span>
              <span><span className="text-blue-300 font-bold">A*B</span> = Producto</span>
            </div>
          </section>

          {/* Input Matrices Area */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                  <span className="bg-slate-800 text-white dark:bg-slate-700 text-sm px-2.5 py-0.5 rounded-full font-mono">{matrices.length}</span> 
                  Espacio de Trabajo
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Usa los nombres de variable (<span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">A</span>, <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">B</span>) en la calculadora superior.
                </p>
              </div>
            </div>

            {matrices.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-16 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="bg-white dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fas fa-square-root-alt text-2xl text-slate-300"></i>
                </div>
                <p className="font-medium">No hay matrices definidas</p>
                <p className="text-sm mt-1">Crea una nueva matriz desde el panel izquierdo</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {matrices.map(matrix => (
                  <MatrixCard 
                    key={matrix.id}
                    matrix={matrix}
                    selectionIndex={selectedIds.indexOf(matrix.id)}
                    onToggleSelect={toggleSelection}
                    onUpdateData={updateMatrixData}
                    onDelete={deleteMatrix}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Results Area */}
          {results.length > 0 && (
            <section className="animate-fade-in-up pt-4">
              <div className="flex justify-between items-center mb-5 pb-4 border-b dark:border-slate-700">
                <div>
                  <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <i className="fas fa-poll-h"></i> Resultados y Pasos
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Se muestran todos los cálculos intermedios realizados.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm"
                  >
                    <i className="fas fa-file-pdf"></i> Descargar PDF Completo
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.map((result, idx) => (
                  <div key={idx} className="relative group flex flex-col h-full">
                    {/* Badge for Step Number */}
                    <div className="absolute -top-3 left-4 bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded shadow z-10">
                      Paso {idx + 1}
                    </div>
                    
                    <div className="flex-grow">
                      <MatrixCard 
                        matrix={result}
                        selectionIndex={-1}
                        onToggleSelect={() => {}}
                        onUpdateData={() => {}}
                        onDelete={() => {}}
                        readOnly={true}
                      />
                    </div>
                    
                    {/* Action Bar for Result */}
                    <div className="mt-2 flex gap-2">
                      <button 
                        onClick={() => promoteResultToInput(result)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                        title="Usar esta matriz para otra operación"
                      >
                        <i className="fas fa-arrow-up"></i> Usar
                      </button>
                      <button onClick={() => exportToCSV(result)} className="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-3 rounded-lg border dark:border-slate-600 shadow-sm text-xs font-bold hover:bg-gray-50">CSV</button>
                      <button onClick={() => exportToTXT(result)} className="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-3 rounded-lg border dark:border-slate-600 shadow-sm text-xs font-bold hover:bg-gray-50">TXT</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Styles injection for custom buttons */}
      <style>{`
        .op-btn-primary {
          @apply w-full py-2.5 px-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition flex items-center justify-start shadow-sm;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
      `}</style>
    </div>
  );
};

export default App;