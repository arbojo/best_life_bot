"use client";

import React, { useEffect, useState } from "react";
import { 
  Bot, 
  Power, 
  MessageSquare, 
  RefreshCw, 
  ShieldCheck, 
  Activity,
  Terminal,
  MessageCircle,
  Facebook,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Log {
  id: string;
  message: string;
  level: string;
  created_at: string;
  source: string;
}

interface Channel {
  id: string;
  name: string;
  platform: string;
  is_active: boolean;
  updated_at: string;
}

export default function BotsManagement() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isBotActive, setIsBotActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bot status, logs and real channels
  const fetchData = async () => {
    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (e) {
        clearTimeout(id);
        return null;
      }
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const [statusRes, logsRes, channelsRes] = await Promise.all([
        fetchWithTimeout(`${apiUrl}/api/system/bot-status`),
        fetchWithTimeout(`${apiUrl}/api/system/logs`),
        fetchWithTimeout(`${apiUrl}/api/system/channels`)
      ]);
      
      if (statusRes && statusRes.ok) {
        const data = await statusRes.json();
        setIsBotActive(data.active);
        setError(null);
      } else if (statusRes && statusRes.status === 500) {
        setError("Error de base de datos en el servidor.");
      } else if (!statusRes) {
        setError("No se pudo conectar con el servidor backend (Puerto 4000).");
      }
      
      if (logsRes && logsRes.ok) {
        setLogs(await logsRes.json());
      }

      if (channelsRes && channelsRes.ok) {
        const data: Channel[] = await channelsRes.json();
        const keywords = ['MTY', 'GTO', 'CDMX', 'GDL', 'MESSENGER'];
        const excludedIds = [
          '120363168691582285@g.us',
          '120363425153281297@g.us',
          '120363402554144326@g.us'
        ];
        const filtered = data.filter(c => 
          keywords.some(k => 
            (c.name || '').toUpperCase().includes(k.toUpperCase()) || 
            (c.id || '').toUpperCase().includes(k.toUpperCase())
          ) && !excludedIds.includes(c.id)
        );
        setChannels(filtered);
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // Polling every 4s
    return () => clearInterval(interval);
  }, []);

  const toggleGlobalBot = async () => {
    const newState = !isBotActive;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/system/bot-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState })
      });
      setIsBotActive(newState);
    } catch (err) {
      alert("Error al cambiar estado del motor.");
    }
  };

  const toggleChannelStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/system/channels/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      });
      setChannels(channels.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    } catch (err) {
      alert("Error al cambiar estado del canal.");
    }
  };

  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-outfit font-bold tracking-tight">Gestión de <span className="gradient-text">Canales</span></h1>
          <p className="text-slate-400 mt-1">Sincronización automática de grupos y control de IA centralizado.</p>
        </div>
        <div className="flex items-center gap-4">
           {error && (
             <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 font-bold animate-pulse">
                <AlertCircle className="w-4 h-4" />
                {error}
             </div>
           )}
           <div className={cn(
             "px-4 py-2 rounded-xl border flex items-center gap-3 font-bold text-sm",
             isBotActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
           )}>
             <Activity className={cn("w-4 h-4", (isBotActive && !error) && "animate-pulse")} />
             Motor: {isBotActive ? "ACTIVO" : "EN PAUSA"}
           </div>
           <button 
             onClick={toggleGlobalBot}
             className={cn(
               "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:scale-105 active:scale-95",
               isBotActive ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-emerald-500 text-white shadow-emerald-500/20"
             )}
           >
             <Power className="w-4 h-4" />
             {isBotActive ? "DETENER TODO" : "INICIAR MOTOR"}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <div className="premium-card flex flex-col items-center justify-center py-32 border-dashed">
              <RefreshCw className="w-10 h-10 animate-spin text-primary/40 mb-4" />
              <p className="text-slate-500 font-bold">Conectando con el motor de IA...</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="premium-card py-24 text-center flex flex-col items-center border-dashed">
              <div className="w-20 h-20 rounded-full bg-slate-500/5 flex items-center justify-center mb-6">
                <MessageCircle className="w-10 h-10 text-slate-700" />
              </div>
              <h3 className="font-bold text-2xl text-slate-300">Sin Canales Detectados</h3>
              <p className="text-slate-500 max-w-md mt-3 leading-relaxed">
                El motor está encendido pero no ha reportado grupos todavía. {error ? "Revisa la conexión de la base de datos." : "Esto puede tardar unos segundos después de iniciar el bot."}
              </p>
              <button 
                onClick={() => fetchData()}
                className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all"
              >
                Reintentar Ahora
              </button>
            </div>
          ) : (
            channels.map((channel) => (
              <div key={channel.id} className={cn(
                "premium-card flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300",
                (!channel.is_active || !isBotActive) && "opacity-60 grayscale-[0.8]"
              )}>
                <div className="flex items-center gap-5 flex-1 w-full">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                    channel.platform === "WHATSAPP" 
                      ? (channel.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-slate-500/10 border-slate-500/20 text-slate-500")
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  )}>
                    {channel.platform === "WHATSAPP" ? <MessageCircle className="w-6 h-6" /> : <Facebook className="w-6 h-6" />}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-outfit font-bold text-lg truncate pr-4">{channel.name}</h3>
                    <p className="text-[10px] text-slate-600 font-mono mt-1 truncate">ID: {channel.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                  <div className="flex flex-col items-end md:mr-4">
                     <span className={cn(
                       "text-[10px] font-bold uppercase tracking-wider mb-1",
                       channel.is_active && isBotActive ? "text-emerald-400" : "text-rose-400"
                     )}>
                       {channel.is_active && isBotActive ? "Activo" : "Pausado"}
                     </span>
                     <p className="text-[9px] text-slate-600 font-medium">Sinc: {new Date(channel.updated_at).toLocaleTimeString()}</p>
                  </div>
                  <button 
                    onClick={() => toggleChannelStatus(channel.id, channel.is_active)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-bold text-xs transition-all border shadow-sm",
                      channel.is_active 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white" 
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                    )}
                  >
                    {channel.is_active ? "DESACTIVAR" : "ACTIVAR"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Feed Sidebar */}
        <div className="space-y-6">
          <div className="premium-card !p-0 overflow-hidden flex flex-col h-[650px] shadow-2xl transition-all border-none ring-1 ring-white/5">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.03]">
              <h2 className="font-outfit font-bold text-xl flex items-center gap-2 text-white">
                <Terminal className="w-5 h-5 text-primary" />
                Feed en Vivo
              </h2>
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", error ? "bg-rose-500" : "bg-emerald-500 animate-pulse")}></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{error ? "Offline" : "Live"}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px] bg-black/60 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 text-slate-600 italic">
                   <Activity className="w-8 h-8 opacity-20 mb-3" />
                   <p>Esperando señal del motor...</p>
                </div>
              ) : logs.map((log) => (
                <div key={log.id} className="border-l-2 border-primary/30 pl-3 py-1.5 bg-white/[0.02] rounded-r-md hover:bg-white/[0.04] transition-colors">
                   <div className="flex items-center justify-between mb-1">
                     <span className={cn(
                       "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                       log.level === 'error' ? "bg-rose-500/20 text-rose-400" : "bg-primary/20 text-primary"
                     )}>{log.source || 'ENGINE'}</span>
                     <span className="text-slate-600 text-[9px]">{new Date(log.created_at).toLocaleTimeString()}</span>
                   </div>
                   <p className="text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-primary/30">{log.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card bg-primary group overflow-hidden relative border-none">
            <ShieldCheck className="absolute -right-8 -bottom-8 w-32 h-32 text-white/10 group-hover:rotate-12 transition-transform duration-500" />
            <h2 className="font-outfit font-bold text-xl text-white mb-2 relative z-10">Control Total</h2>
            <p className="text-white/80 text-sm relative z-10 leading-relaxed">
              El motor escanea automáticamente nuevos grupos cada 2 minutos. Si no ves uno, envía un mensaje en él para despertarlo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
