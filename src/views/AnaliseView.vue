<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  adicionarCategoria,
  listarCategorias,
  listarCategoriasDoTipo,
} from '@/stores/categorias'
import { adicionarLancamento, usarLancamentos } from '@/stores/lancamentos'
import { notificar } from '@/stores/notificacoes'
import { formatarMes, formatarMesCurto, formatarMoeda } from '@/utils/formatar'
import { exportarCSV } from '@/utils/exportarCSV'
import { exportarExcel, exportarTudoExcel } from '@/utils/exportarExcel'
import {
  converterLinhas,
  detectarMapeamento,
  lerPlanilha,
  type ArquivoLido,
  type CelulaPlanilha,
  type Mapeamento,
} from '@/utils/importarPlanilha'
import { resumirPorMes } from '@/utils/resumos'
import GraficoBarras from '@/components/graficos/GraficoBarras.vue'
import GraficoLinha from '@/components/graficos/GraficoLinha.vue'
import GraficoPizza from '@/components/graficos/GraficoPizza.vue'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'
import { PALETA } from '@/styles/paleta'
import { PALETA_GRAFICOS, type DatasetBarras, type DatasetLinha } from '@/components/graficos/chartjs'

const { lancamentos } = usarLancamentos()

// ═══════════════════════════════════════════════════════════
// Importação de planilha
// ═══════════════════════════════════════════════════════════

const arquivoLido = ref<ArquivoLido | null>(null)
const arquivoSelecionado = ref<File | null>(null)
const erroArquivo = ref<string | null>(null)
const carregando = ref(false)
const arrastando = ref(false)
const mapeamento = ref<Mapeamento>({
  data: null,
  descricao: null,
  valor: null,
  tipo: null,
  categoria: null,
})
const confirmarImportacaoAberto = ref(false)
const inputArquivo = ref<HTMLInputElement | null>(null)

async function carregarArquivo(arquivo: File, aba?: string): Promise<void> {
  carregando.value = true
  erroArquivo.value = null
  try {
    arquivoLido.value = await lerPlanilha(arquivo, aba)
    arquivoSelecionado.value = arquivo
    mapeamento.value = detectarMapeamento(arquivoLido.value.colunas)
  } catch (erro) {
    arquivoLido.value = null
    arquivoSelecionado.value = null
    erroArquivo.value =
      erro instanceof Error ? erro.message : 'Não foi possível ler o arquivo.'
  } finally {
    carregando.value = false
  }
}

function aoEscolherArquivo(evento: Event) {
  const alvo = evento.target as HTMLInputElement
  const arquivo = alvo.files?.[0]
  alvo.value = ''
  if (arquivo) void carregarArquivo(arquivo)
}

function aoSoltar(evento: DragEvent) {
  arrastando.value = false
  const arquivo = evento.dataTransfer?.files?.[0]
  if (arquivo) void carregarArquivo(arquivo)
}

function trocarAba() {
  if (arquivoSelecionado.value && arquivoLido.value) {
    void carregarArquivo(arquivoSelecionado.value, arquivoLido.value.aba)
  }
}

function limparImportacao() {
  arquivoLido.value = null
  arquivoSelecionado.value = null
  erroArquivo.value = null
}

/** Prévia da conversão (recalculada conforme o mapeamento muda). */
const previa = computed(() => {
  if (!arquivoLido.value) return null
  const mapa = mapeamento.value
  if (!mapa.data || !mapa.descricao || !mapa.valor) return null
  try {
    return converterLinhas(arquivoLido.value.linhas, mapa)
  } catch {
    return null
  }
})

const PREVIA_LIMITE = 8

const linhasPrevia = computed(() => arquivoLido.value?.linhas.slice(0, PREVIA_LIMITE) ?? [])

const errosVisiveis = computed(
  () => previa.value?.erros.slice(0, PREVIA_LIMITE) ?? [],
)

function formatarCelula(celula: CelulaPlanilha): string {
  if (celula === null || celula === '') return '—'
  if (celula instanceof Date && !Number.isNaN(celula.getTime())) {
    return celula.toLocaleDateString('pt-BR')
  }
  return String(celula)
}

