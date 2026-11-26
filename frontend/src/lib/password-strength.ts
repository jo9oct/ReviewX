export type PasswordStrength = "weak" | "medium" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";

  const characterTypes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (characterTypes >= 3 && password.length >= 12) return "strong";
  if (characterTypes >= 2) return "medium";
  return "weak";
}
