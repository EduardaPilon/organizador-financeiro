import { beforeEach, describe, expect, it } from 'vitest'
import {
  adicionarBem,
  adicionarDivida,
  bens,
  dividas,
  parcelasRestantes,
  registrarPagamentoParcela,
  removerBem,
  removerDivida,
  totalBens,
  totalDividas,
} from './patrimonio'

beforeEach(() => {
  bens.value = []
  dividas.value = []
})

describe('bens', () => {
  it('cadastra o bem com valor arredondado e soma o total', () => {
    adicionarBem({
      nome: '  Apartamento  ',
      tipo: 'imovel',
      valorEstimado: 250000.005,
    })
    adicionarBem({ nome: 'Carro', tipo: 'veiculo', valorEstimado: 40000 })

    expect(bens.value[0]?.nome).toBe('Apartamento')
    expect(bens.value[0]?.valorEstimado).toBe(250000.01)
    expect(totalBens()).toBe(290000.01)
  })

  it('remove o bem pelo id', () => {
    const bem = adicionarBem({ nome: 'Bicicleta', tipo: 'equipamento', valorEstimado: 2000 })
    removerBem(bem.id)
    expect(bens.value).toEqual([])
    expect(totalBens()).toBe(0)
  })
})

describe('dívidas', () => {
  function divida() {
    return adicionarDivida({
      nome: 'Financiamento',
      tipo: 'financiamento',
      valorOriginal: 30000,
      saldoDevedor: 12000,
      parcelasTotal: 12,
      valorParcela: 1000,
    })
  }

  it('cadastra como passivo, com zero parcelas pagas', () => {
    const criada = divida()

    expect(criada.parcelasPagas).toBe(0)
    expect(totalDividas()).toBe(12000)
    expect(parcelasRestantes(criada)).toBe(12)
  })

  it('pagar parcela reduz o saldo devedor sem criar lançamento', () => {
    const criada = divida()

    registrarPagamentoParcela(criada.id)

    expect(criada.saldoDevedor).toBe(11000)
    expect(criada.parcelasPagas).toBe(1)
    expect(totalDividas()).toBe(11000)
  })

  it('não deixa o saldo ficar negativo nem passa do total de parcelas', () => {
    const criada = adicionarDivida({
      nome: 'Curta',
      tipo: 'emprestimo',
      valorOriginal: 500,
      saldoDevedor: 500,
      parcelasTotal: 1,
      valorParcela: 500,
    })

    registrarPagamentoParcela(criada.id)
    registrarPagamentoParcela(criada.id)

    expect(criada.saldoDevedor).toBe(0)
    expect(criada.parcelasPagas).toBe(1)
    expect(parcelasRestantes(criada)).toBe(0)
  })

  it('ignora id inexistente', () => {
    expect(() => registrarPagamentoParcela('fantasma')).not.toThrow()
  })

  it('remove a dívida pelo id', () => {
    const criada = divida()
    removerDivida(criada.id)
    expect(dividas.value).toEqual([])
    expect(totalDividas()).toBe(0)
  })
})
