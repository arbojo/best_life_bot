"use client";

import React from "react";
import { 
  Users, 
  MapPin, 
  Phone, 
  Shield, 
  Star, 
  MoreVertical,
  Plus,
  Search
} from "lucide-react";

const MOCK_DRIVERS = [
  { id: 1, name: "Juan Carlos", phone: "818-123-4567", rating: 4.8, status: "Ocupado", currentTrip: "MTY-00141", avatar: "JC", active: true },
  { id: 2, name: "Pedro Ramirez", phone: "811-987-6543", rating: 4.9, status: "Disponible", currentTrip: "Ninguno", avatar: "PR", active: true },
  { id: 3, name: "Luis Mendoza", phone: "812-456-7890", rating: 4.5, status: "Desconectado", currentTrip: "Ninguno", avatar: "LM", active: false },
  { id: 4, name: "Jose Garcia", phone: "818-555-0199", rating: 4.7, status: "Disponible", currentTrip: "Ninguno", avatar: "JG", active: true },
];

export default function DriversManagement() {
  return (
    <div className="space-y-8 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-outfit font-bold tracking-tight">Personal de <span className="gradient-text">Flota</span></h1>
          <p className="text-slate-400 mt-1">Gestiona las credenciales de los repartidores, su rendimiento y estado operativo actual.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
          <Plus className="w-4 h-4" />
          Agregar Nuevo Repartidor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MOCK_DRIVERS.map((driver) => (
          <div key={driver.id} className="premium-card relative group">
            <div className="absolute top-4 right-4">
              <button className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/10 flex items-center justify-center border border-white/10">
                  <span className="text-2xl font-outfit font-bold text-primary">{driver.avatar}</span>
                </div>
                <div className={className(
                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-card",
                  driver.active ? "bg-emerald-500" : "bg-slate-500"
                )} />
              </div>

              <h3 className="font-outfit font-bold text-lg">{driver.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold">{driver.rating}</span>
                <span className="text-xs text-slate-500 font-medium ml-1">(120+ entregas)</span>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-8 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estado</p>
                  <p className={className(
                    "text-xs font-bold",
                    driver.status === "Disponible" ? "text-emerald-400" : driver.status === "Ocupado" ? "text-sky-400" : "text-slate-500"
                  )}>{driver.status}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Viaje Actual</p>
                  <p className="text-xs font-bold text-slate-300">{driver.currentTrip}</p>
                </div>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5 transition-all">
                  <Phone className="w-3.5 h-3.5" />
                  Llamar
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5 transition-all">
                  <MapPin className="w-3.5 h-3.5" />
                  Ubicar
                </button>
              </div>

              <button className="w-full mt-3 py-2.5 rounded-xl bg-white/5 hover:bg-primary/10 text-slate-400 hover:text-primary border border-white/5 transition-all text-xs font-bold flex items-center justify-center gap-2 group">
                Perfil Completo
                <Shield className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function className(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
