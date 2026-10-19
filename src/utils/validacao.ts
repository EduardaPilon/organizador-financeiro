import { paraNumero } from './moeda'

/**
 * Validações dos formulários financeiros.
 * Devolvem a lista de mensagens de erro — vazia quando tudo está certo.
 * A mesma regra é aplicada em criação e edição (fonte única da regra).
 */

export interface DadosLancamentoForm {
  descricao: string
  valor: string
  categoriaId: string
  data: string
}

const LIMITE_TEXTO = 120

export function validarLancamento(dados: DadosLancamentoForm): string[] {
  const erros: string[] = []

  const descricao = dados.descricao.trim()
  if (!descricao) {
    erros.push('Informe uma descrição para o lançamento.')
  } else if (descricao.length > LIMITE_TEXTO) {
    erros.push(`A descrição pode ter no máximo ${LIMITE_TEXTO} caracteres.`)
  }

  const valor = paraNumero(dados.valor)
  if (valor === null) {
    erros.push('Informe um valor numérico válido (ex.: 250,50).')
  } else if (valor <= 0) {
    erros.push('O valor deve ser maior que zero.')
  } else if (valor > 999_999_999.99) {
    erros.push('O valor está acima do limite aceito.')
  }

  if (!dados.categoriaId) {
    erros.push('Selecione uma categoria.')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) {
    erros.push('Informe uma data válida.')
  } else {
    const [ano = 0, mes = 0, dia = 0] = dados.data.split('-').map(Number)
    const data = new Date(ano, mes - 1, dia)
    const valida =
      data.getFullYear() === ano &&
      data.getMonth() === mes - 1 &&
      data.getDate() === dia
    if (!valida) erros.push('A data informada não existe no calendário.')
  }

  return erros
}

export function validarTextoObrigatorio(
  valor: string,
  rotulo: string,
  limite = LIMITE_TEXTO,
): string[] {
  const texto = valor.trim()
  if (!texto) return [`Informe ${rotulo.toLowerCase()}.`]
  if (texto.length > limite) {
    return [`${rotulo} pode ter no máximo ${limite} caracteres.`]
  }
  return []
}
