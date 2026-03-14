"use client";

import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  MousePointer2,
  Calendar,
  Download
} from "lucide-react";

const DATA_ORDERS = [
  { name: "Lun", orders: 45, conv: 12 },
  { name: "Mar", orders: 52, conv: 15 },
  { name: "Mie", orders: 38, conv: 10 },
  { name: "Jue", orders: 65, conv: 22 },
  { name: "Vie", orders: 48, conv: 18 },
  { name: "Sab", orders: 72, conv: 28 },
  { name: "Dom", orders: 58, conv: 20 },
];

const DATA_PRODUCTS = [
  { name: "Bye Canas", value: 450, color: "#6366f1" },
  { name: "Duo Pack", value: 300, color: "#a855f7" },
  { name: "Bio Gel", value: 200, color: "#ec4899" },
  { name: "Otros", value: 150, color: "#334155" },
];

export default function AnalyticsDashboard() {
  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-outfit font-bold tracking-tight">Análisis del <span className="gradient-text">Sistema</span></h1>
          <p className="text-slate-400 mt-1">Explora las tasas de conversión, tendencias de ventas y rendimiento de repartidores.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold">
            <Calendar className="w-4 h-4" />
            Últimos 7 Días
          </button>
          <button className="flex items-center gap-2 bg-primary px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Trend */}
        <div className="premium-card">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-outfit font-bold text-xl">Impulso de Ventas</h3>
              <p className="text-xs text-slate-500">Pedidos registrados diarios vs conversiones</p>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA_ORDERS}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #ffffff10", borderRadius: "12px", color: "#fff" }}
                  itemStyle={{ color: "#6366f1" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorOrders)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Distribution */}
        <div className="premium-card">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-outfit font-bold text-xl">Popularidad de Productos</h3>
              <p className="text-xs text-slate-500">Distribución de ventas por categoría de producto</p>
            </div>
            <ShoppingBag className="w-5 h-5 text-fuchsia-400" />
          </div>

          <div className="flex items-center justify-center h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DATA_PRODUCTS}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {DATA_PRODUCTS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #ffffff10", borderRadius: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-4 pr-12">
              {DATA_PRODUCTS.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <div>
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.value} unidades</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Driver Performance (Example) */}
        <div className="premium-card lg:col-span-2">
           <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-outfit font-bold text-xl">Top Repartidores</h3>
              <p className="text-xs text-slate-500">Comparativa de entregas exitosas vs fallidas</p>
            </div>
            <Users className="w-5 h-5 text-sky-400" />
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Juan C.", success: 120, fail: 4 },
                { name: "Pedro R.", success: 98, fail: 8 },
                { name: "Luis M.", success: 85, fail: 2 },
                { name: "Jose G.", success: 74, fail: 12 },
                { name: "Marta S.", success: 62, fail: 1 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #ffffff10", borderRadius: "12px" }}
                />
                <Bar dataKey="success" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="fail" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
