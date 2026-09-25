import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "../config";

function chave(): Buffer {
  const hex = config.instagram.tokenEncryptionKey;
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error("INSTAGRAM_TOKEN_ENCRYPTION_KEY deve conter 32 bytes em hexadecimal");
  }
  return Buffer.from(hex, "hex");
}

export function cifrarToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chave(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    token_ciphertext: ciphertext.toString("base64url"),
    token_iv: iv.toString("base64url"),
    token_tag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decifrarToken(dados: { token_ciphertext: string; token_iv: string; token_tag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", chave(), Buffer.from(dados.token_iv, "base64url"));
  decipher.setAuthTag(Buffer.from(dados.token_tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dados.token_ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
