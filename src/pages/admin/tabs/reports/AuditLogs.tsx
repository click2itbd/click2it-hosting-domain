import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs, limit, deleteDoc, doc, writeBatch, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Loader2, ShieldAlert, Trash2, Clock, User, Filter, Edit2, Plus, 
  Search, Download, Printer, RefreshCw, Eye, Calendar, ArrowRight, 
  CheckCircle2, AlertOctagon, X, Shield, SlidersHorizontal, ChevronRight,
  Info, Laptop, FileText, Check, ChevronDown, Undo2, RotateCcw, BarChart3,
  Send, Share2, Copy, Sparkles, TrendingUp, Award, MessageSquare, Zap,
  Radio, Code, Flame, Sun, Sunrise, Moon
} from 'lucide-react';
import { format, isSameMonth, isSameDay, subDays, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '../../../../lib/utils';
import { AuditLogItem, logAudit } from '../../../../lib/audit';

export const AuditLogs: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Modals & Views state
  const [activeView, setActiveView] = useState<'logs' | 'productivity'>('logs');
  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeOption, setPurgeOption] = useState<'30' | '60' | '90' | 'all_filtered'>('30');
  const [purging, setPurging] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // Live Stream & Diff States
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [diffViewMode, setDiffViewMode] = useState<'visual' | 'raw'>('visual');
  const [diffFilterChangedOnly, setDiffFilterChangedOnly] = useState<boolean>(true);

  // Daily Digest & Telegram States
  const [isDigestModalOpen, setIsDigestModalOpen] = useState(false);
  const [digestDate, setDigestDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [telegramToken, setTelegramToken] = useState<string>(() => {
    try { return localStorage.getItem('audit_telegram_token') || ''; } catch { return ''; }
  });
  const [telegramChatId, setTelegramChatId] = useState<string>(() => {
    try { return localStorage.getItem('audit_telegram_chat_id') || ''; } catch { return ''; }
  });
  const [sendingTelegram, setSendingTelegram] = useState(false);

  useEffect(() => {
    if (!isLiveStream) {
      fetchLogs();
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(1000));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const fetchedLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogItem));
        setLogs(fetchedLogs);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Real-time audit log stream error:', error);
        toast.error('Failed to stream live audit logs');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [isLiveStream]);

  const fetchLogs = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(1000));
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogItem));
      setLogs(fetchedLogs);
      if (isManualRefresh) toast.success('Audit logs updated');
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only administrators can delete audit logs');
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this audit record?")) return;
    try {
      await deleteDoc(doc(db, 'audit_logs', id));
      setLogs(prev => prev.filter(l => l.id !== id));
      if (inspectLog?.id === id) setInspectLog(null);
      toast.success("Log deleted successfully");
    } catch (error) {
      toast.error("Failed to delete log");
    }
  };

  const extractAmount = (text?: string): number => {
    if (!text) return 0;
    const match = text.match(/৳\s*([0-9,]+)/) || text.match(/BDT\s*([0-9,]+)/i);
    if (match) {
      return Number(match[1].replace(/,/g, '')) || 0;
    }
    return 0;
  };

  const handleRollback = async (log: AuditLogItem) => {
    if (!isAdmin) {
      toast.error('Only administrators can rollback changes');
      return;
    }
    if (!log.previousState || !log.entityId) {
      toast.error('Previous state data is not available for this record');
      return;
    }

    const entityName = log.entityType || 'record';
    const confirmMsg = `Are you sure you want to revert ${entityName} #${log.entityId.slice(0, 8)} back to its previous state?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setRollingBack(true);
      if (log.entityType === 'Product') {
        const prodRef = doc(db, 'products', log.entityId);
        await updateDoc(prodRef, log.previousState);
      } else if (log.entityType === 'Order') {
        const orderRef = doc(db, 'orders', log.entityId);
        await updateDoc(orderRef, log.previousState);
      } else {
        toast.error(`Automated rollback is currently not supported for ${entityName}`);
        return;
      }

      await logAudit(
        'RESTORE',
        log.entityType,
        `Reverted ${log.entityType} #${log.entityId.slice(0, 8)} back to previous state from audit log #${log.id?.slice(-8) || ''}`,
        profile?.displayName || profile?.email || 'Admin',
        {
          entityId: log.entityId,
          newState: log.previousState
        }
      );

      toast.success(`Successfully restored ${log.entityType} to its previous state!`);
      setInspectLog(null);
      await fetchLogs(true);
    } catch (err: any) {
      console.error('Error rolling back:', err);
      toast.error(`Rollback failed: ${err.message || 'Unknown error'}`);
    } finally {
      setRollingBack(false);
    }
  };

  // Extract unique users and entities for filters
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.performedBy) set.add(l.performedBy);
    });
    return Array.from(set).sort();
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.entityType) set.add(l.entityType);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const sevenDaysAgo = subDays(now, 7);

    return logs.filter(log => {
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp);

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchUser = (log.performedBy || '').toLowerCase().includes(q);
        const matchEntity = (log.entityType || '').toLowerCase().includes(q);
        const matchAction = (log.action || '').toLowerCase().includes(q);
        const matchId = (log.entityId || log.id || '').toLowerCase().includes(q);
        if (!matchDetails && !matchUser && !matchEntity && !matchAction && !matchId) return false;
      }

      // Action Filter
      if (selectedAction !== 'all') {
        if (log.action?.toUpperCase() !== selectedAction.toUpperCase()) return false;
      }

      // Entity Filter
      if (selectedEntity !== 'all') {
        if (log.entityType?.toLowerCase() !== selectedEntity.toLowerCase()) return false;
      }

      // User Filter
      if (selectedUser !== 'all') {
        if (log.performedBy !== selectedUser) return false;
      }

      // Date Presets
      if (datePreset === 'today') {
        if (logDate < todayStart) return false;
      } else if (datePreset === 'yesterday') {
        if (logDate < yesterdayStart || logDate > yesterdayEnd) return false;
      } else if (datePreset === '7days') {
        if (logDate < sevenDaysAgo) return false;
      } else if (datePreset === 'month') {
        if (!isSameMonth(logDate, now)) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          const start = new Date(`${customStartDate}T00:00:00`);
          if (logDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(`${customEndDate}T23:59:59.999`);
          if (logDate > end) return false;
        }
      }

      // Month input filter
      if (filterMonth) {
        const [y, m] = filterMonth.split('-');
        const filterDateObj = new Date(Number(y), Number(m) - 1);
        if (!isSameMonth(logDate, filterDateObj)) return false;
      }

      // Exact Date input filter
      if (filterDate) {
        if (!isSameDay(logDate, new Date(filterDate))) return false;
      }

      return true;
    });
  }, [logs, searchQuery, selectedAction, selectedEntity, selectedUser, datePreset, customStartDate, customEndDate, filterMonth, filterDate]);

  // Statistics calculation
  const stats = useMemo(() => {
    let creates = 0;
    let edits = 0;
    let deletes = 0;
    const activeOperators = new Set<string>();

    filteredLogs.forEach(l => {
      const act = (l.action || '').toUpperCase();
      if (act === 'CREATE') creates++;
      else if (act === 'EDIT' || act === 'STATUS_CHANGE' || act === 'SETTINGS') edits++;
      else if (act === 'DELETE') deletes++;
      if (l.performedBy) activeOperators.add(l.performedBy);
    });

    return {
      total: filteredLogs.length,
      creates,
      edits,
      deletes,
      operatorsCount: activeOperators.size
    };
  }, [filteredLogs]);

  // Operator Productivity & Staff Breakdown (Feature 4)
  const operatorStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      total: number;
      creates: number;
      edits: number;
      deletes: number;
      salesCount: number;
      salesAmount: number;
      paymentsCount: number;
      paymentsAmount: number;
      lastActive: string;
      lastAction: string;
      lastDevice: string;
    }>();

    filteredLogs.forEach(l => {
      const op = l.performedBy || 'Unknown';
      if (!map.has(op)) {
        map.set(op, {
          name: op,
          total: 0,
          creates: 0,
          edits: 0,
          deletes: 0,
          salesCount: 0,
          salesAmount: 0,
          paymentsCount: 0,
          paymentsAmount: 0,
          lastActive: l.timestamp,
          lastAction: l.details || '',
          lastDevice: l.userAgent || ''
        });
      }

      const item = map.get(op)!;
      item.total++;
      const act = (l.action || '').toUpperCase();
      const ent = (l.entityType || '').toLowerCase();
      const amt = extractAmount(l.details);

      if (act === 'CREATE') item.creates++;
      if (act === 'EDIT' || act === 'STATUS_CHANGE') item.edits++;
      if (act === 'DELETE') item.deletes++;

      if (ent === 'sale' || ent === 'order') {
        item.salesCount++;
        item.salesAmount += amt;
      }
      if (ent === 'payment') {
        item.paymentsCount++;
        item.paymentsAmount += amt;
      }

      // Update last active if newer
      if (l.timestamp && (!item.lastActive || new Date(l.timestamp) > new Date(item.lastActive))) {
        item.lastActive = l.timestamp;
        item.lastAction = l.details || '';
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredLogs]);

  // 24-Hour Activity & Heatmap Computation (Feature 5)
  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const d = new Date();
      d.setHours(i, 0, 0, 0);
      return {
        hour: i,
        timeLabel: format(d, 'ha'), // e.g. 12am, 1am, 2pm
        timeRange: `${format(d, 'ha')} - ${format(new Date(d.getTime() + 3600000), 'ha')}`,
        count: 0,
        creates: 0,
        edits: 0,
        deletes: 0,
        operators: new Map<string, number>(),
      };
    });

    filteredLogs.forEach(l => {
      if (!l.timestamp) return;
      const logDate = new Date(l.timestamp);
      const h = logDate.getHours();
      if (h >= 0 && h < 24) {
        hours[h].count++;
        const act = (l.action || '').toUpperCase();
        if (act === 'CREATE') hours[h].creates++;
        else if (act === 'DELETE') hours[h].deletes++;
        else hours[h].edits++;

        const op = l.performedBy || 'Unknown';
        hours[h].operators.set(op, (hours[h].operators.get(op) || 0) + 1);
      }
    });

    const maxCount = Math.max(...hours.map(h => h.count), 1);
    const peakHour = hours.reduce((best, cur) => (cur.count > best.count ? cur : best), hours[0]);

    // Calculate time of day shifts
    const morningCount = hours.slice(6, 12).reduce((s, h) => s + h.count, 0); // 6 AM - 12 PM
    const afternoonCount = hours.slice(12, 18).reduce((s, h) => s + h.count, 0); // 12 PM - 6 PM
    const eveningCount = hours.slice(18, 24).reduce((s, h) => s + h.count, 0); // 6 PM - 12 AM
    const nightCount = hours.slice(0, 6).reduce((s, h) => s + h.count, 0); // 12 AM - 6 AM

    return {
      hours,
      maxCount,
      peakHour,
      morningCount,
      afternoonCount,
      eveningCount,
      nightCount,
    };
  }, [filteredLogs]);

  // Visual Diff Computation & Renderer (Feature 3)
  const computeDiff = (previousState: any, newState: any) => {
    const prev = previousState && typeof previousState === 'object' ? previousState : {};
    const next = newState && typeof newState === 'object' ? newState : {};
    const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));

    const rows = allKeys.map(key => {
      const hasPrev = key in prev;
      const hasNext = key in next;
      const valPrev = prev[key];
      const valNext = next[key];

      const prevStr = JSON.stringify(valPrev);
      const nextStr = JSON.stringify(valNext);
      const isChanged = prevStr !== nextStr;

      let status: 'added' | 'removed' | 'changed' | 'unchanged' = 'unchanged';
      if (!hasPrev && hasNext) status = 'added';
      else if (hasPrev && !hasNext) status = 'removed';
      else if (isChanged) status = 'changed';

      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .trim();

      return {
        key,
        label,
        valPrev,
        valNext,
        status,
        isChanged: status !== 'unchanged',
      };
    });

    const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
    return rows.sort((a, b) => order[a.status] - order[b.status]);
  };

  const renderDiffValue = (val: any) => {
    if (val === undefined || val === null) {
      return <span className="text-slate-400 italic font-mono text-[11px]">empty / null</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span className={cn(
          "px-2 py-0.5 rounded text-[11px] font-bold font-mono",
          val ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
        )}>
          {val ? 'TRUE' : 'FALSE'}
        </span>
      );
    }
    if (typeof val === 'number') {
      return <span className="font-mono text-xs font-bold text-slate-800">{val.toLocaleString()}</span>;
    }
    if (typeof val === 'string') {
      if (!val.trim()) return <span className="text-slate-400 italic text-[11px]">empty string</span>;
      return <span className="text-xs break-all text-slate-800 font-medium">{val}</span>;
    }
    if (Array.isArray(val)) {
      return (
        <div className="text-[11px] font-mono bg-slate-100/80 rounded-lg p-2 max-h-28 overflow-y-auto space-y-0.5">
          <span className="font-bold text-slate-600 block mb-1">List ({val.length} items):</span>
          {val.slice(0, 10).map((item, idx) => (
            <div key={idx} className="truncate text-slate-700">
              • {typeof item === 'object' ? (item?.name || item?.productName || item?.title || JSON.stringify(item)) : String(item)}
            </div>
          ))}
          {val.length > 10 && <div className="text-slate-400 text-[10px]">+{val.length - 10} more items...</div>}
        </div>
      );
    }
    if (typeof val === 'object') {
      return (
        <div className="text-[11px] font-mono bg-slate-100/80 rounded-lg p-2 max-h-28 overflow-y-auto space-y-0.5">
          {Object.entries(val).slice(0, 10).map(([k, v]) => (
            <div key={k} className="truncate text-slate-700">
              <span className="font-semibold text-slate-500">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </div>
          ))}
          {Object.keys(val).length > 10 && <div className="text-slate-400 text-[10px]">+{Object.keys(val).length - 10} more properties...</div>}
        </div>
      );
    }
    return <span className="text-xs font-mono">{String(val)}</span>;
  };

  // Daily Digest Computation (Feature 6)
  const digestDayLogs = useMemo(() => {
    const targetDate = digestDate ? new Date(`${digestDate}T12:00:00`) : new Date();
    return logs.filter(l => l.timestamp && isSameDay(new Date(l.timestamp), targetDate));
  }, [logs, digestDate]);

  const digestSummary = useMemo(() => {
    let salesCount = 0;
    let salesAmount = 0;
    let productsCount = 0;
    let paymentsCount = 0;
    let paymentsAmount = 0;
    let deletesCount = 0;
    const operatorCounts: Record<string, number> = {};

    digestDayLogs.forEach(l => {
      const act = (l.action || '').toUpperCase();
      const ent = (l.entityType || '').toLowerCase();
      const amt = extractAmount(l.details);
      const op = l.performedBy || 'Unknown';
      operatorCounts[op] = (operatorCounts[op] || 0) + 1;

      if (ent === 'sale' || ent === 'order') {
        salesCount++;
        salesAmount += amt;
      } else if (ent === 'product') {
        productsCount++;
      } else if (ent === 'payment') {
        paymentsCount++;
        paymentsAmount += amt;
      }

      if (act === 'DELETE') {
        deletesCount++;
      }
    });

    let topOperator = 'None';
    let maxOps = 0;
    Object.entries(operatorCounts).forEach(([name, cnt]) => {
      if (cnt > maxOps) {
        maxOps = cnt;
        topOperator = `${name} (${cnt} operations)`;
      }
    });

    return {
      totalEvents: digestDayLogs.length,
      salesCount,
      salesAmount,
      productsCount,
      paymentsCount,
      paymentsAmount,
      deletesCount,
      topOperator
    };
  }, [digestDayLogs]);

  const generateDigestMessage = () => {
    const targetDate = digestDate ? new Date(`${digestDate}T12:00:00`) : new Date();
    const dateFormatted = format(targetDate, 'dd MMMM yyyy');
    return `📊 *DAILY AUDIT & BUSINESS DIGEST*
📅 *Date:* ${dateFormatted}
🏢 *System:* Click POS & E-Commerce Admin

━━━━━━━━━━━━━━━━━━━━━
🔹 *Total Activity Logs:* ${digestSummary.totalEvents}
🛒 *Sales / Orders:* ${digestSummary.salesCount} ${digestSummary.salesAmount > 0 ? `(~৳${digestSummary.salesAmount.toLocaleString()})` : ''}
📦 *Product Add & Edits:* ${digestSummary.productsCount}
💵 *Due Collections / Payments:* ${digestSummary.paymentsCount} ${digestSummary.paymentsAmount > 0 ? `(~৳${digestSummary.paymentsAmount.toLocaleString()})` : ''}
🗑️ *Deletions / Voided:* ${digestSummary.deletesCount}
━━━━━━━━━━━━━━━━━━━━━
🏆 *Top Active Operator:* ${digestSummary.topOperator}
🛡️ *Security Status:* Normal & Fully Logged

_Automated Digest from System Audit Trail_`;
  };

  const handleCopyDigest = async () => {
    try {
      await navigator.clipboard.writeText(generateDigestMessage());
      toast.success('Daily Digest copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleWhatsAppShare = () => {
    const text = generateDigestMessage();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendTelegram = async () => {
    if (!telegramToken.trim() || !telegramChatId.trim()) {
      toast.error('Please enter Telegram Bot Token and Chat ID');
      return;
    }
    try {
      setSendingTelegram(true);
      try {
        localStorage.setItem('audit_telegram_token', telegramToken.trim());
        localStorage.setItem('audit_telegram_chat_id', telegramChatId.trim());
      } catch (e) {
        console.error(e);
      }

      const resp = await fetch(`https://api.telegram.org/bot${telegramToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId.trim(),
          text: generateDigestMessage(),
          parse_mode: 'Markdown'
        })
      });
      const resData = await resp.json();
      if (resData.ok) {
        toast.success('Daily Digest sent to Telegram successfully!');
      } else {
        toast.error(`Telegram API error: ${resData.description || 'Failed to send'}`);
      }
    } catch (err: any) {
      console.error('Telegram send error:', err);
      toast.error(`Failed to send to Telegram: ${err.message}`);
    } finally {
      setSendingTelegram(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedAction('all');
    setSelectedEntity('all');
    setSelectedUser('all');
    setDatePreset('all');
    setFilterMonth('');
    setFilterDate('');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const isAnyFilterActive = searchQuery || selectedAction !== 'all' || selectedEntity !== 'all' || selectedUser !== 'all' || datePreset !== 'all' || filterMonth || filterDate;

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs available to export');
      return;
    }

    const headers = ['Timestamp', 'Date & Time', 'Action', 'Entity Type', 'Entity ID', 'Details', 'Performed By', 'User Agent'];
    const rows = filteredLogs.map(l => [
      l.timestamp || '',
      l.timestamp ? format(new Date(l.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.entityType || '').replace(/"/g, '""')}"`,
      `"${(l.entityId || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.performedBy || '').replace(/"/g, '""')}"`,
      `"${(l.userAgent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} audit records to CSV`);
  };

  // Export to PDF (Feature 6)
  const handleExportPDF = () => {
    if (filteredLogs.length === 0) {
      toast.error('No audit records available to export');
      return;
    }

    try {
      const doc = new jsPDF('landscape');
      const companyName = settings?.companyName || settings?.siteName || settings?.brandName || 'E-Commerce Management System';

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 297, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL AUDIT TRAIL REPORT', 14, 15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(companyName, 283, 15, { align: 'right' });

      // Report Meta
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const dateStr = format(new Date(), 'dd MMM yyyy, hh:mm a');
      doc.text(`Generated On: ${dateStr}`, 14, 32);
      doc.text(`Active Filter: ${datePreset.toUpperCase()} | Operator: ${selectedUser === 'all' ? 'All' : selectedUser} | Module: ${selectedEntity === 'all' ? 'All' : selectedEntity} | Action: ${selectedAction === 'all' ? 'All' : selectedAction}`, 14, 37);

      // Summary KPIs Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 42, 269, 14, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Total Records: ${filteredLogs.length}`, 20, 51);
      doc.setTextColor(16, 185, 129); // emerald
      doc.text(`Created: ${stats.creates}`, 75, 51);
      doc.setTextColor(245, 158, 11); // amber
      doc.text(`Modified: ${stats.edits}`, 130, 51);
      doc.setTextColor(239, 68, 68); // rose
      doc.text(`Deleted: ${stats.deletes}`, 185, 51);
      doc.setTextColor(99, 102, 241); // indigo
      doc.text(`Active Staff: ${stats.operatorsCount}`, 240, 51);

      // Table Data
      const tableRows = filteredLogs.slice(0, 500).map(l => [
        l.timestamp ? format(new Date(l.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        (l.action || '').toUpperCase(),
        l.entityType || 'General',
        l.performedBy || 'System',
        l.details || '',
        l.entityId ? `#${l.entityId.slice(0, 10)}` : '-'
      ]);

      autoTable(doc, {
        startY: 61,
        head: [['Date & Time', 'Action', 'Module', 'Operator', 'Event Description', 'Reference ID']],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 28 },
          3: { cellWidth: 35 },
          4: { cellWidth: 112 },
          5: { cellWidth: 34 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const val = String(data.cell.raw);
            if (val === 'DELETE') data.cell.styles.textColor = [225, 29, 72];
            else if (val === 'CREATE') data.cell.styles.textColor = [5, 150, 105];
            else if (val === 'EDIT' || val === 'STATUS_CHANGE') data.cell.styles.textColor = [217, 119, 6];
            else if (val === 'SETTINGS') data.cell.styles.textColor = [79, 70, 229];
          }
        }
      });

      doc.save(`Audit_Trail_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
      toast.success(`Exported Audit Report PDF (${Math.min(filteredLogs.length, 500)} records)`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Smart Purge execution
  const handleExecutePurge = async () => {
    if (!isAdmin) {
      toast.error('Unauthorized');
      return;
    }

    setPurging(true);
    try {
      let targets: AuditLogItem[] = [];
      const now = new Date();

      if (purgeOption === '30') {
        const threshold = subDays(now, 30);
        targets = logs.filter(l => l.timestamp && new Date(l.timestamp) < threshold);
      } else if (purgeOption === '60') {
        const threshold = subDays(now, 60);
        targets = logs.filter(l => l.timestamp && new Date(l.timestamp) < threshold);
      } else if (purgeOption === '90') {
        const threshold = subDays(now, 90);
        targets = logs.filter(l => l.timestamp && new Date(l.timestamp) < threshold);
      } else if (purgeOption === 'all_filtered') {
        targets = [...filteredLogs];
      }

      if (targets.length === 0) {
        toast('No logs match the purge criteria.');
        setIsPurgeModalOpen(false);
        return;
      }

      // Batch delete in chunks of 400
      const targetIds = new Set(targets.map(t => t.id).filter(Boolean));
      const chunks = [];
      const targetsList = targets.filter(t => t.id);
      
      for (let i = 0; i < targetsList.length; i += 400) {
        chunks.push(targetsList.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          if (item.id) batch.delete(doc(db, 'audit_logs', item.id));
        });
        await batch.commit();
      }

      setLogs(prev => prev.filter(l => !l.id || !targetIds.has(l.id)));
      toast.success(`Purged ${targets.length} log records successfully`);
      setIsPurgeModalOpen(false);
    } catch (err: any) {
      console.error('Failed to purge logs:', err);
      toast.error('Failed to purge logs: ' + err.message);
    } finally {
      setPurging(false);
    }
  };

  const getActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act === 'DELETE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200">
          <Trash2 size={12} className="text-rose-600" /> DELETE
        </span>
      );
    }
    if (act === 'CREATE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
          <Plus size={12} className="text-emerald-600" /> CREATE
        </span>
      );
    }
    if (act === 'EDIT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-700 border border-amber-200">
          <Edit2 size={12} className="text-amber-600" /> EDIT
        </span>
      );
    }
    if (act === 'STATUS_CHANGE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700 border border-blue-200">
          <CheckCircle2 size={12} className="text-blue-600" /> STATUS
        </span>
      );
    }
    if (act === 'RESTORE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-cyan-100 text-cyan-800 border border-cyan-200">
          <RotateCcw size={12} className="text-cyan-600" /> RESTORE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-700 border border-purple-200">
        <SlidersHorizontal size={12} className="text-purple-600" /> {act}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-sm">Loading security audit trails...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Shield size={14} className="text-blue-400" />
              Enterprise Audit Engine
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" title="Real-time Active" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              System Audit Logs & Activity Trail
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Transparent, tamper-evident record of all administrative activities, record creations, financial edits, and security events across the entire platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Live Stream Real-time Toggle */}
            <button
              onClick={() => {
                setIsLiveStream(!isLiveStream);
                toast.success(isLiveStream ? 'Live streaming paused' : 'Live streaming activated');
              }}
              className={cn(
                "px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm",
                isLiveStream
                  ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60"
                  : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white"
              )}
              title={isLiveStream ? "Live real-time stream is active (Click to pause)" : "Live stream is paused (Click to resume real-time)"}
            >
              <span className="relative flex h-2.5 w-2.5">
                {isLiveStream && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isLiveStream ? "bg-emerald-500" : "bg-slate-500")}></span>
              </span>
              <span>{isLiveStream ? 'Live: ON' : 'Live: PAUSED'}</span>
            </button>

            <button
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
              title="Refresh Logs"
            >
              <RefreshCw size={16} className={cn("transition-transform", refreshing && "animate-spin text-blue-400")} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsDigestModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-950/40"
              title="Daily Business & Security Digest"
            >
              <MessageSquare size={16} className="text-purple-200" />
              <span>Daily Digest</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
              title="Export Official Audit Report to PDF"
            >
              <FileText size={16} className="text-rose-400" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
              title="Export Filtered Logs to CSV"
            >
              <Download size={16} className="text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
              title="Print Audit Report"
            >
              <Printer size={16} className="text-blue-400" />
              <span>Print</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsPurgeModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-900/30"
                title="Purge Old Audit Logs"
              >
                <Trash2 size={16} />
                <span>Purge Records</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Logs */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Entries</div>
            <div className="text-2xl font-black text-slate-800">{stats.total}</div>
          </div>
        </div>

        {/* Deletions */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 size={22} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-500">Deletions</div>
            <div className="text-2xl font-black text-rose-700">{stats.deletes}</div>
          </div>
        </div>

        {/* Edits */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Edit2 size={22} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Modifications</div>
            <div className="text-2xl font-black text-amber-700">{stats.edits}</div>
          </div>
        </div>

        {/* Creations */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Plus size={22} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Created Items</div>
            <div className="text-2xl font-black text-emerald-700">{stats.creates}</div>
          </div>
        </div>

        {/* Operators */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 col-span-2 sm:col-span-1">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <User size={22} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-500">Operators</div>
            <div className="text-2xl font-black text-indigo-700">{stats.operatorsCount}</div>
          </div>
        </div>
      </div>

      {/* View Switcher: Audit Stream vs Staff Productivity Breakdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('logs')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
              activeView === 'logs'
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Shield size={16} className={activeView === 'logs' ? "text-blue-400" : "text-slate-400"} />
            <span>Audit Trail Stream</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-black",
              activeView === 'logs' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            )}>
              {filteredLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('productivity')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
              activeView === 'productivity'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <BarChart3 size={16} className={activeView === 'productivity' ? "text-indigo-200" : "text-slate-400"} />
            <span>Staff Productivity & Activity Breakdown</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-black",
              activeView === 'productivity' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            )}>
              {operatorStats.length} Operators
            </span>
          </button>
        </div>

        {activeView === 'productivity' && (
          <div className="text-xs text-slate-500 font-semibold px-2">
            Sorted by total administrative activity
          </div>
        )}
      </div>

      {/* Filter and Search Control Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        {/* Row 1: Search and Preset Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by details, order #, admin, entity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  setDatePreset(preset.id as any);
                  if (preset.id !== 'custom') {
                    setFilterMonth('');
                    setFilterDate('');
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  datePreset === preset.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          {/* Action Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="font-bold text-slate-500">Action:</span>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="DELETE">DELETE (Red)</option>
              <option value="EDIT">EDIT (Amber)</option>
              <option value="CREATE">CREATE (Green)</option>
              <option value="STATUS_CHANGE">STATUS CHANGE</option>
              <option value="SETTINGS">SETTINGS</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="font-bold text-slate-500">Module:</span>
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Modules</option>
              {uniqueEntities.map(ent => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>

          {/* Performed By Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="font-bold text-slate-500">Operator:</span>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Operators</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Month / Date Exact inputs if custom */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none"
              />
              <span className="font-bold text-slate-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none"
              />
            </div>
          )}

          {/* Reset Filters button */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Logs Content (Table vs Staff Productivity) */}
      {activeView === 'productivity' ? (
        <div className="space-y-6">
          {/* 24-Hour Operational Activity Heatmap & Peak Hours (Feature 5) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Clock className="text-indigo-600" size={18} />
                    24-Hour Staff Activity & Peak Hours Distribution
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                    24h Heatmap
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Chronological distribution of all staff operations (Sales, updates, voids, creations) across the 24 hours of the day.
                </p>
              </div>

              {/* Peak Hour Highlight */}
              {hourlyActivity.peakHour.count > 0 && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-200/80 px-3.5 py-2 rounded-xl shrink-0">
                  <Flame size={16} className="text-amber-600 animate-pulse" />
                  <div className="text-xs">
                    <span className="text-slate-500 font-semibold">Peak Operational Rush: </span>
                    <span className="font-black text-slate-900">{hourlyActivity.peakHour.timeRange}</span>
                    <span className="ml-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px]">
                      {hourlyActivity.peakHour.count} actions
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Time of Day Shifts Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Sunrise size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Morning (6AM - 12PM)</span>
                    <span className="text-sm font-black text-slate-800">{hourlyActivity.morningCount} actions</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Sun size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Afternoon (12PM - 6PM)</span>
                    <span className="text-sm font-black text-slate-800">{hourlyActivity.afternoonCount} actions</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Evening (6PM - 12AM)</span>
                    <span className="text-sm font-black text-slate-800">{hourlyActivity.eveningCount} actions</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Moon size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Night (12AM - 6AM)</span>
                    <span className="text-sm font-black text-slate-800">{hourlyActivity.nightCount} actions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 24-Hour Visual Bar Columns */}
            <div className="space-y-2 pt-2">
              <div 
                className="gap-1 sm:gap-1.5 h-36 items-end p-2.5 bg-slate-50/80 rounded-xl border border-slate-100"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
              >
                {hourlyActivity.hours.map(h => {
                  const heightPercent = h.count > 0 ? Math.max(Math.round((h.count / hourlyActivity.maxCount) * 100), 8) : 0;
                  const isPeak = h.hour === hourlyActivity.peakHour.hour && h.count > 0;
                  const topOp = Array.from(h.operators.entries()).sort((a, b) => b[1] - a[1])[0];

                  return (
                    <div 
                      key={h.hour}
                      className="group relative flex flex-col items-center justify-end h-full"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none w-40 -translate-x-1/2 left-1/2">
                        <div className="bg-slate-900 text-white rounded-xl p-2.5 text-[10px] shadow-2xl space-y-1 w-full text-center border border-slate-700">
                          <div className="font-black text-indigo-300 border-b border-slate-700 pb-1">{h.timeRange}</div>
                          <div className="font-black text-sm text-white">{h.count} actions</div>
                          <div className="text-[9px] text-slate-300 flex justify-between px-1 pt-0.5">
                            <span className="text-emerald-400">+{h.creates} add</span>
                            <span className="text-amber-400">~{h.edits} edit</span>
                            <span className="text-rose-400">-{h.deletes} del</span>
                          </div>
                          {topOp && (
                            <div className="text-[9px] text-slate-400 border-t border-slate-800 pt-1 truncate">
                              Top: <span className="text-indigo-300 font-bold">{topOp[0]}</span> ({topOp[1]})
                            </div>
                          )}
                        </div>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                      </div>

                      {/* Bar Column */}
                      <div className="w-full flex items-end justify-center h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={cn(
                            "w-full rounded-t-sm sm:rounded-t-md transition-all duration-300",
                            h.count === 0 && "h-1 bg-slate-200/50",
                            h.count > 0 && !isPeak && "bg-gradient-to-t from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-xs",
                            isPeak && "bg-gradient-to-t from-amber-500 via-rose-500 to-rose-600 shadow-md shadow-rose-500/20"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 24-Hour Column Labels */}
              <div 
                className="gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 text-center select-none"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
              >
                {hourlyActivity.hours.map(h => (
                  <div key={h.hour} className={cn(h.hour % 3 === 0 ? "text-slate-700 font-black" : "hidden sm:block text-slate-400")}>
                    {h.hour % 3 === 0 ? h.timeLabel : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {operatorStats.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 mx-auto">
                <BarChart3 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Operator Activity Found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No staff activity found matching the selected timeframe. Try switching date filters above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {operatorStats.map((op, idx) => {
                const percentage = stats.total > 0 ? Math.round((op.total / stats.total) * 100) : 0;
                return (
                  <div key={op.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                          {op.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-black text-slate-800 text-sm">{op.name}</h4>
                            {idx === 0 && (
                              <span className="p-1 rounded bg-amber-100 text-amber-700" title="Top Performer">
                                <Award size={13} />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> {op.lastActive ? formatDistanceToNow(new Date(op.lastActive), { addSuffix: true }) : 'N/A'}
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {op.total} Actions ({percentage}%)
                      </span>
                    </div>

                    {/* Activity Share Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Workload Share</span>
                        <span>{percentage}% of all operations</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                    </div>

                    {/* Operational Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Sales */}
                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-emerald-600">Sales & POS</div>
                        <div className="font-black text-emerald-800 text-sm mt-0.5">{op.salesCount} Invoices</div>
                        {op.salesAmount > 0 && (
                          <div className="text-[10px] font-bold text-emerald-700">~৳{op.salesAmount.toLocaleString()}</div>
                        )}
                      </div>

                      {/* Products */}
                      <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-blue-600">Catalog Updates</div>
                        <div className="font-black text-blue-800 text-sm mt-0.5">{op.creates + op.edits} Items</div>
                        <div className="text-[10px] text-blue-600">{op.creates} added • {op.edits} edited</div>
                      </div>

                      {/* Payments */}
                      <div className="p-2.5 bg-purple-50/60 border border-purple-100 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-purple-600">Dues / Payments</div>
                        <div className="font-black text-purple-800 text-sm mt-0.5">{op.paymentsCount} Tx</div>
                        {op.paymentsAmount > 0 && (
                          <div className="text-[10px] font-bold text-purple-700">~৳{op.paymentsAmount.toLocaleString()}</div>
                        )}
                      </div>

                      {/* Deletions */}
                      <div className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-xl">
                        <div className="text-[10px] uppercase font-bold text-rose-600">Void / Deletions</div>
                        <div className="font-black text-rose-800 text-sm mt-0.5">{op.deletes} Records</div>
                        <div className="text-[10px] text-rose-500">{op.deletes === 0 ? 'Clean Record' : 'Deleted actions'}</div>
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => {
                        setSelectedUser(op.name);
                        setActiveView('logs');
                      }}
                      className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                    >
                      <span>Filter Audit Trail for {op.name}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Main Audit Logs Table */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Audit Records Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              No audit logs match your search criteria. Try relaxing your filters or searching for another keyword.
            </p>
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                  <th className="py-4 px-5">Action</th>
                  <th className="py-4 px-5">Module / Entity</th>
                  <th className="py-4 px-5">Event Description</th>
                  <th className="py-4 px-5">Operator</th>
                  <th className="py-4 px-5">Date & Time</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.map((log) => {
                  const logDate = log.timestamp ? new Date(log.timestamp) : null;
                  const relativeTime = logDate ? formatDistanceToNow(logDate, { addSuffix: true }) : '';

                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setInspectLog(log)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Action Badge */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Entity Type */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.entityType || 'General'}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-5 max-w-md">
                        <div className="text-slate-800 font-medium line-clamp-2 text-xs sm:text-sm">
                          {log.details}
                        </div>
                        {log.entityId && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            ID: {log.entityId}
                          </span>
                        )}
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                            {(log.performedBy || 'A').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-700 text-xs truncate max-w-[140px]" title={log.performedBy}>
                            {log.performedBy || 'System / Auto'}
                          </span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-xs">
                        <div className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          {logDate ? format(logDate, 'dd MMM yyyy, hh:mm a') : 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium pl-4">
                          {relativeTime}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {log.previousState && log.entityId && (log.entityType === 'Product' || log.entityType === 'Order') && isAdmin && (
                            <button
                              onClick={() => handleRollback(log)}
                              disabled={rollingBack}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Rollback / Restore Previous State"
                            >
                              <Undo2 size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setInspectLog(log)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Inspect Details"
                          >
                            <Eye size={16} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => log.id && handleDelete(log.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Showing <span className="font-bold text-slate-700">{filteredLogs.length}</span> of <span className="font-bold text-slate-700">{logs.length}</span> total logs
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> High-security Audit Store
            </span>
            <span>Retained up to 1000 latest system events</span>
          </div>
        </div>
      </div>
      )}

      {/* Log Details Modal */}
      {inspectLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={cn(
            "bg-white rounded-2xl shadow-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all",
            (inspectLog.previousState || inspectLog.newState) ? "max-w-4xl" : "max-w-2xl"
          )}>
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base">Audit Record Inspector</h3>
                  <p className="text-xs text-slate-300">Detailed compliance trace for event #{inspectLog.id?.slice(-8) || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Event Overview Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-bold block mb-1">Action Type</span>
                  <div>{getActionBadge(inspectLog.action)}</div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-bold block mb-1">Module / Entity</span>
                  <span className="font-bold text-slate-800 text-sm">{inspectLog.entityType || 'General'}</span>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-bold block mb-1">Performed By</span>
                  <span className="font-bold text-blue-600 text-sm flex items-center gap-1.5">
                    <User size={14} /> {inspectLog.performedBy}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-bold block mb-1">Exact Timestamp</span>
                  <span className="font-bold text-slate-700">
                    {inspectLog.timestamp ? format(new Date(inspectLog.timestamp), 'dd MMMM yyyy, hh:mm:ss a') : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Event Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Event Description</label>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 leading-relaxed">
                  {inspectLog.details}
                </div>
              </div>

              {/* Entity ID if present */}
              {inspectLog.entityId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Referenced Entity ID</label>
                  <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-xs text-slate-700 font-bold">
                    {inspectLog.entityId}
                  </div>
                </div>
              )}

              {/* User Agent / Device Information */}
              {inspectLog.userAgent && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Laptop size={14} /> Device & Browser Environment
                  </label>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono break-all leading-relaxed">
                    {inspectLog.userAgent}
                  </div>
                </div>
              )}

              {/* Visual Diff / State Payload if available (Feature 3) */}
              {(inspectLog.previousState || inspectLog.newState) && (() => {
                const diffRows = computeDiff(inspectLog.previousState, inspectLog.newState);
                const displayedRows = diffFilterChangedOnly
                  ? diffRows.filter(r => r.isChanged)
                  : diffRows;
                const changedCount = diffRows.filter(r => r.isChanged).length;

                return (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-600" />
                        <div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                            State Change & Visual Diff
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {changedCount === 0
                              ? "No property value changes detected"
                              : `${changedCount} field${changedCount > 1 ? 's' : ''} modified`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {diffViewMode === 'visual' && (
                          <button
                            type="button"
                            onClick={() => setDiffFilterChangedOnly(!diffFilterChangedOnly)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors",
                              diffFilterChangedOnly
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            {diffFilterChangedOnly ? `Changed Only (${changedCount})` : `All Fields (${diffRows.length})`}
                          </button>
                        )}

                        <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-xs">
                          <button
                            type="button"
                            onClick={() => setDiffViewMode('visual')}
                            className={cn(
                              "px-2.5 py-1 rounded-md font-bold transition-all",
                              diffViewMode === 'visual'
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Visual Diff
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiffViewMode('raw')}
                            className={cn(
                              "px-2.5 py-1 rounded-md font-bold transition-all",
                              diffViewMode === 'raw'
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Raw JSON
                          </button>
                        </div>
                      </div>
                    </div>

                    {diffViewMode === 'visual' ? (
                      displayedRows.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                          <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">No field differences detected</p>
                          <button
                            type="button"
                            onClick={() => setDiffFilterChangedOnly(false)}
                            className="text-xs text-indigo-600 font-bold hover:underline"
                          >
                            Show all recorded fields instead
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-slate-100/80 text-slate-600 font-black uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-4 w-1/4">Field / Property</th>
                                  <th className="py-2.5 px-4 w-1/3 text-rose-700 bg-rose-50/50">Previous Value</th>
                                  <th className="py-2.5 px-2 w-8 text-center text-slate-400">➔</th>
                                  <th className="py-2.5 px-4 w-1/3 text-emerald-700 bg-emerald-50/50">New Value</th>
                                  <th className="py-2.5 px-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {displayedRows.map((row) => (
                                  <tr 
                                    key={row.key}
                                    className={cn(
                                      "transition-colors",
                                      row.status === 'changed' && "bg-amber-50/20 hover:bg-amber-50/40",
                                      row.status === 'added' && "bg-emerald-50/20 hover:bg-emerald-50/40",
                                      row.status === 'removed' && "bg-rose-50/20 hover:bg-rose-50/40",
                                      row.status === 'unchanged' && "hover:bg-slate-50"
                                    )}
                                  >
                                    <td className="py-2.5 px-4 font-bold text-slate-800">
                                      <div>{row.label}</div>
                                      <div className="text-[10px] font-mono text-slate-400">{row.key}</div>
                                    </td>
                                    <td className="py-2.5 px-4 bg-rose-50/20">
                                      <div className={cn(
                                        row.status === 'changed' || row.status === 'removed' ? "text-rose-700 line-through font-medium" : "text-slate-600"
                                      )}>
                                        {renderDiffValue(row.valPrev)}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-center text-slate-400 font-bold">➔</td>
                                    <td className="py-2.5 px-4 bg-emerald-50/20">
                                      <div className={cn(
                                        row.status === 'changed' || row.status === 'added' ? "text-emerald-800 font-bold" : "text-slate-600"
                                      )}>
                                        {renderDiffValue(row.valNext)}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                      {row.status === 'changed' && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                          MODIFIED
                                        </span>
                                      )}
                                      {row.status === 'added' && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          + ADDED
                                        </span>
                                      )}
                                      {row.status === 'removed' && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                          - REMOVED
                                        </span>
                                      )}
                                      {row.status === 'unchanged' && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                                          SAME
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {inspectLog.previousState && (
                          <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200">
                            <span className="text-[11px] font-bold text-rose-700 block mb-1">Previous State</span>
                            <pre className="text-[10px] font-mono text-slate-700 overflow-x-auto max-h-64">
                              {JSON.stringify(inspectLog.previousState, null, 2)}
                            </pre>
                          </div>
                        )}
                        {inspectLog.newState && (
                          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                            <span className="text-[11px] font-bold text-emerald-700 block mb-1">New State</span>
                            <pre className="text-[10px] font-mono text-slate-700 overflow-x-auto max-h-64">
                              {JSON.stringify(inspectLog.newState, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => inspectLog.id && handleDelete(inspectLog.id)}
                    className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={14} /> Delete this Log
                  </button>
                )}
                {inspectLog.previousState && inspectLog.entityId && (inspectLog.entityType === 'Product' || inspectLog.entityType === 'Order') && isAdmin && (
                  <button
                    onClick={() => handleRollback(inspectLog)}
                    disabled={rollingBack}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    {rollingBack ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                    <span>Rollback / Restore Previous State</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors ml-auto"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Purge Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertOctagon size={22} />
                <h3 className="font-black text-base">Purge Audit Log Trail</h3>
              </div>
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Purging logs permanently deletes audit history from Firestore to free up database space. Select a retention period:
              </p>

              <div className="space-y-2">
                {[
                  { id: '30', label: 'Purge records older than 30 days', desc: 'Recommended for standard maintenance' },
                  { id: '60', label: 'Purge records older than 60 days', desc: 'Preserves recent 2 months of audit' },
                  { id: '90', label: 'Purge records older than 90 days', desc: 'Quarterly compliance retention' },
                  { id: 'all_filtered', label: `Purge all ${filteredLogs.length} currently filtered records`, desc: 'Irreversible deletion of current view' },
                ].map(opt => (
                  <label
                    key={opt.id}
                    onClick={() => setPurgeOption(opt.id as any)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      purgeOption === opt.id
                        ? "bg-rose-50/70 border-rose-300 ring-1 ring-rose-300"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <input
                      type="radio"
                      name="purgeOption"
                      checked={purgeOption === opt.id}
                      onChange={() => setPurgeOption(opt.id as any)}
                      className="mt-1 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{opt.label}</div>
                      <div className="text-[11px] text-slate-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertOctagon size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>This action cannot be undone. Always export CSV backup before performing large purges.</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePurge}
                disabled={purging}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-rose-900/20 disabled:opacity-50"
              >
                {purging ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{purging ? 'Purging...' : 'Confirm Purge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Digest Modal (Feature 6) */}
      {isDigestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-purple-200">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base">Daily Audit & Business Digest</h3>
                  <p className="text-xs text-purple-200">Generate executive summary & send to WhatsApp/Telegram</p>
                </div>
              </div>
              <button
                onClick={() => setIsDigestModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Date Selector */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" />
                  <span>Select Summary Date:</span>
                </div>
                <input
                  type="date"
                  value={digestDate}
                  onChange={e => setDigestDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Day's Quick KPI Preview */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-indigo-500">Total Ops</div>
                  <div className="text-lg font-black text-indigo-800">{digestSummary.totalEvents}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-emerald-500">Sales Invoices</div>
                  <div className="text-lg font-black text-emerald-800">{digestSummary.salesCount}</div>
                  {digestSummary.salesAmount > 0 && (
                    <div className="text-[10px] font-bold text-emerald-600">~৳{digestSummary.salesAmount.toLocaleString()}</div>
                  )}
                </div>

                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-rose-500">Deletions</div>
                  <div className="text-lg font-black text-rose-800">{digestSummary.deletesCount}</div>
                </div>
              </div>

              {/* Formatted Text Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" /> Formatted Digest Message
                  </label>
                  <button
                    onClick={handleCopyDigest}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Copy size={13} /> Copy Text
                  </button>
                </div>
                <div className="p-3.5 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-48 overflow-y-auto">
                  {generateDigestMessage()}
                </div>
              </div>

              {/* Direct Actions: WhatsApp & Telegram */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Instant Dispatch</div>

                {/* WhatsApp button */}
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/20"
                >
                  <Share2 size={16} />
                  <span>Share Digest via WhatsApp</span>
                </button>

                {/* Telegram Bot Direct Dispatch Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Send size={15} className="text-blue-500" />
                    <span>Telegram Bot Direct Dispatch</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Bot Token</label>
                      <input
                        type="text"
                        placeholder="e.g. 712345678:ABC..."
                        value={telegramToken}
                        onChange={e => setTelegramToken(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Channel / Chat ID</label>
                      <input
                        type="text"
                        placeholder="e.g. -10012345678 or @mychannel"
                        value={telegramChatId}
                        onChange={e => setTelegramChatId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSendTelegram}
                    disabled={sendingTelegram}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {sendingTelegram ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>{sendingTelegram ? 'Sending to Telegram...' : 'Send to Telegram Channel / Chat'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDigestModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
