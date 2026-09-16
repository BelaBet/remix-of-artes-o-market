import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cotarFreteME } from '../_shared/melhor-envio.ts'

/**
 * Cotação do Melhor Envio para o artesão escolher o serviço ANTES de gerar
 * a etiqueta. A Edge Function gerar-etiqueta exige um service_id — sem
 * este passo o artesão não tinha como descobrir qual id enviar, e o botão
 * "Gerar etiqueta" ficava travado com o erro "escolha um serviço".
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
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

    const body = await req.json().catch(() => null)
    const orderId = body?.order_id as string | undefined
    if (!orderId) return json({ error: 'Pedido não informado.' }, 400)

    const { data: souVendedor } = await admin.rpc('is_order_seller', {
      _order_id: orderId, _user_id: user.id,
    })
    if (!souVendedor) return json({ error: 'Você não tem itens neste pedido.' }, 403)

    const { data: pedido } = await admin.from('orders').select('shipping_zipcode').eq('id', orderId).maybeSingle()
    if (!pedido?.shipping_zipcode) return json({ error: 'Pedido sem endereço de entrega.' }, 409)

    const { data: origem } = await admin
      .from('artisan_billing').select('origin_zip_code').eq('artisan_user_id', user.id).maybeSingle()
    if (!origem?.origin_zip_code) {
      return json({ error: 'Cadastre seu endereço de origem em Envio antes de cotar o frete.' }, 409)
    }

    const { data: itens } = await admin
      .from('order_items')
      .select('product_id, quantity, unit_price_cents')
      .eq('order_id', orderId).eq('artisan_user_id', user.id)
    if (!itens?.length) return json({ error: 'Nenhum item seu neste pedido.' }, 404)

    const { data: produtos } = await admin
      .from('products')
      .select('id, weight_grams, length_cm, width_cm, height_cm')
      .in('id', itens.map((i) => i.product_id).filter(Boolean) as string[])

    const pesoTotalG = itens.reduce((s, i) => {
      const p = produtos?.find((x) => x.id === i.product_id)
      return s + (p?.weight_grams ?? 300) * i.quantity
    }, 0) || 300
    const valorDeclarado = itens.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0)

    const cotacoes = await cotarFreteME(origem.origin_zip_code, pedido.shipping_zipcode, {
      peso_kg: pesoTotalG / 1000,
      comprimento_cm: Math.max(...(produtos ?? []).map((p) => p.length_cm ?? 16), 16),
      largura_cm: Math.max(...(produtos ?? []).map((p) => p.width_cm ?? 11), 11),
      altura_cm: (produtos ?? []).reduce((s, p) => s + (p.height_cm ?? 2), 0) || 2,
    }, valorDeclarado)

    return json({ cotacoes })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('Erro em cotar-frete-me', msg)
    const naoConfigurado = msg.includes('NAO_CONFIGURADO')
    return json({
      error: naoConfigurado
        ? 'A integração com o Melhor Envio ainda não está configurada.'
        : 'Não foi possível cotar o frete agora.',
    }, 502)
  }
})
