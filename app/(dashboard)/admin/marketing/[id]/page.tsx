// app/(dashboard)/admin/marketing/[id]/page.tsx
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { getStrategy, listPieces } from "@/lib/services/marketingService";
import { StrategyDetail } from "./strategy-detail";

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile?.businessId) return null;

  const strategy = await getStrategy(profile.businessId, id);
  if (!strategy) notFound();

  const pieces = await listPieces(profile.businessId, id);

  return <StrategyDetail strategy={strategy} pieces={pieces} />;
}
