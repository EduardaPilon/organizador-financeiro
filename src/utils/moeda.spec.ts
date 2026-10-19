import { describe, expect, it } from 'vitest'
import {
  arredondar2,
  formatarParaEdicao,
  paraNumero,
  somarEmCentavos,
} from './moeda'

describe('arredondar2', () => {
  it('resolve o clássico erro de ponto flutuante', () => {
    expect(arredondar2(0.1 + 0.2)).toBe(0.3)
  })

  it('mantém valores já com duas casas', () => {
    expect(arredondar2(1234.56)).toBe(1234.56)
  })
})

describe('somarEmCentavos', () => {
  it('soma sem arrastar erro de float', () => {
    expect(somarEmCentavos([0.1, 0.2])).toBe(0.3)
  })

  it('soma lista vazia como zero', () => {
    expect(somarEmCentavos([])).toBe(0)
  })

  it('soma despesas negativas (usado no patrimônio líquido)', () => {
    expect(somarEmCentavos([100, -30.5])).toBe(69.5)
  })

  it('soma muitos valores de um centavo', () => {
    const valores = Array.from({ length: 100 }, () => 0.01)
    expect(somarEmCentavos(valores)).toBe(1)
  })
})

describe('paraNumero', () => {
  it('aceita o formato brasileiro completo', () => {
    expect(paraNumero('1.234,56')).toBe(1234.56)
  })

  it('aceita formato americano', () => {
    expect(paraNumero('1234.56')).toBe(1234.56)
  })

  it('aceita apenas vírgula como decimal', () => {
    expect(paraNumero('1,5')).toBe(1.5)
  })

  it('aceita o prefixo R$', () => {
    expect(paraNumero('R$ 1.234,56')).toBe(1234.56)
  })

  it('interpreta ponto de milhar isolado como milhar', () => {
    expect(paraNumero('1.234')).toBe(1234)
  })

  it('aceita valor negativo', () => {
    expect(paraNumero('-42,5')).toBe(-42.5)
  })

  it('devolve null para texto vazio', () => {
    expect(paraNumero('   ')).toBeNull()
  })

  it('devolve null para texto que não é número', () => {
    expect(paraNumero('abc')).toBeNull()
  })

  it('devolve null para notação não monetária', () => {
    expect(paraNumero('1.2.3')).toBeNull()
  })
})

describe('formatarParaEdicao', () => {
  it('mostra sempre duas casas', () => {
    expect(formatarParaEdicao(1234.5)).toBe('1.234,50')
  })
})
