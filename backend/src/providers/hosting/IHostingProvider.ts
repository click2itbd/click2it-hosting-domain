export interface HostingProvisionRequest {
  planCode: string;
  domain: string;
  username?: string;
  password?: string;
  contactEmail: string;
  billingCycle: 'monthly' | 'yearly';
}

export interface HostingProvisionResult {
  success: boolean;
  providerAccountId?: string;
  password?: string;
  cPanelUrl?: string;
  nameservers?: string[];
  error?: string;
}

export interface HostingUsageStats {
  providerAccountId: string;
  diskUsageMB: number;
  diskLimitMB: number;
  bandwidthUsageMB: number;
  bandwidthLimitMB: number;
  cpuUsagePercent?: number;
  ramUsageMB?: number;
  lastUpdated: string;
}

export interface IHostingProvider {
  provisionAccount(request: HostingProvisionRequest): Promise<HostingProvisionResult>;
  suspendAccount(providerAccountId: string): Promise<void>;
  unsuspendAccount(providerAccountId: string): Promise<void>;
  terminateAccount(providerAccountId: string): Promise<void>;
  getUsage(providerAccountId: string): Promise<HostingUsageStats>;
  changePlan(providerAccountId: string, newPlanCode: string): Promise<void>;
  createLoginSession?(providerAccountId: string): Promise<string>;
  testConnection?(): Promise<{ success: boolean; code: string; message: string }>;
}
