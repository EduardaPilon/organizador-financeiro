import { ref } from 'vue'
import { registrarEstado } from './persistencia'
import { arredondar2 } from '@/utils/moeda'

/**
 * Investimentos: posições, aportes, resgates e rendimentos.
 *
 * Regras financeiras importantes:
 * - Aporte NÃO é despesa e resgate NÃO é receita: é transferência entre
 *   "conta" e "patrimônio investido". Aparecem no patrimônio, não no
 *   fluxo de caixa mensal.
 * - O valor atual é INFORMADO MANUALMENTE (o app não busca cotações).
 *   Rendimento exibido = valor atual − (aportes − resgates); é uma
 *   estimativa a partir do que você digitou, não uma cotação de mercado.
 */

export type TipoInvestimento =
  | 'renda_fixa'
  | 'renda_variavel'
  | 'fundo'
  | 'cripto'
  | 'poupanca'
  | 'outro'

export const ROTULOS_TIPOS_INVESTIMENTO: Record<TipoInvestimento, string> = {
  renda_fixa: 'Renda fixa',
  renda_variavel: 'Renda variável',
  fundo: 'Fundos',
  cripto: 'Criptomoedas',
  poupanca: 'Poupança',
  outro: 'Outros',
}

export type TipoMovimentacao = 'aporte' | 'resgate' | 'rendimento'

export const ROTULOS_MOVIMENTACOES: Record<TipoMovimentacao, string> = {
  aporte: 'Aporte',
  resgate: 'Resgate',
  rendimento: 'Rendimento informado',
}

export interface Investimento {
  id: string
  nome: string
  tipo: TipoInvestimento
  /** Data ISO do primeiro aporte. */
  dataInicial: string
  /** Valor atual informado manualmente. */
  valorAtual: number
  /** Quando o valor atual foi informado (ISO). */
  atualizadoEm: string
  ativo: boolean
  observacao?: string
}

export interface MovimentacaoInvestimento {
  id: string
  investimentoId: string
  tipo: TipoMovimentacao
  valor: number
  data: string
  observacao?: string
}

export type NovoInvestimento = Omit<Investimento, 'id' | 'ativo' | 'atualizadoEm'> & {
  atualizadoEm?: string
}
export type NovaMovimentacao = Omit<MovimentacaoInvestimento, 'id'>

export const investimentos = ref<Investimento[]>([])
export const movimentacoes = ref<MovimentacaoInvestimento[]>([])

