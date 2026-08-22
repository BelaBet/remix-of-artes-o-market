import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Estorno de pedido, iniciado pelo admin.
 *
 * Antes disto o status 'refunded' existia e o webhook o processava, mas não
 * havia como iniciar um estorno pelo sistema — só manualmente no painel do
 * Pagar.me, deixando o nosso banco desatualizado.
 *
 * Importante com split: o dinheiro já foi repassado ao artesão na
 * liquidação. O gateway estorna proporcionalmente de cada recebedor, e a
 * plataforma, como responsável (liable), cobre eventual saldo negativo do
 * artesão. Por isso só admin pode disparar.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    const secretKey = Deno.env.get('PAGARME_SECRET_KEY')
    if (!secretKey) return json({ error: 'Pagamentos indisponíveis no momento.' }, 503)

    const auth = req.headers.get('authorization') ?? ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
    if (!token) return json({ error: 'Faça login para continuar.' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: userData } = await admin.auth.getUser(token)
    const user = userData?.user
    if (!user) return json({ error: 'Sessão inválida.' }, 401)

    // Estorno move dinheiro: exige admin, verificado no banco.
    const { data: papel } = await admin
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    if (!papel) return json({ error: 'Ação restrita à administração.' }, 403)

    const body = await req.json().catch(() => null)
    const orderId = body?.order_id as string | undefined
    const motivo = String(body?.reason ?? '').trim()
    if (!orderId) return json({ error: 'Pedido não informado.' }, 400)
    if (motivo.length < 5) return json({ error: 'Descreva o motivo do estorno.' }, 400)

    const { data: pedido } = await admin
      .from('orders')
      .select('id, status, total_cents, pagarme_charge_id, pagarme_order_id')
      .eq('id', orderId).maybeSingle()
    if (!pedido) return json({ error: 'Pedido não encontrado.' }, 404)
    if (pedido.status === 'refunded') return json({ error: 'Este pedido já foi estornado.' }, 409)
    if (pedido.status !== 'paid' && pedido.status !== 'shipped' && pedido.status !== 'delivered') {
      return json({ error: 'Só é possível estornar um pedido pago.' }, 409)
    }
    if (!pedido.pagarme_charge_id) {
      return json({ error: 'Pedido sem cobrança vinculada no gateway.' }, 409)
    }

    const res = await fetch(
      `https://api.pagar.me/core/v5/charges/${pedido.pagarme_charge_id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${btoa(`${secretKey}:`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: pedido.total_cents }),
      },
    )

    if (!res.ok) {
      const erro = await res.text().catch(() => '')
      console.error('Gateway recusou o estorno', res.status, erro.slice(0, 200))
      return json({ error: 'O gateway recusou o estorno. Verifique o painel do Pagar.me.' }, 502)
    }

    // O status definitivo virá pelo webhook (charge.refunded); registramos
    // o motivo agora para não perder o rastro de quem pediu e por quê.
    await admin.from('orders')
      .update({ status: 'refunded', refund_reason: `${motivo} — por ${user.email}` })
      .eq('id', orderId)

    return json({ refunded: true, order_id: orderId })
  } catch (e) {
    console.error('Erro em estornar-pedido', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'Erro inesperado.' }, 500)
  }
})
