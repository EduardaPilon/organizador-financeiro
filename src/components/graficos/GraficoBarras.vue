<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { opcoesBarras, type DatasetBarras } from './chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

/** Gráfico de barras comparativo (ex.: receitas × despesas por mês). */
defineProps<{
  rotulos: string[]
  datasets: DatasetBarras[]
}>()
</script>

<template>
  <div class="caixa-grafico">
    <Bar :data="{ labels: rotulos, datasets }" :options="opcoesBarras()" />
  </div>
</template>

<style scoped>
.caixa-grafico {
  position: relative;
  height: 280px;
  min-width: 0;
}
</style>
