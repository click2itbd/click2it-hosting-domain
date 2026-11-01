import crypto from 'crypto';

export type VpsProviderType = 'hetzner' | 'digitalocean' | 'vultr' | 'virtualizor' | 'contabo';

export interface VpsProvisionRequest {
  planId: string;
  planMapperCode?: string;
  hostname: string;
  os: string;
  region?: string;
  rootPassword?: string;
  sshKey?: string;
  cores?: string;
  ram?: string;
  storage?: string;
}

export interface VpsProvisionResponse {
  success: boolean;
  serverId?: string;
  ipAddress?: string;
  ipv6Address?: string;
  username?: string;
  rootPassword?: string;
  osInstalled?: string;
  region?: string;
  provider?: string;
  status?: string;
  error?: string;
}

export interface VpsTestConnectionResponse {
  success: boolean;
  code: string;
  message: string;
  provider: string;
  latencyMs?: number;
}

function generateStrongPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pass = 'C2i!';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return pass + '#9';
}

function sanitizeHostname(raw: string, fallbackId: string): string {
  const cleaned = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!cleaned || cleaned.length < 3) {
    return `vps-${fallbackId.slice(0, 6).toLowerCase()}.click2it.bd`;
  }
  return cleaned;
}

function mapOsToProviderImage(provider: VpsProviderType, osInput: string): { image: string; isWindows: boolean } {
  const s = String(osInput || 'ubuntu').toLowerCase();
  const isWindows = s.includes('win');

  if (provider === 'hetzner') {
    if (s.includes('debian')) return { image: 'debian-12', isWindows: false };
    if (s.includes('alma')) return { image: 'alma-9', isWindows: false };
    if (s.includes('rocky')) return { image: 'rocky-9', isWindows: false };
    if (s.includes('24.04')) return { image: 'ubuntu-24.04', isWindows: false };
    return { image: 'ubuntu-22.04', isWindows };
  }

  if (provider === 'digitalocean') {
    if (s.includes('debian')) return { image: 'debian-12-x64', isWindows: false };
    if (s.includes('alma')) return { image: 'almalinux-9-x64', isWindows: false };
    if (s.includes('24.04')) return { image: 'ubuntu-24-04-x64', isWindows: false };
    return { image: 'ubuntu-22-04-x64', isWindows };
  }

  if (provider === 'vultr') {
    // Vultr OS IDs: 1743 = Ubuntu 22.04 x64, 2136 = Debian 12 x64, 2056 = AlmaLinux 9 x64, 501 = Windows 2022 Standard
    if (isWindows) return { image: '501', isWindows: true };
    if (s.includes('debian')) return { image: '2136', isWindows: false };
    if (s.includes('alma')) return { image: '2056', isWindows: false };
    return { image: '1743', isWindows: false };
  }

  return { image: osInput || 'ubuntu-22.04', isWindows };
}

function getDefaultPlanSlug(provider: VpsProviderType, planId: string): string {
  const p = String(planId || '').toLowerCase();

  if (provider === 'hetzner') {
    if (p.includes('ultra') || p.includes('16')) return 'cpx51';
    if (p.includes('pro') || p.includes('3') || p.includes('8')) return 'cpx41';
    if (p.includes('standard') || p.includes('2') || p.includes('4')) return 'cpx31';
    return 'cx22';
  }

  if (provider === 'digitalocean') {
    if (p.includes('ultra')) return 's-8vcpu-32gb-amd';
    if (p.includes('pro') || p.includes('3')) return 's-8vcpu-16gb';
    if (p.includes('standard') || p.includes('2')) return 's-4vcpu-8gb';
    return 's-2vcpu-4gb';
  }

  if (provider === 'vultr') {
    if (p.includes('ultra')) return 'vc2-8c-32gb';
    if (p.includes('pro') || p.includes('3')) return 'vc2-6c-16gb';
    if (p.includes('standard') || p.includes('2')) return 'vc2-4c-8gb';
    return 'vc2-2c-4gb';
  }

  return planId;
}

export class VpsProvider {
  constructor(
    private provider: VpsProviderType,
    private apiToken: string,
    private apiSecret: string = '',
    private apiUrl: string = '',
    private defaultRegion: string = ''
  ) {}

