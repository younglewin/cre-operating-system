import { useState } from 'react'
import { TrendingUp, FileSpreadsheet } from 'lucide-react'
import DebtModelPanel from '../components/DebtModelPanel'
import RentRollParser from '../components/RentRollParser'
import { SUBJECT_PROPERTY } from '../lib/mockData'

type ActiveTab = 'debt' | 'rentroll'

const GOLD  = '#C5963A'
const TEAL  = '#3B9CB5'
const SLATE = '#0F172A'
const NAVY  = '#1B2A4A'
const OFF   = '#F8FAFC'

export default function UnderwritingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('debt')

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'debt',     label: 'Debt Underwriting Engine', icon: <TrendingUp size={13} />,     color: GOLD },
    { key: 'rentroll', label: 'Rent Roll Parser',         icon: <FileSpreadsheet size={13} />, color: TEAL },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: SLATE, fontFamily: 'Inter', overflow: 'hidden' }}>

      {/* Page Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(197,150,58,0.2)', backgroundColor: `${NAVY}60`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD }}>Underwriting Engine</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: OFF, marginTop: 2 }}>{SUBJECT_PROPERTY.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.45)', marginTop: 1 }}>{SUBJECT_PROPERTY.address}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(248,250,252,0.35)' }}>Asking Price</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>${(SUBJECT_PROPERTY.price ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', marginTop: 1 }}>
              {SUBJECT_PROPERTY.num_units} Units · {SUBJECT_PROPERTY.building_size_sf?.toLocaleString()} SF · {SUBJECT_PROPERTY.year_built}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(197,150,58,0.15)', backgroundColor: `${NAVY}40`, flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '11px 20px',
              fontSize: 11, fontWeight: 700, fontFamily: 'Inter',
              cursor: 'pointer', border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
              backgroundColor: activeTab === tab.key ? `${tab.color}10` : 'transparent',
              color: activeTab === tab.key ? tab.color : 'rgba(248,250,252,0.45)',
              transition: 'all 0.15s',
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'debt' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <DebtModelPanel
              initialPrice={SUBJECT_PROPERTY.price ?? 2950000}
              initialNOI={143075}
              initialGSI={223800}
              initialOpEx={80725}
            />
          </div>
        )}
        {activeTab === 'rentroll' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <RentRollParser
              propertyId={SUBJECT_PROPERTY.id}
              teamId={SUBJECT_PROPERTY.team_id}
            />
          </div>
        )}
      </div>
    </div>
  )
}
