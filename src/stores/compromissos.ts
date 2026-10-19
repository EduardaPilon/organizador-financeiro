import { ref } from 'vue'
import { registrarEstado } from './persistencia'
import {
  adicionarLancamento,
  removerLancamento,
  type TipoLancamento,
} from './lancamentos'
import { avancarMeses, diasAte } from '@/utils/datas'
import { arredondar2 } from '@/utils/moeda'

/**
 * Compromissos: contas a pagar e a receber (contas, boletos, mensalidades),
 * com ou sem recorrência mensal.
 *
 * Regra: o compromisso em si NÃO mexe no fluxo de caixa. Ao marcar como
 * pago/recebido, um lançamento (despesa ou receita) é criado na data de
 * vencimento — assim receitas/despesas nunca contam duas vezes.
 */

export type TipoCompromisso = 'a_pagar' | 'a_receber'
export type StatusCompromisso = 'pendente' | 'pago'

export const ROTULOS_TIPO_COMPROMISSO: Record<TipoCompromisso, string> = {
  a_pagar: 'A pagar',
  a_receber: 'A receber',
}

export interface Compromisso {
  id: string
  descricao: string
  valor: number
  tipo: TipoCompromisso
  /** Data ISO de vencimento. */
  vencimento: string
  categoriaId: string
  status: StatusCompromisso
  /** Recorrência mensal: ao quitar, gera o próximo mês automaticamente. */
  recorrenteMensal: boolean
  /** Lançamento criado ao quitar (permite desfazer). */
  lancamentoId?: number
  observacao?: string
}

export type NovoCompromisso = Omit<Compromisso, 'id' | 'status'>

export const compromissos = ref<Compromisso[]>([])

let sequencia = 0
function gerarId(): string {
  sequencia += 1
  return `comp-${Date.now().toString(36)}-${sequencia}`
}

/** Situação exibida na interface (considera atraso em relação a hoje). */
export type SituacaoCompromisso = 'pago' | 'atrasado' | 'vence_breve' | 'pendente'

export function situacaoCompromisso(
  compromisso: Compromisso,
  hoje: string,
  limiteDiasBreve = 5,
): SituacaoCompromisso {
  if (compromisso.status === 'pago') return 'pago'
  const dias = diasAte(compromisso.vencimento, hoje)
  if (dias < 0) return 'atrasado'
  if (dias <= limiteDiasBreve) return 'vence_breve'
  return 'pendente'
}

export function listarCompromissos(): Compromisso[] {
  return [...compromissos.value].sort((a, b) =>
    a.vencimento.localeCompare(b.vencimento),
  )
}

export function obterCompromisso(id: string): Compromisso | undefined {
  return compromissos.value.find((item) => item.id === id)
}

export function adicionarCompromisso(dados: NovoCompromisso): Compromisso {
  const compromisso: Compromisso = {
    ...dados,
    descricao: dados.descricao.trim(),
    valor: arredondar2(dados.valor),
    id: gerarId(),
    status: 'pendente',
  }
  compromissos.value.push(compromisso)
  return compromisso
}

export function atualizarCompromisso(
  id: string,
  dadosParciais: Partial<Omit<Compromisso, 'id'>>,
): void {
  const compromisso = obterCompromisso(id)
  if (!compromisso) return
  Object.assign(compromisso, dadosParciais)
  if (dadosParciais.descricao !== undefined) {
    compromisso.descricao = dadosParciais.descricao.trim()
  }
  if (dadosParciais.valor !== undefined) {
    compromisso.valor = arredondar2(dadosParciais.valor)
  }
}

export function removerCompromisso(id: string): void {
  const compromisso = obterCompromisso(id)
  // Remove o lançamento vinculado antes (se ainda existir).
  if (compromisso?.lancamentoId !== undefined) {
    removerLancamento(compromisso.lancamentoId)
  }
  const indice = compromissos.value.findIndex((item) => item.id === id)
  if (indice !== -1) compromissos.value.splice(indice, 1)
}

/**
 * Marca como pago/recebido: cria o lançamento na data de vencimento —
 * o único ponto em que um compromisso afeta receitas/despesas.
 *
 * Recorrência: a ocorrência do mês seguinte NÃO é criada aqui. A interface
 * chama `gerarProximaOcorrencia` depois da quitação, para o usuário ver o
 * histórico de cada mês e decidir quando repetir.
 */
export function marcarComoPago(id: string): void {
  const compromisso = obterCompromisso(id)
  if (!compromisso || compromisso.status === 'pago') return

  const tipoLancamento: TipoLancamento =
    compromisso.tipo === 'a_pagar' ? 'despesa' : 'receita'

  const lancamento = adicionarLancamento({
    descricao: compromisso.descricao,
    valor: compromisso.valor,
    tipo: tipoLancamento,
    categoriaId: compromisso.categoriaId,
    data: compromisso.vencimento,
    observacao: 'Compromisso quitado',
  })

  compromisso.status = 'pago'
  compromisso.lancamentoId = lancamento.id
}

/** Desfaz a quitação e remove o lançamento criado. */
export function desmarcarPago(id: string): void {
  const compromisso = obterCompromisso(id)
  if (!compromisso || compromisso.status !== 'pago') return

  if (compromisso.lancamentoId !== undefined) {
    removerLancamento(compromisso.lancamentoId)
  }
  compromisso.status = 'pendente'
  compromisso.lancamentoId = undefined
}

/** Cria a próxima ocorrência mensal (usado nos recorrentes já quitados). */
export function gerarProximaOcorrencia(id: string): Compromisso | null {
  const compromisso = obterCompromisso(id)
  if (!compromisso || !compromisso.recorrenteMensal) return null

  // avancarMeses preserva o dia e ajusta meses curtos (31/01 → 28/02).
  const vencimento = avancarMeses(compromisso.vencimento, 1)

  return adicionarCompromisso({
    descricao: compromisso.descricao,
    valor: compromisso.valor,
    tipo: compromisso.tipo,
    vencimento,
    categoriaId: compromisso.categoriaId,
    recorrenteMensal: true,
    observacao: compromisso.observacao,
  })
}

export function usarCompromissos() {
  return { compromissos }
}

// ── Persistência local opcional (com consentimento) ─────────
function ehCompromissoValido(dado: unknown): dado is Compromisso {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Compromisso>
  return (
    typeof item.id === 'string' &&
    typeof item.descricao === 'string' &&
    typeof item.valor === 'number' &&
    (item.tipo === 'a_pagar' || item.tipo === 'a_receber') &&
    typeof item.vencimento === 'string' &&
    typeof item.categoriaId === 'string' &&
    (item.status === 'pendente' || item.status === 'pago')
  )
}

registrarEstado({
  chave: 'compromissos',
  coletar: () => compromissos.value,
  aplicar: (dados) => {
    if (!Array.isArray(dados)) return
    compromissos.value = dados
      .filter(ehCompromissoValido)
      .map((item) => ({ ...item, recorrenteMensal: item.recorrenteMensal === true }))
  },
  limpar: () => {
    compromissos.value = []
  },
})
