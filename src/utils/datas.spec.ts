import { describe, expect, it } from 'vitest'
import { avancarMeses, diasAte, formatarDataBR, mesDe } from './datas'

describe('formatarDataBR', () => {
  it('converte ISO em dd/mm/aaaa', () => {
    expect(formatarDataBR('2026-10-18')).toBe('18/10/2026')
  })

  it('devolve o próprio texto quando não é ISO válido', () => {
    expect(formatarDataBR('ontem')).toBe('ontem')
  })
})

describe('avancarMeses', () => {
  it('avança um mês preservando o dia', () => {
    expect(avancarMeses('2026-10-15', 1)).toBe('2026-11-15')
  })

  it('ajusta para o último dia de meses curtos', () => {
    expect(avancarMeses('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('respeita ano bissexto', () => {
    expect(avancarMeses('2024-01-31', 1)).toBe('2024-02-29')
  })

  it('vira o ano corretamente', () => {
    expect(avancarMeses('2026-12-15', 1)).toBe('2027-01-15')
  })

  it('volta meses com número negativo', () => {
    expect(avancarMeses('2026-03-10', -2)).toBe('2026-01-10')
  })

  it('sem avanço devolve a mesma data', () => {
    expect(avancarMeses('2026-06-05', 0)).toBe('2026-06-05')
  })
})

describe('diasAte', () => {
  it('conta dias no futuro', () => {
    expect(diasAte('2026-10-20', '2026-10-18')).toBe(2)
  })

  it('conta dias no passado como negativos', () => {
    expect(diasAte('2026-10-10', '2026-10-18')).toBe(-8)
  })

  it('o próprio dia é zero', () => {
    expect(diasAte('2026-10-18', '2026-10-18')).toBe(0)
  })
})

describe('mesDe', () => {
  it('extrai a chave AAAA-MM', () => {
    expect(mesDe('2026-10-18')).toBe('2026-10')
  })
})
