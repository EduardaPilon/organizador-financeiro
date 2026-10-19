import { beforeEach, describe, expect, it } from 'vitest'
import {
  adicionarMeta,
  adicionarOrcamento,
  atualizarMeta,
  metas,
  obterOrcamento,
  orcamentos,
  orcamentosDoMes,
  progressoMeta,
  removerMeta,
  removerOrcamento,
  situacaoOrcamento,
  type Orcamento,
} from './orcamentos'

beforeEach(() => {
  orcamentos.value = []
  metas.value = []
})

function orcamento(limite: number): Orcamento {
  return adicionarOrcamento({
    categoriaId: 'cat-mercado',
    mes: '2026-10',
    limite,
  })!
}

describe('adicionarOrcamento', () => {
  it('cria o orçamento da categoria no mês', () => {
    const criado = orcamento(600)

    expect(criado.limite).toBe(600)
    expect(obterOrcamento(criado.id)).toEqual(criado)
    expect(orcamentosDoMes('2026-10')).toHaveLength(1)
  })

  it('substitui o limite quando já existe orçamento para a categoria/mês', () => {
    const primeiro = orcamento(600)
    const segundo = orcamento(800)

    expect(segundo.id).toBe(primeiro.id)
    expect(orcamentos.value).toHaveLength(1)
    expect(orcamentos.value[0]?.limite).toBe(800)
  })

  it('permite a mesma categoria em meses diferentes', () => {
    orcamento(600)
    adicionarOrcamento({ categoriaId: 'cat-mercado', mes: '2026-11', limite: 700 })

    expect(orcamentos.value).toHaveLength(2)
  })
})

describe('situacaoOrcamento', () => {
  it('fica ok abaixo de 80%', () => {
    expect(situacaoOrcamento(orcamento(1000), 790)).toEqual({
      percentual: 79,
      situacao: 'ok',
    })
  })

  it('pede atenção a partir de 80%', () => {
    expect(situacaoOrcamento(orcamento(1000), 800)).toEqual({
      percentual: 80,
      situacao: 'atencao',
    })
  })

  it('marca estourado a partir de 100%', () => {
    expect(situacaoOrcamento(orcamento(1000), 1000)).toEqual({
      percentual: 100,
      situacao: 'estourado',
    })
    expect(situacaoOrcamento(orcamento(1000), 1500).situacao).toBe('estourado')
  })

  it('não divide por zero quando o limite é inválido', () => {
    expect(situacaoOrcamento({ id: 'x', categoriaId: 'c', mes: '2026-10', limite: 0 }, 100))
      .toEqual({ percentual: 0, situacao: 'ok' })
  })
})

describe('removerOrcamento', () => {
  it('remove pelo id', () => {
    const criado = orcamento(600)
    removerOrcamento(criado.id)
    expect(orcamentos.value).toEqual([])
  })
})

describe('metas', () => {
  it('cria a meta com valores arredondados', () => {
    const meta = adicionarMeta({
      nome: '  Reserva  ',
      valorAlvo: 10000,
      valorAtual: 2500.005,
    })

    expect(meta.nome).toBe('Reserva')
    expect(meta.valorAtual).toBe(2500.01)
    expect(metas.value).toHaveLength(1)
  })

  it('calcula o progresso em percentual', () => {
    const meta = adicionarMeta({ nome: 'Viagem', valorAlvo: 10000, valorAtual: 2500 })
    expect(progressoMeta(meta)).toBe(25)
  })

  it('passa de 100% quando a meta é superada', () => {
    const meta = adicionarMeta({ nome: 'Viagem', valorAlvo: 1000, valorAtual: 1500 })
    expect(progressoMeta(meta)).toBe(150)
  })

  it('devolve zero para alvo inválido', () => {
    expect(progressoMeta({ id: 'x', nome: 'n', valorAlvo: 0, valorAtual: 100 })).toBe(0)
  })

  it('atualiza o valor acumulado', () => {
    const meta = adicionarMeta({ nome: 'Reserva', valorAlvo: 1000, valorAtual: 0 })
    atualizarMeta(meta.id, { valorAtual: 300 })
    expect(meta.valorAtual).toBe(300)
    expect(progressoMeta(meta)).toBe(30)
  })

  it('remove a meta', () => {
    const meta = adicionarMeta({ nome: 'Reserva', valorAlvo: 1000, valorAtual: 0 })
    removerMeta(meta.id)
    expect(metas.value).toEqual([])
  })
})
