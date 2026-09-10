// lib/services/productCategoryService.ts
//
// Categorías de producto por negocio (`product_categories`,
// docs/sql/product-categories.sql). Se gestionan aparte del producto; el
// campo `products.category` sigue guardando el NOMBRE de la categoría (no
// se migró a FK — así el agente, el CSV y los filtros no cambian). Crear
// una categoría = una fila acá; renombrar (futuro) = update de la fila +
// UPDATE de products.category.
//
// Lecturas/escrituras por el cliente normal — la policy
// `product_categories_member_all` cubre "cualquier miembro del negocio".
// El filtro admin/colaborador-con-permiso se aplica en la capa de acciones.
import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";

export interface ProductCategory {
  id: string;
  name: string;
}

// Degrada suave: si la tabla no está aplicada, devuelve [].
export async function getProductCategories(businessId: string): Promise<ProductCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name")
    .eq("business_id", businessId)
    .order("name");
  if (error) {
    console.error("[getProductCategories] error:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
}

// Crea la categoría. Si ya existe una con el mismo nombre (sin distinguir
// mayúsculas/espacios), devuelve esa — nunca duplica.
export async function createProductCategory(
  businessId: string,
  rawName: string
): Promise<{ error: string | null; category: ProductCategory | null }> {
  const name = rawName.trim();
  if (name.length < 1 || name.length > 60) {
    return { error: "El nombre de la categoría debe tener entre 1 y 60 caracteres.", category: null };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("product_categories")
    .select("id, name")
    .eq("business_id", businessId)
    .ilike("name", name)
    .maybeSingle();
  if (existing) {
    return { error: null, category: { id: existing.id as string, name: existing.name as string } };
  }

  const { data, error } = await supabase
    .from("product_categories")
    .insert({ business_id: businessId, name })
    .select("id, name")
    .single();
  if (error) {
    // Carrera con el índice único → tratamos como "ya existe".
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("business_id", businessId)
        .ilike("name", name)
        .maybeSingle();
      if (raced) return { error: null, category: { id: raced.id as string, name: raced.name as string } };
    }
    return { error: translateError(error), category: null };
  }
  return { error: null, category: { id: data.id as string, name: data.name as string } };
}

// Borra la categoría. Los productos que la tenían quedan con el nombre en
// `products.category` (dato histórico) — no se tocan; el dueño los
// reasigna si quiere.
export async function deleteProductCategory(
  businessId: string,
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);
  return { error: error ? translateError(error) : null };
}
