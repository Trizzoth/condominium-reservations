'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowDown } from 'lucide-react';

const THRESHOLD = 70;

/**
 * Pull-to-refresh para listas en el teléfono: arrastra hacia abajo
 * desde el tope y al soltar revalida la ruta (router.refresh).
 * En escritorio no estorba (solo responde a táctil).
 */
export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    const scrolled =
      window.scrollY || document.documentElement.scrollTop || containerRef.current?.scrollTop;
    if (scrolled && scrolled > 0) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (refreshing || startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy, 120));
  };

  const onTouchEnd = () => {
    if (refreshing || startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      router.refresh();
      // La animación se oculta sola al revalidar; fallback por si acaso.
      setTimeout(() => {
        setRefreshing(false);
        setPull(0);
      }, 1500);
    } else {
      setPull(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex justify-center overflow-hidden transition-all"
        style={{ height: refreshing ? 44 : pull > 10 ? Math.min(pull, 80) : 0 }}
        aria-hidden
      >
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          {refreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Actualizando...
            </>
          ) : (
            <>
              <ArrowDown
                className="h-4 w-4 transition-transform"
                style={{
                  transform: `rotate(${pull >= THRESHOLD ? 180 : 0}deg)`,
                }}
              />
              {pull >= THRESHOLD ? 'Suelta para actualizar' : 'Desliza para actualizar'}
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
