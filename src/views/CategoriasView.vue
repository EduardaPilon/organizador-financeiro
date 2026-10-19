<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  COR_DO_GRUPO,
  ORDEM_GRUPOS,
  ROTULOS_GRUPOS,
  adicionarCategoria,
  adicionarSubcategoria,
  alternarAtivaCategoria,
  atualizarCategoria,
  categorias,
  obterCategoria,
  removerCategoria,
  removerSubcategoria,
  renomearSubcategoria,
  type Categoria,
  type GrupoCategoria,
} from '@/stores/categorias'
import { usarLancamentos } from '@/stores/lancamentos'
import { notificar } from '@/stores/notificacoes'
import { validarTextoObrigatorio } from '@/utils/validacao'
import ModalConfirmacao from '@/components/ui/ModalConfirmacao.vue'

const { lancamentos } = usarLancamentos()

const gruposVisiveis = ORDEM_GRUPOS

const iconeSugestoes = ['💼', '💰', '🛒', '🏠', '🚗', '🍔', '🎮', '📈', '🏷️', '✨']

// ── Formulário de nova categoria ────────────────────────────
const novoNome = ref('')
const novaCor = ref<string>(COR_DO_GRUPO.despesa_pessoal)
const novoIcone = ref('🏷️')
const novoGrupo = ref<GrupoCategoria>('despesa_pessoal')
const errosCriacao = ref<string[]>([])

function criarCategoria() {
  const erros = validarTextoObrigatorio(novoNome.value, 'O nome da categoria')
  if (erros.length > 0) {
    errosCriacao.value = erros
    return
  }

  errosCriacao.value = []
  adicionarCategoria({
    nome: novoNome.value.trim(),
    cor: novaCor.value,
    icone: novoIcone.value.trim() || '🏷️',
    grupo: novoGrupo.value,
  })

  notificar('Categoria criada.')
  novoNome.value = ''
  novoIcone.value = '🏷️'
}

// ── Edição inline ───────────────────────────────────────────
const emEdicao = ref<string | null>(null)
const edicaoNome = ref('')
const edicaoCor = ref<string>(COR_DO_GRUPO.despesa_pessoal)
const edicaoIcone = ref('')

function iniciarEdicao(categoria: Categoria) {
  emEdicao.value = categoria.id
  edicaoNome.value = categoria.nome
  edicaoCor.value = categoria.cor
  edicaoIcone.value = categoria.icone
}

function cancelarEdicao() {
  emEdicao.value = null
}

function salvarEdicao(categoriaId: string) {
  if (!edicaoNome.value.trim()) {
    notificar('Informe um nome para a categoria.', 'erro')
    return
  }

  atualizarCategoria(categoriaId, {
    nome: edicaoNome.value.trim(),
    cor: edicaoCor.value,
    icone: edicaoIcone.value,
  })

  emEdicao.value = null
  notificar('Categoria atualizada.')
}

// ── Exclusão e ativação ─────────────────────────────────────
const exclusaoPendente = ref<Categoria | null>(null)

function pedirExclusao(categoria: Categoria) {
  const emUso = lancamentos.value.some(
    (lancamento) => lancamento.categoriaId === categoria.id,
  )

  if (emUso) {
    notificar(
      `A categoria "${categoria.nome}" está em uso por lançamentos. ` +
        'Desative-a para escondê-la sem perder os vínculos.',
      'erro',
    )
    return
  }

  exclusaoPendente.value = categoria
}

function confirmarExclusao() {
  const alvo = exclusaoPendente.value
  if (!alvo) return

  removerCategoria(alvo.id)
  exclusaoPendente.value = null
  notificar(`Categoria "${alvo.nome}" excluída.`)
}

function alternarAtiva(categoria: Categoria) {
  alternarAtivaCategoria(categoria.id)
}

// ── Subcategorias ───────────────────────────────────────────
const categoriaAberta = ref<string | null>(null)
const novaSubcategoria = ref<Record<string, string>>({})
const subEdicao = ref<string | null>(null)
const subEdicaoNome = ref('')
const subExclusaoPendente = ref<{
  categoriaId: string
  subId: string
  nome: string
} | null>(null)

