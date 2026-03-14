"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ title, value, change, isPositive, icon: Icon, color }: StatCardProps) {
  return (
    <div className="premium-card relative overflow-hidden group">
      <div className={cn(
        "absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:scale-110 transition-transform duration-500",
        color
      )} />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-outfit font-bold">{value}</h3>
          
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded-md",
                isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}>
                {isPositive ? "+" : ""}{change}
              </span>
              <span className="text-xs text-slate-500 font-medium">vs mes pasado</span>
            </div>
          )}
        </div>
        
        <div className={cn("p-2 rounded-xl border border-white/5", color.replace('bg-', 'bg-opacity-10 text-'))}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
