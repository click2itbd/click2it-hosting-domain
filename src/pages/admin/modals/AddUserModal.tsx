import React from 'react';
import { X } from 'lucide-react';
import { UserPermission } from '../../../types';

interface AddUserModalProps {
  isAddingUser: boolean;
  setIsAddingUser: (v: boolean) => void;
  userFormData: { name: string; email: string; password: string; role: string; permissions: UserPermission[] };
  setUserFormData: (v: any) => void;
  handleAddPortalUser: (e: React.FormEvent) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isAddingUser, setIsAddingUser, userFormData, setUserFormData, handleAddPortalUser
}) => {
  return (
    <>
      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
              <h2 className="text-xl font-bold">New Portal User</h2>
              <button onClick={() => setIsAddingUser(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddPortalUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Display Name</label>
                <input type="text" required className="w-full border-gray-300 rounded-md" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input type="email" required className="w-full border-gray-300 rounded-md" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                <input type="password" required minLength={6} className="w-full border-gray-300 rounded-md" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                <input 
                  list="user-roles"
                  className="w-full border-gray-300 rounded-md" 
                  value={userFormData.role} 
                  onChange={e => setUserFormData({...userFormData, role: e.target.value.toLowerCase()})} 
                  placeholder="e.g. staff, manager, editor"
                  required
                />
                <datalist id="user-roles">
                  <option value="user" />
                  <option value="staff" />
                  <option value="manager" />
                  <option value="admin" />
                </datalist>
              </div>
              {userFormData.role !== 'admin' && userFormData.role !== 'user' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md">
                    {['view_dashboard', 'manage_users', 'manage_settings', 'manage_inventory', 'manage_orders', 'manage_finances', 'manage_reports', 'manage_hr', 'manage_services', 'manage_marketing'].map((perm) => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={userFormData.permissions.includes(perm as UserPermission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserFormData({ ...userFormData, permissions: [...userFormData.permissions, perm as UserPermission] });
                            } else {
                              setUserFormData({ ...userFormData, permissions: userFormData.permissions.filter((p: UserPermission) => p !== perm) });
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="capitalize">{perm.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#EF4444] rounded-md hover:bg-red-600">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
