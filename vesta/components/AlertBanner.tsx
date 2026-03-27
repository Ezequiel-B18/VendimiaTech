"use client";

import { AlertTriangleIcon } from "@/components/icons";

interface Props {
  minTemp: number;
  hoursUntil: number;
  date: string;
}

export default function AlertBanner({ minTemp, hoursUntil, date }: Props) {
  return (
    <div className="w-full bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertTriangleIcon className="w-6 h-6 shrink-0" />
        <div>
          <p className="font-bold text-sm sm:text-base">
            Alerta: temperatura proyectada {minTemp}°C esta noche. Riesgo en lotes bajos.
            Tenés {hoursUntil}hs.
          </p>
          <p className="text-xs text-red-100 mt-0.5">
            Fecha proyectada: {date}
          </p>
        </div>
      </div>
      <button className="shrink-0 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
        Ver detalles
      </button>
    </div>
  );
}
