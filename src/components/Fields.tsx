import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { stages } from "../../shared/model.ts";
export function Field({
  label,
  value,
  onChange,
  disabled = false,
  multiline = false,
  placeholder = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={4000}
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={type === "password" ? 300 : 240}
        />
      )}
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Выберите</option>
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
export function StageSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <Select
      label="Этап"
      value={value}
      onChange={onChange}
      options={stages}
      disabled={disabled}
    />
  );
}
export function Choice({
  items,
  value,
  onChange,
  disabled = false,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="choices">
      {items.map((item) => (
        <button
          type="button"
          className={`choice ${value === item ? "selected" : ""}`}
          key={item}
          aria-pressed={value === item}
          onClick={() => onChange(item)}
          disabled={disabled}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function AddButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="button soft small"
      disabled={disabled}
      onClick={onClick}
    >
      <Plus size={16} />
      {children}
    </button>
  );
}
export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="icon-button remove"
      onClick={onClick}
      title="Удалить карточку"
      aria-label="Удалить карточку"
    >
      <Trash2 size={16} />
    </button>
  );
}
