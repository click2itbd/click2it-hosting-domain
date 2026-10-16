import React, { createContext, useContext, useState, ReactNode } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, setDoc, limit } from 'firebase/firestore';
import { AdminSharedState, AdminRefreshFunctions, AdminTab } from './types';
import type { DocumentData } from 'firebase/firestore';

const mapDocuments = <T,>(documents: { id: string; data: () => DocumentData }[]): T[] =>
  documents.map(document => ({ id: document.id, ...document.data() } as T));

interface AdminDataContextType extends AdminSharedState, AdminRefreshFunctions {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

const initialSharedState: AdminSharedState = {
  products: [],
  orders: [],
  customers: [],
  vendors: [],
  transactions: [],
  transactionCategories: [],
  menus: [],
  conveyances: [],
  users: [],
  campaigns: [],
  discountCodes: [],
  hostingPlans: [],
  hostingServices: [],
  employees: [],
  employeeLeaves: [],
  employeeSalaries: [],
  paymentAccounts: [],
  soldSerials: [],
  serviceRecords: [],
  loading: false,
};

export const AdminDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sharedState, setSharedState] = useState<AdminSharedState>(initialSharedState);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const refreshAll = async () => {
    setSharedState(prev => ({ ...prev, loading: true }));
    try {
      const [productsSnap, ordersSnap, customersSnap, vendorsSnap, transactionsSnap, menusSnap, usersSnap, campaignsSnap, discountCodesSnap, hostingPlansSnap, hostingServicesSnap, soldSerialsSnap, serviceRecordsSnap, paymentAccountsSnap, transactionCategoriesSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'customers'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'vendors'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'menus'), orderBy('order', 'asc'), limit(100))),
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(query(collection(db, 'couponCodes'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(query(collection(db, 'hostingPlans'), orderBy('order', 'asc'), limit(100))),
        getDocs(query(collection(db, 'hostingServices'), orderBy('order', 'asc'), limit(100))),
        getDocs(query(collection(db, 'sold_serials'), orderBy('soldAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'service_records'), orderBy('receivedAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'payment_accounts'), orderBy('createdAt', 'desc'), limit(100))),
        getDocs(query(collection(db, 'transaction_categories'), orderBy('createdAt', 'desc'), limit(100))),
      ]);

      try {
        const [employeesSnap, employeeLeavesSnap, employeeSalariesSnap] = await Promise.all([
          getDocs(query(collection(db, 'employees'), orderBy('createdAt', 'desc'), limit(500))),
          getDocs(query(collection(db, 'employee_leaves'), orderBy('createdAt', 'desc'), limit(500))),
          getDocs(query(collection(db, 'employee_salaries'), orderBy('createdAt', 'desc'), limit(500))),
        ]);

        setSharedState(prev => ({
          ...prev,
          products: mapDocuments<AdminSharedState['products'][number]>(productsSnap.docs),
          orders: mapDocuments<AdminSharedState['orders'][number]>(ordersSnap.docs),
          customers: mapDocuments<AdminSharedState['customers'][number]>(customersSnap.docs),
          vendors: mapDocuments<AdminSharedState['vendors'][number]>(vendorsSnap.docs),
          transactions: mapDocuments<AdminSharedState['transactions'][number]>(transactionsSnap.docs),
          menus: mapDocuments<AdminSharedState['menus'][number]>(menusSnap.docs),
          users: usersSnap.docs.map(d => ({ ...d.data(), uid: d.id }) as AdminSharedState['users'][number]),
          campaigns: mapDocuments<AdminSharedState['campaigns'][number]>(campaignsSnap.docs),
          discountCodes: mapDocuments<AdminSharedState['discountCodes'][number]>(discountCodesSnap.docs),
          hostingPlans: mapDocuments<AdminSharedState['hostingPlans'][number]>(hostingPlansSnap.docs),
          hostingServices: mapDocuments<AdminSharedState['hostingServices'][number]>(hostingServicesSnap.docs),
          soldSerials: mapDocuments<AdminSharedState['soldSerials'][number]>(soldSerialsSnap.docs),
          serviceRecords: mapDocuments<AdminSharedState['serviceRecords'][number]>(serviceRecordsSnap.docs),
          paymentAccounts: mapDocuments<AdminSharedState['paymentAccounts'][number]>(paymentAccountsSnap.docs),
          transactionCategories: mapDocuments<AdminSharedState['transactionCategories'][number]>(transactionCategoriesSnap.docs),
          employees: mapDocuments<AdminSharedState['employees'][number]>(employeesSnap.docs),
          employeeLeaves: mapDocuments<AdminSharedState['employeeLeaves'][number]>(employeeLeavesSnap.docs),
          employeeSalaries: mapDocuments<AdminSharedState['employeeSalaries'][number]>(employeeSalariesSnap.docs),
          conveyances: prev.conveyances,
          loading: false,
        }));
      } catch (e) {
        setSharedState(prev => ({
          ...prev,
          products: mapDocuments<AdminSharedState['products'][number]>(productsSnap.docs),
          orders: mapDocuments<AdminSharedState['orders'][number]>(ordersSnap.docs),
          customers: mapDocuments<AdminSharedState['customers'][number]>(customersSnap.docs),
          vendors: mapDocuments<AdminSharedState['vendors'][number]>(vendorsSnap.docs),
          transactions: mapDocuments<AdminSharedState['transactions'][number]>(transactionsSnap.docs),
          menus: mapDocuments<AdminSharedState['menus'][number]>(menusSnap.docs),
          users: usersSnap.docs.map(d => ({ ...d.data(), uid: d.id }) as AdminSharedState['users'][number]),
          campaigns: mapDocuments<AdminSharedState['campaigns'][number]>(campaignsSnap.docs),
          discountCodes: mapDocuments<AdminSharedState['discountCodes'][number]>(discountCodesSnap.docs),
          hostingPlans: mapDocuments<AdminSharedState['hostingPlans'][number]>(hostingPlansSnap.docs),
          hostingServices: mapDocuments<AdminSharedState['hostingServices'][number]>(hostingServicesSnap.docs),
          soldSerials: mapDocuments<AdminSharedState['soldSerials'][number]>(soldSerialsSnap.docs),
          serviceRecords: mapDocuments<AdminSharedState['serviceRecords'][number]>(serviceRecordsSnap.docs),
          paymentAccounts: mapDocuments<AdminSharedState['paymentAccounts'][number]>(paymentAccountsSnap.docs),
          transactionCategories: mapDocuments<AdminSharedState['transactionCategories'][number]>(transactionCategoriesSnap.docs),
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Error refreshing all data:', error);
      setSharedState(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshProducts = async () => { /* TODO: implement */ };
  const refreshOrders = async () => { /* TODO: implement */ };
  const refreshCustomers = async () => { /* TODO: implement */ };
  const refreshVendors = async () => { /* TODO: implement */ };
  const refreshTransactions = async () => { /* TODO: implement */ };
  const refreshTransactionCategories = async () => { /* TODO: implement */ };
  const refreshMenus = async () => { /* TODO: implement */ };
  const refreshConveyances = async () => { /* TODO: implement */ };
  const refreshUsers = async () => { /* TODO: implement */ };
  const refreshCampaigns = async () => { /* TODO: implement */ };
  const refreshDiscountCodes = async () => { /* TODO: implement */ };
  const refreshHostingPlans = async () => { /* TODO: implement */ };
  const refreshHostingServices = async () => { /* TODO: implement */ };
  const refreshEmployees = async () => { /* TODO: implement */ };
  const refreshEmployeeLeaves = async () => { /* TODO: implement */ };
  const refreshEmployeeSalaries = async () => { /* TODO: implement */ };
  const refreshPaymentAccounts = async () => { /* TODO: implement */ };
  const refreshSoldSerials = async () => { /* TODO: implement */ };
  const refreshServiceRecords = async () => { /* TODO: implement */ };

  return (
    <AdminDataContext.Provider
      value={{
        ...sharedState,
        activeTab,
        setActiveTab,
        refreshProducts,
        refreshOrders,
        refreshCustomers,
        refreshVendors,
        refreshTransactions,
        refreshTransactionCategories,
        refreshMenus,
        refreshConveyances,
        refreshUsers,
        refreshCampaigns,
        refreshDiscountCodes,
        refreshHostingPlans,
        refreshHostingServices,
        refreshEmployees,
        refreshEmployeeLeaves,
        refreshEmployeeSalaries,
        refreshPaymentAccounts,
        refreshSoldSerials,
        refreshServiceRecords,
        refreshAll,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
};

export const useAdminData = () => {
  const context = useContext(AdminDataContext);
  if (!context) throw new Error('useAdminData must be used within an AdminDataProvider');
  return context;
};
