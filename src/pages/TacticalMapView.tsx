import React from 'react';
import { motion } from 'framer-motion';
import { Map, MapPin, Truck, AlertCircle } from 'lucide-react';

export function TacticalMapView() {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Mapa Tático</h1>
          <p className="text-stone-500 mt-1">Visão em tempo real das equipes e fornos no campo.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 border border-stone-200 rounded-lg">
          <div className="flex items-center gap-2 px-3">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-stone-700">3 Em trânsito</span>
          </div>
          <div className="w-px h-6 bg-stone-200" />
          <div className="flex items-center gap-2 px-3">
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
            <span className="text-sm font-medium text-stone-700">2 Em operação</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-center relative overflow-hidden">
        {/* Placeholder for map */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        
        <div className="text-center z-10 space-y-4">
          <Map className="w-16 h-16 text-stone-300 mx-auto" />
          <p className="text-stone-500 font-medium">Integração com Google Maps a ser ativada.</p>
        </div>

        {/* Mock Markers */}
        <motion.div 
          animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 left-1/4 flex flex-col items-center"
        >
          <div className="bg-amber-600 p-2 rounded-full text-white shadow-lg relative">
            <Truck className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
            </span>
          </div>
          <span className="bg-white px-2 py-1 rounded text-xs font-bold mt-1 shadow-sm">Equipe A</span>
        </motion.div>
      </div>
    </div>
  );
}
