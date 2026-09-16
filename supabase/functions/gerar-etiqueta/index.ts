import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { criarPrePostagem, type Pacote, type RemetenteDestinatario } from '../_shared/correios.ts'
import {
  adicionarAoCarrinhoME,
  comprarEGerarEtiquetaME,
  type Pacote as PacoteME,
  type EnderecoME,
} from '../_shared/melhor-envio.ts'

/**
 * Gera a etiqueta (ou registra o combinado) para os itens de UM artesão
 * dentro de um pedido. Chamada pelo artesão ao preparar o envio.
 *
 * Ramifica pela transportadora que o artesão escolheu — a remessa já
 * carrega isso desde a criação do pedido, então esta função não decide,
 * só executa.
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
    const combinarNota = body?.combinar_nota as string | undefined
    if (!orderId) return json({ error: 'Pedido não informado.' }, 400)

    const { data: souVendedor } = await admin.rpc('is_order_seller', {
      _order_id: orderId, _user_id: user.id,
    })
    const { data: papelAdmin } = await admin
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    if (!souVendedor && !papelAdmin) return json({ error: 'Você não tem itens neste pedido.' }, 403)

    const artisanId = souVendedor ? user.id : (body?.artisan_user_id as string)
    if (!artisanId) return json({ error: 'Informe o artesão.' }, 400)

    const { data: remessa } = await admin
      .from('shipments').select('id, carrier, status').eq('order_id', orderId).eq('artisan_user_id', artisanId).maybeSingle()
    if (!remessa) return json({ error: 'Remessa não encontrada para este pedido.' }, 404)
    if (['postado', 'em_transito', 'entregue', 'combinado'].includes(remessa.status)) {
      return json({ error: 'Este envio já foi processado.' }, 409)
    }

    // ---- combinar: sem chamada externa, só registra a nota ----
    if (remessa.carrier === 'combinar') {
      await admin.from('shipments')
        .update({ status: 'combinado', combinar_nota: combinarNota ?? null })
        .eq('id', remessa.id)
      return json({ combinado: true })
    }

    const { data: pedido } = await admin
      .from('orders')
      .select('buyer_name, buyer_document, buyer_phone, shipping_zipcode, shipping_street, shipping_number, shipping_complement, shipping_district, shipping_city, shipping_state')
      .eq('id', orderId).maybeSingle()
    if (!pedido?.shipping_zipcode) return json({ error: 'Pedido sem endereço de entrega.' }, 409)

    const { data: origem } = await admin
      .from('artisan_billing')
      .select('origin_zip_code, origin_street, origin_number, origin_complement, origin_district, origin_city, origin_state, origin_phone, holder_name, holder_document')
      .eq('artisan_user_id', artisanId).maybeSingle()
    if (!origem?.origin_zip_code || !origem.origin_street || !origem.origin_number) {
      return json({ error: 'Cadastre seu endereço de origem em Recebimento antes de gerar a etiqueta.' }, 409)
    }

    const { data: itens } = await admin
      .from('order_items')
      .select('product_id, product_name, quantity, unit_price_cents')
      .eq('order_id', orderId).eq('artisan_user_id', artisanId)
    if (!itens?.length) return json({ error: 'Nenhum item seu neste pedido.' }, 404)

    const { data: produtos } = await admin
      .from('products')
      .select('id, weight_grams, length_cm, width_cm, height_cm')
      .in('id', itens.map((i) => i.product_id).filter(Boolean) as string[])

    const pesoTotalG = itens.reduce((s, i) => {
      const p = produtos?.find((x) => x.id === i.product_id)
      return s + (p?.weight_grams ?? 300) * i.quantity
    }, 0) || 300
    const comprimento = Math.max(...(produtos ?? []).map((p) => p.length_cm ?? 16), 16)
    const largura = Math.max(...(produtos ?? []).map((p) => p.width_cm ?? 11), 11)
    const altura = (produtos ?? []).reduce((s, p) => s + (p.height_cm ?? 2), 0) || 2

    const remetenteBase = {
      nome: origem.holder_name ?? 'Artesão Feito à Mão',
      documento: origem.holder_document ?? '',
      telefone: origem.origin_phone ?? undefined,
      cep: origem.origin_zip_code,
      endereco: origem.origin_street,
      numero: origem.origin_number,
      complemento: origem.origin_complement ?? undefined,
      bairro: origem.origin_district ?? '',
      cidade: origem.origin_city ?? '',
      uf: origem.origin_state ?? '',
    }
    const destinatarioBase = {
      nome: pedido.buyer_name,
      documento: pedido.buyer_document ?? '',
      telefone: pedido.buyer_phone ?? undefined,
      cep: pedido.shipping_zipcode,
      endereco: pedido.shipping_street ?? '',
      numero: pedido.shipping_number ?? 'S/N',
      complemento: pedido.shipping_complement ?? undefined,
      bairro: pedido.shipping_district ?? '',
      cidade: pedido.shipping_city ?? '',
      uf: pedido.shipping_state ?? '',
    }

    try {
      if (remessa.carrier === 'correios') {
        const servico = String(body?.service_code ?? '03298') // PAC por padrão
        const pacote: Pacote = { peso_g: pesoTotalG, comprimento_cm: comprimento, largura_cm: largura, altura_cm: altura }
        const remetente: RemetenteDestinatario = { ...remetenteBase, logradouro: remetenteBase.endereco }
        const destinatario: RemetenteDestinatario = { ...destinatarioBase, logradouro: destinatarioBase.endereco }
        const resultado = await criarPrePostagem({ servico, pacote, remetente, destinatario })

        await admin.from('shipments').update({
          service_code: servico, tracking_code: resultado.tracking_code,
          label_url: resultado.label_url, plp_id: resultado.plp_id,
          status: 'etiqueta_gerada', error: null,
        }).eq('id', remessa.id)
        await admin.from('orders').update({ tracking_code: resultado.tracking_code, tracking_carrier: 'Correios' }).eq('id', orderId)
        return json({ tracking_code: resultado.tracking_code, label_url: resultado.label_url })
      }

      if (remessa.carrier === 'melhor_envio') {
        const pacoteME: PacoteME = { peso_kg: pesoTotalG / 1000, comprimento_cm: comprimento, largura_cm: largura, altura_cm: altura }
        const remetenteME: EnderecoME = remetenteBase
        const destinatarioME: EnderecoME = destinatarioBase
        const serviceId = Number(body?.service_id ?? 0)
        if (!serviceId) return json({ error: 'Escolha um serviço de transporte antes de gerar a etiqueta.' }, 400)

        // Valor declarado = soma real dos itens (em centavos), não um
        // placeholder: o seguro dos Correios/transportadora é sobre o
        // valor de mercado da mercadoria, senão o ressarcimento em caso de
        // extravio fica errado.
        const subtotalArtesao = itens.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0)
        const { cart_id } = await adicionarAoCarrinhoME({
          service_id: serviceId, pacote: pacoteME, remetente: remetenteME, destinatario: destinatarioME,
          valorDeclarado: subtotalArtesao || 10000,
        })
        const resultado = await comprarEGerarEtiquetaME(cart_id)

        await admin.from('shipments').update({
          melhor_envio_cart_id: cart_id, melhor_envio_order_id: resultado.melhor_envio_order_id,
          tracking_code: resultado.tracking_code, label_url: resultado.label_url,
          status: 'etiqueta_gerada', error: null,
        }).eq('id', remessa.id)
        if (resultado.tracking_code) {
          await admin.from('orders').update({ tracking_code: resultado.tracking_code, tracking_carrier: 'Transportadora (Melhor Envio)' }).eq('id', orderId)
        }
        return json({ tracking_code: resultado.tracking_code, label_url: resultado.label_url })
      }

      return json({ error: 'Transportadora desconhecida.' }, 400)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown'
      console.error('Falha ao gerar etiqueta', remessa.carrier, msg)
      const naoConfigurado = msg.includes('NAO_CONFIGURADO')
      const amigavel = naoConfigurado
        ? 'A integração de envio ainda não está configurada. Anote o código de rastreio manualmente por enquanto.'
        : 'Não foi possível gerar a etiqueta agora. Tente novamente em instantes.'
      await admin.from('shipments').update({ status: 'erro', error: msg }).eq('id', remessa.id)
      return json({ error: amigavel }, 502)
    }
  } catch (e) {
    console.error('Erro em gerar-etiqueta', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'Erro inesperado.' }, 500)
  }
})