let sequencia = 0
function gerarId(prefixo: string): string {
  sequencia += 1
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`
}

export function listarInvestimentos(
  opcoes: { incluirInativos?: boolean } = {},
): Investimento[] {
  return investimentos.value.filter(
    (item) => opcoes.incluirInativos || item.ativo,
  )
}

export function obterInvestimento(id: string): Investimento | undefined {
  return investimentos.value.find((item) => item.id === id)
}

export function adicionarInvestimento(dados: NovoInvestimento): Investimento {
  const investimento: Investimento = {
    ...dados,
    nome: dados.nome.trim(),
    valorAtual: arredondar2(dados.valorAtual),
    atualizadoEm: dados.atualizadoEm ?? dados.dataInicial,
    id: gerarId('invest'),
    ativo: true,
  }
  investimentos.value.push(investimento)
  return investimento
}

export function atualizarInvestimento(
  id: string,
  dadosParciais: Partial<Omit<Investimento, 'id'>>,
): void {
  const investimento = obterInvestimento(id)
  if (!investimento) return
  Object.assign(investimento, dadosParciais)
  if (dadosParciais.nome !== undefined) investimento.nome = dadosParciais.nome.trim()
  if (dadosParciais.valorAtual !== undefined) {
    investimento.valorAtual = arredondar2(dadosParciais.valorAtual)
  }
}

/** Atualiza o valor atual informado manualmente (com a data de hoje). */
export function informarValorAtual(id: string, valor: number, data: string): void {
  const investimento = obterInvestimento(id)
  if (!investimento) return
  investimento.valorAtual = arredondar2(valor)
  investimento.atualizadoEm = data
}

export function alternarAtivoInvestimento(id: string): void {
  const investimento = obterInvestimento(id)
  if (investimento) investimento.ativo = !investimento.ativo
}

/** Remove o investimento e suas movimentações. */
export function removerInvestimento(id: string): void {
  investimentos.value = investimentos.value.filter((item) => item.id !== id)
  movimentacoes.value = movimentacoes.value.filter(
    (movimentacao) => movimentacao.investimentoId !== id,
  )
}

export function adicionarMovimentacao(
  dados: NovaMovimentacao,
): MovimentacaoInvestimento | null {
  if (!obterInvestimento(dados.investimentoId)) return null
  if (dados.valor <= 0) return null

  const movimentacao: MovimentacaoInvestimento = {
    ...dados,
    valor: arredondar2(dados.valor),
    id: gerarId('mov'),
  }
  movimentacoes.value.push(movimentacao)
  return movimentacao
}

export function removerMovimentacao(id: string): void {
  const indice = movimentacoes.value.findIndex((item) => item.id === id)
  if (indice !== -1) movimentacoes.value.splice(indice, 1)
}

export function movimentacoesDo(
  investimentoId: string,
): MovimentacaoInvestimento[] {
  return [...movimentacoes.value]
    .filter((movimentacao) => movimentacao.investimentoId === investimentoId)
    .sort((a, b) => b.data.localeCompare(a.data))
}

/**
 * Capital aportado líquido: aportes + rendimentos informados − resgates.
 * (Rendimento informado entra como "aplicado" porque foi declarado como
 * ganho do próprio usuário, não como cotação buscada pelo app.)
 */
export function capitalAplicado(investimentoId: string): number {
  let total = 0
  for (const movimentacao of movimentacoes.value) {
    if (movimentacao.investimentoId !== investimentoId) continue
    if (movimentacao.tipo === 'resgate') total -= movimentacao.valor
    else total += movimentacao.valor
  }
  return arredondar2(total)
}

/** Rendimento estimado = valor atual informado − capital aportado líquido. */
export function rendimentoEstimado(investimentoId: string): number {
  const investimento = obterInvestimento(investimentoId)
  if (!investimento) return 0
  return arredondar2(investimento.valorAtual - capitalAplicado(investimentoId))
}

export function totalInvestido(): number {
  return arredondar2(
    listarInvestimentos().reduce(
      (soma, investimento) => soma + investimento.valorAtual,
      0,
    ),
  )
}

export function usarInvestimentos() {
  return { investimentos, movimentacoes }
}

// ── Persistência local opcional (com consentimento) ─────────
interface EstadoInvestimentos {
  investimentos: Investimento[]
  movimentacoes: MovimentacaoInvestimento[]
}

function ehInvestimentoValido(dado: unknown): dado is Investimento {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Investimento>
  return (
    typeof item.id === 'string' &&
    typeof item.nome === 'string' &&
    typeof item.tipo === 'string' &&
    typeof item.dataInicial === 'string' &&
    typeof item.valorAtual === 'number' &&
    typeof item.ativo === 'boolean'
  )
}

function ehMovimentacaoValida(dado: unknown): dado is MovimentacaoInvestimento {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<MovimentacaoInvestimento>
  return (
    typeof item.id === 'string' &&
    typeof item.investimentoId === 'string' &&
    (item.tipo === 'aporte' || item.tipo === 'resgate' || item.tipo === 'rendimento') &&
    typeof item.valor === 'number' &&
    typeof item.data === 'string'
  )
}

registrarEstado({
  chave: 'investimentos',
  coletar: (): EstadoInvestimentos => ({
    investimentos: investimentos.value,
    movimentacoes: movimentacoes.value,
  }),
  aplicar: (dados) => {
    if (typeof dados !== 'object' || dados === null) return
    const estado = dados as Partial<EstadoInvestimentos>
    if (Array.isArray(estado.investimentos)) {
      investimentos.value = estado.investimentos.filter(ehInvestimentoValido)
    }
    if (Array.isArray(estado.movimentacoes)) {
      movimentacoes.value = estado.movimentacoes.filter(ehMovimentacaoValida)
    }
  },
  limpar: () => {
    investimentos.value = []
    movimentacoes.value = []
  },
})
