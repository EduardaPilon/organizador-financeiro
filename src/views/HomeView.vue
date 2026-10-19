
<script setup lang="ts">
import { computed, ref } from 'vue'
import { obterCategoria } from '@/stores/categorias'
import { usarLancamentos } from '@/stores/lancamentos'
import { calcularSaldoConta, contas, transferencias } from '@/stores/contas'
import { totalInvestido } from '@/stores/investimentos'
import { totalBens, totalDividas } from '@/stores/patrimonio'
import { compromissos } from '@/stores/compromissos'
import { dataHoje, formatarMes, formatarMesCurto, formatarMoeda } from '@/utils/formatar'
import { diasAte, formatarDataBR } from '@/utils/datas'
import { somarEmCentavos } from '@/utils/moeda'
import { resumirPorMes, somarPorTipo } from '@/utils/resumos'
import GraficoBarras from '@/components/graficos/GraficoBarras.vue'
import {
  PALETA_GRAFICOS,
  type DatasetBarras,
} from '@/components/graficos/chartjs'
import { PALETA } from '@/styles/paleta'

const { lancamentos } = usarLancamentos()

/** Mês exibido no painel; começa no mês atual. */
const mesSelecionado = ref(dataHoje().slice(0, 7))

/** Meses com lançamentos, mantendo o mês selecionado sempre disponível. */
const mesesDisponiveis = computed(() => {
  const meses = new Set(
    lancamentos.value.map((lancamento) => lancamento.data.slice(0, 7)),
  )
  meses.add(mesSelecionado.value)
  return [...meses].sort().reverse()
})

const lancamentosDoMes = computed(() =>
  lancamentos.value.filter((lancamento) =>
    lancamento.data.startsWith(mesSelecionado.value),
  ),
)

const receitas = computed(() =>
  somarPorTipo(lancamentosDoMes.value, 'receita'),
)

const despesas = computed(() =>
  somarPorTipo(lancamentosDoMes.value, 'despesa'),
)

const resultado = computed(() => receitas.value - despesas.value)

const gastos = computed(() => {
  const totaisPorCategoria = lancamentosDoMes.value
    .filter((lancamento) => lancamento.tipo === 'despesa')
    .reduce(
      (totais, lancamento) => {
        totais[lancamento.categoriaId] =
          (totais[lancamento.categoriaId] || 0) + lancamento.valor

        return totais
      },
      {} as Record<string, number>,
    )

  return Object.entries(totaisPorCategoria)
    .map(([categoriaId, valor]) => {
      const categoria = obterCategoria(categoriaId)

      return {
        categoriaId,
        nome: categoria?.nome ?? 'Sem categoria',
        icone: categoria?.icone ?? '•',
        cor: categoria?.cor ?? PALETA.neutro,
        valor,
        percentual:
          despesas.value > 0 ? Math.round((valor / despesas.value) * 100) : 0,
      }
    })
    .sort((a, b) => b.valor - a.valor)
})

/** Evolução: últimos 6 meses com lançamentos, do mais antigo ao recente. */
const resumoGrafico = computed(() =>
  resumirPorMes(lancamentos.value)
    .slice(0, 6)
    .reverse(),
)

const rotulosEvolucao = computed(() =>
  resumoGrafico.value.map((resumo) => formatarMesCurto(resumo.chave)),
)

const dadosEvolucao = computed<DatasetBarras[]>(() => [
  {
    label: 'Receitas',
    data: resumoGrafico.value.map((resumo) => resumo.receitas),
    backgroundColor: PALETA_GRAFICOS.receita,
    borderRadius: 6,
    maxBarThickness: 34,
  },
  {
    label: 'Despesas',
    data: resumoGrafico.value.map((resumo) => resumo.despesas),
    backgroundColor: PALETA_GRAFICOS.despesa,
    borderRadius: 6,
    maxBarThickness: 34,
  },
])

// ── Panorama (integra contas, investimentos, patrimônio e compromissos) ──
const saldoContas = computed(() =>
  somarEmCentavos(
    contas.value.map((conta) =>
      calcularSaldoConta(conta.id, lancamentos.value, transferencias.value),
    ),
  ),
)

const patrimonioLiquido = computed(() =>
  somarEmCentavos([
    saldoContas.value,
    totalInvestido(),
    totalBens(),
    -totalDividas(),
  ]),
)

/** Contas a pagar pendentes com vencimento nos próximos 30 dias. */
const proximosVencimentos = computed(() =>
  compromissos.value
    .filter(
      (compromisso) =>
        compromisso.status === 'pendente' &&
        compromisso.tipo === 'a_pagar' &&
        diasAte(compromisso.vencimento) <= 30,
    )
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
)