  async testConnection(): Promise<VpsTestConnectionResponse> {
    const start = Date.now();
    const token = (this.apiToken || '').trim();

    if (!token) {
      return {
        success: false,
        code: 'MISSING_CREDENTIALS',
        message: 'API Token / Key is required to test connection.',
        provider: this.provider,
      };
    }

    try {
      if (this.provider === 'hetzner') {
        const res = await fetch('https://api.hetzner.cloud/v1/server_types', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            success: false,
            code: 'AUTH_FAILED',
            message: data?.error?.message || `Hetzner API returned HTTP ${res.status}`,
            provider: 'Hetzner Cloud',
            latencyMs: Date.now() - start,
          };
        }
        const count = Array.isArray(data?.server_types) ? data.server_types.length : 0;
        return {
          success: true,
          code: 'CONNECTED',
          message: `Hetzner Cloud API verified (${count} instance types available).`,
          provider: 'Hetzner Cloud',
          latencyMs: Date.now() - start,
        };
      }

      if (this.provider === 'digitalocean') {
        const res = await fetch('https://api.digitalocean.com/v2/account', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok || !data?.account) {
          return {
            success: false,
            code: 'AUTH_FAILED',
            message: data?.message || `DigitalOcean API returned HTTP ${res.status}`,
            provider: 'DigitalOcean',
            latencyMs: Date.now() - start,
          };
        }
        return {
          success: true,
          code: 'CONNECTED',
          message: `DigitalOcean API connected (${data.account.email}, status: ${data.account.status}, droplet limit: ${data.account.droplet_limit}).`,
          provider: 'DigitalOcean',
          latencyMs: Date.now() - start,
        };
      }

      if (this.provider === 'vultr') {
        const res = await fetch('https://api.vultr.com/v2/account', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok || !data?.account) {
          return {
            success: false,
            code: 'AUTH_FAILED',
            message: data?.error || `Vultr API returned HTTP ${res.status}`,
            provider: 'Vultr',
            latencyMs: Date.now() - start,
          };
        }
        return {
          success: true,
          code: 'CONNECTED',
          message: `Vultr API connected (${data.account.name || data.account.email || 'Account active'}).`,
          provider: 'Vultr',
          latencyMs: Date.now() - start,
        };
      }

      if (this.provider === 'virtualizor') {
        const base = (this.apiUrl || '').replace(/\/+$/, '');
        if (!base) {
          return {
            success: false,
            code: 'MISSING_URL',
            message: 'Virtualizor Node URL (e.g. https://node.click2it.bd:4085) is required.',
            provider: 'Virtualizor',
          };
        }
        const url = `${base}/index.php?act=ostemplates&api=json&apikey=${encodeURIComponent(token)}&apipass=${encodeURIComponent(this.apiSecret)}`;
        const res = await fetch(url);
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          return {
            success: false,
            code: 'AUTH_FAILED',
            message: typeof data?.error === 'string' ? data.error : `Virtualizor connection failed (HTTP ${res.status})`,
            provider: 'Virtualizor',
            latencyMs: Date.now() - start,
          };
        }
        return {
          success: true,
          code: 'CONNECTED',
          message: 'Virtualizor Master Node API connected and authenticated.',
          provider: 'Virtualizor',
          latencyMs: Date.now() - start,
        };
      }

      if (this.provider === 'contabo') {
        return {
          success: true,
          code: 'CONFIGURED',
          message: 'Contabo API credentials saved and ready.',
          provider: 'Contabo',
          latencyMs: Date.now() - start,
        };
      }

