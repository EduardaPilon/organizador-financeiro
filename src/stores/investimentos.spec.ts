import { beforeEach, describe, expect, it } from 'vitest'
import {
  adicionarInvestimento,
  adicionarMovimentacao,
  alternarAtivoInvestimento,
  capitalAplicado,
  informarValorAtual,
  investimentos,
  listarInvestimentos,
  movimentacoes,
  movimentacoesDo,
  obterInvestimento,
  removerInvestimento,
  removerMovimentacao,
  rendimentoEstimado,
  totalInvestido,
} from './investimentos'

beforeEach(() => {
  investimentos.value = []
  movimentacoes.value = []
})

function criar(valorAtual = 0) {
  return adicionarInvestimento({
    nome: 'Tesouro Selic',
    tipo: 'renda_fixa',
    dataInicial: '2026-01-10',
    valorAtual,
  })
}

describe('adicionarInvestimento', () => {
  it('cria ativo, com nome aparado e atualizadoEm igual à data inicial', () => {
    const investimento = adicionarInvestimento({
      nome: '  CDB 110%  ',
      tipo: 'renda_fixa',
      dataInicial: '2026-03-05',
      valorAtual: 1000.555,
    })

    expect(investimento.nome).toBe('CDB 110%')
    expect(investimento.valorAtual).toBe(1000.56)
    expect(investimento.atualizadoEm).toBe('2026-03-05')
    expect(investimento.ativo).toBe(true)
    expect(obterInvestimento(investimento.id)).toEqual(investimento)
  })

  it('respeita o filtro de inativos', () => {
    const investimento = criar(100)
    alternarAtivoInvestimento(investimento.id)

    expect(listarInvestimentos()).toEqual([])
    expect(listarInvestimentos({ incluirInativos: true })).toHaveLength(1)
  })
})

describe('movimentações', () => {
  it('recusa movimentação de investimento inexistente ou valor inválido', () => {
    const investimento = criar(100)

    expect(
      adicionarMovimentacao({
        investimentoId: 'fantasma',
        tipo: 'aporte',
        valor: 50,
        data: '2026-02-01',
      }),
    ).toBeNull()
    expect(
      adicionarMovimentacao({
        investimentoId: investimento.id,
        tipo: 'aporte',
        valor: 0,
        data: '2026-02-01',
      }),
    ).toBeNull()
    expect(movimentacoes.value).toEqual([])
  })

  it('lista as movimentações de um investimento da mais recente para a mais antiga', () => {
    const investimento = criar(100)
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: 100,
      data: '2026-01-10',
    })
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: 200,
      data: '2026-05-10',
    })

    expect(movimentacoesDo(investimento.id).map((item) => item.data)).toEqual([
      '2026-05-10',
      '2026-01-10',
    ])
  })

  it('remove uma movimentação pelo id', () => {
    const investimento = criar(100)
    const movimentacao = adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: 100,
      data: '2026-01-10',
    })

    removerMovimentacao(movimentacao!.id)

    expect(movimentacoes.value).toEqual([])
  })
})

describe('capitalAplicado', () => {
  it('soma aportes e rendimentos informados', () => {
    const investimento = criar(1200)
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: 1000,
      data: '2026-01-10',
    })
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'rendimento',
      valor: 50,
      data: '2026-02-10',
    })

    expect(capitalAplicado(investimento.id)).toBe(1050)
  })

  it('subtrai resgates', () => {
    const investimento = criar(700)
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: 1000,
      data: '2026-01-10',
    })
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'resgate',
      valor: 300,
      data: '2026-03-10',
    })

    expect(capitalAplicado(investimento.id)).toBe(700)
  })

  it('ignora movimentações de outros investimentos', () => {
    const alvo = criar(100)
    const outro = criar(100)
    adicionarMovimentacao({
      investimentoId: outro.id,
      tipo: 'aporte',
      valor: 999,
      data: '2026-01-10',
    })

    expect(capitalAplicado(alvo.id)).toBe(0)
  })
})

describe('rendimentoEstimado', () => {
  it('é a diferença entre o valor informado e o capital aplicado', () => {
    const investimento = criar(1150)
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: 1000,
      data: '2026-01-10',
    })

    expect(rendimentoEstimado(investimento.id)).toBe(150)
  })

  it('fica negativo quando o valor informado caiu', () => {
    const investimento = criar(900)
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: 1000,
      data: '2026-01-10',
    })

    expect(rendimentoEstimado(investimento.id)).toBe(-100)
  })

  it('devolve zero para investimento inexistente', () => {
    expect(rendimentoEstimado('fantasma')).toBe(0)
  })
})

describe('totalInvestido', () => {
  it('soma apenas os investimentos ativos', () => {
    criar(1000)
    const inativo = criar(500)
    alternarAtivoInvestimento(inativo.id)

    expect(totalInvestido()).toBe(1000)
  })
})

describe('informarValorAtual', () => {
  it('atualiza o valor e a data da última informação', () => {
    const investimento = criar(1000)

    informarValorAtual(investimento.id, 1080.555, '2026-10-18')

    expect(investimento.valorAtual).toBe(1080.56)
    expect(investimento.atualizadoEm).toBe('2026-10-18')
  })
})

describe('removerInvestimento', () => {
  it('remove o investimento e suas movimentações', () => {
    const investimento = criar(100)
    adicionarMovimentacao({
      investimentoId: investimento.id,
      tipo: 'aporte',
      valor: 100,
      data: '2026-01-10',
    })

    removerInvestimento(investimento.id)

    expect(investimentos.value).toEqual([])
    expect(movimentacoes.value).toEqual([])
  })
})
