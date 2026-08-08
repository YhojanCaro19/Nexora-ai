// app/(marketing)/layout.tsx
import { Experience } from "@/components/experience/Experience";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Experience>{children}</Experience>;
}