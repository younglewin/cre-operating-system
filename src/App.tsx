import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
