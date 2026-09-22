import { createClient } from '@/lib/supabase/server'
import { getRole, roleLabels, type AppRole } from '@/lib/env'
import Shell from '@/components/shell'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = getRole(user)
  if (!user) return null
  if (!role) return <main className="grid min-h-screen place-items-center bg-[#201d1b] px-6 text-center text-[#f3eee5]"><div><h1 className="font-serif text-3xl">Your account has no role yet.</h1><p className="mt-3 text-[#b7aa9b]">Please contact the owner.</p></div></main>

  const [{ data: styles, error: stylesError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from('styles').select('id, name_en, name_ar').order('created_at', { ascending: false }),
    supabase.from('cost_categories').select('id, name_en, name_ar, sort_order').order('sort_order').order('name_en'),
  ])
  const categoryIds = (categories ?? []).map((category) => category.id)
  const { data: subcategories, error: subcategoriesError } = categoryIds.length ? await supabase.from('cost_subcategories').select('id, category_id, name_en, name_ar, needs_review, sort_order').in('category_id', categoryIds).order('sort_order').order('name_en') : { data: [], error: null }

  return <Shell user={{ email: user.email ?? '', role, mfa: Boolean(user.factors?.some(factor => factor.status === 'verified')) }} styles={styles ?? []} categories={categories ?? []} subcategories={subcategories ?? []} dataError={stylesError?.message ?? categoriesError?.message ?? subcategoriesError?.message ?? null} />
}

export type { AppRole }
export { roleLabels }
