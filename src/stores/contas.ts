import { ref } from 'vue'
import { registrarEstado } from './persistencia'
import type { Lancamento } from './lancamentos'
import { arredondar2 } from '@/utils/moeda'

/**
 * Contas financeiras (onde o dinheiro está) e transferências entre elas.
 *
 * Regra de contabilidade: transferência NÃO é receita nem despesa — é apenas
 * movimentação entre contas. O saldo de cada conta considera:
 *   saldo inicial + receitas da conta − despesas da conta
 *   + transferências recebidas − transferências enviadas.
 */

export type TipoConta = 'corrente' | 'poupanca' | 'digital' | 'dinheiro'

export const ROTULOS_TIPOS_CONTA: Record<TipoConta, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  digital: 'Conta digital',
  dinheiro: 'Dinheiro em espécie',
}

export interface Conta {
  id: string
  nome: string
  tipo: TipoConta
  /** Saldo antes de qualquer lançamento registrado no app. */
  saldoInicial: number
  ativa: boolean
  observacao?: string
}

export interface Transferencia {
  id: string
  contaOrigemId: string
  contaDestinoId: string
  valor: number
  data: string
  descricao?: string
}

export type NovaConta = Omit<Conta, 'id' | 'ativa'>
export type NovaTransferencia = Omit<Transferencia, 'id'>

export const contas = ref<Conta[]>([])
export const transferencias = ref<Transferencia[]>([])

let sequencia = 0
function gerarId(prefixo: string): string {
  sequencia += 1
  return `${prefixo}-${Date.now().toString(36)}-${sequencia}`
}

export function listarContas(opcoes: { incluirInativas?: boolean } = {}): Conta[] {
  return contas.value.filter(
    (conta) => opcoes.incluirInativas || conta.ativa,
  )
}

export function obterConta(id: string | undefined): Conta | undefined {
  if (!id) return undefined
  return contas.value.find((conta) => conta.id === id)
}

export function adicionarConta(dados: NovaConta): Conta {
  const conta: Conta = {
    ...dados,
    nome: dados.nome.trim(),
    saldoInicial: arredondar2(dados.saldoInicial),
    id: gerarId('conta'),
    ativa: true,
  }
  contas.value.push(conta)
  return conta
}

export function atualizarConta(
  id: string,
  dadosParciais: Partial<Omit<Conta, 'id'>>,
): void {
  const conta = obterConta(id)
  if (!conta) return
  Object.assign(conta, dadosParciais)
  if (dadosParciais.saldoInicial !== undefined) {
    conta.saldoInicial = arredondar2(dadosParciais.saldoInicial)
  }
  if (dadosParciais.nome !== undefined) conta.nome = dadosParciais.nome.trim()
}

export function alternarAtivaConta(id: string): void {
  const conta = obterConta(id)
  if (conta) conta.ativa = !conta.ativa
}

/** Remove a conta e as transferências que dependem dela. */
export function removerConta(id: string): void {
  const indice = contas.value.findIndex((conta) => conta.id === id)
  if (indice !== -1) contas.value.splice(indice, 1)
  transferencias.value = transferencias.value.filter(
    (transferencia) =>
      transferencia.contaOrigemId !== id && transferencia.contaDestinoId !== id,
  )
}

export function adicionarTransferencia(dados: NovaTransferencia): Transferencia | null {
  if (dados.contaOrigemId === dados.contaDestinoId) return null
  if (!obterConta(dados.contaOrigemId) || !obterConta(dados.contaDestinoId)) {
    return null
  }

  const transferencia: Transferencia = {
    ...dados,
    valor: arredondar2(dados.valor),
    id: gerarId('transf'),
  }
  transferencias.value.push(transferencia)
  return transferencia
}

export function removerTransferencia(id: string): void {
  const indice = transferencias.value.findIndex((item) => item.id === id)
  if (indice !== -1) transferencias.value.splice(indice, 1)
}

/**
 * Saldo atual de uma conta a partir dos lançamentos e transferências.
 * Transferências para si mesma não existem (bloqueadas na criação).
 */
export function calcularSaldoConta(
  contaId: string,
  lancamentos: Lancamento[],
  transferenciasAtuais: Transferencia[] = transferencias.value,
): number {
  const conta = obterConta(contaId)
  if (!conta) return 0

  let saldo = conta.saldoInicial

  for (const lancamento of lancamentos) {
    if (lancamento.contaId !== contaId) continue
    saldo += lancamento.tipo === 'receita' ? lancamento.valor : -lancamento.valor
  }

  for (const transferencia of transferenciasAtuais) {
    if (transferencia.contaOrigemId === contaId) saldo -= transferencia.valor
    if (transferencia.contaDestinoId === contaId) saldo += transferencia.valor
  }

  return arredondar2(saldo)
}

export function usarContas() {
  return { contas, transferencias }
}

// ── Persistência local opcional (com consentimento) ─────────
interface EstadoContas {
  contas: Conta[]
  transferencias: Transferencia[]
}

function ehContaValida(dado: unknown): dado is Conta {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Conta>
  return (
    typeof item.id === 'string' &&
    typeof item.nome === 'string' &&
    typeof item.tipo === 'string' &&
    typeof item.saldoInicial === 'number' &&
    typeof item.ativa === 'boolean'
  )
}

function ehTransferenciaValida(dado: unknown): dado is Transferencia {
  if (typeof dado !== 'object' || dado === null) return false
  const item = dado as Partial<Transferencia>
  return (
    typeof item.id === 'string' &&
    typeof item.contaOrigemId === 'string' &&
    typeof item.contaDestinoId === 'string' &&
    typeof item.valor === 'number' &&
    typeof item.data === 'string'
  )
}

registrarEstado({
  chave: 'contas',
  coletar: (): EstadoContas => ({
    contas: contas.value,
    transferencias: transferencias.value,
  }),
  aplicar: (dados) => {
    if (typeof dados !== 'object' || dados === null) return
    const estado = dados as Partial<EstadoContas>
    if (Array.isArray(estado.contas)) {
      contas.value = estado.contas.filter(ehContaValida)
    }
    if (Array.isArray(estado.transferencias)) {
      transferencias.value = estado.transferencias.filter(ehTransferenciaValida)
    }
  },
  limpar: () => {
    contas.value = []
    transferencias.value = []
  },
})
