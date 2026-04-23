export default function LoginPage() {
  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <form style={{ width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Đăng nhập</h1>
        <label style={{ display: "grid", gap: 6 }}>
          Username
          <input style={input} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Password
          <input type="password" style={input} />
        </label>
        <button style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}>Đăng nhập</button>
      </form>
    </div>
  );
}

const input: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 10px" };