const totalProximos = computed(() =>
  somarEmCentavos(proximosVencimentos.value.map((item) => item.valor)),
)
</script>

<template>
  <div class="dashboard">
    <section class="welcome">
      <div>
        <p class="eyebrow">VISÃO GERAL</p>
        <h2>Seu dinheiro, em equilíbrio.</h2>
        <p class="subtitle">
          Acompanhe suas finanças e mantenha seus objetivos no caminho certo.
        </p>
      </div>

      <label class="month-badge">
        Mês:
        <select
          v-model="mesSelecionado"
          aria-label="Selecionar o mês exibido no painel"
        >
          <option v-for="mes in mesesDisponiveis" :key="mes" :value="mes">
            {{ formatarMes(mes) }}
          </option>
        </select>
      </label>
    </section>

    <section class="summary-cards">
      <article class="summary-card balance-card">
        <div class="card-heading">
          <span>Resultado do mês</span>
          <span class="card-icon">
            <font-awesome-icon icon="dollar-sign" aria-hidden="true" />
          </span>
        </div>

        <p class="amount">{{ formatarMoeda(resultado) }}</p>
        <p class="card-description">Receitas menos despesas</p>
      </article>

      <article class="summary-card">
        <div class="card-heading">
          <span>Receitas</span>
          <span class="card-icon income-icon">
            <font-awesome-icon icon="arrow-trend-up" aria-hidden="true" />
          </span>
        </div>

        <p class="amount">{{ formatarMoeda(receitas) }}</p>
        <p class="card-description">Total recebido no mês</p>
      </article>

      <article class="summary-card">
        <div class="card-heading">
          <span>Despesas</span>
          <span class="card-icon expense-icon">
            <font-awesome-icon icon="arrow-trend-down" aria-hidden="true" />
          </span>
        </div>

        <p class="amount">{{ formatarMoeda(despesas) }}</p>
        <p class="card-description">Total gasto no mês</p>
      </article>
    </section>

    <section class="details-grid">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <h3>Resumo financeiro</h3>
            <p>Receitas e despesas deste mês</p>
          </div>
          <span class="panel-symbol">
            <font-awesome-icon icon="wallet" aria-hidden="true" />
          </span>
        </div>

        <div class="financial-row">
          <span>Receitas</span>
          <strong class="positive">{{ formatarMoeda(receitas) }}</strong>
        </div>

        <div class="financial-row">
          <span>Despesas</span>
          <strong class="negative">{{ formatarMoeda(despesas) }}</strong>
        </div>

        <div class="financial-total">
          <span>Resultado do mês</span>
          <strong :class="resultado >= 0 ? 'positive' : 'negative'">
            {{ formatarMoeda(resultado) }}
          </strong>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <h3>Onde você gastou?</h3>
            <p>Despesas por categoria no mês</p>
          </div>
          <span class="panel-symbol">
            <font-awesome-icon icon="chart-pie" aria-hidden="true" />
          </span>
        </div>

        <p v-if="gastos.length === 0" class="painel-vazio">
          Nenhuma despesa registrada neste mês.
        </p>

        <div v-for="gasto in gastos" :key="gasto.categoriaId" class="expense-item">
          <div class="expense-info">
            <span class="expense-name">
              <span class="expense-selo" :style="{ background: gasto.cor }">
                {{ gasto.icone }}
              </span>
              {{ gasto.nome }}
            </span>
            <strong>{{ formatarMoeda(gasto.valor) }}</strong>
          </div>

          <div
            class="progress-track"
            role="progressbar"
            :aria-label="`Percentual de gastos em ${gasto.nome}`"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="gasto.percentual"
          >
            <div
              class="progress-fill"
              :style="{ width: `${gasto.percentual}%`, background: gasto.cor }"
            ></div>
          </div>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Evolução mensal</h3>
          <p>Receitas e despesas dos últimos meses com lançamentos</p>
        </div>
        <span class="panel-symbol">
          <font-awesome-icon icon="chart-line" aria-hidden="true" />
        </span>
      </div>

      <p v-if="resumoGrafico.length === 0" class="painel-vazio">
        Cadastre lançamentos para ver a evolução mensal.
      </p>
      <GraficoBarras v-else :rotulos="rotulosEvolucao" :datasets="dadosEvolucao" />
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Panorama</h3>
          <p>Patrimônio e próximos compromissos em um só lugar</p>
        </div>
        <span class="panel-symbol">
          <font-awesome-icon icon="chart-pie" aria-hidden="true" />
        </span>
      </div>

      <div class="panorama-grade">
        <article class="panorama-card">
          <p class="panorama-rotulo">Investimentos</p>
          <p class="panorama-valor">{{ formatarMoeda(totalInvestido()) }}</p>
          <p class="panorama-detalhe">valor atual informado por você</p>
          <RouterLink to="/investimentos" class="panorama-link">Ver investimentos</RouterLink>
        </article>

        <article class="panorama-card">
          <p class="panorama-rotulo">Patrimônio líquido</p>
          <p
            class="panorama-valor"
            :class="patrimonioLiquido >= 0 ? 'positivo' : 'negativo'"
          >
            {{ formatarMoeda(patrimonioLiquido) }}
          </p>
          <p class="panorama-detalhe">
            contas + investimentos + bens − dívidas
          </p>
          <RouterLink to="/patrimonio" class="panorama-link">Ver patrimônio</RouterLink>
        </article>

        <article class="panorama-card">
          <p class="panorama-rotulo">A pagar em 30 dias</p>
          <p class="panorama-valor">{{ formatarMoeda(totalProximos) }}</p>
          <p class="panorama-detalhe">
            {{ proximosVencimentos.length }} compromisso(s)
            <template v-if="proximosVencimentos[0]">
              · próximo em {{ formatarDataBR(proximosVencimentos[0].vencimento) }}
            </template>
          </p>
          <RouterLink to="/compromissos" class="panorama-link">Ver compromissos</RouterLink>
        </article>
      </div>
    </section>

    <p class="demo-note">
      Valores calculados com base nos seus lançamentos do mês selecionado.
    </p>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.welcome > div {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.welcome h2 {
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 800;
  letter-spacing: -1px;
}

.subtitle {
  margin: 10px 0 0;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.6;
}

.month-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 11px 15px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
}

