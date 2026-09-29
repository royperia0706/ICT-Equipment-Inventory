import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = { window: 1 };

export const ISSUER = "ICT Inventory";

export function generateSecret() {
  return authenticator.generateSecret();
}

export function checkCode(code, secret) {
  return authenticator.check(String(code || "").replace(/\s/g, ""), secret);
}

export async function qrForSecret(email, secret) {
  const otpauth = authenticator.keyuri(email, ISSUER, secret);
  return QRCode.toDataURL(otpauth, {
    margin: 1,
    width: 240,
    color: { dark: "#1c2b24", light: "#ffffff" },
  });
}
