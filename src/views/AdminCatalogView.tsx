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
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Catálogo e Preços</h1>
          <p className="text-on-surface-variant mt-1">Gerencie os pacotes e itens adicionais do cardápio.</p>
        </div>
        <button className="bg-inverse-surface text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-inverse-surface transition-colors">
          <Plus className="w-4 h-4" />
          Novo Item
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low border-b border-outline-variant/50 text-sm font-medium text-on-surface-variant uppercase tracking-wider">
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
              <tr key={product.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-6 py-4 font-medium text-on-surface">{product.name}</td>
                <td className="px-6 py-4 text-on-surface-variant">{product.type}</td>
                <td className="px-6 py-4 text-on-surface">{product.price}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    product.active ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {product.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button className="p-2 text-on-surface-variant/70 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-on-surface-variant/70 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
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
