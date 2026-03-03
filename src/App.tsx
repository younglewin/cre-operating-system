import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import CompsPage from './pages/CompsPage'
import PricingPage from './pages/PricingPage'
import ExchangePage from './pages/ExchangePage'
import DashboardPage from './pages/DashboardPage'
import UnderwritingPage from './pages/UnderwritingPage'
// Phase 2 — Marketing & Funnels
import OMGeneratorPage from './pages/OMGeneratorPage'
import FunnelBuilderPage from './pages/FunnelBuilderPage'
import PostcardPage from './pages/PostcardPage'
import EmailMarketingPage from './pages/EmailMarketingPage'
// Phase 3 — CRM & Pipeline
import ContactsPage from './pages/ContactsPage'
import DealsPage from './pages/DealsPage'
import InboxPage from './pages/InboxPage'
import BuyerMatchPage from './pages/BuyerMatchPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {/* Phase 1 */}
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="comps"        element={<CompsPage />} />
          <Route path="underwriting" element={<UnderwritingPage />} />
          <Route path="pricing"      element={<PricingPage />} />
          <Route path="exchange"     element={<ExchangePage />} />
          {/* Phase 2 */}
          <Route path="om-generator" element={<OMGeneratorPage />} />
          <Route path="funnel"       element={<FunnelBuilderPage />} />
          <Route path="postcards"    element={<PostcardPage />} />
          <Route path="email"        element={<EmailMarketingPage />} />
          {/* Phase 3 */}
          <Route path="contacts"     element={<ContactsPage />} />
          <Route path="deals"        element={<DealsPage />} />
          <Route path="inbox"        element={<InboxPage />} />
          <Route path="buyer-match"  element={<BuyerMatchPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
