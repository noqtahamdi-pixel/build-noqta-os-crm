'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type AppRole, roleLabels } from '@/lib/env'
import {
  Boxes,
  CircleDollarSign,
  Factory,
  FileText,
  Globe2,
  LayoutDashboard,
  Menu,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'

type ProductVariant = {
  title?: string
  size?: string
  price?: string
  available?: boolean
}

type Product = {
  id: string
  shopify_product_gid: string
  title: string | null
  handle: string | null
  product_type: string | null
  vendor: string | null
  status: string | null
  tags: string[] | null
  variants: ProductVariant[] | null
  shopify_updated_at: string | null
  updated_at: string
}

type Item = { id: string; name?: string; name_en?: string; name_ar?: string; needs_review?: boolean }

const nav: [string, string, AppRole[]][] = [
  ['Dashboard', 'لوحة التحكم', ['owner', 'finance', 'operations', 'production', 'viewer']],
  ['Catalog', 'الكتالوج', ['owner', 'operations', 'production', 'viewer']],
  ['Development', 'التطوير', ['owner', 'production']],
  ['Materials & Fabric', 'الخامات والأقمشة', ['owner', 'production']],
  ['Production', 'الإنتاج', ['owner', 'production', 'operations']],
  ['Costs', 'التكاليف', ['owner', 'finance']],
  ['Marketing', 'التسويق', ['owner', 'operations']],
  ['Orders & COD', 'الطلبات والدفع عند الاستلام', ['owner', 'operations']],
  ['Customers', 'العملاء', ['owner', 'operations']],
  ['Reports', 'التقارير', ['owner', 'finance', 'operations', 'viewer']],
  ['Data Health', 'صحة البيانات', ['owner', 'operations']],
  ['Settings', 'الإعدادات', ['owner', 'finance', 'operations', 'production', 'viewer']],
]

const icons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Catalog: Package,
  Development: Sparkles,
  'Materials & Fabric': Boxes,
  Production: Factory,
  Costs: CircleDollarSign,
  Marketing: FileText,
  'Orders & COD': ShoppingBag,
  Customers: Users,
  Reports: FileText,
  'Data Health': ShieldCheck,
  Settings,
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not synced yet'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function priceRange(product: Product) {
  const prices = (product.variants ?? []).map((variant) => Number(variant.price)).filter(Number.isFinite)
  if (!prices.length) return 'Price not set'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? `${min.toFixed(2)} EGP` : `${min.toFixed(2)} - ${max.toFixed(2)} EGP`
}

