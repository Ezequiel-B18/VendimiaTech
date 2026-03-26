export interface Alert {
  type: "frost" | "fungal" | "thermal_shock" | "double";
  severity: "critical" | "warning" | "info";
  message: string;
  date?: string;
  details?: Record<string, unknown>;
}

export function calcTempDerivative(temps: number[]): number[] {
  return temps.slice(1).map((t, i) => t - temps[i]);
}

export function buildAlerts(
  tempMaxes: number[],
  tempMins: number[],
  dates: string[],
  precipitations: number[]
): Alert[] {
  const alerts: Alert[] = [];
  const derivatives = calcTempDerivative(tempMaxes);

  // Frost alert: forecast min < 4°C
  const forecastStart = Math.max(0, tempMins.length - 7);
  for (let i = forecastStart; i < tempMins.length; i++) {
    if (tempMins[i] < 4) {
      const now = new Date();
      const eventDate = new Date(dates[i]);
      const hoursUntil = Math.max(
        0,
        Math.round((eventDate.getTime() - now.getTime()) / 3600000)
      );
      alerts.push({
        type: "frost",
        severity: tempMins[i] < 0 ? "critical" : "warning",
        message: `Temperatura proyectada ${tempMins[i]}°C. Riesgo de helada en lotes bajos. ${hoursUntil}hs para actuar.`,
        date: dates[i],
        details: { minTemp: tempMins[i], hoursUntil },
      });
    }
  }

  // Thermal shock: dT/dt < -6°C/day
  derivatives.forEach((dt, i) => {
    if (dt < -6) {
      alerts.push({
        type: "thermal_shock",
        severity: "warning",
        message: `Caída brusca de temperatura de ${Math.abs(dt).toFixed(1)}°C detectada el ${dates[i + 1]}.`,
        date: dates[i + 1],
        details: { drop: dt },
      });
    }
  });

  // Fungal risk: rain > 2mm in last 3 days
  const last3Precip = precipitations.slice(-10, -7);
  const recentRain = last3Precip.reduce((s, p) => s + p, 0);
  if (recentRain > 2) {
    // Double alert if also thermal shock
    const hasRecentDrop = derivatives
      .slice(-4)
      .some((dt) => dt < -4);
    if (hasRecentDrop) {
      alerts.push({
        type: "double",
        severity: "critical",
        message: `Alerta combinada: lluvia reciente (${recentRain.toFixed(1)}mm) + caída de temperatura. Riesgo fúngico elevado.`,
        details: { recentRain },
      });
    } else {
      alerts.push({
        type: "fungal",
        severity: "warning",
        message: `Lluvia reciente (${recentRain.toFixed(1)}mm en últimos 3 días). Monitorear enfermedades fúngicas.`,
        details: { recentRain },
      });
    }
  }

  return alerts;
}
