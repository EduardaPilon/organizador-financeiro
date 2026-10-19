<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ROTULOS_TIPOS_BEM,
  ROTULOS_TIPOS_DIVIDA,
  adicionarBem,
  adicionarDivida,
  bens,
  dividas,
  parcelasRestantes,
  registrarPagamentoParcela,
  removerBem,
  removerDivida,
  totalBens,
  totalDividas,
  type Bem,
  type Divida,
  type TipoBem,
  type TipoDivida,
} from '@/stores/patrimonio'
import { calcularSaldoConta, contas, transferencias } from '@/stores/contas'
import { totalInvestido } from '@/stores/investimentos'
import { usarLancamentos } from '@/stores/lancamentos'
import { notificar } from '@/stores/notificacoes'
import { formatarMoeda } from '@/utils/formatar'
import { formatarDataBR } from '@/utils/datas'
import { somarEmCentavos } from '@/utils/moeda'
import { validarTextoObrigatorio } from '@/utils/validacao'
import CampoMoeda from '@/components/ui/CampoMoeda.vue'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'

const { lancamentos } = usarLancamentos()

// ── Novo bem ────────────────────────────────────────────────
const bemNome = ref('')
const bemTipo = ref<TipoBem>('imovel')
const bemValor = ref<number | null>(null)
const bemData = ref('')
const errosBem = ref<string[]>([])

function salvarBem() {
  const listaErros = [
    ...validarTextoObrigatorio(bemNome.value, 'O nome do bem'),
    ...(bemValor.value === null || bemValor.value <= 0
      ? ['Informe o valor estimado (maior que zero).']
      : []),
  ]

  if (listaErros.length > 0) {
    errosBem.value = listaErros
    return
  }

  errosBem.value = []
  adicionarBem({
    nome: bemNome.value,
    tipo: bemTipo.value,
    valorEstimado: bemValor.value as number,
    dataAquisicao: bemData.value || undefined,
  })

  notificar('Bem cadastrado como estimativa de patrimônio.')
  bemNome.value = ''
  bemValor.value = null
  bemData.value = ''
}

// ── Nova dívida ─────────────────────────────────────────────
const divNome = ref('')
const divTipo = ref<TipoDivida>('financiamento')
const divValorOriginal = ref<number | null>(null)
const divSaldo = ref<number | null>(null)
const divParcelas = ref(12)
const divValorParcela = ref<number | null>(null)
const errosDivida = ref<string[]>([])

function salvarDivida() {
  const listaErros = [
    ...validarTextoObrigatorio(divNome.value, 'O nome da dívida'),
    ...(divValorOriginal.value === null || divValorOriginal.value <= 0
      ? ['Informe o valor original da dívida.']
      : []),
    ...(divSaldo.value === null || divSaldo.value < 0
      ? ['Informe o saldo devedor atual.']
      : []),
    ...(divParcelas.value < 1 ? ['Informe o número total de parcelas.'] : []),
    ...(divValorParcela.value === null || divValorParcela.value <= 0
      ? ['Informe o valor da parcela.']
      : []),
  ]

  if (listaErros.length > 0) {
    errosDivida.value = listaErros
    return
  }

  errosDivida.value = []
  adicionarDivida({
    nome: divNome.value,
    tipo: divTipo.value,
    valorOriginal: divValorOriginal.value as number,
    saldoDevedor: divSaldo.value as number,
    parcelasTotal: divParcelas.value,
    valorParcela: divValorParcela.value as number,
  })

  notificar('Dívida cadastrada como passivo.')
  divNome.value = ''
  divValorOriginal.value = null
  divSaldo.value = null
  divParcelas.value = 12
  divValorParcela.value = null
}

// ── Resumo patrimonial ──────────────────────────────────────
const saldoContas = computed(() =>
  somarEmCentavos(
    contas.value.map((conta) =>
      calcularSaldoConta(conta.id, lancamentos.value, transferencias.value),
    ),
  ),
)

const ativos = computed(() =>
  somarEmCentavos([saldoContas.value, totalInvestido(), totalBens()]),
)

const passivos = computed(() => totalDividas())

const liquido = computed(() => somarEmCentavos([ativos.value, -passivos.value]))

function percentualPago(divida: Divida): number {
  if (divida.parcelasTotal <= 0) return 0
  return Math.min(
    Math.round((divida.parcelasPagas / divida.parcelasTotal) * 100),
    100,
  )
}

// ── Ações ───────────────────────────────────────────────────
function pagarParcela(divida: Divida) {
  const antes = divida.saldoDevedor
  registrarPagamentoParcela(divida.id)
  if (divida.saldoDevedor < antes) {
    notificar(
      'Parcela registrada: saldo devedor reduzido. (Isto não gera despesa — lance a parcela em Lançamentos se quiser vê-la no mês.)',
      'info',
    )
  } else {
    notificar('Esta dívida já está quitada.', 'info')
  }
}