function alternarSecaoSubcategorias(categoriaId: string) {
  categoriaAberta.value = categoriaAberta.value === categoriaId ? null : categoriaId
}

function criarSubcategoria(categoriaId: string) {
  const nome = (novaSubcategoria.value[categoriaId] ?? '').trim()
  if (!nome) {
    notificar('Informe um nome para a subcategoria.', 'erro')
    return
  }

  adicionarSubcategoria(categoriaId, nome)
  novaSubcategoria.value[categoriaId] = ''
  notificar('Subcategoria criada.')
}

function iniciarEdicaoSub(subId: string, nomeAtual: string) {
  subEdicao.value = subId
  subEdicaoNome.value = nomeAtual
}

function salvarEdicaoSub(categoriaId: string, subId: string) {
  if (!subEdicaoNome.value.trim()) {
    notificar('Informe um nome para a subcategoria.', 'erro')
    return
  }

  renomearSubcategoria(categoriaId, subId, subEdicaoNome.value.trim())
  subEdicao.value = null
  notificar('Subcategoria renomeada.')
}

function pedirExclusaoSub(categoriaId: string, subId: string, subNome: string) {
  subExclusaoPendente.value = { categoriaId, subId, nome: subNome }
}

function confirmarExclusaoSub() {
  const alvo = subExclusaoPendente.value
  if (!alvo) return

  removerSubcategoria(alvo.categoriaId, alvo.subId)
  subExclusaoPendente.value = null
  notificar('Subcategoria removida.')
}

function cancelarExclusaoSub() {
  subExclusaoPendente.value = null
}

function categoriasDoGrupo(grupo: GrupoCategoria): Categoria[] {
  return categorias.value.filter((categoria) => categoria.grupo === grupo)
}
</script>

