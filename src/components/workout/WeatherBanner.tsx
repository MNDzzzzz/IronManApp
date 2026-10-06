'use client';

import React, { useEffect, useState } from 'react';
import { CloudRain, Sun, Wind, Droplets, AlertTriangle, ShieldCheck, Thermometer } from 'lucide-react';
import { WeatherCondition } from '@/lib/weather/weatherService';

export const WeatherBanner: React.FC = () => {
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch('/api/weather');
        if (res.ok) {
          const data = await res.json();
          if (data.weather) setWeather(data.weather);
        }
      } catch (err) {
        console.error('Error cargando clima:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWeather();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full p-3 rounded-2xl liquid-glass-pill animate-pulse flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>Consultando condiciones meteorológicas de carrera...</span>
      </div>
    );
  }

  if (!weather) return null;

  const isRisk = weather.surface_risk === 'mojado_resbaladizo';

  return (
    <div
      role="region"
      aria-label="Condiciones meteorológicas y estado articular para correr"
      className="w-full p-4 mb-4 rounded-3xl liquid-glass-card border border-[var(--glass-border)] transition-all"
    >
      <div className="flex items-center justify-between">
        {/* Temperatura y Clima */}
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-2xl ${weather.is_raining ? 'bg-blue-500/15 text-blue-500' : 'bg-amber-500/15 text-amber-500'}`}>
            {weather.is_raining ? <CloudRain className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                {weather.temperature_c}°C
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                {weather.weather_description}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">
              <span className="flex items-center gap-0.5">
                <Droplets className="w-3 h-3 text-cyan-500" />
                {weather.humidity_pct}%
              </span>
              <span className="flex items-center gap-0.5">
                <Wind className="w-3 h-3 text-slate-400" />
                {weather.wind_kmh} km/h
              </span>
            </div>
          </div>
        </div>

        {/* Badge de Seguridad de Rodilla */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${
            isRisk
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isRisk ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>{isRisk ? 'Calzada Mojada' : 'Asfalto Seco'}</span>
        </div>
      </div>

      {/* Consejo Biomecánico Adaptado a la Rodilla */}
      <div className="mt-3 pt-2.5 border-t border-[var(--glass-border)] flex items-start gap-2">
        <span className="text-xs">💡</span>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          {weather.runner_tip}
        </p>
      </div>
    </div>
  );
};
