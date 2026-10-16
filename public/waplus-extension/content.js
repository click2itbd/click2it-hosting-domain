// WAPlus Hosting CRM Content Script for WhatsApp Web (web.whatsapp.com)
(function () {
  console.log('[WAPlus Extension] Content script loaded on WhatsApp Web');

  let crmDock = null;
  let isExpanded = false;

  function createCrmDock() {
    if (document.getElementById('waplus-hosting-crm-dock')) return;

    crmDock = document.createElement('div');
    crmDock.id = 'waplus-hosting-crm-dock';
    crmDock.innerHTML = `
      <div class="waplus-toggle-btn" id="waplus-toggle-btn" title="Open WAPlus Hosting CRM">
        <div class="waplus-badge-dot"></div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      </div>

      <div class="waplus-panel" id="waplus-panel" style="display: none;">
        <div class="waplus-panel-header">
          <div class="waplus-header-title">
            <span class="waplus-brand-icon">&lt;/&gt;</span>
            <div>
              <h4>InHost WAPlus CRM</h4>
              <p>Hosting & Domain Suite</p>
            </div>
          </div>
          <button class="waplus-close-btn" id="waplus-close-btn">&times;</button>
        </div>

        <div class="waplus-panel-body">
          <div class="waplus-contact-box">
            <div class="waplus-contact-avatar">👤</div>
            <div class="waplus-contact-info">
              <h5 id="waplus-contact-name">Select a Chat</h5>
              <p id="waplus-contact-phone">Open any conversation in WhatsApp</p>
            </div>
          </div>

          <div class="waplus-section-title">Quick Canned Responses</div>
          <div class="waplus-canned-grid">
            <button class="waplus-quick-reply-btn" data-reply="Hello! Welcome to Click2IT Hosting. How can our technical support team assist you today?">
              👋 Welcome
            </button>
            <button class="waplus-quick-reply-btn" data-reply="Our standard Nameservers are:&#10;ns1.click2itbd.com&#10;ns2.click2itbd.com&#10;Please update these at your domain registrar.">
              🌐 Nameservers
            </button>
            <button class="waplus-quick-reply-btn" data-reply="You can access your official cPanel directly at: https://yourdomain.com:2083 or via Client Area at https://click2itbd.com/client-area">
              🎛️ cPanel Login
            </button>
            <button class="waplus-quick-reply-btn" data-reply="Here is your secure invoice payment link: https://click2itbd.com/client-area?tab=invoices. Instant activation upon payment!">
              💳 Invoice Link
            </button>
            <button class="waplus-quick-reply-btn" data-reply="Your Cloud NVMe VPS has been provisioned. Root credentials have been dispatched to your registered email address.">
              🚀 VPS Ready
            </button>
          </div>

          <div class="waplus-section-title">Lead Management</div>
          <div class="waplus-form-group">
            <label>Lead Stage</label>
            <select id="waplus-lead-stage">
              <option value="lead">New Inbound Lead</option>
              <option value="qualified">Qualified Prospect</option>
              <option value="customer" selected>Active Customer</option>
              <option value="vps_inquiry">VPS Custom Quote</option>
            </select>
          </div>

          <div class="waplus-form-group">
            <label>Internal Agent Note</label>
            <textarea id="waplus-agent-note" placeholder="Add private note for team..."></textarea>
          </div>

          <button class="waplus-action-btn" id="waplus-sync-btn">
            🔄 Sync Contact to Portal CRM
          </button>

          <a href="http://localhost:3000/admin" target="_blank" class="waplus-portal-link">
            Open Full Hosting Portal Dashboard &rarr;
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(crmDock);

    // Event listeners
    const toggleBtn = document.getElementById('waplus-toggle-btn');
    const closeBtn = document.getElementById('waplus-close-btn');
    const panel = document.getElementById('waplus-panel');
    const syncBtn = document.getElementById('waplus-sync-btn');

    toggleBtn?.addEventListener('click', () => {
      isExpanded = !isExpanded;
      if (panel) panel.style.display = isExpanded ? 'flex' : 'none';
      detectActiveWhatsAppContact();
    });

    closeBtn?.addEventListener('click', () => {
      isExpanded = false;
      if (panel) panel.style.display = 'none';
    });

    // Canned reply insert
    document.querySelectorAll('.waplus-quick-reply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = (e.currentTarget as HTMLElement).getAttribute('data-reply') || '';
        insertTextIntoWhatsAppInput(text);
      });
    });

    // Sync button
    syncBtn?.addEventListener('click', () => {
      const nameEl = document.getElementById('waplus-contact-name');
      const phoneEl = document.getElementById('waplus-contact-phone');
      const noteEl = document.getElementById('waplus-agent-note') as HTMLTextAreaElement;
      
      const contact = {
        name: nameEl?.innerText || 'WhatsApp User',
        phone: phoneEl?.innerText || '+880 1700-000000',
        notes: noteEl?.value || 'Synced from WhatsApp Web via Chrome Extension'
      };

      chrome.runtime.sendMessage({ action: 'syncContact', contact }, (response) => {
        if (response?.success) {
          alert('✅ Contact successfully synced to InHost Portal CRM!');
        } else {
          alert('Contact saved locally in extension.');
        }
      });
    });
  }

  function detectActiveWhatsAppContact() {
    // Attempt to extract contact info from WhatsApp Web DOM header
    try {
      const headerTitle = document.querySelector('header [data-testid="conversation-info-header-chat-title"]') ||
                          document.querySelector('header span[dir="auto"]');
      if (headerTitle && headerTitle.textContent) {
        const titleText = headerTitle.textContent.trim();
        const nameEl = document.getElementById('waplus-contact-name');
        const phoneEl = document.getElementById('waplus-contact-phone');
        if (nameEl) nameEl.textContent = titleText;
        if (phoneEl) {
          if (titleText.startsWith('+') || /\d{8,}/.test(titleText)) {
            phoneEl.textContent = titleText;
          } else {
            phoneEl.textContent = 'Active WhatsApp Contact';
          }
        }
      }
    } catch (e) {
      console.error('Error detecting contact:', e);
    }
  }

  function insertTextIntoWhatsAppInput(text) {
    const messageBox = document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                       document.querySelector('footer div[contenteditable="true"]');
    if (messageBox) {
      (messageBox as HTMLElement).focus();
      document.execCommand('insertText', false, text);
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied canned response to clipboard! Paste directly into WhatsApp chat.');
    }
  }

  // Poll periodically or listen to DOM changes
  setTimeout(createCrmDock, 2000);
  setInterval(detectActiveWhatsAppContact, 3000);
})();
