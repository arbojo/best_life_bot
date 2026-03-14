"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock,
  ExternalLink,
  ChevronDown,
  X,
  Phone,
  Package,
  FileText,
  DollarSign,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Subcomponente: Modal de Detalle ---
function OrderDetailModal({ order, onClose }: { order: any; onClose: () => void }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-outfit font-bold text-white">Detalles del Pedido</h2>
              <p className="text-xs text-slate-500 font-medium">ID: MTY-{String(order.tracking_id).padStart(5, '0')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Section: Cliente */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <UserCircle className="w-3 h-3" />
              Información del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Nombre Completo</p>
                <p className="text-sm font-medium text-slate-200">{order.customer_name || 'No proporcionado'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Teléfono / WhatsApp</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-sm font-medium text-slate-200">{order.customer_phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Entrega */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-sky-400 flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              Logística y Entrega
            </h3>
            <div className="grid grid-cols-1 gap-6 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Dirección de Entrega</p>
                <p className="text-sm font-medium text-slate-200 mt-1">{order.address || 'Sin dirección registrada'}</p>
                {order.neighborhood && (
                  <p className="text-xs text-slate-400 mt-1">Colonia: {order.neighborhood}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">{order.city_municipality}, {order.state} - {order.zip_code}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Día de Entrega</p>
                  <p className="text-sm font-bold text-slate-200">{order.delivery_day || 'No definido'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Repartidor (Ruta)</p>
                  <p className="text-sm font-bold text-slate-200">{order.route || 'Pendiente de asignar'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Productos */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
              <DollarSign className="w-3 h-3" />
              Resumen de Compra
            </h3>
            <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Producto / Descripción</p>
                  <p className="text-sm font-medium text-slate-200">{order.product_desc || 'No detallado'}</p>
                  <p className="text-xs text-slate-400 mt-1 italic">Cantidad: {order.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Total</p>
                  <p className="text-lg font-outfit font-bold text-white">${order.total_amount}</p>
                </div>
              </div>
              {order.original_msg && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Mensaje Original</p>
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                    <p className="text-[11px] text-slate-400 font-mono italic leading-relaxed whitespace-pre-wrap">{order.original_msg}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cerrar
          </button>
          <button className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            Imprimir Comprobante
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Componente Principal ---
export default function OrdersManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtros
  const [activeTab, setActiveTab] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("Todos");
  const [selectedDate, setSelectedDate] = useState("");

  // Estado del Modal
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, driversRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/drivers`)
        ]);
        const ordersData = await ordersRes.json();
        const driversData = await driversRes.json();
        setOrders(ordersData);
        setDrivers(driversData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Lógica de Filtrado (Computed)
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Filtro por Pestaña (Estado)
      if (activeTab === "Pendientes" && order.status !== "PENDING_CONFIRMATION") return false;
      if (activeTab === "Asignados" && order.status !== "ASSIGNED") return false;
      if (activeTab === "Entregados" && order.status !== "DELIVERED") return false;

      // 2. Filtro por Buscador (ID o Cliente)
      const trackingId = `MTY-${String(order.tracking_id).padStart(5, '0')}`;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        trackingId.toLowerCase().includes(searchLower) || 
        (order.customer_name || "").toLowerCase().includes(searchLower) ||
        (order.customer_phone || "").toLowerCase().includes(searchLower);
      if (searchQuery && !matchesSearch) return false;

      // 3. Filtro por Repartidor
      if (selectedDriver !== "Todos" && order.route !== selectedDriver) return false;

      // 4. Filtro por Fecha
      if (selectedDate && order.delivery_day !== selectedDate) return false;

      return true;
    });
  }, [orders, activeTab, searchQuery, selectedDriver, selectedDate]);

  return (
    <div className="space-y-8 page-enter">
      {/* Modal de Detalle */}
      {viewingOrder && (
        <OrderDetailModal 
          order={viewingOrder} 
          onClose={() => setViewingOrder(null)} 
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-outfit font-bold tracking-tight">Logística de <span className="gradient-text">Pedidos</span></h1>
          <p className="text-slate-400 mt-1">Gestiona, asigna y rastrea todos los pedidos de los canales de IA.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white/5 border border-white/10 pl-10 pr-4 py-2 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
            />
          </div>
          <button 
            onClick={() => {
              setActiveTab("Todos");
              setSelectedDriver("Todos");
              setSearchQuery("");
              setSelectedDate("");
            }}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-all text-slate-400"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Barra de Filtros Inteligentes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por ID (MTY-...) o Cliente" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select 
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full bg-white/5 border border-white/10 pl-11 pr-10 py-3 rounded-2xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white cursor-pointer"
          >
            <option value="Todos" className="bg-slate-900">Todos los repartidores</option>
            {drivers.map(d => (
              <option key={d.id} value={d.name} className="bg-slate-900">{d.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
          {["Todos", "Pendientes", "Asignados", "Entregados"].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 text-[11px] font-bold py-2 rounded-xl transition-all",
                activeTab === tab ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="premium-card !p-0 overflow-hidden">
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
              ) : filteredOrders.length === 0 ? (
                <tr>
                   <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">No se encontraron pedidos con estos filtros.</td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group text-white">
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
                      "flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border w-fit uppercase",
                      order.status === "PENDING_CONFIRMATION" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                      order.status === "ASSIGNED" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" :
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}>
                      {order.status === "PENDING_CONFIRMATION" && <Clock className="w-3 h-3" />}
                      {order.status === "ASSIGNED" && <MapPin className="w-3 h-3" />}
                      {order.status === "DELIVERED" && <CheckCircle2 className="w-3 h-3" />}
                      {order.status.replace('_', ' ')}
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
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">No asignado</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-white">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setViewingOrder(order)}
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-primary transition-all"
                        title="Ver Detalles Completos"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
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
          <p>Mostrando {filteredOrders.length} de {orders.length} pedidos</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all opacity-50 cursor-not-allowed">Anterior</button>
            <button className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
