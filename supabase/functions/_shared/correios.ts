// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Cliente compartilhado da API dos Correios (Meu Correios Empresas).
 *
 * Exige contrato comercial: usuário/senha (ou cartão de postagem) emitidos
 * após aprovação do contrato. Sem isso, getToken() lança e quem chamar deve
 * cair no frete fixo por região (calcular_frete no banco) — nunca travar o
 * checkout porque os Correios estão fora do ar ou não configurados.
 *
 * Documentação: https://www.correios.com.br/atendimento/developers
 */

const BASE = 'https://api.correios.com.br'

export interface Pacote {
  peso_g: number
  comprimento_cm: number
  altura_cm: number
  largura_cm: number
}

export interface CotacaoServico {
  codigo: string
  nome: string
  price_cents: number
  prazo_dias: number
}

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

/**
 * Token Bearer, com cache em correios_token_cache. Os Correios expiram o
 * token em algumas horas — reautenticar a cada chamada seria lento e
 * arriscaria bater limite de taxa.
 */
export async function getToken(): Promise<string> {
  const usuario = Deno.env.get('CORREIOS_API_USER')
  const senha = Deno.env.get('CORREIOS_API_PASSWORD')
  const cartaoPostagem = Deno.env.get('CORREIOS_CARTAO_POSTAGEM')
  if (!usuario || !senha) {
    throw new Error('CORREIOS_NAO_CONFIGURADO')
  }

  const db = admin()
  const { data: cache } = await db
    .from('correios_token_cache').select('access_token, expires_at').eq('id', true).maybeSingle()

  // Margem de 2 minutos antes de expirar, para não usar um token no limite.
  if (cache?.access_token && cache.expires_at && new Date(cache.expires_at).getTime() - Date.now() > 120_000) {
    return cache.access_token
  }

  const res = await fetch(`${BASE}/token/v1/autentica`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${usuario}:${senha}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cartaoPostagem ? { numero: cartaoPostagem } : {}),
  })
  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    console.error('Falha ao autenticar nos Correios', res.status, corpo.slice(0, 200))
    throw new Error('CORREIOS_AUTH_FALHOU')
  }
  const data = await res.json()
  const token: string = data.token
  // expiraEm costuma vir como data ISO; se ausente, assume 3h por segurança.
  const expiresAt = data.expiraEm ?? new Date(Date.now() + 3 * 3600_000).toISOString()

  await db.from('correios_token_cache').upsert({ id: true, access_token: token, expires_at: expiresAt })
  return token
}

/**
 * Cotação de frete + prazo para um pacote entre dois CEPs.
 * Retorna [] se o serviço não atender a rota (ex: área de risco).
 */
export async function cotarFrete(
  cepOrigem: string,
  cepDestino: string,
  pacote: Pacote,
  servicos: { codigo: string; nome: string }[] = [
    { codigo: '03220', nome: 'SEDEX' },
    { codigo: '03298', nome: 'PAC' },
  ],
): Promise<CotacaoServico[]> {
  const token = await getToken()
  const resultados: CotacaoServico[] = []

  for (const servico of servicos) {
    try {
      const [preco, prazo] = await Promise.all([
        fetch(`${BASE}/preco/v1/nacional/${servico.codigo}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cepOrigem: cepOrigem.replace(/\D/g, ''),
            cepDestino: cepDestino.replace(/\D/g, ''),
            peso: pacote.peso_g,
            comprimento: pacote.comprimento_cm,
            largura: pacote.largura_cm,
            altura: pacote.altura_cm,
          }),
        }),
        fetch(`${BASE}/prazo/v1/nacional/${servico.codigo}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cepOrigem: cepOrigem.replace(/\D/g, ''),
            cepDestino: cepDestino.replace(/\D/g, ''),
          }),
        }),
      ])
      if (!preco.ok || !prazo.ok) continue
      const dPreco = await preco.json()
      const dPrazo = await prazo.json()
      const valor = Number(String(dPreco?.pcFinal ?? dPreco?.valor ?? '0').replace(',', '.'))
      resultados.push({
        codigo: servico.codigo,
        nome: servico.nome,
        price_cents: Math.round(valor * 100),
        prazo_dias: Number(dPrazo?.prazoEntrega ?? dPrazo?.prazo ?? 0),
      })
    } catch (e) {
      console.error(`Cotação falhou para ${servico.nome}`, e instanceof Error ? e.message : 'unknown')
    }
  }
  return resultados
}

