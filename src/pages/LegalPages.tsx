import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";

/**
 * Termos e Privacidade.
 *
 * Não é enfeite: a plataforma coleta CPF, endereço e dados bancários de
 * artesãos, o que a LGPD exige declarar. E, em marketplace, os termos são o
 * que define quem responde pelo quê entre plataforma, vendedor e comprador
 * quando uma venda dá errado.
 *
 * ATENÇÃO: texto-base, não revisado por advogado. Deve ser validado antes
 * de operar com dinheiro real.
 */

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-[1.15rem] mt-8 mb-2">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[0.85rem] leading-relaxed text-muted-foreground mb-3">{children}</p>
);

export const TermosPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-parchment/40">
      <SEO title="Termos de Uso" description="Termos de uso do Feito à Mão." path="/termos" />
      <div className="max-w-[760px] mx-auto px-5 py-12">
        <button
          onClick={() => navigate("/")}
          className="text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground mb-6"
        >
          ← Voltar
        </button>
        <h1 className="font-display text-[2rem] mb-1">Termos de Uso</h1>
        <p className="text-[0.7rem] text-muted-foreground mb-6">Atualizado em 21 de agosto de 2026</p>

        <H>1. O que é esta plataforma</H>
        <P>
          O Feito à Mão é um marketplace que aproxima artesãos e compradores. Nós não fabricamos nem
          vendemos as peças: cada artesão é o vendedor da própria produção e responde por ela.
          Atuamos como intermediadores da venda e do pagamento.
        </P>

        <H>2. Quem responde pelo quê</H>
        <P>
          <strong>O artesão</strong> responde pela descrição fiel da peça, pela qualidade, pelo prazo
          de produção, pelo envio e pela emissão de nota fiscal da mercadoria, quando aplicável.
        </P>
        <P>
          <strong>A plataforma</strong> responde pela intermediação, pelo processamento do pagamento
          e pela emissão da nota fiscal referente à sua comissão de serviço.
        </P>
        <P>
          <strong>O comprador</strong> responde pela veracidade dos dados informados, incluindo
          endereço de entrega e CPF.
        </P>

        <H>3. Pagamento e repasse</H>
        <P>
          Os pagamentos são processados pelo Pagar.me. O valor é dividido automaticamente na
          liquidação: a parte do artesão vai direto para a conta bancária cadastrada por ele, e a
          plataforma retém sua comissão. O percentual vigente é informado ao artesão no painel.
        </P>
        <P>
          Para vender, o artesão precisa concluir o cadastro de recebimento e ser aprovado na
          verificação do provedor de pagamento. Enquanto isso não ocorre, suas peças ficam
          indisponíveis para compra.
        </P>

        <H>4. Prazos, trocas e devoluções</H>
        <P>
          Peças feitas à mão têm variações naturais de cor, textura e acabamento — isso não
          caracteriza defeito.
        </P>
        <P>
          Conforme o Código de Defesa do Consumidor, o comprador pode desistir da compra em até 7
          dias corridos após o recebimento, com devolução integral do valor pago. Peças
          personalizadas sob encomenda podem não estar sujeitas a esse direito, o que será informado
          antes da compra.
        </P>

        <H>5. Cancelamento e estorno</H>
        <P>
          Pedidos não pagos são cancelados automaticamente após o vencimento. Estornos aprovados são
          processados pelo mesmo meio de pagamento e podem levar até duas faturas para aparecer, no
          caso de cartão.
        </P>

        <H>6. Conduta</H>
        <P>
          É vedado anunciar itens ilícitos, falsificados, que violem direitos autorais ou que não
          sejam de produção artesanal própria. Contas que descumprirem podem ser suspensas.
        </P>

        <H>7. Alterações</H>
        <P>
          Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas por e-mail com
          antecedência razoável.
        </P>

        <div className="mt-10 p-4 border border-terra/30 bg-terra/[0.05]">
          <p className="text-[0.78rem] text-foreground">
            <strong>Aviso:</strong> este texto é uma base inicial e ainda não foi revisado por
            advogado. Deve passar por revisão jurídica antes da operação comercial.
          </p>
        </div>
      </div>
    </div>
  );
};

