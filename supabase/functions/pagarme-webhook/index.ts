import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const webhookSecret = Deno.env.get('PAGARME_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('Webhook secret não configurado')
      return new Response('Not configured', { status: 503, headers: corsHeaders })
    }

    const rawBody = await req.text()
    const headerSig =
      req.headers.get('x-hub-signature') ??
      req.headers.get('X-Hub-Signature') ??
      req.headers.get('x-pagarme-signature') ??
      ''
    const received = headerSig.includes('=') ? headerSig.split('=').pop()!.trim() : headerSig.trim()
    const expected = await hmacHex(webhookSecret, rawBody)
    if (!received || !timingSafeEqual(received.toLowerCase(), expected)) {
      return new Response('Invalid signature', { status: 401, headers: corsHeaders })
    }

    const event = JSON.parse(rawBody)
    const type: string = event?.type ?? ''
    const data = event?.data ?? {}
    const pagarmeOrderId: string | null =
      data?.order?.id ?? (String(data?.id ?? '').startsWith('or_') ? data.id : null)
    const orderCode: string | null = data?.code ?? data?.order?.code ?? null

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    let query = admin.from('orders').select('id, status').limit(1)
    query = pagarmeOrderId
      ? query.eq('pagarme_order_id', pagarmeOrderId)
      : query.eq('id', orderCode ?? '00000000-0000-0000-0000-000000000000')
    const { data: rows } = await query
    const order = rows?.[0]
    if (!order) return new Response('ok', { status: 200, headers: corsHeaders })

    const statusMap: Record<string, string> = {
      'order.paid': 'paid',
      'charge.paid': 'paid',
      'order.payment_failed': 'failed',
      'charge.payment_failed': 'failed',
      'order.canceled': 'canceled',
      'charge.refunded': 'refunded',
    }
    const newStatus = statusMap[type]
    if (!newStatus) return new Response('ok', { status: 200, headers: corsHeaders })

    // idempotência
    if (order.status === newStatus) return new Response('ok', { status: 200, headers: corsHeaders })
    if (order.status === 'paid' && newStatus !== 'refunded') {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'paid') update.paid_at = new Date().toISOString()
    await admin.from('orders').update(update).eq('id', order.id)

    if (newStatus === 'paid') {
      const { data: items } = await admin
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id)
      // Decremento atômico (ver decrement_stock): evita venda dupla quando
      // dois webhooks ou duas compras chegam ao mesmo tempo.
      for (const it of items ?? []) {
        if (!it.product_id) continue
        await admin.rpc('decrement_stock', { _product_id: it.product_id, _qty: it.quantity })
      }
    }

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('Erro no webhook', e instanceof Error ? e.message : 'unknown')
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
})
