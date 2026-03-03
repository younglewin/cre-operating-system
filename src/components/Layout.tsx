import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  TrendingUp,
  RefreshCw,
  Building2,
  ChevronRight,
  Calculator,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { path: '/comps',        label: 'Deal Engine',   icon: Map },
  { path: '/underwriting', label: 'Underwriting',  icon: Calculator },
  { path: '/pricing',      label: 'Pricing Matrix',icon: TrendingUp },
  { path: '/exchange',     label: '1031 Exchange', icon: RefreshCw },
]

export default function Layout() {
  const location = useLocation()

  const getPageTitle = () => {
    const item = NAV_ITEMS.find(n => location.pathname.startsWith(n.path))
    return item?.label ?? 'CRE OS'
  }


  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 flex-shrink-0 border-r"
        style={{ backgroundColor: '#1B2A4A', borderColor: 'rgba(197,150,58,0.2)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-4 py-5 border-b"
          style={{ borderColor: 'rgba(197,150,58,0.2)' }}
        >
          <Building2 size={20} style={{ color: '#C5963A' }} />
          <div>
            <div className="text-xs font-800 tracking-widest uppercase" style={{ color: '#C5963A', letterSpacing: '0.12em' }}>
              YoungLewin
            </div>
            <div className="text-xs font-500 tracking-wider" style={{ color: '#F8FAFC', opacity: 0.6, letterSpacing: '0.08em' }}>
              CRE Operating System
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: 'rgba(197,150,58,0.15)',
                      borderLeft: '3px solid #C5963A',
                      paddingLeft: '9px',
                    }
                  : {
                      borderLeft: '3px solid transparent',
                    }
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t text-xs"
          style={{ borderColor: 'rgba(197,150,58,0.2)', color: 'rgba(248,250,252,0.3)' }}
        >
          Phase 1 · V1.2
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
          style={{
            backgroundColor: '#1B2A4A',
            borderColor: 'rgba(197,150,58,0.2)',
            height: '52px',
          }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(248,250,252,0.5)' }}>
            <span>YoungLewin Advisors</span>
            <ChevronRight size={12} />
            <span style={{ color: '#F8FAFC' }}>{getPageTitle()}</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="text-xs px-2 py-1 font-medium tracking-wide"
              style={{
                backgroundColor: 'rgba(197,150,58,0.15)',
                color: '#C5963A',
                border: '1px solid rgba(197,150,58,0.3)',
              }}
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
