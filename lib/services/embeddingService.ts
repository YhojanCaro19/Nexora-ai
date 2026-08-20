// lib/services/embeddingService.ts
//
// Genera embeddings de texto vía Voyage AI (voyage-4-lite, 1024
// dimensiones) — Claude no tiene API de embeddings propia; Voyage es el
// proveedor que recomienda Anthropic para RAG. Se llama vía fetch directo
// (Voyage no tiene SDK oficial de Node), así que no hace falta ninguna
// dependencia nueva en package.json, solo la API key.
//
// Server-only: VOYAGE_API_KEY nunca se expone al cliente. Solo se llama
// desde services que ya corren en el servidor (productService).
const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-4-lite";
const VOYAGE_DIMENSIONS = 1024;

// Nunca lanza — si Voyage falla (caída, rate limit, key faltante), el
// caller decide qué hacer (ej. productService no bloquea la creación del
// producto por esto, ver createProduct/updateProduct).
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    console.error("[generateEmbedding] falta VOYAGE_API_KEY — no se genera embedding");
    return null;
  }

  try {
    const res = await fetch(VOYAGE_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [text],
        model: VOYAGE_MODEL,
        output_dimension: VOYAGE_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      console.error("[generateEmbedding] Voyage respondió con error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      console.error("[generateEmbedding] respuesta de Voyage sin embedding válido:", data);
      return null;
    }
    return embedding as number[];
  } catch (error) {
    console.error("[generateEmbedding] error de red:", error);
    return null;
  }
}

// Texto que se embebe por producto — nombre + descripción es lo que
// representa "de qué se trata" para búsqueda semántica; precio/stock no
// aportan significado al embedding, por eso no se incluyen acá.
export function buildProductEmbeddingText(name: string, description: string | null, category?: string | null): string {
  const parts = [name, description, category].filter((p): p is string => !!p);
  return parts.join(". ");
}
