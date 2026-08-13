import { createClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { productSchema, type ProductInput } from "@/lib/validators/productSchema";
import { uploadProductImage } from "@/lib/services/productImageService";

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  active: boolean;
  image_url: string | null;
  created_at: string;
}

// Cliente normal (no admin): estas operaciones quedan sujetas a RLS
// (is_business_admin(business_id)) como defensa extra del aislamiento
// multi-tenant, no solo al filtro business_id que ya se pasa a mano.
export async function getProducts(businessId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getProducts] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }
  return data;
}

export async function createProduct(businessId: string, input: ProductInput, imageFile?: File | null) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      business_id: businessId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      stock: parsed.data.stock ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: translateError(error), data: null };
  }

  // La imagen se sube DESPUÉS de tener el id real del producto (se usa como
  // nombre del archivo). Si falla, el producto ya quedó creado igual —
  // no se trata como error fatal, se puede agregar la foto después editando.
  if (imageFile && imageFile.size > 0) {
    const uploadResult = await uploadProductImage(businessId, data.id, imageFile);
    if (uploadResult.error) {
      return { error: uploadResult.error, data };
    }
    await supabase.from("products").update({ image_url: uploadResult.url }).eq("id", data.id);
    data.image_url = uploadResult.url;
  }

  return { error: null, data };
}

export async function updateProduct(
  productId: string,
  businessId: string,
  input: ProductInput,
  imageFile?: File | null
) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let imageUrl: string | undefined;
  if (imageFile && imageFile.size > 0) {
    const uploadResult = await uploadProductImage(businessId, productId, imageFile);
    if (uploadResult.error) {
      return { error: uploadResult.error };
    }
    imageUrl = uploadResult.url ?? undefined;
  }

  const supabase = await createClient();
  // El filtro por business_id acá no es solo defensivo: sin él, alguien
  // podría intentar editar el id de un producto de OTRO negocio — RLS ya
  // lo bloquearía, pero así ni siquiera se construye una query que dependa
  // solo de eso.
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      stock: parsed.data.stock ?? null,
      // Solo se pisa image_url si de verdad llegó una foto nueva — no se
      // borra la que ya tenía el producto solo por editar otros campos.
      ...(imageUrl ? { image_url: imageUrl } : {}),
    })
    .eq("id", productId)
    .eq("business_id", businessId);

  if (error) {
    return { error: translateError(error) };
  }
  return { error: null };
}

export async function toggleProductActive(productId: string, businessId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", productId)
    .eq("business_id", businessId);

  if (error) {
    return { error: translateError(error) };
  }
  return { error: null };
}
