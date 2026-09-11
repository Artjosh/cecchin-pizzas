import React from 'react';
import { Truck, PenTool as Tool, AlertTriangle, Plus } from 'lucide-react';

export function AdminFleetView() {
  const fleet = [
    { id: 'F01', type: 'Forno Móvel', status: 'operacional', lastMaintenance: '10/08/2026' },
    { id: 'F02', type: 'Forno Móvel', status: 'manutencao', lastMaintenance: '05/09/2026' },
    { id: 'V01', type: 'Fiorino', status: 'operacional', lastMaintenance: '20/08/2026' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Frotas e Fornos</h1>
          <p className="text-stone-500 mt-1">Controle de ativos físicos e manutenções.</p>
        </div>
        <button className="bg-stone-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-stone-800 transition-colors">
          <Plus className="w-4 h-4" />
          Adicionar Ativo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {fleet.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-stone-100 rounded-lg">
                {item.type.includes('Forno') ? <Tool className="w-6 h-6 text-stone-700" /> : <Truck className="w-6 h-6 text-stone-700" />}
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                item.status === 'operacional' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {item.status === 'manutencao' && <AlertTriangle className="w-3 h-3" />}
                {item.status.toUpperCase()}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-stone-900 mb-1">{item.id}</h3>
            <p className="text-stone-500 text-sm mb-4">{item.type}</p>
            
            <div className="mt-auto pt-4 border-t border-stone-100 flex justify-between items-center text-sm">
              <span className="text-stone-500">Última Revisão:</span>
              <span className="font-medium text-stone-900">{item.lastMaintenance}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
