import { describe, expect, it } from 'vitest'
import {
  converterLinhas,
  detectarMapeamento,
  paraDataCelula,
  paraTipoCelula,
  paraValorCelula,
  type Mapeamento,
} from './importarPlanilha'

describe('detectarMapeamento', () => {
  it('reconhece os cabeçalhos usuais', () => {
    expect(detectarMapeamento(['Data', 'Histórico', 'Valor', 'Tipo', 'Categoria'])).toEqual({
      data: 'Data',
      descricao: 'Histórico',
      valor: 'Valor',
      tipo: 'Tipo',
      categoria: 'Categoria',
    })
  })

  it('não reaproveita a mesma coluna em dois campos', () => {
    const mapa = detectarMapeamento(['Data', 'Valor'])
    expect(mapa.data).toBe('Data')
    expect(mapa.valor).toBe('Valor')
    expect(mapa.descricao).toBeNull()
  })

  it('devolve tudo nulo quando os cabeçalhos não ajudam', () => {
    expect(detectarMapeamento(['A', 'B', 'C'])).toEqual({
      data: null,
      descricao: null,
      valor: null,
      tipo: null,
      categoria: null,
    })
  })
})

describe('paraDataCelula', () => {
  it('aceita data ISO', () => {
    expect(paraDataCelula('2026-10-18')).toBe('2026-10-18')
  })

  it('aceita date object', () => {
    expect(paraDataCelula(new Date(2026, 9, 18))).toBe('2026-10-18')
  })

  it('aceita o formato brasileiro dd/mm/aaaa', () => {
    expect(paraDataCelula('18/10/2026')).toBe('2026-10-18')
    expect(paraDataCelula('18-10-2026')).toBe('2026-10-18')
  })

  it('aceita formato americano quando o brasileiro seria impossível', () => {
    expect(paraDataCelula('04/13/2026')).toBe('2026-04-13')
  })

  it('aceita o número serial da planilha', () => {
    expect(paraDataCelula(45000)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('recusa datas inválidas', () => {
    expect(paraDataCelula('2026-02-30')).toBeNull()
    expect(paraDataCelula('nem data')).toBeNull()
    expect(paraDataCelula(null)).toBeNull()
  })
})

describe('paraValorCelula', () => {
  it('aceita número direto', () => {
    expect(paraValorCelula(1234.56)).toBe(1234.56)
  })

  it('devolve o valor absoluto de número negativo', () => {
    expect(paraValorCelula(-50)).toBe(50)
  })

  it('aceita valores com R$ e milhar', () => {
    expect(paraValorCelula('R$ 1.234,56')).toBe(1234.56)
  })

  it('aceita parênteses como valor negativo', () => {
    expect(paraValorCelula('(1.234,56)')).toBe(1234.56)
  })

  it('recusa texto sem valor', () => {
    expect(paraValorCelula('')).toBeNull()
    expect(paraValorCelula('sem valor')).toBeNull()
  })
})

describe('paraTipoCelula', () => {
  it('reconhece receitas', () => {
    expect(paraTipoCelula('Crédito')).toBe('receita')
    expect(paraTipoCelula('entrada')).toBe('receita')
  })

  it('reconhece despesas', () => {
    expect(paraTipoCelula('Débito')).toBe('despesa')
    expect(paraTipoCelula('pagamento')).toBe('despesa')
  })

  it('devolve null quando não reconhece', () => {
    expect(paraTipoCelula('sei lá')).toBeNull()
    expect(paraTipoCelula(42)).toBeNull()
  })
})

describe('converterLinhas', () => {
  const mapeamento: Mapeamento = {
    data: 'Data',
    descricao: 'Histórico',
    valor: 'Valor',
    tipo: null,
    categoria: 'Categoria',
  }

  it('converte linhas válidas', () => {
    const { convertidos, erros } = converterLinhas(
      [
        {
          Data: '18/10/2026',
          Histórico: 'Salário',
          Valor: 5000,
          Categoria: 'Receitas',
        },
      ],
      mapeamento,
    )

    expect(erros).toEqual([])
    expect(convertidos).toEqual([
      {
        numeroLinha: 2,
        descricao: 'Salário',
        valor: 5000,
        tipo: 'receita',
        data: '2026-10-18',
        categoriaNome: 'Receitas',
      },
    ])
  })

  it('usa valor negativo como despesa quando não há coluna de tipo', () => {
    const { convertidos } = converterLinhas(
      [{ Data: '2026-10-18', Histórico: 'Mercado', Valor: -120.5 }],
      mapeamento,
    )
    expect(convertidos[0]).toMatchObject({ tipo: 'despesa', valor: 120.5 })
  })

  it('a coluna de tipo tem prioridade sobre o sinal', () => {
    const { convertidos } = converterLinhas(
      [{ Data: '2026-10-18', Histórico: 'Estorno', Valor: -30, Tipo: 'crédito' }],
      { ...mapeamento, tipo: 'Tipo' },
    )
    expect(convertidos[0]).toMatchObject({ tipo: 'receita', valor: 30 })
  })

  it('acumula os erros sem interromper as outras linhas', () => {
    const { convertidos, erros } = converterLinhas(
      [
        { Data: '', Histórico: 'Sem data', Valor: 10 },
        { Data: '2026-10-18', Histórico: '', Valor: 10 },
        { Data: '2026-10-18', Histórico: 'Ok', Valor: '0' },
        { Data: '2026-10-19', Histórico: 'Ok', Valor: 25 },
      ],
      mapeamento,
    )

    expect(convertidos).toHaveLength(1)
    expect(convertidos[0]?.descricao).toBe('Ok')
    expect(erros.map((erro) => erro.motivo)).toEqual([
      'Data vazia ou inválida.',
      'Descrição vazia.',
      'Valor vazio ou inválido.',
    ])
    expect(erros.map((erro) => erro.numeroLinha)).toEqual([2, 3, 4])
  })

  it('exige as três colunas essenciais', () => {
    expect(() =>
      converterLinhas([], { ...mapeamento, data: null }),
    ).toThrowError('Mapeie as colunas de data, descrição e valor para continuar.')
  })
})
