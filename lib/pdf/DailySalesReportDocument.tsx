// lib/pdf/DailySalesReportDocument.tsx
//
// Una sola plantilla para todos los negocios — lo único que cambia entre
// un negocio y otro son los datos que le llegan (logo, contacto, ventas),
// nunca el diseño. Personalizar el PDF (Reportes → Personalizar PDF) solo
// cambia esos datos, no el layout.
//
// Corre exclusivamente en el servidor (renderToBuffer, en reportPdf.ts) —
// este archivo no lleva "use client" ni se importa desde ningún componente
// de cliente.
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { DailySalesSummary } from "@/lib/services/reportService";

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 56, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  businessName: { fontSize: 16, fontWeight: 700 },
  contactLine: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  dateLine: { fontSize: 10, color: "#6b7280", marginBottom: 20 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 10 },
  summaryLabel: { fontSize: 8, textTransform: "uppercase", color: "#9ca3af", letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, fontWeight: 700, marginTop: 3 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    paddingBottom: 5,
    marginBottom: 4,
  },
  tableHeaderText: { fontSize: 9, textTransform: "uppercase", color: "#6b7280" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  colName: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colSubtotal: { flex: 1.3, textAlign: "right" },
  emptyState: { color: "#9ca3af", marginTop: 10, fontSize: 10 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")}`;
}

export function DailySalesReportDocument({ summary }: { summary: DailySalesSummary }) {
  return (
    <Document title={`Reporte de ventas — ${summary.business.name} — ${summary.dateLabel}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{summary.business.name}</Text>
            {summary.business.contactEmail && (
              <Text style={styles.contactLine}>{summary.business.contactEmail}</Text>
            )}
            {summary.business.contactPhone && (
              <Text style={styles.contactLine}>{summary.business.contactPhone}</Text>
            )}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- este Image es el de @react-pdf/renderer (PDF), no <img> de HTML; no tiene prop alt */}
          {summary.business.logoUrl && <Image src={summary.business.logoUrl} style={styles.logo} />}
        </View>

        <Text style={styles.title}>Reporte de ventas del día</Text>
        <Text style={styles.dateLine}>{summary.dateLabel}</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Pedidos</Text>
            <Text style={styles.summaryValue}>{summary.orderCount}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total vendido</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colName]}>Producto</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Cant.</Text>
          <Text style={[styles.tableHeaderText, styles.colSubtotal]}>Subtotal</Text>
        </View>

        {summary.items.length === 0 ? (
          <Text style={styles.emptyState}>No hubo ventas este día.</Text>
        ) : (
          summary.items.map((item) => (
            <View style={styles.tableRow} key={item.name}>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))
        )}

        <Text style={styles.footer} fixed>
          Generado por AVENTHRA · {summary.business.name}
        </Text>
      </Page>
    </Document>
  );
}
