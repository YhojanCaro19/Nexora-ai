# Negocio — AVENTHRA

## Qué es
Plataforma SaaS multi-tenant que se vende a empresas para que gestionen sus procesos comerciales (clientes, productos, pedidos, agentes de IA) desde un solo panel.

## Quién la usa
- **Aventhra (nosotros)** — superadmin, opera la plataforma, aprueba negocios nuevos, cobra suscripción.
- **Negocios clientes** — cada uno tiene un admin (dueño) que puede invitar colaboradores (empleados) con acceso limitado a ciertos módulos.

## Por qué importa la seguridad multi-tenant aquí
El producto se vende a varias empresas dentro del mismo sistema. Una filtración de datos entre negocios (el colaborador de una empresa viendo datos de otra) no es un bug menor — es el tipo de incidente que compromete la confianza de todos los clientes, no solo del afectado. Por eso el aislamiento por `business_id` reforzado con RLS es no-negociable, no una mejora futura.

## Flujo comercial actual
1. Un negocio interesado llena el formulario público de contacto.
2. El superadmin revisa la solicitud y, si aprueba, se crea la cuenta admin con credenciales temporales.
3. El admin invita colaboradores según necesite, asignándoles acceso solo a los módulos que les correspondan.