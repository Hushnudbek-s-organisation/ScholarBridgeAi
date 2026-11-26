import { headers } from "next/headers";

export async function PublicStructuredData({ entry }: { entry: Record<string, string> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const json = JSON.stringify({ "@context": "https://schema.org", ...entry }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />;
}
