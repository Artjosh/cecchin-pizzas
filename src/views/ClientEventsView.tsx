"use client";

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';

export function ClientEventsView() {
  const events = [
    { id: 1, title: 'Aniversário 15 anos', date: '15/10/2026', time: '19:00', location: 'Salão de Festas A', status: 'confirmado' },
    { id: 2, title: 'Confraternização Empresa', date: '20/12/2026', time: '20:00', location: 'Chácara do Sol', status: 'pendente' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Meus Eventos</h1>
          <p className="text-on-surface-variant mt-1">Acompanhe e gerencie seus eventos contratados.</p>
        </div>
        <Link href="/cliente/contratar" className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors inline-block text-center">
          Novo Evento
        </Link>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-5 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6"
          >
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-on-surface">{event.title}</h3>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  event.status === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {event.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-on-surface-variant/70" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-on-surface-variant/70" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-on-surface-variant/70" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
            
            <button className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 px-4 py-2 bg-amber-50 rounded-lg transition-colors">
              Detalhes
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
