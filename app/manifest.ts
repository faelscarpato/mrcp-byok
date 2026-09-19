import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MRCP Web Terminal',
    short_name: 'MRCP',
    description: 'Chat-CLI for the MRCP Engine',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/icons/mrcp-icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/mrcp-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