      return {
        success: false,
        code: 'UNSUPPORTED_PROVIDER',
        message: `Unsupported VPS provider: ${this.provider}`,
        provider: this.provider,
      };
    } catch (error: any) {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        message: error?.message || 'Failed to connect to VPS provider API',
        provider: this.provider,
        latencyMs: Date.now() - start,
      };
    }
  }

  async provisionServer(req: VpsProvisionRequest): Promise<VpsProvisionResponse> {
    const token = (this.apiToken || '').trim();
    if (!token) {
      return {
        success: false,
        error: 'VPS Provider API Token is not configured.',
      };
    }

    const hostname = sanitizeHostname(req.hostname, req.planId || 'node');
    const { image, isWindows } = mapOsToProviderImage(this.provider, req.os);
    const serverSize = (req.planMapperCode || '').trim() || getDefaultPlanSlug(this.provider, req.planId);
    const desiredPassword = (req.rootPassword || '').trim() || generateStrongPassword();

    try {
      // 1. HETZNER CLOUD PROVISIONING
      if (this.provider === 'hetzner') {
        const location = (req.region || this.defaultRegion || 'sin').trim().toLowerCase();
        const body: Record<string, any> = {
          name: hostname.replace(/[^a-z0-9-]/g, '-').slice(0, 60),
          server_type: serverSize,
          image,
          location,
          start_after_create: true,
          public_net: {
            enable_ipv4: true,
            enable_ipv6: true,
          },
          labels: {
            managed_by: 'click2it',
            plan: req.planId,
          },
        };

        // Inject cloud-init if customer provided a custom root password
        if (req.rootPassword && !isWindows) {
          body.user_data = `#cloud-config\nchpasswd:\n  list: |\n    root:${desiredPassword}\n  expire: False\nssh_pwauth: True\n`;
        }

        const res = await fetch('https://api.hetzner.cloud/v1/servers', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data: any = await res.json().catch(() => ({}));
        if (!res.ok || !data?.server) {
          return {
            success: false,
            error: data?.error?.message || `Hetzner provisioning failed (HTTP ${res.status})`,
          };
        }

        const ipv4 = data.server?.public_net?.ipv4?.ip || '';
        const ipv6 = data.server?.public_net?.ipv6?.ip || '';
        const rootPassword = data.root_password || desiredPassword;

        return {
          success: true,
          serverId: String(data.server.id),
          ipAddress: ipv4,
          ipv6Address: ipv6,
          username: isWindows ? 'Administrator' : 'root',
          rootPassword,
          osInstalled: req.os || image,
          region: location,
          provider: 'hetzner',
          status: 'active',
        };
      }

      // 2. DIGITALOCEAN DROPLET PROVISIONING
      if (this.provider === 'digitalocean') {
        const region = (req.region || this.defaultRegion || 'sgp1').trim().toLowerCase();
        const userData = `#cloud-config\nchpasswd:\n  list: |\n    root:${desiredPassword}\n  expire: False\nssh_pwauth: True\n`;

        const createRes = await fetch('https://api.digitalocean.com/v2/droplets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: hostname,
            region,
            size: serverSize,
            image,
            user_data: userData,
            ipv6: true,
            tags: ['click2it', req.planId],
          }),
        });

        const createData: any = await createRes.json().catch(() => ({}));
        if (!createRes.ok || !createData?.droplet?.id) {
          return {
            success: false,
            error: createData?.message || `DigitalOcean provisioning failed (HTTP ${createRes.status})`,
          };
        }

        const dropletId = createData.droplet.id;
        let ipv4 = '';

        // Poll up to 4 times (2.5s interval) for DigitalOcean to assign public IPv4
        for (let attempt = 0; attempt < 4; attempt++) {
          await new Promise((r) => setTimeout(r, 2500));
          const pollRes = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const pollData: any = await pollRes.json().catch(() => ({}));
          const v4Net = (pollData?.droplet?.networks?.v4 || []).find((n: any) => n.type === 'public');
          if (v4Net?.ip_address) {
            ipv4 = v4Net.ip_address;
            break;
          }
        }

        return {
          success: true,
          serverId: String(dropletId),
          ipAddress: ipv4 || 'Allocating IP (Check Portal)',
          username: 'root',
          rootPassword: desiredPassword,
          osInstalled: req.os || image,
          region,
          provider: 'digitalocean',
          status: 'active',
        };
      }

      // 3. VULTR INSTANCE PROVISIONING
      if (this.provider === 'vultr') {
        const region = (req.region || this.defaultRegion || 'sgp').trim().toLowerCase();
        const createRes = await fetch('https://api.vultr.com/v2/instances', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            region,
            plan: serverSize,
            os_id: Number(image) || 1743,
            label: hostname,
            hostname,
            enable_ipv6: true,
          }),
        });

        const createData: any = await createRes.json().catch(() => ({}));
        if (!createRes.ok || !createData?.instance?.id) {
          return {
            success: false,
            error: createData?.error || `Vultr provisioning failed (HTTP ${createRes.status})`,
          };
        }

        const inst = createData.instance;
        return {
          success: true,
          serverId: String(inst.id),
          ipAddress: inst.main_ip && inst.main_ip !== '0.0.0.0' ? inst.main_ip : 'Allocating IP',
          username: isWindows ? 'Administrator' : 'root',
          rootPassword: inst.default_password || desiredPassword,
          osInstalled: req.os,
          region,
          provider: 'vultr',
          status: 'active',
        };
      }

      // 4. VIRTUALIZOR SELF-HOSTED NODE PROVISIONING
      if (this.provider === 'virtualizor') {
        const base = (this.apiUrl || '').replace(/\/+$/, '');
        if (!base) {
          return {
            success: false,
            error: 'Virtualizor API URL is not configured.',
          };
        }
        const url = `${base}/index.php?act=addvs&api=json&apikey=${encodeURIComponent(token)}&apipass=${encodeURIComponent(this.apiSecret)}`;
        const formParams = new URLSearchParams({
          virt: 'kvm',
          hostname,
          rootpass: desiredPassword,
          plid: serverSize,
          osid: image,
        });

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formParams.toString(),
        });

        const data: any = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          return {
            success: false,
            error: typeof data?.error === 'string' ? data.error : 'Virtualizor VM creation failed.',
          };
        }

        const assignedIp = Array.isArray(data?.newvs?.ips) ? data.newvs.ips[0] : data?.newvs?.ip || '';
        return {
          success: true,
          serverId: String(data?.newvs?.vpsid || Date.now()),
          ipAddress: assignedIp,
          username: isWindows ? 'Administrator' : 'root',
          rootPassword: desiredPassword,
          osInstalled: req.os,
          region: this.defaultRegion || 'bdix',
          provider: 'virtualizor',
          status: 'active',
        };
      }

      return {
        success: false,
        error: `Auto-provisioning driver for '${this.provider}' requires manual verification.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Unexpected error during VPS provisioning',
      };
    }
  }
}
