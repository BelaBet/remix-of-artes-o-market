// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Cliente do Melhor Envio — agregador de transportadoras (Correios, Jadlog,
 * Azul Cargo, etc).
 *
 * Diferente dos Correios diretos, o Melhor Envio não exige contrato
 * empresarial: cadastro grátis, token de API (OAuth ou token de aplicação),
 * saldo pré-pago para custear os fretes. É o caminho mais rápido para ter
 * frete real funcionando antes de o contrato dos Correios sair.
 *
 * Doc: https://docs.melhorenvio.com.br
 */

const BASE = Deno.env.get('MELHOR_ENVIO_SANDBOX') === 'true'
  ? 'https://sandbox.melhorenvio.com.br/api/v2'
  : 'https://melhorenvio.com.br/api/v2'

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

function token(): string {
  const t = Deno.env.get('MELHOR_ENVIO_TOKEN')
  if (!t) throw new Error('MELHOR_ENVIO_NAO_CONFIGURADO')
  return t
}

export interface Pacote {
  peso_kg: number
  comprimento_cm: number
  altura_cm: number
  largura_cm: number
}

export interface CotacaoME {
  service_id: number
  nome: string
  transportadora: string
  price_cents: number
  prazo_dias: number
}

/** Cotação de frete pelo Melhor Envio, entre dois CEPs, para um pacote. */
export async function cotarFreteME(
  cepOrigem: string,
  cepDestino: string,
  pacote: Pacote,
  valorDeclarado: number,
): Promise<CotacaoME[]> {
  const res = await fetch(`${BASE}/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      // Exigido pela API do Melhor Envio, identifica a aplicação.
      'User-Agent': Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'Feito à Mão (contato@feitoamao.com.br)',
    },
    body: JSON.stringify({
      from: { postal_code: cepOrigem.replace(/\D/g, '') },
      to: { postal_code: cepDestino.replace(/\D/g, '') },
      package: {
        weight: pacote.peso_kg,
        width: pacote.largura_cm,
        height: pacote.altura_cm,
        length: pacote.comprimento_cm,
      },
      options: { insurance_value: valorDeclarado / 100, receipt: false, own_hand: false },
    }),
  })
  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    console.error('Falha ao cotar no Melhor Envio', res.status, corpo.slice(0, 200))
    throw new Error('MELHOR_ENVIO_COTACAO_FALHOU')
  }
  const data = await res.json()
  // Itens com "error" são serviços indisponíveis para a rota; ignora.
  return (data as any[])
    .filter((s) => !s.error && s.price)
    .map((s) => ({
      service_id: s.id,
      nome: s.name,
      transportadora: s.company?.name ?? '',
      price_cents: Math.round(Number(s.price) * 100),
      prazo_dias: s.delivery_time ?? s.delivery_range?.max ?? 0,
    }))
}

export interface EnderecoME {
  nome: string
  documento: string
  telefone?: string
  email?: string
  cep: string
  endereco: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

/**
 * Adiciona o frete ao carrinho do Melhor Envio e retorna o id do item. A
 * etiqueta só é comprada (checkout) e gerada num passo seguinte, depois de
 * garantir saldo — separado de propósito, para nunca gastar saldo sem
 * confirmação.
 */
export async function adicionarAoCarrinhoME(params: {
  service_id: number
  pacote: Pacote
  remetente: EnderecoME
  destinatario: EnderecoME
  valorDeclarado: number
}): Promise<{ cart_id: string }> {
  const res = await fetch(`${BASE}/me/cart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      'User-Agent': Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'Feito à Mão (contato@feitoamao.com.br)',
    },
    body: JSON.stringify({
      service: params.service_id,
      from: enderecoParaME(params.remetente),
      to: enderecoParaME(params.destinatario),
      package: {
        weight: params.pacote.peso_kg,
        width: params.pacote.largura_cm,
        height: params.pacote.altura_cm,
        length: params.pacote.comprimento_cm,
      },
      options: {
        insurance_value: params.valorDeclarado / 100,
        receipt: false,
        own_hand: false,
        platform: 'Feito à Mão',
      },
    }),
  })
  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    console.error('Falha ao adicionar ao carrinho ME', res.status, corpo.slice(0, 300))
    throw new Error('MELHOR_ENVIO_CARRINHO_FALHOU')
  }
  const data = await res.json()
  return { cart_id: data.id }
}

function enderecoParaME(e: EnderecoME) {
  return {
    name: e.nome,
    document: e.documento,
    phone: e.telefone,
    email: e.email,
    address: e.endereco,
    number: e.numero,
    complement: e.complemento,
    district: e.bairro,
    city: e.cidade,
    state_abbr: e.uf,
    postal_code: e.cep.replace(/\D/g, ''),
    country_id: 'BR',
  }
}

/** Finaliza a compra do frete (debita o saldo) e gera a etiqueta. */
export async function comprarEGerarEtiquetaME(
  cartId: string,
): Promise<{ tracking_code: string | null; label_url: string; melhor_envio_order_id: string }> {
  const compra = await fetch(`${BASE}/me/shipment/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      'User-Agent': Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'Feito à Mão (contato@feitoamao.com.br)',
    },
    body: JSON.stringify({ orders: [cartId] }),
  })
  if (!compra.ok) {
    const corpo = await compra.text().catch(() => '')
    console.error('Falha ao comprar etiqueta ME', compra.status, corpo.slice(0, 300))
    throw new Error('MELHOR_ENVIO_COMPRA_FALHOU')
  }

  const geracao = await fetch(`${BASE}/me/shipment/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      'User-Agent': Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'Feito à Mão (contato@feitoamao.com.br)',
    },
    body: JSON.stringify({ orders: [cartId] }),
  })
  if (!geracao.ok) {
    const corpo = await geracao.text().catch(() => '')
    console.error('Falha ao gerar etiqueta ME', geracao.status, corpo.slice(0, 300))
    throw new Error('MELHOR_ENVIO_GERACAO_FALHOU')
  }

  const printRes = await fetch(`${BASE}/me/shipment/print`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      'User-Agent': Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'Feito à Mão (contato@feitoamao.com.br)',
    },
    body: JSON.stringify({ mode: 'private', orders: [cartId] }),
  })
  const printData = printRes.ok ? await printRes.json() : null

  // O código de rastreio só aparece depois que a transportadora coleta;
  // pode vir null nesta etapa e ser preenchido depois pela sincronização.
  const { data: pedido } = await admin()
    .from('shipments').select('tracking_code').eq('melhor_envio_cart_id', cartId).maybeSingle()

  return {
    tracking_code: pedido?.tracking_code ?? null,
    label_url: printData?.url ?? '',
    melhor_envio_order_id: cartId,
  }
}

export interface EventoME {
  status: string
  data: string
}

/** Consulta o status de rastreio pelo id do pedido no Melhor Envio. */
export async function rastrearME(orderId: string): Promise<EventoME | null> {
  const res = await fetch(`${BASE}/me/shipment/tracking`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      'User-Agent': Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'Feito à Mão (contato@feitoamao.com.br)',
    },
    body: JSON.stringify({ orders: [orderId] }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const info = data?.[orderId]
  if (!info) return null
  return { status: info.status ?? 'posted', data: info.updated_at ?? new Date().toISOString() }
}
