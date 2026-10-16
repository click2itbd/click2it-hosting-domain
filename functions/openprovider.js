const crypto = require('crypto');

function splitDomain(domain) {
  const separator = domain.indexOf('.');
  if (separator <= 0 || separator === domain.length - 1) {
    throw new Error(`Invalid domain name: ${domain}`);
  }
  return {
    name: domain.slice(0, separator),
    extension: domain.slice(separator + 1),
  };
}

async function createClient(db) {
  const settingsSnap = await db.collection('hosting_config').doc('registrar_settings').get();
  const settings = settingsSnap.exists ? settingsSnap.data()?.openprovider || {} : {};
  const username = process.env.OPENPROVIDER_USERNAME || settings.username || '';
  const password = process.env.OPENPROVIDER_PASSWORD || settings.password || '';
  const isSandbox = process.env.OPENPROVIDER_SANDBOX_MODE !== undefined
    ? process.env.OPENPROVIDER_SANDBOX_MODE === 'true'
    : settings.isSandbox === true;
  const defaultHandle = process.env.OPENPROVIDER_DEFAULT_HANDLE || settings.defaultHandle || '';

  if (!username || !password) {
    throw new Error('Openprovider credentials are not configured.');
  }

  const baseUrl = isSandbox
    ? 'https://api.cte.openprovider.eu/v1'
    : 'https://api.openprovider.eu/v1';
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const result = await response.json();
  if (!response.ok || String(result.code) !== '0' || !result.data?.token) {
    throw new Error(result.desc || `Openprovider authentication failed (${response.status}).`);
  }

  return { baseUrl, token: result.data.token, defaultHandle, isSandbox };
}

async function request(client, endpoint, options = {}) {
  const response = await fetch(`${client.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${client.token}`,
      ...(options.headers || {}),
    },
  });
  const result = await response.json();
  if (!response.ok || (result.code !== undefined && String(result.code) !== '0')) {
    throw new Error(result.desc || `Openprovider API request failed (${response.status}).`);
  }
  return result;
}

async function getOperationPrice(client, tld, operation) {
  const params = new URLSearchParams({
    'domain.name': `click2it-${crypto.randomBytes(6).toString('hex')}`,
    'domain.extension': tld.replace(/^\./, ''),
    operation,
  });
  const response = await request(client, `/domains/prices?${params}`);
  const price = Number(response.data?.price?.reseller?.price);
  const currency = String(response.data?.price?.reseller?.currency || '').toUpperCase();
  if (!Number.isFinite(price) || price <= 0 || !currency) {
    throw new Error(`Openprovider returned no ${operation} price for .${tld.replace(/^\./, '')}.`);
  }
  return { price, currency };
}

async function getTldPricing(client, tld) {
  const [registration, renewal, transfer, restore] = await Promise.all([
    getOperationPrice(client, tld, 'create'),
    getOperationPrice(client, tld, 'renew'),
    getOperationPrice(client, tld, 'transfer'),
    getOperationPrice(client, tld, 'restore'),
  ]);
  if ([renewal, transfer, restore].some(item => item.currency !== registration.currency)) {
    throw new Error(`Openprovider returned inconsistent currencies for .${tld.replace(/^\./, '')}.`);
  }
  return {
    tld: `.${tld.replace(/^\./, '').toLowerCase()}`,
    currency: registration.currency,
    registrationPrice: registration.price,
    renewalPrice: renewal.price,
    transferPrice: transfer.price,
    restorePrice: restore.price,
  };
}

async function checkAvailability(client, domains) {
  const response = await request(client, '/domains/check', {
    method: 'POST',
    body: JSON.stringify({ domains: domains.map(splitDomain) }),
  });
  const results = Array.isArray(response.data) ? response.data : response.data?.results;
  if (!Array.isArray(results)) {
    throw new Error('Openprovider returned an invalid availability response.');
  }
  return results.map(item => ({
    domain: typeof item.domain === 'string'
      ? item.domain
      : `${item.domain?.name || ''}.${item.domain?.extension || ''}`,
    status: item.status,
    available: ['free', 'available'].includes(String(item.status || '').toLowerCase()),
  }));
}

async function findDomain(client, domain) {
  const response = await request(client, `/domains?${new URLSearchParams({ full_name: domain })}`);
  return response.data?.results?.find(item =>
    item.domain?.name === splitDomain(domain).name
    && item.domain?.extension === splitDomain(domain).extension
  );
}

async function registerDomain(client, { domain, years = 1, contactId, nameServers = [], autoRenew = false }) {
  const handle = contactId || client.defaultHandle;
  if (!handle) {
    throw new Error('Set OPENPROVIDER_DEFAULT_HANDLE or provide an Openprovider contact handle.');
  }
  const result = await request(client, '/domains', {
    method: 'POST',
    body: JSON.stringify({
      domain: splitDomain(domain),
      period: years,
      owner_handle: handle,
      admin_handle: handle,
      tech_handle: handle,
      billing_handle: handle,
      name_servers: nameServers.map(name => ({ name })),
      autorenew: autoRenew ? 'on' : 'off',
    }),
  });
  return result.data;
}

async function renewDomain(client, domain, years = 1) {
  const record = await findDomain(client, domain);
  if (!record?.id) {
    throw new Error('Domain not found in the Openprovider account.');
  }
  const result = await request(client, `/domains/${record.id}/renew`, {
    method: 'POST',
    body: JSON.stringify({ domain: splitDomain(domain), id: record.id, period: years }),
  });
  return result.data;
}

async function transferDomain(client, domain, authCode) {
  const handle = client.defaultHandle;
  if (!handle) {
    throw new Error('Set OPENPROVIDER_DEFAULT_HANDLE before transferring domains.');
  }
  const result = await request(client, '/domains/transfer', {
    method: 'POST',
    body: JSON.stringify({
      domain: splitDomain(domain),
      auth_code: authCode,
      owner_handle: handle,
      admin_handle: handle,
      tech_handle: handle,
      billing_handle: handle,
    }),
  });
  return result.data;
}

async function setNameservers(client, domain, nameservers) {
  const record = await findDomain(client, domain);
  if (!record?.id) {
    throw new Error('Domain not found in the Openprovider account.');
  }
  return request(client, `/domains/${record.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      domain: splitDomain(domain),
      name_servers: nameservers.filter(Boolean).map(name => ({ name })),
    }),
  });
}

module.exports = {
  checkAvailability,
  createClient,
  getTldPricing,
  registerDomain,
  renewDomain,
  setNameservers,
  transferDomain,
};
