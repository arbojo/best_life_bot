"use client";

import React from "react";
import { Bell, Search, User } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-8 text-white fixed top-0 right-0 left-64 z-40">
      <div className="flex-1"></div>

      <div className="flex items-center gap-6">
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-card"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">David Admin</p>
            <p className="text-xs text-slate-400">Nivel Maestro</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <User className="w-6 h-6 text-slate-300" />
          </div>
        </div>
      </div>
    </header>
  );
}
