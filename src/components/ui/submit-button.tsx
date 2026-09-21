'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ComponentProps } from 'react';

interface SubmitButtonProps extends Omit<ComponentProps<typeof Button>, 'type'> {
  pendingText?: string;
}

/**
 * Botón submit con estado pendiente (spinner + deshabilitado).
 * Debe renderizarse DENTRO de un <form action={...}>.
 * Evita el doble-submit: sin esto, las acciones lentas (ej. esperan
 * el email SMTP) parecen muertas y el usuario clickea varias veces,
 * duplicando aprobar/rechazar/atender.
 */
export default function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingText ?? 'Guardando...'}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