<template>
  <div class="categorias-pagina">
    <section class="page-heading">
      <div>
        <p class="eyebrow">PERSONALIZAÇÃO</p>
        <h2>Categorias e subcategorias</h2>
        <p class="subtitle">
          Organize suas receitas, despesas e investimentos com cores e ícones.
        </p>
      </div>
    </section>

    <section class="panel">
      <h3>Nova categoria</h3>
      <p class="panel-description">Adicione uma categoria personalizada.</p>

      <form class="formulario-nova" @submit.prevent="criarCategoria">
        <ul v-if="errosCriacao.length > 0" class="formulario-erros" role="alert">
          <li v-for="erro in errosCriacao" :key="erro">{{ erro }}</li>
        </ul>
        <div class="campo">
          <label for="nova-nome">Nome</label>
          <input
            id="nova-nome"
            v-model="novoNome"
            type="text"
            placeholder="Ex.: Bicicletaria"
            required
          />
        </div>

        <div class="campo campo-estreito">
          <label for="nova-cor">Cor</label>
          <input id="nova-cor" v-model="novaCor" type="color" />
        </div>

        <div class="campo campo-estreito">
          <label for="nova-icone">Ícone</label>
          <input
            id="nova-icone"
            v-model="novoIcone"
            type="text"
            maxlength="4"
            placeholder="🏷️"
          />
          <div class="sugestoes-icone">
            <button
              v-for="icone in iconeSugestoes"
              :key="icone"
              type="button"
              class="icone-sugestao"
              @click="novoIcone = icone"
            >
              {{ icone }}
            </button>
          </div>
        </div>

        <div class="campo">
          <label for="novo-grupo">Grupo</label>
          <select id="novo-grupo" v-model="novoGrupo">
            <option
              v-for="grupo in gruposVisiveis"
              :key="grupo"
              :value="grupo"
            >
              {{ ROTULOS_GRUPOS[grupo] }}
            </option>
          </select>
        </div>

        <button class="botao-salvar" type="submit">Adicionar categoria</button>
      </form>
    </section>

    <section
      v-for="grupo in gruposVisiveis"
      :key="grupo"
      class="panel"
    >
      <h3>
        <span
          class="grupo-bolinha"
          :style="{ background: COR_DO_GRUPO[grupo] }"
        ></span>
        {{ ROTULOS_GRUPOS[grupo] }}
      </h3>

      <div
        v-for="categoria in categoriasDoGrupo(grupo)"
        :key="categoria.id"
        class="categoria-linha"
        :class="{ inativa: !categoria.ativa }"
      >
        <!-- Modo visualização -->
        <template v-if="emEdicao !== categoria.id">
          <div class="categoria-info">
            <span class="categoria-selo" :style="{ background: categoria.cor }">
              {{ categoria.icone }}
            </span>
            <div>
              <strong>{{ categoria.nome }}</strong>
              <p class="detalhe-categoria">
                {{ categoria.subcategorias.length }} subcategoria(s)
                <span v-if="!categoria.ativa" class="badge-inativa">inativa</span>
              </p>
            </div>
          </div>

          <div class="categoria-acoes">
            <button
              type="button"
              class="botao-acao"
              @click="alternarSecaoSubcategorias(categoria.id)"
            >
              Subcategorias
            </button>
            <button
              type="button"
              class="botao-acao"
              @click="iniciarEdicao(categoria)"
            >
              Editar
            </button>
            <button
              type="button"
              class="botao-acao"
              @click="alternarAtiva(categoria)"
            >
              {{ categoria.ativa ? 'Desativar' : 'Ativar' }}
            </button>
            <button
              type="button"
              class="botao-acao botao-excluir"
              @click="pedirExclusao(categoria)"
            >
              Excluir
            </button>
          </div>

          <!-- Painel de subcategorias -->
          <div
            v-if="categoriaAberta === categoria.id"
            class="subcategorias-painel"
          >
            <div
              v-for="sub in categoria.subcategorias"
              :key="sub.id"
              class="subcategoria-linha"
            >
              <template v-if="subEdicao !== sub.id">
                <span class="subcategoria-nome">{{ sub.nome }}</span>
                <div class="categoria-acoes">
                  <button
                    type="button"
                    class="botao-acao"
                    @click="iniciarEdicaoSub(sub.id, sub.nome)"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    class="botao-acao botao-excluir"
                    @click="pedirExclusaoSub(categoria.id, sub.id, sub.nome)"
                  >
                    Remover
                  </button>
                </div>
              </template>

              <template v-else>
                <input
                  v-model="subEdicaoNome"
                  type="text"
                  class="input-subedicao"
                  @keyup.enter="salvarEdicaoSub(categoria.id, sub.id)"
                />
                <div class="categoria-acoes">
                  <button
                    type="button"
                    class="botao-acao"
                    @click="salvarEdicaoSub(categoria.id, sub.id)"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    class="botao-acao"
                    @click="subEdicao = null"
                  >
                    Cancelar
                  </button>
                </div>
              </template>
            </div>

            <p
              v-if="categoria.subcategorias.length === 0"
              class="painel-vazio"
            >
              Nenhuma subcategoria cadastrada.
            </p>

            <form
              class="form-subcategoria"
              @submit.prevent="criarSubcategoria(categoria.id)"
            >
              <input
                v-model="novaSubcategoria[categoria.id]"
                type="text"
                placeholder="Nova subcategoria"
              />
              <button type="submit" class="botao-acao">Adicionar</button>
            </form>
          </div>
        </template>

        <!-- Modo edição -->
        <template v-else>
          <div class="categoria-edicao">
            <input
              v-model="edicaoNome"
              type="text"
              class="input-edicao-nome"
              placeholder="Nome"
            />
            <input v-model="edicaoCor" type="color" class="input-edicao-cor" />
            <input
              v-model="edicaoIcone"
              type="text"
              maxlength="4"
              class="input-edicao-icone"
              placeholder="🏷️"
            />
          </div>

          <div class="categoria-acoes">
            <button
              type="button"
              class="botao-acao botao-primario"
              @click="salvarEdicao(categoria.id)"
            >
              Salvar
            </button>
            <button
              type="button"
              class="botao-acao"
              @click="cancelarEdicao"
            >
              Cancelar
            </button>
          </div>
        </template>
      </div>

      <p
        v-if="categoriasDoGrupo(grupo).length === 0"
        class="painel-vazio"
      >
        Nenhuma categoria neste grupo.
      </p>
    </section>

    <p class="demo-note">
      Categorias definidas por você — o armazenamento segue o modo de
      privacidade escolhido no topo da página.
    </p>

    <ModalConfirmacao
      :visivel="exclusaoPendente !== null"
      titulo="Excluir categoria"
      :texto="
        exclusaoPendente
          ? `Excluir definitivamente a categoria '${exclusaoPendente.nome}'?`
          : ''
      "
      rotulo-confirmar="Excluir"
      @confirmar="confirmarExclusao"
      @cancelar="exclusaoPendente = null"
    />

    <ModalConfirmacao
      :visivel="subExclusaoPendente !== null"
      titulo="Remover subcategoria"
      :texto="
        subExclusaoPendente
          ? `Remover a subcategoria '${subExclusaoPendente.nome}'?`
          : ''
      "
      rotulo-confirmar="Remover"
      @confirmar="confirmarExclusaoSub"
      @cancelar="cancelarExclusaoSub"
    />
  </div>
