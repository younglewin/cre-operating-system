import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  TrendingUp,
  RefreshCw,
  Building2,
  ChevronRight,
  Calculator,
  FileText,
  Funnel,
  Mail,
  Printer,
  Users,
  Briefcase,
  Inbox,
  Target,
  FileUp,
  Webhook,
} from 'lucide-react'

const PHASE1_NAV = [
  { path: '/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/comps',        label: 'Deal Engine',    icon: Map },
  { path: '/underwriting', label: 'Underwriting',   icon: Calculator },
  { path: '/pricing',      label: 'Pricing Matrix', icon: TrendingUp },
  { path: '/exchange',     label: '1031 Exchange',  icon: RefreshCw },
]

const PHASE2_NAV = [
  { path: '/om-generator', label: 'OM / BOV Generator', icon: FileText },
  { path: '/funnel',       label: 'E-NDA Funnel',        icon: Funnel },
  { path: '/postcards',    label: 'Direct Mail',          icon: Printer },
  { path: '/email',        label: 'Email Marketing',      icon: Mail },
]

const PHASE3_NAV = [
  { path: '/contacts',     label: 'Contacts',       icon: Users },
  { path: '/deals',        label: 'Deal Pipeline',  icon: Briefcase },
  { path: '/inbox',        label: 'Unified Inbox',  icon: Inbox },
  { path: '/buyer-match',  label: 'Buyer Match',    icon: Target },
  { path: '/comp-ingest',  label: 'Comp Ingestion', icon: FileUp },
  { path: '/webhook',      label: 'Zapier Webhook', icon: Webhook },
]

const ALL_NAV = [...PHASE1_NAV, ...PHASE2_NAV, ...PHASE3_NAV]

export default function Layout() {
  const location = useLocation()

  const getPageTitle = () => {
    const item = ALL_NAV.find(n => location.pathname.startsWith(n.path))
    return item?.label ?? 'CRE OS'
  }

  const NavItem = ({ path, label, icon: Icon }: { path: string; label: string; icon: React.ElementType }) => (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 text-xs font-medium transition-all duration-150 ${
          isActive ? 'text-white' : 'text-gray-400 hover:text-white'
        }`
      }
      style={({ isActive }) =>
        isActive
          ? { backgroundColor: 'rgba(197,150,58,0.15)', borderLeft: '3px solid #C5963A', paddingLeft: '9px' }
          : { borderLeft: '3px solid transparent' }
      }
    >
      <Icon size={14} />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 flex-shrink-0 border-r"
        style={{ backgroundColor: '#1B2A4A', borderColor: 'rgba(197,150,58,0.2)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <Building2 size={18} style={{ color: '#C5963A' }} />
          <div>
            <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#C5963A', letterSpacing: '0.12em' }}>
              YoungLewin
            </div>
            <div className="text-xs" style={{ color: '#F8FAFC', opacity: 0.5, letterSpacing: '0.06em', fontSize: '9px' }}>
              CRE Operating System
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {/* Phase 1 — Deal Engine */}
          <div className="px-3 pb-1 pt-1" style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(197,150,58,0.5)' }}>
            Deal Engine
          </div>
          <div className="space-y-0.5 mb-3">
            {PHASE1_NAV.map(item => <NavItem key={item.path} {...item} />)}
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'rgba(197,150,58,0.12)', margin: '4px 8px 8px' }} />

          {/* Phase 2 — Marketing */}
          <div className="px-3 pb-1" style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(59,156,181,0.6)' }}>
            Marketing &amp; Funnels
          </div>
          <div className="space-y-0.5 mb-3">
            {PHASE2_NAV.map(item => <NavItem key={item.path} {...item} />)}
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'rgba(59,156,181,0.12)', margin: '4px 8px 8px' }} />

          {/* Phase 3 — CRM */}
          <div className="px-3 pb-1" style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(168,85,247,0.6)' }}>
            CRM &amp; Pipeline
          </div>
          <div className="space-y-0.5">
            {PHASE3_NAV.map(item => <NavItem key={item.path} {...item} />)}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: 'rgba(197,150,58,0.2)', color: 'rgba(248,250,252,0.25)', fontSize: '9px' }}>
          Phase 3 · V3.0 · Long Beach CA
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
          style={{ backgroundColor: '#1B2A4A', borderColor: 'rgba(197,150,58,0.2)', height: '48px' }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(248,250,252,0.5)' }}>
            <span style={{ fontSize: '11px' }}>YoungLewin Advisors</span>
            <ChevronRight size={11} />
            <span style={{ color: '#F8FAFC', fontSize: '11px', fontWeight: 600 }}>{getPageTitle()}</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="text-xs px-2 py-1 font-medium tracking-wide"
              style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A', border: '1px solid rgba(197,150,58,0.3)', fontSize: '9px' }}
            >
              DEMO MODE
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
