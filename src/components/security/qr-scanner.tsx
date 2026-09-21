'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, CameraOff, XCircle } from 'lucide-react';

type BarcodeDetectorResult = { rawValue: string };

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
    };
  }
}

export default function QrScanner({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  // Input manual: se inicializa una vez (el buscador de arriba ya refleja `?code=`).
  const [manual, setManual] = useState(initialCode);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDetected = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      stopCamera();
      setOpen(false);
      // El QR del email contiene el id de la reserva (UUID).
      // `?code=` ya filtra por prefijo en el Server Component.
      router.push(`/security?code=${encodeURIComponent(code.slice(0, 8))}`);
    },
    [router, stopCamera],
  );

  const startCamera = useCallback(async () => {
    setError(null);
    if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
      setSupported(false);
      setError('Este dispositivo/navegador no permite acceder a la cámara. Usa la búsqueda manual.');
      return;
    }
    if (!window.BarcodeDetector) {
      setSupported(false);
      setError(
        'Tu navegador no soporta lectura QR nativa (se necesita Chrome/Edge en Android o Safari 17+). Usa la búsqueda manual por código.',
      );
      // Igual abrimos cámara como vista previa? No: sin detector no podemos decodificar.
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scanningRef.current = true;
      const loop = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          // Solo escanear cuando hay frames listos.
          if (videoRef.current.readyState >= 2) {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0 && results[0].rawValue) {
              handleDetected(results[0].rawValue);
              return;
            }
          }
        } catch {
          // Ignorar errores transitorios de detección y seguir intentando.
        }
        rafRef.current = requestAnimationFrame(() => {
          // ~4 lecturas/seg para no saturar CPU del teléfono.
          setTimeout(loop, 250);
        });
      };
      loop();
    } catch (err) {
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Actívalo en el navegador y reintenta.'
        : 'No se pudo abrir la cámara. Revisa permisos o usa búsqueda manual.';
      setError(msg);
    }
  }, [handleDetected]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // La cámara se abre desde gesto de usuario (el permiso lo exige en
  // varios navegadores). El video ya está montado cuando `open=true`,
  // así que diferimos un tick para que el ref exista.
  const handleOpen = () => {
    setError(null);
    setSupported(true);
    setOpen(true);
    setTimeout(() => void startCamera(), 50);
  };

  const handleClose = () => {
    stopCamera();
    setOpen(false);
  };

  if (!open) {
    return (
      <Button onClick={handleOpen} className="w-full sm:w-auto">
        <QrCode className="mr-2 h-4 w-4" /> Escanear QR con cámara
      </Button>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">Apunta al QR del correo o de la app</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
          >
            <XCircle className="mr-1 h-4 w-4" /> Cerrar
          </Button>
        </div>
        {supported && !error ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full max-h-72 rounded-lg bg-black object-cover"
          />
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <CameraOff className="h-4 w-4 shrink-0" />
            <span>{error ?? 'Cámara no disponible.'}</span>
          </div>
        )}
        {supported && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim().length >= 4) {
              stopCamera();
              setOpen(false);
              router.push(`/security?code=${encodeURIComponent(manual.trim().slice(0, 8))}`);
            }
          }}
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="o pega el código (8 chars del QR)"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            minLength={4}
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
