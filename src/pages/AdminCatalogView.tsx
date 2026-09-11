import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export function AdminCatalogView() {
  const products = [
    { id: 1, name: 'Pacote Essencial', type: 'Pacote', price: 'R$ 1.200', active: true },
    { id: 2, name: 'Pacote Premium', type: 'Pacote', price: 'R$ 2.500', active: true },
    { id: 3, name: 'Hora Extra Staff', type: 'Adicional', price: 'R$ 150/h', active: true },
    { id: 4, name: 'Borda Recheada', type: 'Adicional', price: 'R$ 5/pessoa', active: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Catálogo e Preços</h1>
          <p className="text-stone-500 mt-1">Gerencie os pacotes e itens adicionais do cardápio.</p>
        </div>
        <button className="bg-stone-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-stone-800 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Item
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-stone-50 border-b border-stone-200 text-sm font-medium text-stone-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Preço Base</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 font-medium text-stone-900">{product.name}</td>
                <td className="px-6 py-4 text-stone-500">{product.type}</td>
                <td className="px-6 py-4 text-stone-900">{product.price}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    product.active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {product.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button className="p-2 text-stone-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-stone-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