export default function Shell({
  user,
  styles,
  categories,
  subcategories,
  products,
  lastSync,
  dataError,
}: {
  user: { email: string; role: AppRole; mfa: boolean }
  styles: Item[]
  categories: Item[]
  subcategories: Item[]
  products: Product[]
  lastSync: { started_at: string; finished_at: string | null; status: string; records_upserted: number } | null
  dataError: string | null
}) {
  const [active, setActive] = useState('Dashboard')
  const [rtl, setRtl] = useState(false)
  const [dark, setDark] = useState(true)
  const [mobile, setMobile] = useState(false)
  const [query, setQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const visible = nav.filter(([, , roles]) => roles.includes(user.role))
  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return products
    return products.filter((product) => `${product.title ?? ''} ${product.handle ?? ''} ${product.product_type ?? ''} ${(product.tags ?? []).join(' ')}`.toLowerCase().includes(value))
  }, [products, query])

  async function signOut() {
    await createClient().auth.signOut()
    window.location.assign('/auth/login')
  }

  async function syncProducts() {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const response = await fetch('/api/sync/products', { method: 'POST' })
      const body = await response.json() as { error?: string; upserted?: number }
      if (!response.ok) throw new Error(body.error ?? 'Product sync failed.')
      setSyncMessage(`${body.upserted ?? 0} Shopify products synced.`)
      window.setTimeout(() => window.location.reload(), 700)
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Product sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  const catalog = active === 'Catalog'
  const productCount = products.length
  const variantCount = products.reduce((total, product) => total + (product.variants?.length ?? 0), 0)

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className={dark ? 'dark min-h-screen bg-[#201d1b] text-[#f3eee5]' : 'min-h-screen bg-[#f5f1e9] text-[#302b27]'}>
      <aside className={`fixed inset-y-0 z-30 flex w-[248px] flex-col border-e border-[#39332f] bg-[#292522] p-4 transition-transform ${mobile ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full lg:ltr:translate-x-0 lg:rtl:translate-x-0'}`}>
        <div className="flex items-center justify-between px-2 pb-7">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[#6d3d42] font-bold">N</div>
            <div><div className="font-semibold tracking-[.18em]">NOQTA</div><div className="text-[10px] uppercase tracking-[.22em] text-[#88796c]">operations OS</div></div>
          </div>
          <button aria-label="Close menu" onClick={() => setMobile(false)} className="lg:hidden"><X size={18} /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {visible.map(([en, ar]) => {
            const Icon = icons[en]
            return <button key={en} onClick={() => { setActive(en); setMobile(false) }} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm ${active === en ? 'bg-[#6d3d42] text-white' : 'text-[#c7bdb1] hover:bg-[#38312d]'}`}><Icon size={17} /><span className="flex-1">{rtl ? ar : en}</span>{en === 'Catalog' && <span className="rounded-full bg-[#d5c1a8] px-1.5 text-[10px] text-[#57463b]">{productCount}</span>}</button>
          })}
        </nav>
        <div className="border-t border-[#413a35] pt-3">
          <button onClick={() => setRtl(!rtl)} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[#c7bdb1]"><Globe2 size={17} />{rtl ? 'English' : 'العربية'}</button>
          <button onClick={() => setDark(!dark)} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[#c7bdb1]">{dark ? 'Light mode' : 'Dark mode'}</button>
          <button onClick={signOut} className="mt-3 w-full rounded-xl bg-[#38312d] p-3 text-start text-xs"><span className="block truncate">{user.email}</span><span className="text-[#b9c4ad]">{roleLabels[user.role].en} · Sign out</span></button>
        </div>
      </aside>

      <div className="lg:ps-[248px]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#39332f] bg-[#201d1b]/95 px-4 py-3 backdrop-blur lg:px-8">
          <button aria-label="Open menu" onClick={() => setMobile(true)} className="rounded-lg bg-[#292522] p-2 lg:hidden"><Menu size={18} /></button>
          <div className="flex-1"><p className="text-xs uppercase tracking-[.2em] text-[#88796c]">{active}</p><h1 className="font-serif text-2xl">{catalog ? 'Shopify catalog' : 'Good to see you'}</h1></div>
          <div className="hidden items-center gap-2 rounded-xl border border-[#453d38] bg-[#292522] px-3 py-2 text-xs text-[#b9afa3] sm:flex"><ShieldCheck size={15} className="text-[#b9c4ad]" /> Data connected</div>
        </header>

        <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 lg:px-8 lg:py-8">
          {dataError && <div className="rounded-xl border border-[#8e4e4d] bg-[#4a2929] px-4 py-3 text-sm text-[#ffd5d0]">Some workspace data could not load: {dataError}</div>}
          {syncMessage && <div className="rounded-xl border border-[#6f8064] bg-[#29362a] px-4 py-3 text-sm text-[#d9efd0]">{syncMessage}</div>}

          {catalog ? <section className="space-y-5">
            <div className="flex flex-col gap-4 rounded-2xl border border-[#453d38] bg-[#292522] p-5 md:flex-row md:items-center md:justify-between">
              <div><p className="text-xs uppercase tracking-[.18em] text-[#a09284]">Product source</p><h2 className="mt-1 font-serif text-2xl">Shopify products</h2><p className="mt-1 text-sm text-[#b9afa3]">Products are stored in Supabase and can be refreshed from the store feed.</p></div>
              <div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search size={16} className="absolute start-3 top-3 text-[#88796c]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="w-full rounded-lg border border-[#51463f] bg-[#201d1b] py-2.5 ps-9 pe-3 text-sm outline-none focus:border-[#a27a76] sm:w-64" /></label>{(user.role === 'owner' || user.role === 'operations') && <button onClick={syncProducts} disabled={syncing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6d3d42] px-4 py-2.5 text-sm font-medium text-[#fff9ef] disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />{syncing ? 'Syncing...' : 'Sync Shopify'}</button>}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3"><Metric label="Products" value={String(productCount)} detail="from Shopify" /><Metric label="Variants" value={String(variantCount)} detail="saved with each product" /><Metric label="Last sync" value={lastSync?.finished_at ? formatDate(lastSync.finished_at) : formatDate(products[0]?.updated_at)} detail={lastSync?.status ?? 'catalog data'} /></div>
            <div className="overflow-hidden rounded-2xl border border-[#453d38] bg-[#292522]"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#453d38] text-xs uppercase tracking-[.12em] text-[#88796c]"><tr><th className="px-5 py-4 font-medium">Product</th><th className="px-5 py-4 font-medium">Type</th><th className="px-5 py-4 font-medium">Variants</th><th className="px-5 py-4 font-medium">Price</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Updated</th></tr></thead><tbody className="divide-y divide-[#453d38]">{filteredProducts.map((product) => <tr key={product.id} className="hover:bg-[#332d29]"><td className="px-5 py-4"><div className="font-medium text-[#f3eee5]">{product.title || 'Untitled product'}</div><div className="mt-1 text-xs text-[#88796c]">{product.handle || product.shopify_product_gid}</div></td><td className="px-5 py-4 text-[#c7bdb1]">{product.product_type || 'Uncategorized'}</td><td className="px-5 py-4 text-[#c7bdb1]">{product.variants?.length ?? 0}</td><td className="px-5 py-4 text-[#c7bdb1]">{priceRange(product)}</td><td className="px-5 py-4"><span className="rounded-full bg-[#334232] px-2.5 py-1 text-xs text-[#cce4c1]">{product.status || 'unknown'}</span></td><td className="px-5 py-4 text-xs text-[#a09284]">{formatDate(product.shopify_updated_at || product.updated_at)}</td></tr>)}{!filteredProducts.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-[#a09284]">No products match this search.</td></tr>}</tbody></table></div></div>
          </section> : <section className="space-y-6">
            <div className="rounded-2xl border border-[#453d38] bg-[#292522] p-6 lg:p-8"><p className="text-xs uppercase tracking-[.2em] text-[#a09284]">NOQTA operations OS</p><h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight">One workspace for your catalog, costs, and production.</h2><p className="mt-4 max-w-xl text-[#b9afa3]">Your Shopify catalog is connected to Supabase. Open Catalog to review products and refresh the latest store data.</p><button onClick={() => setActive('Catalog')} className="mt-6 rounded-lg bg-[#6d3d42] px-4 py-2.5 text-sm font-medium text-[#fff9ef]">Open catalog</button></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Shopify products" value={String(productCount)} detail="available in the workspace" /><Metric label="Variants" value={String(variantCount)} detail="ready for operations" /><Metric label="Styles" value={String(styles.length)} detail="internal style records" /><Metric label="Cost groups" value={String(categories.length)} detail={`${subcategories.length} subcategories`} /></div>
            <div className="rounded-2xl border border-[#453d38] bg-[#292522] p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-[#a09284]">Data health</p><h2 className="mt-1 font-serif text-2xl">Catalog connection is ready</h2></div><ShieldCheck className="text-[#b9c4ad]" /></div><div className="mt-5 grid gap-3 text-sm text-[#c7bdb1] sm:grid-cols-3"><div className="rounded-xl bg-[#201d1b] p-4"><p className="text-[#88796c]">Shopify products</p><p className="mt-2 text-[#d9efd0]">Connected</p></div><div className="rounded-xl bg-[#201d1b] p-4"><p className="text-[#88796c]">Supabase storage</p><p className="mt-2 text-[#d9efd0]">Connected</p></div><div className="rounded-xl bg-[#201d1b] p-4"><p className="text-[#88796c]">Last catalog update</p><p className="mt-2 text-[#d9efd0]">{formatDate(lastSync?.finished_at || products[0]?.updated_at)}</p></div></div></div>
          </section>}
        </main>
      </div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[#453d38] bg-[#292522] p-5"><p className="text-xs uppercase tracking-[.16em] text-[#88796c]">{label}</p><p className="mt-3 text-3xl font-semibold text-[#f3eee5]">{value}</p><p className="mt-1 text-xs text-[#a09284]">{detail}</p></div>
}
