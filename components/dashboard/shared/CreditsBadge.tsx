// components/dashboard/shared/CreditsBadge.tsx
//
// El marco de créditos del header del dashboard (admin y colaborador — el
// superadmin no tiene negocio, así que no lo ve). Muestra el saldo con la
// moneda de marca. `credits === null` = el módulo de créditos todavía no
// está aplicado en la DB (o el negocio no tiene wallet): muestra "—" en
// vez de romper.
//
// `href` opcional: el admin va a la pantalla de créditos; el colaborador
// solo ve el saldo (sin link), porque no gestiona la suscripción.
import Link from "next/link";
import { CreditCoin } from "./CreditCoin";

interface CreditsBadgeProps {
  credits: number | null;
  href?: string | null;
}

export function CreditsBadge({ credits, href = null }: CreditsBadgeProps) {
  const inner = (
    <>
      <CreditCoin className="h-7 w-7 drop-shadow-[0_0_9px_rgba(76,194,232,0.65)]" />
      <span
        className="text-base font-semibold tabular-nums"
        style={{ color: "var(--nexora-ink)" }}
      >
        {credits === null ? "—" : credits.toLocaleString("es-CO")}
      </span>
      <span className="hidden text-[13px] sm:inline" style={{ color: "var(--nexora-ink-dim)" }}>
        créditos
      </span>
    </>
  );

  const cls = "flex items-center gap-2.5 px-1 py-1";

  if (href) {
    return (
      <Link
        href={href}
        title="Tus créditos"
        className={`${cls} rounded-full transition-opacity hover:opacity-80`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={cls} title="Créditos del negocio">
      {inner}
    </div>
  );
}
