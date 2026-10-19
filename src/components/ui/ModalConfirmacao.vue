<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

/**
 * Diálogo de confirmação acessível:
 * - role="dialog" + aria-modal, foco inicial no botão de confirmar,
 * - fecha com Esc ou clique fora, e devolve o foco ao elemento anterior.
 */
const props = withDefaults(
  defineProps<{
    visivel: boolean
    titulo: string
    texto: string
    rotuloConfirmar?: string
    rotuloCancelar?: string
    perigo?: boolean
  }>(),
  {
    rotuloConfirmar: 'Confirmar',
    rotuloCancelar: 'Cancelar',
    perigo: true,
  },
)

const emit = defineEmits<{ confirmar: []; cancelar: [] }>()

const botaoConfirmar = ref<HTMLButtonElement | null>(null)
let focoAnterior: HTMLElement | null = null

watch(
  () => props.visivel,
  async (aberto) => {
    if (aberto) {
      focoAnterior = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', aoTeclar)
      await nextTick()
      botaoConfirmar.value?.focus()
    } else {
      document.removeEventListener('keydown', aoTeclar)
      focoAnterior?.focus()
    }
  },
  // immediate: se o modal já nascer aberto, o Esc e o foco inicial
  // precisam funcionar desde o primeiro instante.
  { immediate: true },
)

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') emit('cancelar')
}

onUnmounted(() => document.removeEventListener('keydown', aoTeclar))
</script>

<template>
  <Teleport to="body">
    <div v-if="visivel" class="modal-overlay" @click.self="emit('cancelar')">
      <div
        class="modal-caixa"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'modal-titulo'"
        :aria-describedby="'modal-texto'"
      >
        <h2 id="modal-titulo" class="modal-titulo">{{ titulo }}</h2>
        <p id="modal-texto" class="modal-texto">{{ texto }}</p>

        <div class="modal-acoes">
          <button
            class="botao-secundario"
            type="button"
            @click="emit('cancelar')"
          >
            {{ rotuloCancelar }}
          </button>
          <button
            ref="botaoConfirmar"
            class="botao-confirmar"
            :class="{ perigo }"
            type="button"
            @click="emit('confirmar')"
          >
            {{ rotuloConfirmar }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(36, 51, 44, 0.5);
}

.modal-caixa {
  width: min(420px, 100%);
  padding: 24px;
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: 0 18px 48px rgba(36, 51, 44, 0.25);
}

.modal-titulo {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
}

.modal-texto {
  margin: 0;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.6;
}

.modal-acoes {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.botao-confirmar {
  min-height: 40px;
  padding: 9px 16px;
  border: 0;
  border-radius: 9px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.botao-confirmar.perigo {
  background: var(--color-danger);
}

.botao-confirmar:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

@media (max-width: 430px) {
  .modal-acoes {
    flex-direction: column-reverse;
  }

  .modal-acoes button {
    width: 100%;
  }
}
</style>
