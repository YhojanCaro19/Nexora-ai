// app/(auth)/layout.tsx
import { Experience } from "@/components/experience/Experience";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Experience>{children}</Experience>;
}