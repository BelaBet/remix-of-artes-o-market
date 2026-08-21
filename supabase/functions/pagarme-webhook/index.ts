import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Webhook do Pagar.me.
 *
 * A Pagar.me NÃO assina os webhooks: não existe cabeçalho de assinatura na
 * documentação da v5. A proteção oferecida é (a) Basic Auth embutido na URL
 * cadastrada no painel e (b) lista de IPs. Uma versão anterior desta função
 * exigia HMAC-SHA256 e respondia 401 a tudo — todo PIX e boleto ficaria
 * eternamente "pendente".
 *
 * Como Basic Auth sozinho é um segredo compartilhado que trafega na URL, a
 * defesa principal aqui é outra: NÃO confiamos no corpo recebido. Ao receber
 * um evento, reconsultamos o pedido direto na API do Pagar.me com a chave
 * secreta e usamos o status que ELA responde. Assim, mesmo que alguém
 * descubra a URL e forje um "order.paid", nada é marcado como pago.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const STATUS_MAP: Record<string, string> = {
  paid: 'paid',
  pending: 'pending',
  processing: 'pending',
  waiting_payment: 'pending',
  failed: 'failed',
  not_authorized: 'failed',
  canceled: 'canceled',
  voided: 'canceled',
  refunded: 'refunded',
  partial_refunded: 'refunded',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const secretKey = Deno.env.get('PAGARME_SECRET_KEY')
    if (!secretKey) {
      console.error('PAGARME_SECRET_KEY ausente')
      return new Response('Not configured', { status: 503, headers: corsHeaders })
    }

    // Basic Auth opcional: só é exigido se o segredo estiver configurado.
    // Cadastre a URL no painel como https://usuario:senha@.../pagarme-webhook
    // e guarde "usuario:senha" em PAGARME_WEBHOOK_SECRET.
    const expectedBasic = Deno.env.get('PAGARME_WEBHOOK_SECRET')
    if (expectedBasic) {
      const header = req.headers.get('authorization') ?? ''
      const enviado = header.toLowerCase().startsWith('basic ')
        ? atob(header.slice(6).trim())
        : ''
      if (!enviado || !timingSafeEqual(enviado, expectedBasic)) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
    }

    const evento = await req.json().catch(() => null)
    const tipo: string = evento?.type ?? ''
    const dados = evento?.data ?? {}

    // Eventos order.* trazem o pedido em data; charge.* trazem data.order.
    const pagarmeOrderId: string | null =
      (typeof dados?.id === 'string' && dados.id.startsWith('or_') ? dados.id : null) ??
      (typeof dados?.order?.id === 'string' ? dados.order.id : null)

    if (!pagarmeOrderId) {
      // Evento que não diz respeito a pedido (cliente, cartão, plano...).
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    // ---- fonte da verdade: a própria API do Pagar.me ----
    let statusReal: string | null = null
    try {
      const res = await fetch(`https://api.pagar.me/core/v5/orders/${pagarmeOrderId}`, {
        headers: { Authorization: `Basic ${btoa(`${secretKey}:`)}` },
      })
      if (!res.ok) {
        console.error('Falha ao confirmar pedido no gateway', { pagarmeOrderId, status: res.status })
        // 5xx faz o Pagar.me reenviar depois; não marcamos nada com dúvida.
        return new Response('retry', { status: 503, headers: corsHeaders })
      }
      const pedido = await res.json()
      statusReal = pedido?.status ?? pedido?.charges?.[0]?.status ?? null
    } catch (_e) {
      return new Response('retry', { status: 503, headers: corsHeaders })
    }

    const novoStatus = statusReal ? STATUS_MAP[statusReal] : null
    if (!novoStatus) {
      console.error('Status desconhecido vindo do gateway', { statusReal, tipo })
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: rows } = await admin
      .from('orders')
      .select('id, status')
      .eq('pagarme_order_id', pagarmeOrderId)
      .limit(1)
    const pedidoLocal = rows?.[0]
    if (!pedidoLocal) return new Response('ok', { status: 200, headers: corsHeaders })

    // Idempotência: o Pagar.me reenvia webhooks e pode entregar fora de ordem.
    if (pedidoLocal.status === novoStatus) {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }
    // Pago só sai de 'paid' para estorno — nunca volta para pendente.
    if (pedidoLocal.status === 'paid' && novoStatus !== 'refunded') {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const patch: Record<string, unknown> = { status: novoStatus }
    if (novoStatus === 'paid') patch.paid_at = new Date().toISOString()
    await admin.from('orders').update(patch).eq('id', pedidoLocal.id)

    // Estoque só baixa na transição para pago, uma única vez.
    if (novoStatus === 'paid') {
      const { data: itens } = await admin
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', pedidoLocal.id)
      for (const it of itens ?? []) {
        if (!it.product_id) continue
        await admin.rpc('decrement_stock', { _product_id: it.product_id, _qty: it.quantity })
      }
    }

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('Erro no webhook', e instanceof Error ? e.message : 'unknown')
    // 5xx para o Pagar.me reenviar em vez de dar o evento por entregue.
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
