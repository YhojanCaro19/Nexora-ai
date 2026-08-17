// Fila label/valor usada en cualquier vista de detalle del dashboard
// (Solicitudes, Negocios, Pedidos, Inicio) — antes estaba duplicada
// idéntica en cada archivo.
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
        {label}
      </dt>
      <dd className="text-base font-semibold" style={{ color: 'var(--nexora-ink)' }}>
        {value}
      </dd>
    </div>
  );
}
