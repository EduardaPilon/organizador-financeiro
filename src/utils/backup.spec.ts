import { beforeEach, describe, expect, it } from 'vitest'
import { adicionarLancamento, usarLancamentos } from '@/stores/lancamentos'
import { montarCopia, restaurarCopia, validarCopia } from './backup'

const { lancamentos, limparSessao } = usarLancamentos()

beforeEach(() => {
  limparSessao()
})

describe('validarCopia', () => {
  it('recusa arquivo de outro aplicativo', () => {
    expect(() => validarCopia({ app: 'outro-app', versao: 1, dados: {} })).toThrowError(
      'Este arquivo não é uma cópia de segurança deste aplicativo.',
    )
  })

  it('recusa versão incompatível', () => {
    expect(() =>
      validarCopia({ app: 'organizador-financeiro', versao: 9, dados: {} }),
    ).toThrowError('Cópia criada por uma versão incompatível (v9).')
  })

  it('recusa objeto sem dados', () => {
    expect(() =>
      validarCopia({ app: 'organizador-financeiro', versao: 1 }),
    ).toThrowError('A cópia não contém dados.')
  })

  it('recusa valor que não é objeto', () => {
    expect(() => validarCopia('nada')).toThrowError(
      'A cópia não contém um objeto válido.',
    )
  })

  it('aceita uma cópia válida e completa o emitidoEm', () => {
    const copia = validarCopia({
      app: 'organizador-financeiro',
      versao: 1,
      dados: { lancamentos: [] },
    })
    expect(copia.app).toBe('organizador-financeiro')
    expect(copia.emitidoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('montarCopia', () => {
  it('inclui o estado dos stores registrados', () => {
    adicionarLancamento({
      descricao: 'Aluguel',
      valor: 1800,
      tipo: 'despesa',
      categoriaId: 'cat-moradia',
      data: '2026-10-05',
    })

    const copia = montarCopia()
    expect(copia.app).toBe('organizador-financeiro')
    expect(copia.versao).toBe(1)
    expect(copia.dados).toHaveProperty('lancamentos')
    expect(copia.dados.lancamentos).toHaveLength(1)
  })
})

describe('restaurarCopia', () => {
  it('aplica as chaves conhecidas e ignora as desconhecidas', () => {
    const copia = validarCopia({
      app: 'organizador-financeiro',
      versao: 1,
      dados: {
        lancamentos: [
          {
            id: 1,
            descricao: 'Restaurado',
            valor: 10,
            tipo: 'despesa',
            categoriaId: 'cat-1',
            data: '2026-10-01',
          },
        ],
        modulo_que_nao_existe: { qualquer: 'coisa' },
      },
    })

    const resultado = restaurarCopia(copia)
    expect(resultado.aplicadas).toContain('lancamentos')
    expect(resultado.ignoradas).toEqual(['modulo_que_nao_existe'])
    expect(lancamentos.value).toHaveLength(1)
    expect(lancamentos.value[0]?.descricao).toBe('Restaurado')
  })

  it('descarta lançamentos com formato corrompido', () => {
    restaurarCopia(
      validarCopia({
        app: 'organizador-financeiro',
        versao: 1,
        dados: {
          lancamentos: [
            { id: 1, descricao: 'Ok', valor: 10, tipo: 'despesa', categoriaId: 'c', data: '2026-10-01' },
            { id: 'x', descricao: 'Inválido' },
          ],
        },
      }),
    )

    expect(lancamentos.value).toHaveLength(1)
    expect(lancamentos.value[0]?.descricao).toBe('Ok')
  })
})
