<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import {
  ativarSalvamento,
  esquecerDadosLocais,
  erroSalvamento,
  limparTudoNaMemoria,
  salvamentoAtivo,
} from '@/stores/persistencia'
import { notificar } from '@/stores/notificacoes'
import { baixarCopia, lerArquivoCopia, restaurarCopia, type CopiaSeguranca } from '@/utils/backup'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'
import ToastAvisos from '@/components/ui/ToastAvisos.vue'

const avisoPrivacidadeVisivel = ref(true)

/** Menu lateral aberto (só faz sentido em telas pequenas — drawer). */
const menuAberto = ref(false)

const rota = useRoute()

function fecharMenu() {
  menuAberto.value = false
}

function alternarMenu() {
  menuAberto.value = !menuAberto.value
}

/** Esc fecha o drawer; registrado só enquanto o componente existe. */
function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') fecharMenu()
}

onMounted(() => window.addEventListener('keydown', aoTeclar))
onUnmounted(() => window.removeEventListener('keydown', aoTeclar))

// Navegar (link ou botão voltar) sempre fecha o drawer.
watch(() => rota.fullPath, fecharMenu)

// ── Modais de confirmação ───────────────────────────────────
/** Qual modal de confirmação está aberto (null = nenhum). */
const modalAberto = ref<'sessao' | 'esquecer' | null>(null)
/** Cópia lida do arquivo, aguardando confirmação para restaurar. */
const copiaPendente = ref<CopiaSeguranca | null>(null)
const inputCopia = ref<HTMLInputElement | null>(null)

function abrirConfirmacaoSessao() {
  fecharMenu()
  modalAberto.value = 'sessao'
}

function abrirConfirmacaoEsquecer() {
  modalAberto.value = 'esquecer'
}

function textoEncerrarSessao(): string {
  const base =
    'Encerrar a sessão? Todos os dados em memória serão apagados.'
  const local = salvamentoAtivo.value
    ? ' A cópia salva neste navegador também será removida.'
    : ''
  return `${base}${local} Baixe uma cópia de segurança antes, se quiser preservar os dados.`
}

function confirmarEncerrarSessao() {
  modalAberto.value = null
  if (salvamentoAtivo.value) {
    // Sem isso o salvamento automático regravaria estado vazio por cima.
    void esquecerDadosLocais()
  }
  limparTudoNaMemoria()
  notificar('Sessão encerrada. Os dados desta sessão foram apagados.')
}

async function confirmarEsquecerLocais() {
  modalAberto.value = null
  await esquecerDadosLocais()
  notificar(
    'Cópia local apagada. Os dados em memória continuam aqui, mas serão perdidos ao fechar a página.',
    'info',
  )
}

async function ativarSalvamentoLocal() {
  await ativarSalvamento()
  notificar(
    'Salvamento local ativado. Os dados ficam só neste navegador (IndexedDB).',
  )
}

// ── Cópia de segurança (.json) ──────────────────────────────
function pedirArquivoCopia() {
  inputCopia.value?.click()
}

async function aoSelecionarArquivo(evento: Event) {
  const alvo = evento.target as HTMLInputElement
  const arquivo = alvo.files?.[0]
  alvo.value = '' // permite selecionar o mesmo arquivo de novo
  if (!arquivo) return

  try {
    copiaPendente.value = await lerArquivoCopia(arquivo)
  } catch (erro) {
    const mensagem =
      erro instanceof Error ? erro.message : 'Não foi possível ler o arquivo.'
    notificar(mensagem, 'erro')
  }
}

function rotuloEmissao(copia: CopiaSeguranca): string {
  const data = new Date(copia.emitidoEm)
  if (Number.isNaN(data.getTime())) return 'data desconhecida'
  return data.toLocaleString('pt-BR')
}

