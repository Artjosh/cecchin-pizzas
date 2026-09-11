"use client";

import React from 'react';
import { User, Mail, Shield, Settings, LogOut, FileText, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function ProfileView() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Meu Perfil</h1>
        <p className="text-on-surface-variant mt-1">Gerencie suas informações e preferências.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/50 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
              {user.name.charAt(0)}
            </div>
            <h2 className="text-lg font-bold text-on-surface">{user.name}</h2>
            <p className="text-sm text-on-surface-variant mb-4">{user.email}</p>
            <span className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-medium uppercase tracking-wider">
              Perfil: {user.role}
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant/30">
              <h3 className="font-bold text-on-surface">Configurações</h3>
            </div>
            <div className="flex flex-col">
              <button className="flex items-center gap-3 p-4 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors text-left">
                <Bell className="w-5 h-5 text-on-surface-variant/70" />
                Notificações
              </button>
              <button className="flex items-center gap-3 p-4 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors text-left border-t border-outline-variant/30">
                <Shield className="w-5 h-5 text-on-surface-variant/70" />
                Privacidade
              </button>
              <button className="flex items-center gap-3 p-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left border-t border-outline-variant/30">
                <LogOut className="w-5 h-5" />
                Sair da conta
              </button>
            </div>
          </div>
        </div>

        {/* Details Form */}
        <div className="md:col-span-2">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/50 shadow-sm">
            <h3 className="font-bold text-on-surface mb-6">Informações Pessoais</h3>
            
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">Nome Completo</label>
                  <input
                    type="text"
                    defaultValue={user.name}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">E-mail</label>
                  <input
                    type="email"
                    defaultValue={user.email}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">Telefone</label>
                  <input
                    type="tel"
                    placeholder="(51) 99999-9999"
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-outline-variant/30 mt-6 flex justify-end">
                <button
                  type="button"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
