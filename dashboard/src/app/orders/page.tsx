"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrdersManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`);
        const data = await response.json();
        setOrders(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="space-y-8 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-outfit font-bold tracking-tight">Logística de <span className="gradient-text">Pedidos</span></h1>
          <p className="text-slate-400 mt-1">Gestiona, asigna y rastrea todos los pedidos de los canales de IA.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button className="flex items-center gap-2 bg-primary px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
            Exportar Reporte
          </button>
        </div>
      </div>

      <div className="premium-card !p-0 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex gap-8">
            {["Todos", "Pendientes", "Asignados", "Entregados"].map((tab) => (
              <button 
                key={tab} 
                className={cn(
                  "text-sm font-bold pb-1 transition-all border-b-2 hover:text-white",
                  tab === "Todos" ? "border-primary text-white" : "border-transparent text-slate-500"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-4">ID / Cliente</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha Entrega</th>
                <th className="px-6 py-4">Asignado a</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                   <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">Cargando pedidos reales...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                   <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">No se encontraron pedidos en la base de datos.</td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-[10px] border border-indigo-500/20">
                        {order.seller_name || 'BOT'}
                      </div>
                      <div>
                        <p className="font-outfit font-bold text-white text-sm">
                          MTY-{String(order.tracking_id).padStart(5, '0')}
                        </p>
                        <p className="text-xs text-slate-500">{order.customer_name || order.customer_phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300 font-medium">{order.product_desc || 'Sin descripción'}</p>
                    <p className="text-[10px] text-slate-500">Cant: {order.quantity}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-outfit font-bold">${order.total_amount}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border w-fit",
                      order.status === "PENDING_CONFIRMATION" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                      order.status === "ASSIGNED" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" :
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}>
                      {order.status === "PENDING_CONFIRMATION" && <Clock className="w-3 h-3" />}
                      {order.status === "ASSIGNED" && <MapPin className="w-3 h-3" />}
                      {order.status === "DELIVERED" && <CheckCircle2 className="w-3 h-3" />}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {order.delivery_day || 'No definida'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.route ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-xs text-slate-300 font-medium">{order.route}</span>
                      </div>
                    ) : (
                      <button className="text-indigo-400 hover:text-indigo-300 text-xs font-bold underline-offset-4 hover:underline">
                        Asignar Ahora
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all text-xs">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-xs text-slate-500 font-medium">
          <p>Mostrando {orders.length} resultados</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all opacity-50 cursor-not-allowed">Anterior</button>
            <button className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
