"use client";

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Square, ChefHat, Truck } from 'lucide-react';

export function StaffChecklistView() {
  const [items, setItems] = useState([
    { id: 1, text: 'Verificar cilindro de gás', done: true, category: 'equipamento' },
    { id: 2, text: 'Carregar forno no veículo', done: true, category: 'equipamento' },
    { id: 3, text: 'Contagem de massas (150 un)', done: false, category: 'insumos' },
    { id: 4, text: 'Verificar caixas térmicas', done: false, category: 'insumos' },
    { id: 5, text: 'Uniformes completos', done: false, category: 'pessoal' },
  ]);

  const toggleItem = (id: number) => {
    setItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const progress = Math.round((items.filter(i => i.done).length / items.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/50 shadow-sm">
        <h1 className="text-2xl font-bold text-on-surface mb-2 flex items-center gap-2">
          <ChefHat className="text-amber-600" />
          Checklist Pré-Evento
        </h1>
        <p className="text-on-surface-variant mb-6">Evento: Aniversário 15 Anos - Marina</p>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2 font-medium">
            <span className="text-on-surface">Progresso</span>
            <span className="text-amber-600">{progress}%</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-2.5">
            <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="space-y-3">
          {items.map(item => (
            <motion.div 
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleItem(item.id)}
              className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                item.done ? 'bg-surface-container-low border-outline-variant/50' : 'bg-surface-container-lowest border-amber-200 hover:border-amber-300 shadow-sm'
              }`}
            >
              <div className={`flex-shrink-0 ${item.done ? 'text-green-500' : 'text-stone-300'}`}>
                {item.done ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
              </div>
              <span className={`font-medium ${item.done ? 'text-on-surface-variant/70 line-through' : 'text-on-surface'}`}>
                {item.text}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-8">
          <button 
            disabled={progress < 100}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
              progress === 100 
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg' 
                : 'bg-surface-container text-on-surface-variant/70 cursor-not-allowed'
            }`}
          >
            <Truck className="w-5 h-5" />
            Liberar Saída
          </button>
        </div>
      </div>
    </div>
  );
}
