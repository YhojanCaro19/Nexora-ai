// app/api/_dev/backfill-embeddings/route.ts
//
// TEMPORAL — genera el embedding de los productos que ya existían antes
// de agregar la columna `embedding` (los nuevos ya lo generan solos desde
// productService.createProduct/updateProduct). Se corre UNA sola vez,
// logueado como superadmin, y se borra después de confirmar que funcionó.
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/server";
import { generateEmbedding, buildProductEmbeddingText } from "@/lib/services/embeddingService";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: products, error } = await admin
    .from("products")
    .select("id, name, description")
    .is("embedding", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  let failed = 0;
  for (const p of products ?? []) {
    const text = buildProductEmbeddingText(p.name, p.description);
    const embedding = await generateEmbedding(text);
    if (!embedding) {
      failed++;
      continue;
    }
    const { error: updateError } = await admin.from("products").update({ embedding }).eq("id", p.id);
    if (updateError) failed++;
    else updated++;
  }

  return NextResponse.json({ total: products?.length ?? 0, updated, failed });
}
