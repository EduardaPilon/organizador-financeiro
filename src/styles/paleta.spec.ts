import { describe, expect, it } from 'vitest'
import { PALETA, RAMPA } from './paleta'

/**
 * Guarda de regressão da paleta.
 *
 * Motivo: em uma revisão anterior a paleta oficial existia em
 * `styles/tokens.css`, mas as cores de categoria, os gráficos e os estilos
 * inline continuavam com hexadecimais antigos — a plataforma "não tinha
 * mudado". Este teste existe para isso não voltar a acontecer.
 */

/** As cinco cores oficiais, em maiúsculas, para comparação. */
const OFICIAIS = ['#246B4A', '#C33C54', '#254E70', '#E0E1DD', '#17C3B2']

/** Arquivos que PODEM conter hexadecimal (fonte única da paleta). */
const PERMITIDOS = new Set(['tokens.css', 'paleta.ts'])

function canais(hex: string): number[] {
  return [1, 3, 5].map((posicao) => parseInt(hex.slice(posicao, posicao + 2), 16))
}

function paraHex(canais: number[]): string {
  return (
    '#' +
    canais
      .map((valor) => Math.round(valor).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

/** Mistura uma cor com branco (alvo 255) ou preto (alvo 0) na proporção r. */
function mistura(hex: string, alvo: number, r: number): number[] {
  return canais(hex).map((valor) => valor + (alvo - valor) * r)
}

/** Menor diferença (em canais) entre um tom e alguma mistura do tom base. */
function distanciaAoBase(tom: string, base: string): number {
  let menor = Number.POSITIVE_INFINITY
  for (const alvo of [255, 0]) {
    for (let passo = 0; passo <= 1000; passo++) {
      const esperado = mistura(base, alvo, passo / 1000)
      const tomAtual = canais(tom)
      const diferenca = Math.max(
        ...esperado.map((valor, indice) => Math.abs(valor - (tomAtual[indice] ?? 0))),
      )
      if (diferenca < menor) menor = diferenca
    }
  }
  return menor
}

/** Todos os arquivos de código do projeto, lidos como texto pelo Vite. */
const ARQUIVOS = import.meta.glob('/src/**/*.{ts,vue,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('paleta oficial', () => {
  it('contém exatamente as cinco cores definidas pela usuária', () => {
    const oficiais = [PALETA.verde, PALETA.coral, PALETA.azul, PALETA.cinza, PALETA.teal]
    expect(oficiais.map((cor) => cor.toUpperCase()).sort()).toEqual([...OFICIAIS].sort())
  })

  it('define as cinco cores em maiúsculas (padrão do arquivo)', () => {
    for (const cor of Object.values(PALETA)) {
      expect(cor).toBe(cor.toUpperCase())
    }
  })
})

describe('rampas de tons derivados', () => {
  const bases: Array<[string, readonly string[], string]> = [
    ['verde', RAMPA.verde, PALETA.verde],
    ['azul', RAMPA.azul, PALETA.azul],
    ['teal', RAMPA.teal, PALETA.teal],
    ['coral', RAMPA.coral, PALETA.coral],
    ['coralEscuro', RAMPA.coralEscuro, PALETA.coral],
  ]

  it.each(bases)(
    'cada tom da rampa %s é uma mistura do tom base (sem matiz inventado)',
    (_nome, tons, base) => {
      for (const tom of tons) {
        expect(distanciaAoBase(tom, base)).toBeLessThanOrEqual(1)
      }
    },
  )

  it('a rampa de cada cor começa na própria cor oficial', () => {
    expect(RAMPA.verde[0]).toBe(PALETA.verde)
    expect(RAMPA.azul[0]).toBe(PALETA.azul)
    expect(RAMPA.teal[0]).toBe(PALETA.teal)
    expect(RAMPA.coral[0]).toBe(PALETA.coral)
  })
})

describe('auditoria de cores no código', () => {
  it('encontra os arquivos de código para auditar (teste não pode ficar vazio)', () => {
    expect(Object.keys(ARQUIVOS).length).toBeGreaterThan(30)
  })

  it('nenhum hexadecimal fora de tokens.css e paleta.ts', () => {
    const infratores: string[] = []

    for (const [caminho, conteudo] of Object.entries(ARQUIVOS)) {
      const nome = caminho.split('/').pop() ?? ''
      if (PERMITIDOS.has(nome) || nome.endsWith('.spec.ts')) continue

      if (/#[0-9a-fA-F]{6}\b/.test(conteudo)) infratores.push(caminho)
    }

    expect(infratores).toEqual([])
  })
})
