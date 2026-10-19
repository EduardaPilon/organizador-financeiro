import { beforeEach, describe, expect, it } from 'vitest'
import {
  adicionarLancamento,
  atualizarLancamento,
  removerLancamento,
  usarLancamentos,
} from './lancamentos'

const { lancamentos, limparSessao } = usarLancamentos()

beforeEach(() => {
  limparSessao()
})

describe('adicionarLancamento', () => {
  it('cria o lançamento com id e devolve o objeto criado', () => {
    const lancamento = adicionarLancamento({
      descricao: 'Freelance',
      valor: 800,
      tipo: 'receita',
      categoriaId: 'cat-extra',
      data: '2026-10-18',
    })

    expect(lancamento.id).toBeTypeOf('number')
    expect(lancamentos.value).toEqual([lancamento])
  })

  it('aceita os campos dos módulos de conta e cartão', () => {
    const lancamento = adicionarLancamento({
      descricao: 'Notebook (2/6)',
      valor: 500,
      tipo: 'despesa',
      categoriaId: 'cat-eletronicos',
      data: '2026-11-10',
      contaId: 'conta-1',
      cartaoId: 'cartao-1',
      parcelaNumero: 2,
      parcelaTotal: 6,
    })

    expect(lancamento.cartaoId).toBe('cartao-1')
    expect(lancamento.parcelaNumero).toBe(2)
    expect(lancamento.parcelaTotal).toBe(6)
  })

  it('acumula lançamentos na lista', () => {
    adicionarLancamento({
      descricao: 'A',
      valor: 1,
      tipo: 'despesa',
      categoriaId: 'c',
      data: '2026-10-01',
    })
    adicionarLancamento({
      descricao: 'B',
      valor: 2,
      tipo: 'despesa',
      categoriaId: 'c',
      data: '2026-10-02',
    })

    expect(lancamentos.value).toHaveLength(2)
  })
})

describe('atualizarLancamento', () => {
  it('altera apenas os campos informados', () => {
    const lancamento = adicionarLancamento({
      descricao: 'Antes',
      valor: 10,
      tipo: 'despesa',
      categoriaId: 'c',
      data: '2026-10-01',
    })

    atualizarLancamento(lancamento.id, { descricao: 'Depois', valor: 20 })

    expect(lancamentos.value[0]).toMatchObject({
      descricao: 'Depois',
      valor: 20,
      tipo: 'despesa',
      categoriaId: 'c',
    })
  })

  it('ignora id inexistente sem quebrar', () => {
    expect(() => atualizarLancamento(999, { descricao: 'Nada' })).not.toThrow()
  })
})

describe('removerLancamento', () => {
  it('remove pelo id', () => {
    const primeira = adicionarLancamento({
      descricao: 'Fica',
      valor: 1,
      tipo: 'receita',
      categoriaId: 'c',
      data: '2026-10-01',
    })
    const segunda = adicionarLancamento({
      descricao: 'Sai',
      valor: 2,
      tipo: 'receita',
      categoriaId: 'c',
      data: '2026-10-02',
    })

    removerLancamento(segunda.id)

    expect(lancamentos.value).toEqual([primeira])
  })

  it('ignora id inexistente', () => {
    expect(() => removerLancamento(123)).not.toThrow()
  })
})

describe('limparSessao', () => {
  it('zera a lista em memória', () => {
    adicionarLancamento({
      descricao: 'Some',
      valor: 1,
      tipo: 'receita',
      categoriaId: 'c',
      data: '2026-10-01',
    })

    limparSessao()

    expect(lancamentos.value).toEqual([])
  })
})
