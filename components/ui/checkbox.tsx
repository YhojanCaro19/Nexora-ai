"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Marcado en verde (emerald-500) en vez del cian de --primary —
        // pedido explícito: "en cualquier lugar donde deba activar una
        // checkbox, que se coloque en verde". Mismo tono que ya usa el
        // proyecto para estados de éxito (ej. el mensaje de confirmación
        // en /contacto), no un color inventado nuevo. Este es el
        // Checkbox COMPARTIDO — el cambio aplica en toda la app (Tareas,
        // formulario de colaboradores, plantillas de agente, etc.), tal
        // como se pidió.
        "peer size-4 shrink-0 rounded-[4px] border border-input bg-transparent outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-emerald-500 data-[checked]:bg-emerald-500 data-[checked]:text-white aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
