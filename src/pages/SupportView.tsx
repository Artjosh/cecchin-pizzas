import React from 'react';
import { MessageCircle, Phone, Mail, HelpCircle, FileText, ChevronRight } from 'lucide-react';

export function SupportView() {
  const faqs = [
    { q: 'Como funciona o rodízio em domicílio?', a: 'Levamos toda a estrutura (forno, pizzaiolo, garçons) e servimos pizzas quentinhas por 4 horas no seu evento.' },
    { q: 'Qual a quantidade mínima de convidados?', a: 'Atendemos eventos a partir de 20 convidados para os pacotes padrão.' },
    { q: 'Preciso fornecer algum material?', a: 'Não, levamos fornos, pratos, talheres, guardanapos e todos os insumos necessários.' },
    { q: 'Posso alterar o cardápio após fechar o contrato?', a: 'Sim, você pode ajustar sabores e pacotes adicionais até 72h antes do evento.' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="text-center space-y-2 mb-10">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Como podemos ajudar?</h1>
        <p className="text-stone-500 max-w-lg mx-auto">Nossa equipe de suporte está pronta para tirar suas dúvidas e garantir que seu evento seja perfeito.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center hover:border-amber-300 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-900 mb-1">WhatsApp</h3>
          <p className="text-sm text-stone-500 mb-4">Atendimento rápido das 09h às 22h</p>
          <span className="text-amber-600 font-medium text-sm">Iniciar conversa &rarr;</span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center hover:border-amber-300 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Phone className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-900 mb-1">Ligação</h3>
          <p className="text-sm text-stone-500 mb-4">Para urgências durante eventos</p>
          <span className="text-green-600 font-medium text-sm">Ligar (51) 9999-9999 &rarr;</span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center hover:border-amber-300 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-900 mb-1">E-mail</h3>
          <p className="text-sm text-stone-500 mb-4">Para orçamentos corporativos</p>
          <span className="text-blue-600 font-medium text-sm">contato@cecchin.com.br</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-stone-100 bg-stone-50 flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-stone-400" />
          <h2 className="font-bold text-stone-900">Perguntas Frequentes (FAQ)</h2>
        </div>
        <div className="divide-y divide-stone-100">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-6 hover:bg-stone-50 transition-colors">
              <h4 className="font-bold text-stone-900 mb-2">{faq.q}</h4>
              <p className="text-sm text-stone-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
