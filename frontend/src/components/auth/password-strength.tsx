import { getPasswordStrength } from "@/lib/password-strength";

export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const strengthValue = { weak: 1, medium: 2, strong: 3 }[strength];
  const colors = {
    weak: "bg-red-500",
    medium: "bg-amber-400",
    strong: "bg-emerald-500",
  };
  const messages = {
    weak: "Weak — use at least 8 characters and a mix of character types.",
    medium: "Medium strength — this password is acceptable.",
    strong: "Strong password.",
  };

  return (
    <div className="mt-1.5" aria-live="polite">
      <div
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={strengthValue}
        aria-valuetext={strength}
        className="flex gap-1"
      >
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1 flex-1 rounded-full ${
              segment <= strengthValue ? colors[strength] : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{messages[strength]}</p>
    </div>
  );
}
