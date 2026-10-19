import { ref } from 'vue'
import { registrarEstado } from './persistencia'
import {
  adicionarLancamento,
  removerLancamento,
  atualizarLancamento,
  type Lancamento,
} from './lancamentos'
import { avancarMeses } from '@/utils/datas'
import { arredondar2 } from '@/utils/moeda'

/**
 * Cartões de crédito: compras (com parcelamento), faturas e pagamentos.
 *
 * Regras financeiras (para não contar nada duas vezes):
 * - A COMPRA gera despesa: uma parcela por mês entra em Lançamentos.
 * - O PAGAMENTO DA FATURA NÃO é despesa: é a quitação do compromisso do
 *   cartão (o dinheiro já foi contabilizado como despesa na compra).
 * - Limite comprometido = soma das parcelas com data a partir de hoje.
 */

export interface Cartao {
  id: string
  nome: string
  bandeira?: string
  limite: number
  /** Dia do mês em que a fatura fecha (1 a 28+). */
  diaFechamento: number
  /** Dia do mês em que a fatura vence. */
  diaVencimento: number
  ativo: boolean
  observacao?: string
}

export interface CompraCartao {
  id: string
  cartaoId: string
  descricao: string
  categoriaId: string
  valorTotal: number
  parcelas: number
  dataCompra: string
  /** Ids dos lançamentos de despesa gerados (uma parcela por mês). */
  lancamentosIds: number[]
  observacao?: string
}

export interface PagamentoFatura {
  id: string
  cartaoId: string
  /** Mês da fatura, "AAAA-MM". */
  mes: string
  valor: number
  data: string
  contaId?: string
}

export type NovoCartao = Omit<Cartao, 'id' | 'ativo'>
export type NovaCompra = Omit<CompraCartao, 'id' | 'lancamentosIds'>
export type NovoPagamentoFatura = Omit<PagamentoFatura, 'id'>

export const cartoes = ref<Cartao[]>([])
export const compras = ref<CompraCartao[]>([])
export const pagamentosFatura = ref<PagamentoFatura[]>([])

