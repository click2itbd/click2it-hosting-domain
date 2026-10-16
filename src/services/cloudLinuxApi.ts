import { apiPost, apiDelete } from './apiClient';

export interface CloudLinuxLicensePayload {
  ip: string;
  type: number;
}

export const addCloudLinuxLicense = async (payload: CloudLinuxLicensePayload, token: string): Promise<any> => {
  const result = await apiPost('/api/hosting/cloudlinux/license', payload, token);
  return result;
};

export const removeCloudLinuxLicense = async (ip: string, type: number, token: string): Promise<any> => {
  const result = await apiDelete(`/api/hosting/cloudlinux/license?ip=${encodeURIComponent(ip)}&type=${type}`, token);
  return result;
};
