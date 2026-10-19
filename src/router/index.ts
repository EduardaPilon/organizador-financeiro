import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/lancamentos',
      name: 'lancamentos',
      // route level code-splitting (lazy-load ao visitar a rota)
      component: () => import('../views/LancamentosView.vue'),
    },
    {
      // Mantém endereços antigos funcionando.
      path: '/about',
      redirect: '/lancamentos',
    },
    {
      path: '/categorias',
      name: 'categorias',
      component: () => import('../views/CategoriasView.vue'),
    },
    {
      path: '/analise',
      name: 'analise',
      component: () => import('../views/AnaliseView.vue'),
    },
    {
      path: '/contas',
      name: 'contas',
      component: () => import('../views/ContasView.vue'),
    },
    {
      path: '/cartoes',
      name: 'cartoes',
      component: () => import('../views/CartoesView.vue'),
    },
    {
      path: '/compromissos',
      name: 'compromissos',
      component: () => import('../views/CompromissosView.vue'),
    },
    {
      path: '/investimentos',
      name: 'investimentos',
      component: () => import('../views/InvestimentosView.vue'),
    },
    {
      path: '/patrimonio',
      name: 'patrimonio',
      component: () => import('../views/PatrimonioView.vue'),
    },
    {
      path: '/orcamentos',
      name: 'orcamentos',
      component: () => import('../views/OrcamentosView.vue'),
    },
  ],
})

export default router
