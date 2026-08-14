"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRIES, DEFAULT_COUNTRY_ISO2, type Country } from "@/lib/data/countries";
import { flagEmoji } from "@/lib/utils/phone";

// Campo de teléfono compartido: código de país + número local.
//
// El código de país es un input real y editable — se puede escribir a mano
// (ej. "+34") sin pasar por la lista, o se puede abrir la lista completa de
// países con bandera y elegir uno (que llena el código automáticamente).
// Ambos caminos llevan al mismo resultado: un valor E.164 completo
// ("+573001234567"), nunca solo el número local, porque de ahí es de donde
// Reportes va a derivar en qué país (y por lo tanto en qué zona horaria)
// está el negocio para saber cuándo es medianoche.
//
// Funciona tanto en un <form action={serverAction}> nativo (expone un
// input hidden con `name`) como controlado (via onChange), para poder
// reusarse después en Colaboradores/Perfil sin reescribir nada.
export function PhoneField({
  id = "phone",
  name = "phone",
  label = "Teléfono",
  required = false,
  defaultValue,
  onChange,
}: {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  defaultValue?: string;
  onChange?: (fullPhone: string) => void;
}) {
  const initial = useMemo(() => parseInitial(defaultValue), [defaultValue]);
  const [codeText, setCodeText] = useState(initial.dialCode);
  const [localNumber, setLocalNumber] = useState(initial.localNumber);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // País más parecido a lo que hay escrito — solo para la bandera y para
  // filtrar la lista. No bloquea dejar escrito un código que no exista en
  // el catálogo; el campo siempre acepta lo que se escriba a mano.
  const matchedCountry = useMemo(() => findBestMatch(codeText), [codeText]);
  const normalizedCode = useMemo(() => normalizeCode(codeText), [codeText]);
  const digits = localNumber.replace(/\D/g, "");
  const fullPhone = digits ? `${normalizedCode}${digits}` : "";

  useEffect(() => {
    onChange?.(fullPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullPhone]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => filterCountries(codeText), [codeText]);

  function handlePick(country: Country) {
    setCodeText(country.dialCode);
    setOpen(false);
  }

  function handleLocalNumberChange(value: string) {
    setLocalNumber(value.replace(/[^\d\s]/g, ""));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="block text-center text-white/60 text-xs tracking-wide">
        {label}
      </Label>

      <div className="flex gap-2">
        <div ref={containerRef} className="relative w-[110px] shrink-0">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 focus-within:ring-3 focus-within:ring-[#4CC2E8]/40">
            <span aria-hidden className="shrink-0 text-sm">
              {matchedCountry ? flagEmoji(matchedCountry.iso2) : "🌐"}
            </span>
            <input
              aria-label="Código de país"
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              onFocus={(e) => {
                setOpen(true);
                e.currentTarget.select();
              }}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              inputMode="tel"
              className="w-full min-w-0 bg-transparent text-sm text-white outline-none"
            />
          </div>

          {open && (
            <div className="absolute z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-white/10 bg-[#0f0f14] p-1 shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-white/40">Ningún país coincide</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.iso2}
                    type="button"
                    onClick={() => handlePick(c)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <span aria-hidden>{flagEmoji(c.iso2)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-white/40">{c.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          required={required}
          placeholder="Número"
          value={localNumber}
          onChange={(e) => handleLocalNumberChange(e.target.value)}
          className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 focus-visible:ring-[#4CC2E8]/40"
        />
      </div>

      <input type="hidden" name={name} value={fullPhone} />
      {/* País resuelto (ISO2) aparte del número completo — es lo que
          Reportes va a leer para saber la zona horaria del negocio, sin
          tener que volver a interpretar el prefijo del teléfono (algunos,
          como +1, los comparten varios países con husos distintos). Si lo
          escrito a mano no coincide con ningún país conocido, se manda
          vacío y el backend cae al valor por defecto de la columna. */}
      <input type="hidden" name={`${name}_country`} value={matchedCountry?.iso2 ?? ""} />
    </div>
  );
}

// Deja solo "+" al inicio (si había) y dígitos — para que lo que se
// escribió a mano sirva igual como prefijo E.164 aunque no exista en
// nuestro catálogo (ej. una extensión o código que agreguen en el futuro).
function normalizeCode(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

function findBestMatch(codeText: string): Country | undefined {
  const normalized = normalizeCode(codeText);
  if (!normalized) return undefined;
  return COUNTRIES.find((c) => c.dialCode === normalized);
}

function filterCountries(query: string): Country[] {
  const q = query.trim();
  if (!q || q === "+") return COUNTRIES;

  // Si lo escrito es solo "+" y dígitos, se busca por código de marcación;
  // si tiene letras, se busca por nombre (sin tildes).
  if (/^[+\d]+$/.test(q)) {
    return COUNTRIES.filter((c) => c.dialCode.startsWith(normalizeCode(q)));
  }
  const needle = stripAccents(q);
  return COUNTRIES.filter((c) => stripAccents(c.name).includes(needle));
}

function stripAccents(value: string): string {
  // Tras NFD, cada letra con tilde se descompone en letra base + marca de
  // acento aparte (rango Unicode ̀-ͯ) — se eliminan esas marcas
  // para que "Peru" encuentre "Perú".
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function parseInitial(value?: string): { dialCode: string; localNumber: string } {
  if (!value) {
    const fallback = COUNTRIES.find((c) => c.iso2 === DEFAULT_COUNTRY_ISO2)!;
    return { dialCode: fallback.dialCode, localNumber: "" };
  }

  // Coincide por el dial code más largo primero (ej. +1809 antes que +1)
  // para no cortarle dígitos al número local de países del Caribe que
  // comparten el prefijo +1.
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const match = sorted.find((c) => value.startsWith(c.dialCode));
  if (!match) {
    const fallback = COUNTRIES.find((c) => c.iso2 === DEFAULT_COUNTRY_ISO2)!;
    return { dialCode: fallback.dialCode, localNumber: value.replace(/\D/g, "") };
  }

  return { dialCode: match.dialCode, localNumber: value.slice(match.dialCode.length) };
}
