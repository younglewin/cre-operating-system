import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import CompsPage from './pages/CompsPage'
import PricingPage from './pages/PricingPage'
import ExchangePage from './pages/ExchangePage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="comps" element={<CompsPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="exchange" element={<ExchangePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
