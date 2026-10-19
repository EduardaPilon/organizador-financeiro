<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { listarCategoriasDoTipo, obterCategoria } from '@/stores/categorias'
import {
  adicionarCartao,
  adicionarCompra,
  alternarAtivoCartao,
  faturaDoMes,
  limiteComprometido,
  listarCartoes,
  listarCompras,
  mesesComParcelas,
  obterCartao,
  pagamentosFatura,
  registrarPagamentoFatura,
  removerCartao,
  removerCompra,
  removerPagamentoFatura,
  type Cartao,
  type CompraCartao,
} from '@/stores/cartoes'
import { listarContas, obterConta } from '@/stores/contas'
import { usarLancamentos } from '@/stores/lancamentos'
import { notificar } from '@/stores/notificacoes'
import { dataHoje, formatarMes, formatarMoeda } from '@/utils/formatar'
import { formatarDataBR } from '@/utils/datas'
import { validarTextoObrigatorio } from '@/utils/validacao'
import CampoMoeda from '@/components/ui/CampoMoeda.vue'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'

const { lancamentos } = usarLancamentos()

const hoje = dataHoje()

// ── Novo cartão ─────────────────────────────────────────────
const nome = ref('')
const bandeira = ref('')
const limite = ref<number | null>(null)
const diaFechamento = ref(1)
const diaVencimento = ref(10)
const observacao = ref('')
const errosCartao = ref<string[]>([])

function salvarCartao() {
  const listaErros = [
    ...validarTextoObrigatorio(nome.value, 'O nome do cartão'),
    ...(limite.value === null || limite.value <= 0
      ? ['Informe o limite do cartão (maior que zero).']
      : []),
    ...(diaFechamento.value < 1 || diaFechamento.value > 31
      ? ['O dia de fechamento deve ficar entre 1 e 31.']
      : []),
    ...(diaVencimento.value < 1 || diaVencimento.value > 31
      ? ['O dia de vencimento deve ficar entre 1 e 31.']
      : []),
  ]

  if (listaErros.length > 0) {
    errosCartao.value = listaErros
    return
  }

  errosCartao.value = []
  adicionarCartao({
    nome: nome.value,
    bandeira: bandeira.value.trim() || undefined,
    limite: limite.value as number,
    diaFechamento: diaFechamento.value,
    diaVencimento: diaVencimento.value,
    observacao: observacao.value.trim() || undefined,
  })

  notificar('Cartão cadastrado.')
  nome.value = ''
  bandeira.value = ''
  limite.value = null
  observacao.value = ''
}

// ── Nova compra ─────────────────────────────────────────────
const cartoesAtivos = computed(() => listarCartoes())
const categoriasDespesa = computed(() => listarCategoriasDoTipo('despesa'))

const compraCartaoId = ref('')
const compraDescricao = ref('')
const compraValor = ref<number | null>(null)
const compraParcelas = ref(1)
const compraData = ref(dataHoje())
const compraCategoriaId = ref('')
const errosCompra = ref<string[]>([])

