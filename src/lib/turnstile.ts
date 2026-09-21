/**
 * Verificación Cloudflare Turnstile en servidor.
 * Sin TURNSTILE_SECRET_KEY configurado NO bloquea (modo degradado:
 * el widget ni se muestra). Con keys, token inválido/ausente = rechazo.
 */
export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Si Cloudflare no responde, no tumbar el login (fail-open auditado).
    console.error('Turnstile verify failed (fail-open)');
    return true;
  }
}
