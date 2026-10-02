/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        // port: "",
        // pathname: "***",
        // search: "",
      },
      {
        protocol: 'http',
        hostname: '*',
        // port: "",
        // pathname: "***",
        // search: "",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
