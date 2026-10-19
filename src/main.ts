import './styles/tokens.css'
import './assets/main.css'
import './assets/componentes.css'

import { createApp } from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowRightArrowLeft,
  faArrowsLeftRight,
  faArrowTrendDown,
  faArrowTrendUp,
  faBars,
  faBullseye,
  faCalendarCheck,
  faChartLine,
  faChartPie,
  faCircleCheck,
  faCircleInfo,
  faCoins,
  faCreditCard,
  faDatabase,
  faDollarSign,
  faBuildingColumns,
  faDownload,
  faFileExcel,
  faHouse,
  faMagnifyingGlassChart,
  faPencil,
  faPlus,
  faRightFromBracket,
  faScaleBalanced,
  faTags,
  faTrash,
  faTriangleExclamation,
  faUpload,
  faWallet,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

import App from './App.vue'
import router from './router'
import { iniciarPersistencia } from '@/stores/persistencia'

// Registra TODOS os stores na camada de persistência desde o início, para que
// o salvamento local e as cópias (.json) incluam dados de módulos ainda não
// visitados nesta sessão. Também garante que a hidratação não dependa de navegar.
import '@/stores/lancamentos'
import '@/stores/categorias'
import '@/stores/contas'
import '@/stores/cartoes'
import '@/stores/compromissos'
import '@/stores/investimentos'
import '@/stores/patrimonio'
import '@/stores/orcamentos'

// Ícones da interface (Font Awesome Free Solid).
// Só estes entram no bundle — o restante da biblioteca é descartado.
library.add(
  faArrowRightArrowLeft,
  faArrowsLeftRight,
  faArrowTrendDown,
  faArrowTrendUp,
  faBars,
  faBullseye,
  faBuildingColumns,
  faCalendarCheck,
  faChartLine,
  faChartPie,
  faCircleCheck,
  faCircleInfo,
  faCoins,
  faCreditCard,
  faDatabase,
  faDollarSign,
  faDownload,
  faFileExcel,
  faHouse,
  faMagnifyingGlassChart,
  faPencil,
  faPlus,
  faRightFromBracket,
  faScaleBalanced,
  faTags,
  faTrash,
  faTriangleExclamation,
  faUpload,
  faWallet,
  faXmark,
)

// Limpeza única de legado: versões anteriores deste app salvavam os
// lançamentos no localStorage. A partir de agora nada é persistido
// automaticamente; esta linha apenas REMOVE a chave antiga.
try {
  localStorage.removeItem('lancamentos')
} catch {
  // Ambiente sem acesso a storage: nada a fazer.
}

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)

app.mount('#app')

// Hidrata a cópia local salva (IndexedDB) APENAS se o consentimento
// estiver ativo — sem consentimento, o banco nem é aberto.
void iniciarPersistencia()
