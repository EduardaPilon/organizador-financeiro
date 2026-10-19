import { beforeEach, describe, expect, it } from 'vitest'
import type { Lancamento } from './lancamentos'
import {
  adicionarConta,
  adicionarTransferencia,
  alternarAtivaConta,
  calcularSaldoConta,
  contas,
  listarContas,
  obterConta,
  removerConta,
  transferencias,
} from './contas'

function lancamento(dados: Partial<Lancamento>): Lancamento {
  return {
    id: Math.random(),
    descricao: 'Lançamento',
    valor: 100,
    tipo: 'despesa',
    categoriaId: 'cat-1',
    data: '2026-10-18',
    ...dados,
  }
}

beforeEach(() => {
  contas.value = []
  transferencias.value = []
})

describe('adicionarConta', () => {
  it('cria a conta ativa, com nome aparado e saldo arredondado', () => {
    const conta = adicionarConta({
      nome: '  Nubank  ',
      tipo: 'digital',
      saldoInicial: 100.005,
    })

    expect(conta.nome).toBe('Nubank')
    expect(conta.ativa).toBe(true)
    expect(conta.saldoInicial).toBe(100.01)
    expect(obterConta(conta.id)).toEqual(conta)
  })

  it('lista apenas ativas por padrão', () => {
    const ativa = adicionarConta({ nome: 'Ativa', tipo: 'corrente', saldoInicial: 0 })
    const inativa = adicionarConta({ nome: 'Inativa', tipo: 'corrente', saldoInicial: 0 })
    alternarAtivaConta(inativa.id)

    expect(listarContas().map((conta) => conta.id)).toEqual([ativa.id])
    expect(listarContas({ incluirInativas: true })).toHaveLength(2)
  })
})

describe('calcularSaldoConta', () => {
  it('soma receitas e subtrai despesas da própria conta', () => {
    const conta = adicionarConta({ nome: 'Conta', tipo: 'corrente', saldoInicial: 1000 })
    const outra = adicionarConta({ nome: 'Outra', tipo: 'corrente', saldoInicial: 0 })

    const lancamentos = [
      lancamento({ contaId: conta.id, tipo: 'receita', valor: 500 }),
      lancamento({ contaId: conta.id, tipo: 'despesa', valor: 200.5 }),
      lancamento({ contaId: outra.id, tipo: 'despesa', valor: 999 }),
      lancamento({ tipo: 'despesa', valor: 50 }), // sem conta: ignorado
    ]

    expect(calcularSaldoConta(conta.id, lancamentos)).toBe(1299.5)
    expect(calcularSaldoConta(outra.id, lancamentos)).toBe(-999)
  })

  it('aplica transferências enviadas e recebidas', () => {
    const origem = adicionarConta({ nome: 'Origem', tipo: 'corrente', saldoInicial: 1000 })
    const destino = adicionarConta({ nome: 'Destino', tipo: 'poupanca', saldoInicial: 0 })

    adicionarTransferencia({
      contaOrigemId: origem.id,
      contaDestinoId: destino.id,
      valor: 300,
      data: '2026-10-18',
    })

    expect(calcularSaldoConta(origem.id, [])).toBe(700)
    expect(calcularSaldoConta(destino.id, [])).toBe(300)
  })

  it('devolve zero para conta inexistente', () => {
    expect(calcularSaldoConta('nao-existe', [])).toBe(0)
  })
})

describe('adicionarTransferencia', () => {
  it('recusa transferência para a mesma conta', () => {
    const conta = adicionarConta({ nome: 'Única', tipo: 'corrente', saldoInicial: 0 })
    expect(
      adicionarTransferencia({
        contaOrigemId: conta.id,
        contaDestinoId: conta.id,
        valor: 10,
        data: '2026-10-18',
      }),
    ).toBeNull()
  })

  it('recusa conta inexistente', () => {
    const conta = adicionarConta({ nome: 'Real', tipo: 'corrente', saldoInicial: 0 })
    expect(
      adicionarTransferencia({
        contaOrigemId: conta.id,
        contaDestinoId: 'fantasma',
        valor: 10,
        data: '2026-10-18',
      }),
    ).toBeNull()
  })
})

describe('removerConta', () => {
  it('remove a conta e as transferências que dependem dela', () => {
    const a = adicionarConta({ nome: 'A', tipo: 'corrente', saldoInicial: 0 })
    const b = adicionarConta({ nome: 'B', tipo: 'corrente', saldoInicial: 0 })
    adicionarTransferencia({
      contaOrigemId: a.id,
      contaDestinoId: b.id,
      valor: 10,
      data: '2026-10-18',
    })

    removerConta(b.id)

    expect(contas.value.map((conta) => conta.id)).toEqual([a.id])
    expect(transferencias.value).toEqual([])
  })
})
