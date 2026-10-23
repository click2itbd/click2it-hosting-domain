import React from 'react';
import { SEOTags, SEOTagsProps } from './SEOTags';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  schema?: Record<string, any> | Array<Record<string, any>>;
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  keywords, 
  image,
  canonical,
  type = 'website',
  schema,
  noindex = false
}) => {
  return (
    <SEOTags
      title={title}
      description={description}
      keywords={keywords}
      image={image}
      canonicalUrl={canonical}
      type={type}
      structuredData={schema}
      noindex={noindex}
    />
  );
};

export { SEOTags } from './SEOTags';
export default SEO;
