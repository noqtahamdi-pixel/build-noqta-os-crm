import { createClient } from '@/lib/supabase/server'
import { getRole, roleLabels, type AppRole } from '@/lib/env'
import Shell from '@/components/shell'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = getRole(user)
  if (!user) return null
  if (!role) return <main className="grid min-h-screen place-items-center bg-[#201d1b] px-6 text-center text-[#f3eee5]"><div><h1 className="font-serif text-3xl">Your account has no role yet.</h1><p className="mt-3 text-[#b7aa9b]">Please contact the owner.</p></div></main>
  const [{ data: styles, error: stylesError }, { data: categories, error: categoriesError }, { data: products, error: productsError }, { data: lastSync, error: syncError }] = await Promise.all([
    supabase.from('styles').select('id, name, shopify_product_type, lifecycle, is_set').order('created_at', { ascending: false }),
    supabase.from('cost_categories').select('id, name_en, name_ar, needs_review, sort').order('sort').order('name_en'),
    supabase.from('shopify_products').select('id, shopify_product_gid, title, handle, product_type, vendor, status, tags, variants, shopify_updated_at, updated_at').order('shopify_updated_at', { ascending: false }),
    supabase.from('sync_runs').select('id, kind, resource, status, started_at, finished_at, records_seen, records_upserted, error').order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const categoryIds = (categories ?? []).map((category) => category.id)
  const { data: subcategories, error: subcategoriesError } = categoryIds.length ? await supabase.from('cost_subcategories').select('id, category_id, name_en, name_ar, needs_review, sort').in('category_id', categoryIds).order('sort').order('name_en') : { data: [], error: null }

  return <Shell user={{ email: user.email ?? '', role, mfa: false }} styles={styles ?? []} categories={categories ?? []} subcategories={subcategories ?? []} products={products ?? []} lastSync={lastSync ?? null} dataError={stylesError?.message ?? categoriesError?.message ?? productsError?.message ?? syncError?.message ?? subcategoriesError?.message ?? null} />
}

export type { AppRole }
export { roleLabels }
