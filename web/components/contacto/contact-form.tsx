import { T } from "@/components/language-switch";

export type ContactFields = { nombre: string; apellido: string; telefono: string };

type ContactFormProps = {
  id: string;
  values: ContactFields;
  error: string | null;
  disabled?: boolean;
  onChange: (field: keyof ContactFields, value: string) => void;
};

const inputClass =
  "mt-1 min-h-12 w-full rounded-sm border border-linea bg-cal px-3 text-base text-tinta outline-none transition-colors focus:border-malbec disabled:opacity-60";

export function ContactForm({ id, values, error, disabled = false, onChange }: ContactFormProps) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="mt-4 animate-aparecer border-l-2 border-exito bg-cal px-4 py-5 rounded-r-lg">
      <p className="etiqueta !text-exito"><T>Antes de tu primera oferta</T></p>
      <h3 id={`${id}-titulo`} className="mt-2 font-serif text-2xl leading-tight text-tinta">
        <T>¿Cómo te contactamos si ganás?</T>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-tinta-2">
        <T>El espacio usa estos datos solo para coordinar la entrega de la obra. No se publican. Se piden una sola vez por wallet.</T>
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-tinta">
          <T>Nombre</T>
          <input
            value={values.nombre}
            onChange={(event) => onChange("nombre", event.target.value)}
            type="text"
            name="given-name"
            autoComplete="given-name"
            minLength={2}
            maxLength={60}
            required
            disabled={disabled}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium text-tinta">
          <T>Apellido</T>
          <input
            value={values.apellido}
            onChange={(event) => onChange("apellido", event.target.value)}
            type="text"
            name="family-name"
            autoComplete="family-name"
            minLength={2}
            maxLength={60}
            required
            disabled={disabled}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium text-tinta sm:col-span-2">
          <T>Teléfono (con código de área)</T>
          <input
            value={values.telefono}
            onChange={(event) => onChange("telefono", event.target.value)}
            type="tel"
            name="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+54 9 261 123-4567"
            maxLength={32}
            required
            disabled={disabled}
            className={inputClass}
          />
        </label>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-tinta-2">
        <T>Al guardar, tu wallet firma para confirmar que es tuya. Esa firma no mueve fondos.</T>
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-sm border border-malbec/25 bg-malbec/10 px-3 py-2 text-sm text-malbec">
          <T>{error}</T>
        </p>
      )}
    </section>
  );
}
