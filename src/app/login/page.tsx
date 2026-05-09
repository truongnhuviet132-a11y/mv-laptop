"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("1234");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Đăng nhập thất bại.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") || "/settings";
    router.push(next);
    router.refresh();
  };

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <form onSubmit={onSubmit} style={{ width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Đăng nhập</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Mặc định lần đầu: <b>admin</b> / <b>1234</b></p>
        <label style={{ display: "grid", gap: 6 }}>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" style={input} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" style={input} />
        </label>
        {msg ? <div style={{ color: "#b91c1c", fontWeight: 700 }}>{msg}</div> : null}
        <button disabled={loading} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 12px", cursor: "pointer", fontWeight: 800 }}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
    </div>
  );
}

const input: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 10px" };
