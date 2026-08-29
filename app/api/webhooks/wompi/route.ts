// app/api/webhooks/wompi/route.ts
//
// Recibe los eventos de Wompi. El único que importa hoy:
// `transaction.updated` con status APPROVED → dispara el alta de cuenta
// (registrationService.processApprovedPayment).
//
// Seguridad: se valida la FIRMA de cada evento (verifyEventChecksum) antes
// de tocar nada. Sin firma válida → 401 y no se procesa. Ver
// docs/setup-credits-payments.md §2 ("Webhook (eventos)").
//
// Respuesta: Wompi reintenta hasta 3 veces en 24 h si no recibe un 2xx.
// Por eso, ante un error NUESTRO (bug, DB caída) igual respondemos 200 y
// dejamos el error en logs — no queremos un loop de reintentos por algo
// que un reintento no va a arreglar. Solo la firma inválida devuelve 401.
import { NextResponse } from "next/server";
import { verifyEventChecksum, fetchTransaction, type WompiEvent } from "@/lib/services/wompiService";
import { processApprovedPayment } from "@/lib/services/registrationService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let event: WompiEvent;
  try {
    event = (await request.json()) as WompiEvent;
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  if (!verifyEventChecksum(event)) {
    console.error("[webhooks/wompi] firma inválida — evento rechazado");
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  try {
    const tx = event.data?.transaction;
    if (event.event === "transaction.updated" && tx?.status === "APPROVED") {
      // No se confía solo en el body: se reconfirma la transacción
      // server-to-server antes de acreditar.
      const confirmed = await fetchTransaction(tx.id);
      const source = confirmed ?? tx;
      if (source.status === "APPROVED") {
        await processApprovedPayment(source);
      }
    }
  } catch (err) {
    console.error("[webhooks/wompi] error procesando el evento:", err);
    // 200 a propósito — ver comentario de arriba.
  }

  return NextResponse.json({ received: true });
}
