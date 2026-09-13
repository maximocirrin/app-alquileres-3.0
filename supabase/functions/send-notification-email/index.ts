import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type EmailQueueRow = {
  id_email: string;
  destinatario_email: string;
  destinatario_nombre: string | null;
  asunto: string;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  categoria: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function secureEqual(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteAppLink(relativeLink: string | null) {
  const configuredBase = Deno.env.get("APP_URL") ?? "https://vivat.com.ar";
  const base = new URL(configuredBase);
  const target = new URL(relativeLink || "configuracion.html", `${base.origin}/`);
  return target.origin === base.origin ? target.toString() : `${base.origin}/configuracion.html`;
}

function buildHtml(row: EmailQueueRow) {
  const name = escapeHtml(row.destinatario_nombre || "Hola");
  const title = escapeHtml(row.titulo);
  const message = escapeHtml(row.mensaje).replaceAll("\n", "<br>");
  const link = escapeHtml(absoluteAppLink(row.enlace));
  const logoUrl = escapeHtml(
    Deno.env.get("EMAIL_LOGO_URL") ?? "https://vivat.com.ar/img/logo-lite.png",
  );

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;overflow:hidden">
          <tr><td align="center" style="background:#ffffff;padding:18px 28px 14px;border-bottom:4px solid #890527">
            <a href="https://vivat.com.ar" style="display:inline-block;text-decoration:none">
              <img src="${logoUrl}" width="104" alt="Vivat" style="display:block;width:104px;max-width:104px;height:auto;border:0;outline:none;text-decoration:none">
            </a>
          </td></tr>
          <tr><td style="padding:30px 28px">
            <p style="margin:0 0 14px;font-size:15px;color:#52525b">${name},</p>
            <h1 style="margin:0 0 16px;font-size:23px;line-height:1.25">${title}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46">${message}</p>
            <a href="${link}" style="display:inline-block;background:#890527;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">Ver en Vivat</a>
          </td></tr>
          <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.5;color:#71717a">
            Este es un aviso operativo de Vivat. Podés cambiar tus preferencias de email desde Configuración.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendWithResend(row: EmailQueueRow, apiKey: string, from: string, replyTo: string | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `vivat-notification/${row.id_email}`,
      },
      body: JSON.stringify({
        from,
        to: [row.destinatario_email],
        subject: row.asunto,
        html: buildHtml(row),
        text: `${row.titulo}\n\n${row.mensaje}\n\n${absoluteAppLink(row.enlace)}`,
        ...(replyTo ? { reply_to: replyTo } : {}),
        tags: [{ name: "category", value: row.categoria.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 256) }],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload?.id !== "string") {
      const providerMessage = typeof payload?.message === "string" ? payload.message : `Resend HTTP ${response.status}`;
      throw new Error(providerMessage.slice(0, 500));
    }
    return payload.id as string;
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  fetch: withSupabase({ auth: "none", cors: false }, async (request, context) => {
    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const expectedSecret = Deno.env.get("NOTIFICATION_EMAIL_WEBHOOK_SECRET") ?? "";
    const receivedSecret = request.headers.get("x-notification-email-secret") ?? "";
    if (!secureEqual(receivedSecret, expectedSecret)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "Vivat <notificaciones@vivat.com.ar>";
    const replyTo = Deno.env.get("RESEND_REPLY_TO") ?? null;
    if (!resendApiKey || !expectedSecret) {
      console.error("[send-notification-email] Required email configuration is missing.");
      return json({ ok: false, error: "Email delivery is not configured." }, 503);
    }

    let body: { queue_id?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const queueId = typeof body.queue_id === "string" && body.queue_id.length > 0
      ? body.queue_id
      : null;
    if (queueId && !UUID_PATTERN.test(queueId)) {
      return json({ error: "Invalid queue id." }, 400);
    }

    const { data, error } = await context.supabaseAdmin.rpc("claim_notification_email_batch", {
      p_queue_id: queueId,
      p_limit: queueId ? 1 : 20,
    });
    if (error) {
      console.error("[send-notification-email] Unable to claim queue rows:", error.message);
      return json({ ok: false, error: "Queue unavailable." }, 503);
    }

    const rows = (Array.isArray(data) ? data : []) as EmailQueueRow[];
    const results = await Promise.all(rows.map(async (row) => {
      try {
        const providerId = await sendWithResend(row, resendApiKey, from, replyTo);
        const { error: completeError } = await context.supabaseAdmin.rpc("complete_notification_email", {
          p_queue_id: row.id_email,
          p_success: true,
          p_provider_id: providerId,
          p_error: null,
        });
        if (completeError) throw completeError;
        return { id: row.id_email, sent: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Email delivery failed.";
        console.error(`[send-notification-email] ${row.id_email}:`, message);
        await context.supabaseAdmin.rpc("complete_notification_email", {
          p_queue_id: row.id_email,
          p_success: false,
          p_provider_id: null,
          p_error: message,
        });
        return { id: row.id_email, sent: false };
      }
    }));

    return json({
      ok: results.every((result) => result.sent),
      claimed: rows.length,
      sent: results.filter((result) => result.sent).length,
      failed: results.filter((result) => !result.sent).length,
    }, results.some((result) => !result.sent) ? 207 : 200);
  }),
};
