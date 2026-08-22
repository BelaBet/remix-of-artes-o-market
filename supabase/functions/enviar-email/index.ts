import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * E-mails transacionais do marketplace.
 *
 * Chamada internamente pelas outras funções (criar-pedido, webhook) e pelo
 * artesão ao despachar. Nunca exposta diretamente ao cliente sem contexto:
 * exige o service key ou um JWT de quem participa do pedido.
 *
 * Grava tudo em email_log com UNIQUE (order_id, template, recipient): o
 * webhook do Pagar.me reenvia eventos, e sem isso o comprador receberia o
 * mesmo "pagamento aprovado" várias vezes.
 */

const BRL = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type Template =
  | 'pedido_criado'
  | 'pagamento_aprovado'
  | 'pedido_enviado'
  | 'venda_recebida'
  | 'pagamento_falhou'

interface Pedido {
  id: string
  buyer_name: string
  buyer_email: string
  total_cents: number
  subtotal_cents: number
  shipping_cents: number
  status: string
  payment_method: string
  tracking_code: string | null
  tracking_carrier: string | null
}

const BASE = 'https://crafty-creations-spot.lovable.app'

function layout(titulo: string, corpo: string) {
  // HTML propositalmente simples: cliente de e-mail não é navegador.
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f2ea;font-family:Georgia,serif;color:#170D06">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ded1" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e6ded1">
<div style="font-size:20px;font-weight:600">Feito <em style="color:#B65B33">à Mão</em></div>
<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7f72;margin-top:4px">Artesanato brasileiro</div>
</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${titulo}</h1>
${corpo}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e6ded1;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8a7f72">
Você recebeu este e-mail porque fez ou recebeu um pedido no Feito à Mão.
</td></tr></table></td></tr></table></body></html>`
}

function montar(template: Template, p: Pedido): { assunto: string; html: string } {
  const link = `${BASE}/pedido/${p.id}`
  const botao = (txt: string) =>
    `<p style="margin:22px 0"><a href="${link}" style="background:#170D06;color:#f7f2ea;padding:12px 22px;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase">${txt}</a></p>`
  const resumo = `<table cellpadding="0" cellspacing="0" style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:13px;margin:16px 0">
    <tr><td style="padding:4px 0;color:#8a7f72">Produtos</td><td align="right">${BRL(p.subtotal_cents)}</td></tr>
    <tr><td style="padding:4px 0;color:#8a7f72">Frete</td><td align="right">${p.shipping_cents ? BRL(p.shipping_cents) : 'Grátis'}</td></tr>
    <tr><td style="padding:8px 0 0;border-top:1px solid #e6ded1;font-weight:bold">Total</td><td align="right" style="padding:8px 0 0;border-top:1px solid #e6ded1;font-weight:bold">${BRL(p.total_cents)}</td></tr>
  </table>`

  switch (template) {
    case 'pedido_criado':
      return {
        assunto: `Recebemos seu pedido · ${BRL(p.total_cents)}`,
        html: layout('Pedido registrado', `<p style="font-size:14px">Olá, ${p.buyer_name}. Recebemos seu pedido e estamos aguardando a confirmação do pagamento.</p>${resumo}<p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#8a7f72">${p.payment_method === 'pix' ? 'O PIX expira em 30 minutos.' : p.payment_method === 'boleto' ? 'O boleto pode levar até 3 dias úteis para compensar.' : 'Estamos processando seu cartão.'}</p>${botao('Acompanhar pedido')}`),
      }
    case 'pagamento_aprovado':
      return {
        assunto: 'Pagamento confirmado — seu pedido está a caminho',
        html: layout('Pagamento confirmado', `<p style="font-size:14px">Olá, ${p.buyer_name}. Seu pagamento de ${BRL(p.total_cents)} foi confirmado e o artesão já foi avisado.</p><p style="font-family:Helvetica,Arial,sans-serif;font-size:13px">Peças feitas à mão levam um tempo de preparo. Avisamos assim que a sua for despachada.</p>${botao('Ver pedido')}`),
      }
    case 'pedido_enviado':
      return {
        assunto: 'Seu pedido foi enviado',
        html: layout('A caminho', `<p style="font-size:14px">Olá, ${p.buyer_name}. Sua peça foi despachada.</p>${p.tracking_code ? `<p style="font-family:Helvetica,Arial,sans-serif;font-size:13px">Código de rastreio: <strong>${p.tracking_code}</strong>${p.tracking_carrier ? ` (${p.tracking_carrier})` : ''}</p>` : ''}${botao('Acompanhar')}`),
      }
    case 'venda_recebida':
      return {
        assunto: `Você vendeu! Pedido de ${BRL(p.total_cents)}`,
        html: layout('Nova venda', `<p style="font-size:14px">Boa notícia: você recebeu um pedido.</p>${resumo}<p style="font-family:Helvetica,Arial,sans-serif;font-size:13px">Sua parte é repassada automaticamente para sua conta, já descontada a comissão. Prepare a peça e marque como enviada no painel.</p><p style="margin:22px 0"><a href="${BASE}" style="background:#170D06;color:#f7f2ea;padding:12px 22px;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase">Abrir painel</a></p>`),
      }
    case 'pagamento_falhou':
      return {
        assunto: 'Não conseguimos confirmar seu pagamento',
        html: layout('Pagamento não concluído', `<p style="font-size:14px">Olá, ${p.buyer_name}. O pagamento do seu pedido não foi aprovado.</p><p style="font-family:Helvetica,Arial,sans-serif;font-size:13px">Nada foi cobrado. Você pode tentar novamente com outro método.</p>${botao('Tentar de novo')}`),
      }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('EMAIL_FROM') ?? 'Feito à Mão <pedidos@resend.dev>'
    if (!apiKey) {
      // Sem chave, não é erro fatal: o pedido não pode falhar porque o
      // e-mail não saiu. Registramos e seguimos.
      console.error('RESEND_API_KEY ausente — e-mail não enviado')
      return json({ skipped: true, reason: 'not_configured' })
    }

    const body = await req.json().catch(() => null)
    const template = body?.template as Template | undefined
    const orderId = body?.order_id as string | undefined
    if (!template || !orderId) return json({ error: 'Parâmetros ausentes.' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data: pedido } = await admin
      .from('orders')
      .select('id, buyer_name, buyer_email, total_cents, subtotal_cents, shipping_cents, status, payment_method, tracking_code, tracking_carrier')
      .eq('id', orderId).maybeSingle()
    if (!pedido) return json({ error: 'Pedido não encontrado.' }, 404)

    // Destinatário: comprador, exceto no aviso de venda, que vai ao artesão.
    let destino = pedido.buyer_email as string
    if (template === 'venda_recebida') {
      const { data: itens } = await admin
        .from('order_items').select('artisan_user_id').eq('order_id', orderId).limit(1)
      const artisanId = itens?.[0]?.artisan_user_id
      if (!artisanId) return json({ error: 'Pedido sem artesão.' }, 400)
      const { data: u } = await admin.auth.admin.getUserById(artisanId)
      destino = u?.user?.email ?? ''
      if (!destino) return json({ error: 'Artesão sem e-mail.' }, 400)
    }

    // Idempotência: o UNIQUE barra o reenvio do mesmo template.
    const { error: logErr } = await admin
      .from('email_log')
      .insert({ order_id: orderId, recipient: destino, template, status: 'enviado' })
    if (logErr) {
      if (logErr.code === '23505') return json({ skipped: true, reason: 'ja_enviado' })
      console.error('Falha ao registrar e-mail', logErr.message)
    }

    const { assunto, html } = montar(template, pedido as Pedido)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [destino], subject: assunto, html }),
    })

    if (!res.ok) {
      const erro = await res.text().catch(() => '')
      console.error('Resend recusou', res.status, erro.slice(0, 200))
      await admin.from('email_log')
        .update({ status: 'falhou', error: `HTTP ${res.status}` })
        .eq('order_id', orderId).eq('template', template).eq('recipient', destino)
      return json({ error: 'Não foi possível enviar o e-mail.' }, 502)
    }

    return json({ sent: true, to: destino, template })
  } catch (e) {
    console.error('Erro em enviar-email', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'Erro inesperado.' }, 500)
  }
})
