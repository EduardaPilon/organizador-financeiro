<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ROTULOS_MOVIMENTACOES,
  ROTULOS_TIPOS_INVESTIMENTO,
  adicionarInvestimento,
  adicionarMovimentacao,
  alternarAtivoInvestimento,
  capitalAplicado,
  informarValorAtual,
  listarInvestimentos,
  movimentacoes,
  movimentacoesDo,
  obterInvestimento,
  removerInvestimento,
  removerMovimentacao,
  rendimentoEstimado,
  totalInvestido,
  type Investimento,
  type TipoInvestimento,
  type TipoMovimentacao,
} from '@/stores/investimentos'
import { notificar } from '@/stores/notificacoes'
import { PALETA, RAMPA } from '@/styles/paleta'
import { dataHoje, formatarMoeda } from '@/utils/formatar'
import { formatarDataBR } from '@/utils/datas'
import { somarEmCentavos } from '@/utils/moeda'
import { validarTextoObrigatorio } from '@/utils/validacao'
import CampoMoeda from '@/components/ui/CampoMoeda.vue'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'
import GraficoPizza from '@/components/graficos/GraficoPizza.vue'

// ── Novo investimento ───────────────────────────────────────
const nome = ref('')
const tipo = ref<TipoInvestimento>('renda_fixa')
const dataInicial = ref(dataHoje())
const aporteInicial = ref<number | null>(null)
const valorAtual = ref<number | null>(null)
const observacao = ref('')
const erros = ref<string[]>([])

function salvarInvestimento() {
  const listaErros = [
    ...validarTextoObrigatorio(nome.value, 'O nome do investimento'),
    ...(aporteInicial.value === null || aporteInicial.value < 0
      ? ['Informe o valor aplicado (use 0 se ainda não aplicou).']
      : []),
    ...(valorAtual.value === null || valorAtual.value < 0
      ? ['Informe o valor atual da posição (pode ser igual ao aplicado).']
      : []),
  ]

  if (listaErros.length > 0) {
    erros.value = listaErros
    return
  }

  erros.value = []
  const investimento = adicionarInvestimento({
    nome: nome.value,
    tipo: tipo.value,
    dataInicial: dataInicial.value,
    valorAtual: valorAtual.value as number,
    observacao: observacao.value.trim() || undefined,
  })

  if ((aporteInicial.value as number) > 0) {
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: aporteInicial.value as number,
      data: dataInicial.value,
      observacao: 'Aporte inicial',
    })
  }

  notificar('Investimento cadastrado. Aporte não é despesa — é patrimônio.')
  nome.value = ''
  aporteInicial.value = null
  valorAtual.value = null
  observacao.value = ''
}

// ── Nova movimentação ───────────────────────────────────────
const movInvestimentoId = ref('')
const movTipo = ref<TipoMovimentacao>('aporte')
const movValor = ref<number | null>(null)
const movData = ref(dataHoje())
const movObservacao = ref('')
const errosMov = ref<string[]>([])

const investimentosAtivos = computed(() => listarInvestimentos())

function salvarMovimentacao() {
  const listaErros = [
    ...(!movInvestimentoId.value ? ['Selecione o investimento.'] : []),
    ...(movValor.value === null || movValor.value <= 0
      ? ['Informe um valor maior que zero.']
      : []),
  ]

  if (listaErros.length > 0) {
    errosMov.value = listaErros
    return
  }

  errosMov.value = []
  const movimentacao = adicionarMovimentacao({
    investimentoId: movInvestimentoId.value,
    tipo: movTipo.value,
    valor: movValor.value as number,
    data: movData.value,
    observacao: movObservacao.value.trim() || undefined,
  })

  if (!movimentacao) {
    notificar('Não foi possível registrar a movimentação.', 'erro')
    return
  }

  notificar(
    movTipo.value === 'resgate'
      ? 'Resgate registrado (não entra como receita).'
      : 'Movimentação registrada.',
  )
  movValor.value = null
  movObservacao.value = ''
}

// ── Lista ───────────────────────────────────────────────────
const investimentosVisiveis = computed(() =>
  listarInvestimentos({ incluirInativos: true }),
)

const total = computed(() => totalInvestido())

