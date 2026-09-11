import React from 'react';
import { MessageCircle, Search, MoreVertical, Phone } from 'lucide-react';

export function WhatsAppCentralView() {
  const chats = [
    { id: 1, name: 'Marina Fontoura', lastMessage: 'Perfeito, aguardo vocês!', time: '10:45', unread: 0, status: 'cliente' },
    { id: 2, name: 'Equipe A - Festa 15 Anos', lastMessage: 'Chegamos no local.', time: '10:30', unread: 2, status: 'staff' },
    { id: 3, name: 'João (Garçom)', lastMessage: 'Preciso de mais massa', time: '10:15', unread: 0, status: 'staff' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] bg-surface-container-lowest border border-outline-variant/50 rounded-xl overflow-hidden flex shadow-sm">
      {/* Sidebar */}
      <div className="w-80 border-r border-outline-variant/50 flex flex-col bg-surface-container-low">
        <div className="p-4 bg-surface-container-lowest border-b border-outline-variant/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-on-surface flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              WhatsApp Central
            </h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-variant/70 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              className="w-full bg-surface-container border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div key={chat.id} className="p-4 border-b border-outline-variant/30 hover:bg-surface-container-lowest cursor-pointer transition-colors flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center font-bold text-on-surface-variant">
                {chat.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-on-surface truncate text-sm">{chat.name}</h3>
                  <span className="text-xs text-on-surface-variant/70">{chat.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant truncate">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && (
                <div className="bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {chat.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        <div className="h-16 bg-surface-container-lowest border-b border-outline-variant/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-on-surface-variant">
              E
            </div>
            <div>
              <h3 className="font-bold text-on-surface">Equipe A - Festa 15 Anos</h3>
              <p className="text-xs text-green-600">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <Phone className="w-5 h-5 cursor-pointer hover:text-on-surface" />
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-on-surface" />
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          <div className="self-center bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-lg">
            Hoje
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg rounded-tl-none shadow-sm max-w-[70%] self-start text-sm text-on-surface relative">
            <p>Tudo carregado, estamos saindo da base.</p>
            <span className="text-[10px] text-on-surface-variant/70 absolute bottom-1 right-2">10:15</span>
          </div>
          <div className="bg-green-100 p-3 rounded-lg rounded-tr-none shadow-sm max-w-[70%] self-end text-sm text-on-surface relative">
            <p>Excelente. A cliente já confirmou que o salão está aberto.</p>
            <span className="text-[10px] text-on-surface-variant absolute bottom-1 right-2">10:18</span>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg rounded-tl-none shadow-sm max-w-[70%] self-start text-sm text-on-surface relative pb-5">
            <p>Chegamos no local.</p>
            <span className="text-[10px] text-on-surface-variant/70 absolute bottom-1 right-2">10:30</span>
          </div>
        </div>

        <div className="p-4 bg-surface-container border-t border-outline-variant/50">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Digite uma mensagem..." 
              className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
            <button className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-green-700">
              <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
