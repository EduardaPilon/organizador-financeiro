import { describe, expect, it } from 'vitest'
import { validarLancamento, validarTextoObrigatorio } from './validacao'

describe('validarLancamento', () => {
  const valido = {
    descricao: 'Mercado do mês',
    valor: '250,50',
    categoriaId: 'cat-1',
    data: '2026-10-18',
  }

  it('aceita um lançamento completo', () => {
    expect(validarLancamento(valido)).toEqual([])
  })

  it('exige descrição', () => {
    const erros = validarLancamento({ ...valido, descricao: '   ' })
    expect(erros).toContain('Informe uma descrição para o lançamento.')
  })

  it('exige valor numérico', () => {
    const erros = validarLancamento({ ...valido, valor: 'abc' })
    expect(erros).toContain('Informe um valor numérico válido (ex.: 250,50).')
  })

  it('recusa valor zero ou negativo', () => {
    expect(validarLancamento({ ...valido, valor: '0' })).toContain(
      'O valor deve ser maior que zero.',
    )
  })

  it('exige categoria', () => {
    const erros = validarLancamento({ ...valido, categoriaId: '' })
    expect(erros).toContain('Selecione uma categoria.')
  })

  it('recusa data em formato diferente de ISO', () => {
    const erros = validarLancamento({ ...valido, data: '18/10/2026' })
    expect(erros).toContain('Informe uma data válida.')
  })

  it('recusa data que não existe no calendário', () => {
    const erros = validarLancamento({ ...valido, data: '2026-02-30' })
    expect(erros).toContain('A data informada não existe no calendário.')
  })
})

describe('validarTextoObrigatorio', () => {
  it('aceita texto preenchido', () => {
    expect(validarTextoObrigatorio('Cartão Nubank', 'O nome do cartão')).toEqual([])
  })

  it('acusa texto vazio com o rótulo em minúsculas', () => {
    expect(validarTextoObrigatorio('   ', 'O nome do cartão')).toEqual([
      'Informe o nome do cartão.',
    ])
  })

  it('respeita o limite de caracteres', () => {
    const erros = validarTextoObrigatorio('a'.repeat(11), 'O nome', 10)
    expect(erros).toEqual(['O nome pode ter no máximo 10 caracteres.'])
  })
})
