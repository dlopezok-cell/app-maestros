import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  );

// Desglose de ganancia del maestro (tasas Chile 2026)
export function calcularDesglose(monto) {
    const comision = Math.round(monto * 0.10 * 1.19);
    const pasarela = Math.round(monto * 0.0235 * 1.19);
    const retencion = Math.round(monto * 0.1525);
    return {
          bruto: monto,
          comision,
          pasarela,
          retencion,
          liquido: monto - comision - pasarela - retencion,
    };
}

// Link de videollamada unico por reserva (Jitsi: gratis, sin API key)
export function linkVideollamada(reservaId) {
    return 'https://meet.jit.si/maestros-' + reservaId;
}