const bemParaExcluir = ref<Bem | null>(null)
const dividaParaExcluir = ref<Divida | null>(null)

function confirmarExclusaoBem() {
  const alvo = bemParaExcluir.value
  if (!alvo) return
  removerBem(alvo.id)
  bemParaExcluir.value = null
  notificar(`Bem "${alvo.nome}" removido.`)
}

function confirmarExclusaoDivida() {
  const alvo = dividaParaExcluir.value
  if (!alvo) return
  removerDivida(alvo.id)
  dividaParaExcluir.value = null
  notificar(`Dívida "${alvo.nome}" removida.`)
}
</script>

<template>
  <div class="pagina">
    <header class="page-heading">
      <p class="eyebrow">PATRIMÔNIO</p>
      <h2>O que você tem e o que ainda deve.</h2>
      <p class="subtitle">
        Bens, financiamentos e dívidas — para enxergar seu patrimônio líquido.
      </p>
    </header>

    <p class="nota-info">
      <font-awesome-icon icon="circle-info" aria-hidden="true" />
      <span>
        Valores de bens são <strong>estimativas informadas por você</strong>
        (sem depreciação automática). Pagar parcela reduz o passivo e não cria
        despesa, evitando contagem dupla.
      </span>
    </p>

    <section class="panel">
      <h3>Resumo do patrimônio</h3>
      <div class="resumo-grade">
        <div class="resumo-item">
          <p class="resumo-rotulo">Ativos</p>
          <p class="resumo-valor positivo">{{ formatarMoeda(ativos) }}</p>
          <p class="resumo-detalhe">
            contas {{ formatarMoeda(saldoContas) }} · investimentos
            {{ formatarMoeda(totalInvestido()) }} · bens
            {{ formatarMoeda(totalBens()) }}
          </p>
        </div>
        <div class="resumo-item">
          <p class="resumo-rotulo">Passivos</p>
          <p class="resumo-valor negativo">{{ formatarMoeda(passivos) }}</p>
          <p class="resumo-detalhe">dívidas em aberto</p>
        </div>
        <div class="resumo-item destaque">
          <p class="resumo-rotulo">Patrimônio líquido</p>
          <p class="resumo-valor" :class="liquido >= 0 ? 'positivo' : 'negativo'">
            {{ formatarMoeda(liquido) }}
          </p>
          <p class="resumo-detalhe">ativos − passivos</p>
        </div>
      </div>
    </section>

    <section class="panel">
      <h3>Novo bem</h3>
      <form class="formulario" @submit.prevent="salvarBem">
        <ul v-if="errosBem.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosBem" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="bem-nome">Nome</label>
          <input id="bem-nome" v-model="bemNome" type="text" maxlength="80" placeholder="Ex.: Apartamento" required />
        </div>

        <div class="campo">
          <label for="bem-tipo">Tipo</label>
          <select id="bem-tipo" v-model="bemTipo">
            <option v-for="(rotulo, chave) in ROTULOS_TIPOS_BEM" :key="chave" :value="chave">
              {{ rotulo }}
            </option>
          </select>
        </div>

        <CampoMoeda id="bem-valor" v-model="bemValor" rotulo="Valor estimado (R$)" :obrigatorio="true" />

        <div class="campo">
          <label for="bem-data">Data de aquisição (opcional)</label>
          <input id="bem-data" v-model="bemData" type="date" />
        </div>

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="plus" aria-hidden="true" />
          Cadastrar bem
        </button>
      </form>
    </section>

    <section class="panel">
      <h3>Bens</h3>
      <p v-if="bens.length === 0" class="painel-vazio">Nenhum bem cadastrado.</p>

      <div v-else class="tabela-rolagem">
        <table class="tabela-dados">
          <thead>
            <tr>
              <th>Bem</th>
              <th>Tipo</th>
              <th class="num">Valor estimado</th>
              <th>Aquisição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bem in bens" :key="bem.id">
              <td><strong>{{ bem.nome }}</strong></td>
              <td>{{ ROTULOS_TIPOS_BEM[bem.tipo] }}</td>
              <td class="num">{{ formatarMoeda(bem.valorEstimado) }}</td>
              <td>{{ bem.dataAquisicao ? formatarDataBR(bem.dataAquisicao) : '—' }}</td>
              <td>
                <button class="botao-acao botao-excluir" type="button" @click="bemParaExcluir = bem">
                  <font-awesome-icon icon="trash" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h3>Nova dívida</h3>
      <form class="formulario" @submit.prevent="salvarDivida">
        <ul v-if="errosDivida.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosDivida" :key="erro">{{ erro }}</li>
        </ul>

        <div class="campo">
          <label for="div-nome">Nome</label>
          <input id="div-nome" v-model="divNome" type="text" maxlength="80" placeholder="Ex.: Financiamento do carro" required />
        </div>

        <div class="campo">
          <label for="div-tipo">Tipo</label>
          <select id="div-tipo" v-model="divTipo">
            <option v-for="(rotulo, chave) in ROTULOS_TIPOS_DIVIDA" :key="chave" :value="chave">
              {{ rotulo }}
            </option>
          </select>
        </div>

        <CampoMoeda id="div-original" v-model="divValorOriginal" rotulo="Valor original (R$)" :obrigatorio="true" />
        <CampoMoeda id="div-saldo" v-model="divSaldo" rotulo="Saldo devedor atual (R$)" :obrigatorio="true" />

        <div class="campo">
          <label for="div-parcelas">Total de parcelas</label>
          <input id="div-parcelas" v-model.number="divParcelas" type="number" min="1" max="600" required />
        </div>

        <CampoMoeda id="div-valor-parcela" v-model="divValorParcela" rotulo="Valor da parcela (R$)" :obrigatorio="true" />

        <button class="botao-salvar" type="submit">
          <font-awesome-icon icon="plus" aria-hidden="true" />
          Cadastrar dívida
        </button>
      </form>
    </section>

    <section class="panel">
      <h3>Dívidas</h3>
      <p v-if="dividas.length === 0" class="painel-vazio">Nenhuma dívida cadastrada.</p>

      <div v-else class="dividas-lista">
        <article v-for="divida in dividas" :key="divida.id" class="divida-card">
          <header class="divida-topo">
            <div>
              <h4>{{ divida.nome }}</h4>
              <p class="divida-sub">{{ ROTULOS_TIPOS_DIVIDA[divida.tipo] }}</p>
            </div>
            <span
              class="badge"
              :class="divida.saldoDevedor <= 0 ? 'badge-positivo' : 'badge-neutro'"
            >
              {{ divida.saldoDevedor <= 0 ? 'Quitada' : `${parcelasRestantes(divida)} restantes` }}
            </span>
          </header>

          <div class="divida-dados">
            <p>Saldo devedor <strong>{{ formatarMoeda(divida.saldoDevedor) }}</strong></p>
            <p>Parcela <strong>{{ formatarMoeda(divida.valorParcela) }}</strong></p>
            <p>
              Pagas <strong>{{ divida.parcelasPagas }}/{{ divida.parcelasTotal }}</strong>
            </p>
          </div>

          <div class="barra-progresso">
            <div :style="{ width: `${percentualPago(divida)}%` }"></div>
          </div>

          <div class="linha-acoes">
            <button
              class="botao-acao botao-primario"
              type="button"
              :disabled="divida.saldoDevedor <= 0"
              @click="pagarParcela(divida)"
            >
              <font-awesome-icon icon="circle-check" aria-hidden="true" />
              Registrar pagamento
            </button>
            <button class="botao-acao botao-excluir" type="button" @click="dividaParaExcluir = divida">
              <font-awesome-icon icon="trash" aria-hidden="true" />
              Excluir
            </button>
          </div>
        </article>
      </div>
    </section>

    <p class="demo-note">
      Patrimônio estimado localmente — não substitui avaliação contábil.
    </p>

    <ModalConfirmacao
      :visivel="bemParaExcluir !== null"
      titulo="Excluir bem"
      :texto="bemParaExcluir ? `Excluir '${bemParaExcluir.nome}' do patrimônio?` : ''"
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusaoBem"
      @cancelar="bemParaExcluir = null"
    />

    <ModalConfirmacao
      :visivel="dividaParaExcluir !== null"
      titulo="Excluir dívida"
      :texto="dividaParaExcluir ? `Excluir '${dividaParaExcluir.nome}' dos passivos?` : ''"
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusaoDivida"
      @cancelar="dividaParaExcluir = null"
    />
  </div>
