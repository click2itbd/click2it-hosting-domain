import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { SpecificationTemplate, SpecificationField } from '../../../../types';
import { Plus, Edit2, Trash2, X, PlusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../../../lib/utils';

export const TemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<SpecificationTemplate[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [bulkFields, setBulkFields] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<SpecificationTemplate>>({
    name: '',
    category: '',
    fields: []
  });

  const fetchMenus = async () => {
    try {
      const snap = await getDocs(collection(db, 'menus'));
      setMenus(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'specificationTemplates'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpecificationTemplate));
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchMenus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTemplate.name || !currentTemplate.category) {
      toast.error('Name and Category are required');
      return;
    }
    
    try {
      if (currentTemplate.id) {
        const docRef = doc(db, 'specificationTemplates', currentTemplate.id);
        await updateDoc(docRef, { ...currentTemplate, updatedAt: serverTimestamp() });
        toast.success('Template updated');
      } else {
        await addDoc(collection(db, 'specificationTemplates'), { ...currentTemplate, createdAt: serverTimestamp() });
        toast.success('Template created');
      }
      fetchTemplates();
      setIsEditing(false);
      setCurrentTemplate({ name: '', category: '', fields: [] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'specificationTemplates', id));
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const addField = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: [
        ...(prev.fields || []),
        { id: Date.now().toString(), name: '', label: '', type: 'text', required: false, options: [] }
      ]
    }));
  };

  const updateField = (index: number, key: keyof SpecificationField, value: any) => {
    setCurrentTemplate(prev => {
      const newFields = [...(prev.fields || [])];
      newFields[index] = { ...newFields[index], [key]: value };
      return { ...prev, fields: newFields };
    });
  };

  const removeField = (index: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields?.filter((_, i) => i !== index)
    }));
  };

  if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Specification Templates</h2>
        <button
          onClick={() => {
            setCurrentTemplate({ name: '', category: '', fields: [] });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>Add Template</span>
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{currentTemplate.id ? 'Edit Template' : 'New Template'}</h3>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={currentTemplate.name || ''}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Laptop Specs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Category</label>
                <select
                  required
                  value={currentTemplate.category || ''}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Category</option>
                  {menus.map(menu => (
                    <option key={menu.id} value={menu.name}>{menu.name}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
              <label className="block text-sm font-bold text-blue-800 mb-2">Quick Bulk Add (Paste comma-separated fields)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={bulkFields}
                  onChange={e => setBulkFields(e.target.value)}
                  placeholder="e.g. Processor, RAM, Storage, Display, Battery"
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-md focus:ring-blue-500 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const items = bulkFields.split(',').map(s => s.trim()).filter(s => s);
                      if (items.length > 0) {
                        const newFields = items.map(item => ({
                          id: Date.now().toString() + Math.random().toString(),
                          label: item,
                          name: item.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                          type: 'text' as const,
                          required: false,
                          options: []
                        }));
                        setCurrentTemplate(prev => ({
                          ...prev,
                          fields: [...(prev.fields || []), ...newFields]
                        }));
                        setBulkFields('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const items = bulkFields.split(',').map(s => s.trim()).filter(s => s);
                    if (items.length > 0) {
                      const newFields = items.map(item => ({
                        id: Date.now().toString() + Math.random().toString(),
                        label: item,
                        name: item.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                        type: 'text' as const,
                        required: false,
                        options: []
                      }));
                      setCurrentTemplate(prev => ({
                        ...prev,
                        fields: [...(prev.fields || []), ...newFields]
                      }));
                      setBulkFields('');
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-blue-700"
                >
                  Generate Fields
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Fields</label>
                <button type="button" onClick={addField} className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                  <PlusCircle size={16} /> Add Field
                </button>
              </div>
              
              {currentTemplate.fields?.map((field, index) => (
                <div key={field.id} className="p-4 border border-gray-200 rounded-lg flex flex-wrap gap-4 items-end bg-gray-50">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Label (Display Name)</label>
                    <input
                      type="text"
                      required
                      value={field.label}
                      onChange={(e) => {
                        updateField(index, 'label', e.target.value);
                        // Auto-generate name from label if name is empty or matches slugified label
                        if (!field.name || field.name === field.label.toLowerCase().replace(/[^a-z0-9]/g, '_')) {
                          updateField(index, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                        }
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      placeholder="e.g. Processor Type"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name (Key)</label>
                    <input
                      type="text"
                      required
                      value={field.name}
                      onChange={(e) => updateField(index, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-gray-100"
                      placeholder="e.g. processor_type"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, 'type', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="select">Select</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={field.required || false}
                      onChange={(e) => updateField(index, 'required', e.target.checked)}
                      id={`req-${index}`}
                    />
                    <label htmlFor={`req-${index}`} className="text-sm text-gray-700">Required</label>
                  </div>
                  <button type="button" onClick={() => removeField(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md pb-2">
                    <Trash2 size={18} />
                  </button>

                  {field.type === 'select' && (
                    <div className="w-full mt-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Options (Comma separated)</label>
                      <input
                        type="text"
                        value={field.options?.join(', ') || ''}
                        onChange={(e) => updateField(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g. Intel, AMD, Apple M1"
                      />
                    </div>
                  )}
                </div>
              ))}
              {(!currentTemplate.fields || currentTemplate.fields.length === 0) && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  No fields added yet. Click "Add Field" to begin.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">
                Cancel
              </button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map(template => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{template.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">{template.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {template.fields.slice(0, 3).map(f => (
                        <span key={f.id} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{f.label}</span>
                      ))}
                      {template.fields.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">+{template.fields.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => { setCurrentTemplate(template); setIsEditing(true); }} className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 mr-2">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(template.id)} className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No templates found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
