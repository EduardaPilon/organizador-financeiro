<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { opcoesLinha, type DatasetLinha } from './chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
)

/** Gráfico de linha para evolução (ex.: saldo acumulado). */
defineProps<{
  rotulos: string[]
  datasets: DatasetLinha[]
}>()
</script>

<template>
  <div class="caixa-grafico">
    <Line :data="{ labels: rotulos, datasets }" :options="opcoesLinha()" />
  </div>
</template>

<style scoped>
.caixa-grafico {
  position: relative;
  height: 280px;
  min-width: 0;
}
</style>