const aplicadoTotal = computed(() =>
  somarEmCentavos(
    investimentosVisiveis.value.map((item) => capitalAplicado(item.id)),
  ),
)

const rendimentoTotal = computed(() =>
  somarEmCentavos(
    investimentosVisiveis.value.map((item) => rendimentoEstimado(item.id)),
  ),
)

function rendimentoPercentual(investimentoId: string): number | null {
  const aplicado = capitalAplicado(investimentoId)
  if (aplicado <= 0) return null
  return Math.round((rendimentoEstimado(investimentoId) / aplicado) * 1000) / 10
}

const movimentacoesOrdenadas = computed(() =>
  [...movimentacoes.value].sort((a, b) => b.data.localeCompare(a.data)),
)

function nomeInvestimento(id: string): string {
  return obterInvestimento(id)?.nome ?? 'Investimento removido'
}

// ── Gráfico por tipo ────────────────────────────────────────
// Cores da paleta oficial: cada tipo de investimento é um tom da paleta
// (cripto fica no coral porque é o ativo de maior risco).
const CORES_TIPO: Record<TipoInvestimento, string> = {
  renda_fixa: PALETA.verde,
  renda_variavel: PALETA.azul,
  fundo: PALETA.teal,
  cripto: PALETA.coral,
  poupanca: RAMPA.verde[5],
  outro: PALETA.neutro,
}

const porTipo = computed(() => {
  const mapa = new Map<TipoInvestimento, number>()
  for (const investimento of investimentosVisiveis.value) {
    mapa.set(
      investimento.tipo,
      (mapa.get(investimento.tipo) ?? 0) + investimento.valorAtual,
    )
  }
  return [...mapa.entries()]
    .map(([chave, valor]) => ({
      rotulo: ROTULOS_TIPOS_INVESTIMENTO[chave],
      valor,
      cor: CORES_TIPO[chave],
    }))
    .sort((a, b) => b.valor - a.valor)
})

// ── Atualizar valor informado ───────────────────────────────
const emEdicao = ref<string | null>(null)
const novoValor = ref<number | null>(null)

function iniciarAtualizacao(investimento: Investimento) {
  emEdicao.value = investimento.id
  novoValor.value = investimento.valorAtual
}

function salvarValor(investimento: Investimento) {
  if (novoValor.value === null || novoValor.value < 0) {
    notificar('Informe o valor atual da posição.', 'erro')
    return
  }
  informarValorAtual(investimento.id, novoValor.value, dataHoje())
  emEdicao.value = null
  notificar('Valor atual atualizado (informado manualmente).')
}

// ── Exclusão ────────────────────────────────────────────────
const paraExcluir = ref<Investimento | null>(null)

function confirmarExclusao() {
  const alvo = paraExcluir.value
  if (!alvo) return
  removerInvestimento(alvo.id)
  paraExcluir.value = null
  notificar(`Investimento "${alvo.nome}" removido.`)
}

function movimentacoesDe(investimentoId: string): number {
  return movimentacoesDo(investimentoId).length
}
</script>

