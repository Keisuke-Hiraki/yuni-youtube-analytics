import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://yuni-stellar-chart.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
  ]
}
