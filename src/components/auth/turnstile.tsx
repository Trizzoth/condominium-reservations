'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Exportado para ocultar el widget cuando no hay keys (modo degradado). */
export function turnstileEnabled(): boolean {
  return !!SITE_KEY;
}

/**
 * CAPTCHA invisible de Cloudflare (gratis). Sin keys no se muestra
 * y el login sigue funcionando (ver verifyTurnstile en servidor).
 */
export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const cbRef = useRef(onToken);

  useEffect(() => {
    cbRef.current = onToken;
  });

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      try {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => cbRef.current(token),
          'expired-callback': () => cbRef.current(null),
          'error-callback': () => cbRef.current(null),
        });
      } catch {
        // Si el widget falla, no bloquear el login.
      }
    };

    if (window.turnstile) {
      render();
    } else {
      const script = document.querySelector('script[data-turnstile]') as HTMLScriptElement | null;
      if (!script) {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        s.async = true;
        s.defer = true;
        s.dataset.turnstile = '1';
        s.onload = render;
        document.head.appendChild(s);
      } else {
        script.addEventListener('load', render, { once: true });
        if (window.turnstile) render();
      }
    }

    return () => {
      cancelled = true;
      try {
        if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      } catch {
        // ignorar
      }
      widgetId.current = null;
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="flex justify-center" />;
}
