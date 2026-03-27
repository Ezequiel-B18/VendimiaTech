"use client";

import type { GeminiAnalysis } from "@/lib/gemini";
import { LeafIcon, AlertTriangleIcon, SirenIcon, CloudSunIcon, BoltIcon, CalendarIcon, CheckCircleIcon } from "@/components/icons";

const STATE_CONFIG = {
  bueno: {
    color: "bg-green-500",
    label: "Viñedo Sano",
    text: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  regular: {
    color: "bg-yellow-400",
    label: "Atención Requerida",
    text: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  malo: {
    color: "bg-red-500",
    label: "Estado Crítico",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

const URGENCY_LABELS: Record<string, React.ReactNode> = {
  inmediata: <span className="flex items-center gap-1"><BoltIcon className="w-3.5 h-3.5" /> Inmediata</span>,
  esta_semana: <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> Esta semana</span>,
  este_mes: <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> Este mes</span>,
  sin_urgencia: <span className="flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5" /> Sin urgencia</span>,
};

interface Props {
  analysis: GeminiAnalysis;
  indices: { ndvi: number; ndre: number; ndwi: number };
}

export default function StatusCard({ analysis, indices }: Props) {
  const cfg = STATE_CONFIG[analysis.estado_general] ?? STATE_CONFIG.regular;
  const hasClimateData = !!(
    analysis.alerta_climatica ||
    analysis.correlacion_clima_imagen ||
    (analysis.recomendaciones_climaticas && analysis.recomendaciones_climaticas.length > 0)
  );

  const statusIcon = analysis.estado_general === "bueno"
    ? <LeafIcon className="w-6 h-6 text-white" />
    : analysis.estado_general === "regular"
    ? <AlertTriangleIcon className="w-6 h-6 text-white" />
    : <SirenIcon className="w-6 h-6 text-white" />;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5`}>
      {/* Main status */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-16 h-16 rounded-full ${cfg.color} shadow-lg flex items-center justify-center`}>
          {statusIcon}
        </div>
        <div>
          <p className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</p>
          <p className="text-sm text-gray-500">
            Cobertura vegetal: <strong>{analysis.cobertura_vegetal}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Urgencia: <strong>{URGENCY_LABELS[analysis.urgencia]}</strong>
          </p>
        </div>
      </div>

      {/* Index cards */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white rounded-lg p-3 text-center border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Vigor vegetativo</p>
          <p className="text-lg font-bold text-green-600">
            {(indices.ndvi * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Salud de la planta</p>
          <p className="text-lg font-bold text-emerald-600">
            {(indices.ndre * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Humedad foliar</p>
          <p className="text-lg font-bold text-blue-600">
            {(indices.ndwi * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Climate-aware analysis section */}
      {hasClimateData && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <CloudSunIcon className="w-4 h-4" /> Análisis integrado clima + imagen
          </p>

          {analysis.alerta_climatica && (
            <div className="mb-2">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                Contexto climático
              </p>
              <p className="text-sm text-blue-900">{analysis.alerta_climatica}</p>
            </div>
          )}

          {analysis.correlacion_clima_imagen && (
            <div className="mb-2">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                Correlación clima-imagen
              </p>
              <p className="text-sm text-blue-900">{analysis.correlacion_clima_imagen}</p>
            </div>
          )}

          {analysis.recomendaciones_climaticas && analysis.recomendaciones_climaticas.length > 0 && (
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                Acciones recomendadas por clima
              </p>
              <ul className="space-y-1">
                {analysis.recomendaciones_climaticas.map((rec, i) => (
                  <li key={i} className="flex gap-2 text-sm text-blue-900">
                    <span className="text-blue-500 mt-0.5 shrink-0">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {analysis.recomendaciones_generales.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Recomendaciones
          </p>
          <ul className="space-y-1.5">
            {analysis.recomendaciones_generales.slice(0, 3).map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-green-500 mt-0.5 shrink-0">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Problems */}
      {analysis.posibles_problemas.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Posibles problemas detectados
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.posibles_problemas.map((p, i) => (
              <span
                key={i}
                className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confidence */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Confianza del análisis IA:{" "}
          <span className="font-medium text-gray-600">
            {analysis.confianza_analisis}
          </span>
        </p>
        {analysis.observaciones && (
          <p className="text-xs text-gray-400 mt-1 italic">
            {analysis.observaciones}
          </p>
        )}
      </div>
    </div>
  );
}
