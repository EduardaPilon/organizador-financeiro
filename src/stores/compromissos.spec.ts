import { beforeEach, describe, expect, it } from 'vitest'
import { usarLancamentos } from './lancamentos'
import {
  adicionarCompromisso,
  atualizarCompromisso,
  compromissos,
  desmarcarPago,
  gerarProximaOcorrencia,
  listarCompromissos,
  marcarComoPago,
  obterCompromisso,
  removerCompromisso,
  situacaoCompromisso,
  type Compromisso,
} from './compromissos'

const { lancamentos, limparSessao } = usarLancamentos()

beforeEach(() => {
  limparSessao()
  compromissos.value = []
})

function criar(dados: Partial<Compromisso> = {}) {
  return adicionarCompromisso({
    descricao: 'Internet',
    valor: 120,
    tipo: 'a_pagar',
    vencimento: '2026-10-20',
    categoriaId: 'cat-casa',
    recorrenteMensal: false,
    ...dados,
  })
}

describe('adicionarCompromisso', () => {
  it('cria pendente, com nome aparado e valor arredondado', () => {
    const compromisso = criar({ descricao: '  Luz  ', valor: 100.005 })

    expect(compromisso.descricao).toBe('Luz')
    expect(compromisso.valor).toBe(100.01)
    expect(compromisso.status).toBe('pendente')
    expect(obterCompromisso(compromisso.id)).toEqual(compromisso)
  })

  it('ordena a listagem por vencimento', () => {
    criar({ vencimento: '2026-12-01' })
    criar({ vencimento: '2026-11-01' })

    expect(listarCompromissos().map((item) => item.vencimento)).toEqual([
      '2026-11-01',
      '2026-12-01',
    ])
  })
})

describe('situacaoCompromisso', () => {
  it('marca atrasado quando o vencimento já passou', () => {
    expect(situacaoCompromisso(criar({ vencimento: '2026-10-10' }), '2026-10-18')).toBe(
      'atrasado',
    )
  })

  it('marca vence_breve nos próximos 5 dias', () => {
    expect(situacaoCompromisso(criar({ vencimento: '2026-10-22' }), '2026-10-18')).toBe(
      'vence_breve',
    )
  })

  it('marca pendente quando falta mais de 5 dias', () => {
    expect(situacaoCompromisso(criar({ vencimento: '2026-11-20' }), '2026-10-18')).toBe(
      'pendente',
    )
  })

  it('marca pago independentemente da data', () => {
    const compromisso = criar({ vencimento: '2026-10-10' })
    compromisso.status = 'pago'
    expect(situacaoCompromisso(compromisso, '2026-10-18')).toBe('pago')
  })
})

describe('marcarComoPago', () => {
  it('cria uma despesa na data de vencimento para contas a pagar', () => {
    const compromisso = criar({ tipo: 'a_pagar', vencimento: '2026-10-20' })

    marcarComoPago(compromisso.id)

    expect(compromisso.status).toBe('pago')
    expect(compromisso.lancamentoId).toBeTypeOf('number')
    expect(lancamentos.value).toHaveLength(1)
    expect(lancamentos.value[0]).toMatchObject({
      descricao: 'Internet',
      valor: 120,
      tipo: 'despesa',
      categoriaId: 'cat-casa',
      data: '2026-10-20',
    })
  })

  it('cria uma receita para contas a receber', () => {
    const compromisso = criar({ tipo: 'a_receber' })

    marcarComoPago(compromisso.id)

    expect(lancamentos.value[0]?.tipo).toBe('receita')
  })

  it('não faz nada se já estiver pago (não duplica lançamento)', () => {
    const compromisso = criar()
    marcarComoPago(compromisso.id)
    marcarComoPago(compromisso.id)

    expect(lancamentos.value).toHaveLength(1)
  })
})

describe('desmarcarPago', () => {
  it('volta para pendente e remove o lançamento criado', () => {
    const compromisso = criar()
    marcarComoPago(compromisso.id)

    desmarcarPago(compromisso.id)

    expect(compromisso.status).toBe('pendente')
    expect(compromisso.lancamentoId).toBeUndefined()
    expect(lancamentos.value).toEqual([])
  })
})

describe('removerCompromisso', () => {
  it('remove o lançamento vinculado junto', () => {
    const compromisso = criar()
    marcarComoPago(compromisso.id)

    removerCompromisso(compromisso.id)

    expect(compromissos.value).toEqual([])
    expect(lancamentos.value).toEqual([])
  })
})

describe('gerarProximaOcorrencia', () => {
  it('cria a ocorrência do mês seguinte para recorrentes', () => {
    const compromisso = criar({ recorrenteMensal: true, vencimento: '2026-10-20' })

    const proxima = gerarProximaOcorrencia(compromisso.id)

    expect(proxima).not.toBeNull()
    expect(proxima?.vencimento).toBe('2026-11-20')
    expect(proxima?.status).toBe('pendente')
    expect(proxima?.recorrenteMensal).toBe(true)
    expect(compromissos.value).toHaveLength(2)
  })

  it('ajusta meses curtos (31/01 → 28/02)', () => {
    const compromisso = criar({ recorrenteMensal: true, vencimento: '2026-01-31' })
    expect(gerarProximaOcorrencia(compromisso.id)?.vencimento).toBe('2026-02-28')
  })

  it('devolve null quando o compromisso não é recorrente', () => {
    const compromisso = criar({ recorrenteMensal: false })
    expect(gerarProximaOcorrencia(compromisso.id)).toBeNull()
    expect(compromissos.value).toHaveLength(1)
  })
})

describe('atualizarCompromisso', () => {
  it('aplica os campos informados e reajusta o valor', () => {
    const compromisso = criar()

    atualizarCompromisso(compromisso.id, { descricao: '  Internet fibra ', valor: 150.559 })

    expect(compromisso.descricao).toBe('Internet fibra')
    expect(compromisso.valor).toBe(150.56)
  })
})
