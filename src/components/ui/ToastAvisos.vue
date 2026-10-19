<script setup lang="ts">
import { dispensarAviso, usarNotificacoes, type TipoAviso } from '@/stores/notificacoes'

const { avisos } = usarNotificacoes()

const ICONES: Record<TipoAviso, string> = {
  sucesso: 'circle-check',
  erro: 'triangle-exclamation',
  info: 'circle-info',
}

const ROTULOS: Record<TipoAviso, string> = {
  sucesso: 'Sucesso',
  erro: 'Erro',
  info: 'Informação',
}
</script>

<template>
  <div class="pilha-avisos" role="status" aria-live="polite" aria-atomic="false">
    <div
      v-for="aviso in avisos"
      :key="aviso.id"
      class="aviso-toast"
      :class="aviso.tipo"
    >
      <font-awesome-icon :icon="ICONES[aviso.tipo]" aria-hidden="true" />
      <span class="aviso-rotulo">{{ ROTULOS[aviso.tipo] }}</span>
      <span class="aviso-texto">{{ aviso.texto }}</span>
      <button
        class="aviso-fechar-toast"
        type="button"
        aria-label="Dispensar aviso"
        @click="dispensarAviso(aviso.id)"
      >
        <font-awesome-icon icon="xmark" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pilha-avisos {
  position: fixed;
  z-index: 60;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(340px, calc(100vw - 32px));
  pointer-events: none;
}

.aviso-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-left-width: 4px;
  border-radius: 10px;
  background: var(--color-surface);
  box-shadow: 0 6px 20px rgba(36, 51, 44, 0.14);
  font-size: 13px;
  pointer-events: auto;
}

.aviso-toast.sucesso {
  border-left-color: var(--color-primary);
  color: var(--color-primary);
}

.aviso-toast.erro {
  border-left-color: var(--color-danger);
  color: var(--color-danger);
}

.aviso-toast.info {
  border-left-color: var(--color-secondary);
  color: var(--color-secondary);
}

.aviso-rotulo {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.8px;
  padding-top: 2px;
}

.aviso-texto {
  flex: 1;
  min-width: 0;
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.aviso-fechar-toast {
  display: grid;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-muted);
  font-size: 12px;
  cursor: pointer;
}

.aviso-fechar-toast:hover {
  background: var(--color-background);
  color: var(--color-text);
}
</style>