function confirmarRestauracao() {
  const copia = copiaPendente.value
  copiaPendente.value = null
  if (!copia) return

  const { aplicadas, ignoradas } = restaurarCopia(copia)
  notificar(
    `Cópia restaurada (${aplicadas.length} módulo(s) atualizado(s)).` +
      (ignoradas.length > 0
        ? ` ${ignoradas.length} seção(ões) desconhecida(s) foram ignoradas.`
        : ''),
    'info',
  )
}
</script>

<template>
  <div class="layout">
    <button
      v-show="menuAberto"
      class="overlay-menu"
      type="button"
      aria-label="Fechar menu de navegação"
      @click="fecharMenu"
    ></button>

    <aside id="menu-lateral" class="sidebar" :class="{ 'sidebar-aberta': menuAberto }">
      <div class="brand">
        <div class="brand-icon">
          <font-awesome-icon icon="wallet" aria-hidden="true" />
        </div>
        <span>Meu Financeiro</span>
      </div>

      <nav class="navigation">
        <p class="nav-label">MENU PRINCIPAL</p>

        <RouterLink to="/" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="house" aria-hidden="true" />
          </span>
          Dashboard
        </RouterLink>

        <RouterLink to="/lancamentos" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="arrow-right-arrow-left" aria-hidden="true" />
          </span>
          Lançamentos
        </RouterLink>

        <RouterLink to="/categorias" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="tags" aria-hidden="true" />
          </span>
          Categorias
        </RouterLink>

        <RouterLink to="/analise" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="magnifying-glass-chart" aria-hidden="true" />
          </span>
          Análise de dados
        </RouterLink>

        <p class="nav-label nav-label-secundario">ORGANIZAÇÃO</p>

        <RouterLink to="/contas" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="building-columns" aria-hidden="true" />
          </span>
          Contas
        </RouterLink>

        <RouterLink to="/cartoes" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="credit-card" aria-hidden="true" />
          </span>
          Cartões
        </RouterLink>

        <RouterLink to="/compromissos" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="calendar-check" aria-hidden="true" />
          </span>
          Compromissos
        </RouterLink>

        <p class="nav-label nav-label-secundario">PATRIMÔNIO</p>

        <RouterLink to="/investimentos" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="coins" aria-hidden="true" />
          </span>
          Investimentos
        </RouterLink>

        <RouterLink to="/patrimonio" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="scale-balanced" aria-hidden="true" />
          </span>
          Patrimônio
        </RouterLink>

        <RouterLink to="/orcamentos" class="nav-link" @click="fecharMenu">
          <span class="nav-icon">
            <font-awesome-icon icon="bullseye" aria-hidden="true" />
          </span>
          Orçamentos e metas
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <span class="status-dot"></span>
        Seu dinheiro sob controle
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <button
          class="botao-menu"
          type="button"
          :aria-expanded="menuAberto"
          aria-controls="menu-lateral"
          aria-label="Abrir ou fechar menu de navegação"
          @click="alternarMenu"
        >
          <font-awesome-icon icon="bars" aria-hidden="true" />
        </button>

        <div class="topbar-texto">
          <p class="greeting">ORGANIZAÇÃO FINANCEIRA</p>
          <h1>Meu espaço financeiro</h1>
        </div>

        <button class="botao-encerrar" type="button" @click="abrirConfirmacaoSessao">
          <font-awesome-icon icon="right-from-bracket" aria-hidden="true" />
          Encerrar sessão
        </button>
      </header>

      <div
        v-if="avisoPrivacidadeVisivel"
        class="aviso-privacidade"
        role="note"
      >
        <span class="aviso-selo">Privacidade</span>

        <div class="aviso-corpo">
          <template v-if="!salvamentoAtivo">
            <p>
              Seus dados ficam <strong>só na memória desta página</strong> e
              <strong>não são salvos automaticamente</strong>. Ao fechar ou
              atualizar, tudo é perdido. Ative o salvamento local abaixo ou
              exporte uma cópia (Excel/CSV/JSON).
            </p>
          </template>
          <template v-else>
            <p>
              Salvamento local <strong>ativo</strong>: os dados ficam
              <strong>apenas neste navegador</strong> (IndexedDB), com o seu
              consentimento, e <strong>nada é enviado pela internet</strong>.
              Fechar ou atualizar a página não perde os dados. Você pode apagar
              a cópia a qualquer momento.
            </p>
          </template>

          <p v-if="erroSalvamento" class="aviso-erro-salvamento" role="alert">
            {{ erroSalvamento }}
          </p>

          <div class="aviso-acoes">
            <button
              v-if="!salvamentoAtivo"
              class="botao-acao botao-primario"
              type="button"
              @click="ativarSalvamentoLocal"
            >
              <font-awesome-icon icon="database" aria-hidden="true" />
              Ativar salvamento local
            </button>

            <button
              v-else
              class="botao-acao botao-excluir"
              type="button"
              @click="abrirConfirmacaoEsquecer"
            >
              <font-awesome-icon icon="trash" aria-hidden="true" />
              Esquecer dados locais
            </button>

            <button class="botao-acao" type="button" @click="baixarCopia">
              <font-awesome-icon icon="download" aria-hidden="true" />
              Baixar cópia (.json)
            </button>

            <button class="botao-acao" type="button" @click="pedirArquivoCopia">
              <font-awesome-icon icon="upload" aria-hidden="true" />
              Restaurar cópia
            </button>

            <input
              ref="inputCopia"
              class="campo-oculto"
              type="file"
              accept="application/json,.json"
              aria-label="Selecionar arquivo de cópia de segurança (.json)"
              @change="aoSelecionarArquivo"
            />
          </div>
        </div>

        <button
          class="aviso-fechar"
          type="button"
          aria-label="Fechar aviso de privacidade"
          @click="avisoPrivacidadeVisivel = false"
        >
          <font-awesome-icon icon="xmark" aria-hidden="true" />
        </button>
      </div>

      <section class="page-content">
        <RouterView />
      </section>
    </main>

    <ToastAvisos />

    <ModalConfirmacao
      :visivel="modalAberto === 'sessao'"
      titulo="Encerrar sessão"
      :texto="textoEncerrarSessao()"
      rotulo-confirmar="Encerrar"
      @confirmar="confirmarEncerrarSessao"
      @cancelar="modalAberto = null"
    />

    <ModalConfirmacao
      :visivel="modalAberto === 'esquecer'"
      titulo="Esquecer dados locais"
      texto="Apagar a cópia salva neste navegador? Os dados em memória continuam disponíveis nesta aba, mas serão perdidos ao fechar ou atualizar a página."
      rotulo-confirmar="Apagar cópia"
      @confirmar="confirmarEsquecerLocais"
      @cancelar="modalAberto = null"
    />

    <ModalConfirmacao
      :visivel="copiaPendente !== null"
      titulo="Restaurar cópia de segurança"
      :texto="
        copiaPendente
          ? `Substituir os dados atuais pela cópia emitida em ${rotuloEmissao(copiaPendente)}? Os módulos presentes na cópia serão substituídos.`
          : ''
      "
      rotulo-confirmar="Restaurar"
      @confirmar="confirmarRestauracao"
      @cancelar="copiaPendente = null"
    />
  </div>
