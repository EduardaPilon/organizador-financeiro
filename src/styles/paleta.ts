/**
 * Paleta oficial do projeto — a mesma de `styles/tokens.css`, mas em um
 * formato que o TypeScript também consegue ler.
 *
 * Por que este arquivo existe: Chart.js, `:style` inline e o catálogo de
 * categorias precisam de cores em JavaScript, onde `var(--color-*)` não
 * funciona. Antes cada um repetia o próprio hexadecimal e a plataforma
 * voltava a exibir cores antigas. Agora todo ponto do app lê daqui.
 *
 * Regra da paleta: só existem as CINCO cores oficiais
 *   verde #246B4A · coral #C33C54 · azul #254E70 · cinza #E0E1DD · teal #17C3B2
 * e os tons derivados delas (mistura com branco ou preto, em passos
 * regulares). Nenhuma cor "inventada" fora dessa família.
 */
export const PALETA = {
  /** Verde: ações positivas, receitas, valores a favor. */
  verde: '#246B4A',
  /** Coral: despesas, alertas, perigo. */
  coral: '#C33C54',
  /** Azul: estrutura, navegação, informações e estados de atenção. */
  azul: '#254E70',
  /** Cinza: superfícies, bordas e neutros. */
  cinza: '#E0E1DD',
  /** Teal (5ª cor): destaques, investimentos e gráficos. */
  teal: '#17C3B2',
  /** Cinza escurecido: usado quando não há cor de categoria ("sem categoria"). */
  neutro: '#868785',
  /** Branco das superfícies (cartões, fundos de gráfico). */
  superficie: '#FFFFFF',
  /** Espelho de `--color-text` (Chart.js não lê variáveis CSS). */
  texto: '#24332C',
  /** Espelho de `--color-muted`. */
  textoSuave: '#5F6D64',
} as const

/**
 * Rampas de tons derivados — cada tom é a cor oficial misturada com branco
 * (para clarear) ou com preto (para escurecer). Servem para dar variedade
 * dentro de um grupo de categorias sem sair da paleta: nenhuma cor aqui tem
 * "matiz inventado".
 */
export const RAMPA = {
  verde: [
    '#246B4A',
    '#3A7A5C',
    '#50896E',
    '#669780',
    '#7CA692',
    '#92B5A5',
    '#A7C4B7',
    '#BDD3C9',
    '#D3E1DB',
  ],
  coral: [
    '#C33C54',
    '#C95065',
    '#CF6376',
    '#D57787',
    '#DB8A98',
    '#E19EAA',
    '#E7B1BB',
    '#EDC5CC',
    '#F3D8DD',
    '#F9ECEE',
  ],
  /** Tons mais fechados do coral (mistura com preto) — para o que "dói" mais. */
  coralEscuro: ['#922D3F', '#AC354A'],
  azul: [
    '#254E70',
    '#3B607E',
    '#51718D',
    '#66839B',
    '#7C95A9',
    '#92A7B8',
    '#A8B8C6',
    '#BECAD4',
    '#D3DCE2',
  ],
  teal: [
    '#17C3B2',
    '#2EC9BA',
    '#45CFC1',
    '#5DD5C9',
    '#74DBD1',
    '#8BE1D9',
    '#A2E7E0',
    '#B9EDE8',
    '#D1F3F0',
  ],
} as const
