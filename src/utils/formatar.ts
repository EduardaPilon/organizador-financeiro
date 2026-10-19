/**
 * Funções puras de formatação usadas em toda a interface.
 * Não acessam rede, armazenamento nem dados sensíveis.
 */

/** Formata um valor em reais brasileiros (R$) para exibição. */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** Converte uma chave "AAAA-MM" em texto por extenso, ex.: "outubro de 2026". */
export function formatarMes(chave: string): string {
  const [ano, mes] = chave.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/** Mês curto para eixos de gráfico, ex.: "out/26". */
export function formatarMesCurto(chave: string): string {
  const [ano, mes] = chave.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

/**
 * Data local de hoje no formato ISO "AAAA-MM-DD".
 * Usa o fuso local para evitar o desvio de um dia que ocorre
 * com `toISOString()` depois das 21h no horário de Brasília.
 */
export function dataHoje(): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