</template>

<style>
:root {
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-background);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-optical-sizing: auto;
  font-weight: 400;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select {
  font: inherit;
}

.layout {
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  position: fixed;
  inset: 0 auto 0 0;
  display: flex;
  flex-direction: column;
  padding: 32px 20px 24px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.6px;
}

.brand-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 12px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 17px;
}

.navigation {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 56px;
}

.nav-label,
.greeting {
  margin: 0;
  color: var(--color-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.3px;
}

.nav-label {
  padding: 0 12px;
  margin-bottom: 12px;
}

.nav-label-secundario {
  margin-top: 26px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 12px;
  border-radius: 10px;
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  background: var(--color-secondary-soft);
  color: var(--color-secondary);
}

/* Marcador teal do item ativo: a 5ª cor aparece na estrutura do app. */
.nav-link.router-link-exact-active {
  box-shadow: inset 3px 0 0 var(--color-accent);
  font-weight: 600;
}

.nav-link:focus-visible {
  background: var(--color-secondary-soft);
  color: var(--color-secondary);
  outline: 2px solid var(--color-secondary);
  outline-offset: 2px;
}

.nav-icon {
  display: grid;
  width: 22px;
  flex-shrink: 0;
  place-items: center;
  font-size: 15px;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: auto;
  padding: 16px 8px 0;
  color: var(--color-muted);
  font-size: 11px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
}

.main-content {
  min-height: 100vh;
  margin-left: 250px;
  padding: 0 40px 40px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 32px 0;
  border-bottom: 1px solid var(--color-border);
}

.topbar-texto {
  min-width: 0;
}

.greeting {
  margin-bottom: 8px;
  color: var(--color-secondary);
}

.topbar h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(20px, 3vw, 25px);
  font-weight: 800;
  letter-spacing: -1px;
}

