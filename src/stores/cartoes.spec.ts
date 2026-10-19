import { beforeEach, describe, expect, it } from 'vitest'
import { usarLancamentos, type Lancamento } from './lancamentos'
import {
  adicionarCartao,
  adicionarCompra,
  alternarAtivoCartao,
  calcularParcelas,
  cartoes,
  compras,
  faturaDoMes,
  limiteComprometido,
  listarCartoes,
  listarCompras,
  mesesComParcelas,
  obterCartao,
  pagamentosFatura,
  registrarPagamentoFatura,
  removerCartao,
  removerCompra,
  removerPagamentoFatura,
} from './cartoes'

const { lancamentos, limparSessao } = usarLancamentos()

function cartaoDeTeste(nome = 'Cartão principal') {
  return adicionarCartao({
    nome,
    limite: 5000,
    diaFechamento: 10,
    diaVencimento: 17,
  })
}

function doCartao(cartaoId: string): Lancamento[] {
  return lancamentos.value.filter((lancamento) => lancamento.cartaoId === cartaoId)
}

beforeEach(() => {
  limparSessao()
  cartoes.value = []
  compras.value = []
  pagamentosFatura.value = []
})

describe('adicionarCartao', () => {
  it('cria o cartão ativo com nome aparado', () => {
    const cartao = adicionarCartao({
      nome: '  Visa  ',
      bandeira: 'Visa',
      limite: 2000,
      diaFechamento: 5,
      diaVencimento: 12,
    })

    expect(cartao.nome).toBe('Visa')
    expect(cartao.ativo).toBe(true)
    expect(obterCartao(cartao.id)).toEqual(cartao)
  })

  it('respeita o filtro de inativos', () => {
    const cartao = cartaoDeTeste()
    alternarAtivoCartao(cartao.id)
    expect(listarCartoes()).toEqual([])
    expect(listarCartoes({ incluirInativos: true })).toHaveLength(1)
  })
})

describe('calcularParcelas', () => {
  it('divide igualmente e ajusta a última parcela', () => {
    const parcelas = calcularParcelas(100, 3, '2026-01-15')

    expect(parcelas.map((parcela) => parcela.valor)).toEqual([33.33, 33.33, 33.34])
    expect(parcelas.map((parcela) => parcela.data)).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
    ])
    expect(parcelas.map((parcela) => parcela.numero)).toEqual([1, 2, 3])
  })

  it('soma sempre exatamente o total', () => {
    const parcelas = calcularParcelas(1000, 7, '2026-05-31')
    const soma = parcelas.reduce((total, parcela) => total + parcela.valor, 0)
    expect(Math.round(soma * 100) / 100).toBe(1000)
  })

  it('ajusta o dia em meses curtos', () => {
    const parcelas = calcularParcelas(10, 2, '2026-01-31')
    expect(parcelas[1]?.data).toBe('2026-02-28')
  })
})

describe('adicionarCompra', () => {
  it('gera uma despesa por parcela, com cartão e numeração', () => {
    const cartao = cartaoDeTeste()
    const compra = adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Notebook',
      valorTotal: 3000,
      parcelas: 3,
      dataCompra: '2026-10-05',
      categoriaId: 'cat-eletronicos',
    })

    expect(compra).not.toBeNull()
    const gerados = doCartao(cartao.id)
    expect(gerados).toHaveLength(3)
    expect(gerados.every((item) => item.tipo === 'despesa')).toBe(true)
    expect(gerados.map((item) => item.descricao)).toEqual([
      'Notebook (1/3)',
      'Notebook (2/3)',
      'Notebook (3/3)',
    ])
    expect(gerados.map((item) => item.data)).toEqual([
      '2026-10-05',
      '2026-11-05',
      '2026-12-05',
    ])
    expect(compra?.lancamentosIds).toEqual(gerados.map((item) => item.id))
    expect(gerados.map((item) => item.valor)).toEqual([1000, 1000, 1000])
  })

  it('não numera a descrição quando é à vista', () => {
    const cartao = cartaoDeTeste()
    adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Farmácia',
      valorTotal: 80,
      parcelas: 1,
      dataCompra: '2026-10-05',
      categoriaId: 'cat-saude',
    })

    expect(doCartao(cartao.id)[0]?.descricao).toBe('Farmácia')
  })

  it('recusa compra sem cartão existente, com parcelas ou valor inválidos', () => {
    const cartao = cartaoDeTeste()
    const base = {
      cartaoId: cartao.id,
      descricao: 'Teste',
      valorTotal: 100,
      parcelas: 2,
      dataCompra: '2026-10-05',
      categoriaId: 'c',
    }

    expect(adicionarCompra({ ...base, cartaoId: 'inexistente' })).toBeNull()
    expect(adicionarCompra({ ...base, parcelas: 0 })).toBeNull()
    expect(adicionarCompra({ ...base, valorTotal: 0 })).toBeNull()
    expect(lancamentos.value).toEqual([])
  })

  it('lista compras da mais recente para a mais antiga', () => {
    const cartao = cartaoDeTeste()
    adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Antiga',
      valorTotal: 10,
      parcelas: 1,
      dataCompra: '2026-01-10',
      categoriaId: 'c',
    })
    adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Nova',
      valorTotal: 10,
      parcelas: 1,
      dataCompra: '2026-05-10',
      categoriaId: 'c',
    })

    expect(listarCompras().map((compra) => compra.descricao)).toEqual(['Nova', 'Antiga'])
  })
})

