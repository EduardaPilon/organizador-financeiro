import { ref } from 'vue'
import { registrarEstado } from './persistencia'
import { arredondar2 } from '@/utils/moeda'

/**
 * Orçamentos por categoria/mês e metas de economia.
 *
 * Regras:
 * - O orçamento compara o LIMITE definido com as despesas do mês na
 *   categoria (lançamentos reais). Alertas: ≥ 80% (atenção) e 100%
 *   (estourado).
 * - Metas têm valor atual informado manualmente; o app não "reserva"
 *   dinheiro automaticamente.
 */

export interface Orcamento {
  id: string
  categoriaId: string
  /** Mês de referência, "AAAA-MM". */
  mes: string
  limite: number
  observacao?: string
}

export interface Meta {
  id: string
  nome: string
  valorAlvo: number
  /** Quanto já foi acumulado (informado manualmente). */
  valorAtual: number
  prazo?: string
  observacao?: string
}

export type NovoOrcamento = Omit<Orcamento, 'id'>
export type NovaMeta = Omit<Meta, 'id'>

export const orcamentos = ref<Orcamento[]>([])
export const metas = ref<Meta[]>([])

let sequencia = 0
function gerarId(prefixo: string): string {
  sequencia += 1
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`
}

// ── Orçamentos ──────────────────────────────────────────────

export function adicionarOrcamento(dados: NovoOrcamento): Orcamento | null {
  // Um limite por categoria/mês: substitui o existente (regra clara).
  const existente = orcamentos.value.find(
    (orcamento) =>
      orcamento.categoriaId === dados.categoriaId && orcamento.mes === dados.mes,
  )
  if (existente) {
    existente.limite = arredondar2(dados.limite)
    existente.observacao = dados.observacao
    return existente
  }

  const orcamento: Orcamento = {
    ...dados,
    limite: arredondar2(dados.limite),
    id: gerarId('orc'),
  }
  orcamentos.value.push(orcamento)
  return orcamento
}

export function atualizarOrcamento(
  id: string,
  dadosParciais: Partial<Omit<Orcamento, 'id'>>,
): void {
  const orcamento = orcamentos.value.find((item) => item.id === id)
  if (!orcamento) return
  Object.assign(orcamento, dadosParciais)
  if (dadosParciais.limite !== undefined) {
    orcamento.limite = arredondar2(dadosParciais.limite)
  }
}

export function removerOrcamento(id: string): void {
  orcamentos.value = orcamentos.value.filter((item) => item.id !== id)
}

export function orcamentosDoMes(mes: string): Orcamento[] {
  return orcamentos.value.filter((orcamento) => orcamento.mes === mes)
}

export function obterOrcamento(id: string): Orcamento | undefined {
  return orcamentos.value.find((item) => item.id === id)
}

/** Situação do orçamento conforme o gasto consumido. */
export type SituacaoOrcamento = 'ok' | 'atencao' | 'estourado'

export function situacaoOrcamento(
  orcamento: Orcamento,
  gasto: number,
): { percentual: number; situacao: SituacaoOrcamento } {
  const percentual =
    orcamento.limite > 0 ? Math.round((gasto / orcamento.limite) * 100) : 0

  let situacao: SituacaoOrcamento = 'ok'
  if (percentual >= 100) situacao = 'estourado'
  else if (percentual >= 80) situacao = 'atencao'

  return { percentual, situacao }
}

// ── Metas ───────────────────────────────────────────────────

export function adicionarMeta(dados: NovaMeta): Meta {
  const meta: Meta = {
    ...dados,
    nome: dados.nome.trim(),
    valorAlvo: arredondar2(dados.valorAlvo),
    valorAtual: arredondar2(dados.valorAtual),
    id: gerarId('meta'),
  }
  metas.value.push(meta)
  return meta
}

export function atualizarMeta(id: string, dadosParciais: Partial<Omit<Meta, 'id'>>): void {
  const meta = metas.value.find((item) => item.id === id)
  if (!meta) return
  Object.assign(meta, dadosParciais)
  if (dadosParciais.nome !== undefined) meta.nome = dadosParciais.nome.trim()
  if (dadosParciais.valorAlvo !== undefined) meta.valorAlvo = arredondar2(dadosParciais.valorAlvo)
  if (dadosParciais.valorAtual !== undefined) meta.valorAtual = arredondar2(dadosParciais.valorAtual)
}

export function removerMeta(id: string): void {
  metas.value = metas.value.filter((item) => item.id !== id)
}

/** Progresso da meta (0 a 100+, sem estourar a barra visual). */
export function progressoMeta(meta: Meta): number {
  if (meta.valorAlvo <= 0) return 0
  return Math.round((meta.valorAtual / meta.valorAlvo) * 100)
}

export function usarOrcamentos() {
  return { orcamentos, metas }
}

// ── Persistência local opcional (com consentimento) ─────────
interface EstadoOrcamentos {
  orcamentos: Orcamento[]
  metas: Meta[]
}

function ehOrcamentoValido(dado: unknown): dado is Orcamento {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Orcamento>
  return (
    typeof item.id === 'string' &&
    typeof item.categoriaId === 'string' &&
    typeof item.mes === 'string' &&
    typeof item.limite === 'number'
  )
}

function ehMetaValida(dado: unknown): dado is Meta {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Meta>
  return (
    typeof item.id === 'string' &&
    typeof item.nome === 'string' &&
    typeof item.valorAlvo === 'number' &&
    typeof item.valorAtual === 'number'
  )
}

registrarEstado({
  chave: 'orcamentos',
  coletar: (): EstadoOrcamentos => ({ orcamentos: orcamentos.value, metas: metas.value }),
  aplicar: (dados) => {
    if (typeof dados !== 'object' || dados === null) return
    const estado = dados as Partial<EstadoOrcamentos>
    if (Array.isArray(estado.orcamentos)) {
      orcamentos.value = estado.orcamentos.filter(ehOrcamentoValido)
    }
    if (Array.isArray(estado.metas)) metas.value = estado.metas.filter(ehMetaValida)
  },
  limpar: () => {
    orcamentos.value = []
    metas.value = []
  },
})