export interface RemetenteDestinatario {
  nome: string
  documento: string
  telefone?: string
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

/**
 * Cria a pré-postagem (etiqueta) de um objeto. Retorna código de rastreio e
 * link do PDF da etiqueta. Cobrada no cartão de postagem do contrato — quem
 * paga é a Ankor, não o artesão; o custo pode ser repassado depois.
 */
export async function criarPrePostagem(params: {
  servico: string
  pacote: Pacote
  remetente: RemetenteDestinatario
  destinatario: RemetenteDestinatario
  valorDeclarado?: number
}): Promise<{ tracking_code: string; label_url: string; plp_id: string }> {
  const token = await getToken()
  const cartaoPostagem = Deno.env.get('CORREIOS_CARTAO_POSTAGEM')
  if (!cartaoPostagem) throw new Error('CORREIOS_NAO_CONFIGURADO')

  const res = await fetch(`${BASE}/prepostagem/v1/prepostagens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartaoPostagem,
      codigoServico: params.servico,
      remetente: {
        nome: params.remetente.nome,
        cnpjCpf: params.remetente.documento,
        telefone: params.remetente.telefone,
        endereco: {
          cep: params.remetente.cep.replace(/\D/g, ''),
          logradouro: params.remetente.logradouro,
          numero: params.remetente.numero,
          complemento: params.remetente.complemento,
          bairro: params.remetente.bairro,
          cidade: params.remetente.cidade,
          uf: params.remetente.uf,
        },
      },
      destinatario: {
        nome: params.destinatario.nome,
        cnpjCpf: params.destinatario.documento,
        telefone: params.destinatario.telefone,
        endereco: {
          cep: params.destinatario.cep.replace(/\D/g, ''),
          logradouro: params.destinatario.logradouro,
          numero: params.destinatario.numero,
          complemento: params.destinatario.complemento,
          bairro: params.destinatario.bairro,
          cidade: params.destinatario.cidade,
          uf: params.destinatario.uf,
        },
      },
      objetoServicoAdicional: params.valorDeclarado
        ? [{ codigoServicoAdicional: '019', valorDeclarado: params.valorDeclarado / 100 }]
        : [],
      pesoInformado: params.pacote.peso_g,
      formatoObjetoInformado: 2, // pacote/caixa
      comprimentoInformado: params.pacote.comprimento_cm,
      larguraInformado: params.pacote.largura_cm,
      alturaInformado: params.pacote.altura_cm,
    }),
  })

  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    console.error('Falha ao criar pré-postagem', res.status, corpo.slice(0, 300))
    throw new Error('CORREIOS_PREPOSTAGEM_FALHOU')
  }
  const data = await res.json()
  return {
    tracking_code: data.codigoObjeto ?? data.numeroEtiqueta,
    label_url: data.urlRotulo ?? data.linkEtiqueta,
    plp_id: String(data.idPrePostagem ?? data.id ?? ''),
  }
}

export interface EventoRastreio {
  data: string
  descricao: string
  status: 'postado' | 'em_transito' | 'entregue' | 'erro'
}

/** Consulta o rastreio de um objeto e traduz para os status internos. */
export async function rastrear(codigoObjeto: string): Promise<EventoRastreio[]> {
  const token = await getToken()
  const res = await fetch(`${BASE}/srorastro/v1/objetos/${codigoObjeto}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('CORREIOS_RASTREIO_FALHOU')
  const data = await res.json()
  const eventos = data?.objetos?.[0]?.eventos ?? []

  return eventos.map((e: any) => {
    const tipo = String(e.codigo ?? '').toUpperCase()
    let status: EventoRastreio['status'] = 'em_transito'
    if (tipo === 'PO' || tipo === 'PMT') status = 'postado'
    else if (tipo === 'BDE' || tipo === 'BDI') status = 'entregue'
    else if (e.codigo?.startsWith?.('LDI') || tipo === 'CD') status = 'erro'
    return {
      data: e.dtHrCriado ?? e.data,
      descricao: e.descricao ?? e.status,
      status,
    }
  })
}
