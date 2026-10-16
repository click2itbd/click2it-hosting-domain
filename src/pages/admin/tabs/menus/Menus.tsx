import React, { useState, useEffect } from "react";
import { db, storage } from "../../../../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import { formatCurrency, cn } from "../../../../lib/utils";
import { useAuth } from "../../../../context/AuthContext";
import { useSettings } from "../../../../context/SettingsContext";
// import BulkEditForm from '../../../../components/BulkEditForm';
import {
  List,
  Plus,
  Edit,
  Trash2,
  Tag,
  Layers,
  Settings,
  ChevronRight,
  Menu as MenuIcon,
  Cpu,
  Edit2,
} from "lucide-react";

interface MenusTabProps {
  menus: any[];
  isAddingMenu: boolean;
  setIsAddingMenu: (v: boolean) => void;
  editingMenu: any;
  setEditingMenu: (v: any) => void;
  menuFormData: any;
  setMenuFormData: (v: any) => void;
  isAddingSubCategory: boolean;
  setIsAddingSubCategory: (v: boolean) => void;
  subCategoryFormData: any;
  setSubCategoryFormData: (v: any) => void;
  handleSaveMenu: (e: any) => void;
  handleDeleteMenu: (id: string) => void;
  handleSaveSubCategory: (e: any) => void;
  fetchData: () => Promise<void>;
}

