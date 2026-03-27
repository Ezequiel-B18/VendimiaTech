import { NextRequest, NextResponse } from "next/server";

interface NotifyBody {
  email: string;
  bbox?: number[];
  frostRisk: boolean;
  fungalRisk: boolean;
  intenseRainRisk?: boolean;
  intenseRainDays?: string[];
  hailRisk?: boolean;
  hailAlert?: { date: string; precipitation: number; windSpeed: number } | null;
  tempDrops: string[];
  frostAlert?: { date: string; minTemp: number; hoursUntil: number } | null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildSubject(payload: NotifyBody): string {
  if (payload.frostRisk && payload.frostAlert) {
    return `VESTA ALERTA: Riesgo de helada ${payload.frostAlert.minTemp}C`;
  }
  if (payload.hailRisk && payload.hailAlert) {
    return `VESTA ALERTA: Riesgo probable de granizo ${payload.hailAlert.date}`;
  }
  if (payload.intenseRainRisk) {
    return "VESTA ALERTA: Lluvia intensa pronosticada";
  }
  if (payload.fungalRisk) {
    return "VESTA ALERTA: Riesgo fungico detectado";
  }
  if (payload.tempDrops.length > 0) {
    return "VESTA ALERTA: Shock termico detectado";
  }
  return "VESTA ESTADO: Sin eventos urgentes en tu parcela";
}

function buildHtml(payload: NotifyBody): string {
  const location =
    payload.bbox && payload.bbox.length === 4
      ? `${payload.bbox[1].toFixed(4)}, ${payload.bbox[0].toFixed(4)} -> ${payload.bbox[3].toFixed(4)}, ${payload.bbox[2].toFixed(4)}`
      : "Parcela seleccionada";

  const frostBlock =
    payload.frostRisk && payload.frostAlert
      ? `<li><strong>Helada:</strong> ${payload.frostAlert.minTemp}C esperados para ${payload.frostAlert.date} (en ${payload.frostAlert.hoursUntil}hs)</li>`
      : "";

  const fungalBlock = payload.fungalRisk
    ? "<li><strong>Riesgo fungico:</strong> Lluvia reciente mayor a 2mm en los ultimos 3 dias.</li>"
    : "";

  const intenseRainBlock = payload.intenseRainRisk
    ? `<li><strong>Lluvia intensa:</strong> Dias con lluvia >=20mm: ${(payload.intenseRainDays ?? []).join(", ") || "pronostico activo"}.</li>`
    : "";

  const hailBlock =
    payload.hailRisk && payload.hailAlert
      ? `<li><strong>Riesgo probable de granizo:</strong> ${payload.hailAlert.date} (lluvia ${payload.hailAlert.precipitation}mm, viento ${payload.hailAlert.windSpeed} km/h).</li>`
      : "";

  const dropBlock =
    payload.tempDrops.length > 0
      ? `<li><strong>Shock termico:</strong> ${payload.tempDrops.join(", ")}</li>`
      : "";

  const hasAnyAlert =
    payload.frostRisk ||
    payload.fungalRisk ||
    !!payload.intenseRainRisk ||
    !!payload.hailRisk ||
    payload.tempDrops.length > 0;

  const noAlertsBlock = !hasAnyAlert
    ? "<li><strong>Estado actual:</strong> No hay eventos urgentes detectados para esta parcela.</li>"
    : "";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.45; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">Alerta VESTA para tu parcela</h2>
      <p style="margin: 0 0 12px;">Detectamos una condicion de riesgo en tu monitoreo.</p>
      <p style="margin: 0 0 10px;"><strong>Ubicacion:</strong> ${location}</p>
      <ul style="margin: 0 0 14px; padding-left: 20px;">
        ${frostBlock}
        ${fungalBlock}
        ${intenseRainBlock}
        ${hailBlock}
        ${dropBlock}
        ${noAlertsBlock}
      </ul>
      <p style="margin: 0 0 12px;">Entrar al dashboard: <a href="https://vesta.vercel.app">vesta.vercel.app</a></p>
      <p style="margin: 0; color: #6b7280; font-size: 12px;">Este mensaje fue generado automaticamente por VESTA.</p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NotifyBody;

    if (!body.email || !isValidEmail(body.email)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ALERTS_FROM_EMAIL;

    if (!apiKey || !from) {
      return NextResponse.json(
        {
          error:
            "Faltan RESEND_API_KEY o ALERTS_FROM_EMAIL en variables de entorno",
        },
        { status: 500 },
      );
    }

    const subject = buildSubject(body);
    const html = buildHtml(body);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [body.email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return NextResponse.json(
        { error: resendData?.message || "No se pudo enviar el email" },
        { status: 502 },
      );
    }

    return NextResponse.json({ status: "sent", id: resendData?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/alert/notify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