<template>
  <div class="pagina">
    <header class="page-heading">
      <p class="eyebrow">INVESTIMENTOS</p>
      <h2>Sua parte que trabalha por você.</h2>
      <p class="subtitle">
        Aportes e resgates movimentam patrimônio, não o fluxo de despesas.
      </p>
    </header>

    <p class="nota-info">
      <font-awesome-icon icon="circle-info" aria-hidden="true" />
      <span>
        O valor atual é <strong>informado por você</strong> (o app não busca
        cotações). O rendimento é uma estimativa: valor atual − aportes
        líquidos.
      </span>
    </p>

    <section class="panel">
      <h3>Novo investimento</h3>
      <form class="formulario" @submit.prevent="salvarInvestimento">
        <ul v-if="erros.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in erros" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="inv-nome">Nome</label>
          <input
            id="inv-nome"
            v-model="nome"
            type="text"
            maxlength="80"
            placeholder="Ex.: Tesouro Selic 2029"
            required
          />
        </div>

        <div class="campo">
          <label for="inv-tipo">Tipo</label>
          <select id="inv-tipo" v-model="tipo">
            <option v-for="(rotulo, chave) in ROTULOS_TIPOS_INVESTIMENTO" :key="chave" :value="chave">
              {{ rotulo }}
            </option>
          </select>
        </div>

        <CampoMoeda id="inv-aporte" v-model="aporteInicial" rotulo="Valor aplicado (R$)" dica="Cria um aporte inicial — não é despesa" />
        <CampoMoeda id="inv-atual" v-model="valorAtual" rotulo="Valor atual (R$)" :obrigatorio="true" />

        <div class="campo">
          <label for="inv-data">Data do aporte inicial</label>
          <input id="inv-data" v-model="dataInicial" type="date" required />
        </div>

        <div class="campo campo-largo">
          <label for="inv-observacao">Observação (opcional)</label>
          <input id="inv-observacao" v-model="observacao" type="text" maxlength="120" />
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="coins" aria-hidden="true" />
          Cadastrar investimento
        </button>
      </form>
    </section>

    <section class="panel">
      <h3>Resumo</h3>
      <div class="resumo-grade">
        <div class="resumo-item">
          <p class="resumo-rotulo">Valor atual</p>
          <p class="resumo-valor">{{ formatarMoeda(total) }}</p>
        </div>
        <div class="resumo-item">
          <p class="resumo-rotulo">Aportado líquido</p>
          <p class="resumo-valor">{{ formatarMoeda(aplicadoTotal) }}</p>
        </div>
        <div class="resumo-item">
          <p class="resumo-rotulo">Rendimento estimado</p>
          <p class="resumo-valor" :class="rendimentoTotal >= 0 ? 'positivo' : 'negativo'">
            {{ formatarMoeda(rendimentoTotal) }}
          </p>
        </div>
      </div>
    </section>

    <section class="panel">
      <h3>Posições</h3>
      <p v-if="investimentosVisiveis.length === 0" class="painel-vazio">
        Nenhum investimento cadastrado ainda.
      </p>

      <div v-else class="tabela-rolagem">
        <table class="tabela-dados">
          <thead>
            <tr>
              <th>Investimento</th>
              <th>Tipo</th>
              <th class="num">Aplicado</th>
              <th class="num">Valor atual</th>
              <th class="num">Rendimento</th>
              <th>Movim.</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="investimento in investimentosVisiveis" :key="investimento.id">
              <td>
                <strong>{{ investimento.nome }}</strong>
                <span class="detalhe">atualizado em {{ formatarDataBR(investimento.atualizadoEm) }}</span>
              </td>
              <td>{{ ROTULOS_TIPOS_INVESTIMENTO[investimento.tipo] }}</td>
              <td class="num">{{ formatarMoeda(capitalAplicado(investimento.id)) }}</td>
              <td class="num">
                <template v-if="emEdicao === investimento.id">
                  <CampoMoeda
                    :id="`inv-edicao-${investimento.id}`"
                    v-model="novoValor"
                    rotulo="Novo valor atual"
                  />
                  <button class="botao-acao" type="button" @click="salvarValor(investimento)">
                    Salvar
                  </button>
                </template>
                <strong v-else>{{ formatarMoeda(investimento.valorAtual) }}</strong>
              </td>
              <td class="num">
                <span
                  class="badge"
                  :class="rendimentoEstimado(investimento.id) >= 0 ? 'badge-positivo' : 'badge-negativo'"
                >
                  {{ formatarMoeda(rendimentoEstimado(investimento.id)) }}
                  <template v-if="rendimentoPercentual(investimento.id) !== null">
                    ({{ rendimentoPercentual(investimento.id) }}%)
                  </template>
                </span>
              </td>
              <td>{{ movimentacoesDe(investimento.id) }}</td>
              <td>
                <div class="linha-acoes">
                  <button class="botao-acao" type="button" @click="iniciarAtualizacao(investimento)">
                    <font-awesome-icon icon="pencil" aria-hidden="true" />
                    Valor
                  </button>
                  <button class="botao-acao" type="button" @click="alternarAtivoInvestimento(investimento.id)">
                    {{ investimento.ativo ? 'Desativar' : 'Ativar' }}
                  </button>
                  <button class="botao-acao botao-excluir" type="button" @click="paraExcluir = investimento">
                    <font-awesome-icon icon="trash" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="porTipo.length > 0" class="grafico-tipos">
        <h4>Distribuição por tipo (valor atual informado)</h4>
        <GraficoPizza
          :rotulos="porTipo.map((item) => item.rotulo)"
          :valores="porTipo.map((item) => item.valor)"
          :cores="porTipo.map((item) => item.cor)"
        />
      </div>
    </section>

    <section class="panel">
      <h3>Movimentações</h3>
      <p class="panel-description">
        Aporte = entra no patrimônio · Resgate = sai do patrimônio · Rendimento =
        ganho declarado por você. Nenhuma delas altera receitas/despesas.
      </p>

      <form v-if="investimentosAtivos.length > 0" class="formulario" @submit.prevent="salvarMovimentacao">
        <ul v-if="errosMov.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosMov" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="mov-investimento">Investimento</label>
          <select id="mov-investimento" v-model="movInvestimentoId" required>
            <option v-for="item in investimentosAtivos" :key="item.id" :value="item.id">
              {{ item.nome }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label for="mov-tipo">Tipo</label>
          <select id="mov-tipo" v-model="movTipo">
            <option v-for="(rotulo, chave) in ROTULOS_MOVIMENTACOES" :key="chave" :value="chave">
              {{ rotulo }}
            </option>
          </select>
        </div>

        <CampoMoeda id="mov-valor" v-model="movValor" rotulo="Valor (R$)" :obrigatorio="true" />

        <div class="campo">
          <label for="mov-data">Data</label>
          <input id="mov-data" v-model="movData" type="date" required />
        </div>

        <div class="campo campo-largo">
          <label for="mov-observacao">Observação (opcional)</label>
          <input id="mov-observacao" v-model="movObservacao" type="text" maxlength="120" />
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="plus" aria-hidden="true" />
          Registrar movimentação
        </button>
      </form>

      <p v-else class="painel-vazio">
        Cadastre um investimento ativo para registrar movimentações.
      </p>

      <div v-if="movimentacoesOrdenadas.length > 0" class="tabela-rolagem lista-movimentacoes">
        <table class="tabela-dados">
          <thead>
            <tr>
              <th>Data</th>
              <th>Investimento</th>
              <th>Tipo</th>
              <th class="num">Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="movimentacao in movimentacoesOrdenadas" :key="movimentacao.id">
              <td>{{ formatarDataBR(movimentacao.data) }}</td>
              <td>{{ nomeInvestimento(movimentacao.investimentoId) }}</td>
              <td>{{ ROTULOS_MOVIMENTACOES[movimentacao.tipo] }}</td>
              <td class="num">{{ formatarMoeda(movimentacao.valor) }}</td>
              <td>
                <button class="botao-acao botao-excluir" type="button" @click="removerMovimentacao(movimentacao.id)">
                  <font-awesome-icon icon="trash" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="demo-note">
      Rendimentos são estimativas a partir dos valores que você informa — não são
      cotações de mercado.
    </p>

    <ModalConfirmacao
      :visivel="paraExcluir !== null"
      titulo="Excluir investimento"
      :texto="
        paraExcluir
          ? `Excluir '${paraExcluir.nome}'? As movimentações vinculadas também serão removidas.`
          : ''
      "
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusao"
      @cancelar="paraExcluir = null"
    />
  </div>
</template>

<style scoped>
.resumo-grade {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.resumo-item {
  padding: 16px;
  border: 1px solid var(--color-border-soft);
  border-radius: 12px;
}

.resumo-rotulo {
  margin: 0;
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.resumo-valor {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.resumo-valor.positivo {
  color: var(--color-primary);
}

.resumo-valor.negativo {
  color: var(--color-danger-dark);
}

.detalhe {
  display: block;
  margin-top: 3px;
  color: var(--color-muted);
  font-size: 11px;
}

.grafico-tipos {
  margin-top: 26px;
}

.grafico-tipos h4 {
  margin: 0 0 14px;
  font-size: 13px;
}

.lista-movimentacoes {
  margin-top: 20px;
}

@media (max-width: 700px) {
  .resumo-grade {
    grid-template-columns: 1fr;
  }
}
</style>
