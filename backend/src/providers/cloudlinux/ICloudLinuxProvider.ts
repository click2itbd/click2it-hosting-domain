export interface CloudLinuxLicensePayload {
  ip: string;
  type: number;
}

export interface CloudLinuxLicenseResult {
  success: boolean;
  licenseId?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

export interface ICloudLinuxProvider {
  addLicense(ip: string, type: number): Promise<CloudLinuxLicenseResult>;
  removeLicense(ip: string, type: number): Promise<CloudLinuxLicenseResult>;
  testConnection?(): Promise<{ success: boolean; code: string; message: string }>;
}