</template>

<style scoped>
.resumo-grade {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.resumo-item {
  padding: 16px;
  border: 1px solid var(--color-border-soft);
  border-radius: 12px;
}

.resumo-item.destaque {
  background: var(--color-surface-faint);
}

.resumo-rotulo {
  margin: 0;
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.resumo-valor {
  margin: 8px 0 4px;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.resumo-valor.positivo {
  color: var(--color-primary);
}

.resumo-valor.negativo {
  color: var(--color-danger-dark);
}

.resumo-detalhe {
  margin: 0;
  color: var(--color-muted);
  font-size: 11px;
  line-height: 1.5;
}

.dividas-lista {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.divida-card {
  padding: 18px;
  border: 1px solid var(--color-border-soft);
  border-radius: 13px;
}

.divida-topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.divida-topo h4 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
}

.divida-sub {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 11.5px;
}

.divida-dados {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.divida-dados p {
  margin: 0;
  color: var(--color-muted);
  font-size: 11px;
}

.divida-dados strong {
  display: block;
  margin-top: 4px;
  color: var(--color-text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.divida-card .barra-progresso {
  margin-bottom: 16px;
}

@media (max-width: 700px) {
  .resumo-grade {
    grid-template-columns: 1fr;
  }

  .divida-dados {
    grid-template-columns: 1fr;
  }
}
</style>
