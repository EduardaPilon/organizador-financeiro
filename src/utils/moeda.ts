/**
 * Regras de valores monetários.
 *
 * - Valor financeiro é SEMPRE número (reais), nunca string formatada.
 * - Guardamos 2 casas (centavos) e somamos convertendo para centavos,
 *   evitando o erro clássico de ponto flutuante (0.1 + 0.2 !== 0.3).
 */

/** Arredonda para 2 casas (centavos) sem arrastar erro de float. */
export function arredondar2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/** Soma valores pela rota dos centavos e devolve em reais. */
export function somarEmCentavos(valores: number[]): number {
  const centavos = valores.reduce(
    (total, valor) => total + Math.round(valor * 100),
    0,
  )
  return centavos / 100
}

/**
 * Converte texto digitado em número, aceitando formato brasileiro e
 * americano: "1.234,56" → 1234.56 · "1234.56" → 1234.56 · "1,5" → 1.5.
 * Devolve `null` quando o texto não representa número válido.
 */
export function paraNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/R\$\s?/gi, '')
  if (!limpo) return null

  const temVirgula = limpo.includes(',')
  const temPonto = limpo.includes('.')

  let normalizado: string

  if (temVirgula && temPonto) {
    // Padrão brasileiro: ponto de milhar, vírgula decimal.
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    // Só vírgula → decimal ("1,5" ou "1,234").
    normalizado = limpo.replace(',', '.')
  } else if (temPonto) {
    // Só ponto: "1.234" (milhar) ou "1.5" (decimal).
    normalizado = /^\d{1,3}(\.\d{3})+$/.test(limpo)
      ? limpo.replace(/\./g, '')
      : limpo
  } else {
    normalizado = limpo
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null

  const valor = Number(normalizado)
  if (!Number.isFinite(valor)) return null

  return arredondar2(valor)
}

/** Texto inicial de um campo monetário já com 2 casas ("1234,56"). */
export function formatarParaEdicao(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