let sequencia = 0
function gerarId(prefixo: string): string {
  sequencia += 1
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`
}

// ── Cartões ─────────────────────────────────────────────────

export function listarCartoes(opcoes: { incluirInativos?: boolean } = {}): Cartao[] {
  return cartoes.value.filter((cartao) => opcoes.incluirInativos || cartao.ativo)
}

export function obterCartao(id: string | undefined): Cartao | undefined {
  if (!id) return undefined
  return cartoes.value.find((cartao) => cartao.id === id)
}

export function adicionarCartao(dados: NovoCartao): Cartao {
  const cartao: Cartao = {
    ...dados,
    nome: dados.nome.trim(),
    limite: arredondar2(dados.limite),
    id: gerarId('cartao'),
    ativo: true,
  }
  cartoes.value.push(cartao)
  return cartao
}

export function atualizarCartao(
  id: string,
  dadosParciais: Partial<Omit<Cartao, 'id'>>,
): void {
  const cartao = obterCartao(id)
  if (!cartao) return
  Object.assign(cartao, dadosParciais)
  if (dadosParciais.nome !== undefined) cartao.nome = dadosParciais.nome.trim()
  if (dadosParciais.limite !== undefined) {
    cartao.limite = arredondar2(dadosParciais.limite)
  }
}

export function alternarAtivoCartao(id: string): void {
  const cartao = obterCartao(id)
  if (cartao) cartao.ativo = !cartao.ativo
}

/** Remove o cartão, suas compras, parcelas geradas e pagamentos. */
export function removerCartao(id: string): void {
  for (const compra of compras.value.filter((item) => item.cartaoId === id)) {
    removerCompra(compra.id)
  }
  cartoes.value = cartoes.value.filter((cartao) => cartao.id !== id)
  pagamentosFatura.value = pagamentosFatura.value.filter(
    (pagamento) => pagamento.cartaoId !== id,
  )
}

// ── Compras e parcelamento ──────────────────────────────────

/**
 * Divide o total em parcelas mensais iguais; a última absorve a
 * diferença de arredondamento (ex.: R$ 100 / 3 → 33,33 + 33,33 + 33,34).
 */
export function calcularParcelas(
  valorTotal: number,
  quantidade: number,
  dataCompra: string,
): { numero: number; valor: number; data: string }[] {
  const total = arredondar2(valorTotal)
  const parcelaBase = arredondar2(total / quantidade)
  const parcelas: { numero: number; valor: number; data: string }[] = []

  for (let numero = 1; numero <= quantidade; numero += 1) {
    const ultima = numero === quantidade
    const valor = ultima
      ? arredondar2(total - parcelaBase * (quantidade - 1))
      : parcelaBase
    parcelas.push({ numero, valor, data: avancarMeses(dataCompra, numero - 1) })
  }

  return parcelas
}

/** Registra a compra e gera um lançamento de despesa por parcela. */
export function adicionarCompra(dados: NovaCompra): CompraCartao | null {
  if (!obterCartao(dados.cartaoId)) return null
  if (dados.parcelas < 1) return null
  if (dados.valorTotal <= 0) return null

  const cartao = obterCartao(dados.cartaoId)
  const parcelas = calcularParcelas(dados.valorTotal, dados.parcelas, dados.dataCompra)

  const compra: CompraCartao = {
    ...dados,
    descricao: dados.descricao.trim(),
    valorTotal: arredondar2(dados.valorTotal),
    id: gerarId('compra'),
    lancamentosIds: [],
  }

  for (const parcela of parcelas) {
    const rotulo =
      parcela.numero === 1 && compra.parcelas === 1
        ? compra.descricao
        : `${compra.descricao} (${parcela.numero}/${compra.parcelas})`

    const lancamento = adicionarLancamento({
      descricao: rotulo,
      valor: parcela.valor,
      tipo: 'despesa',
      categoriaId: compra.categoriaId,
      data: parcela.data,
      cartaoId: compra.cartaoId,
      parcelaNumero: parcela.numero,
      parcelaTotal: compra.parcelas,
      observacao: cartao ? `Cartão ${cartao.nome}` : undefined,
    })
    compra.lancamentosIds.push(lancamento.id)
  }

  compras.value.push(compra)
  return compra
}

/** Atualiza descrição/categoria e propaga aos lançamentos das parcelas. */
export function atualizarCompra(
  id: string,
  dados: { descricao?: string; categoriaId?: string },
): void {
  const compra = compras.value.find((item) => item.id === id)
  if (!compra) return

  if (dados.descricao !== undefined) compra.descricao = dados.descricao.trim()
  if (dados.categoriaId !== undefined) compra.categoriaId = dados.categoriaId

  const cartao = obterCartao(compra.cartaoId)
  compra.lancamentosIds.forEach((lancamentoId, indice) => {
    const numero = indice + 1
    const rotulo =
      compra.parcelas === 1
        ? compra.descricao
        : `${compra.descricao} (${numero}/${compra.parcelas})`
    atualizarLancamento(lancamentoId, {
      descricao: rotulo,
      categoriaId: compra.categoriaId,
      observacao: cartao ? `Cartão ${cartao.nome}` : undefined,
    })
  })
}

/** Remove a compra e os lançamentos de suas parcelas. */
export function removerCompra(id: string): void {
  const compra = compras.value.find((item) => item.id === id)
  if (compra) {
    for (const lancamentoId of compra.lancamentosIds) removerLancamento(lancamentoId)
  }
  const indice = compras.value.findIndex((item) => item.id === id)
  if (indice !== -1) compras.value.splice(indice, 1)
}

export function listarCompras(cartaoId?: string): CompraCartao[] {
  const lista = cartaoId
    ? compras.value.filter((compra) => compra.cartaoId === cartaoId)
    : compras.value
  return [...lista].sort((a, b) => b.dataCompra.localeCompare(a.dataCompra))
}

// ── Faturas e pagamentos ────────────────────────────────────

export interface FaturaMes {
  mes: string
  total: number
  quantidadeParcelas: number
  pago: number
  quitada: boolean
}

/** Fatura de um mês: soma das parcelas lançadas naquele mês. */
export function faturaDoMes(
  cartaoId: string,
  mes: string,
  lancamentos: Lancamento[],
): FaturaMes {
  const parcelas = lancamentos.filter(
    (lancamento) =>
      lancamento.cartaoId === cartaoId &&
      lancamento.tipo === 'despesa' &&
      lancamento.data.startsWith(mes),
  )

  const total = arredondar2(
    parcelas.reduce((soma, lancamento) => soma + lancamento.valor, 0),
  )
  const pago = arredondar2(
    pagamentosFatura.value
      .filter(
        (pagamento) => pagamento.cartaoId === cartaoId && pagamento.mes === mes,
      )
      .reduce((soma, pagamento) => soma + pagamento.valor, 0),
  )

  return {
    mes,
    total,
    quantidadeParcelas: parcelas.length,
    pago,
    quitada: total > 0 && pago >= total,
  }
}

/** Meses (AAAA-MM) que possuem parcelas para o cartão, do atual ao futuro. */
export function mesesComParcelas(
  cartaoId: string,
  lancamentos: Lancamento[],
): string[] {
  const meses = new Set(
    lancamentos
      .filter((lancamento) => lancamento.cartaoId === cartaoId)
      .map((lancamento) => lancamento.data.slice(0, 7)),
  )
  return [...meses].sort()
}

/** Valor comprometido: parcelas com data a partir de hoje (inclusive). */
export function limiteComprometido(
  cartaoId: string,
  lancamentos: Lancamento[],
  hoje: string,
): number {
  return arredondar2(
    lancamentos
      .filter(
        (lancamento) =>
          lancamento.cartaoId === cartaoId &&
          lancamento.tipo === 'despesa' &&
          lancamento.data >= hoje,
      )
      .reduce((soma, lancamento) => soma + lancamento.valor, 0),
  )
}

export function registrarPagamentoFatura(
  dados: NovoPagamentoFatura,
): PagamentoFatura | null {
  if (!obterCartao(dados.cartaoId)) return null
  if (dados.valor <= 0) return null

  const pagamento: PagamentoFatura = {
    ...dados,
    valor: arredondar2(dados.valor),
    id: gerarId('pagamento'),
  }
  pagamentosFatura.value.push(pagamento)
  return pagamento
}

export function removerPagamentoFatura(id: string): void {
  const indice = pagamentosFatura.value.findIndex((item) => item.id === id)
  if (indice !== -1) pagamentosFatura.value.splice(indice, 1)
}

export function rotuloFatura(mes: string): string {
  return `Fatura de ${mes}`
}

export function usarCartoes() {
  return { cartoes, compras, pagamentosFatura }
}

// ── Persistência local opcional (com consentimento) ─────────
interface EstadoCartoes {
  cartoes: Cartao[]
  compras: CompraCartao[]
  pagamentosFatura: PagamentoFatura[]
}

function ehCartaoValido(dado: unknown): dado is Cartao {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Cartao>
  return (
    typeof item.id === 'string' &&
    typeof item.nome === 'string' &&
    typeof item.limite === 'number' &&
    typeof item.diaFechamento === 'number' &&
    typeof item.diaVencimento === 'number' &&
    typeof item.ativo === 'boolean'
  )
}

function ehCompraValida(dado: unknown): dado is CompraCartao {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<CompraCartao>
  return (
    typeof item.id === 'string' &&
    typeof item.cartaoId === 'string' &&
    typeof item.descricao === 'string' &&
    typeof item.valorTotal === 'number' &&
    typeof item.parcelas === 'number' &&
    typeof item.dataCompra === 'string' &&
    Array.isArray(item.lancamentosIds)
  )
}

function ehPagamentoValido(dado: unknown): dado is PagamentoFatura {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<PagamentoFatura>
  return (
    typeof item.id === 'string' &&
    typeof item.cartaoId === 'string' &&
    typeof item.mes === 'string' &&
    typeof item.valor === 'number' &&
    typeof item.data === 'string'
  )
}

registrarEstado({
  chave: 'cartoes',
  coletar: (): EstadoCartoes => ({
    cartoes: cartoes.value,
    compras: compras.value,
    pagamentosFatura: pagamentosFatura.value,
  }),
  aplicar: (dados) => {
    if (typeof dados !== 'object' || dados === null) return
    const estado = dados as Partial<EstadoCartoes>
    if (Array.isArray(estado.cartoes)) cartoes.value = estado.cartoes.filter(ehCartaoValido)
    if (Array.isArray(estado.compras)) compras.value = estado.compras.filter(ehCompraValida)
    if (Array.isArray(estado.pagamentosFatura)) {
      pagamentosFatura.value = estado.pagamentosFatura.filter(ehPagamentoValido)
    }
  },
  limpar: () => {
    cartoes.value = []
    compras.value = []
    pagamentosFatura.value = []
  },
})
