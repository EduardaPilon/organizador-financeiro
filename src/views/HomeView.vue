
<script setup lang="ts">
import { computed } from 'vue'
import { usarLancamentos } from '@/stores/lancamentos'

const { lancamentos } = usarLancamentos()

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

const receitas = computed(() => {
  return lancamentos.value
    .filter((lancamento) => lancamento.tipo === 'receita')
    .reduce((total, lancamento) => total + lancamento.valor, 0)
})

const despesas = computed(() => {
  return lancamentos.value
    .filter((lancamento) => lancamento.tipo === 'despesa')
    .reduce((total, lancamento) => total + lancamento.valor, 0)
})

const saldo = computed(() => receitas.value - despesas.value)

const gastos = computed(() => {
  const categorias = lancamentos.value.filter(
    (lancamento) => lancamento.tipo === 'despesa',
  )

  const totaisPorCategoria = categorias.reduce(
    (totais, lancamento) => {
      totais[lancamento.categoria] =
        (totais[lancamento.categoria] || 0) + lancamento.valor

      return totais
    },
    {} as Record<string, number>,
  )

  return Object.entries(totaisPorCategoria).map(([categoria, valor]) => ({
    categoria,
    valor,
    percentual: despesas.value > 0
      ? Math.round((valor / despesas.value) * 100)
      : 0,
  }))
})
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

      <div class="month-badge">Visão geral</div>
    </section>

    <section class="summary-cards">
      <article class="summary-card balance-card">
        <div class="card-heading">
          <span>Saldo disponível</span>
          <span class="card-icon">$</span>
        </div>

        <p class="amount">{{ formatarMoeda(saldo) }}</p>
        <p class="card-description">Seu saldo atual</p>
      </article>

      <article class="summary-card">
        <div class="card-heading">
          <span>Receitas</span>
          <span class="card-icon income-icon">↗</span>
        </div>

        <p class="amount">{{ formatarMoeda(receitas) }}</p>
        <p class="card-description">Total recebido no mês</p>
      </article>

      <article class="summary-card">
        <div class="card-heading">
          <span>Despesas</span>
          <span class="card-icon expense-icon">↙</span>
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
          <span class="panel-symbol">↗</span>
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
          <strong>{{ formatarMoeda(receitas - despesas) }}</strong>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <h3>Onde você gastou?</h3>
            <p>Despesas por categoria</p>
          </div>
          <span class="panel-symbol">⌁</span>
        </div>

        <div v-for="gasto in gastos" :key="gasto.categoria" class="expense-item">
          <div class="expense-info">
            <span>{{ gasto.categoria }}</span>
            <strong>{{ formatarMoeda(gasto.valor) }}</strong>
          </div>

          <div
            class="progress-track"
            role="progressbar"
            :aria-label="`Percentual de gastos em ${gasto.categoria}`"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="gasto.percentual"
          >
            <div class="progress-fill" :style="{ width: `${gasto.percentual}%` }"></div>
          </div>
        </div>
      </article>
    </section>

    <p class="demo-note">
      Valores calculados com base nos seus lançamentos cadastrados.
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

.eyebrow {
  margin: 0 0 10px;
  color: #43815e;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.welcome h2 {
  margin: 0;
  color: #24332c;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 800;
  letter-spacing: -1px;
}

.subtitle {
  margin: 10px 0 0;
  color: #7b887f;
  font-size: 14px;
  line-height: 1.6;
}

.month-badge {
  flex-shrink: 0;
  padding: 11px 15px;
  border: 1px solid #e1e9e2;
  border-radius: 10px;
  background: #fff;
  color: #536459;
  font-size: 12px;
  font-weight: 600;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.summary-card {
  min-width: 0;
  padding: 22px;
  border: 1px solid #e7ece8;
  border-radius: 15px;
  background: #fff;
}

.balance-card {
  border-color: #246b4a;
  background: #246b4a;
  color: #fff;
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #7b887f;
  font-size: 13px;
}

.balance-card .card-heading {
  color: #d6e8dc;
}

.card-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  background: #f0f5f1;
  color: #246b4a;
  font-size: 18px;
  font-weight: 700;
}

.income-icon {
  background: #e9f5ec;
}

.expense-icon {
  background: #fbefeb;
  color: #c46b55;
}

.amount {
  margin: 22px 0 8px;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(19px, 2vw, 27px);
  font-weight: 800;
  letter-spacing: -0.7px;
  overflow-wrap: anywhere;
}

.card-description {
  margin: 0;
  color: #89958c;
  font-size: 12px;
}

.balance-card .card-description {
  color: #d6e8dc;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.panel {
  min-width: 0;
  padding: 24px;
  border: 1px solid #e7ece8;
  border-radius: 15px;
  background: #fff;
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
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 800;
}

.panel-heading p {
  margin: 7px 0 0;
  color: #89958c;
  font-size: 12px;
}

.panel-symbol {
  color: #43815e;
  font-size: 22px;
}

.financial-row,
.financial-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #edf0ed;
  font-size: 13px;
}

.financial-row span,
.financial-total span {
  color: #69776e;
}

.financial-row strong,
.financial-total strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}

.positive {
  color: #39845a;
}

.negative {
  color: #c46b55;
}

.financial-total {
  margin-top: 4px;
  border-bottom: 0;
  font-weight: 700;
}

.financial-total strong {
  color: #246b4a;
  font-size: 16px;
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
  color: #69776e;
}

.expense-info strong {
  font-size: 12px;
}

.progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 10px;
  background: #edf2ee;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #43815e;
}

.demo-note {
  margin: 0;
  color: #89958c;
  font-size: 11px;
  text-align: center;
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