describe('removerCompra', () => {
  it('remove também os lançamentos das parcelas', () => {
    const cartao = cartaoDeTeste()
    const compra = adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Parcelada',
      valorTotal: 300,
      parcelas: 3,
      dataCompra: '2026-10-05',
      categoriaId: 'c',
    })

    removerCompra(compra!.id)

    expect(compras.value).toEqual([])
    expect(doCartao(cartao.id)).toEqual([])
  })

  it('remover o cartão remove compras e pagamentos', () => {
    const cartao = cartaoDeTeste()
    adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Compra',
      valorTotal: 100,
      parcelas: 1,
      dataCompra: '2026-10-05',
      categoriaId: 'c',
    })
    registrarPagamentoFatura({
      cartaoId: cartao.id,
      mes: '2026-10',
      valor: 100,
      data: '2026-10-17',
    })

    removerCartao(cartao.id)

    expect(cartoes.value).toEqual([])
    expect(compras.value).toEqual([])
    expect(pagamentosFatura.value).toEqual([])
    expect(lancamentos.value).toEqual([])
  })
})

describe('faturaDoMes', () => {
  it('soma as parcelas do mês e considera pagamentos', () => {
    const cartao = cartaoDeTeste()
    adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Compra longa',
      valorTotal: 600,
      parcelas: 3,
      dataCompra: '2026-10-05',
      categoriaId: 'c',
    })

    const fatura = faturaDoMes(cartao.id, '2026-10', lancamentos.value)
    expect(fatura.total).toBe(200)
    expect(fatura.quantidadeParcelas).toBe(1)
    expect(fatura.pago).toBe(0)
    expect(fatura.quitada).toBe(false)

    registrarPagamentoFatura({
      cartaoId: cartao.id,
      mes: '2026-10',
      valor: 200,
      data: '2026-10-17',
    })

    const faturaPaga = faturaDoMes(cartao.id, '2026-10', lancamentos.value)
    expect(faturaPaga.pago).toBe(200)
    expect(faturaPaga.quitada).toBe(true)
  })

  it('não marca como quitada uma fatura vazia', () => {
    const cartao = cartaoDeTeste()
    const fatura = faturaDoMes(cartao.id, '2026-02', lancamentos.value)
    expect(fatura.total).toBe(0)
    expect(fatura.quitada).toBe(false)
  })

  it('lista os meses com parcelas em ordem', () => {
    const cartao = cartaoDeTeste()
    adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Parcelada',
      valorTotal: 300,
      parcelas: 3,
      dataCompra: '2026-10-05',
      categoriaId: 'c',
    })

    expect(mesesComParcelas(cartao.id, lancamentos.value)).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
    ])
  })
})

describe('limiteComprometido', () => {
  it('considera apenas as parcelas com vencimento a partir de hoje', () => {
    const cartao = cartaoDeTeste()
    adicionarCompra({
      cartaoId: cartao.id,
      descricao: 'Compra',
      valorTotal: 300,
      parcelas: 3,
      dataCompra: '2026-01-05',
      categoriaId: 'c',
    })

    // Parcelas: jan (paga/passada), fev e mar ainda por vencer.
    expect(limiteComprometido(cartao.id, lancamentos.value, '2026-02-01')).toBe(200)
    expect(limiteComprometido(cartao.id, lancamentos.value, '2027-01-01')).toBe(0)
  })
})

describe('registrarPagamentoFatura', () => {
  it('recusa valor inválido e cartão inexistente', () => {
    const cartao = cartaoDeTeste()
    expect(
      registrarPagamentoFatura({
        cartaoId: cartao.id,
        mes: '2026-10',
        valor: 0,
        data: '2026-10-17',
      }),
    ).toBeNull()
    expect(
      registrarPagamentoFatura({
        cartaoId: 'inexistente',
        mes: '2026-10',
        valor: 10,
        data: '2026-10-17',
      }),
    ).toBeNull()
  })

  it('não cria lançamento nenhum (é só quitação)', () => {
    const cartao = cartaoDeTeste()
    registrarPagamentoFatura({
      cartaoId: cartao.id,
      mes: '2026-10',
      valor: 250,
      data: '2026-10-17',
    })

    expect(lancamentos.value).toEqual([])
    expect(pagamentosFatura.value).toHaveLength(1)

    removerPagamentoFatura(pagamentosFatura.value[0]!.id)
    expect(pagamentosFatura.value).toEqual([])
  })
})