</template>

<style scoped>
.categorias-pagina {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.page-heading h2 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(22px, 4vw, 28px);
  font-weight: 800;
}

.subtitle,
.panel-description {
  color: var(--color-muted);
  font-size: 14px;
}

.panel {
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  background: var(--color-surface);
}

.panel h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}

.grupo-bolinha {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.panel-description {
  margin-bottom: 24px;
}

.formulario-nova {
  display: grid;
  grid-template-columns: 2fr 1fr 1.4fr 1.6fr auto;
  gap: 16px;
  align-items: end;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.campo label {
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
}

.campo input,
.campo select {
  width: 100%;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface);
  color: var(--color-text);
}

.campo input[type='color'] {
  padding: 4px;
  cursor: pointer;
}

.campo input:focus,
.campo select:focus {
  outline: 2px solid var(--color-focus);
  border-color: var(--color-primary);
}

.sugestoes-icone {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.icone-sugestao {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  background: var(--color-surface);
  font-size: 14px;
  cursor: pointer;
}

.icone-sugestao:hover {
  background: var(--color-primary-soft);
}

.botao-salvar {
  min-height: 42px;
  padding: 10px 16px;
  border: 0;
  border-radius: 9px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.botao-salvar:hover {
  background: var(--color-primary-dark);
}

.categoria-linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border-soft);
}

.categoria-linha:last-of-type {
  border-bottom: 0;
}

.categoria-linha.inativa {
  opacity: 0.55;
}

.categoria-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.categoria-info strong {
  font-size: 14px;
}

.categoria-selo {
  display: grid;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 11px;
  font-size: 18px;
}

.detalhe-categoria {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

.badge-inativa {
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--color-danger-soft);
  color: var(--color-danger-dark);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.categoria-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.botao-acao {
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.botao-acao:hover {
  border-color: var(--color-focus);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.botao-primario {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.botao-primario:hover {
  background: var(--color-primary-dark);
  color: var(--color-on-primary);
}

.botao-excluir:hover {
  border-color: var(--color-danger-border);
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.categoria-edicao {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.input-edicao-nome {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
}

.input-edicao-cor {
  width: 44px;
  height: 40px;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface);
  cursor: pointer;
}

.input-edicao-icone {
  width: 64px;
  min-height: 40px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  text-align: center;
}

.input-edicao-nome:focus,
.input-edicao-icone:focus,
.input-subedicao:focus,
.form-subcategoria input:focus {
  outline: 2px solid var(--color-focus);
  border-color: var(--color-primary);
}

.subcategorias-painel {
  flex-basis: 100%;
  width: 100%;
  margin-top: 4px;
  padding: 16px;
  border: 1px dashed var(--color-border);
  border-radius: 11px;
  background: var(--color-surface-faint);
}

.subcategoria-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}

.subcategoria-nome {
  color: var(--color-muted);
  font-size: 13px;
}

.input-subedicao {
  flex: 1;
  max-width: 280px;
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.form-subcategoria {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.form-subcategoria input {
  flex: 1;
  max-width: 280px;
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.painel-vazio {
  margin: 12px 0 0;
  color: var(--color-muted);
  font-size: 13px;
}

.demo-note {
  margin: 0;
  color: var(--color-muted);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 900px) {
  .formulario-nova {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .formulario-nova {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 18px;
  }

  .categoria-linha {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
