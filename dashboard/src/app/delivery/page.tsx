"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Package, 
  ChevronRight, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  tracking_id: number;
  product_desc: string;
  customer_name: string;
  address: string;
  status: string;
}

interface Driver {
  id: string;
  name: string;
  status: string;
  phone: string;
}

export default function AssignmentPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, driversRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/drivers`)
      ]);
      
      const ordersData = await ordersRes.json();
      const driversData = await driversRes.json();
      
      // Only pending orders
      setOrders(ordersData.filter((o: Order) => o.status === 'PENDING_CONFIRMATION'));
      setDrivers(driversData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const assignOrder = async (driverId: string) => {
    if (!selectedOrder) return;
    
    try {
      setAssigning(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selectedOrder.id, driverId })
      });
      
      if (res.ok) {
        setSelectedOrder(null);
        await fetchData();
      }
    } catch (error) {
      alert("Error al asignar pedido");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-8 page-enter h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      <div>
        <h1 className="text-4xl font-outfit font-bold tracking-tight">Panel de <span className="gradient-text">Asignación</span></h1>
        <p className="text-slate-400 mt-1">Conecta pedidos registrados con repartidores disponibles en tiempo real.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden pb-4">
        {/* Orders Column */}
        <div className="flex flex-col space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Pedidos Disponibles ({orders.length})
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500 italic">Cargando pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="premium-card p-10 text-center flex flex-col items-center justify-center gap-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/20" />
                <p className="text-slate-500">No hay pedidos pendientes de asignación.</p>
              </div>
            ) : orders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "w-full text-left premium-card p-4 transition-all hover:border-primary/50 group relative",
                  selectedOrder?.id === order.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-white/5"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded text-indigo-400 border border-indigo-500/20 mb-2 inline-block">
                      MTY-{String(order.tracking_id).padStart(5, '0')}
                    </span>
                    <h3 className="font-outfit font-bold text-sm text-white group-hover:text-primary transition-colors line-clamp-1">{order.product_desc || 'Sin descripción'}</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {order.address || 'Sin dirección registrada'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">Cliente: {order.customer_name || 'Desconocido'}</p>
                  </div>
                  <ChevronRight className={cn(
                    "w-5 h-5 transition-all",
                    selectedOrder?.id === order.id ? "text-primary translate-x-1" : "text-slate-600"
                  )} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Drivers Column */}
        <div className="flex flex-col space-y-4 overflow-hidden">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Flota Disponible ({drivers.filter(d => d.status === 'Disponible').length})
          </h2>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {!selectedOrder ? (
              <div className="premium-card p-10 text-center flex flex-col items-center justify-center gap-4 h-full bg-white/[0.01] border-dashed">
                <AlertCircle className="w-12 h-12 text-slate-500/20" />
                <div>
                  <p className="text-slate-400 font-bold">Selecciona un pedido primero</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">para ver repartidores compatibles</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                  <p className="text-xs font-bold text-primary">Asignando a: MTY-{String(selectedOrder.tracking_id).padStart(5, '0')}</p>
                  <button onClick={() => setSelectedOrder(null)} className="text-[10px] text-slate-400 hover:text-white underline">Cancelar</button>
                </div>
                
                {drivers.map(driver => (
                  <div 
                    key={driver.id} 
                    className={cn(
                      "premium-card p-4 flex items-center justify-between group transition-all",
                      driver.status !== 'Disponible' ? "opacity-50 grayscale pointer-events-none" : "hover:border-emerald-500/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-emerald-500/20">
                        <span className="text-sm font-outfit font-bold text-emerald-400">{driver.name.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{driver.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            driver.status === 'Disponible' ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">{driver.status}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => assignOrder(driver.id)}
                      disabled={assigning}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {assigning ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent animate-spin rounded-full" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      Asignar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
