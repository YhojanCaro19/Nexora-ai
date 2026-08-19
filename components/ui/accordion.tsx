"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Wrapper de @base-ui/react/accordion (ya es dependencia del proyecto —
// components/ui/select.tsx, checkbox.tsx, button.tsx e input.tsx ya se
// apoyan en @base-ui/react) siguiendo el mismo patrón de esos primitivos:
// clases Tailwind semánticas (bg-card, border-border, text-muted-foreground)
// que el puente `@theme inline` en app/globals.css traduce a los tokens
// Nexora — nada de hex sueltos acá.
//
// Patrón de fila colapsada tipo "casilla de red social": el título vive en
// AccordionTrigger, el contenido real (formularios, confirmaciones) vive en
// AccordionPanel y solo se monta visible cuando el usuario toca la fila.

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(
        "divide-y divide-border overflow-hidden rounded-xl border border-border",
        className
      )}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("bg-card", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  icon,
  ...props
}: AccordionPrimitive.Trigger.Props & { icon?: React.ReactNode }) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-50 [&[data-panel-open]_svg]:rotate-180",
          className
        )}
        {...props}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {icon}
          <span className="min-w-0 flex-1 text-balance">{children}</span>
        </span>
        <ChevronDownIcon
          size={16}
          strokeWidth={1.75}
          className="shrink-0 text-muted-foreground transition-transform duration-200"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionPanel({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel data-slot="accordion-panel" className="nexora-accordion-panel" {...props}>
      <div className={cn("px-4 pt-1 pb-6", className)}>{children}</div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel }
