import React from 'react';
import { 
  Globe, Search, AlertCircle, ShoppingCart, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { formatCurrency, cn } from '../../../lib/utils';
import { Pagination, Spinner } from '../components/SharedUI';

export function DomainSearchListTab({ state }) {
  const {
    activeTab, domainQuery, setDomainQuery, handleDomainSearch, isSearchingDomain, domainResults,
    pagedDomainOrders, domainOrdersPages, domainOrderPage, setDomainOrderPage, domainStatusEdits,
    setDomainStatusEdits, saveDomainOrderStatus, savingDomainStatus, domainOrders
  } = state;

  if (activeTab !== 'domain-search') return null;

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1.5 w-fit"><CheckCircle size={10}/> {status}</span>;
      case 'cancelled':
      case 'failed':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-100 flex items-center gap-1.5 w-fit"><XCircle size={10}/> {status}</span>;
      case 'processing':
        return <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100 flex items-center gap-1.5 w-fit"><Clock size={10}/> {status}</span>;
      default:
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100 flex items-center gap-1.5 w-fit"><AlertCircle size={10}/> pending</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Domain Availability Search */}
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
            <Globe className="text-white" size={24} />
          </div>
          Domain Availability Check
        </h2>
        
        <div className="max-w-4xl mb-8">
          <div className="flex bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all">
            <div className="pl-5 flex items-center justify-center">
              <Globe className="text-slate-400" size={24} />
            </div>
            <input
              type="text"
              placeholder="Find your perfect domain name..."
              value={domainQuery}
              onChange={e => setDomainQuery(e.target.value.toLowerCase())}
              onKeyDown={e => e.key === 'Enter' && handleDomainSearch()}
              className="flex-1 bg-transparent px-4 py-4 md:py-5 text-lg md:text-xl font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:outline-none"
              disabled={isSearchingDomain}
            />
            <button 
              onClick={handleDomainSearch} 
              disabled={isSearchingDomain || !domainQuery.trim()}
              className={cn(
                "bg-indigo-600 hover:bg-indigo-700 text-white px-6 md:px-10 py-4 md:py-5 font-bold text-base md:text-lg transition-colors flex items-center gap-2 disabled:opacity-70 disabled:bg-slate-400",
              )}
            >
              {isSearchingDomain ? <><Spinner /> <span className="hidden md:inline">Searching...</span></> : <><Search size={20} /> <span className="hidden md:inline">Search</span></>}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-4 ml-2">
            <span className="text-sm font-bold text-slate-500 mr-2">Popular extensions:</span>
            {['.com', '.net', '.org', '.store', '.info', '.co'].map(ext => (
              <button 
                key={ext} 
                onClick={() => {
                  const base = domainQuery.includes('.') ? domainQuery.split('.')[0] : domainQuery;
                  setDomainQuery(base ? base + ext : ext);
                }}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
              >
                {ext}
              </button>
            ))}
          </div>
        </div>

        {domainResults && domainResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {domainResults.map(result => (
              <div key={result.domain} className={cn(
                "border rounded-2xl p-5 flex flex-col justify-between bg-white shadow-sm transition-all duration-300",
                result.available ? "border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100 hover:-translate-y-1" : "border-slate-200 opacity-70"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-bold text-slate-800 truncate pr-2">{result.domain}</span>
                  {result.available ? (
                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0">Available</span>
                  ) : (
                    <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0">Taken</span>
                  )}
                </div>
                {result.available && result.price && (
                  <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registration</span>
                    <span className="text-lg font-black text-emerald-600">{formatCurrency(result.price)}<span className="text-xs text-slate-400 font-medium">/yr</span></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {domainResults && domainResults.length === 0 && !isSearchingDomain && (
          <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl flex items-center gap-4 border border-rose-100 max-w-4xl">
            <AlertCircle className="shrink-0 w-8 h-8 opacity-80" />
            <div>
              <p className="font-black text-lg">No domains found</p>
              <p className="text-sm font-medium mt-0.5 opacity-90">Please try a different domain name or extension.</p>
            </div>
          </div>
        )}
      </div>

      {/* Domain Orders List */}
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
            <ShoppingCart className="text-white" size={24} />
          </div>
          Domain Orders <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold ml-2">{domainOrders.length}</span>
        </h2>
        
        {domainOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Globe className="text-slate-300" size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No domain orders found</h3>
            <p className="text-slate-500 text-sm mt-1">There are currently no domain orders in the system.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Domain</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Order Date</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedDomainOrders.map(order => (
                    <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-4 px-6 font-bold text-indigo-600 flex items-center gap-2">
                        <Globe size={14} className="opacity-50" />
                        <span>{order.domain || 'N/A'}</span>
                        {order.type === 'transfer' && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Transfer
                          </span>
                        )}
                        {(order.type === 'renewal' || order.action === 'renewal') && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Renewal
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {order.customerName || order.userId || 'N/A'}
                      </td>
                      <td className="py-4 px-6 font-black text-slate-800">
                        {formatCurrency(order.total || order.price || 0)}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-medium text-xs">
                        {order.createdAt ? new Date(order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2 items-start">
                          {getStatusBadge(order.status)}
                          <select
                            defaultValue={order.status}
                            onChange={e => setDomainStatusEdits(prev => ({ ...prev, [order.id]: e.target.value }))}
                            className="w-32 border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm">
                            {['pending', 'processing', 'active', 'completed', 'cancelled', 'failed'].map(s => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => saveDomainOrderStatus(order.id)}
                          disabled={savingDomainStatus[order.id] || (!domainStatusEdits[order.id] || domainStatusEdits[order.id] === order.status)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 flex items-center gap-1.5 ml-auto shadow-sm transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0">
                          {savingDomainStatus[order.id] ? <Spinner /> : <CheckCircle size={14} />} Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <Pagination page={domainOrderPage} totalPages={domainOrdersPages} onPage={setDomainOrderPage} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
