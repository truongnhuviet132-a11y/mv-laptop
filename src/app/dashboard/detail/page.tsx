import Link from "next/link";

export default async function DetailPage({ searchParams }: { searchParams: Promise<{ model?: string; supplier?: string }> }) {
  const q = await searchParams;
  const model = q.model || "Dell 5300";
  const supplier = q.supplier || "NCC B";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <h1 style={{ margin: 0 }}>{model} - {supplier}</h1>
        <div style={{ color: "#6b7280", marginTop: 4 }}>Chi tiết drill-down theo model + nhà cung cấp</div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
        <Card title="Lãi TB" value="2.35tr" />
        <Card title="RepairRate" value="66%" />
        <Card title="WarrantyRate" value="50%" />
      </section>

      <section style={box}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Danh sách máy</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr>{["Serial", "Nhập", "Sửa", "Bán", "Lãi", "Trạng thái"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {[
              ["A123", "6tr", "0", "9.5tr", "🟢3.5tr", "Sold"],
              ["A124", "6.5tr", "1tr", "9.5tr", "🟡2tr", "Sold"],
            ].map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}
          </tbody>
        </table>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={box}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Repair</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr>{["Ngày", "Loại", "Chi phí"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody><tr><td style={td}>10/3</td><td style={td}>Pin</td><td style={td}>300k</td></tr></tbody>
          </table>
        </div>
        <div style={box}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Warranty</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr>{["Ngày", "Lỗi", "Chi phí", "Ai chịu"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody><tr><td style={td}>15/3</td><td style={td}>Màn</td><td style={td}>500k</td><td style={td}>Shop</td></tr></tbody>
          </table>
        </div>
      </section>

      <Link href="/dashboard" style={{ color: "#2563eb", textDecoration: "none" }}>← Quay lại Dashboard</Link>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return <div style={box}><div style={{ color: "#6b7280", fontSize: 13 }}>{title}</div><div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div></div>;
}

const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" };
const td: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid #f3f4f6" };