function abrirConfirmacaoImportacao() {
  if (!previa.value || previa.value.convertidos.length === 0) return
  confirmarImportacaoAberto.value = true
}

function normalizarNome(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Acha a categoria pelo nome ou cria uma simples para o tipo. */
function obterOuCriarCategoria(
  nome: string | null,
  tipo: 'receita' | 'despesa',
): string {
  if (nome) {
    const achada = listarCategorias({ incluirInativas: true }).find(
      (categoria) => normalizarNome(categoria.nome) === normalizarNome(nome),
    )
    if (achada) return achada.id

    return adicionarCategoria({
      nome,
      cor: PALETA.neutro,
      icone: '🏷️',
      grupo: tipo === 'receita' ? 'receita' : 'despesa_pessoal',
    }).id
  }

  const disponivel = listarCategoriasDoTipo(tipo)[0]
  if (disponivel) return disponivel.id

  return adicionarCategoria({
    nome: tipo === 'receita' ? 'Receitas sem categoria' : 'Despesas sem categoria',
    cor: PALETA.neutro,
    icone: '🏷️',
    grupo: tipo === 'receita' ? 'receita' : 'despesa_pessoal',
  }).id
}

function executarImportacao() {
  confirmarImportacaoAberto.value = false
  const resultado = previa.value
  if (!resultado) return

  let novos = 0
  let duplicados = 0

  for (const item of resultado.convertidos) {
    const chave = `${item.data}|${item.descricao.toLowerCase()}|${item.valor}`
    const jaExiste = lancamentos.value.some(
      (lancamento) =>
        `${lancamento.data}|${lancamento.descricao.toLowerCase()}|${lancamento.valor}` ===
        chave,
    )
    if (jaExiste) {
      duplicados += 1
      continue
    }

    adicionarLancamento({
      descricao: item.descricao,
      valor: item.valor,
      tipo: item.tipo,
      categoriaId: obterOuCriarCategoria(item.categoriaNome, item.tipo),
      data: item.data,
    })
    novos += 1
  }

  notificar(
    `${novos} lançamento(s) importado(s).` +
      (duplicados > 0 ? ` ${duplicados} duplicado(s) ignorado(s).` : '') +
      (resultado.erros.length > 0
        ? ` ${resultado.erros.length} linha(s) com erro foram puladas.`
        : ''),
    novos > 0 ? 'sucesso' : 'info',
  )

  limparImportacao()
}

// ═══════════════════════════════════════════════════════════
// Painel de análise (filtros + gráficos)
// ═══════════════════════════════════════════════════════════

const periodo = ref<'3' | '6' | '12' | 'tudo'>('6')
const mesFiltro = ref<string>('todos')
const categoriaFiltro = ref<string>('todos')

const mesesDisponiveis = computed(() => {
  const meses = new Set(
    lancamentos.value.map((lancamento) => lancamento.data.slice(0, 7)),
  )
  return [...meses].sort().reverse()
})

const categoriasVisiveis = computed(() =>
  listarCategorias({ incluirInativas: true }),
)

const lancamentosAnalise = computed(() => {
  let lista = lancamentos.value

  if (periodo.value !== 'tudo') {
    const quantidade = Number(periodo.value)
    const ultimos = new Set(
      [...mesesDisponiveis.value]
        .slice(0, quantidade)
        .map((mes) => mes),
    )
    lista = lista.filter((lancamento) =>
      ultimos.has(lancamento.data.slice(0, 7)),
    )
  }

  if (mesFiltro.value !== 'todos') {
    lista = lista.filter((lancamento) =>
      lancamento.data.startsWith(mesFiltro.value),
    )
  }

  if (categoriaFiltro.value !== 'todos') {
    lista = lista.filter(
      (lancamento) => lancamento.categoriaId === categoriaFiltro.value,
    )
  }

  return lista
})

const resumoMeses = computed(() => resumirPorMes(lancamentosAnalise.value))
const resumoAscendente = computed(() => [...resumoMeses.value].reverse())

const rotulosMeses = computed(() =>
  resumoAscendente.value.map((resumo) => formatarMesCurto(resumo.chave)),
)

const dadosBarras = computed<DatasetBarras[]>(() => [
  {
    label: 'Receitas',
    data: resumoAscendente.value.map((resumo) => resumo.receitas),
    backgroundColor: PALETA_GRAFICOS.receita,
    borderRadius: 6,
    maxBarThickness: 34,
  },
  {
    label: 'Despesas',
    data: resumoAscendente.value.map((resumo) => resumo.despesas),
    backgroundColor: PALETA_GRAFICOS.despesa,
    borderRadius: 6,
    maxBarThickness: 34,
  },
])

const dadosSaldo = computed<DatasetLinha[]>(() => {
  let acumulado = 0
  const serie = resumoAscendente.value.map((resumo) => {
    acumulado += resumo.resultado
    return acumulado
  })

  return [
    {
      label: 'Saldo acumulado',
      data: serie,
      borderColor: PALETA_GRAFICOS.saldo,
      backgroundColor: 'rgba(37, 78, 112, 0.12)',
      preenchido: true,
    },
  ]
})

const despesasCategoria = computed(() => {
  const totais = new Map<string, { nome: string; cor: string; valor: number }>()

  for (const lancamento of lancamentosAnalise.value) {
    if (lancamento.tipo !== 'despesa') continue
    const categoria = listarCategorias({ incluirInativas: true }).find(
      (item) => item.id === lancamento.categoriaId,
    )
    const chave = lancamento.categoriaId
    const atual = totais.get(chave) ?? {
      nome: categoria?.nome ?? 'Sem categoria',
      cor: categoria?.cor ?? PALETA.neutro,
      valor: 0,
    }
    atual.valor += lancamento.valor
    totais.set(chave, atual)
  }

  return [...totais.values()].sort((a, b) => b.valor - a.valor)
})

/** Comparação mês a mês com variação do resultado vs. mês anterior. */
const comparacaoMeses = computed(() =>
  [...resumoMeses.value].reverse().map((resumo, indice, lista) => {
    const anterior = lista[indice - 1]
    let variacao: number | null = null
    if (anterior && anterior.resultado !== 0) {
      variacao = Math.round(
        ((resumo.resultado - anterior.resultado) / Math.abs(anterior.resultado)) * 100,
      )
    }
    return { ...resumo, variacao }
  }),
)

function exportarAnaliseExcel() {
  exportarExcel(lancamentosAnalise.value)
  notificar('Planilha Excel gerada com os dados filtrados.')
}

function exportarAnaliseCSV() {
  exportarCSV(lancamentosAnalise.value)
  notificar('Arquivo CSV gerado com os dados filtrados.')
}

/** Planilha única com uma aba para cada módulo do app. */
function exportarTudo() {
  exportarTudoExcel()
  notificar('Planilha Excel com todos os dados foi gerada.')
}

function rotuloVariacao(valor: number | null): string {
  if (valor === null) return '—'
  const sinal = valor > 0 ? '+' : ''
  return `${sinal}${valor}%`
}
</script>

<template>
  <div class="pagina">
    <header class="page-heading">
      <p class="eyebrow">ANÁLISE DE DADOS</p>
      <h2>Importe, entenda e exporte.</h2>
      <p class="subtitle">
        Traga extratos em planilha e compare períodos — tudo processado
        localmente, sem enviar nada para a internet.
      </p>
    </header>

    <!-- ── Importação ─────────────────────────────────────── -->
    <section class="panel">
      <h3>Importar planilha (.xlsx, .xls ou .csv)</h3>
      <p class="panel-description">
        Escolha ou arraste um arquivo com colunas de data, descrição e valor.
        Você confere o mapeamento e a prévia antes de qualquer coisa ser salva.
      </p>

      <p class="nota-info">
        <font-awesome-icon icon="circle-info" aria-hidden="true" />
        <span>
          O arquivo é aberto apenas neste navegador (SheetJS). Nenhum conteúdo
          é enviado pela internet ou compartilhado.
        </span>
      </p>

      <div
        class="zona-arquivo"
        :class="{ arrastando }"
        @dragover.prevent="arrastando = true"
        @dragleave.prevent="arrastando = false"
        @drop.prevent="aoSoltar"
      >
        <font-awesome-icon icon="upload" aria-hidden="true" />
        <p>Arraste a planilha aqui ou</p>
        <button class="botao-secundario" type="button" @click="inputArquivo?.click()">
          <font-awesome-icon icon="file-excel" aria-hidden="true" />
          Escolher arquivo
        </button>
        <input
          id="input-arquivo-analise"
          ref="inputArquivo"
          class="campo-oculto"
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Selecionar planilha para importar"
          @change="aoEscolherArquivo"
        />
      </div>

      <p v-if="carregando" class="painel-vazio">Lendo o arquivo…</p>
      <p v-if="erroArquivo" class="campo-erro" role="alert">{{ erroArquivo }}</p>

      <template v-if="arquivoLido">
        <div class="linha-acoes importacao-topo">
          <div class="campo campo-aba">
            <label for="aba-planilha">Aba da planilha</label>
            <select
              id="aba-planilha"
              :value="arquivoLido.aba"
              @change="arquivoLido.aba = ($event.target as HTMLSelectElement).value; trocarAba()"
            >
              <option v-for="aba in arquivoLido.abas" :key="aba" :value="aba">
                {{ aba }}
              </option>
            </select>
          </div>

          <button class="botao-acao" type="button" @click="limparImportacao">
            <font-awesome-icon icon="trash" aria-hidden="true" />
            Descartar arquivo
          </button>
        </div>

        <p class="arquivo-info">
          <strong>{{ arquivoLido.nomeArquivo }}</strong>
          — {{ arquivoLido.linhas.length }} linha(s), {{ arquivoLido.colunas.length }} coluna(s)
        </p>

        <h4 class="subtitulo-secao">Mapeamento de colunas</h4>
        <div class="formulario mapeamento">
          <div class="campo">
            <label for="mapa-data">Coluna de data *</label>
            <select id="mapa-data" v-model="mapeamento.data">
              <option :value="null">— não mapear —</option>
              <option v-for="coluna in arquivoLido.colunas" :key="coluna" :value="coluna">
                {{ coluna }}
              </option>
            </select>
          </div>

          <div class="campo">
            <label for="mapa-descricao">Coluna de descrição *</label>
            <select id="mapa-descricao" v-model="mapeamento.descricao">
              <option :value="null">— não mapear —</option>
              <option v-for="coluna in arquivoLido.colunas" :key="coluna" :value="coluna">
                {{ coluna }}
              </option>
            </select>
          </div>

          <div class="campo">
            <label for="mapa-valor">Coluna de valor *</label>
            <select id="mapa-valor" v-model="mapeamento.valor">
              <option :value="null">— não mapear —</option>
              <option v-for="coluna in arquivoLido.colunas" :key="coluna" :value="coluna">
                {{ coluna }}
              </option>
            </select>
          </div>

          <div class="campo">
            <label for="mapa-tipo">Coluna de tipo (opcional)</label>
            <select id="mapa-tipo" v-model="mapeamento.tipo">
              <option :value="null">— não mapear —</option>
              <option v-for="coluna in arquivoLido.colunas" :key="coluna" :value="coluna">
                {{ coluna }}
              </option>
            </select>
          </div>

          <div class="campo">
            <label for="mapa-categoria">Coluna de categoria (opcional)</label>
            <select id="mapa-categoria" v-model="mapeamento.categoria">
              <option :value="null">— não mapear —</option>
              <option v-for="coluna in arquivoLido.colunas" :key="coluna" :value="coluna">
                {{ coluna }}
              </option>
            </select>
          </div>
        </div>

        <h4 class="subtitulo-secao">
          Prévia das primeiras {{ PREVIA_LIMITE }} linhas (leitura bruta)
        </h4>
        <div class="tabela-rolagem">
          <table class="tabela-dados">
            <thead>
              <tr>
                <th>#</th>
                <th v-for="coluna in arquivoLido.colunas" :key="coluna">{{ coluna }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(linha, indice) in linhasPrevia" :key="indice">
                <td>{{ indice + 2 }}</td>
                <td v-for="coluna in arquivoLido.colunas" :key="coluna">
                  {{ formatarCelula(linha[coluna] ?? null) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template v-if="previa">
          <h4 class="subtitulo-secao">Resultado da conversão</h4>
          <p class="arquivo-info">
            <strong>{{ previa.convertidos.length }}</strong> linha(s) prontas para importar ·
            <strong :class="{ 'campo-erro': previa.erros.length > 0 }">{{ previa.erros.length }}</strong>
            com erro
          </p>

          <p v-if="mapeamento.tipo === null" class="nota-regra">
            Sem coluna de tipo: valores negativos viram despesas e positivos
            receitas (convenção de extratos). Confira a prévia acima.
          </p>

          <ul v-if="errosVisiveis.length > 0" class="lista-erros-importacao" role="status">
            <li v-for="erro in errosVisiveis" :key="erro.numeroLinha">
              Linha {{ erro.numeroLinha }}: {{ erro.motivo }}
            </li>
            <li v-if="previa.erros.length > errosVisiveis.length">
              … e mais {{ previa.erros.length - errosVisiveis.length }} linha(s) com erro.
            </li>
          </ul>

          <button
            class="botao-salvar botao-importar"
            type="button"
            :disabled="previa.convertidos.length === 0"
            @click="abrirConfirmacaoImportacao"
          >
            <font-awesome-icon icon="upload" aria-hidden="true" />
            Importar {{ previa.convertidos.length }} lançamento(s)
          </button>
        </template>

        <p v-else class="campo-erro" role="alert">
          Mapeie as colunas de data, descrição e valor para continuar.
        </p>
      </template>
    </section>

    <!-- ── Exportação completa ────────────────────────────── -->
    <section class="panel">
      <h3>Exportar todos os dados (.xlsx)</h3>
      <p class="panel-description">
        Gera uma planilha única com uma aba para cada módulo: lançamentos,
        categorias, contas, transferências, cartões, compras, pagamentos de
        fatura, compromissos, orçamentos, metas, investimentos, bens e dívidas.
      </p>

      <p class="nota-info">
        <font-awesome-icon icon="circle-info" aria-hidden="true" />
        <span>
          O arquivo é montado apenas neste navegador (SheetJS). Nada é enviado
          pela internet.
        </span>
      </p>

      <button class="botao-acao botao-exportar-tudo" type="button" @click="exportarTudo">
        <font-awesome-icon icon="file-excel" aria-hidden="true" />
        Baixar planilha completa
      </button>
    </section>

    <!-- ── Painel de análise ──────────────────────────────── -->
    <section class="panel">
      <h3>Painel de análise</h3>
      <p class="panel-description">
        Compare receitas, despesas, evolução do saldo e categorias por período.
      </p>

      <div class="filtros-analise">
        <div class="campo">
          <label for="filtro-periodo">Período</label>
          <select id="filtro-periodo" v-model="periodo">
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
            <option value="tudo">Tudo</option>
          </select>
        </div>

        <div class="campo">
          <label for="filtro-mes">Mês</label>
          <select id="filtro-mes" v-model="mesFiltro">
            <option value="todos">Todos os meses</option>
            <option v-for="mes in mesesDisponiveis" :key="mes" :value="mes">
              {{ formatarMes(mes) }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label for="filtro-categoria-analise">Categoria</label>
          <select id="filtro-categoria-analise" v-model="categoriaFiltro">
            <option value="todos">Todas as categorias</option>
            <option
              v-for="categoria in categoriasVisiveis"
              :key="categoria.id"
              :value="categoria.id"
            >
              {{ categoria.nome }}
            </option>
          </select>
        </div>

        <div class="campo campo-exportar">
          <label>Exportar filtrados</label>
          <div class="linha-acoes">
            <button class="botao-acao" type="button" @click="exportarAnaliseExcel">
              <font-awesome-icon icon="file-excel" aria-hidden="true" />
              Excel
            </button>
            <button class="botao-acao" type="button" @click="exportarAnaliseCSV">
              <font-awesome-icon icon="download" aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>
      </div>

      <p v-if="lancamentosAnalise.length === 0" class="painel-vazio">
        Nenhum lançamento corresponde aos filtros. Cadastre dados ou importe
        uma planilha para ver os gráficos.
      </p>

      <template v-else>
        <div class="graficos-grade">
          <div class="bloco-grafico">
            <h4>Receitas × despesas por mês</h4>
            <GraficoBarras :rotulos="rotulosMeses" :datasets="dadosBarras" />
          </div>

          <div class="bloco-grafico">
            <h4>Saldo acumulado no período</h4>
            <GraficoLinha :rotulos="rotulosMeses" :datasets="dadosSaldo" />
          </div>

          <div class="bloco-grafico bloco-largo">
            <h4>Despesas por categoria</h4>
            <GraficoPizza
              v-if="despesasCategoria.length > 0"
              :rotulos="despesasCategoria.map((item) => item.nome)"
              :valores="despesasCategoria.map((item) => item.valor)"
              :cores="despesasCategoria.map((item) => item.cor)"
            />
            <p v-else class="painel-vazio">
              Nenhuma despesa no recorte selecionado.
            </p>
          </div>
        </div>

        <h4 class="subtitulo-secao">Comparação mês a mês</h4>
        <div class="tabela-rolagem">
          <table class="tabela-dados">
            <thead>
              <tr>
                <th>Mês</th>
                <th class="num">Receitas</th>
                <th class="num">Despesas</th>
                <th class="num">Resultado</th>
                <th class="num">Variação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="linha in comparacaoMeses" :key="linha.chave">
                <td>{{ formatarMes(linha.chave) }}</td>
                <td class="num">{{ formatarMoeda(linha.receitas) }}</td>
                <td class="num">{{ formatarMoeda(linha.despesas) }}</td>
                <td class="num">{{ formatarMoeda(linha.resultado) }}</td>
                <td class="num">
                  <span
                    class="badge"
                    :class="{
                      'badge-positivo': (linha.variacao ?? 0) > 0,
                      'badge-negativo': (linha.variacao ?? 0) < 0,
                      'badge-neutro': linha.variacao === null,
                    }"
                  >
                    {{ rotuloVariacao(linha.variacao) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <p class="demo-note">
      Gráficos e importações processados localmente (Chart.js + SheetJS).
    </p>

    <ModalConfirmacao
      :visivel="confirmarImportacaoAberto"
      titulo="Confirmar importação"
      :texto="
        previa
          ? `Importar ${previa.convertidos.length} lançamento(s)? Linhas duplicadas (mesma data, descrição e valor) serão ignoradas e categorias desconhecidas serão criadas simples.`
          : ''
      "
      rotulo-confirmar="Importar"
      :perigo="false"
      @confirmar="executarImportacao"
      @cancelar="confirmarImportacaoAberto = false"
    />
  </div>
</template>

<style scoped>
.importacao-topo {
  margin-top: 20px;
}

.campo-aba {
  min-width: 220px;
}

.arquivo-info {
  margin: 14px 0 0;
  color: var(--color-muted);
  font-size: 12.5px;
}

.subtitulo-secao {
  margin: 26px 0 12px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 800;
}

.zona-arquivo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 28px 16px;
  border: 2px dashed var(--color-border);
  border-radius: 13px;
  background: var(--color-surface-faint);
  color: var(--color-muted);
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
}

.zona-arquivo svg {
  font-size: 24px;
  color: var(--color-primary);
}

.zona-arquivo p {
  margin: 0;
  font-size: 13px;
}

.zona-arquivo.arrastando {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.campo-oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.mapeamento {
  margin-top: 4px;
}

.lista-erros-importacao {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--color-danger-dark);
  font-size: 12.5px;
}

.nota-regra {
  margin: 10px 0 0;
  color: var(--color-muted);
  font-size: 12px;
  font-style: italic;
}

.botao-importar {
  margin-top: 18px;
  border: 0;
  cursor: pointer;
}

.botao-exportar-tudo {
  margin-top: 16px;
}

.filtros-analise {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.campo-exportar {
  justify-content: flex-start;
}

.graficos-grade {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.bloco-grafico {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--color-border-soft);
  border-radius: 13px;
}

.bloco-grafico h4 {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 700;
}

.bloco-largo {
  grid-column: 1 / -1;
}

@media (max-width: 1050px) {
  .filtros-analise,
  .graficos-grade {
    grid-template-columns: 1fr;
  }

  .bloco-largo {
    grid-column: auto;
  }
}
</style>
