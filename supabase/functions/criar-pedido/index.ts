import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const BodySchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(50),
  buyer: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email().max(160),
    document: z.string().min(11).max(20),
    phone: z.string().max(30).optional(),
  }),
  shipping_address: z.object({
    line_1: z.string().max(200),
    line_2: z.string().max(200).optional(),
    zip_code: z.string().max(12),
    city: z.string().max(100),
    state: z.string().max(40),
    country: z.string().max(2).optional(),
  }).optional(),
  payment_method: z.enum(['pix', 'credit_card', 'boleto']),
  card_token: z.string().max(200).optional(),
  installments: z.number().int().min(1).max(12).optional(),
}).strict()

function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const d = (sum * 10) % 11
    return d === 10 ? 0 : d
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const secretKey = Deno.env.get('PAGARME_SECRET_KEY')
    if (!secretKey) return json({ error: 'Pagamento indisponível no momento.' }, 503)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // --- auth: derive buyer from the bearer token, never from the body ---
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return json({ error: 'Autenticação necessária.' }, 401)
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return json({ error: 'Sessão inválida ou expirada.' }, 401)
    const buyerUserId = userData.user.id

    const raw = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return json({ error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors }, 400)
    }
    const body = parsed.data

    // reject any raw card data
    const rawText = JSON.stringify(raw)
    if (/"(card_number|number|cvv|card)"\s*:/.test(rawText)) {
      return json({ error: 'Dados de cartão não podem ser enviados. Use o token do Pagar.me.' }, 400)
    }
    if (body.payment_method === 'credit_card' && !body.card_token) {
      return json({ error: 'Token do cartão ausente.' }, 400)
    }

    const document = body.buyer.document.replace(/\D/g, '')
    if (!isValidCPF(document)) return json({ error: 'CPF inválido.' }, 400)

    // --- server-side pricing ---
    const ids = [...new Set(body.items.map((i) => i.product_id))]
    const { data: products, error: prodErr } = await admin
      .from('products')
      .select('id, name, price_cents, stock, is_active, artisan_user_id')
      .in('id', ids)
    if (prodErr) return json({ error: 'Não foi possível validar os produtos.' }, 500)

    const byId = new Map((products ?? []).map((p) => [p.id, p]))
    const lines: {
      product_id: string; artisan_user_id: string; product_name: string;
      unit_price_cents: number; quantity: number; total_cents: number;
      commission_bps: number; platform_fee_cents: number; artisan_amount_cents: number;
    }[] = []

    // Recebedores dos artesãos envolvidos. Sem recebedor ativo não há para
    // onde mandar a parte do artesão e a cobrança falharia no gateway —
    // melhor barrar aqui, com mensagem clara, do que cobrar e não repassar.
    const artisanIds = [...new Set((products ?? []).map((p) => p.artisan_user_id))]
    const { data: billing } = await admin
      .from('artisan_billing')
      .select('artisan_user_id, pagarme_recipient_id, commission_bps, kyc_status, can_withdraw')
      .in('artisan_user_id', artisanIds)
    const billingById = new Map((billing ?? []).map((b) => [b.artisan_user_id, b]))

    const { data: settings } = await admin
      .from('platform_settings').select('default_commission_bps').maybeSingle()
    const defaultBps = settings?.default_commission_bps ?? 1200

    for (const item of body.items) {
      const p = byId.get(item.product_id)
      if (!p || !p.is_active) return json({ error: 'Um dos produtos não está mais disponível.' }, 400)
      if (p.stock < item.quantity) return json({ error: `Estoque insuficiente para "${p.name}".` }, 400)

      const b = billingById.get(p.artisan_user_id)
      if (!b?.pagarme_recipient_id || b.kyc_status !== 'aprovado' || !b.can_withdraw) {
        return json({
          error: `O artesão de "${p.name}" ainda não concluiu o cadastro de recebimento.`,
        }, 409)
      }

      const bps = b.commission_bps ?? defaultBps
      const totalItem = p.price_cents * item.quantity
      // Trunca a comissão: o centavo de arredondamento fica com o artesão,
      // nunca com a plataforma, e o split sempre fecha com o total.
      const fee = Math.floor((totalItem * bps) / 10000)
      lines.push({
        product_id: p.id,
        artisan_user_id: p.artisan_user_id,
        product_name: p.name,
        unit_price_cents: p.price_cents,
        quantity: item.quantity,
        total_cents: totalItem,
        commission_bps: bps,
        platform_fee_cents: fee,
        artisan_amount_cents: totalItem - fee,
      })
    }
    const subtotal = lines.reduce((s, l) => s + l.total_cents, 0)
    const total = subtotal

    // Split agregado por recebedor: o Pagar.me aceita uma regra por
    // destinatário, então somamos o que cada artesão tem no pedido.
    const porRecebedor = new Map<string, number>()
    for (const l of lines) {
      const rid = billingById.get(l.artisan_user_id)!.pagarme_recipient_id as string
      porRecebedor.set(rid, (porRecebedor.get(rid) ?? 0) + l.artisan_amount_cents)
    }
    const totalArtesaos = [...porRecebedor.values()].reduce((s, v) => s + v, 0)
    const partePlataforma = total - totalArtesaos

    const platformRecipientId = Deno.env.get('PAGARME_PLATFORM_RECIPIENT_ID')
    if (!platformRecipientId) {
      console.error('PAGARME_PLATFORM_RECIPIENT_ID ausente')
      return json({ error: 'Pagamentos indisponíveis no momento.' }, 503)
    }

    const split = [
      {
        // A plataforma responde pelas taxas do gateway e por chargeback.
        amount: partePlataforma,
        recipient_id: platformRecipientId,
        type: 'flat',
        options: { liable: true, charge_processing_fee: true, charge_remainder_fee: true },
      },
      ...[...porRecebedor.entries()].map(([rid, amount]) => ({
        amount,
        recipient_id: rid,
        type: 'flat',
        options: { liable: false, charge_processing_fee: false, charge_remainder_fee: false },
      })),
    ]

    // Conferência final: o split precisa somar exatamente o total cobrado.
    const somaSplit = split.reduce((s, r) => s + r.amount, 0)
    if (somaSplit !== total) {
      console.error('Split nao fecha', { somaSplit, total })
      return json({ error: 'Erro no cálculo do pedido. Tente novamente.' }, 500)
    }

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .insert({
        buyer_user_id: buyerUserId,
        buyer_name: body.buyer.name,
        buyer_email: body.buyer.email,
        buyer_document: document,
        buyer_phone: body.buyer.phone ?? null,
        shipping_address: body.shipping_address ?? null,
        subtotal_cents: subtotal,
        total_cents: total,
        payment_method: body.payment_method,
        status: 'pending',
      })
      .select('id')
      .single()
    if (orderErr || !order) return json({ error: 'Não foi possível criar o pedido.' }, 500)

    const { error: itemsErr } = await admin
      .from('order_items')
      .insert(lines.map((l) => ({ ...l, order_id: order.id })))
    if (itemsErr) {
      await admin.from('orders').update({ status: 'failed' }).eq('id', order.id)
      return json({ error: 'Não foi possível criar o pedido.' }, 500)
    }

    // --- Pagar.me ---
    const payments: Record<string, unknown>[] = []
    if (body.payment_method === 'pix') {
      payments.push({ payment_method: 'pix', pix: { expires_in: 1800 } })
    } else if (body.payment_method === 'boleto') {
      payments.push({
        payment_method: 'boleto',
        boleto: { instructions: 'Pagar até o vencimento.', due_at: new Date(Date.now() + 3 * 864e5).toISOString() },
      })
    } else {
      payments.push({
        payment_method: 'credit_card',
        credit_card: { installments: body.installments ?? 1, card_token: body.card_token },
      })
    }

    const phoneDigits = (body.buyer.phone ?? '').replace(/\D/g, '')
    const payload = {
      code: order.id,
      customer: {
        name: body.buyer.name,
        email: body.buyer.email,
        type: 'individual',
        document,
        document_type: 'CPF',
        ...(() => {
          // Aceita 10 (fixo), 11 (celular) ou com o 55 na frente. A versão
          // anterior usava slice(-11,-9), que num fixo de 10 dígitos devolvia
          // DDD "1" e número errado, e o gateway recusava a cobrança.
          const nacional = phoneDigits.startsWith('55') && phoneDigits.length > 11
            ? phoneDigits.slice(2)
            : phoneDigits
          if (nacional.length !== 10 && nacional.length !== 11) return {}
          return {
            phones: {
              mobile_phone: {
                country_code: '55',
                area_code: nacional.slice(0, 2),
                number: nacional.slice(2),
              },
            },
          }
        })(),
      },
      items: lines.map((l) => ({
        amount: l.unit_price_cents,
        description: l.product_name.slice(0, 255),
        quantity: l.quantity,
        code: l.product_id,
      })),
      // O split vai em cada pagamento: é ele que manda o gateway dividir o
      // dinheiro na liquidação, em vez de tudo cair na conta da plataforma.
      payments: payments.map((pg) => ({ ...pg, split })),
      ...(body.shipping_address
        ? {
            shipping: {
              amount: 0,
              description: 'Entrega',
              recipient_name: body.buyer.name,
              address: {
                line_1: body.shipping_address.line_1,
                line_2: body.shipping_address.line_2 ?? '',
                zip_code: body.shipping_address.zip_code.replace(/\D/g, ''),
                city: body.shipping_address.city,
                state: body.shipping_address.state,
                country: body.shipping_address.country ?? 'BR',
              },
            },
          }
        : {}),
    }

    let pagarme: any = null
    let ok = false
    try {
      const res = await fetch('https://api.pagar.me/core/v5/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${secretKey}:`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      pagarme = await res.json().catch(() => null)
      ok = res.ok
    } catch (_e) {
      ok = false
    }

    if (!ok || !pagarme?.id) {
      console.error('Falha ao criar cobrança no gateway', { order_id: order.id, status: pagarme?.status })
      await admin.from('orders').update({ status: 'failed' }).eq('id', order.id)
      return json({ error: 'Não foi possível processar o pagamento. Verifique os dados e tente novamente.' }, 502)
    }

    const charge = pagarme.charges?.[0]
    const tx = charge?.last_transaction ?? {}
    const update: Record<string, unknown> = {
      pagarme_order_id: pagarme.id,
      pagarme_charge_id: charge?.id ?? null,
    }
    if (body.payment_method === 'pix') {
      update.pix_qr_code = tx.qr_code ?? null
      update.pix_qr_code_url = tx.qr_code_url ?? null
      update.pix_expires_at = tx.expires_at ?? new Date(Date.now() + 1800_000).toISOString()
    } else if (body.payment_method === 'boleto') {
      update.boleto_url = tx.pdf ?? tx.url ?? null
      update.boleto_barcode = tx.line ?? tx.barcode ?? null
    }
    const paid = charge?.status === 'paid'
    if (paid) {
      update.status = 'paid'
      update.paid_at = new Date().toISOString()
    } else if (charge?.status === 'failed' || charge?.status === 'not_authorized') {
      update.status = 'failed'
    }
    await admin.from('orders').update(update).eq('id', order.id)

    if (paid) {
      // Decremento atômico: ler e depois gravar permitiria vender a mesma
      // última peça duas vezes em compras simultâneas.
      for (const l of lines) {
        await admin.rpc('decrement_stock', { _product_id: l.product_id, _qty: l.quantity })
      }
    }

    if (update.status === 'failed') {
      return json({ error: 'Pagamento não autorizado. Tente outro cartão ou método.' }, 402)
    }

    return json({
      order_id: order.id,
      status: update.status ?? 'pending',
      payment_method: body.payment_method,
      total_cents: total,
      pix_qr_code: update.pix_qr_code ?? null,
      pix_qr_code_url: update.pix_qr_code_url ?? null,
      pix_expires_at: update.pix_expires_at ?? null,
      boleto_url: update.boleto_url ?? null,
      boleto_barcode: update.boleto_barcode ?? null,
    })
  } catch (e) {
    console.error('Erro inesperado em criar-pedido', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'Erro inesperado ao processar o pedido.' }, 500)
  }
})
