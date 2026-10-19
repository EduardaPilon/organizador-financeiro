import { ref } from 'vue'
import { registrarEstado } from './persistencia'

/**
 * Privacidade: por padrão os lançamentos ficam APENAS em memória.
 * Nada é gravado em localStorage, cookies, banco ou servidor sem consentimento.
 *
 * Com o salvamento local ATIVADO pelo usuário (banner de privacidade),
 * o estado é espelhado no IndexedDB deste navegador via stores/persistencia.
 * Fechar/atualizar sem salvamento ativo perde os dados.
 */
export type TipoLancamento = 'receita' | 'despesa'

export interface Lancamento {
  id: number
  descricao: string
  valor: number
  tipo: TipoLancamento
  categoriaId: string
  subcategoriaId?: string
  /** Data no formato ISO (AAAA-MM-DD) */
  data: string
  observacao?: string
  /** Conta de onde o dinheiro saiu/entrou (módulo Contas). */
  contaId?: string
  /** Cartão usado na compra, quando aplicável (módulo Cartões). */
  cartaoId?: string
  /** Número da parcela (1..total) em compras parceladas. */
  parcelaNumero?: number
  /** Total de parcelas da compra. */
  parcelaTotal?: number
}

export type NovoLancamento = Omit<Lancamento, 'id'>

const lancamentos = ref<Lancamento[]>([])

/**
 * Id sequencial baseado no relógio, garantindo unicidade mesmo quando
 * vários lançamentos são criados no mesmo milissegundo (caso típico das
 * parcelas de uma compra no cartão, geradas em laço).
 */
let ultimoId = 0
function proximoId(): number {
  const agora = Date.now()
  ultimoId = agora > ultimoId ? agora : ultimoId + 1
  return ultimoId
}

export function adicionarLancamento(dados: NovoLancamento): Lancamento {
  const lancamento: Lancamento = {
    ...dados,
    id: proximoId(),
  }

  lancamentos.value.push(lancamento)
  return lancamento
}

export function atualizarLancamento(
  id: number,
  dadosParciais: Partial<NovoLancamento>,
): void {
  const lancamento = lancamentos.value.find((item) => item.id === id)
  if (!lancamento) return

  Object.assign(lancamento, dadosParciais)
}

export function removerLancamento(id: number): void {
  const indice = lancamentos.value.findIndex((item) => item.id === id)
  if (indice !== -1) lancamentos.value.splice(indice, 1)
}

/**
 * Encerra a sessão removendo as referências aos dados financeiros
 * mantidos em memória.
 */
function limparSessao() {
  lancamentos.value = []
}

export function usarLancamentos() {
  return { lancamentos, limparSessao }
}

// ── Persistência local opcional (com consentimento) ─────────
function ehLancamentoValido(dado: unknown): dado is Lancamento {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Lancamento>
  return (
    typeof item.id === 'number' &&
    typeof item.descricao === 'string' &&
    typeof item.valor === 'number' &&
    Number.isFinite(item.valor) &&
    (item.tipo === 'receita' || item.tipo === 'despesa') &&
    typeof item.categoriaId === 'string' &&
    typeof item.data === 'string'
  )
}

registrarEstado({
  chave: 'lancamentos',
  coletar: () => lancamentos.value,
  aplicar: (dados) => {
    // Validação defensiva: arquivo corrompido/antigo não quebra o app.
    if (!Array.isArray(dados)) return
    lancamentos.value = dados.filter(ehLancamentoValido)
  },
  limpar: () => {
    lancamentos.value = []
  },
})
