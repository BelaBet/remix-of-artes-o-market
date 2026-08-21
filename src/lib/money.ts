/**
 * Conversão de dinheiro. Módulo puro de propósito: vive separado de
 * products.ts para não arrastar o cliente Supabase, o que impedia testar
 * estas funções isoladamente.
 *
 * Regra do projeto: dinheiro trafega e é gravado sempre em centavos inteiros.
 * Float só aparece na formatação para exibição.
 */

export function reaisToCents(input: string): number {
  const raw = input.replace(/[^\d,.-]/g, "");
  if (!raw) return 0;

  // No Brasil o ponto é separador de milhar ("1.290,90"), mas muita gente digita
  // "129.90" querendo dizer R$ 129,90 — sem tratar isso, o preço sairia 100x
  // maior. Se não há vírgula e o ponto separa 1 ou 2 dígitos no fim, ele é
  // decimal; caso contrário, é milhar.
  const pontoDecimal = !raw.includes(",") && /^-?\d+\.\d{1,2}$/.test(raw);
  const cleaned = pontoDecimal ? raw : raw.replace(/\./g, "").replace(",", ".");

  if (!cleaned) return 0;
  const [intPart, decPart = ""] = cleaned.split(".");
  const cents = (decPart + "00").slice(0, 2);
  const negativo = intPart.startsWith("-");
  const valor = Math.abs(Number(intPart || "0")) * 100 + Number(cents);
  return negativo ? -valor : valor;
}

export function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
