import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Cadastra o artesão como RECEBEDOR no Pagar.me.
 *
 * Sem isso não existe split: o gateway precisa saber para qual conta enviar
 * a parte do artesão. O recebedor passa por KYC (análise de documento e
 * dados bancários) antes de poder receber — por isso guardamos kyc_status e
 * só liberamos a venda quando o gateway confirma.
 *
 * Dados bancários NUNCA são gravados por aqui pelo cliente: chegam nesta
 * função, vão para o Pagar.me e o que fica no nosso banco é apenas o
 * suficiente para o artesão conferir (últimos dígitos e status).
 */

function onlyDigits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

// Valida CPF (11) ou CNPJ (14) com dígitos verificadores.
function documentoValido(doc: string): boolean {
  if (doc.length === 11) {
    if (/^(\d)\1{10}$/.test(doc)) return false
    for (const [fim, peso] of [[9, 10], [10, 11]] as const) {
      let soma = 0
      for (let i = 0; i < fim; i++) soma += Number(doc[i]) * (peso - i)
      let dv = (soma * 10) % 11
      if (dv === 10) dv = 0
      if (dv !== Number(doc[fim])) return false
    }
    return true
  }
  if (doc.length === 14) {
    if (/^(\d)\1{13}$/.test(doc)) return false
    const calc = (base: string, pesos: number[]) => {
      const soma = base.split('').reduce((s, d, i) => s + Number(d) * pesos[i], 0)
      const r = soma % 11
      return r < 2 ? 0 : 11 - r
    }
    const d1 = calc(doc.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    const d2 = calc(doc.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return d1 === Number(doc[12]) && d2 === Number(doc[13])
  }
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const secretKey = Deno.env.get('PAGARME_SECRET_KEY')
    if (!secretKey) {
      console.error('PAGARME_SECRET_KEY ausente')
      return json({ error: 'Pagamentos indisponíveis no momento.' }, 503)
    }

    // Identidade vem do JWT: nunca de um id enviado pelo cliente.
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
    if (!token) return json({ error: 'Faça login para continuar.' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    const user = userData?.user
    if (userErr || !user) return json({ error: 'Sessão inválida. Entre novamente.' }, 401)

    // Só artesão cadastra recebedor.
    const { data: papel } = await admin
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'artisan').maybeSingle()
    if (!papel) return json({ error: 'Abra sua loja antes de cadastrar o recebimento.' }, 403)

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: 'Requisição inválida.' }, 400)

    const documento = onlyDigits(body.holder_document)
    const nome = String(body.holder_name ?? '').trim()
    const banco = onlyDigits(body.bank_code)
    const agencia = onlyDigits(body.branch_number)
    const conta = onlyDigits(body.account_number)
    const dv = onlyDigits(body.account_check_digit)
    const tipo = body.account_type === 'savings' ? 'savings' : 'checking'
    const email = String(body.email ?? user.email ?? '').trim()

    if (nome.length < 3) return json({ error: 'Informe o nome do titular da conta.' }, 400)
    if (!documentoValido(documento)) return json({ error: 'CPF ou CNPJ inválido.' }, 400)
    if (banco.length !== 3) return json({ error: 'Código do banco deve ter 3 dígitos.' }, 400)
    if (!agencia || !conta) return json({ error: 'Informe agência e conta.' }, 400)

    const jaExiste = await admin
      .from('artisan_billing').select('pagarme_recipient_id')
      .eq('artisan_user_id', user.id).maybeSingle()
    if (jaExiste.data?.pagarme_recipient_id) {
      return json({ error: 'Você já possui um recebimento cadastrado.' }, 409)
    }

    const pessoaFisica = documento.length === 11
    const payload = {
      register_information: {
        type: pessoaFisica ? 'individual' : 'corporation',
        document: documento,
        email,
        ...(pessoaFisica
          ? { name: nome, site_url: undefined }
          : { company_name: nome, trading_name: nome }),
      },
      default_bank_account: {
        holder_name: nome,
        holder_type: pessoaFisica ? 'individual' : 'company',
        holder_document: documento,
        bank: banco,
        branch_number: agencia,
        account_number: conta,
        account_check_digit: dv,
        type: tipo,
      },
      // Repasse automático semanal; o artesão não precisa pedir saque.
      transfer_settings: { transfer_enabled: true, transfer_interval: 'weekly', transfer_day: 5 },
      automatic_anticipation_settings: { enabled: false },
    }

    const res = await fetch('https://api.pagar.me/core/v5/recipients', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${secretKey}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)

    if (!res.ok || !data?.id) {
      // Log interno detalhado; para o usuário, mensagem sem dado do gateway.
      console.error('Falha ao criar recebedor', { status: res.status, msg: data?.message })
      return json({ error: 'Não foi possível cadastrar seu recebimento. Confira os dados bancários.' }, 502)
    }

    const status: string = data.status ?? 'registration'
    const kyc = status === 'active' ? 'aprovado' : status === 'refused' ? 'recusado' : 'enviado'

    await admin.from('artisan_billing').upsert({
      artisan_user_id: user.id,
      pagarme_recipient_id: data.id,
      recipient_status: status,
      kyc_status: kyc,
      kyc_url: data.kyc_link?.url ?? null,
      kyc_url_expires_at: data.kyc_link?.expiration_date ?? null,
      can_withdraw: status === 'active',
      holder_name: nome,
      // Só os últimos dígitos: o número completo fica no gateway.
      holder_document: documento.slice(-4),
      bank_code: banco,
      branch_number: agencia,
      account_number: conta.slice(-4),
      account_check_digit: dv,
      account_type: tipo,
    }, { onConflict: 'artisan_user_id' })

    return json({
      recipient_id: data.id,
      status,
      kyc_status: kyc,
      kyc_url: data.kyc_link?.url ?? null,
      can_withdraw: status === 'active',
    })
  } catch (e) {
    console.error('Erro em criar-recebedor', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'Erro inesperado. Tente novamente.' }, 500)
  }
})
