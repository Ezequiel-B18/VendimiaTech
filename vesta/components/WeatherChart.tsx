"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from "recharts";
import type { DailyWeather } from "@/lib/weather";

interface Props {
  daily: DailyWeather[];
  frostAlert?: { date: string; minTemp: number } | null;
  waterBalance: number;
  totalPrecip: number;
}

export default function WeatherChart({
  daily,
  frostAlert,
  waterBalance,
  totalPrecip,
}: Props) {
  const chartData = daily.map((d) => ({
    date: d.date.slice(5), // MM-DD
    max: d.tempMax,
    min: d.tempMin,
    precip: d.precipitation,
    fullDate: d.date,
  }));

  const frostPoints = frostAlert
    ? chartData.filter((d) => d.fullDate === frostAlert.date)
    : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Temperatura (21 días)
        </h3>
        <div className="flex gap-1">
          {frostAlert && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              Helada proyectada
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickLine={false}
            interval={3}
          />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              `${(value as number).toFixed(1)}°C`,
              name === "max" ? "Máx" : "Mín",
            ]}
            labelFormatter={(label) => `Fecha: ${label}`}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
          <Legend
            formatter={(value) => (value === "max" ? "Máx" : "Mín")}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="max"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="min"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {frostPoints.map((p, i) => (
            <ReferenceDot
              key={i}
              x={p.date}
              y={p.min}
              r={6}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Balance hídrico</p>
          <p
            className={`text-xl font-bold ${
              waterBalance < 0 ? "text-orange-600" : "text-blue-600"
            }`}
          >
            {waterBalance > 0 ? "+" : ""}
            {waterBalance.toFixed(1)} mm
          </p>
        </div>
        <div className="bg-sky-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Precipitación total</p>
          <p className="text-xl font-bold text-sky-600">
            {totalPrecip.toFixed(1)} mm
          </p>
        </div>
      </div>
    </div>
  );
}