const MenusTab: React.FC<MenusTabProps> = ({
  menus = [],
  isAddingMenu = false,
  setIsAddingMenu = () => {},
  editingMenu = null,
  setEditingMenu = () => {},
  menuFormData = { name: "", slug: "", order: 0, subCategories: [], imageUrl: "" },
  setMenuFormData = () => {},
  isAddingSubCategory = false,
  setIsAddingSubCategory = () => {},
  subCategoryFormData = { parentId: "", name: "", slug: "" },
  setSubCategoryFormData = () => {},
  handleSaveMenu = () => {},
  handleDeleteMenu = () => {},
  handleSaveSubCategory = () => {},
  fetchData = async () => {},
}) => {
  const { isAdmin, hasPermission } = useAuth();
  const { settings } = useSettings();

  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isAddingSubSubCategory, setIsAddingSubSubCategory] = useState(false);
  const [subSubFormData, setSubSubFormData] = useState({ menuId: '', subCategoryId: '', name: '', slug: '' });
  const [globalBrands, setGlobalBrands] = useState<any[]>([]);
  const [brandFormData, setBrandFormData] = useState({
    menuId: "",
    subCategoryId: "",
    brandName: "",
  });

  
  const handleSaveSubSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subSubFormData.menuId || !subSubFormData.subCategoryId) {
      toast.error("Please select parent and sub category");
      return;
    }
    try {
      const parentMenu = menus.find((m: any) => m.id === subSubFormData.menuId);
      if (!parentMenu) return;

      const subCategory = parentMenu.subCategories.find((s: any) => s.id === subSubFormData.subCategoryId);
      if (!subCategory) return;

      const newSubSub = {
        id: Math.random().toString(36).substr(2, 9),
        name: subSubFormData.name,
        slug: subSubFormData.slug || subSubFormData.name.toLowerCase().replace(/\s+/g, "-"),
      };

      if (!subCategory.subCategories) subCategory.subCategories = [];
      subCategory.subCategories.push(newSubSub);

      await updateDoc(doc(db, "menus", parentMenu.id), {
        subCategories: parentMenu.subCategories,
      });

      toast.success("Sub-Sub Category added successfully");
      setIsAddingSubSubCategory(false);
      setSubSubFormData({ menuId: "", subCategoryId: "", name: "", slug: "" });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error adding sub-sub category");
    }
  };

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const snap = await getDocs(collection(db, "brands"));
        setGlobalBrands(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {}
    };
    fetchBrands();
  }, []);

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !brandFormData.menuId ||
      !brandFormData.subCategoryId ||
      !brandFormData.brandName.trim()
    ) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      let brandId = "";
      const existingBrand = globalBrands.find(
        (b) =>
          b.name.toLowerCase() === brandFormData.brandName.trim().toLowerCase(),
      );
      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const docRef = await addDoc(collection(db, "brands"), {
          name: brandFormData.brandName.trim(),
        });
        brandId = docRef.id;
      }

      const parentMenu = menus.find((m) => m.id === brandFormData.menuId);
      if (parentMenu) {
        const updatedSubs = parentMenu.subCategories.map((sub: any) => {
          if (sub.id === brandFormData.subCategoryId) {
            const currentBrands = sub.brands || [];
            if (!currentBrands.includes(brandId)) {
              return { ...sub, brands: [...currentBrands, brandId] };
            }
          }
          return sub;
        });
        await updateDoc(doc(db, "menus", parentMenu.id), {
          subCategories: updatedSubs,
        });
        toast.success("Brand added to sub-category");
        setIsAddingBrand(false);
        setBrandFormData({ menuId: "", subCategoryId: "", brandName: "" });
        fetchData();
        const snap = await getDocs(collection(db, "brands"));
        setGlobalBrands(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      toast.error("Failed to add brand");
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MenuIcon className="text-[#EF4444]" /> Products Category
        </h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const pcBuilderCategories = [
                { id: "cpu", name: "CPU", slug: "cpu" },
                { id: "cooler", name: "CPU Cooler", slug: "cpu-cooler" },
                { id: "motherboard", name: "Motherboard", slug: "motherboard" },
                { id: "ram", name: "RAM", slug: "ram" },
                { id: "storage", name: "Storage", slug: "storage" },
                { id: "gpu", name: "Graphics Card", slug: "graphics-card" },
                { id: "psu", name: "Power Supply", slug: "power-supply" },
                { id: "casing", name: "Casing", slug: "casing" },
                { id: "monitor", name: "Monitor", slug: "monitor" },
                {
                  id: "casing_cooler",
                  name: "Casing Cooler",
                  slug: "casing-cooler",
                },
                { id: "keyboard", name: "Keyboard", slug: "keyboard" },
                { id: "mouse", name: "Mouse", slug: "mouse" },
                {
                  id: "speaker",
                  name: "Speaker & Home Theater",
                  slug: "speaker",
                },
                { id: "headphone", name: "Headphone", slug: "headphone" },
                {
                  id: "wifi",
                  name: "Wifi Adapter / LAN Card",
                  slug: "wifi-adapter",
                },
                { id: "antivirus", name: "Anti Virus", slug: "anti-virus" },
                { id: "ups", name: "UPS", slug: "ups" },
              ];

              let componentsMenu = menus.find(
                (m) => m.name.toLowerCase() === "components",
              );

              try {
                if (!componentsMenu) {
                  const docRef = await addDoc(collection(db, "menus"), {
                    name: "Components",
                    slug: "components",
                    order: 1,
                    subCategories: [],
                    createdAt: new Date().toISOString(),
                  });
                  componentsMenu = {
                    id: docRef.id,
                    name: "Components",
                    slug: "components",
                    order: 1,
                    subCategories: [],
                  };
                }

                const existingSubs = componentsMenu.subCategories || [];
                const newSubs = [...existingSubs];

                pcBuilderCategories.forEach((cat) => {
                  if (!existingSubs.some((s) => s.slug === cat.slug)) {
                    newSubs.push({
                      id: Math.random().toString(36).substr(2, 9),
                      name: cat.name,
                      slug: cat.slug,
                    });
                  }
                });

                await updateDoc(doc(db, "menus", componentsMenu.id), {
                  subCategories: newSubs,
                });

                toast.success("Categories seeded to Components menu");
                fetchData();
              } catch (error) {
                console.error("Error seeding categories:", error);
                toast.error("Failed to seed categories");
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700 transition-all font-bold text-sm"
          >
            <Cpu size={18} /> Seed Builder Categories
          </button>
          <button
            onClick={() => setIsAddingBrand(true)}
            className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-indigo-200 transition-all font-bold text-sm"
          >
            <Tag size={18} /> Add Brand
          </button>
          <button
              onClick={() => setIsAddingSubSubCategory(true)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-200 transition-all font-bold text-sm"
            >
              <Plus size={18} /> Add Sub-Sub Category
            </button>
            <button
              onClick={() => setIsAddingSubCategory(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-200 transition-all font-bold text-sm"
          >
            <Plus size={18} /> Add Sub Category
          </button>
          <button
            onClick={() => setIsAddingMenu(true)}
            className="bg-[#081621] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-[#EF4444] transition-all font-bold text-sm"
          >
            <Plus size={18} /> Add Parent Category
          </button>
        </div>
      </div>

      {isAddingBrand && (
        <div className="p-6 bg-indigo-50/50 border-b border-indigo-100">
          <form onSubmit={handleSaveBrand} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Parent Category
                </label>
                <select
                  required
                  value={brandFormData.menuId}
                  onChange={(e) =>
                    setBrandFormData({
                      ...brandFormData,
                      menuId: e.target.value,
                      subCategoryId: "",
                    })
                  }
                  className="w-full border-gray-200 rounded-md focus:ring-indigo-500"
                >
                  <option value="">Select Category</option>
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Sub Category
                </label>
                <select
                  required
                  value={brandFormData.subCategoryId}
                  onChange={(e) =>
                    setBrandFormData({
                      ...brandFormData,
                      subCategoryId: e.target.value,
                    })
                  }
                  className="w-full border-gray-200 rounded-md focus:ring-indigo-500"
                >
                  <option value="">Select Sub Category</option>
                  {(
                    menus.find((m) => m.id === brandFormData.menuId)
                      ?.subCategories || []
                  ).map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={brandFormData.brandName}
                  onChange={(e) =>
                    setBrandFormData({
                      ...brandFormData,
                      brandName: e.target.value,
                    })
                  }
                  className="w-full border-gray-200 rounded-md focus:ring-indigo-500"
                  placeholder="e.g. ASUS, MSI..."
                  list="global-brands"
                />
                <datalist id="global-brands">
                  {globalBrands.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-8 py-2 rounded-md font-bold hover:bg-indigo-700 transition-all"
              >
                Add Brand
              </button>
              <button
                type="button"
                onClick={() => setIsAddingBrand(false)}
                className="bg-gray-200 text-gray-700 px-8 py-2 rounded-md font-bold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      
        {isAddingSubSubCategory && (
          <div className="p-6 bg-gray-50 border-b border-gray-100">
            <form onSubmit={handleSaveSubSubCategory} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Parent Category
                  </label>
                  <select
                    required
                    value={subSubFormData.menuId}
                    onChange={(e) =>
                      setSubSubFormData({ ...subSubFormData, menuId: e.target.value, subCategoryId: "" })
                    }
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  >
                    <option value="">Select Category</option>
                    {menus.map((menu: any) => (
                      <option key={menu.id} value={menu.id}>
                        {menu.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Sub Category
                  </label>
                  <select
                    required
                    value={subSubFormData.subCategoryId}
                    onChange={(e) =>
                      setSubSubFormData({ ...subSubFormData, subCategoryId: e.target.value })
                    }
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    disabled={!subSubFormData.menuId}
                  >
                    <option value="">Select Sub Category</option>
                    {menus
                      .find((m: any) => m.id === subSubFormData.menuId)
                      ?.subCategories?.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Sub-Sub Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={subSubFormData.name}
                    onChange={(e) =>
                      setSubSubFormData({ ...subSubFormData, name: e.target.value })
                    }
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    placeholder="e.g. Smart Watch"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={subSubFormData.slug}
                    onChange={(e) =>
                      setSubSubFormData({ ...subSubFormData, slug: e.target.value })
                    }
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  className="bg-[#EF4444] text-white px-8 py-2 rounded-md font-bold hover:bg-red-600 transition-all"
                >
                  Add Sub-Sub Category
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSubSubCategory(false)}
                  className="bg-gray-200 text-gray-700 px-8 py-2 rounded-md font-bold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {isAddingSubCategory && (
        <div className="p-6 bg-gray-50 border-b border-gray-100">
          <form onSubmit={handleSaveSubCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Parent Category
                </label>
                <select
                  required
                  value={subCategoryFormData.parentId}
                  onChange={(e) =>
                    setSubCategoryFormData({
                      ...subCategoryFormData,
                      parentId: e.target.value,
                    })
                  }
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                >
                  <option value="">Select Category</option>
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Sub Category Name
                </label>
                <input
                  type="text"
                  required
                  value={subCategoryFormData.name}
                  onChange={(e) =>
                    setSubCategoryFormData({
                      ...subCategoryFormData,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. Gaming Laptops"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={subCategoryFormData.slug}
                  onChange={(e) =>
                    setSubCategoryFormData({
                      ...subCategoryFormData,
                      slug: e.target.value,
                    })
                  }
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. gaming-laptops"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Brands
                </label>
                <input
                  type="text"
                  value={subCategoryFormData.brands || ''}
                  onChange={(e) =>
                    setSubCategoryFormData({
                      ...subCategoryFormData,
                      brands: e.target.value,
                    })
                  }
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. Asus, MSI"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Sub Category Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const storageRef = ref(storage, `subcategories/${Date.now()}_${file.name}`);
                      const uploadTask = uploadBytesResumable(storageRef, file);
                      toast.promise(
                        new Promise((resolve, reject) => {
                          uploadTask.on(
                            "state_changed",
                            null,
                            (error) => reject(error),
                            async () => {
                              const url = await getDownloadURL(uploadTask.snapshot.ref);
                              setSubCategoryFormData({ ...subCategoryFormData, imageUrl: url });
                              resolve(url);
                            }
                          );
                        }),
                        {
                          loading: "Uploading image...",
                          success: "Image uploaded successfully!",
                          error: "Failed to upload image",
                        }
                      );
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
                {subCategoryFormData.imageUrl && (
                  <div className="mt-2">
                    <img src={subCategoryFormData.imageUrl} alt="Category" className="w-16 h-16 object-contain bg-gray-100 rounded-md p-1" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-[#EF4444] text-white px-8 py-2 rounded-md font-bold hover:bg-red-600 transition-all"
              >
                Add Sub Category
              </button>
              <button
                type="button"
                onClick={() => setIsAddingSubCategory(false)}
                className="bg-gray-200 text-gray-700 px-8 py-2 rounded-md font-bold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {(isAddingMenu || editingMenu) && (
        <form
          onSubmit={handleSaveMenu}
          className="p-6 bg-gray-50 border-b border-gray-100 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Parent Category Name
              </label>
              <input
                type="text"
                required
                value={menuFormData.name}
                onChange={(e) =>
                  setMenuFormData({
                    ...menuFormData,
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Slug
              </label>
              <input
                type="text"
                required
                value={menuFormData.slug}
                onChange={(e) =>
                  setMenuFormData({ ...menuFormData, slug: e.target.value })
                }
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Display Order
              </label>
              <input
                type="number"
                required
                value={menuFormData.order}
                onChange={(e) =>
                  setMenuFormData({
                    ...menuFormData,
                    order: parseInt(e.target.value),
                  })
                }
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Category Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const storageRef = ref(storage, `menus/${Date.now()}_${file.name}`);
                    const uploadTask = uploadBytesResumable(storageRef, file);
                    toast.promise(
                      new Promise((resolve, reject) => {
                        uploadTask.on(
                          "state_changed",
                          null,
                          (error) => reject(error),
                          async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            setMenuFormData({ ...menuFormData, imageUrl: url });
                            resolve(url);
                          }
                        );
                      }),
                      {
                        loading: "Uploading image...",
                        success: "Image uploaded successfully!",
                        error: "Failed to upload image",
                      }
                    );
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {menuFormData.imageUrl && (
                <div className="mt-2">
                  <img src={menuFormData.imageUrl} alt="Category" className="w-16 h-16 object-contain bg-gray-100 rounded-md p-1" />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase">
                Sub Categories
              </h3>
              <button
                type="button"
                onClick={() =>
                  setMenuFormData({
                    ...menuFormData,
                    subCategories: [
                      ...menuFormData.subCategories,
                      {
                        id: Math.random().toString(36).substr(2, 9),
                        name: "",
                        slug: "",
                      },
                    ],
                  })
                }
                className="text-[#EF4444] text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Add Sub Category
              </button>
            </div>
            <div className="space-y-3">
              {menuFormData.subCategories.map((sub: any, idx: number) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-4 bg-white p-3 rounded-md border border-gray-200"
                >
                  <div className="flex-grow grid grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Sub Category Name"
                      value={sub.name}
                      onChange={(e) => {
                        const newSubs = [...menuFormData.subCategories];
                        newSubs[idx].name = e.target.value;
                        newSubs[idx].slug = e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-");
                        setMenuFormData({
                          ...menuFormData,
                          subCategories: newSubs,
                        });
                      }}
                      className="text-sm border-gray-200 rounded-md"
                    />
                    <input
                      type="text"
                      placeholder="Slug"
                      value={sub.slug}
                      onChange={(e) => {
                        const newSubs = [...menuFormData.subCategories];
                        newSubs[idx].slug = e.target.value;
                        setMenuFormData({
                          ...menuFormData,
                          subCategories: newSubs,
                        });
                      }}
                      className="text-sm border-gray-200 rounded-md"
                    />
                    <input
                      type="text"
                      placeholder="Brands (comma separated)"
                      value={sub.brands ? sub.brands.join(', ') : (sub.brandsString || '')}
                      onChange={(e) => {
                        const newSubs = [...menuFormData.subCategories];
                        newSubs[idx].brandsString = e.target.value;
                        newSubs[idx].brands = e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean);
                        setMenuFormData({
                          ...menuFormData,
                          subCategories: newSubs,
                        });
                      }}
                      className="text-sm border-gray-200 rounded-md"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const storageRef = ref(storage, `subcategories/${Date.now()}_${file.name}`);
                            const uploadTask = uploadBytesResumable(storageRef, file);
                            toast.promise(
                              new Promise((resolve, reject) => {
                                uploadTask.on(
                                  "state_changed",
                                  null,
                                  (error) => reject(error),
                                  async () => {
                                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                                    const newSubs = [...menuFormData.subCategories];
                                    newSubs[idx].imageUrl = url;
                                    setMenuFormData({
                                      ...menuFormData,
                                      subCategories: newSubs,
                                    });
                                    resolve(url);
                                  }
                                );
                              }),
                              {
                                loading: "Uploading...",
                                success: "Uploaded!",
                                error: "Failed to upload",
                              }
                            );
                          }
                        }}
                        className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                      {sub.imageUrl && (
                        <img src={sub.imageUrl} alt="SubCategory" className="w-8 h-8 object-contain bg-gray-50 rounded" />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newSubs = menuFormData.subCategories.filter(
                        (_, i) => i !== idx,
                      );
                      setMenuFormData({
                        ...menuFormData,
                        subCategories: newSubs,
                      });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-[#EF4444] text-white px-8 py-2 rounded-md font-bold hover:bg-red-600 transition-all"
            >
              {editingMenu ? "Update Menu" : "Save Menu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingMenu(false);
                setEditingMenu(null);
              }}
              className="bg-gray-200 text-gray-700 px-8 py-2 rounded-md font-bold hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="p-6 space-y-4">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-[#EF4444] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-md text-gray-500 font-bold text-xs">
                  #{menu.order}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{menu.name}</h3>
                  <p className="text-xs text-gray-400">/{menu.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingMenu(menu);
                    setMenuFormData({ ...menu });
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteMenu(menu.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            {menu.subCategories && menu.subCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {menu.subCategories.map((sub) => (
                  <span
                    key={sub.id}
                    className="bg-gray-50 text-gray-600 px-3 py-1 rounded-full text-xs border border-gray-100 flex items-center gap-1"
                  >
                    {sub.name} <ChevronRight size={10} />
                    
                      {sub.brands && sub.brands.length > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[9px] font-bold ml-1">
                          {sub.brands.length} Brands
                        </span>
                      )}
                      {sub.subCategories && sub.subCategories.length > 0 && (
                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md text-[9px] font-bold ml-1">
                          {sub.subCategories.length} Subs
                        </span>
                      )}

                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {menus.length === 0 && (
          <div className="text-center py-12 text-gray-400 italic">
            No menus created yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default MenusTab;
