const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/tabs/menus/Menus.tsx', 'utf8');

content = content.replace('const [variants, setVariants] = useState<Variant[]>([]);', 'const [variants, setVariants] = useState<Variant[]>([]);\n  const [products, setProducts] = useState<any[]>([]);');

content = content.replace('const unsubVariants = onSnapshot(query(collection(db, \'variants\'), orderBy(\'sku\', \'asc\')), snap => {', 'const unsubProducts = onSnapshot(query(collection(db, \'products\')), snap => { setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });\n    const unsubVariants = onSnapshot(query(collection(db, \'variants\'), orderBy(\'sku\', \'asc\')), snap => {');

content = content.replace('return () => { unsubMenus(); unsubBrands(); unsubModels(); unsubVariants(); };', 'return () => { unsubMenus(); unsubBrands(); unsubModels(); unsubVariants(); unsubProducts(); };');

content = content.replace('const [activeForm, setActiveForm] = useState<\'category\' | \'subcategory\' | \'brand\' | \'model\' | \'variant\' | null>(null);', 'const [activeForm, setActiveForm] = useState<\'category\' | \'subcategory\' | \'brand\' | \'model\' | \'variant\' | string | null>(null);');

content = content.replace('const [variantForm, setVariantForm] = useState<Partial<Variant>>({ modelId: \'\', attributeName: \'\', attributeValue: \'\', sku: \'\', price: 0, stock: 0, barcode: \'\', status: \'Active\' });', 'const [variantForm, setVariantForm] = useState<Partial<Variant>>({ modelId: \'\', attributeName: \'\', attributeValue: \'\', sku: \'\', price: 0, stock: 0, barcode: \'\', status: \'Active\' });\n  const [productForm, setProductForm] = useState<any>({ name: \'\', category: \'\', subCategory: \'\', brand: \'\', model: \'\' });');

const save_product_fn = 
  const saveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name) return toast.error('Name required');
    try {
      await addDoc(collection(db, 'products'), {
        name: productForm.name,
        category: productForm.category,
        subCategory: productForm.subCategory,
        brand: productForm.brand,
        model: productForm.model,
        price: 0,
        stock: 0,
        images: [],
        createdAt: serverTimestamp()
      });
      toast.success('Product created! You can now purchase it.');
      setActiveForm(null);
    } catch (err) { toast.error('Failed to save product'); }
  };
;

content = content.replace('// --- Category ---', save_product_fn + '\n  // --- Category ---');

const product_ui = 
                                              {/* Products Section */}
                                              <div className="mt-4 pt-4 border-t border-gray-200">
                                                <div className="flex justify-between items-center mb-2">
                                                  <span className="text-xs font-bold text-gray-700 uppercase">Products under this Model</span>
                                                  <button onClick={() => {
                                                    const cat = menus.find(m => m.id === category.id)?.slug || '';
                                                    const subcat = category.subCategories?.find(s => s.id === sub.id)?.slug || '';
                                                    const brnd = globalBrands.find(b => b.id === brandId)?.name || '';
                                                    setProductForm({ name: '', category: cat, subCategory: subcat, brand: brnd, model: model.name });
                                                    setActiveForm('product_' + model.id);
                                                  }} className="text-[10px] flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md hover:bg-green-100 font-bold">
                                                    <Plus size={10} /> Add Product Name
                                                  </button>
                                                </div>
                                                
                                                {activeForm === ('product_' + model.id) && (
                                                  <form onSubmit={saveProduct} className="bg-green-50/50 p-3 rounded-lg border border-green-100 mb-3 flex gap-2">
                                                    <input autoFocus type="text" placeholder="e.g. Apple MacBook Pro M1 16GB" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-green-500" required />
                                                    <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-bold hover:bg-green-700">Save</button>
                                                    <button type="button" onClick={() => setActiveForm(null)} className="text-gray-500 hover:text-gray-800 text-sm px-2">Cancel</button>
                                                  </form>
                                                )}

                                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                  <table className="w-full text-[11px] text-left">
                                                    <thead>
                                                      <tr className="text-gray-400 uppercase font-bold border-b border-gray-200">
                                                        <th className="pb-1">Product Name</th>
                                                        <th className="pb-1">Stock</th>
                                                        <th className="pb-1 text-right">Action</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {products.filter(p => p.model === model.name && p.category === (menus.find(m => m.id === category.id)?.slug || '')).length === 0 && (
                                                        <tr><td colSpan={3} className="py-2 text-center text-gray-400 italic">No products created here yet.</td></tr>
                                                      )}
                                                      {products.filter(p => p.model === model.name && p.category === (menus.find(m => m.id === category.id)?.slug || '')).map(p => (
                                                        <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-white">
                                                          <td className="py-1.5 font-bold text-gray-700">{p.name}</td>
                                                          <td className="py-1.5">{p.stock || 0}</td>
                                                          <td className="py-1.5 text-right">
                                                            <button onClick={async () => {
                                                              if (confirm('Delete product?')) {
                                                                await deleteDoc(doc(db, 'products', p.id));
                                                              }
                                                            }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={12}/></button>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
;

content = content.replace('</div>\n                                            </div>\n                                          </div>\n                                        ))}', product_ui + '\n                                            </div>\n                                          </div>\n                                        ))}');

fs.writeFileSync('src/pages/admin/tabs/menus/Menus.tsx', content);
console.log('done');
