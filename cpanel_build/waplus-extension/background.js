// WAPlus Hosting CRM Background Service Worker
console.log('[WAPlus Extension] Background service worker initialized');

// Default extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    portalUrl: 'http://localhost:3000',
    apiKey: '',
    agentName: 'Support Agent',
    autoSync: true,
    unreadCount: 0
  });
  console.log('[WAPlus Extension] Installed and settings initialized');
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncContact') {
    chrome.storage.local.get(['portalUrl', 'apiKey'], async (data) => {
      const url = data.portalUrl || 'http://localhost:3000';
      try {
        const response = await fetch(`${url}/api/whatsapp/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(data.apiKey ? { 'X-API-Key': data.apiKey } : {})
          },
          body: JSON.stringify({ contact: request.contact })
        });
        const result = await response.json();
        sendResponse({ success: true, data: result });
      } catch (err) {
        console.error('[WAPlus Extension] Sync failed:', err);
        sendResponse({ success: false, error: err.message });
      }
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'updateBadge') {
    const count = request.count || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#25D366' });
    sendResponse({ success: true });
  }
});
