import { useState, useEffect, useRef } from 'react'
import {
  Mail, MessageSquare, Phone, FileText, Users, Search, Plus, Send,
  ChevronRight, X, RefreshCw, Filter, CheckCircle, Clock, AlertCircle,
  AtSign, PhoneCall, Calendar, Building2, Paperclip, Star, Archive,
  MoreHorizontal, Reply, Forward, Trash2, Tag
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Communication, Contact, CommChannel } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────
const CHANNEL_ICONS: Record<CommChannel, React.ElementType> = {
  email:   Mail,
  sms:     MessageSquare,
  call:    Phone,
  note:    FileText,
  meeting: Calendar,
}
const CHANNEL_COLORS: Record<CommChannel, string> = {
  email:   '#3B9CB5',
  sms:     '#22c55e',
  call:    '#C5963A',
  note:    '#a855f7',
  meeting: '#f59e0b',
}
const CHANNEL_BG: Record<CommChannel, string> = {
  email:   'rgba(59,156,181,0.12)',
  sms:     'rgba(34,197,94,0.12)',
  call:    'rgba(197,150,58,0.12)',
  note:    'rgba(168,85,247,0.12)',
  meeting: 'rgba(245,158,11,0.12)',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getInitials(c?: Contact) {
  if (!c) return '?'
  return `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase()
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({ onClose, onSend, contacts }: {
  onClose: () => void
  onSend: (comm: Communication) => void
  contacts: Contact[]
}) {
  const [channel, setChannel] = useState<CommChannel>('email')
  const [contactId, setContactId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const selectedContact = contacts.find(c => c.id === contactId)
    const toAddress = channel === 'email'
      ? (selectedContact?.emails?.[0]?.address ?? selectedContact?.email ?? '')
      : (selectedContact?.phones?.[0]?.number ?? selectedContact?.phone ?? '')
    const { data } = await supabase.from('communications').insert({
      team_id: teamData?.id,
      contact_id: contactId || null,
      channel,
      direction: 'outbound',
      subject: subject || null,
      body,
      from_address: 'broker@younglewin.com',
      to_address: toAddress || null,
      status: 'sent',
    }).select('*, contact:contacts(*)').single()
    setSending(false)
    if (data) { onSend(data as Communication); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-[560px] border" style={{ backgroundColor: '#1B2A4A', borderColor: 'rgba(197,150,58,0.3)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <span className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>New Message</span>
          <button onClick={onClose}><X size={16} style={{ color: 'rgba(248,250,252,0.4)' }} /></button>
        </div>

        <div className="p-5 space-y-3">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs mb-2" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Channel</label>
            <div className="flex gap-2">
              {(['email', 'sms', 'call', 'note', 'meeting'] as CommChannel[]).map(ch => {
                const Icon = CHANNEL_ICONS[ch]
                return (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all capitalize"
                    style={{
                      backgroundColor: channel === ch ? CHANNEL_BG[ch] : 'rgba(248,250,252,0.05)',
                      color: channel === ch ? CHANNEL_COLORS[ch] : 'rgba(248,250,252,0.4)',
                      border: `1px solid ${channel === ch ? CHANNEL_COLORS[ch] + '50' : 'rgba(248,250,252,0.08)'}`,
                    }}
                  >
                    <Icon size={11} /> {ch}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>To</label>
            <select className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
              value={contactId} onChange={e => setContactId(e.target.value)}>
              <option value="">— Select Contact —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
          </div>

          {/* Subject (email only) */}
          {channel === 'email' && (
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subject</label>
              <input className="w-full px-2 py-1.5 text-xs border-none outline-none" style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
                placeholder="Re: 4-plex Naples Island" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
          )}

          {/* Body */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(248,250,252,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {channel === 'note' ? 'Note' : channel === 'call' ? 'Call Summary' : channel === 'meeting' ? 'Meeting Notes' : 'Message'}
            </label>
            <textarea
              rows={6}
              className="w-full px-2 py-1.5 text-xs border-none outline-none resize-none"
              style={{ backgroundColor: 'rgba(248,250,252,0.08)', color: '#F8FAFC' }}
              placeholder={
                channel === 'email' ? 'Hi [Name],\n\nI wanted to follow up regarding...' :
                channel === 'sms' ? 'Hi, this is Shane from YoungLewin...' :
                channel === 'call' ? 'Call summary: Spoke with contact about...' :
                channel === 'note' ? 'Internal note: Contact mentioned...' :
                'Meeting notes: Discussed...'
              }
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>
              <Paperclip size={12} /> Attach
            </button>
            <button onClick={send} disabled={sending || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              style={{ backgroundColor: body.trim() ? '#C5963A' : 'rgba(197,150,58,0.3)', color: '#0F172A' }}>
              <Send size={12} /> {sending ? 'Sending...' : channel === 'note' ? 'Save Note' : channel === 'call' ? 'Log Call' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Message Thread ───────────────────────────────────────────────────────────
function MessageThread({ comm, onClose }: { comm: Communication; onClose: () => void }) {
  const Icon = CHANNEL_ICONS[comm.channel]

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-40 overflow-y-auto" style={{ width: '480px', backgroundColor: '#1B2A4A', borderLeft: '1px solid rgba(197,150,58,0.25)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(197,150,58,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: CHANNEL_BG[comm.channel] }}>
              <Icon size={14} style={{ color: CHANNEL_COLORS[comm.channel] }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>
                {comm.subject ?? (comm.channel === 'call' ? 'Call Log' : comm.channel === 'note' ? 'Note' : 'Message')}
              </div>
              <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>
                {comm.contact ? `${comm.contact.first_name} ${comm.contact.last_name}` : comm.from_address ?? 'Unknown'}
                {' · '}{new Date(comm.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5" style={{ color: 'rgba(248,250,252,0.4)' }}><Reply size={14} /></button>
            <button className="p-1.5" style={{ color: 'rgba(248,250,252,0.4)' }}><Archive size={14} /></button>
            <button onClick={onClose} className="p-1.5" style={{ color: 'rgba(248,250,252,0.4)' }}><X size={14} /></button>
          </div>
        </div>

        {/* Message Body */}
        <div className="p-5">
          {/* Contact Card */}
          {comm.contact && (
            <div className="flex items-center gap-3 p-3 mb-4" style={{ backgroundColor: 'rgba(27,42,74,0.6)', border: '1px solid rgba(248,250,252,0.06)' }}>
              <div className="w-8 h-8 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A' }}>
                {getInitials(comm.contact)}
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: '#F8FAFC' }}>{comm.contact.first_name} {comm.contact.last_name}</div>
                <div className="text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>{comm.contact.contact_type ?? 'Contact'}</div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <span className="text-xs px-2 py-0.5 capitalize" style={{ backgroundColor: CHANNEL_BG[comm.channel], color: CHANNEL_COLORS[comm.channel] }}>
                  {comm.channel}
                </span>
                <span className="text-xs px-2 py-0.5" style={{ backgroundColor: comm.direction === 'inbound' ? 'rgba(59,156,181,0.12)' : 'rgba(197,150,58,0.12)', color: comm.direction === 'inbound' ? '#3B9CB5' : '#C5963A' }}>
                  {comm.direction}
                </span>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="p-4" style={{ backgroundColor: 'rgba(248,250,252,0.03)', border: '1px solid rgba(248,250,252,0.06)' }}>
            <pre className="text-xs whitespace-pre-wrap font-sans" style={{ color: 'rgba(248,250,252,0.8)', lineHeight: '1.6' }}>
              {comm.body}
            </pre>
          </div>

          {/* Metadata */}
          <div className="mt-4 space-y-2">
            {comm.from_address && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>
                <AtSign size={11} /> From: {comm.from_address}
              </div>
            )}
            {comm.to_address && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>
                <Send size={11} /> To: {comm.to_address}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(248,250,252,0.4)' }}>
              <Clock size={11} /> {new Date(comm.created_at).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {comm.status === 'sent' && <><CheckCircle size={11} style={{ color: '#22c55e' }} /><span style={{ color: '#22c55e' }}>Sent</span></>}
              {comm.status === 'delivered' && <><CheckCircle size={11} style={{ color: '#3B9CB5' }} /><span style={{ color: '#3B9CB5' }}>Delivered</span></>}
              {comm.status === 'read' && <><CheckCircle size={11} style={{ color: '#a855f7' }} /><span style={{ color: '#a855f7' }}>Read</span></>}
              {comm.status === 'failed' && <><AlertCircle size={11} style={{ color: '#ef4444' }} /><span style={{ color: '#ef4444' }}>Failed</span></>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InboxPage() {
  const [comms, setComms] = useState<Communication[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState<CommChannel | 'All'>('All')
  const [filterDirection, setFilterDirection] = useState<'All' | 'inbound' | 'outbound'>('All')
  const [selected, setSelected] = useState<Communication | null>(null)
  const [showCompose, setShowCompose] = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [commsRes, contactsRes] = await Promise.all([
      supabase.from('communications').select('*, contact:contacts(*)').order('created_at', { ascending: false }).limit(100),
      supabase.from('contacts').select('id, first_name, last_name, contact_type, phones, emails, email, phone').order('first_name'),
    ])
    const rawComms = (commsRes.data ?? []) as Communication[]
    if (rawComms.length === 0) {
      await seedDemoComms((contactsRes.data ?? []) as Contact[])
      const { data } = await supabase.from('communications').select('*, contact:contacts(*)').order('created_at', { ascending: false }).limit(100)
      setComms((data ?? []) as Communication[])
    } else {
      setComms(rawComms)
    }
    setContacts((contactsRes.data ?? []) as Contact[])
    setLoading(false)
  }

  const seedDemoComms = async (contactList: Contact[]) => {
    const { data: teamData } = await supabase.from('teams').select('id').limit(1).single()
    const cids = contactList.map(c => c.id)
    if (cids.length === 0) return
    const now = new Date()
    const demos = [
      { contact_id: cids[0], channel: 'email', direction: 'inbound', subject: 'Re: 4-plex Naples Island — Interested', body: 'Hi Shane,\n\nThank you for sending over the OM. We reviewed the financials and are very interested in moving forward. The cap rate at 4.8% works well for our criteria.\n\nCan we schedule a walkthrough for next week?\n\nBest,\nMichael', from_address: 'mchen@investcap.com', to_address: 'broker@younglewin.com', status: 'read', created_at: new Date(now.getTime() - 2 * 3600000).toISOString() },
      { contact_id: cids[1], channel: 'sms', direction: 'inbound', body: 'Hey Shane - just checking in on the 6-unit on Redondo. Any updates on the seller\'s counter?', from_address: '(562) 555-0202', to_address: '(562) 555-1000', status: 'delivered', created_at: new Date(now.getTime() - 5 * 3600000).toISOString() },
      { contact_id: cids[2], channel: 'call', direction: 'outbound', subject: 'Call with Robert Martinez', body: 'Called Robert to discuss the 4-plex on 2nd St. He is a cash buyer and can close in 21 days. Interested in properties under $3.5M in Long Beach and Anaheim. Will send OM for Naples Island listing.\n\nNext step: Send OM, schedule walkthrough.', from_address: 'broker@younglewin.com', to_address: '(714) 555-0303', status: 'sent', created_at: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { contact_id: cids[3], channel: 'email', direction: 'outbound', subject: 'YoungLewin Advisors — New Listing Alert: 4-Plex Naples Island', body: 'Dear Sarah,\n\nI wanted to bring to your attention a new listing that aligns with your investment criteria:\n\n4-Plex | Naples Island, Long Beach\nAsking: $2,850,000 | Cap Rate: 4.8% | GRM: 14.2x\n\nPlease find the OM attached. I would love to discuss this opportunity.\n\nBest regards,\nShane Young\nYoungLewin Advisors', from_address: 'broker@younglewin.com', to_address: 'sthompson@realty.com', status: 'sent', created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { contact_id: cids[4], channel: 'note', direction: 'outbound', subject: 'Internal Note — David Kim', body: 'David confirmed he is actively looking for a 1031 exchange property. His deadline is June 15, 2026. Budget is $2.5M-$6M. Prefers Long Beach or Torrance. Has a 1031 exchange intermediary already set up (Exeter 1031).\n\nAction: Add to Long Beach buyer list. Send any new listings immediately.', from_address: 'broker@younglewin.com', status: 'sent', created_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
      { contact_id: cids[5], channel: 'email', direction: 'inbound', subject: 'LOI — 8-Unit Belmont Shore', body: 'Shane,\n\nPlease find attached our Letter of Intent for the 8-unit property at 1234 E Ocean Blvd, Long Beach.\n\nOffer Price: $4,050,000\nEarnest Money: $50,000\nInspection Period: 17 days\nClose of Escrow: 30 days from acceptance\n\nLooking forward to your response.\n\nLisa Wong\nWong Capital', from_address: 'lwong@wongcapital.com', to_address: 'broker@younglewin.com', status: 'read', created_at: new Date(now.getTime() - 4 * 86400000).toISOString() },
      { contact_id: cids[0], channel: 'meeting', direction: 'outbound', subject: 'Property Walkthrough — Naples Island 4-Plex', body: 'Met with Michael Chen at the property. Tour lasted 45 minutes. Michael was impressed with the unit quality and location. Concerns: parking situation and one unit with deferred maintenance.\n\nHe will discuss with his partner and get back to us by end of week. Probability increased to 70%.', from_address: 'broker@younglewin.com', status: 'sent', created_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
      { contact_id: cids[6], channel: 'sms', direction: 'outbound', body: 'Hi James, this is Shane from YoungLewin Advisors. I specialize in multifamily sales in Long Beach and noticed you own a 4-plex on 2nd St. Would you be open to a quick conversation about the current market? No pressure at all.', from_address: '(562) 555-1000', to_address: '(562) 555-0707', status: 'delivered', created_at: new Date(now.getTime() - 6 * 86400000).toISOString() },
    ]
    for (const d of demos) {
      await supabase.from('communications').insert({ ...d, team_id: teamData?.id })
    }
  }

  const filtered = comms.filter(c => {
    const name = c.contact ? `${c.contact.first_name} ${c.contact.last_name}` : ''
    const searchMatch = !search || name.toLowerCase().includes(search.toLowerCase()) ||
      (c.subject ?? '').toLowerCase().includes(search.toLowerCase()) ||
      c.body.toLowerCase().includes(search.toLowerCase())
    const channelMatch = filterChannel === 'All' || c.channel === filterChannel
    const dirMatch = filterDirection === 'All' || c.direction === filterDirection
    return searchMatch && channelMatch && dirMatch
  })

  const unreadCount = comms.filter(c => c.direction === 'inbound' && c.status !== 'read').length

  // Stats by channel
  const channelCounts = (['email', 'sms', 'call', 'note', 'meeting'] as CommChannel[]).map(ch => ({
    channel: ch,
    count: comms.filter(c => c.channel === ch).length,
  }))

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold" style={{ color: '#F8FAFC' }}>Unified Inbox</h1>
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 font-bold" style={{ backgroundColor: '#ef4444', color: '#fff' }}>{unreadCount}</span>
          )}
        </div>
        <button onClick={() => setShowCompose(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#C5963A', color: '#0F172A' }}>
          <Plus size={12} /> Compose
        </button>
      </div>

      {/* Channel Stats */}
      <div className="flex gap-px border-b flex-shrink-0" style={{ borderColor: 'rgba(197,150,58,0.15)' }}>
        {channelCounts.map(({ channel, count }) => {
          const Icon = CHANNEL_ICONS[channel]
          return (
            <button
              key={channel}
              onClick={() => setFilterChannel(filterChannel === channel ? 'All' : channel)}
              className="flex-1 flex flex-col items-center py-2.5 transition-all capitalize"
              style={{
                backgroundColor: filterChannel === channel ? CHANNEL_BG[channel] : 'rgba(27,42,74,0.4)',
                borderBottom: filterChannel === channel ? `2px solid ${CHANNEL_COLORS[channel]}` : '2px solid transparent',
              }}
            >
              <Icon size={14} style={{ color: filterChannel === channel ? CHANNEL_COLORS[channel] : 'rgba(248,250,252,0.3)' }} />
              <div className="text-xs font-bold mt-0.5" style={{ color: filterChannel === channel ? CHANNEL_COLORS[channel] : 'rgba(248,250,252,0.5)' }}>{count}</div>
              <div className="text-xs" style={{ color: 'rgba(248,250,252,0.25)', fontSize: '8px', textTransform: 'uppercase' }}>{channel}</div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(248,250,252,0.06)' }}>
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(248,250,252,0.3)' }} />
          <input
            className="w-full pl-7 pr-3 py-1.5 text-xs border-none outline-none"
            style={{ backgroundColor: 'rgba(248,250,252,0.06)', color: '#F8FAFC' }}
            placeholder="Search messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['All', 'inbound', 'outbound'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => setFilterDirection(dir)}
              className="px-2.5 py-1.5 text-xs font-medium capitalize"
              style={{
                backgroundColor: filterDirection === dir ? 'rgba(197,150,58,0.15)' : 'rgba(248,250,252,0.05)',
                color: filterDirection === dir ? '#C5963A' : 'rgba(248,250,252,0.4)',
                border: `1px solid ${filterDirection === dir ? 'rgba(197,150,58,0.3)' : 'rgba(248,250,252,0.08)'}`,
              }}
            >
              {dir}
            </button>
          ))}
        </div>
        <div className="text-xs ml-auto" style={{ color: 'rgba(248,250,252,0.3)' }}>
          {filtered.length} messages
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={20} className="animate-spin" style={{ color: '#C5963A' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Mail size={24} style={{ color: 'rgba(248,250,252,0.15)' }} />
            <div className="text-xs" style={{ color: 'rgba(248,250,252,0.3)' }}>No messages found</div>
          </div>
        ) : (
          filtered.map((comm, i) => {
            const Icon = CHANNEL_ICONS[comm.channel]
            const isUnread = comm.direction === 'inbound' && comm.status !== 'read'
            return (
              <div
                key={comm.id}
                className="flex items-start gap-3 px-6 py-3 cursor-pointer transition-colors border-b"
                style={{
                  borderColor: 'rgba(248,250,252,0.04)',
                  backgroundColor: isUnread ? 'rgba(27,42,74,0.6)' : 'transparent',
                }}
                onClick={() => setSelected(comm)}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(197,150,58,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = isUnread ? 'rgba(27,42,74,0.6)' : 'transparent')}
              >
                {/* Avatar */}
                <div className="w-8 h-8 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(197,150,58,0.15)', color: '#C5963A' }}>
                  {comm.contact ? getInitials(comm.contact) : <Icon size={14} style={{ color: CHANNEL_COLORS[comm.channel] }} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: isUnread ? '#F8FAFC' : 'rgba(248,250,252,0.8)' }}>
                        {comm.contact ? `${comm.contact.first_name} ${comm.contact.last_name}` : comm.from_address ?? 'Unknown'}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 capitalize" style={{ backgroundColor: CHANNEL_BG[comm.channel], color: CHANNEL_COLORS[comm.channel], fontSize: '9px' }}>
                        {comm.channel}
                      </span>
                      {comm.direction === 'inbound' && (
                        <span className="text-xs px-1.5 py-0.5" style={{ backgroundColor: 'rgba(59,156,181,0.1)', color: '#3B9CB5', fontSize: '9px' }}>↓ in</span>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'rgba(248,250,252,0.3)', fontSize: '9px' }}>{timeAgo(comm.created_at)}</span>
                  </div>
                  {comm.subject && (
                    <div className="text-xs font-medium mb-0.5 truncate" style={{ color: isUnread ? '#F8FAFC' : 'rgba(248,250,252,0.7)' }}>
                      {comm.subject}
                    </div>
                  )}
                  <div className="text-xs truncate" style={{ color: 'rgba(248,250,252,0.4)' }}>
                    {comm.body.split('\n')[0]}
                  </div>
                </div>

                {/* Unread dot */}
                {isUnread && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: '#3B9CB5' }} />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Thread Drawer */}
      {selected && <MessageThread comm={selected} onClose={() => setSelected(null)} />}

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSend={comm => setComms(cs => [comm, ...cs])}
          contacts={contacts}
        />
      )}
    </div>
  )
}
