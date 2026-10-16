
import React, { useState } from 'react';
import { Settings, BookOpen, Save } from 'lucide-react';

export const CRMIntegrationsSetting: React.FC = () => {
    const integrations = ['Social', 'WhatsApp', 'Web Leads', 'Google Ads', 'AI Scraper', 'Browser Scraper'];
    const [activeIntegration, setActiveIntegration] = useState(integrations[0]);
    // Store configuration state per integration
    const [configs, setConfigs] = useState<Record<string, { apiUrl: string, apiKey: string, additionalParams: string }>>(
        integrations.reduce((acc, int) => ({ ...acc, [int]: { apiUrl: '', apiKey: '', additionalParams: '' } }), {})
    );

    const currentConfig = configs[activeIntegration];

    const updateConfig = (field: 'apiUrl' | 'apiKey' | 'additionalParams', value: string) => {
        setConfigs({
            ...configs,
            [activeIntegration]: { ...currentConfig, [field]: value }
        });
    };

    const webhookUrl = `https://your-app-domain/api/webhooks/${activeIntegration.toLowerCase().replace(' ', '_')}`;

    const getManual = (int: string) => {
        switch(int) {
            case 'Social': return (
                <div className="space-y-4">
                    <p className="text-gray-600">Connect your Facebook/Instagram Page to automatically capture leads from Facebook Lead Ads.</p>
                    <ol className="list-decimal list-inside text-gray-600 space-y-2">
                        <li>Go to the <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Meta Developer Portal</a>.</li>
                        <li>Create an App and set up <strong>Webhooks</strong>.</li>
                        <li>Select <strong>Page</strong> as the object and subscribe to the <code>leadgen</code> field.</li>
                        <li>Enter the Webhook URL shown on the left.</li>
                        <li>Enter your chosen Verify Token (default: <code>startech_secret_token</code>).</li>
                        <li>After verifying, subscribe your specific Page to the Webhook via the Graph API.</li>
                    </ol>
                    <div className="bg-blue-50 text-blue-800 p-3 rounded text-xs border border-blue-100">
                        <strong>Note:</strong> Ensure your FB Page is connected in your Business Manager to allow receiving Lead payloads.
                    </div>
                </div>
            );
            case 'WhatsApp': return (
                <div className="space-y-4">
                    <p className="text-gray-600">Receive inbound WhatsApp messages and auto-capture leads via the WhatsApp Business API.</p>
                    <ol className="list-decimal list-inside text-gray-600 space-y-2">
                        <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Meta Developer Portal</a> &gt; WhatsApp &gt; Configuration.</li>
                        <li>Under <strong>Webhook</strong>, click Edit and enter the Webhook URL: <br/><code className="bg-gray-100 px-1 py-0.5 rounded text-indigo-600 break-all">{window.location.origin}/api/webhook/whatsapp</code></li>
                        <li>Enter the Verify Token (default: <code>startech_secret_token</code>).</li>
                        <li>Click <strong>Manage</strong> on Webhook fields, and subscribe to <code>messages</code>.</li>
                        <li>To send replies, generate a permanent <strong>Access Token</strong> in the API Setup section and save it in your `.env` as <code>WHATSAPP_ACCESS_TOKEN</code>.</li>
                    </ol>
                </div>
            );
            case 'Web Leads': return (
                <div className="space-y-4">
                    <p className="text-gray-600">Capture leads from your website's contact forms by posting directly to this API.</p>
                    <ol className="list-decimal list-inside text-gray-600 space-y-2">
                        <li>Set your HTML form's <code>action</code> attribute to POST to the Webhook URL on the left.</li>
                        <li>Alternatively, make an AJAX/fetch POST request with JSON payload:</li>
                    </ol>
                    <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`fetch('${webhookUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: "John",
    lastName: "Doe",
    phone: "+123456789",
    source: "web_form"
  })
});`}
                    </pre>
                </div>
            );
            case 'Google Ads': return (
                <div className="space-y-4">
                    <p className="text-gray-600">Sync Google Ads lead form extensions to automatically push leads to your CRM.</p>
                    <ol className="list-decimal list-inside text-gray-600 space-y-2">
                        <li>In your Google Ads account, go to <strong>Assets &gt; Lead form</strong>.</li>
                        <li>Create or edit a lead form asset.</li>
                        <li>Scroll down to <strong>Export leads from Google Ads</strong> and expand <strong>Webhook integration</strong>.</li>
                        <li>Paste the Webhook URL shown on the left into the <strong>Webhook URL</strong> field.</li>
                        <li>Enter an optional <strong>Key</strong> (API Key) to verify requests on our end.</li>
                        <li>Click <strong>Send test data</strong> to verify the connection.</li>
                    </ol>
                </div>
            );
            case 'AI Scraper': return <p className="text-sm text-gray-600">Configure target websites for the AI Scraper to monitor, and verify your API keys if applicable.</p>;
            case 'Browser Scraper': return <p className="text-sm text-gray-600">Install our browser extension and link it to this CRM instance using your API key.</p>;
            default: return <p className="text-sm text-gray-600">Configure this integration to start collecting leads.</p>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-2 border-b border-gray-200">
                {integrations.map(int => (
                    <button 
                        key={int}
                        onClick={() => setActiveIntegration(int)}
                        className={`px-4 py-2 text-sm font-bold ${activeIntegration === int ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    >
                        {int}
                    </button>
                ))}
            </div>
            
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Settings size={18}/> Configuration</h3>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Webhook URL</label>
                        <input readOnly value={webhookUrl} className="w-full border border-gray-200 rounded p-2 text-sm bg-gray-50 text-gray-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API URL</label>
                            <input value={currentConfig.apiUrl} onChange={e => updateConfig('apiUrl', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="https://api..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                            <input type="password" value={currentConfig.apiKey} onChange={e => updateConfig('apiKey', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="sk_..." />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Additional Params (JSON)</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                            rows={3}
                            placeholder={`Additional Auth JSON for ${activeIntegration}...`}
                            value={currentConfig.additionalParams}
                            onChange={e => updateConfig('additionalParams', e.target.value)}
                        />
                    </div>
                    <button className="bg-[#081621] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                        <Save size={16}/> Save Settings
                    </button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><BookOpen size={18}/> Manual</h3>
                    <div className="text-sm text-gray-600">
                      {getManual(activeIntegration)}
                    </div>
                </div>
            </div>
        </div>
    );
};
