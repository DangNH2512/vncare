import type { MetadataRoute } from 'next';

/**
 * The operations console has no public content: every route sits behind the
 * staff login gate, so there is nothing here a crawler should ever index. No
 * `sitemap` field either — this app never generates one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
