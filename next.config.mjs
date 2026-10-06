/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["otplib", "qrcode", "firebase-admin", "xlsx"],
};

export default nextConfig;
