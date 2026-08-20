import { z } from "zod";

export const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

export function isValidCPF(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

const VALID_DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function isValidMobile(raw: string): boolean {
  const d = onlyDigits(raw);
  return d.length === 11 && VALID_DDD.has(Number(d.slice(0, 2))) && d[2] === "9";
}

export const maskCPF = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const maskPhone = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");

export const maskCEP = (v: string) =>
  onlyDigits(v)
    .slice(0, 8)
    .replace(/^(\d{5})(\d{1,3})$/, "$1-$2");

export const maskCardNumber = (v: string) =>
  onlyDigits(v)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();

export const maskExpiry = (v: string) =>
  onlyDigits(v)
    .slice(0, 4)
    .replace(/^(\d{2})(\d{1,2})$/, "$1/$2");

export function cardBrand(number: string): string | null {
  const d = onlyDigits(number);
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^(38|60|6504|6505|6516|6550)/.test(d)) return "Elo";
  if (/^(606282|3841)/.test(d)) return "Hipercard";
  return null;
}

export const buyerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(5, "Informe nome e sobrenome")
    .max(120, "Nome muito longo")
    .refine((v) => v.split(/\s+/).filter((w) => w.length >= 2).length >= 2, "Informe nome e sobrenome"),
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
  document: z.string().refine(isValidCPF, "CPF inválido"),
  phone: z.string().refine(isValidMobile, "Celular inválido — use (DDD) 9XXXX-XXXX"),
  zip: z.string().refine((v) => onlyDigits(v).length === 8, "CEP inválido"),
  street: z.string().trim().min(3, "Informe a rua").max(160, "Rua muito longa"),
  number: z.string().trim().min(1, "Informe o número").max(20, "Número inválido"),
  complement: z.string().trim().max(80, "Complemento muito longo").optional().or(z.literal("")),
  district: z.string().trim().min(2, "Informe o bairro").max(80, "Bairro muito longo"),
  city: z.string().trim().min(2, "Informe a cidade").max(80, "Cidade muito longa"),
  state: z.string().trim().length(2, "UF deve ter 2 letras"),
});

export type BuyerForm = z.infer<typeof buyerSchema>;

export const cardSchema = z.object({
  number: z.string().refine((v) => onlyDigits(v).length >= 13 && onlyDigits(v).length <= 19, "Número de cartão inválido"),
  holder: z.string().trim().min(3, "Informe o nome impresso no cartão").max(80, "Nome muito longo"),
  exp: z.string().refine((v) => {
    const d = onlyDigits(v);
    if (d.length !== 4) return false;
    const mm = Number(d.slice(0, 2));
    const yy = 2000 + Number(d.slice(2));
    if (mm < 1 || mm > 12) return false;
    const end = new Date(yy, mm, 1).getTime();
    return end > Date.now();
  }, "Validade inválida"),
  cvv: z.string().refine((v) => /^\d{3,4}$/.test(onlyDigits(v)), "CVV inválido"),
});

export type CardForm = z.infer<typeof cardSchema>;

export async function lookupCep(cep: string) {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.erro) return null;
  return {
    street: data.logradouro as string,
    district: data.bairro as string,
    city: data.localidade as string,
    state: data.uf as string,
  };
}
