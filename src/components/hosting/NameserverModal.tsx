import React, { useState, useEffect } from 'react';
import { X, Server, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiPost } from '../../services/apiClient';
import { getFriendlyErrorMessage } from '../../utils/errorUtils';

interface DomainOrder {
  id: string;
  domain: string;
  nameservers?: string[];
  nameServers?: string[];
}

interface NameserverModalProps {
  domain: DomainOrder;
  onClose: () => void;
  onUpdate: () => void;
}

export const NameserverModal: React.FC<NameserverModalProps> = ({ domain, onClose, onUpdate }) => {
  const [ns, setNs] = useState<string[]>(['', '', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const currentNs = domain.nameServers || domain.nameservers;
    if (currentNs && currentNs.length > 0) {
      const initialNs = [...currentNs];
      while (initialNs.length < 4) initialNs.push('');
      setNs(initialNs.slice(0, 4));
    } else {
      // Default Click2IT nameservers
      setNs(['ns1.click2itbd.com', 'ns2.click2itbd.com', '', '']);
    }
  }, [domain]);

  const handleSave = async () => {
    // Filter out empty ones
    const activeNs = ns.map(n => n.trim()).filter(Boolean);
    if (activeNs.length < 2) {
      toast.error('You must provide at least two nameservers (NS1 and NS2)');
      return;
    }

    setSaving(true);
    try {
      // All nameserver updates (registrar API or BTCL manual request queue) are securely handled by backend API
      const res: any = await apiPost('/api/domains/manage', {
        command: 'set_ns',
        domain: domain.domain,
        extraParams: { 
          ns0: activeNs[0], 
          ns1: activeNs[1],
          ns2: activeNs[2] || '',
          ns3: activeNs[3] || '',
          nameservers: activeNs
        }
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update nameservers');
      }

      if (res.manualQueued) {
        toast.success(res.message || 'Nameserver update request submitted! Our domain team will activate it shortly.');
      } else {
        toast.success('Nameservers updated successfully! Changes may take 24-48 hours to propagate.');
      }

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating nameservers:', error);
      toast.error(getFriendlyErrorMessage(error, 'Failed to update nameservers. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Server size={18} /> Manage Nameservers
          </h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Update the nameservers for <strong className="text-gray-900">{domain.domain}</strong>. Changes may take up to 24-48 hours to propagate globally.
          </p>

          <div className="space-y-4">
            {[1, 2, 3, 4].map((num, idx) => (
              <div key={num} className="flex items-center gap-3">
                <label className="text-sm font-bold text-gray-500 w-8">NS{num}</label>
                <input
                  type="text"
                  value={ns[idx]}
                  onChange={e => {
                    const newNs = [...ns];
                    newNs[idx] = e.target.value;
                    setNs(newNs);
                  }}
                  className="flex-1 border border-gray-200 rounded p-2 text-sm focus:outline-none focus:border-[#EF4444]"
                  placeholder={`ns${num}.example.com`}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-8">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[#EF4444] text-white rounded font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
