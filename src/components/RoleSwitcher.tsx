"use client";

import React, { useState } from 'react';
import { useAuth, Role } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { UserCircle, Shield, Briefcase, User, Users } from 'lucide-react';

export default function RoleSwitcher() {
  const { user, setRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roles: { id: Role; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'cliente', label: 'Cliente', icon: User, color: 'text-blue-500' },
    { id: 'staff', label: 'Staff / Forno', icon: Users, color: 'text-amber-500' },
    { id: 'gestao', label: 'Gestão', icon: Briefcase, color: 'text-purple-500' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'text-red-500' }
  ];

  const currentRoleConfig = roles.find(r => r.id === user.role);
  const CurrentIcon = currentRoleConfig?.icon || UserCircle;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-2 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/50 overflow-hidden w-48"
          >
            <div className="px-3 py-2 bg-surface-container-low border-b border-outline-variant/30">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Simular Perfil</p>
            </div>
            <div className="flex flex-col py-1">
              {roles.map((role) => {
                const Icon = role.icon;
                const isActive = user.role === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => {
                      setRole(role.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                      isActive ? 'bg-surface-container font-medium' : 'hover:bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? role.color : 'text-on-surface-variant/70'}`} />
                    {role.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-inverse-surface text-white px-4 py-3 rounded-full shadow-lg hover:bg-inverse-surface transition-colors"
      >
        <CurrentIcon className={`w-5 h-5 ${currentRoleConfig?.color.replace('text-', 'text-').replace('-500', '-400')}`} />
        <span className="text-sm font-medium hidden sm:inline-block">Modo: {currentRoleConfig?.label}</span>
      </button>
    </div>
  );
}
