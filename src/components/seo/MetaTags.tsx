import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogImageAlt?: string;
  noIndex?: boolean;
  jsonLd?: object;
}

const MetaTags: React.FC<MetaTagsProps> = ({
  title = 'Noir Playground - ZK Proof Development Environment',
  description = 'Interactive browser-based environment for developing zero-knowledge proofs with Noir. Features Monaco editor, real-time compilation, and proof generation.',
  keywords = ['noir', 'zero-knowledge', 'zk-proofs', 'cryptography', 'blockchain', 'privacy', 'circuit development'],
  canonicalUrl = 'https://noir-playground.app/',
  ogImage = 'https://noir-playground.app/noir-playground-og.png',
  ogImageAlt = 'Noir Playground - Zero-Knowledge Proof Development',
  noIndex = false,
  jsonLd
}) => {
  const keywordsString = keywords.join(', ');
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywordsString} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      
      {/* OpenGraph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:site_name" content="Noir Playground" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />
      
      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default MetaTags;