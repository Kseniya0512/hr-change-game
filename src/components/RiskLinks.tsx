import type { Risk } from "../../shared/model.ts";

export function RiskLinks({
  risks,
  value = [],
  onChange,
  disabled = false,
}: {
  risks: Risk[];
  value?: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <details className="risk-links">
      <summary>Связать с рисками · {value.length}</summary>
      <p className="fine">
        Необязательно: отметьте, какую ситуацию учитывает этот ответ.
      </p>
      <fieldset disabled={disabled}>
        <legend>Связанные риски</legend>
        {risks.map((risk) => (
          <label key={risk.id}>
            <input
              type="checkbox"
              checked={value.includes(risk.id)}
              onChange={(event) => onChange(event.target.checked
                ? [...new Set([...value, risk.id])]
                : value.filter((id) => id !== risk.id))}
            />
            <span>{risk.title}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}
