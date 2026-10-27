import { AIRPORTS } from '@/fixtures/catalogue';
import { fieldClass } from './ui';

const spain = AIRPORTS.filter((a) => a.country === 'ES');
const world = AIRPORTS.filter((a) => a.country !== 'ES').sort((a, b) =>
  a.city.localeCompare(b.city),
);

export function AirportSelect({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass}
      >
        <option value="">{placeholder}</option>
        <optgroup label="Spain">
          {spain.map((a) => (
            <option key={a.iata} value={a.iata}>
              {a.city} ({a.iata})
            </option>
          ))}
        </optgroup>
        <optgroup label="International">
          {world.map((a) => (
            <option key={a.iata} value={a.iata}>
              {a.city} ({a.iata})
            </option>
          ))}
        </optgroup>
      </select>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
