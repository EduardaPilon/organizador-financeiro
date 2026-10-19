import { ref } from 'vue'
import { registrarEstado } from './persistencia'
import { arredondar2 } from '@/utils/moeda'

/**
 * Patrimônio: bens (imóveis, veículos, equipamentos) e dívidas
 * (financiamentos, empréstimos, cartões).
 *
 * Regras:
 * - Valores de bens são ESTIMATIVAS informadas por você (depreciação não
 *   é calculada automaticamente).
 * - Pagar parcela de dívida reduz o PASSIVO; não gera lançamento para não
 *   duplicar a despesa. Se quiser a parcela no fluxo de caixa mensal,
 *   lance-a normalmente em Lançamentos (ou use Compromissos).
 */

export type TipoBem = 'imovel' | 'veiculo' | 'equipamento' | 'outro'

export const ROTULOS_TIPOS_BEM: Record<TipoBem, string> = {
  imovel: 'Imóvel',
  veiculo: 'Veículo',
  equipamento: 'Equipamento',
  outro: 'Outro bem',
}

export type TipoDivida = 'financiamento' | 'emprestimo' | 'cartao' | 'outro'

export const ROTULOS_TIPOS_DIVIDA: Record<TipoDivida, string> = {
  financiamento: 'Financiamento',
  emprestimo: 'Empréstimo',
  cartao: 'Cartão de crédito',
  outro: 'Outra dívida',
}

export interface Bem {
  id: string
  nome: string
  tipo: TipoBem
  /** Valor estimado atual (informado manualmente). */
  valorEstimado: number
  dataAquisicao?: string
  observacao?: string
}

export interface Divida {
  id: string
  nome: string
  tipo: TipoDivida
  valorOriginal: number
  /** Saldo devedor atual (informado manualmente). */
  saldoDevedor: number
  parcelasTotal: number
  parcelasPagas: number
  valorParcela: number
  observacao?: string
}

export type NovoBem = Omit<Bem, 'id'>
export type NovaDivida = Omit<Divida, 'id' | 'parcelasPagas'>

export const bens = ref<Bem[]>([])
export const dividas = ref<Divida[]>([])

let sequencia = 0
function gerarId(prefixo: string): string {
  sequencia += 1
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`
}

// ── Bens ────────────────────────────────────────────────────

export function adicionarBem(dados: NovoBem): Bem {
  const bem: Bem = {
    ...dados,
    nome: dados.nome.trim(),
    valorEstimado: arredondar2(dados.valorEstimado),
    id: gerarId('bem'),
  }
  bens.value.push(bem)
  return bem
}

export function atualizarBem(id: string, dadosParciais: Partial<Omit<Bem, 'id'>>): void {
  const bem = bens.value.find((item) => item.id === id)
  if (!bem) return
  Object.assign(bem, dadosParciais)
  if (dadosParciais.nome !== undefined) bem.nome = dadosParciais.nome.trim()
  if (dadosParciais.valorEstimado !== undefined) {
    bem.valorEstimado = arredondar2(dadosParciais.valorEstimado)
  }
}

export function removerBem(id: string): void {
  bens.value = bens.value.filter((item) => item.id !== id)
}

export function totalBens(): number {
  return arredondar2(bens.value.reduce((soma, bem) => soma + bem.valorEstimado, 0))
}

// ── Dívidas ─────────────────────────────────────────────────

export function adicionarDivida(dados: NovaDivida): Divida {
  const divida: Divida = {
    ...dados,
    nome: dados.nome.trim(),
    valorOriginal: arredondar2(dados.valorOriginal),
    saldoDevedor: arredondar2(dados.saldoDevedor),
    valorParcela: arredondar2(dados.valorParcela),
    id: gerarId('divida'),
    parcelasPagas: 0,
  }
  dividas.value.push(divida)
  return divida
}

export function atualizarDivida(
  id: string,
  dadosParciais: Partial<Omit<Divida, 'id'>>,
): void {
  const divida = dividas.value.find((item) => item.id === id)
  if (!divida) return
  Object.assign(divida, dadosParciais)
  if (dadosParciais.nome !== undefined) divida.nome = dadosParciais.nome.trim()
  if (dadosParciais.saldoDevedor !== undefined) {
    divida.saldoDevedor = arredondar2(dadosParciais.saldoDevedor)
  }
  if (dadosParciais.valorParcela !== undefined) {
    divida.valorParcela = arredondar2(dadosParciais.valorParcela)
  }
}

export function removerDivida(id: string): void {
  dividas.value = dividas.value.filter((item) => item.id !== id)
}

/**
 * Registra o pagamento de uma parcela: reduz o saldo devedor e avança
 * o contador. Não cria lançamento (evita dupla contagem — ver comentário
 * no topo do arquivo).
 */
export function registrarPagamentoParcela(id: string): void {
  const divida = dividas.value.find((item) => item.id === id)
  if (!divida) return
  if (divida.saldoDevedor <= 0) return

  divida.parcelasPagas = Math.min(divida.parcelasPagas + 1, divida.parcelasTotal)
  divida.saldoDevedor = arredondar2(
    Math.max(divida.saldoDevedor - divida.valorParcela, 0),
  )
}

export function parcelasRestantes(divida: Divida): number {
  return Math.max(divida.parcelasTotal - divida.parcelasPagas, 0)
}

export function totalDividas(): number {
  return arredondar2(
    dividas.value.reduce((soma, divida) => soma + divida.saldoDevedor, 0),
  )
}

export function usarPatrimonio() {
  return { bens, dividas }
}

// ── Persistência local opcional (com consentimento) ─────────
interface EstadoPatrimonio {
  bens: Bem[]
  dividas: Divida[]
}

function ehBemValido(dado: unknown): dado is Bem {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Bem>
  return (
    typeof item.id === 'string' &&
    typeof item.nome === 'string' &&
    typeof item.tipo === 'string' &&
    typeof item.valorEstimado === 'number'
  )
}

function ehDividaValida(dado: unknown): dado is Divida {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Divida>
  return (
    typeof item.id === 'string' &&
    typeof item.nome === 'string' &&
    typeof item.tipo === 'string' &&
    typeof item.valorOriginal === 'number' &&
    typeof item.saldoDevedor === 'number' &&
    typeof item.parcelasTotal === 'number' &&
    typeof item.parcelasPagas === 'number' &&
    typeof item.valorParcela === 'number'
  )
}

registrarEstado({
  chave: 'patrimonio',
  coletar: (): EstadoPatrimonio => ({ bens: bens.value, dividas: dividas.value }),
  aplicar: (dados) => {
    if (typeof dados !== 'object' || dados === null) return
    const estado = dados as Partial<EstadoPatrimonio>
    if (Array.isArray(estado.bens)) bens.value = estado.bens.filter(ehBemValido)
    if (Array.isArray(estado.dividas)) {
      dividas.value = estado.dividas.filter(ehDividaValida)
    }
  },
  limpar: () => {
    bens.value = []
    dividas.value = []
  },
})
