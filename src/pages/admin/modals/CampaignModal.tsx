import React from 'react';
import { XCircle } from 'lucide-react';

interface CampaignModalProps {
  isAddingCampaign: boolean;
  setIsAddingCampaign: (v: boolean) => void;
  editingCampaign: any;
  setEditingCampaign: (v: any) => void;
  campaignFormData: any;
  setCampaignFormData: (v: any) => void;
  handleSaveCampaign: (e: any) => void;
  users: any[];
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isAddingCampaign, setIsAddingCampaign, editingCampaign, setEditingCampaign,
  campaignFormData, setCampaignFormData, handleSaveCampaign, users
}) => {
  return (
    <>
      {/* Campaign Modal */}
      {isAddingCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingCampaign ? 'Edit' : 'Create'} Marketing Campaign</h2>
              <button onClick={() => { setIsAddingCampaign(false); setEditingCampaign(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveCampaign} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Campaign Title</label>
                  <input
                    type="text"
                    required
                    value={campaignFormData.title}
                    onChange={e => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    placeholder="e.g. Summer Sale 2024"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marketing Channel</label>
                  <select
                    value={campaignFormData.channel}
                    onChange={e => setCampaignFormData({ ...campaignFormData, channel: e.target.value as any })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="facebook">Facebook Ads</option>
                    <option value="instagram">Instagram Ads</option>
                    <option value="google">Google Ads</option>
                  </select>
                </div>
              </div>

              {['email', 'sms', 'whatsapp'].includes(campaignFormData.channel) && (
                <>
                  {campaignFormData.channel === 'email' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Subject</label>
                      <input
                        type="text"
                        required
                        value={campaignFormData.subject}
                        onChange={e => setCampaignFormData({ ...campaignFormData, subject: e.target.value })}
                        className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                        placeholder="e.g. Don't miss out on our biggest sale!"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Recipients (Bulk {campaignFormData.channel === 'email' ? 'Emails' : 'Phone Numbers'} - One per line)
                    </label>
                    <textarea
                      value={campaignFormData.bulkEmails}
                      onChange={e => setCampaignFormData({ ...campaignFormData, bulkEmails: e.target.value })}
                      className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444] h-32"
                      placeholder={campaignFormData.channel === 'email' ? "email1@example.com\nemail2@example.com" : "+1234567890\n+0987654321"}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select from Registered Users</label>
                    <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
                      {users.map(user => (
                        <label key={user.uid} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={campaignFormData.selectedUserIds.includes(user.uid)}
                            onChange={e => {
                              const newIds = e.target.checked
                                ? [...campaignFormData.selectedUserIds, user.uid]
                                : campaignFormData.selectedUserIds.filter((id: string) => id !== user.uid);
                              setCampaignFormData({ ...campaignFormData, selectedUserIds: newIds });
                            }}
                            className="rounded border-gray-300 text-[#EF4444] focus:ring-[#EF4444]"
                          />
                          <span className="text-sm">{user.displayName} ({campaignFormData.channel === 'email' ? user.email : user.phoneNumber || 'No phone'})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {['facebook', 'instagram', 'google'].includes(campaignFormData.channel) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-4 border border-blue-100 rounded-lg">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={campaignFormData.targetAudience}
                      onChange={e => setCampaignFormData({ ...campaignFormData, targetAudience: e.target.value })}
                      className="w-full border-blue-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Retargeting cart abandoners, Lookalike 1%"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Daily Budget ($)</label>
                    <input
                      type="number"
                      value={campaignFormData.budget}
                      onChange={e => setCampaignFormData({ ...campaignFormData, budget: e.target.value })}
                      className="w-full border-blue-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Target URL</label>
                    <input
                      type="url"
                      value={campaignFormData.targetUrl}
                      onChange={e => setCampaignFormData({ ...campaignFormData, targetUrl: e.target.value })}
                      className="w-full border-blue-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/promo"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Creative Image URL</label>
                    <input
                      type="url"
                      value={campaignFormData.imageUrl}
                      onChange={e => setCampaignFormData({ ...campaignFormData, imageUrl: e.target.value })}
                      className="w-full border-blue-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/ad-image.jpg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Campaign Content / Ad Copy</label>
                <textarea
                  required
                  value={campaignFormData.content}
                  onChange={e => setCampaignFormData({ ...campaignFormData, content: e.target.value })}
                  className={`w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444] ${campaignFormData.channel === 'email' ? 'h-64 font-mono text-sm' : 'h-32'}`}
                  placeholder={campaignFormData.channel === 'email' ? "<h1>Hello!</h1><p>Check out our new products...</p>" : "Limited time offer! Get 20% off your next purchase."}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Schedule for Future (Optional)</label>
                <input
                  type="datetime-local"
                  value={campaignFormData.scheduledAt}
                  onChange={e => setCampaignFormData({ ...campaignFormData, scheduledAt: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                />
                <p className="text-[10px] text-gray-400 mt-1 italic">Leave blank to save as draft or deploy immediately.</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => { setIsAddingCampaign(false); setEditingCampaign(null); }}
                  className="px-6 py-2 border border-gray-200 rounded-md font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#EF4444] text-white rounded-md font-bold hover:bg-red-600 transition-all"
                >
                  {editingCampaign ? 'Update Campaign' : campaignFormData.scheduledAt ? 'Schedule Campaign' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
