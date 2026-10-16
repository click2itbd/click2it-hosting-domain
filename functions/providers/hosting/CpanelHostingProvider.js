class CpanelHostingProvider {
  constructor(apiKey, apiUrl, apiUsername) {
    if (!apiKey) {
      throw new Error('WHM API token is required');
    }
    if (!apiUrl) {
      throw new Error('WHM API URL is required. Expected format: https://your-whm-server.com:2087');
    }
    this.apiKey = apiKey;
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiUsername = (apiUsername || process.env.WHM_USERNAME || 'root').trim();
  }

  async whmRequest(action, params = {}, timeoutMs = 15000) {
    const url = new URL(`/json-api/${action}`, this.apiUrl + '/');
    url.searchParams.set('api.version', '1');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `whm ${this.apiUsername}:${this.apiKey}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Invalid WHM response: ${rawText}`);
      }

      if (!response.ok || data?.metadata?.result?.message) {
        const message = data?.metadata?.result?.message || `WHM API error: ${response.statusText}`;
        throw new Error(message);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('WHM server connection timed out. Please verify the server URL, port 2087, firewall, and API token.');
      }
      throw error;
    }
  }

  async provisionAccount(request) {
    const { domain, contactEmail, billingCycle, planCode } = request;

    if (!domain || !contactEmail) {
      return {
        success: false,
        error: 'Domain and contact email are required for provisioning',
      };
    }

    const normalizedBillingCycle = this.normalizeBillingCycle(billingCycle);
    const username = this.generateUsername(domain);
    const password = this.generatePassword();

    try {
      const result = await this.whmRequest('createacct', {
        username,
        password,
        domain,
        plan: planCode || 'default',
        contactemail: contactEmail,
        billingcycle: normalizedBillingCycle,
      });

      const accountData = result?.data?.cpanel || {};
      const hostname = new URL(this.apiUrl).hostname;

      return {
        success: true,
        providerAccountId: username,
        cPanelUrl: `https://${hostname}:2083`,
        nameservers: accountData.nameservers || [],
        error: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to create hosting account',
      };
    }
  }

  async suspendAccount(providerAccountId) {
    if (!providerAccountId) {
      throw new Error('Provider account ID is required');
    }
    await this.whmRequest('suspendacct', { user: providerAccountId });
  }

  async unsuspendAccount(providerAccountId) {
    if (!providerAccountId) {
      throw new Error('Provider account ID is required');
    }
    await this.whmRequest('unsuspendacct', { user: providerAccountId });
  }

  async terminateAccount(providerAccountId) {
    if (!providerAccountId) {
      throw new Error('Provider account ID is required');
    }
    await this.whmRequest('killacct', { user: providerAccountId, preserve_dns: '1' });
  }

  async getUsage(providerAccountId) {
    if (!providerAccountId) {
      throw new Error('Provider account ID is required');
    }
    const result = await this.whmRequest('accountsummary', { user: providerAccountId });
    const data = result?.data || {};
    const plan = data.plan || {};
    const diskUsage = data.disk_usage || {};

    return {
      providerAccountId,
      diskUsageMB: Math.round(diskUsage.used || 0),
      diskLimitMB: plan.disklimit ? this.parseLimit(plan.disklimit) : 10240,
      bandwidthUsageMB: Math.round(diskUsage.bandwidth || 0),
      bandwidthLimitMB: plan.bandwidth ? this.parseLimit(plan.bandwidth) : 102400,
      cpuUsagePercent: data.cpu_usage ? parseFloat(data.cpu_usage) : undefined,
      ramUsageMB: data.mem_usage ? Math.round(data.mem_usage) : undefined,
      lastUpdated: new Date().toISOString(),
    };
  }

  async testConnection() {
    try {
      const result = await this.whmRequest('listaccts', {}, 15000);
      const accounts = result?.data?.acct || [];
      return {
        success: true,
        message: `WHM connection successful. Found ${accounts.length} account(s).`,
      };
    } catch (error) {
      if (error.message.includes('Invalid authentication') || error.message.includes('Access denied')) {
        return {
          success: false,
          message: 'WHM authentication failed. Please check your API token.',
        };
      }
      if (error.message.includes('connection timed out') || error.message.includes('ETIMEDOUT')) {
        return {
          success: false,
          message: 'WHM server connection timed out. Please verify the server URL, port 2087, firewall, and API token.',
        };
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return {
          success: false,
          message: 'Cannot reach WHM server. Please check the URL and ensure the server is online.',
        };
      }
      return {
        success: false,
        message: error.message || 'WHM connection test failed',
      };
    }
  }

  async changePlan(providerAccountId, newPlanCode) {
    if (!providerAccountId || !newPlanCode) {
      throw new Error('Provider account ID and new plan code are required');
    }
    await this.whmRequest('changepackage', { user: providerAccountId, pkg: newPlanCode });
  }

  generateUsername(domain) {
    const cleanDomain = domain.replace(/\./g, '').toLowerCase();
    const username = cleanDomain.substring(0, 8);
    return username;
  }

  normalizeBillingCycle(billingCycle) {
    if (!billingCycle) return 'monthly';
    const cycle = billingCycle.toLowerCase();
    if (cycle === 'annually' || cycle === 'yearly') return 'yearly';
    if (cycle === 'quarterly') return 'quarterly';
    if (cycle === 'biennially') return 'biennially';
    return 'monthly';
  }

  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    const length = 16;
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  parseLimit(value) {
    if (!value) return 0;
    const num = parseFloat(value);
    if (value.toLowerCase().includes('gb')) return num * 1024;
    if (value.toLowerCase().includes('mb')) return num;
    return num;
  }
}

module.exports = { CpanelHostingProvider };
