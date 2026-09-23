'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type AppRole, roleLabels } from '@/lib/env'
import {
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Factory,
  FileText,
  Globe2,
  LayoutDashboard,
  Layers3,
  Menu,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'

type ProductVariant = { title?: string; size?: string; price?: string; available?: boolean }
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
type Item = { id: string; name?: string; name_en?: string; name_ar?: string; needs_review?: boolean; lifecycle?: string | null; shopify_product_type?: string | null; is_set?: boolean }

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
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function priceRange(product: Product) {
  const prices = (product.variants ?? []).map((variant) => Number(variant.price)).filter(Number.isFinite)
  if (!prices.length) return 'Price not set'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? `${min.toFixed(2)} EGP` : `${min.toFixed(2)} - ${max.toFixed(2)} EGP`
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-[#a09284]">{eyebrow}</p><h2 className="mt-1 font-serif text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm text-[#b9afa3]">{description}</p></div>{action}</div>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[#453d38] bg-[#292522] p-5"><p className="text-xs uppercase tracking-[.16em] text-[#88796c]">{label}</p><p className="mt-3 text-3xl font-semibold text-[#f3eee5]">{value}</p><p className="mt-1 text-xs text-[#a09284]">{detail}</p></div>
}

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#453d38] bg-[#292522] ${className}`}>{children}</div>
}

function Status({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'muted' }) {
  const styles = { green: 'bg-[#334232] text-[#cce4c1]', amber: 'bg-[#554329] text-[#f2d39d]', muted: 'bg-[#38312d] text-[#c7bdb1]' }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${styles[tone]}`}>{children}</span>
}

export default function Shell({ user, styles, categories, subcategories, products, lastSync, dataError }: {
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
  const productCount = products.length
  const variantCount = products.reduce((total, product) => total + (product.variants?.length ?? 0), 0)
  const activeProducts = products.filter((product) => product.status === 'active').length

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

  const openCatalog = <button onClick={() => setActive('Catalog')} className="inline-flex items-center gap-2 rounded-lg bg-[#6d3d42] px-4 py-2.5 text-sm font-medium text-[#fff9ef]">Open catalog <ArrowUpRight size={16} /></button>
  const renderContent = () => {
    switch (active) {
      case 'Catalog':
        return <CatalogView products={filteredProducts} productCount={productCount} variantCount={variantCount} query={query} setQuery={setQuery} syncing={syncing} syncMessage={syncMessage} syncProducts={syncProducts} user={user} lastSync={lastSync} />
      case 'Development':
        return <DevelopmentView styles={styles} products={products} />
      case 'Materials & Fabric':
        return <MaterialsView categories={categories} subcategories={subcategories} />
      case 'Production':
        return <ProductionView products={products} variantCount={variantCount} />
      case 'Costs':
        return <CostsView categories={categories} subcategories={subcategories} />
      case 'Marketing':
        return <MarketingView products={products} />
      case 'Orders & COD':
        return <SimpleView icon={ShoppingBag} eyebrow="Commerce operations" title="Orders & cash on delivery" description="The workspace is ready for order data. Product catalog sync is active; order ingestion can be connected next without changing this navigation." action={openCatalog} />
      case 'Customers':
        return <SimpleView icon={Users} eyebrow="Customer operations" title="Customer workspace" description="Customer records will appear here once order sync is enabled. The section is active and ready for customer service workflows." action={openCatalog} />
      case 'Reports':
        return <ReportsView products={products} styles={styles} categories={categories} variantCount={variantCount} />
      case 'Data Health':
        return <HealthView products={products} styles={styles} categories={categories} subcategories={subcategories} dataError={dataError} />
      case 'Settings':
        return <SettingsView user={user} />
      default:
        return <DashboardView products={products} styles={styles} categories={categories} variantCount={variantCount} activeProducts={activeProducts} openCatalog={openCatalog} />
    }
  }

  return <div dir={rtl ? 'rtl' : 'ltr'} className={dark ? 'dark min-h-screen bg-[#201d1b] text-[#f3eee5]' : 'min-h-screen bg-[#f5f1e9] text-[#302b27]'}>
    <aside className={`fixed inset-y-0 z-30 flex w-[248px] flex-col border-e border-[#39332f] bg-[#292522] p-4 transition-transform ${mobile ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full lg:ltr:translate-x-0 lg:rtl:translate-x-0'}`}>
      <div className="flex items-center justify-between px-2 pb-7"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#6d3d42] font-bold">N</div><div><div className="font-semibold tracking-[.18em]">NOQTA</div><div className="text-[10px] uppercase tracking-[.22em] text-[#88796c]">operations OS</div></div></div><button aria-label="Close menu" onClick={() => setMobile(false)} className="lg:hidden"><X size={18} /></button></div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">{visible.map(([en, ar]) => { const Icon = icons[en]; return <button key={en} onClick={() => { setActive(en); setMobile(false) }} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm ${active === en ? 'bg-[#6d3d42] text-white' : 'text-[#c7bdb1] hover:bg-[#38312d]'}`}><Icon size={17} /><span className="flex-1">{rtl ? ar : en}</span>{en === 'Catalog' && <span className="rounded-full bg-[#d5c1a8] px-1.5 text-[10px] text-[#57463b]">{productCount}</span>}</button> })}</nav>
      <div className="border-t border-[#413a35] pt-3"><button onClick={() => setRtl(!rtl)} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[#c7bdb1]"><Globe2 size={17} />{rtl ? 'English' : 'العربية'}</button><button onClick={() => setDark(!dark)} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[#c7bdb1]">{dark ? 'Light mode' : 'Dark mode'}</button><button onClick={signOut} className="mt-3 w-full rounded-xl bg-[#38312d] p-3 text-start text-xs"><span className="block truncate">{user.email}</span><span className="text-[#b9c4ad]">{roleLabels[user.role].en} · Sign out</span></button></div>
    </aside>
    <div className="lg:ps-[248px]"><header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#39332f] bg-[#201d1b]/95 px-4 py-3 backdrop-blur lg:px-8"><button aria-label="Open menu" onClick={() => setMobile(true)} className="rounded-lg bg-[#292522] p-2 lg:hidden"><Menu size={18} /></button><div className="flex-1"><p className="text-xs uppercase tracking-[.2em] text-[#88796c]">{active}</p><h1 className="font-serif text-2xl">{active === 'Dashboard' ? 'Good to see you' : active}</h1></div><div className="hidden items-center gap-2 rounded-xl border border-[#453d38] bg-[#292522] px-3 py-2 text-xs text-[#b9afa3] sm:flex"><ShieldCheck size={15} className="text-[#b9c4ad]" /> Data connected</div></header>
      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 lg:px-8 lg:py-8">{dataError && <div className="rounded-xl border border-[#8e4e4d] bg-[#4a2929] px-4 py-3 text-sm text-[#ffd5d0]">Some workspace data could not load: {dataError}</div>}{syncMessage && active !== 'Catalog' && <div className="rounded-xl border border-[#6f8064] bg-[#29362a] px-4 py-3 text-sm text-[#d9efd0]">{syncMessage}</div>}{renderContent()}</main>
    </div>
  </div>
}

function DashboardView({ products, styles, categories, variantCount, activeProducts, openCatalog }: { products: Product[]; styles: Item[]; categories: Item[]; variantCount: number; activeProducts: number; openCatalog: ReactNode }) {
  return <section className="space-y-6"><Surface className="p-6 lg:p-8"><p className="text-xs uppercase tracking-[.2em] text-[#a09284]">NOQTA operations OS</p><h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight">One workspace for your catalog, costs, and production.</h2><p className="mt-4 max-w-xl text-[#b9afa3]">Your Shopify catalog is connected to Supabase. Review products, prepare styles, and move through the workspace from the navigation.</p><div className="mt-6">{openCatalog}</div></Surface><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Shopify products" value={String(products.length)} detail={`${activeProducts} active`} /><Metric label="Variants" value={String(variantCount)} detail="ready for operations" /><Metric label="Styles" value={String(styles.length)} detail="internal style records" /><Metric label="Cost groups" value={String(categories.length)} detail="seeded taxonomy" /></div><Surface className="p-5"><SectionHeader eyebrow="Recent catalog" title="Latest products" description="The most recently updated products stored in Supabase." action={openCatalog} /><div className="mt-5 grid gap-3 md:grid-cols-3">{products.slice(0, 3).map((product) => <div key={product.id} className="rounded-xl bg-[#201d1b] p-4"><p className="font-medium">{product.title || 'Untitled product'}</p><p className="mt-1 text-xs text-[#88796c]">{product.product_type || 'Uncategorized'}</p><p className="mt-4 text-xs text-[#a09284]">Updated {formatDate(product.shopify_updated_at || product.updated_at)}</p></div>)}</div></Surface></section>
}

function CatalogView({ products, productCount, variantCount, query, setQuery, syncing, syncMessage, syncProducts, user, lastSync }: { products: Product[]; productCount: number; variantCount: number; query: string; setQuery: (value: string) => void; syncing: boolean; syncMessage: string | null; syncProducts: () => void; user: { role: AppRole }; lastSync: { finished_at: string | null; status: string } | null }) {
  return <section className="space-y-5"><SectionHeader eyebrow="Product source" title="Shopify catalog" description="Products are stored in Supabase and can be refreshed from the store feed." action={<div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search size={16} className="absolute start-3 top-3 text-[#88796c]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="w-full rounded-lg border border-[#51463f] bg-[#201d1b] py-2.5 ps-9 pe-3 text-sm outline-none focus:border-[#a27a76] sm:w-64" /></label>{(user.role === 'owner' || user.role === 'operations') && <button onClick={syncProducts} disabled={syncing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6d3d42] px-4 py-2.5 text-sm font-medium text-[#fff9ef] disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />{syncing ? 'Syncing...' : 'Sync Shopify'}</button>}</div>} />{syncMessage && <div className="rounded-xl border border-[#6f8064] bg-[#29362a] px-4 py-3 text-sm text-[#d9efd0]">{syncMessage}</div>}<div className="grid gap-4 sm:grid-cols-3"><Metric label="Products" value={String(productCount)} detail="from Shopify" /><Metric label="Variants" value={String(variantCount)} detail="saved with each product" /><Metric label="Last update" value={lastSync?.finished_at ? formatDate(lastSync.finished_at) : formatDate(products[0]?.updated_at)} detail={lastSync?.status ?? 'catalog data'} /></div><Surface><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#453d38] text-xs uppercase tracking-[.12em] text-[#88796c]"><tr>{['Product', 'Type', 'Variants', 'Price', 'Status', 'Updated'].map((heading) => <th key={heading} className="px-5 py-4 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#453d38]">{products.map((product) => <tr key={product.id} className="hover:bg-[#332d29]"><td className="px-5 py-4"><div className="font-medium">{product.title || 'Untitled product'}</div><div className="mt-1 text-xs text-[#88796c]">{product.handle || product.shopify_product_gid}</div></td><td className="px-5 py-4 text-[#c7bdb1]">{product.product_type || 'Uncategorized'}</td><td className="px-5 py-4 text-[#c7bdb1]">{product.variants?.length ?? 0}</td><td className="px-5 py-4 text-[#c7bdb1]">{priceRange(product)}</td><td className="px-5 py-4"><Status>{product.status || 'unknown'}</Status></td><td className="px-5 py-4 text-xs text-[#a09284]">{formatDate(product.shopify_updated_at || product.updated_at)}</td></tr>)}{!products.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-[#a09284]">No products match this search.</td></tr>}</tbody></table></div></Surface></section>
}

function DevelopmentView({ styles, products }: { styles: Item[]; products: Product[] }) {
  return <section className="space-y-6"><SectionHeader eyebrow="Product development" title="Styles and product mapping" description="Prepare internal styles and connect them to the Shopify catalog." /><div className="grid gap-4 sm:grid-cols-3"><Metric label="Styles" value={String(styles.length)} detail="available to develop" /><Metric label="Mapped types" value={String(new Set(products.map((product) => product.product_type).filter(Boolean)).size)} detail="Shopify product types" /><Metric label="Sets" value={String(styles.filter((style) => style.is_set).length)} detail="multi-piece styles" /></div><Surface><div className="border-b border-[#453d38] p-5"><h3 className="font-medium">Style library</h3><p className="mt-1 text-sm text-[#a09284]">Your existing style records are ready for development work.</p></div><div className="divide-y divide-[#453d38]">{styles.map((style) => <div key={style.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{style.name || 'Unnamed style'}</p><p className="mt-1 text-xs text-[#88796c]">{style.shopify_product_type || 'No Shopify type mapped'}</p></div><Status tone={style.lifecycle === 'active' ? 'green' : 'muted'}>{style.lifecycle || 'draft'}</Status></div>)}{!styles.length && <div className="p-8 text-center text-[#a09284]">No styles yet.</div>}</div></Surface></section>
}

function MaterialsView({ categories, subcategories }: { categories: Item[]; subcategories: Item[] }) {
  return <section className="space-y-6"><SectionHeader eyebrow="Materials & fabric" title="Material taxonomy" description="Browse the seeded cost groups and subcategories used by production." /><div className="grid gap-4 sm:grid-cols-3"><Metric label="Cost groups" value={String(categories.length)} detail="top-level groups" /><Metric label="Subcategories" value={String(subcategories.length)} detail="available for costing" /><Metric label="Needs review" value={String(subcategories.filter((item) => item.needs_review).length)} detail="items to validate" /></div><div className="grid gap-4 md:grid-cols-2">{categories.map((category) => { const children = subcategories.filter((item) => item.id && (item as Item & { category_id?: string }).category_id === category.id); return <Surface key={category.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{category.name_en || category.name || 'Unnamed group'}</p><p className="mt-1 text-xs text-[#88796c]">{category.name_ar || 'No Arabic label'}</p></div>{category.needs_review && <Status tone="amber">Review</Status>}</div><p className="mt-5 text-3xl font-semibold">{children.length || '—'}</p><p className="mt-1 text-xs text-[#a09284]">subcategories linked</p></Surface>})}</div></section>
}

function ProductionView({ products, variantCount }: { products: Product[]; variantCount: number }) {
  const available = products.reduce((total, product) => total + (product.variants ?? []).filter((variant) => variant.available).length, 0)
  return <section className="space-y-6"><SectionHeader eyebrow="Production" title="Production readiness" description="Use the synchronized catalog as the starting point for production planning." /><div className="grid gap-4 sm:grid-cols-3"><Metric label="Products" value={String(products.length)} detail="in the production feed" /><Metric label="Variants" value={String(variantCount)} detail="size/color combinations" /><Metric label="Available" value={String(available)} detail="marked available by Shopify" /></div><Surface className="p-5"><div className="flex items-center gap-3"><Factory className="text-[#d5c1a8]" /><div><h3 className="font-medium">Production queue is ready</h3><p className="mt-1 text-sm text-[#a09284]">Catalog records are available for planning, materials assignment, and production status updates.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><StatusLine label="Catalog connected" /><StatusLine label="Variants loaded" /><StatusLine label="Materials taxonomy ready" /></div></Surface></section>
}

function CostsView({ categories, subcategories }: { categories: Item[]; subcategories: Item[] }) {
  return <section className="space-y-6"><SectionHeader eyebrow="Costing" title="Cost groups" description="Review the cost structure used for materials, production, and operations." /><div className="grid gap-4 sm:grid-cols-3"><Metric label="Groups" value={String(categories.length)} detail="cost categories" /><Metric label="Subcategories" value={String(subcategories.length)} detail="cost inputs" /><Metric label="Review queue" value={String(categories.filter((item) => item.needs_review).length + subcategories.filter((item) => item.needs_review).length)} detail="flagged records" /></div><Surface><div className="divide-y divide-[#453d38]">{categories.map((category) => <div key={category.id} className="flex items-center justify-between gap-4 p-5"><div><p className="font-medium">{category.name_en || category.name || 'Unnamed category'}</p><p className="mt-1 text-xs text-[#88796c]">{category.name_ar || 'No Arabic label'}</p></div><div className="flex items-center gap-3"><span className="text-sm text-[#a09284]">{subcategories.filter((item) => (item as Item & { category_id?: string }).category_id === category.id).length} inputs</span>{category.needs_review ? <Status tone="amber">Review</Status> : <Status>Ready</Status>}</div></div>)}</div></Surface></section>
}

function MarketingView({ products }: { products: Product[] }) {
  const tags = products.flatMap((product) => product.tags ?? []).reduce<Record<string, number>>((result, tag) => { result[tag] = (result[tag] ?? 0) + 1; return result }, {})
  const topTags = Object.entries(tags).sort(([, a], [, b]) => b - a).slice(0, 12)
  return <section className="space-y-6"><SectionHeader eyebrow="Marketing" title="Catalog signals" description="Use Shopify product types and tags to organize campaign and collection work." /><div className="grid gap-4 sm:grid-cols-3"><Metric label="Products" value={String(products.length)} detail="in the catalog" /><Metric label="Active" value={String(products.filter((product) => product.status === 'active').length)} detail="published products" /><Metric label="Tags" value={String(Object.keys(tags).length)} detail="marketing signals" /></div><Surface className="p-5"><h3 className="font-medium">Most-used tags</h3><div className="mt-4 flex flex-wrap gap-2">{topTags.map(([tag, count]) => <span key={tag} className="rounded-full border border-[#51463f] px-3 py-1.5 text-sm text-[#d5c1a8]">{tag} <span className="text-[#88796c]">{count}</span></span>)}{!topTags.length && <p className="text-sm text-[#a09284]">Sync products to populate marketing tags.</p>}</div></Surface></section>
}

function ReportsView({ products, styles, categories, variantCount }: { products: Product[]; styles: Item[]; categories: Item[]; variantCount: number }) {
  return <section className="space-y-6"><SectionHeader eyebrow="Reports" title="Operations snapshot" description="A live summary of the data currently available in NOQTA OS." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Products" value={String(products.length)} detail="Shopify catalog" /><Metric label="Variants" value={String(variantCount)} detail="catalog depth" /><Metric label="Styles" value={String(styles.length)} detail="internal records" /><Metric label="Cost groups" value={String(categories.length)} detail="cost structure" /></div><Surface className="p-5"><h3 className="font-medium">Report status</h3><div className="mt-4 space-y-3"><StatusLine label="Shopify catalog report" detail="Available" /><StatusLine label="Style development report" detail="Available" /><StatusLine label="Costing report" detail="Available" /><StatusLine label="Orders report" detail="Waiting for order sync" tone="amber" /></div></Surface></section>
}

function HealthView({ products, styles, categories, subcategories, dataError }: { products: Product[]; styles: Item[]; categories: Item[]; subcategories: Item[]; dataError: string | null }) {
  return <section className="space-y-6"><SectionHeader eyebrow="Data health" title="Connection checks" description="Confirm that the core workspace sources are available before operating." /><Surface className="p-5"><div className="space-y-3"><StatusLine label="Supabase connection" detail={dataError ? 'Needs attention' : 'Connected'} tone={dataError ? 'amber' : 'green'} /><StatusLine label="Shopify product catalog" detail={`${products.length} products loaded`} /><StatusLine label="Style records" detail={`${styles.length} styles loaded`} /><StatusLine label="Cost taxonomy" detail={`${categories.length} groups and ${subcategories.length} subcategories`} /></div>{dataError && <p className="mt-5 rounded-lg bg-[#4a2929] px-3 py-2 text-sm text-[#ffd5d0]">{dataError}</p>}</Surface><div className="grid gap-4 sm:grid-cols-3"><Metric label="Products" value={String(products.length)} detail="loaded successfully" /><Metric label="Styles" value={String(styles.length)} detail="loaded successfully" /><Metric label="Categories" value={String(categories.length)} detail="loaded successfully" /></div></section>
}

function SettingsView({ user }: { user: { email: string; role: AppRole } }) {
  return <section className="space-y-6"><SectionHeader eyebrow="Workspace settings" title="Account and preferences" description="Your current access and workspace preferences." /><Surface className="divide-y divide-[#453d38]"><div className="flex items-center gap-4 p-5"><Users className="text-[#d5c1a8]" /><div><p className="text-xs uppercase tracking-[.16em] text-[#88796c]">Signed-in account</p><p className="mt-1 font-medium">{user.email}</p></div></div><div className="flex items-center gap-4 p-5"><ShieldCheck className="text-[#b9c4ad]" /><div><p className="text-xs uppercase tracking-[.16em] text-[#88796c]">Access level</p><p className="mt-1 font-medium">{roleLabels[user.role].en}</p></div><Status>Active</Status></div><div className="flex items-center gap-4 p-5"><Wrench className="text-[#d5c1a8]" /><div><p className="text-xs uppercase tracking-[.16em] text-[#88796c]">Integrations</p><p className="mt-1 font-medium">Shopify catalog and Supabase connected</p></div></div></Surface></section>
}

function SimpleView({ icon: Icon, eyebrow, title, description, action }: { icon: LucideIcon; eyebrow: string; title: string; description: string; action: ReactNode }) {
  return <section className="space-y-6"><SectionHeader eyebrow={eyebrow} title={title} description={description} /><Surface className="p-8"><div className="mx-auto grid max-w-xl place-items-center text-center"><div className="grid size-14 place-items-center rounded-2xl bg-[#6d3d42] text-[#fff9ef]"><Icon size={25} /></div><h3 className="mt-5 font-serif text-2xl">This workspace section is active</h3><p className="mt-2 text-sm leading-6 text-[#a09284]">The navigation is connected. When the corresponding data source is enabled, records will appear here without changing the workspace layout.</p><div className="mt-6">{action}</div></div></Surface></section>
}

function StatusLine({ label, detail = 'Ready', tone = 'green' }: { label: string; detail?: string; tone?: 'green' | 'amber' }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl bg-[#201d1b] px-4 py-3"><div className="flex items-center gap-3"><CheckCircle2 size={17} className={tone === 'amber' ? 'text-[#f2d39d]' : 'text-[#b9c4ad]'} /><span className="text-sm">{label}</span></div><Status tone={tone}>{detail}</Status></div>
}
