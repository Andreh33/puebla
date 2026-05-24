import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { STORE_NAP } from "@/lib/seo/schema-org";
import type { ReceiptData } from "@/lib/pos/receipt-text";

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} EUR`;

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#0b1220", lineHeight: 1.4 },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b7280" },
  // Filas de dos columnas: la izquierda crece y ENVUELVE (flex:1, con padding a
  // la derecha); la derecha (importe) tiene ancho fijo y alineación derecha.
  // Así el nombre largo del producto nunca se solapa con el precio.
  itemRow: { flexDirection: "row", marginBottom: 5 },
  grow: { flex: 1, paddingRight: 10 },
  amount: { width: 90, textAlign: "right" },
  hr: { borderBottomWidth: 1, borderColor: "#e5e7eb", marginVertical: 8 },
  totalLabel: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 12 },
  totalAmount: { width: 90, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 12 },
  foot: { marginTop: 18, fontSize: 8, color: "#6b7280" },
});

export async function renderReceiptPdf(r: ReceiptData): Promise<Buffer> {
  const date = r.createdAt.toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const doc = (
    <Document>
      <Page size="A5" style={s.page}>
        <Text style={s.h1}>Zona Sport</Text>
        <Text style={s.muted}>
          {STORE_NAP.streetAddress}, {STORE_NAP.postalCode} {STORE_NAP.addressLocality}
        </Text>
        <Text style={s.muted}>Tel. {STORE_NAP.telephone}</Text>
        <View style={s.hr} />
        <View style={s.itemRow}>
          <Text style={s.grow}>Comprobante {r.ticketNumber}</Text>
          <Text style={[s.muted, { textAlign: "right" }]}>{date}</Text>
        </View>
        <View style={s.hr} />
        {r.items.map((it, i) => (
          <View key={i} style={s.itemRow}>
            <Text style={s.grow}>
              {it.quantity}x {it.productName}
              {it.variantSize ? ` (talla ${it.variantSize})` : ""}
              {it.productSku ? ` · ${it.productSku}` : ""}
            </Text>
            <Text style={s.amount}>{eur(it.subtotal)}</Text>
          </View>
        ))}
        <View style={s.hr} />
        <View style={s.itemRow}>
          <Text style={[s.muted, s.grow]}>Base</Text>
          <Text style={s.amount}>{eur(r.subtotal)}</Text>
        </View>
        <View style={s.itemRow}>
          <Text style={[s.muted, s.grow]}>IVA (21%)</Text>
          <Text style={s.amount}>{eur(r.tax)}</Text>
        </View>
        <View style={s.itemRow}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalAmount}>{eur(r.total)}</Text>
        </View>
        <Text style={s.foot}>
          Comprobante de venta — no es factura. Solicítala en tienda con tus datos fiscales.
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
