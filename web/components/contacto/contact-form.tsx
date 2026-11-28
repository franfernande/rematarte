import { T } from "@/components/language-switch";
type ContactFormProps = {
  id: string;
  nombre: string;
  telefono: string;
  error: string | null;
  disabled?: boolean;
  onNombreChange: (value: string) => void;
  onTelefonoChange: (value: string) => void;
};

export function ContactForm({ id, nombre, telefono, error, disabled = false, onNombreChange, onTelefonoChange }: ContactFormProps) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="mt-4 animate-aparecer border-l-2 border-exito bg-cal px-4 py-5">
      <p className="etiqueta !text-exito"><T>Contacto para la entrega</T></p>
      <h3 id={`${id}-titulo`} className="mt-2 font-serif text-2xl leading-tight text-tinta">
        <T>¿A quién avisamos si ganás?</T>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-tinta-2">
        <T>Si ganás, el espacio te escribe a este número para coordinar la entrega de la obra. No se publica en ningún lado.</T>
      </p>
      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium text-tinta">
          <T>Nombre y apellido</T>
          <input
            value={nombre}
            onChange={(event) => onNombreChange(event.target.value)}
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            disabled={disabled}
            className="mt-1 min-h-12 w-full rounded-sm border border-linea bg-cal px-3 text-base text-tinta outline-none transition-colors focus:border-malbec disabled:opacity-60"
          />
        </label>
        <label className="text-sm font-medium text-tinta">
          <T>Teléfono</T>
          <input
            value={telefono}
            onChange={(event) => onTelefonoChange(event.target.value)}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+54 9 261 123-4567"
            required
            disabled={disabled}
            className="mt-1 min-h-12 w-full rounded-sm border border-linea bg-cal px-3 text-base text-tinta outline-none transition-colors focus:border-malbec disabled:opacity-60"
          />
        </label>
      </div>
      <T>{error && (
        <p role="alert" className="mt-3 rounded-sm border border-malbec/25 bg-malbec/10 px-3 py-2 text-sm text-malbec">
          <T>{error}</T>
        </p>
      )}</T>
    </section>
  );
}
