import React from 'react';
import { DynamicPolicyPage } from '../../components/DynamicPolicyPage';

const WarrantyPolicy = () => {
  return <DynamicPolicyPage pageId="warranty-policy" defaultTitle="Warranty Policy" defaultContent={`Please update this page content from the Admin Dashboard.`} />;
};

export default WarrantyPolicy;