export const PrivacidadePage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-parchment/40">
      <SEO
        title="Política de Privacidade"
        description="Como o Feito à Mão trata seus dados pessoais."
        path="/privacidade"
      />
      <div className="max-w-[760px] mx-auto px-5 py-12">
        <button
          onClick={() => navigate("/")}
          className="text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground mb-6"
        >
          ← Voltar
        </button>
        <h1 className="font-display text-[2rem] mb-1">Política de Privacidade</h1>
        <p className="text-[0.7rem] text-muted-foreground mb-6">Atualizado em 21 de agosto de 2026</p>

        <H>1. Quem trata seus dados</H>
        <P>
          O tratamento é feito pela Ankor Trading Ltda, responsável pela operação do Feito à Mão. Em
          caso de dúvidas ou pedidos relativos aos seus dados, procure o canal de suporte informado
          no site.
        </P>

        <H>2. O que coletamos e por quê</H>
        <P>
          <strong>De compradores:</strong> nome, e-mail, telefone, CPF e endereço de entrega. O CPF é
          exigido pelo provedor de pagamento para emissão da cobrança e prevenção a fraude — base
          legal: execução de contrato e cumprimento de obrigação legal.
        </P>
        <P>
          <strong>De artesãos:</strong> além dos dados de cadastro, CPF ou CNPJ e dados bancários,
          necessários para o repasse das vendas e para a verificação exigida por regulação do setor
          financeiro.
        </P>
        <P>
          <strong>Dados de navegação:</strong> métricas agregadas de uso, para melhorar a
          plataforma.
        </P>

        <H>3. Onde seus dados ficam</H>
        <P>
          Os dados de conta e pedidos ficam na infraestrutura do Supabase. Dados bancários e de
          cartão <strong>não são armazenados por nós</strong>: o cartão é enviado criptografado
          direto ao Pagar.me pelo navegador, e dos dados bancários guardamos apenas os últimos
          dígitos, para você conferir.
        </P>

        <H>4. Com quem compartilhamos</H>
        <P>
          Com o Pagar.me, para processar pagamentos e repasses. Com o artesão responsável pelo seu
          pedido, apenas o necessário para o envio: nome e endereço de entrega — o CPF não é
          compartilhado com ele. E com autoridades, quando houver obrigação legal.
        </P>

        <H>5. Seus direitos</H>
        <P>
          A LGPD garante a você confirmar a existência de tratamento, acessar seus dados, corrigir
          dados incompletos ou desatualizados, solicitar anonimização ou eliminação de dados
          desnecessários, pedir portabilidade e revogar consentimento.
        </P>
        <P>
          Alguns dados precisam ser mantidos mesmo após um pedido de exclusão, por obrigação fiscal e
          contábil — registros de venda, por exemplo.
        </P>

        <H>6. Por quanto tempo guardamos</H>
        <P>
          Dados de conta enquanto ela existir. Registros de pedidos e pagamentos pelo prazo exigido
          pela legislação fiscal.
        </P>

        <H>7. Segurança</H>
        <P>
          O acesso aos dados é restrito por regras no próprio banco, e alterações administrativas
          ficam registradas com autor e data. Nenhum sistema é imune, mas tratamos incidentes com
          seriedade e comunicaremos os afetados quando houver risco relevante.
        </P>

        <div className="mt-10 p-4 border border-terra/30 bg-terra/[0.05]">
          <p className="text-[0.78rem] text-foreground">
            <strong>Aviso:</strong> este texto é uma base inicial e ainda não foi revisado por
            advogado. Deve passar por revisão jurídica antes da operação comercial.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermosPage;
