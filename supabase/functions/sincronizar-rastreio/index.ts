import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { rastrear } from '../_shared/correios.ts'
import { rastrearME } from '../_shared/melhor-envio.ts'

/**
 * Sincroniza o status de remessas ativas com o rastreio dos Correios.
 *
 * Os Correios não têm webhook de rastreio — é preciso consultar. Pensada
 * para rodar em cron (pg_cron + pg_net) a cada poucas horas, mas também
 * funciona chamada manualmente pelo admin.
 *
 * Cada remessa é atualizada de forma independente: se uma falhar, as
 * outras continuam sendo processadas.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // Chamada via cron interno (SERVICE_ROLE_KEY) ou por admin autenticado.
    const auth = req.headers.get('authorization') ?? ''
    const isServiceRole = auth.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '\0')
    if (!isServiceRole) {
      const tok = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
      const { data: u } = await admin.auth.getUser(tok)
      if (!u?.user) return json({ error: 'Não autorizado.' }, 401)
      const { data: papel } = await admin
        .from('user_roles').select('role').eq('user_id', u.user.id).eq('role', 'admin').maybeSingle()
      if (!papel) return json({ error: 'Ação restrita à administração.' }, 403)
    }

    const { data: ativas } = await admin
      .from('shipments')
      .select('id, order_id, artisan_user_id, carrier, tracking_code, melhor_envio_order_id, status')
      .neq('carrier', 'combinar')
      .in('status', ['etiqueta_gerada', 'postado', 'em_transito'])
      .limit(50)

    let atualizadas = 0
    const erros: string[] = []

    for (const remessa of ativas ?? []) {
      try {
        let ultimo: { status: string; descricao: string; data: string } | null = null

        if (remessa.carrier === 'correios' && remessa.tracking_code) {
          const eventos = await rastrear(remessa.tracking_code)
          if (eventos.length) {
            const e = eventos[eventos.length - 1]
            ultimo = { status: e.status, descricao: e.descricao, data: e.data }
          }
        } else if (remessa.carrier === 'melhor_envio' && remessa.melhor_envio_order_id) {
          const evento = await rastrearME(remessa.melhor_envio_order_id)
          if (evento) {
            const statusME = evento.status.toLowerCase()
            const status = statusME.includes('deliver') || statusME.includes('entreg')
              ? 'entregue'
              : statusME.includes('post') ? 'postado' : 'em_transito'
            ultimo = { status, descricao: evento.status, data: evento.data }
          }
        }

        if (!ultimo) continue
        if (ultimo.status === remessa.status) continue

        const patch: Record<string, unknown> = {
          status: ultimo.status,
          last_status_detail: ultimo.descricao,
          last_synced_at: new Date().toISOString(),
        }
        if (ultimo.status === 'postado') patch.posted_at = ultimo.data
        if (ultimo.status === 'entregue') patch.delivered_at = ultimo.data

        await admin.from('shipments').update(patch).eq('id', remessa.id)

        // Reflete no pedido: se TODOS os artesãos do pedido já entregaram,
        // o pedido inteiro vira 'delivered'.
        if (ultimo.status === 'entregue') {
          const { data: irmas } = await admin
            .from('shipments').select('status').eq('order_id', remessa.order_id)
          const todasEntregues = (irmas ?? []).every((s) => s.status === 'entregue')
          if (todasEntregues) {
            await admin.from('orders')
              .update({ status: 'delivered', delivered_at: new Date().toISOString() })
              .eq('id', remessa.order_id)
              .in('status', ['paid', 'processing', 'shipped'])
          }
        } else if (ultimo.status === 'postado' || ultimo.status === 'em_transito') {
          await admin.from('orders')
            .update({ status: 'shipped' })
            .eq('id', remessa.order_id)
            .in('status', ['paid', 'processing'])
        }

        atualizadas++
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown'
        erros.push(`${remessa.tracking_code}: ${msg}`)
        console.error('Falha ao rastrear', remessa.tracking_code, msg)
      }
    }

    return json({ verificadas: ativas?.length ?? 0, atualizadas, erros })
  } catch (e) {
    console.error('Erro em sincronizar-rastreio', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'Erro inesperado.' }, 500)
  }
})