watch(
  categoriasDespesa,
  (lista) => {
    if (!lista.some((categoria) => categoria.id === compraCategoriaId.value)) {
      compraCategoriaId.value = lista[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(cartoesAtivos, (lista) => {
  if (!lista.some((cartao) => cartao.id === compraCartaoId.value)) {
    compraCartaoId.value = lista[0]?.id ?? ''
  }
})

function salvarCompra() {
  const listaErros = [
    ...(!compraCartaoId.value ? ['Selecione o cartão.'] : []),
    ...validarTextoObrigatorio(compraDescricao.value, 'A descrição da compra'),
    ...(compraValor.value === null || compraValor.value <= 0
      ? ['Informe o valor total da compra.']
      : []),
    ...(compraParcelas.value < 1 || compraParcelas.value > 72
      ? ['O número de parcelas deve ficar entre 1 e 72.']
      : []),
    ...(!compraCategoriaId.value ? ['Selecione a categoria da despesa.'] : []),
  ]

  if (listaErros.length > 0) {
    errosCompra.value = listaErros
    return
  }

  errosCompra.value = []
  const compra = adicionarCompra({
    cartaoId: compraCartaoId.value,
    descricao: compraDescricao.value,
    valorTotal: compraValor.value as number,
    parcelas: compraParcelas.value,
    dataCompra: compraData.value,
    categoriaId: compraCategoriaId.value,
  })

  if (!compra) {
    notificar('Não foi possível registrar a compra.', 'erro')
    return
  }

  notificar(
    compra.parcelas === 1
      ? 'Compra registrada como despesa do mês.'
      : `Compra registrada em ${compra.parcelas} parcelas (uma despesa por mês).`,
  )
  compraDescricao.value = ''
  compraValor.value = null
  compraParcelas.value = 1
}

// ── Fatura ──────────────────────────────────────────────────
const cartaoFaturaId = ref('')
const mesFatura = ref('')
const valorPagamento = ref<number | null>(null)
const dataPagamento = ref(dataHoje())
const contaPagamentoId = ref('')

watch(cartoesAtivos, (lista) => {
  if (!lista.some((cartao) => cartao.id === cartaoFaturaId.value)) {
    cartaoFaturaId.value = lista[0]?.id ?? ''
  }
})

const mesesDisponiveisFatura = computed(() =>
  cartaoFaturaId.value
    ? mesesComParcelas(cartaoFaturaId.value, lancamentos.value)
    : [],
)

watch(
  [cartaoFaturaId, mesesDisponiveisFatura],
  () => {
    const meses = mesesDisponiveisFatura.value
    const mesAtual = hoje.slice(0, 7)
    if (!meses.includes(mesFatura.value)) {
      mesFatura.value = meses.includes(mesAtual) ? mesAtual : (meses[0] ?? '')
    }
  },
  { immediate: true },
)

const faturaAtual = computed(() =>
  cartaoFaturaId.value && mesFatura.value
    ? faturaDoMes(cartaoFaturaId.value, mesFatura.value, lancamentos.value)
    : null,
)

const parcelasDaFatura = computed(() =>
  lancamentos.value
    .filter(
      (lancamento) =>
        lancamento.cartaoId === cartaoFaturaId.value &&
        lancamento.data.startsWith(mesFatura.value),
    )
    .sort((a, b) => a.data.localeCompare(b.data)),
)

const pagamentosDoMes = computed(() =>
  pagamentosFatura.value.filter(
    (pagamento) =>
      pagamento.cartaoId === cartaoFaturaId.value &&
      pagamento.mes === mesFatura.value,
  ),
)

const faltaPagar = computed(() => {
  const fatura = faturaAtual.value
  if (!fatura) return 0
  return Math.max(fatura.total - fatura.pago, 0)
})

watch(faltaPagar, () => {
  valorPagamento.value = faltaPagar.value > 0 ? faltaPagar.value : null
})

function salvarPagamento() {
  if (!cartaoFaturaId.value || !mesFatura.value) return
  if (valorPagamento.value === null || valorPagamento.value <= 0) {
    notificar('Informe o valor pago da fatura.', 'erro')
    return
  }

  const pagamento = registrarPagamentoFatura({
    cartaoId: cartaoFaturaId.value,
    mes: mesFatura.value,
    valor: valorPagamento.value,
    data: dataPagamento.value,
    contaId: contaPagamentoId.value || undefined,
  })

  if (!pagamento) {
    notificar('Não foi possível registrar o pagamento.', 'erro')
    return
  }

  notificar(
    'Pagamento registrado. Ele NÃO entra como despesa (a compra já foi lançada).',
    'info',
  )
}

// ── Listas e exclusões ──────────────────────────────────────
const cartoesVisiveis = computed(() => listarCartoes({ incluirInativos: true }))

function comprometido(cartaoId: string): number {
  return limiteComprometido(cartaoId, lancamentos.value, hoje)
}

const comprasOrdenadas = computed(() => listarCompras())

function nomeCartao(id: string): string {
  return obterCartao(id)?.nome ?? 'Cartão removido'
}

function nomeCategoria(id: string): string {
  return obterCategoria(id)?.nome ?? 'Sem categoria'
}

const cartaoParaExcluir = ref<Cartao | null>(null)
const compraParaExcluir = ref<CompraCartao | null>(null)

function confirmarExclusaoCartao() {
  const alvo = cartaoParaExcluir.value
  if (!alvo) return
  removerCartao(alvo.id)
  cartaoParaExcluir.value = null
  notificar(`Cartão "${alvo.nome}" removido com suas compras.`)
}

function confirmarExclusaoCompra() {
  const alvo = compraParaExcluir.value
  if (!alvo) return
  removerCompra(alvo.id)
  compraParaExcluir.value = null
  notificar(`Compra "${alvo.descricao}" removida com suas parcelas.`)
}

const contasDisponiveis = computed(() => listarContas())

function nomeConta(id: string | undefined): string {
  return obterConta(id)?.nome ?? '—'
}
</script>

<template>
  <div class="pagina">
    <header class="page-heading">
      <p class="eyebrow">CARTÕES</p>
      <h2>Controladas por parte, sem susto no fim do mês.</h2>
      <p class="subtitle">
        Compras viram despesas parceladas; o pagamento da fatura apenas quita o
        compromisso.
      </p>
    </header>

    <p class="nota-info">
      <font-awesome-icon icon="circle-info" aria-hidden="true" />
      <span>
        Limite comprometido = soma das parcelas com vencimento a partir de hoje.
        O pagamento de fatura não entra como despesa — a compra já entrou.
      </span>
    </p>

    <section class="panel">
      <h3>Novo cartão</h3>
      <form class="formulario" @submit.prevent="salvarCartao">
        <ul v-if="errosCartao.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosCartao" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="cartao-nome">Nome</label>
          <input
            id="cartao-nome"
            v-model="nome"
            type="text"
            maxlength="60"
            placeholder="Ex.: Cartão principal"
            required
          />
        </div>

        <div class="campo">
          <label for="cartao-bandeira">Bandeira (opcional)</label>
          <input id="cartao-bandeira" v-model="bandeira" type="text" maxlength="30" placeholder="Ex.: Visa" />
        </div>

        <CampoMoeda id="cartao-limite" v-model="limite" rotulo="Limite (R$)" :obrigatorio="true" />

        <div class="campo">
          <label for="cartao-fechamento">Dia de fechamento</label>
          <input id="cartao-fechamento" v-model.number="diaFechamento" type="number" min="1" max="31" required />
        </div>

        <div class="campo">
          <label for="cartao-vencimento">Dia de vencimento</label>
          <input id="cartao-vencimento" v-model.number="diaVencimento" type="number" min="1" max="31" required />
        </div>

        <div class="campo campo-largo">
          <label for="cartao-observacao">Observação (opcional)</label>
          <input id="cartao-observacao" v-model="observacao" type="text" maxlength="120" />
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="plus" aria-hidden="true" />
          Cadastrar cartão
        </button>
      </form>
    </section>

    <section class="panel">
      <h3>Seus cartões</h3>
      <p v-if="cartoesVisiveis.length === 0" class="painel-vazio">
        Nenhum cartão cadastrado ainda.
      </p>

      <div v-else class="cartoes-grade">
        <article v-for="cartao in cartoesVisiveis" :key="cartao.id" class="cartao-card">
          <header class="cartao-topo">
            <div>
              <h4>{{ cartao.nome }}</h4>
              <p class="cartao-sub">{{ cartao.bandeira || 'Cartão de crédito' }}</p>
            </div>
            <span class="badge" :class="cartao.ativo ? 'badge-positivo' : 'badge-neutro'">
              {{ cartao.ativo ? 'Ativo' : 'Inativo' }}
            </span>
          </header>

          <dl class="cartao-dados">
            <div>
              <dt>Limite</dt>
              <dd>{{ formatarMoeda(cartao.limite) }}</dd>
            </div>
            <div>
              <dt>Comprometido</dt>
              <dd>{{ formatarMoeda(comprometido(cartao.id)) }}</dd>
            </div>
            <div>
              <dt>Disponível</dt>
              <dd class="destaque">
                {{ formatarMoeda(Math.max(cartao.limite - comprometido(cartao.id), 0)) }}
              </dd>
            </div>
          </dl>

          <p class="cartao-fechamento">
            Fecha dia {{ cartao.diaFechamento }} · vence dia {{ cartao.diaVencimento }}
          </p>

          <div class="linha-acoes">
            <button class="botao-acao" type="button" @click="alternarAtivoCartao(cartao.id)">
              {{ cartao.ativo ? 'Desativar' : 'Ativar' }}
            </button>
            <button class="botao-acao botao-excluir" type="button" @click="cartaoParaExcluir = cartao">
              <font-awesome-icon icon="trash" aria-hidden="true" />
              Excluir
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <h3>Nova compra</h3>
      <p class="panel-description">
        Cada parcela gera uma despesa no mês correspondente — assim o orçamento
        do mês já considera o que ainda vai vencer.
      </p>

      <form v-if="cartoesAtivos.length > 0" class="formulario" @submit.prevent="salvarCompra">
        <ul v-if="errosCompra.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosCompra" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="compra-cartao">Cartão</label>
          <select id="compra-cartao" v-model="compraCartaoId" required>
            <option v-for="cartao in cartoesAtivos" :key="cartao.id" :value="cartao.id">
              {{ cartao.nome }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label for="compra-descricao">Descrição</label>
          <input
            id="compra-descricao"
            v-model="compraDescricao"
            type="text"
            maxlength="120"
            placeholder="Ex.: Notebook"
            required
          />
        </div>

        <CampoMoeda id="compra-valor" v-model="compraValor" rotulo="Valor total (R$)" :obrigatorio="true" />

        <div class="campo">
          <label for="compra-parcelas">Parcelas</label>
          <input id="compra-parcelas" v-model.number="compraParcelas" type="number" min="1" max="72" required />
        </div>

        <div class="campo">
          <label for="compra-data">Data da compra</label>
          <input id="compra-data" v-model="compraData" type="date" required />
        </div>

        <div class="campo">
          <label for="compra-categoria">Categoria</label>
          <select id="compra-categoria" v-model="compraCategoriaId" required>
            <option v-for="categoria in categoriasDespesa" :key="categoria.id" :value="categoria.id">
              {{ categoria.icone }} {{ categoria.nome }}
            </option>
          </select>
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="credit-card" aria-hidden="true" />
          Registrar compra
        </button>
      </form>

      <p v-else class="painel-vazio">
        Cadastre um cartão ativo para registrar compras.
      </p>
    </section>

    <section class="panel">
      <h3>Compras registradas</h3>
      <p v-if="comprasOrdenadas.length === 0" class="painel-vazio">
        Nenhuma compra registrada.
      </p>

      <div v-else class="tabela-rolagem">
        <table class="tabela-dados">
          <thead>
            <tr>
              <th>Compra</th>
              <th>Cartão</th>
              <th>Categoria</th>
              <th class="num">Total</th>
              <th>Parcelas</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="compra in comprasOrdenadas" :key="compra.id">
              <td><strong>{{ compra.descricao }}</strong></td>
              <td>{{ nomeCartao(compra.cartaoId) }}</td>
              <td>{{ nomeCategoria(compra.categoriaId) }}</td>
              <td class="num">{{ formatarMoeda(compra.valorTotal) }}</td>
              <td>{{ compra.parcelas }}x</td>
              <td>{{ formatarDataBR(compra.dataCompra) }}</td>
              <td>
                <button class="botao-acao botao-excluir" type="button" @click="compraParaExcluir = compra">
                  <font-awesome-icon icon="trash" aria-hidden="true" />
                  Excluir
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h3>Faturas</h3>
      <p class="panel-description">
        A fatura é a soma das parcelas lançadas no mês. Registrar o pagamento é
        só uma marcação de quitação.
      </p>

      <p v-if="cartoesAtivos.length === 0" class="painel-vazio">
        Cadastre um cartão para acompanhar faturas.
      </p>

      <template v-else>
        <div class="fatura-filtros">
          <div class="campo">
            <label for="fatura-cartao">Cartão</label>
            <select id="fatura-cartao" v-model="cartaoFaturaId">
              <option v-for="cartao in cartoesAtivos" :key="cartao.id" :value="cartao.id">
                {{ cartao.nome }}
              </option>
            </select>
          </div>

          <div class="campo">
            <label for="fatura-mes">Mês da fatura</label>
            <select id="fatura-mes" v-model="mesFatura">
              <option v-if="mesesDisponiveisFatura.length === 0" value="">Sem parcelas</option>
              <option v-for="mes in mesesDisponiveisFatura" :key="mes" :value="mes">
                {{ formatarMes(mes) }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="faturaAtual && mesFatura" class="fatura-resumo">
          <div class="fatura-valores">
            <p>Total da fatura <strong>{{ formatarMoeda(faturaAtual.total) }}</strong></p>
            <p>Pago <strong>{{ formatarMoeda(faturaAtual.pago) }}</strong></p>
            <p>
              Falta pagar <strong>{{ formatarMoeda(faltaPagar) }}</strong>
            </p>
            <span class="badge" :class="faturaAtual.quitada ? 'badge-positivo' : 'badge-atencao'">
              {{ faturaAtual.quitada ? 'Quitada' : 'Em aberto' }}
            </span>
          </div>

          <div v-if="parcelasDaFatura.length > 0" class="tabela-rolagem">
            <table class="tabela-dados">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Data</th>
                  <th class="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="parcela in parcelasDaFatura" :key="parcela.id">
                  <td>{{ parcela.descricao }}</td>
                  <td>{{ formatarDataBR(parcela.data) }}</td>
                  <td class="num">{{ formatarMoeda(parcela.valor) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="painel-vazio">
            Nenhuma parcela neste mês. Escolha outro mês ou registre uma compra.
          </p>

          <form class="formulario formulario-pagamento" @submit.prevent="salvarPagamento">
            <CampoMoeda id="fatura-pagamento-valor" v-model="valorPagamento" rotulo="Valor pago (R$)" />

            <div class="campo">
              <label for="fatura-pagamento-data">Data do pagamento</label>
              <input id="fatura-pagamento-data" v-model="dataPagamento" type="date" required />
            </div>

            <div v-if="contasDisponiveis.length > 0" class="campo">
              <label for="fatura-pagamento-conta">Conta usada (opcional)</label>
              <select id="fatura-pagamento-conta" v-model="contaPagamentoId">
                <option value="">Não informar</option>
                <option v-for="conta in contasDisponiveis" :key="conta.id" :value="conta.id">
                  {{ conta.nome }}
                </option>
              </select>
            </div>

            <button class="botao-salvar" type="submit">
              <font-awesome-icon icon="circle-check" aria-hidden="true" />
              Registrar pagamento
            </button>
          </form>

          <div v-if="pagamentosDoMes.length > 0" class="pagamentos-lista">
            <h4>Pagamentos deste mês</h4>
            <ul>
              <li v-for="pagamento in pagamentosDoMes" :key="pagamento.id">
                <span>
                  {{ formatarDataBR(pagamento.data) }} ·
                  {{ formatarMoeda(pagamento.valor) }}
                  <template v-if="pagamento.contaId"> · {{ nomeConta(pagamento.contaId) }}</template>
                </span>
                <button
                  class="botao-acao botao-excluir"
                  type="button"
                  @click="removerPagamentoFatura(pagamento.id)"
                >
                  <font-awesome-icon icon="trash" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </div>
        </div>

        <p v-else class="painel-vazio">
          Sem faturas para este cartão. Registre uma compra para começar.
        </p>
      </template>
    </section>

    <p class="demo-note">
      Faturas calculadas localmente a partir das parcelas lançadas.
    </p>

    <ModalConfirmacao
      :visivel="cartaoParaExcluir !== null"
      titulo="Excluir cartão"
      :texto="
        cartaoParaExcluir
          ? `Excluir '${cartaoParaExcluir.nome}'? As compras e parcelas vinculadas também serão removidas.`
          : ''
      "
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusaoCartao"
      @cancelar="cartaoParaExcluir = null"
    />

    <ModalConfirmacao
      :visivel="compraParaExcluir !== null"
      titulo="Excluir compra"
      :texto="
        compraParaExcluir
          ? `Excluir '${compraParaExcluir.descricao}'? Todas as parcelas lançadas serão removidas.`
          : ''
      "
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusaoCompra"
      @cancelar="compraParaExcluir = null"
    />
  </div>
</template>

<style scoped>
.cartoes-grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.cartao-card {
  padding: 18px;
  border: 1px solid var(--color-border-soft);
  border-radius: 13px;
}

.cartao-topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cartao-topo h4 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
}

.cartao-sub {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 11.5px;
}

.cartao-dados {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.cartao-dados dt {
  color: var(--color-muted);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.cartao-dados dd {
  margin: 4px 0 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.cartao-dados .destaque {
  color: var(--color-primary);
  font-weight: 700;
}

.cartao-fechamento {
  margin: 0 0 14px;
  color: var(--color-muted);
  font-size: 11.5px;
}

.fatura-filtros {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 220px));
  gap: 16px;
}

.fatura-resumo {
  margin-top: 20px;
}

.fatura-valores {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
}

.fatura-valores p {
  margin: 0;
  color: var(--color-muted);
  font-size: 12.5px;
}

.fatura-valores strong {
  display: block;
  margin-top: 3px;
  color: var(--color-text);
  font-size: 15px;
}

.formulario-pagamento {
  margin-top: 22px;
}

.pagamentos-lista {
  margin-top: 20px;
}

.pagamentos-lista h4 {
  margin: 0 0 10px;
  font-size: 13px;
}

.pagamentos-lista ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pagamentos-lista li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-soft);
  font-size: 12.5px;
}

@media (max-width: 640px) {
  .fatura-filtros {
    grid-template-columns: 1fr;
  }

  .cartao-dados {
    grid-template-columns: 1fr;
  }
}
</style>
