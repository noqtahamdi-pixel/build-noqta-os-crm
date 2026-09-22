import { NextResponse } from 'next/server'
import { getRole } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createUserClient } from '@/lib/supabase/server'

type ShopifyVariant = {
  id: number
  title: string
  option1: string | null
  sku: string | null
  barcode: string | null
  price: string
  available: boolean
}

type ShopifyProduct = {
  id: number
  title: string
  handle: string
  published_at?: string | null
  created_at: string
  updated_at: string
  vendor: string
  product_type: string
  tags: string[] | string
  variants: ShopifyVariant[]
}

const sizeMap: Record<string, string> = {
  'Extra Small': 'XS',
  'X-Small': 'XS',
  Small: 'S',
  Medium: 'M',
  Large: 'L',
  'Extra Large': 'XL',
  'X-Large': 'XL',
  XL: 'XL',
  XXL: 'XXL',
  'One Size': 'OS',
  'Default Title': 'OS',
}

function normalizeSize(value: string | null | undefined) {
  return sizeMap[value ?? ''] ?? 'OS'
}

function toPayload(product: ShopifyProduct) {
  const tags = Array.isArray(product.tags)
    ? product.tags
    : product.tags.split(',').map((tag) => tag.trim()).filter(Boolean)

  return {
    id: String(product.id),
    shopify_product_gid: `gid://shopify/Product/${product.id}`,
    title: product.title,
    handle: product.handle,
    product_type: product.product_type || null,
    vendor: product.vendor || null,
    status: product.published_at ? 'active' : 'draft',
    tags,
    shopify_created_at: product.created_at,
    shopify_updated_at: product.updated_at,
    variants: (product.variants ?? []).map((variant) => ({
      id: String(variant.id),
      gid: `gid://shopify/ProductVariant/${variant.id}`,
      sku: variant.sku || null,
      size: normalizeSize(variant.title || variant.option1),
      price: variant.price,
      title: variant.title,
      barcode: variant.barcode || null,
      available: Boolean(variant.available),
    })),
  }
}

export async function POST() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  const role = getRole(user)

  if (!user || !role || !['owner', 'operations'].includes(role)) {
    return NextResponse.json({ error: 'You do not have permission to sync products.' }, { status: 403 })
  }

  const storeDomain = (process.env.SHOPIFY_STORE_DOMAIN ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!storeDomain) {
    return NextResponse.json({ error: 'SHOPIFY_STORE_DOMAIN is not configured.' }, { status: 500 })
  }

  try {
    const admin = createAdminClient()
    let page = 1
    let seen = 0
    let upserted = 0

    while (page <= 20) {
      const response = await fetch(`https://${storeDomain}/products.json?limit=250&page=${page}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) throw new Error(`Shopify returned ${response.status} while reading products.`)

      const body = await response.json() as { products?: ShopifyProduct[] }
      const products = body.products ?? []
      if (!products.length) break

      for (const product of products) {
        const { error } = await admin.rpc('shopify_upsert_product', { p: toPayload(product) })
        if (error) throw new Error(`Could not save ${product.title}: ${error.message}`)
        seen += 1
        upserted += 1
      }

      if (products.length < 250) break
      page += 1
    }

    return NextResponse.json({ ok: true, storeDomain, seen, upserted })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Product sync failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
