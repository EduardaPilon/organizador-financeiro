<script setup lang="ts">
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { PALETA } from '@/styles/paleta'
import { opcoesPizza } from './chartjs'

ChartJS.register(ArcElement, Tooltip, Legend)

/** Pizza (donut) de composição — ex.: despesas por categoria. */
defineProps<{
  rotulos: string[]
  valores: number[]
  cores: string[]
}>()
</script>

<template>
  <div class="caixa-grafico">
    <Doughnut
      :data="{
        labels: rotulos,
        datasets: [{ data: valores, backgroundColor: cores, borderColor: PALETA.superficie, borderWidth: 2 }],
      }"
      :options="opcoesPizza()"
    />
  </div>
</template>

<style scoped>
.caixa-grafico {
  position: relative;
  height: 280px;
  min-width: 0;
}
</style>
