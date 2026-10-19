<script setup lang="ts">
import FormularioLancamento from '@/components/lancamentos/FormularioLancamento.vue'
import ListaLancamentos from '@/components/lancamentos/ListaLancamentos.vue'
</script>

<template>
  <div class="lancamentos">
    <section class="page-heading">
      <div>
        <p class="eyebrow">ORGANIZAÇÃO FINANCEIRA</p>
        <h2>Meus lançamentos</h2>
        <p class="subtitle">Registre suas receitas e despesas.</p>
      </div>
    </section>

    <FormularioLancamento />
    <ListaLancamentos />
  </div>
</template>

<style scoped>
.lancamentos {
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

.subtitle {
  color: var(--color-muted);
  font-size: 14px;
}
</style>
