"use client";

import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Clock, 
  Bot, 
  Zap,
  ArrowRight,
  Truck
} from "lucide-react";
import { StatCard } from "@/components/StatCard";

interface Stats {
  totalOrders: number;
  activeDrivers: number;
  conversionRate: string;
  avgDelivery: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    activeDrivers: 0,
    conversionRate: "0%",
    avgDelivery: "0 min"
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/stats`);
        const data = await response.json();
        setStats({
          totalOrders: data.total || 0,
          activeDrivers: 42, // Mock for now until we have driver logic
          conversionRate: "18.5%",
          avgDelivery: "48 min"
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-outfit font-bold tracking-tight">Vista <span className="gradient-text">General</span></h1>
          <p className="text-slate-400 mt-1">Bienvenido de nuevo, David. Esto es lo que sucede en Best Life hoy.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          <Zap className="w-4 h-4 fill-white" />
          Reporte Rápido
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Total Pedidos" 
          value={stats.totalOrders} 
          change="Real" 
          isPositive={true} 
          icon={ShoppingBag} 
          color="bg-indigo-500"
        />
        <StatCard 
          title="Repartidores Activos" 
          value={stats.activeDrivers} 
          change="4" 
          isPositive={true} 
          icon={Users} 
          color="bg-violet-500"
        />
        <StatCard 
          title="Tasa de Conversión" 
          value={stats.conversionRate} 
          change="2.1%" 
          isPositive={false} 
          icon={TrendingUp} 
          color="bg-fuchsia-500"
        />
        <StatCard 
          title="Entrega Promedio" 
          value={stats.avgDelivery} 
          change="5 min" 
          isPositive={true} 
          icon={Clock} 
          color="bg-sky-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot Status Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="premium-card h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-outfit font-bold">Estado de Bots</h2>
              <Bot className="w-5 h-5 text-primary" />
            </div>
            
            <div className="space-y-6">
              {[
                { name: "MTY WhatsApp", status: "Online", count: 842, type: "wa" },
                { name: "Messenger Shop", status: "Online", count: 124, type: "fb" },
                { name: "Support Bot", status: "Offline", count: 0, type: "wa" }
              ].map((bot) => (
                <div key={bot.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      bot.status === "Online" ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
                    )} />
                    <div>
                      <p className="font-semibold text-sm">{bot.name}</p>
                      <p className="text-xs text-slate-400">{bot.count} interacciones hoy</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors uppercase">
                      Logs
                    </button>
                    <button className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors uppercase",
                      bot.status === "Online" ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    )}>
                      {bot.status === "Online" ? "Detener" : "Iniciar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-6 py-3 rounded-xl border border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-slate-400 hover:text-primary font-medium flex items-center justify-center gap-2 group">
              Conectar Nuevo Canal
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Activity / Chart Placeholder */}
        <div className="lg:col-span-2">
          <div className="premium-card h-full">
            <h2 className="text-xl font-outfit font-bold mb-6">Movimiento en Tiempo Real</h2>
            <div className="aspect-[16/9] w-full bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 relative group cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-100.3167,25.6667,11,0/800x450?access_token=pk.placeholder')] bg-cover bg-center grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-70 transition-all duration-700"></div>
              <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Truck className="w-6 h-6 text-primary animate-bounce" />
                </div>
                <p className="font-outfit font-bold text-lg">Iniciando Mapa Interactivo</p>
                <p className="text-sm text-slate-400 max-w-sm">Leaflet/OpenStreetMap se está preparando para el geocoding dinámico.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
