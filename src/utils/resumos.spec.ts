import { describe, expect, it } from 'vitest'
import type { Lancamento } from '@/stores/lancamentos'
import { resumirPorMes, somarPorTipo } from './resumos'

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

describe('somarPorTipo', () => {
  const lista = [
    lancamento({ tipo: 'receita', valor: 1000 }),
    lancamento({ tipo: 'despesa', valor: 250.5 }),
    lancamento({ tipo: 'despesa', valor: 0.1 }),
  ]

  it('soma apenas as receitas', () => {
    expect(somarPorTipo(lista, 'receita')).toBe(1000)
  })

  it('soma apenas as despesas, sem erro de float', () => {
    expect(somarPorTipo(lista, 'despesa')).toBe(250.6)
  })

  it('devolve zero quando não há lançamentos do tipo', () => {
    expect(somarPorTipo([], 'receita')).toBe(0)
  })
})

describe('resumirPorMes', () => {
  it('agrupa por mês e calcula o resultado', () => {
    const lista = [
      lancamento({ data: '2026-09-10', tipo: 'receita', valor: 500 }),
      lancamento({ data: '2026-09-20', tipo: 'despesa', valor: 200 }),
      lancamento({ data: '2026-10-01', tipo: 'despesa', valor: 50 }),
    ]

    const resumos = resumirPorMes(lista)
    expect(resumos.map((resumo) => resumo.chave)).toEqual(['2026-10', '2026-09'])

    const setembro = resumos.find((resumo) => resumo.chave === '2026-09')
    expect(setembro).toMatchObject({
      quantidade: 2,
      receitas: 500,
      despesas: 200,
      resultado: 300,
    })

    const outubro = resumos.find((resumo) => resumo.chave === '2026-10')
    expect(outubro).toMatchObject({
      quantidade: 1,
      receitas: 0,
      despesas: 50,
      resultado: -50,
    })
  })

  it('devolve lista vazia sem lançamentos', () => {
    expect(resumirPorMes([])).toEqual([])
  })
})
