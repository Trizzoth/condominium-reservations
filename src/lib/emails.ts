import { Resend } from "resend";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Escapa caracteres HTML para prevenir XSS en los templates de email.
 * Los valores interpolados (nombres, notas del admin) pueden contener
 * HTML inyectado, así que deben escaparse antes de insertarlos.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  // Cliente perezoso: `new Resend()` sin API key LANZA al evaluar el módulo
  // y rompía `next build` en entornos sin la key (ej. Preview de Vercel).
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "Reservas Condominio <noreply@tudominio.com>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Email send failed:", err);
    return { success: false, error: "Failed to send email" };
  }
}

export function reservationCreatedEmail({
  userName,
  areaName,
  startTime,
  endTime,
  reservationId,
}: {
  userName: string;
  areaName: string;
  startTime: string;
  endTime: string;
  reservationId: string;
}) {
  const safeUserName = escapeHtml(userName);
  const safeAreaName = escapeHtml(areaName);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🏢 Reservas Condominio</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">Hola ${safeUserName},</h2>
        <p style="color: #4b5563;">Tu solicitud de reserva ha sido <strong style="color: #3b82f6;">recibida correctamente</strong> y está pendiente de aprobación del administrador.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 15px 0; color: #1f2937;">📋 Detalles de la reserva</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Área:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${safeAreaName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Fecha y hora:</td>
              <td style="padding: 8px 0; color: #1f2937;">${startTime} - ${endTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Estado:</td>
              <td style="padding: 8px 0;">
                <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Pendiente</span>
              </td>
            </tr>
          </table>
        </div>

        <p style="color: #6b7280; font-size: 14px;">Te notificaremos cuando el administrador apruebe o rechace tu solicitud.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reservations" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Ver mis reservas
          </a>
        </div>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        ID de reserva: ${reservationId}<br>
        © 2024 Reservas Condominio. Todos los derechos reservados.
      </p>
    </body>
    </html>
  `;
}

export function reservationApprovedEmail({
  userName,
  areaName,
  startTime,
  endTime,
  adminNotes,
}: {
  userName: string;
  areaName: string;
  startTime: string;
  endTime: string;
  adminNotes?: string;
}) {
  const safeUserName = escapeHtml(userName);
  const safeAreaName = escapeHtml(areaName);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Reserva Aprobada</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">¡Hola ${safeUserName}!</h2>
        <p style="color: #4b5563;">¡Buenas noticias! Tu reserva ha sido <strong style="color: #10b981;">aprobada por el administrador</strong>.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 15px 0; color: #1f2937;">📋 Detalles confirmados</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Área:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${safeAreaName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Fecha y hora:</td>
              <td style="padding: 8px 0; color: #1f2937;">${startTime} - ${endTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Estado:</td>
              <td style="padding: 8px 0;">
                <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Aprobada ✓</span>
              </td>
            </tr>
          </table>
          ${adminNotes ? `
            <div style="margin-top: 15px; padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #10b981;">
              <p style="margin: 0; color: #166534; font-size: 14px;"><strong>Nota del administrador:</strong> ${escapeHtml(adminNotes)}</p>
            </div>
          ` : ""}
        </div>

        <p style="color: #6b7280; font-size: 14px;">Presenta este correo (o el código QR en la app) al llegar al área común para el check-in.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reservations" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Ver reserva
          </a>
        </div>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        © 2024 Reservas Condominio. Todos los derechos reservados.
      </p>
    </body>
    </html>
  `;
}

export function reservationRejectedEmail({
  userName,
  areaName,
  startTime,
  endTime,
  adminNotes,
}: {
  userName: string;
  areaName: string;
  startTime: string;
  endTime: string;
  adminNotes?: string;
}) {
  const safeUserName = escapeHtml(userName);
  const safeAreaName = escapeHtml(areaName);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">❌ Reserva Rechazada</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">Hola ${safeUserName},</h2>
        <p style="color: #4b5563;">Tu solicitud de reserva ha sido <strong style="color: #ef4444;">rechazada por el administrador</strong>.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 15px 0; color: #1f2937;">📋 Detalles</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Área:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${safeAreaName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Fecha y hora solicitada:</td>
              <td style="padding: 8px 0; color: #1f2937;">${startTime} - ${endTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Estado:</td>
              <td style="padding: 8px 0;">
                <span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Rechazada</span>
              </td>
            </tr>
          </table>
          ${adminNotes ? `
            <div style="margin-top: 15px; padding: 12px; background: #fef2f2; border-radius: 6px; border-left: 3px solid #ef4444;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Motivo:</strong> ${escapeHtml(adminNotes)}</p>
            </div>
          ` : ""}
        </div>

        <p style="color: #6b7280; font-size: 14px;">Puedes intentar reservar en otro horario o contactar al administrador para más información.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reservations/new" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Intentar otra reserva
          </a>
        </div>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        © 2024 Reservas Condominio. Todos los derechos reservados.
      </p>
    </body>
    </html>
  `;
}

export function reservationReminderEmail({
  userName,
  areaName,
  startTime,
  endTime,
}: {
  userName: string;
  areaName: string;
  startTime: string;
  endTime: string;
}) {
  const safeUserName = escapeHtml(userName);
  const safeAreaName = escapeHtml(areaName);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Recordatorio de Reserva</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">Hola ${safeUserName},</h2>
        <p style="color: #4b5563;">Te recordamos que tienes una reserva <strong style="color: #f59e0b;">mañana</strong>.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 15px 0; color: #1f2937;">📋 Tu reserva</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Área:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${safeAreaName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Fecha y hora:</td>
              <td style="padding: 8px 0; color: #1f2937;">${startTime} - ${endTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Estado:</td>
              <td style="padding: 8px 0;">
                <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Confirmada ✓</span>
              </td>
            </tr>
          </table>
        </div>

        <p style="color: #6b7280; font-size: 14px;">No olvides llegar a tiempo para tu check-in. Si no puedes asistir, por favor cancela con anticipación.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reservations" style="background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Ver reserva
          </a>
        </div>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        © 2024 Reservas Condominio. Todos los derechos reservados.
      </p>
    </body>
    </html>
  `;
}