import { lazy } from 'react'
import { Wrench } from 'lucide-react'

export default {
  routes: [{ path: '', component: lazy(() => import('./ServicePage.jsx')) }],
  nav: [{ to: '', labelKey: 'nav', Icon: Wrench }],
}
