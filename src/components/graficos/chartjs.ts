import type { ChartOptions } from 'chart.js'
import { PALETA } from '@/styles/paleta'
import { formatarMoeda } from '@/utils/formatar'

/**
 * Configuração compartilhada dos gráficos (Chart.js).
 *
 * Decisão de biblioteca: Chart.js em vez de Apache ECharts — os gráficos
 * necessários (barras, linha, pizza) são básicos e o bundle do Chart.js é
 * bem menor. Reavalie se surgir necessidade de zoom/tooltip avançado.
 */

/**
 * Cores dos gráficos — vêm da paleta oficial (styles/paleta.ts).
 * Chart.js não lê CSS custom properties, então a paleta também existe em
 * TypeScript; aqui só apontamos para ela.
 */
export const PALETA_GRAFICOS = {
  receita: PALETA.verde,
  despesa: PALETA.coral,
  saldo: PALETA.azul,
  destaque: PALETA.teal,
  neutro: PALETA.cinza,
  texto: PALETA.texto,
  textoSuave: PALETA.textoSuave,
} as const

export interface DatasetBarras {
  label: string
  data: number[]
  backgroundColor: string
  borderRadius: number
  maxBarThickness?: number
}

export interface DatasetLinha {
  label: string
  data: number[]
  borderColor: string
  backgroundColor: string
  preenchido: boolean
}

const FONTE = { family: 'Inter, sans-serif' } as const

function legenda() {
  return {
    position: 'bottom' as const,
    labels: { usePointStyle: true, boxWidth: 8, font: FONTE, color: PALETA_GRAFICOS.textoSuave },
  }
}

function eixoMonetario() {
  return {
    x: { ticks: { font: FONTE, color: PALETA_GRAFICOS.textoSuave }, grid: { display: false } },
    y: {
      ticks: { font: FONTE, color: PALETA_GRAFICOS.textoSuave, callback: (valor: number | string) => formatarMoeda(Number(valor)) },
      grid: { color: PALETA.cinza },
    },
  }
}

function tooltipMonetarioInline() {
  return {
    callbacks: {
      label: (context: { dataset: { label?: string }; parsed: unknown }) =>
        rotuloMonetario(context),
    },
  }
}

/** Rótulo de tooltip monetário, tolerante às formas de `parsed`. */
function rotuloMonetario(context: { dataset: { label?: string }; parsed: unknown }): string {
  const parsed = context.parsed
  let valor = 0
  if (typeof parsed === 'number') {
    valor = parsed
  } else if (parsed !== null && typeof parsed === 'object') {
    const objeto = parsed as { y?: number | null; x?: number | null }
    valor = objeto.y ?? objeto.x ?? 0
  }
  return ` ${context.dataset.label ?? ''}: ${formatarMoeda(valor)}`
}

export function opcoesBarras(): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: legenda(), tooltip: tooltipMonetarioInline() },
    scales: eixoMonetario(),
  }
}

export function opcoesLinha(): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: legenda(), tooltip: tooltipMonetarioInline() },
    scales: eixoMonetario(),
    elements: { point: { radius: 3, hoverRadius: 5 } },
  }
}

export function opcoesPizza(): ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: legenda(),
      tooltip: {
        callbacks: {
          label: (context) =>
            ` ${context.label ?? ''}: ${formatarMoeda(Number(context.parsed))}`,
        },
      },
    },
    cutout: '58%',
  }
}
