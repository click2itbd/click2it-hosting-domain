import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
dotenv.config({ path: '.env' });
import { getAdminDb } from '../backend/src/firebase/admin.js';

async function seedDatabase() {
  console.log('🚀 Starting Click2IT Firestore database seed...');
  const db = getAdminDb();
  if (!db) {
    console.error('❌ Failed to initialize Firebase Admin / Firestore connection.');
    process.exit(1);
  }

  // 1. Seed Site Settings (settings/site)
  console.log('\n📦 [1/5] Seeding settings/site & settings/hostingApiConfig...');
  const siteSettingsRef = db.collection('settings').doc('site');
  const siteSettingsSnap = await siteSettingsRef.get();
  if (!siteSettingsSnap.exists) {
    await siteSettingsRef.set({
      brandName: 'CLICK2IT BD',
      brandShortName: 'CLICK2IT',
      primaryDomain: 'click2it.bd',
      hostingDomain: 'click2it.bd',
      website: 'https://click2it.bd',
      nameserver1: 'ns1.click2itbd.com',
      nameserver2: 'ns2.click2itbd.com',
      nameserver3: 'ns3.click2itbd.com',
      nameserver4: 'ns4.click2itbd.com',
      cpanelUrl: 'https://cpanel.click2it.bd:2083',
      webmailUrl: 'https://webmail.click2it.bd:2096',
      clientAreaUrl: '/account/services',
      primaryColor: '#4F46E5',
      secondaryColor: '#112233',
      accentColor: '#8B5CF6',
      contactEmail: 'info@click2it.bd',
      contactPhone: '+880 1800 000000',
      address: 'Dhaka, Bangladesh',
      footerText: '© 2026 CLICK2IT BD. All rights reserved.',
      popupEnabled: false,
      apiSettings: {
        domainApiType: 'manual',
        domainApiKey: '',
        cloudLinuxApiType: 'manual',
        cloudLinuxApiKey: '',
        vpsApiType: 'manual',
        vpsApiKey: '',
        usdToBdtRate: 120,
        hostingMarkupPercent: 35,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('  ✅ Created default settings/site');
  } else {
    console.log('  ℹ️ settings/site already exists, skipping overwrite.');
  }

  const hostingApiRef = db.collection('settings').doc('hostingApiConfig');
  const hostingApiSnap = await hostingApiRef.get();
  if (!hostingApiSnap.exists) {
    await hostingApiRef.set({
      bundleDiscountPercent: 10,
      serverHostname: 'cpanel.click2it.bd',
      nameservers: ['ns1.click2itbd.com', 'ns2.click2itbd.com'],
      updatedAt: new Date().toISOString(),
    });
    console.log('  ✅ Created default settings/hostingApiConfig');
  } else {
    console.log('  ℹ️ settings/hostingApiConfig already exists.');
  }

  // 2. Seed Hosting Plans (hostingPlans)
  console.log('\n📦 [2/5] Seeding hostingPlans collection...');
  const canonicalSharedPlans = [
    {
      id: 'plan_student',
      name: 'Student',
      slug: 'student',
      category: 'shared',
      order: 0,
      pricing: { monthly: 75, annually: 720 },
      priceOverride: true,
      overridePrice: 75,
      overrideAnnualPrice: 720,
      features: [
        '2 GB NVMe SSD Storage',
        '50 GB Bandwidth',
        '0 Addon Domain (1 Website)',
        '3 Subdomains',
        '2 Email Accounts',
        '2 MySQL Databases',
        'Free SSL Certificate',
        'LiteSpeed Web Server',
        'cPanel Control Panel',
        'Softaculous 1-Click'
      ],
      comparisonValues: {
        disk_space: '2 GB NVMe SSD',
        bandwidth: '50 GB',
        addon_domains: '0',
        subdomains: '3',
        emails: '2',
        databases: '2',
        free_ssl: true,
        litespeed: true,
        daily_backup: false,
        cpanel: true,
        softaculous: true
      }
    },
    {
      id: 'plan_starter',
      name: 'Starter',
      slug: 'starter',
      category: 'shared',
      order: 1,
      pricing: { monthly: 150, annually: 1440 },
      priceOverride: true,
      overridePrice: 150,
      overrideAnnualPrice: 1440,
      features: [
        '5 GB NVMe SSD Storage',
        '100 GB Bandwidth',
        '0 Addon Domain (1 Website)',
        'Unlimited Subdomains',
        '5 Email Accounts',
        '5 MySQL Databases',
        'Free SSL Certificate',
        'LiteSpeed Web Server',
        'cPanel Control Panel',
        'Softaculous 1-Click'
      ],
      comparisonValues: {
        disk_space: '5 GB NVMe SSD',
        bandwidth: '100 GB',
        addon_domains: '0',
        subdomains: 'Unlimited',
        emails: '5',
        databases: '5',
        free_ssl: true,
        litespeed: true,
        daily_backup: false,
        cpanel: true,
        softaculous: true
      }
    },
    {
      id: 'plan_standard',
      name: 'Standard',
      slug: 'standard',
      category: 'shared',
      popular: true,
      order: 2,
      pricing: { monthly: 350, annually: 3360 },
      priceOverride: true,
      overridePrice: 350,
      overrideAnnualPrice: 3360,
      features: [
        '10 GB NVMe SSD Storage',
        'Unlimited Bandwidth',
        '3 Addon Domains',
        'Unlimited Subdomains',
        '20 Email Accounts',
        '20 MySQL Databases',
        'Free SSL Certificate',
        'LiteSpeed Web Server',
        'Daily Backup Included',
        'cPanel Control Panel',
        'Softaculous 1-Click'
      ],
      comparisonValues: {
        disk_space: '10 GB NVMe SSD',
        bandwidth: 'Unlimited',
        addon_domains: '3',
        subdomains: 'Unlimited',
        emails: '20',
        databases: '20',
        free_ssl: true,
        litespeed: true,
        daily_backup: true,
        cpanel: true,
        softaculous: true
      }
    },
    {
      id: 'plan_professional',
      name: 'Professional',
      slug: 'professional',
      category: 'shared',
      order: 3,
      pricing: { monthly: 650, annually: 6240 },
      priceOverride: true,
      overridePrice: 650,
      overrideAnnualPrice: 6240,
      features: [
        '20 GB NVMe SSD Storage',
        'Unlimited Bandwidth',
        '10 Addon Domains',
        'Unlimited Subdomains',
        'Unlimited Email Accounts',
        'Unlimited MySQL Databases',
        'Free SSL Certificate',
        'LiteSpeed Web Server',
        'Daily Backup Included',
        'cPanel Control Panel',
        'Softaculous 1-Click'
      ],
      comparisonValues: {
        disk_space: '20 GB NVMe SSD',
        bandwidth: 'Unlimited',
        addon_domains: '10',
        subdomains: 'Unlimited',
        emails: 'Unlimited',
        databases: 'Unlimited',
        free_ssl: true,
        litespeed: true,
        daily_backup: true,
        cpanel: true,
        softaculous: true
      }
    },
    {
      id: 'plan_premium',
      name: 'Premium',
      slug: 'premium',
      category: 'shared',
      order: 4,
      pricing: { monthly: 1200, annually: 11520 },
      priceOverride: true,
      overridePrice: 1200,
      overrideAnnualPrice: 11520,
      features: [
        '50 GB NVMe SSD Storage',
        'Unlimited Bandwidth',
        'Unlimited Addon Domains',
        'Unlimited Subdomains',
        'Unlimited Email Accounts',
        'Unlimited MySQL Databases',
        'Free SSL Certificate',
        'LiteSpeed Web Server',
        'Daily Backup Included',
        'cPanel Control Panel',
        'Softaculous 1-Click'
      ],
      comparisonValues: {
        disk_space: '50 GB NVMe SSD',
        bandwidth: 'Unlimited',
        addon_domains: 'Unlimited',
        subdomains: 'Unlimited',
        emails: 'Unlimited',
        databases: 'Unlimited',
        free_ssl: true,
        litespeed: true,
        daily_backup: true,
        cpanel: true,
        softaculous: true
      }
    }
  ];

  const canonicalWpPlans = [
    {
      id: 'cl_shared_starter',
      name: 'Starter Cloud',
      slug: 'starter-cloud',
      category: 'wordpress',
      badge: 'Beginner Friendly',
      description: 'Perfect for personal blogs, portfolio sites, and small student projects.',
      pricing: { monthly: 100, annually: 1000 },
      space: '5 GB NVMe SSD',
      cpu: '1 vCPU Core',
      ram: '1 GB RAM',
      websites: '1 Hosted Domain',
      bandwidth: 'Unlimited Bandwidth',
      features: [
        '5 GB NVMe SSD Storage',
        '1 Hosted Domain',
        '1 vCPU & 1 GB RAM',
        'LiteSpeed Web Server',
        'CloudLinux OS & CageFS',
        'Free SSL Certificate',
        'Unlimited Bandwidth',
        'cPanel Control Panel',
        'Weekly Backups',
        '24/7 Standard Support'
      ]
    },
    {
      id: 'cl_shared_standard',
      name: 'Standard Cloud',
      slug: 'standard-cloud',
      category: 'wordpress',
      badge: 'Most Popular',
      popular: true,
      description: 'Designed for growing websites, small businesses, and professional blogs.',
      pricing: { monthly: 200, annually: 2000 },
      space: '15 GB NVMe SSD',
      cpu: '1.5 vCPU Cores',
      ram: '2 GB RAM',
      websites: '5 Hosted Domains',
      bandwidth: 'Unlimited Bandwidth',
      features: [
        '15 GB NVMe SSD Storage',
        '5 Hosted Domains',
        '1.5 vCPU & 2 GB RAM',
        'LiteSpeed Web Server',
        'CloudLinux OS & CageFS',
        'Free SSL Certificate',
        'Unlimited Bandwidth',
        'cPanel Control Panel',
        'Daily Backups',
        '24/7 Priority Support'
      ]
    },
    {
      id: 'cl_shared_advanced',
      name: 'Advanced Cloud',
      slug: 'advanced-cloud',
      category: 'wordpress',
      badge: 'Business Class',
      description: 'Optimized for high-traffic websites, agencies, and medium businesses.',
      pricing: { monthly: 350, annually: 3500 },
      space: '30 GB NVMe SSD',
      cpu: '2 vCPU Cores',
      ram: '3 GB RAM',
      websites: 'Unlimited Hosted Domains',
      bandwidth: 'Unlimited Bandwidth',
      features: [
        '30 GB NVMe SSD Storage',
        'Unlimited Hosted Domains',
        '2 vCPU & 3 GB RAM',
        'LiteSpeed + Redis Cache',
        'CloudLinux OS & CageFS',
        'Free SSL Certificate',
        'Unlimited Bandwidth',
        'cPanel Control Panel',
        'Daily Automated Backups',
        '24/7 VIP Support'
      ]
    },
    {
      id: 'cl_shared_turbo',
      name: 'Turbo Cloud',
      slug: 'turbo-cloud',
      category: 'wordpress',
      badge: 'Enterprise Performance',
      description: 'Maximum power for large news portals, e-commerce shops, and heavy traffic.',
      pricing: { monthly: 600, annually: 6000 },
      space: '60 GB NVMe SSD',
      cpu: '3 vCPU Cores',
      ram: '4 GB RAM',
      websites: 'Unlimited Hosted Domains',
      bandwidth: 'Unmetered 1Gbps Port',
      features: [
        '60 GB NVMe SSD Storage',
        'Unlimited Hosted Domains',
        '3 vCPU & 4 GB RAM',
        'Extreme LiteSpeed Performance',
        'CloudLinux LVE Isolation',
        'Free SSL + Dedicated IP Option',
        'Unmetered Bandwidth',
        'cPanel Control Panel',
        'Hourly & Daily Backups',
        'Dedicated Account Manager'
      ]
    }
  ];

  const canonicalVpsPlans = [
    {
      id: 'vps_starter',
      name: 'Cloud VPS 1',
      slug: 'cloud-vps-1',
      category: 'vps',
      cores: '2 vCPU Cores',
      ram: '4 GB DDR4 RAM',
      storage: '60 GB NVMe SSD',
      bandwidth: '2 TB Premium Bandwidth',
      ipv4: '1 Dedicated IPv4',
      pricing: { monthly: 1800, annually: 19440 },
      monthlyPrice: 1800,
      popular: false,
      badge: 'Standard Starter',
      features: [
        'Pure NVMe Storage in RAID 10',
        '1 Dedicated Public IPv4',
        '1Gbps Network Port',
        'KVM Hardware Virtualization',
        'Automated Weekly Backups',
        '24/7 Server Monitoring'
      ]
    },
    {
      id: 'vps_standard',
      name: 'Cloud VPS 2',
      slug: 'cloud-vps-2',
      category: 'vps',
      cores: '4 vCPU Cores',
      ram: '8 GB DDR4 RAM',
      storage: '120 GB NVMe SSD',
      bandwidth: '5 TB Premium Bandwidth',
      ipv4: '1 Dedicated IPv4',
      pricing: { monthly: 3500, annually: 37800 },
      monthlyPrice: 3500,
      popular: true,
      badge: 'Most Popular',
      features: [
        'Pure NVMe Storage in RAID 10',
        '1 Dedicated Public IPv4',
        '1Gbps Network Port',
        'KVM Hardware Virtualization',
        'Automated Daily Snapshots',
        'Free OS Reinstall Anytime',
        '24/7 Priority Ticket Support'
      ]
    },
    {
      id: 'vps_pro',
      name: 'Cloud VPS 3',
      slug: 'cloud-vps-3',
      category: 'vps',
      cores: '8 vCPU Cores',
      ram: '16 GB DDR4 RAM',
      storage: '240 GB NVMe SSD',
      bandwidth: '10 TB Premium Bandwidth',
      ipv4: '2 Dedicated IPv4',
      pricing: { monthly: 6800, annually: 73440 },
      monthlyPrice: 6800,
      popular: false,
      badge: 'Heavy Production',
      features: [
        'Pure NVMe Storage in RAID 10',
        '2 Dedicated Public IPv4 Included',
        '10Gbps Network Port',
        'KVM Hardware Virtualization',
        'Automated Daily Snapshots',
        'DDoS Protection up to 500Gbps',
        'Direct DevOps Phone Support'
      ]
    },
    {
      id: 'vps_ultra',
      name: 'Cloud VPS Pro',
      slug: 'cloud-vps-pro',
      category: 'vps',
      cores: '16 vCPU Cores',
      ram: '32 GB DDR4 RAM',
      storage: '480 GB Enterprise NVMe',
      bandwidth: '15 TB Unmetered',
      ipv4: '2 Dedicated IPv4',
      pricing: { monthly: 12500, annually: 135000 },
      monthlyPrice: 12500,
      popular: false,
      badge: 'Ultimate Enterprise',
      features: [
        'Enterprise NVMe Storage in RAID 10',
        '2 Dedicated Public IPv4 Included',
        '10Gbps Network Port',
        'KVM Hardware Virtualization',
        'Custom Reverse DNS (rDNS)',
        'Automated Daily Snapshots',
        'DDoS Shield Protection'
      ]
    }
  ];

  const allPlansToSeed = [...canonicalSharedPlans, ...canonicalWpPlans, ...canonicalVpsPlans];
  for (const plan of allPlansToSeed) {
    const planRef = db.collection('hostingPlans').doc(plan.id);
    await planRef.set({
      ...plan,
      isActive: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✅ Seeded plan: ${plan.id} (${plan.name})`);
  }

  // 3. Seed Hosting Services (hostingServices)
  console.log('\n📦 [3/5] Seeding hostingServices collection...');
  const canonicalServices = [
    {
      id: 'service_cloud',
      title: 'Cloud Hosting',
      description: 'Scale effortlessly with our cloud hosting solutions. Enjoy high availability, automatic backups, and seamless resource scaling.',
      iconPath: 'Cloud',
      startingPrice: 100,
      billingCycle: '/mo',
      currency: 'BDT',
      order: 1,
      isActive: true,
      link: '/hosting',
    },
    {
      id: 'service_dedicated',
      title: 'Dedicated Hosting',
      description: 'Get a server all to yourself. Maximum performance, full root access, and complete control over your environment.',
      iconPath: 'HardDrive',
      startingPrice: 8500,
      billingCycle: '/mo',
      currency: 'BDT',
      order: 2,
      isActive: true,
      link: '/vps',
    },
    {
      id: 'service_shared',
      title: 'Shared Hosting',
      description: 'Perfect for beginners. Affordable and easy-to-manage hosting on a shared server with all the essential features.',
      iconPath: 'Share2',
      startingPrice: 75,
      billingCycle: '/mo',
      currency: 'BDT',
      order: 3,
      isActive: true,
      link: '/pricing',
    },
    {
      id: 'service_reseller',
      title: 'Reseller Hosting',
      description: 'Start your own hosting business. Resell hosting under your own brand with our powerful reseller packages.',
      iconPath: 'Server',
      startingPrice: 1500,
      billingCycle: '/mo',
      currency: 'BDT',
      order: 4,
      isActive: true,
      link: '/pricing',
    },
    {
      id: 'service_vps',
      title: 'VPS Hosting',
      description: 'The power of a dedicated server at an affordable price. Full root access, guaranteed resources, and high performance.',
      iconPath: 'Cpu',
      startingPrice: 1800,
      billingCycle: '/mo',
      currency: 'BDT',
      order: 5,
      isActive: true,
      link: '/vps',
    },
    {
      id: 'service_domain',
      title: 'Domain Registration',
      description: 'Find and register the perfect domain name for your business. Search across hundreds of TLDs at competitive prices.',
      iconPath: 'Globe',
      startingPrice: 350,
      billingCycle: '/yr',
      currency: 'BDT',
      order: 6,
      isActive: true,
      link: '/domain',
    },
  ];

  for (const s of canonicalServices) {
    const sRef = db.collection('hostingServices').doc(s.id);
    await sRef.set({
      ...s,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✅ Seeded service: ${s.id} (${s.title})`);
  }

  // 4. Seed Domain Pricing (domainPricing)
  console.log('\n📦 [4/5] Seeding domainPricing collection...');
  const domainPricingList = [
    { tld: '.com', registerPrice: 1450, renewPrice: 1450, transferPrice: 1450, currency: 'BDT', isActive: true },
    { tld: '.net', registerPrice: 1650, renewPrice: 1650, transferPrice: 1650, currency: 'BDT', isActive: true },
    { tld: '.org', registerPrice: 1550, renewPrice: 1550, transferPrice: 1550, currency: 'BDT', isActive: true },
    { tld: '.xyz', registerPrice: 350, renewPrice: 1250, transferPrice: 1250, currency: 'BDT', isActive: true },
    { tld: '.bd', registerPrice: 1800, renewPrice: 1800, transferPrice: 1800, currency: 'BDT', isActive: true },
    { tld: '.info', registerPrice: 1250, renewPrice: 1850, transferPrice: 1850, currency: 'BDT', isActive: true },
    { tld: '.biz', registerPrice: 1350, renewPrice: 1750, transferPrice: 1750, currency: 'BDT', isActive: true },
    { tld: '.store', registerPrice: 450, renewPrice: 3200, transferPrice: 3200, currency: 'BDT', isActive: true },
    { tld: '.co', registerPrice: 2200, renewPrice: 2800, transferPrice: 2800, currency: 'BDT', isActive: true },
    { tld: '.io', registerPrice: 4800, renewPrice: 4800, transferPrice: 4800, currency: 'BDT', isActive: true },
    { tld: '.dev', registerPrice: 1950, renewPrice: 1950, transferPrice: 1950, currency: 'BDT', isActive: true },
    { tld: '.online', registerPrice: 450, renewPrice: 2600, transferPrice: 2600, currency: 'BDT', isActive: true },
    { tld: '.site', registerPrice: 450, renewPrice: 2500, transferPrice: 2500, currency: 'BDT', isActive: true },
    { tld: '.tech', registerPrice: 650, renewPrice: 3200, transferPrice: 3200, currency: 'BDT', isActive: true },
    { tld: '.app', registerPrice: 1950, renewPrice: 1950, transferPrice: 1950, currency: 'BDT', isActive: true },
    { tld: '.ai', registerPrice: 8500, renewPrice: 8500, transferPrice: 8500, currency: 'BDT', isActive: true },
    { tld: '.shop', registerPrice: 550, renewPrice: 3400, transferPrice: 3400, currency: 'BDT', isActive: true },
    { tld: '.me', registerPrice: 1450, renewPrice: 2200, transferPrice: 2200, currency: 'BDT', isActive: true },
    { tld: '.pro', registerPrice: 1200, renewPrice: 1800, transferPrice: 1800, currency: 'BDT', isActive: true },
    { tld: '.live', registerPrice: 650, renewPrice: 2800, transferPrice: 2800, currency: 'BDT', isActive: true },
    { tld: '.cloud', registerPrice: 1350, renewPrice: 2400, transferPrice: 2400, currency: 'BDT', isActive: true },
    { tld: '.digital', registerPrice: 950, renewPrice: 2700, transferPrice: 2700, currency: 'BDT', isActive: true },
    { tld: '.space', registerPrice: 450, renewPrice: 2500, transferPrice: 2500, currency: 'BDT', isActive: true },
    { tld: '.agency', registerPrice: 1850, renewPrice: 2900, transferPrice: 2900, currency: 'BDT', isActive: true },
    { tld: '.link', registerPrice: 750, renewPrice: 1850, transferPrice: 1850, currency: 'BDT', isActive: true },
  ];

  for (const item of domainPricingList) {
    const docId = item.tld.replace('.', '');
    const docRef = db.collection('domainPricing').doc(docId);
    await docRef.set({
      ...item,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`  ✅ Seeded domain pricing: ${item.tld} (৳${item.registerPrice})`);
  }

  // 5. Seed Email Templates default docs if empty
  console.log('\n📦 [5/5] Checking emailTemplates collection...');
  const emailTemplatesSnap = await db.collection('emailTemplates').limit(1).get();
  if (emailTemplatesSnap.empty) {
    const templatesToSeed = [
      {
        id: 'order_completed',
        subject: 'Order Completed: {{order_id}} - Click2IT',
        heading: 'Your Order is Complete!',
        bodyHtml: '<p>Thank you for choosing Click2IT BD. Your service is now ready and configured.</p>',
        footerNote: 'Thank you for choosing Click2IT BD.',
        isActive: true,
      },
      {
        id: 'cpanel_welcome',
        subject: 'Hosting Account Details for {{domain}}',
        heading: 'Welcome to Click2IT Hosting!',
        bodyHtml: '<p>Your cPanel account for {{domain}} is now active.</p>',
        footerNote: 'Keep your login details safe.',
        isActive: true,
      },
      {
        id: 'domain_activated',
        subject: 'Domain Registered: {{domain}}',
        heading: 'Your Domain is Now Active!',
        bodyHtml: '<p>Your domain {{domain}} has been registered successfully.</p>',
        footerNote: 'Manage your nameservers in client area.',
        isActive: true,
      },
      {
        id: 'ticket_reply',
        subject: 'Support Ticket Update: {{ticket_id}} - {{ticket_subject}}',
        heading: 'New Response on Your Ticket',
        bodyHtml: '<p>Our support team has replied to your ticket:</p><div style="background: #f8fafc; padding: 12px; margin: 12px 0;">{{reply_message}}</div>',
        footerNote: 'Please do not reply directly to this email.',
        isActive: true,
      }
    ];

    for (const t of templatesToSeed) {
      await db.collection('emailTemplates').doc(t.id).set({
        ...t,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`  ✅ Seeded email template: ${t.id}`);
    }
  } else {
    console.log('  ℹ️ emailTemplates collection already has documents.');
  }

  console.log('\n🎉 ALL INITIAL DATA SEEDED SUCCESSFULLY INTO FIRESTORE!');
}

seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  });
