import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  ShoppingBag, 
  Users, 
  Settings, 
  Power,
  Search,
  MoreVertical,
  Send,
  User
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('chats');

  const stats = [
    { label: 'Ventas Hoy', value: '$12,450', change: '+12%', color: 'text-emerald-500' },
    { label: 'Chats Activos', value: '48', change: '+5', color: 'text-blue-500' },
    { label: 'Tasa de Cierre', value: '24%', change: '+2%', color: 'text-purple-500' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="font-bold text-white text-xl">O</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Omni-626</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<MessageSquare size={20}/>} label="Chats en Vivo" active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} />
          <NavItem icon={<ShoppingBag size={20}/>} label="Pedidos" active={activeTab === 'pedidos'} onClick={() => setActiveTab('pedidos')} />
          <NavItem icon={<Users size={20}/>} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={<Settings size={20}/>} label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
            <Power size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/30 backdrop-blur-md flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente, pedido o mensaje..." 
                className="w-full bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">Vendedora Online</p>
              <p className="text-xs text-emerald-500">En línea</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center">
              <User size={20} />
            </div>
          </div>
        </header>

        {/* Dashboard View */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-sm">
                <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                  <span className={`text-xs font-medium ${stat.color}`}>{stat.change}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Chats Recientes</h2>
              <button className="text-sm text-blue-500 hover:text-blue-400">Ver todos</button>
            </div>
            <div className="divide-y divide-slate-800">
              <ChatRow name="Juan Pérez" message="¿Tienen envíos a CDMX?" time="hace 2 min" status="NUEVO" />
              <ChatRow name="María García" message="Ya realicé el pago, gracias" time="hace 15 min" status="PAGADO" color="text-emerald-500" />
              <ChatRow name="Roberto Carlos" message="Me interesa el paquete de promoción" time="hace 1 hora" status="INTERESADO" color="text-blue-500" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const ChatRow = ({ name, message, time, status, color = 'text-slate-400' }) => (
  <div className="p-6 flex items-center justify-between hover:bg-slate-800/30 cursor-pointer transition-colors">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
        <User size={24} className="text-slate-500" />
      </div>
      <div>
        <h4 className="font-semibold text-white">{name}</h4>
        <p className="text-sm text-slate-400 truncate max-w-xs">{message}</p>
      </div>
    </div>
    <div className="text-right">
      <span className={`text-xs font-bold px-2 py-1 rounded-md bg-slate-800 mb-1 inline-block ${color}`}>
        {status}
      </span>
      <p className="text-xs text-slate-500">{time}</p>
    </div>
  </div>
);

export default Dashboard;