.month-badge select {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.month-badge select:focus {
  outline: 2px solid var(--color-focus);
  border-radius: 4px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.summary-card {
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  background: var(--color-surface);
}

.balance-card {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--color-muted);
  font-size: 13px;
}

.balance-card .card-heading {
  color: var(--color-on-primary-soft);
}

.card-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 18px;
  font-weight: 700;
}

.income-icon {
  background: var(--color-primary-soft);
}

.expense-icon {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.amount {
  margin: 22px 0 8px;
  font-family: var(--font-display);
  font-size: clamp(19px, 2vw, 27px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.7px;
  overflow-wrap: anywhere;
}

.card-description {
  margin: 0;
  color: var(--color-muted);
  font-size: 12px;
}

.balance-card .card-description {
  color: var(--color-on-primary-soft);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.panel {
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  background: var(--color-surface);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.panel-heading h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 800;
}

.panel-heading p {
  margin: 7px 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

.panel-symbol {
  color: var(--color-accent);
  font-size: 22px;
}

.financial-row,
.financial-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border-soft);
  font-size: 13px;
}

.financial-row span,
.financial-total span {
  color: var(--color-muted);
}

.financial-row strong,
.financial-total strong {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.positive {
  color: var(--color-positive);
}

.negative {
  color: var(--color-danger);
}

.financial-total {
  margin-top: 4px;
  border-bottom: 0;
  font-weight: 700;
}

.financial-total strong {
  font-size: 16px;
}

.painel-vazio {
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
}

.expense-item {
  margin-bottom: 20px;
}

.expense-item:last-child {
  margin-bottom: 0;
}

.expense-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 12px;
}

.expense-info span {
  color: var(--color-muted);
}

.expense-name {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.expense-selo {
  display: grid;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 8px;
  font-size: 13px;
}

.expense-info strong {
  font-size: 12px;
}

.progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 10px;
  background: var(--color-border-soft);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.demo-note {
  margin: 0;
  color: var(--color-muted);
  font-size: 11px;
  text-align: center;
}

/* ── Panorama ──────────────────────────────────────────────── */
.panorama-grade {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.panorama-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px;
  border: 1px solid var(--color-border-soft);
  border-radius: 13px;
}

.panorama-rotulo {
  margin: 0;
  color: var(--color-muted);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
}

.panorama-valor {
  margin: 0;
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.panorama-valor.positivo {
  color: var(--color-primary);
}

.panorama-valor.negativo {
  color: var(--color-danger-dark);
}

.panorama-detalhe {
  margin: 0;
  color: var(--color-muted);
  font-size: 11.5px;
  line-height: 1.5;
}

.panorama-link {
  margin-top: auto;
  padding-top: 10px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
}

.panorama-link:hover {
  text-decoration: underline;
}

.panorama-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 1050px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .welcome {
    align-items: flex-start;
    flex-direction: column;
  }

  .month-badge {
    align-self: flex-start;
  }

  .summary-card,
  .panel {
    padding: 18px;
  }
}
</style>
