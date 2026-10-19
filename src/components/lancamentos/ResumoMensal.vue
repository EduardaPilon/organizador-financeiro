<script setup lang="ts">
import { formatarMoeda } from '@/utils/formatar'
import type { ResumoMes } from '@/utils/resumos'

defineProps<{ meses: ResumoMes[] }>()
</script>

<template>
  <section class="panel">
    <h3>Resumo mensal</h3>
    <p class="panel-description">
      Receitas e despesas por mês, considerando os filtros aplicados na lista.
    </p>

    <p v-if="meses.length === 0" class="panel-description">
      Sem dados para exibir o resumo.
    </p>

    <div v-for="mes in meses" :key="mes.chave" class="mes-linha">
      <div class="mes-info">
        <strong>{{ mes.rotulo }}</strong>
        <p class="detalhe-lancamento">{{ mes.quantidade }} lançamento(s)</p>
      </div>

      <div class="mes-valores">
        <span class="receita">+{{ formatarMoeda(mes.receitas) }}</span>
        <span class="despesa">-{{ formatarMoeda(mes.despesas) }}</span>
        <strong :class="mes.resultado >= 0 ? 'receita' : 'despesa'">
          {{ formatarMoeda(mes.resultado) }}
        </strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  background: var(--color-surface);
}

.panel h3 {
  margin: 0;
}

.panel-description {
  margin-bottom: 24px;
  color: var(--color-muted);
  font-size: 14px;
}

.mes-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border-soft);
}

.mes-linha:last-of-type {
  border-bottom: 0;
}

.mes-info {
  min-width: 0;
}

.mes-info strong {
  font-size: 14px;
}

.detalhe-lancamento {
  margin: 6px 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

.mes-valores {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  font-size: 12px;
}

.mes-valores strong {
  font-size: 13px;
}

.receita {
  color: var(--color-positive);
}

.despesa {
  color: var(--color-danger);
}

@media (max-width: 600px) {
  .panel {
    padding: 18px;
  }

  .mes-linha {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
