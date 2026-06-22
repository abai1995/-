import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Users, 
  BookOpen, 
  HelpCircle, 
  Send, 
  MapPin, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Briefcase, 
  Plus, 
  Check,
  ChevronRight,
  Bell,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Phone,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Property, Lead, KnowledgeBaseEntry, Message, UnknownQuery, Notification, PurchaseType } from './types.js';

export default function App() {
  // Global States
  const [activeTab, setActiveTab] = useState<'property' | 'crm' | 'queries' | 'kb'>('crm');
  const [property, setProperty] = useState<Property | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [kbEntries, setKbEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [unknownQueries, setUnknownQueries] = useState<UnknownQuery[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  
  // KPI Metrics State
  const [kpis, setKpis] = useState({
    totalLeads: 0,
    hotCount: 0,
    warmCount: 0,
    coldCount: 0,
    viewingCount: 0,
    contactsCollected: 0,
    conversionRate: 0
  });

  // Client Simulation State
  const [simulationRole, setSimulationRole] = useState<'lead_1' | 'lead_2' | 'lead_3' | 'new'>('lead_1');
  const [customPhone, setCustomPhone] = useState('+77015554433');
  const [clientInputText, setClientInputText] = useState('');
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Filters for CRM
  const [crmFilter, setCrmFilter] = useState<'all' | 'hot' | 'warm' | 'cold' | 'viewing'>('all');

  // Form states
  const [propTitle, setPropTitle] = useState('');
  const [propPrice, setPropPrice] = useState(0);
  const [propAddress, setPropAddress] = useState('');
  const [propRooms, setPropRooms] = useState(0);
  const [propArea, setPropArea] = useState(0);
  const [propFloor, setPropFloor] = useState(0);
  const [propFloorsTotal, setPropFloorsTotal] = useState(0);
  const [propYear, setPropYear] = useState(0);
  const [propDesc, setPropDesc] = useState('');
  const [propActive, setPropActive] = useState(true);
  const [propHours, setPropHours] = useState('');

  // Knowledge base entry states
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [editingKbId, setEditingKbId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState('');
  const [editingAnswer, setEditingAnswer] = useState('');

  // Quick Reply panel state for unknown queries
  const [selectedReplyQueryId, setSelectedReplyQueryId] = useState<string | null>(null);
  const [ownerCustomReply, setOwnerCustomReply] = useState('');

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Load of API info
  const loadData = async () => {
    try {
      const resProp = await fetch('/api/property');
      const dataProp = await resProp.json();
      setProperty(dataProp);
      // seed local form fields
      setPropTitle(dataProp.title);
      setPropPrice(dataProp.price);
      setPropAddress(dataProp.address);
      setPropRooms(dataProp.rooms);
      setPropArea(dataProp.area);
      setPropFloor(dataProp.floor);
      setPropFloorsTotal(dataProp.floors_total);
      setPropYear(dataProp.year_built);
      setPropDesc(dataProp.description);
      setPropActive(dataProp.is_active);
      setPropHours(dataProp.viewing_hours);

      const resLeads = await fetch('/api/leads');
      const dataLeads = await resLeads.json();
      setLeads(dataLeads);
      
      // Auto-set first active lead if none
      if (dataLeads.length > 0 && !activeLead) {
        // match initial selection with simulationRole
        const initialLead = dataLeads.find((l: Lead) => l.id === simulationRole) || dataLeads[0];
        setActiveLead(initialLead);
        fetchMessages(initialLead.id);
      }

      const resKb = await fetch('/api/kb');
      const dataKb = await resKb.json();
      setKbEntries(dataKb);

      const resQueries = await fetch('/api/queries');
      const dataQueries = await resQueries.json();
      setUnknownQueries(dataQueries);

      const resNotif = await fetch('/api/notifications');
      const dataNotif = await resNotif.json();
      setNotifications(dataNotif);
      setUnreadNotifications(dataNotif.filter((n: Notification) => !n.is_read).length);

      const resKpi = await fetch('/api/kpi');
      const dataKpi = await resKpi.json();
      setKpis(dataKpi);
    } catch (err) {
      console.error("Error loading mock data from backend", err);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh interval for live simulation experience
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [simulationRole]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchMessages = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Error loading chat metrics", err);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setActiveLead(lead);
    fetchMessages(lead.id);
    if (lead.id.startsWith("lead_")) {
      setSimulationRole(lead.id as any);
    } else {
      setSimulationRole('new');
      setCustomPhone(lead.phone);
    }
  };

  // 2. Client WhatsApp send simulations
  const handleClientSendMsg = async (text: string) => {
    const rawText = text.trim();
    if (!rawText) return;

    setSimulationLoading(true);
    let targetPhone = "";
    if (simulationRole === 'new') {
      targetPhone = customPhone;
    } else {
      const matchLead = leads.find(l => l.id === simulationRole);
      targetPhone = matchLead ? matchLead.phone : customPhone;
    }

    try {
      const res = await fetch('/api/simulation/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone, message: rawText })
      });
      const data = await res.json();
      setClientInputText('');
      
      // Update loaded entities
      await loadData();
      
      // Update active chatbot context
      if (data.lead) {
        setActiveLead(data.lead);
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Simulation request fail", err);
    } finally {
      setSimulationLoading(false);
    }
  };

  // 3. Update property specs
  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/property', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: propTitle,
          price: propPrice,
          address: propAddress,
          rooms: propRooms,
          area: propArea,
          floor: propFloor,
          floors_total: propFloorsTotal,
          year_built: propYear,
          description: propDesc,
          is_active: propActive,
          viewing_hours: propHours,
        })
      });
      const data = await res.json();
      setProperty(data);
      alert("Характеристики квартиры успешно обновлены! ИИ учтет их в диалогах.");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Save knowledge base entry
  const handleAddKbEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    try {
      await fetch('/api/kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQuestion, answer: newAnswer })
      });
      setNewQuestion('');
      setNewAnswer('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditKbEntry = async (id: string) => {
    if (!editingQuestion.trim() || !editingAnswer.trim()) return;
    try {
      await fetch(`/api/kb/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: editingQuestion, answer: editingAnswer })
      });
      setEditingKbId(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKbEntry = async (id: string) => {
    if (!confirm("Удалить ответ из Базы Знаний?")) return;
    try {
      await fetch(`/api/kb/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Вы действительно хотите полностью удалить этого клиента и всю переписку?")) return;
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      setActiveLead(null);
      setMessages([]);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Answer unknown query
  const handleAnswerQuery = async (id: string) => {
    if (!ownerCustomReply.trim()) return;
    try {
      await fetch(`/api/queries/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: ownerCustomReply })
      });
      setSelectedReplyQueryId(null);
      setOwnerCustomReply('');
      loadData();
      if (activeLead) {
        fetchMessages(activeLead.id);
      }
      alert("Ответ успешно переслан клиенту в WhatsApp и сохранен в Базе Знаний!");
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Test triggers reminder simulator
  const triggerReminder = async (leadId: string, hours: number) => {
    try {
      const res = await fetch('/api/simulation/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, hours })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Напоминание за ${hours} часа отправлено в чат клиенту!`);
        loadData();
        if (activeLead && activeLead.id === leadId) {
          fetchMessages(leadId);
        }
      } else {
        alert(data.error || "Не удалось отправить напоминание");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
      setUnreadNotifications(0);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper styles mapping
  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'hot': return 'bg-rose-100 text-rose-800 border-rose-200 uppercase font-mono text-[10px] tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 font-bold border';
      case 'warm': return 'bg-amber-100 text-amber-800 border-amber-200 uppercase font-mono text-[10px] tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 font-bold border';
      case 'cold': return 'bg-slate-100 text-slate-800 border-slate-200 uppercase font-mono text-[10px] tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 font-bold border';
      default: return 'bg-gray-100 text-gray-800 border';
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(l => {
    if (crmFilter === 'all') return true;
    if (crmFilter === 'hot') return l.status === 'hot';
    if (crmFilter === 'warm') return l.status === 'warm';
    if (crmFilter === 'cold') return l.status === 'cold';
    if (crmFilter === 'viewing') return l.appointment_date !== null;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Header navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md shadow-emerald-100 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              AI Realtor <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">Ассистент WhatsApp</span>
            </h1>
            <p className="text-xs text-slate-500">Система управления лидами и виртуальный помощник</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <span className="text-emerald-600 flex items-center gap-1.5 text-xs font-semibold justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              WhatsApp симулятор активен
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Астана (GMT +5)</span>
          </div>

          {/* Notifications Menu Trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                if (unreadNotifications > 0) {
                  handleMarkNotificationsRead();
                }
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl relative transition-all duration-200"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold animate-pulse border border-white">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
                <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
                  <span className="font-bold text-sm">Уведомления для владельца</span>
                  <button 
                    onClick={() => setShowNotificationsDropdown(false)} 
                    className="text-xs opacity-80 hover:opacity-100 underline decoration-dotted"
                  >
                    Закрыть
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Нет новых событий. Попробуйте написать ИИ в чате справа!</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-sky-50/50' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-xs text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                        {n.type === 'unknown_question' && (
                          <button 
                            onClick={() => {
                              setActiveTab('queries');
                              setSelectedReplyQueryId(n.lead_id);
                              setShowNotificationsDropdown(false);
                            }}
                            className="mt-2 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1"
                          >
                            Ответить клиенту <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={loadData}
            aria-label="Refresh Data"
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Full-Width Split Work Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden max-w-[1700px] w-full mx-auto">
        
        {/* Left Area: Realtor Controls Panel (7 columns) */}
        <section className="lg:col-span-7 flex flex-col gap-6 overflow-hidden">
          
          {/* Quick Stats Bento Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Всего лидов</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{kpis.totalLeads}</span>
                <span className="text-[11px] text-slate-500 font-semibold">клиентов</span>
              </div>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block flex items-center gap-1">HOT 🔥</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-700">{kpis.hotCount}</span>
                <span className="text-[11px] text-rose-600 font-semibold">записаны</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1">WARM ☀️</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-700">{kpis.warmCount}</span>
                <span className="text-[11px] text-amber-600 font-semibold">общение</span>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Конверсия</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-emerald-700">{kpis.conversionRate}%</span>
                <span className="text-[10px] text-emerald-600 font-semibold">в просмотр</span>
              </div>
            </div>
          </div>

          {/* Navigation Tab links */}
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center justify-between gap-1 shadow-sm">
            <button 
              onClick={() => setActiveTab('crm')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'crm' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Users className="w-4 h-4" />
              База Лидов CRM
            </button>
            <button 
              onClick={() => setActiveTab('queries')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 relative ${activeTab === 'queries' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <HelpCircle className="w-4 h-4" />
              Нужен Ответ WID
              {unknownQueries.filter(q => !q.is_answered).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 animate-ping" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('property')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'property' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Building2 className="w-4 h-4" />
              Карточка Объекта
            </button>
            <button 
              onClick={() => setActiveTab('kb')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'kb' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <BookOpen className="w-4 h-4" />
              База Знаний
            </button>
          </div>

          {/* Tab Content Section Container */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1 overflow-y-auto">
            
            {/* TAB: CRM LEADS LIST */}
            {activeTab === 'crm' && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-black text-lg text-slate-900">Список потенциальных покупателей</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Выберите клиента для просмотра истории чата CRM</p>
                  </div>

                  {/* Table Filtering switches */}
                  <div className="flex flex-wrap gap-1">
                    {(['all', 'hot', 'warm', 'cold', 'viewing'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setCrmFilter(f)}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${crmFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {f === 'all' && 'Все'}
                        {f === 'hot' && '🔥 HOT'}
                        {f === 'warm' && '☀️ WARM'}
                        {f === 'cold' && '❄️ COLD'}
                        {f === 'viewing' && '🗓️ Просмотры'}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredLeads.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <Users className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Нет лидов, соответствующих выбранному фильтру.</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {filteredLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        onClick={() => handleSelectLead(lead)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${activeLead?.id === lead.id ? 'bg-slate-950 text-white border-slate-950 shadow-lg' : 'bg-white hover:bg-slate-50 border-slate-200'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl ${activeLead?.id === lead.id ? 'bg-slate-800' : 'bg-slate-100'} text-slate-600 flex items-center justify-center`}>
                            <Users className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm tracking-tight">{lead.name || "Новый гость"}</span>
                              <span className={getBadgeClass(lead.status)}>{lead.status}</span>
                            </div>
                            <div className="text-xs opacity-75 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3" /> {lead.phone}</span>
                              <span className="font-medium bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[10px]">
                                {lead.purchase_type === 'cash' ? 'Наличные' : lead.purchase_type === 'mortgage' ? 'Ипотека' : 'Не определился'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Booking Appointment Details */}
                        <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                          {lead.appointment_date ? (
                            <div className="flex flex-col items-start sm:items-end w-full">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Запись одобрена
                              </span>
                              <span className="text-[11px] font-mono mt-0.5 font-bold">
                                {lead.appointment_date} в {lead.appointment_time}
                              </span>
                              {/* Push alerts reminder testing */}
                              <div className="mt-1.5 flex gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerReminder(lead.id, 24);
                                  }}
                                  className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-1 rounded font-bold border"
                                >
                                  Напомнить за 24ч
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerReminder(lead.id, 2);
                                  }}
                                  className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-1 rounded font-bold border"
                                >
                                  Напомнить за 2ч
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 font-medium italic">
                              Просмотр не назначен
                            </div>
                          )}

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLead(lead.id);
                            }}
                            className="p-1.5 hover:bg-rose-500 hover:text-white rounded-lg text-slate-400 transition-all ml-auto sm:ml-0"
                            aria-label="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: UNRESOLVED QUESTIONS */}
            {activeTab === 'queries' && (
              <div>
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="font-black text-lg text-slate-900">Запросы на подтверждение (От владельца)</h3>
                  <p className="text-xs text-slate-500">Вопросы, на которые ИИ не нашел ответа в базе знаний. Дайте свой ответ, и ассистент свяжется с клиентом.</p>
                </div>

                {unknownQueries.filter(q => !q.is_answered).length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 stroke-[1.5] mb-2 text-emerald-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">Все вопросы отвечены!</p>
                    <p className="text-xs text-slate-500 mt-1">Клиенты довольны. Если они зададут новые сложные вопросы, они появятся в этой вкладке.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unknownQueries.filter(q => !q.is_answered).map(q => (
                      <div key={q.id} className="p-5 border border-slate-200 rounded-3xl bg-slate-50 relative">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                            Отправитель: {q.lead_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(q.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-slate-900 bg-white border p-3.5 rounded-2xl shadow-sm mb-4">
                          "{q.question}"
                        </div>

                        {selectedReplyQueryId === q.id ? (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Текст вашего ответа (он занесется в Базу Знаний):</label>
                            <textarea 
                              rows={3}
                              value={ownerCustomReply}
                              onChange={(e) => setOwnerCustomReply(e.target.value)}
                              placeholder="Например, мебель полностью новая, остается только кухня. По технике можно договориться на скидку в 200 тысяч..."
                              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:border-slate-800 outline-none resize-none font-sans bg-white"
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setSelectedReplyQueryId(null)}
                                className="px-3 py-1.5 text-xs font-semibold bg-white border rounded-lg hover:bg-slate-100 text-slate-500"
                              >
                                Отмена
                              </button>
                              <button 
                                onClick={() => handleAnswerQuery(q.id)}
                                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                              >
                                Отправить в WhatsApp
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setSelectedReplyQueryId(q.id);
                              setOwnerCustomReply('');
                            }}
                            className="bg-slate-900 text-white hover:bg-slate-800 transition-all font-bold text-xs py-2 px-4 rounded-xl inline-flex items-center gap-1.5 shadow-sm"
                          >
                            Предоставить ответ <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PROPERTY CONFIGS */}
            {activeTab === 'property' && (
              <div>
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="font-black text-lg text-slate-900">Редактирование параметров квартиры</h3>
                  <p className="text-xs text-slate-500">ИИ Realtor запомнит обновленные характеристики и сразу начнет использовать их в WhatsApp диалогах.</p>
                </div>

                <form onSubmit={handleUpdateProperty} className="space-y-4 text-xs font-medium">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Название предложения</label>
                      <input 
                        type="text" 
                        value={propTitle} 
                        onChange={(e) => setPropTitle(e.target.value)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Адрес объекта</label>
                      <input 
                        type="text" 
                        value={propAddress} 
                        onChange={(e) => setPropAddress(e.target.value)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Цена (тенге)</label>
                      <input 
                        type="number" 
                        value={propPrice} 
                        onChange={(e) => setPropPrice(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Допустимое время для показов</label>
                      <input 
                        type="text" 
                        value={propHours} 
                        placeholder="Например: 10:00-20:00"
                        onChange={(e) => setPropHours(e.target.value)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Площадь (кв.м)</label>
                      <input 
                        type="number" 
                        value={propArea} 
                        onChange={(e) => setPropArea(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Комнат</label>
                      <input 
                        type="number" 
                        value={propRooms} 
                        onChange={(e) => setPropRooms(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Этаж</label>
                      <input 
                        type="number" 
                        value={propFloor} 
                        onChange={(e) => setPropFloor(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Всего этажей</label>
                      <input 
                        type="number" 
                        value={propFloorsTotal} 
                        onChange={(e) => setPropFloorsTotal(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Год постройки</label>
                      <input 
                        type="number" 
                        value={propYear} 
                        onChange={(e) => setPropYear(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Дополнительное описание</label>
                    <textarea 
                      rows={4}
                      value={propDesc} 
                      onChange={(e) => setPropDesc(e.target.value)}
                      className="w-full p-3 border rounded-xl outline-none focus:border-slate-800 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      checked={propActive} 
                      onChange={(e) => setPropActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="isActive" className="font-bold text-slate-800 cursor-pointer">
                      Объект в процессе активной продажи (ИИ подтверждает актуальность)
                    </label>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all shadow-md shadow-slate-100"
                  >
                    Обновить данные и обучить ИИ
                  </button>
                </form>
              </div>
            )}

            {/* TAB: KNOWLEDGE BASE Q&A */}
            {activeTab === 'kb' && (
              <div>
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="font-black text-lg text-slate-900">База Знаний (Knowledge Base)</h3>
                  <p className="text-xs text-slate-500">Добавляйте и редактируйте вопросы о квартире чтобы ИИ давал структурированные, верные ответы покупателям.</p>
                </div>

                {/* Add new entry form */}
                <form onSubmit={handleAddKbEntry} className="bg-slate-50 p-4 border border-slate-200 rounded-3xl mb-6 space-y-3">
                  <span className="text-xs font-black text-slate-900 block flex items-center gap-1">
                    <Plus className="w-4 h-4 text-emerald-600" /> Добавить новое правило ответа
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold">
                    <div>
                      <input 
                        type="text" 
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Вопрос (например: Остается ли кухонная плита?)"
                        className="w-full p-2.5 border rounded-xl bg-white outline-none focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        placeholder="Ответ (например: Да, качественная индукционная плита фирмы Bosch остаётся полностью.)"
                        className="w-full p-2.5 border rounded-xl bg-white outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="bg-emerald-600 text-white py-2 px-4 rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                  >
                    Занести в Базу Знаний
                  </button>
                </form>

                {/* List Q&As */}
                <div className="space-y-4">
                  {kbEntries.map(entry => (
                    <div key={entry.id} className="p-4 border rounded-2xl hover:border-slate-400 transition">
                      {editingKbId === entry.id ? (
                        <div className="space-y-2 text-xs">
                          <input 
                            type="text"
                            value={editingQuestion}
                            onChange={(e) => setEditingQuestion(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:border-slate-800 outline-none"
                          />
                          <textarea 
                            rows={3}
                            value={editingAnswer}
                            onChange={(e) => setEditingAnswer(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:border-slate-800 outline-none resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => setEditingKbId(null)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold"
                            >
                              Отмена
                            </button>
                            <button 
                              onClick={() => handleEditKbEntry(entry.id)}
                              className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 leading-snug">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {entry.question}
                            </h4>
                            <div className="flex gap-1 ml-4">
                              <button 
                                onClick={() => {
                                  setEditingKbId(entry.id);
                                  setEditingQuestion(entry.question);
                                  setEditingAnswer(entry.answer);
                                }}
                                className="text-xs text-sky-600 hover:text-sky-700 font-bold px-1.5 py-1 hover:bg-sky-50 rounded"
                              >
                                Изменить
                              </button>
                              <button 
                                onClick={() => handleDeleteKbEntry(entry.id)}
                                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-1.5 py-1 hover:bg-rose-50 rounded"
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{entry.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Right Area: WhatsApp Live Simulator (5 columns) */}
        <section className="lg:col-span-5 flex flex-col h-[calc(100vh-140px)] min-h-[550px] relative">
          
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col h-full shadow-lg">
            
            {/* WhatsApp Simulator Phone Header */}
            <div className="bg-[#075e54] text-white p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center font-bold text-sm tracking-wider uppercase border border-teal-600 relative">
                  AI
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#075e54]"></span>
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-tight flex items-center gap-1">
                    AI Риелтор Ассистент
                    <span className="text-[9px] bg-teal-900 border border-teal-600 text-teal-200 px-1.5 py-0.2 rounded-full font-bold">Бот</span>
                  </h4>
                  <p className="text-[10px] text-teal-200 font-medium">в сети (WhatsApp Business API)</p>
                </div>
              </div>

              {/* Lead Selector switcher */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-teal-100 font-bold text-right hidden sm:block">Симулировать как:</label>
                <select 
                  value={simulationRole}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSimulationRole(val as any);
                    if (val !== 'new') {
                      const l = leads.find(lead => lead.id === val);
                      if (l) {
                        setActiveLead(l);
                        fetchMessages(l.id);
                      }
                    } else {
                      // switch to custom mock
                      setCustomPhone('+77015554433');
                      setMessages([]);
                    }
                  }}
                  className="bg-teal-900 border border-teal-600 text-white text-xs p-1.5 rounded-lg outline-none cursor-pointer font-bold"
                >
                  <option value="lead_1">Иван (Ипотека) 🔥</option>
                  <option value="lead_2">Марат (Наличка) ☀️</option>
                  <option value="lead_3">Анна (Сомневается) ❄️</option>
                  <option value="new">Новый симулированный гость</option>
                </select>
              </div>
            </div>

            {/* Custom parameters inputs for New Guest mode only */}
            {simulationRole === 'new' && (
              <div className="bg-amber-50 text-slate-800 px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b border-amber-100 gap-2">
                <span className="text-[11px] text-slate-600">Номер телефона гостя:</span>
                <input 
                  type="text" 
                  value={customPhone} 
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="bg-white px-2 py-1 border text-slate-900 rounded-md font-mono text-[11px] w-40 outline-none border-amber-300 focus:border-slate-800"
                />
              </div>
            )}

            {/* Chat message streams background box */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#ece5dd] flex flex-col space-y-3 min-h-[300px]">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-2 text-[#075e54]">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Начало переписки в WhatsApp</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">Отправьте сообщение, используя быстрые шаблоны внизу, или введите свой собственный текст!</p>
                </div>
              ) : (
                messages.map(m => (
                  <div 
                    key={m.id} 
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm relative transition-all ${
                      m.role === 'client' 
                        ? 'bg-[#dcf8c6] text-slate-900 ml-auto rounded-tr-none' 
                        : m.role === 'realtor' 
                        ? 'bg-white text-slate-900 mr-auto rounded-tl-none' 
                        : m.role === 'owner'
                        ? 'bg-amber-100 border-2 border-amber-200 text-slate-900 mr-auto rounded-tl-none italic'
                        : 'bg-slate-800 text-slate-100 mx-auto text-center font-mono py-1.5 px-3 rounded-lg text-[10px] w-full max-w-[90%]'
                    }`}
                  >
                    {m.role === 'owner' && (
                      <span className="text-[9px] text-amber-800 font-bold block mb-1">
                        Владелец квартиры:
                      </span>
                    )}
                    {m.role === 'realtor' && (
                      <span className="text-[9px] text-[#128c7e] font-black block mb-0.5">
                        Ассистент Realtor AI:
                      </span>
                    )}
                    <p className="whitespace-pre-wrap">{m.message}</p>
                    <span className="text-[9px] text-slate-400 font-mono block mt-1 text-right">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
              {simulationLoading && (
                <div className="bg-white text-slate-900 rounded-2xl p-3 text-xs shadow-sm mr-auto rounded-tl-none flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#075e54] rounded-full animate-bounce"></span>
                  <span className="w-2.5 h-2.5 bg-[#075e54] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2.5 h-2.5 bg-[#075e54] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[10px] text-slate-400 font-semibold font-mono animate-pulse ml-1">Ассистент печатает ответ...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick simulation helper templates panel */}
            <div className="bg-slate-50 border-t border-slate-200 p-3 space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Быстрые сценарии симулятора:</span>
              <div className="flex flex-wrap gap-1.5">
                <button 
                  onClick={() => handleClientSendMsg("Здравствуйте")}
                  className="px-2 py-1.5 bg-white border hover:bg-slate-100 text-[10.5px] rounded-lg font-bold text-slate-700 shadow-sm transition active:scale-95 text-left"
                >
                  👋 "Здравствуйте" (Начало)
                </button>
                <button 
                  onClick={() => handleClientSendMsg("Привет! Меня зовут Александр.")}
                  className="px-2 py-1.5 bg-white border hover:bg-slate-100 text-[10.5px] rounded-lg font-bold text-slate-700 shadow-sm transition active:scale-95 text-left"
                >
                  👤 "Меня зовут Александр"
                </button>
                <button 
                  onClick={() => handleClientSendMsg("Я планирую покупать через ипотеку Отбасы")}
                  className="px-2 py-1.5 bg-white border hover:bg-slate-100 text-[10.5px] rounded-lg font-bold text-slate-700 shadow-sm transition active:scale-95 text-left"
                >
                  🏦 "Через ипотеку"
                </button>
                <button 
                  onClick={() => handleClientSendMsg("Скажите пожалуйста, что остается в квартире из мебели?")}
                  className="px-2 py-1.5 bg-white border hover:bg-slate-100 text-[10.5px] rounded-lg font-bold text-slate-700 shadow-sm transition active:scale-95 text-left"
                >
                  🛋️ "Остается мебель?" (Из базы)
                </button>
                <button 
                  onClick={() => handleClientSendMsg("Какое КСК обслуживает дом и сколько коммуналка выходит зимой?")}
                  className="px-2 py-1.5 bg-amber-100 border border-amber-200 hover:bg-amber-200 text-[10.5px] rounded-lg font-bold text-amber-900 shadow-sm transition active:scale-95 text-left"
                >
                  ❓ Сложный вопрос (Перешлет владельцу)
                </button>
                <button 
                  onClick={() => handleClientSendMsg("Было бы здорово посмотреть! Давайте запишемся на 25 июня в 19:00.")}
                  className="px-2 py-1.5 bg-emerald-100 border border-emerald-200 hover:bg-emerald-200 text-[10.5px] rounded-lg font-bold text-emerald-900 shadow-sm transition active:scale-95 text-left"
                >
                  🗓️ Запись на просмотр 25.06 в 19:00
                </button>
              </div>
            </div>

            {/* Custom user bottom input bar in WhatsApp */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center gap-2">
              <input 
                type="text" 
                value={clientInputText}
                onChange={(e) => setClientInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClientSendMsg(clientInputText);
                }}
                disabled={simulationLoading}
                placeholder="Введите сообщение клиента в WhatsApp..."
                className="flex-1 bg-white border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#075e54]"
              />
              <button 
                onClick={() => handleClientSendMsg(clientInputText)}
                disabled={simulationLoading || !clientInputText.trim()}
                className="p-3 bg-[#075e54] text-white hover:bg-[#128c7e] rounded-xl transition duration-150 active:scale-95 flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        </section>

      </main>

      {/* Developer note explanation block footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-center text-[10.5px] text-slate-400 mt-auto flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
        <span className="font-medium">
          Создано ИИ-разработчиком в Google AI Studio Build. База данных: <span className="font-mono bg-slate-50 text-slate-500 border rounded py-0.5 px-1.5">data/db.json</span>
        </span>
        <span className="font-mono text-emerald-600 font-bold">
          Модели: Gemini 3.5 Flash (Разговорный движок) & Gemini Extract 1.0 JSON (Аналитический движок)
        </span>
      </footer>

    </div>
  );
}
