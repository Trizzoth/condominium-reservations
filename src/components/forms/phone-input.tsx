'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COUNTRY_CODES = [
  { code: '506', label: 'Costa Rica +506' },
  { code: '502', label: 'Guatemala +502' },
  { code: '503', label: 'El Salvador +503' },
  { code: '504', label: 'Honduras +504' },
  { code: '505', label: 'Nicaragua +505' },
  { code: '507', label: 'Panamá +507' },
  { code: '52', label: 'México +52' },
  { code: '57', label: 'Colombia +57' },
  { code: '1', label: 'EE.UU./Canadá +1' },
  { code: '34', label: 'España +34' },
] as const;

const DEFAULT_CODE = '506';

/** Solo dígitos, máx 12 (suficiente para cualquier número nacional). */
export function sanitizePhoneNumber(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 12);
}

function splitPhone(value: string): { code: string; number: string } {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { code: DEFAULT_CODE, number: '' };
  const match = COUNTRY_CODES.map((c) => c.code)
    .sort((a, b) => b.length - a.length)
    .find((c) => digits.startsWith(c));
  if (match) return { code: match, number: digits.slice(match.length) };
  return { code: DEFAULT_CODE, number: digits };
}

interface PhoneInputProps {
  value: string;
  onChange: (fullDigits: string) => void;
}

/**
 * Teléfono con código de país + solo números.
 * Guarda dígitos internacionales sin espacios (ej. 50688888888),
 * listo para wa.me y validación zod (7-15 dígitos).
 */
export default function PhoneInput({ value, onChange }: PhoneInputProps) {
  const { code, number } = splitPhone(value || '');

  const emit = (nextCode: string, nextNumber: string) => {
    const clean = sanitizePhoneNumber(nextNumber);
    onChange(clean ? `${nextCode}${clean}` : '');
  };

  return (
    <div className="flex gap-2">
      <Select value={code} onValueChange={(v) => emit(v, number)}>
        <SelectTrigger className="w-36 shrink-0" aria-label="Código de país">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              +{c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="8888 8888"
        value={number}
        onChange={(e) => emit(code, e.target.value)}
      />
    </div>
  );
}
