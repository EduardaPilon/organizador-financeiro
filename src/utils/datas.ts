import { dataHoje } from './formatar'

/**
 * Utilitários de data usados pelos módulos financeiros.
 * Todas as datas circulam no formato ISO "AAAA-MM-DD" (fuso local).
 */

/** "2026-10-18" → "18/10/2026". */
export function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

/**
 * Avança meses preservando o dia (com ajuste para meses curtos):
 * 31/01 + 1 mês → 28/02 (ou 29 em ano bissexto).
 */
export function avancarMeses(iso: string, meses: number): string {
  const [anoTexto, mesTexto, diaTexto] = iso.split('-')
  const ano = Number(anoTexto)
  const mes = Number(mesTexto)
  const dia = Number(diaTexto)
  if (!ano || !mes || !dia) return iso

  const destino = new Date(ano, mes - 1 + meses, 1)
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  const diaAjustado = Math.min(dia, ultimoDia)

  const anoFinal = destino.getFullYear()
  const mesFinal = String(destino.getMonth() + 1).padStart(2, '0')
  return `${anoFinal}-${mesFinal}-${String(diaAjustado).padStart(2, '0')}`
}

/** Dias (positivo = futuro, negativo = passado) entre a data e hoje. */
export function diasAte(iso: string, referencia: string = dataHoje()): number {
  const alvo = new Date(`${iso}T00:00:00`)
  const base = new Date(`${referencia}T00:00:00`)
  return Math.round((alvo.getTime() - base.getTime()) / 86_400_000)
}

/** Mês (AAAA-MM) de uma data ISO. */
export function mesDe(iso: string): string {
  return iso.slice(0, 7)
}
