'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Loader2 } from 'lucide-react';

export interface IncidentArea {
  id: string;
  name: string;
}

/**
 * Reporte de incidencia con foto. La foto se comprime en el teléfono
 * (canvas, máx 1280px, JPEG 0.8) antes de subir al bucket `incidencias`,
 * y la fila se inserta por RLS (solo propia).
 */
export default function ReportForm({ areas }: { areas: IncidentArea[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [areaId, setAreaId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas no disponible'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compresión falló'))),
          'image/jpeg',
          0.8,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la imagen'));
      };
      img.src = url;
    });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }
    setError(null);
    try {
      const blob = await compressImage(file);
      const compressed = new File([blob], 'foto.jpg', { type: 'image/jpeg' });
      setPreview(URL.createObjectURL(compressed));
      if (fileRef.current) {
        const dt = new DataTransfer();
        dt.items.add(compressed);
        fileRef.current.files = dt.files;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar la foto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Ponle un título corto al daño');
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      let photoUrl: string | null = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const path = `${user.id}/${Date.now()}.jpg`;
        const { error: upError } = await supabase.storage
          .from('incidencias')
          .upload(path, file, { contentType: 'image/jpeg', upsert: false });
        if (upError) throw new Error(`Subida de foto falló: ${upError.message}`);
        const { data } = supabase.storage.from('incidencias').getPublicUrl(path);
        photoUrl = data.publicUrl;
      }

      const { error: insError } = await supabase.from('incidents').insert({
        user_id: user.id,
        common_area_id: areaId || null,
        title: title.trim(),
        description: description.trim() || null,
        photo_url: photoUrl,
        status: 'open',
      });
      if (insError) throw new Error(insError.message);

      setTitle('');
      setDescription('');
      setAreaId('');
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reportar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Área (opcional)</Label>
        <Select value={areaId} onValueChange={setAreaId}>
          <SelectTrigger>
            <SelectValue placeholder="¿En qué área pasó?" />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="incident-title">Título *</Label>
        <Input
          id="incident-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Vidrio quebrado en el salón"
          required
          maxLength={120}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="incident-desc">Detalle</Label>
        <Textarea
          id="incident-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cuéntanos qué viste y dónde exactamente"
          rows={3}
          maxLength={2000}
        />
      </div>
      <div className="space-y-2">
        <Label>Foto (opcional)</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" /> Tomar/seleccionar foto
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
            >
              Quitar
            </Button>
          )}
        </div>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vista previa" className="max-h-48 rounded-lg border" />
        )}
      </div>
      {error && <p className="rounded-md bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
          </>
        ) : (
          'Reportar incidencia'
        )}
      </Button>
    </form>
  );
}
