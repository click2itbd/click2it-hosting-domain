class ResellerClubHostingProvider {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl || 'https://httpapi.com';
  }

  async apiCall(endpoint, method = 'GET', body) {
    const url = `${this.apiUrl}/${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error(`Invalid ResellerClub response: ${rawText}`);
    }

    if (!response.ok || data?.status === 'ERROR') {
      const message = data?.message || `ResellerClub API error: ${response.statusText}`;
      throw new Error(message);
    }

    return data;
  }

  async provisionAccount(request) {
    const { domain, contactEmail, billingCycle, planCode } = request;

    try {
      const result = await this.apiCall('api/domains/create', 'POST', {
        domain,
        email: contactEmail,
        billing_cycle: billingCycle || 'monthly',
        plan_code: planCode || 'basic',
      });

      return {
        success: true,
        providerAccountId: result?.data?.order_id || result?.data?.account_id,
        cPanelUrl: result?.data?.control_panel_url,
        nameservers: result?.data?.nameservers,
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
    await this.apiCall(`api/hosting/${providerAccountId}/suspend`, 'POST');
  }

  async unsuspendAccount(providerAccountId) {
    await this.apiCall(`api/hosting/${providerAccountId}/unsuspend`, 'POST');
  }

  async terminateAccount(providerAccountId) {
    await this.apiCall(`api/hosting/${providerAccountId}/terminate`, 'POST');
  }

  async getUsage(providerAccountId) {
    const result = await this.apiCall(`api/hosting/${providerAccountId}/usage`);
    const data = result?.data || {};

    return {
      providerAccountId,
      diskUsageMB: Math.round(data.disk_used_mb || 0),
      diskLimitMB: Math.round(data.disk_limit_mb || 10240),
      bandwidthUsageMB: Math.round(data.bandwidth_used_mb || 0),
      bandwidthLimitMB: Math.round(data.bandwidth_limit_mb || 102400),
      cpuUsagePercent: data.cpu_percent ? parseFloat(data.cpu_percent) : undefined,
      ramUsageMB: data.ram_used_mb ? Math.round(data.ram_used_mb) : undefined,
      lastUpdated: new Date().toISOString(),
    };
  }

  async changePlan(providerAccountId, newPlanCode) {
    await this.apiCall(`api/hosting/${providerAccountId}/change-plan`, 'POST', {
      plan_code: newPlanCode,
    });
  }
}

module.exports = { ResellerClubHostingProvider };