/* Botão do menu (hambúrguer): só existe em telas pequenas. */
.botao-menu {
  display: none;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-secondary);
  font-size: 16px;
  cursor: pointer;
}

.botao-menu:focus-visible {
  outline: 2px solid var(--color-secondary);
  outline-offset: 2px;
}

/* Fundo escurecido atrás do drawer (nunca visível no desktop). */
.overlay-menu {
  display: none;
}

.botao-encerrar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-height: 38px;
  padding: 8px 14px;
  border: 1px solid var(--color-danger-border);
  border-radius: 9px;
  background: var(--color-surface);
  color: var(--color-danger-dark);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.botao-encerrar:hover {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}

.botao-encerrar:focus-visible {
  border-color: var(--color-danger);
  outline: 2px solid var(--color-danger);
  outline-offset: 2px;
}

.aviso-privacidade {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-top: 24px;
  padding: 14px 16px;
  border: 1px solid var(--color-border-soft);
  border-radius: 12px;
  background: var(--color-surface-faint);
}

.aviso-selo {
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--color-secondary-soft);
  color: var(--color-secondary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.aviso-corpo {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.aviso-privacidade p {
  margin: 0;
  color: var(--color-muted);
  font-size: 12.5px;
  line-height: 1.55;
}

.aviso-erro-salvamento {
  color: var(--color-danger-dark) !important;
  font-weight: 600;
}

.aviso-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Input de arquivo invisível, acessado programaticamente. */
.campo-oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.aviso-fechar {
  display: grid;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-muted);
  font-size: 14px;
  cursor: pointer;
}

.aviso-fechar:hover {
  background: var(--color-border-soft);
  color: var(--color-text);
}

.page-content {
  padding-top: 32px;
}

/* ── Telas pequenas: sidebar vira drawer lateral ─────────────── */
@media (max-width: 760px) {
  .sidebar {
    z-index: 30;
    width: 270px;
    max-width: 82vw;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .sidebar-aberta {
    transform: translateX(0);
    box-shadow: 8px 0 28px rgba(36, 51, 44, 0.18);
  }

  .overlay-menu {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 20;
    border: 0;
    background: rgba(36, 51, 44, 0.45);
    cursor: pointer;
  }

  .navigation {
    margin-top: 28px;
  }

  .main-content {
    margin-left: 0;
    padding: 0 20px 28px;
  }

  .topbar {
    align-items: flex-start;
    padding: 24px 0;
  }

  .botao-menu {
    display: grid;
  }

  .aviso-privacidade {
    flex-wrap: wrap;
  }
}

@media (max-width: 430px) {
  .botao-encerrar {
    font-size: 0;
    gap: 0;
    padding: 8px 12px;
  }

  .botao-encerrar svg {
    font-size: 14px;
  }
}

/* Acessibilidade: quem prefere menos movimento recebe menu sem transição. */
@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
</style>
