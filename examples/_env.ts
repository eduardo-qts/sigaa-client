/** Lê uma variável de ambiente obrigatória (nunca coloque credenciais no código). */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Defina a variável de ambiente ${name}.`);
    process.exit(1);
  }
  return value;
}
