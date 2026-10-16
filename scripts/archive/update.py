import re

with open("src/pages/admin/tabs/hr/Users.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add Chevron imports
if "ChevronDown" not in content:
    content = content.replace("import { Users as UsersIcon, Mail, X, Trash2, Shield, Key } from 'lucide-react';",
                              "import { Users as UsersIcon, Mail, X, Trash2, Shield, Key, ChevronDown, ChevronRight } from 'lucide-react';")

# Replace edit permissions modal inner block
edit_block_start = "{["
edit_block_end = ")]}</div>"
# Using regex to find the map block
# Find everything from `{[ \n { id: 'view_dashboard'` to `\n                  })}`
edit_pattern = re.compile(r'\{\[\s*\{\s*id:\s*\'view_dashboard\'.*?\}\)\s*\}', re.DOTALL)

render_tree_edit = """{(() => {
                    const currentPerms = editingUserPermissions.permissions || [];
                    const onChangePerms = (newPerms: string[]) => {
                      setEditingUserPermissions({...editingUserPermissions, permissions: newPerms});
                    };
                    return permissionsTree.map((parent) => {
                      const isParentChecked = currentPerms.includes(parent.id);
                      const allChildIds = parent.sub.map(s => s.id);
                      const isPartiallyChecked = (!allChildIds.every(id => currentPerms.includes(id)) && allChildIds.some(id => currentPerms.includes(id))) || (isParentChecked && !allChildIds.every(id => currentPerms.includes(id)));
                      
                      return (
                        <div key={parent.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isParentChecked || allChildIds.every(id => currentPerms.includes(id))}
                                ref={(el) => { if (el) el.indeterminate = isPartiallyChecked; }}
                                onChange={() => handleParentCheck(parent, currentPerms, onChangePerms)}
                                className="rounded text-[#EF4444] focus:ring-[#EF4444]"
                              />
                              <span className="font-bold text-sm text-gray-800">{parent.label}</span>
                            </label>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); toggleExpand(parent.id); }}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {expandedPerms[parent.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </div>
                          
                          {expandedPerms[parent.id] && (
                            <div className="p-3 border-t border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {parent.sub.map(child => (
                                <label key={child.id} className="flex items-center gap-2 cursor-pointer text-sm p-1.5 hover:bg-gray-50 rounded">
                                  <input
                                    type="checkbox"
                                    checked={currentPerms.includes(child.id) || currentPerms.includes(parent.id)}
                                    onChange={() => handleChildCheck(parent.id, child.id, currentPerms, onChangePerms)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-600">{child.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}"""

# We need to replace the two occurrences: one in the edit modal, one in the add user modal.
# First occurrence:
first_match = edit_pattern.search(content)
if first_match:
    content = content[:first_match.start()] + render_tree_edit + content[first_match.end():]

# Second occurrence (in add user modal):
second_match = edit_pattern.search(content)
if second_match:
    render_tree_add = render_tree_edit.replace("editingUserPermissions", "userFormData").replace("setEditingUserPermissions({...editingUserPermissions", "setUserFormData({...userFormData").replace("text-[#EF4444] focus:ring-[#EF4444]", "text-blue-600 focus:ring-blue-500")
    content = content[:second_match.start()] + render_tree_add + content[second_match.end():]

# Add expandedPerms state if missing
if "expandedPerms" not in content:
    content = content.replace("const [userFormData", "const [expandedPerms, setExpandedPerms] = useState<Record<string, boolean>>({});\n  const [userFormData")

with open("src/pages/admin/tabs/hr/Users.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated successfully via python script")
