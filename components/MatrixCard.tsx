import React, { useState } from 'react';
import { Matrix } from '../types';

interface MatrixCardProps {
  matrix: Matrix;
  selectionIndex: number; // -1 if not selected, 0, 1, 2... if selected
  onToggleSelect: (id: string) => void;
  onUpdateData: (id: string, row: number, col: number, value: number) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

const MatrixCard: React.FC<MatrixCardProps> = ({ 
  matrix, 
  selectionIndex, 
  onToggleSelect, 
  onUpdateData, 
  onDelete,
  readOnly = false
}) => {
  
  const [showSteps, setShowSteps] = useState(false);
  const isSelected = selectionIndex !== -1;

  // Attempt to determine the Variable Name for the Expression Parser
  const getVarAlias = (name: string) => {
    if (name.toUpperCase().startsWith("MATRIZ ")) return name.substring(7).trim().toUpperCase();
    if (name.length <= 2) return name.toUpperCase();
    return null;
  };

  const alias = getVarAlias(matrix.name);

  return (
    <div 
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-200 shadow-sm flex flex-col
        ${isSelected 
          ? 'border-primary bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }
      `}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {!readOnly && (
            <div className="relative">
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => onToggleSelect(matrix.id)}
                className="w-5 h-5 text-primary rounded focus:ring-primary cursor-pointer opacity-0 absolute inset-0 z-10"
              />
              <div className={`
                w-5 h-5 rounded border flex items-center justify-center text-xs font-bold transition-colors
                ${isSelected 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-white border-gray-300 text-transparent'
                }
              `}>
                {isSelected ? selectionIndex + 1 : ''}
              </div>
            </div>
          )}
          
          <div className="flex flex-col">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate max-w-[150px]" title={matrix.name}>
              {matrix.name} 
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              [{matrix.rows}x{matrix.cols}]
              {alias && <span className="ml-2 bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-500 dark:text-slate-300">Var: {alias}</span>}
            </span>
          </div>
        </div>
        {!readOnly && (
          <button 
            onClick={() => onDelete(matrix.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition"
            title="Eliminar matriz"
          >
            <i className="fas fa-trash"></i>
          </button>
        )}
      </div>

      <div className="overflow-x-auto custom-scrollbar flex-grow">
        <div 
          className="grid gap-1 mx-auto"
          style={{ 
            gridTemplateColumns: `repeat(${matrix.cols}, minmax(3rem, 1fr))`,
            maxWidth: '100%'
          }}
        >
          {matrix.data.map((row, i) => (
            row.map((val, j) => (
              <input
                key={`${i}-${j}`}
                type="number"
                value={val}
                readOnly={readOnly}
                onChange={(e) => onUpdateData(matrix.id, i, j, parseFloat(e.target.value) || 0)}
                className={`
                  w-full text-center py-1 px-1 text-sm rounded border
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                  ${readOnly 
                    ? 'bg-gray-100 dark:bg-slate-700 border-transparent font-semibold' 
                    : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600'
                  }
                  dark:text-white transition-colors
                `}
              />
            ))
          ))}
        </div>
      </div>
      
      {/* Visual bracket effect */}
      <div className="absolute top-12 bottom-16 left-2 w-2 border-l-2 border-t-2 border-b-2 border-slate-300 dark:border-slate-600 rounded-l-md pointer-events-none"></div>
      <div className="absolute top-12 bottom-16 right-2 w-2 border-r-2 border-t-2 border-b-2 border-slate-300 dark:border-slate-600 rounded-r-md pointer-events-none"></div>

      {/* Steps Viewer Toggle */}
      {readOnly && matrix.steps && matrix.steps.length > 0 && (
        <div className="mt-4">
          <button 
            onClick={() => setShowSteps(!showSteps)}
            className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-400 font-medium flex items-center justify-center gap-1 py-1 border-t dark:border-slate-700"
          >
            <i className={`fas fa-chevron-${showSteps ? 'up' : 'down'}`}></i>
            {showSteps ? 'Ocultar pasos' : 'Ver paso a paso'}
          </button>
          
          {showSteps && (
            <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded text-[10px] font-mono text-slate-600 dark:text-slate-400 max-h-32 overflow-y-auto custom-scrollbar border dark:border-slate-700">
               {matrix.steps.map((step, idx) => (
                 <div key={idx} className="whitespace-pre-wrap mb-1 last:mb-0 border-b dark:border-slate-700 last:border-0 pb-1">{step}</div>
               ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatrixCard;