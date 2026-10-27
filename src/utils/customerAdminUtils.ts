import { doc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';
import { apiClient } from '../services/apiClient';

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  sendWelcomeEmail?: boolean;
}

export function generateCustomerPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const syms = '@#$%&*!';
  const all = upper + lower + nums + syms;

  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += nums[Math.floor(Math.random() * nums.length)];
  pwd += syms[Math.floor(Math.random() * syms.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}

export async function createCustomerAccountByAdmin(input: CreateCustomerInput): Promise<any> {
  const cleanEmail = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim() || 'Customer';
  const rawPassword = input.password.trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid customer email address.');
  }
  if (!rawPassword || rawPassword.length < 6) {
    throw new Error('Customer password must be at least 6 characters long.');
  }

  let formattedPhone = input.phone.trim();
  const digits = formattedPhone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('01')) {
    formattedPhone = `+880${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith('1')) {
    formattedPhone = `+880${digits}`;
  } else if (digits.length >= 7) {
    formattedPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${digits}`;
  } else {
    formattedPhone = formattedPhone || '+8801700000000';
  }

  // 1. Try Backend Admin Endpoint first
  try {
    const res = await apiClient.post('/api/customers/admin/create', {
      firstName,
      lastName,
      name: fullName,
      email: cleanEmail,
      password: rawPassword,
      phone: formattedPhone,
      company: input.company?.trim() || '',
      address1: input.address1.trim(),
      address2: input.address2?.trim() || '',
      city: input.city.trim() || 'Dhaka',
      state: input.state.trim() || input.city.trim() || 'Dhaka',
      zip: input.postcode.trim() || '1000',
      postcode: input.postcode.trim() || '1000',
      country: input.country.trim() || 'Bangladesh',
      sendWelcomeEmail: input.sendWelcomeEmail ?? true,
    });

    if (res.data?.success && res.data.customer) {
      return res.data.customer;
    }
  } catch (apiErr: any) {
    const backendError = apiErr?.response?.data?.error || apiErr?.message;
    if (backendError) {
      const lower = String(backendError).toLowerCase();
      if (lower.includes('already exists') || lower.includes('email-already-in-use') || lower.includes('email_exists')) {
        throw new Error('A customer account with this email address already exists.');
      }
      if (lower.includes('valid customer email') || lower.includes('password must be')) {
        throw new Error(backendError);
      }
    }
    console.warn('Backend /api/customers/admin/create returned error, checking direct fallback:', apiErr?.message);
  }

  // 2. Direct Firebase Identity Toolkit REST + Firestore Fallback (never logs out current admin!)
  const apiKey = firebaseConfig.apiKey;
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      password: rawPassword,
      returnSecureToken: true,
    }),
  });

  const signUpJson: any = await signUpRes.json();
  if (!signUpRes.ok || signUpJson?.error) {
    const errCode = signUpJson?.error?.message || '';
    if (errCode.includes('EMAIL_EXISTS')) {
      throw new Error('A customer account with this email address already exists.');
    }
    throw new Error(`Could not create customer account: ${errCode || 'Unknown error'}`);
  }

  const uid = signUpJson.localId;

  // Set displayName in Firebase Auth
  if (signUpJson.idToken) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: signUpJson.idToken,
        displayName: fullName,
        returnSecureToken: false,
      }),
    }).catch(() => null);
  }

  const now = new Date().toISOString();
  const numericId =
    (Math.abs(uid.split('').reduce((a: number, b: string) => (a << 5) - a + b.charCodeAt(0), 0)) % 90000000) +
    10000000;
  const pin = String(Math.floor(1000 + Math.random() * 9000));

  // Strictly match firestore.rules isValidUser constraints
  const firestoreUserDoc = {
    uid,
    id: uid,
    customerId: String(numericId),
    email: cleanEmail,
    name: fullName.slice(0, 100),
    displayName: fullName.slice(0, 100),
    firstName: firstName.slice(0, 50),
    lastName: lastName.slice(0, 50),
    phone: formattedPhone,
    mobile: formattedPhone,
    company: (input.company || '').trim().slice(0, 100),
    address: input.address1.trim().slice(0, 300),
    address1: input.address1.trim().slice(0, 200),
    address2: (input.address2 || '').trim().slice(0, 100),
    city: (input.city || 'Dhaka').trim().slice(0, 100),
    state: (input.state || input.city || 'Dhaka').trim().slice(0, 100),
    zip: (input.postcode || '1000').trim().slice(0, 20),
    postcode: (input.postcode || '1000').trim().slice(0, 20),
    country: (input.country || 'Bangladesh').trim().slice(0, 60),
    role: 'user',
    permissions: [],
    isAdmin: false,
    status: 'active',
    pin,
    balance: 0,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'users', uid), firestoreUserDoc, { merge: true });

  let emailStatus = 'skipped';
  let emailError: string | undefined = undefined;

  if (input.sendWelcomeEmail !== false) {
    try {
      const emailRes = await apiClient.post(`/api/customers/admin/${uid}/send-welcome-email`, {
        password: rawPassword,
      });
      if (emailRes.data?.success) {
        emailStatus = 'sent';
      }
    } catch (e: any) {
      emailStatus = 'failed';
      emailError = e?.message || 'Email delivery failed';
    }
  }

  return {
    ...firestoreUserDoc,
    domainsCount: 0,
    hostingCount: 0,
    ordersCount: 0,
    totalSpent: 0,
    emailStatus,
    emailError,
  };
}
