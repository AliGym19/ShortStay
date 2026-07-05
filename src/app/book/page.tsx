"use client";

import { useState } from "react";

// Fake public booking site (POC). Submitting shows a confirmation — the
// request lands in the ops review queue in a later iteration; no Xero
// interaction happens from this page.

const PROPS = [
  { id: "P1", name: "Dockside Loft", area: "Wapping, London", rate: 240, hue: "#2B55C4" },
  { id: "P2", name: "Gasholder Studio", area: "King's Cross, London", rate: 210, hue: "#3C6E63" },
  { id: "P3", name: "Tin Quarter Mews", area: "Digbeth, Birmingham", rate: 175, hue: "#9E4A34" },
];

export default function BookPage() {
  const [propertyId, setPropertyId] = useState("P1");
  const [checkIn, setCheckIn] = useState("");
  const [nights, setNights] = useState(2);
  const [guest, setGuest] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const prop = PROPS.find((p) => p.id === propertyId) ?? PROPS[0];
  const total = prop.rate * nights;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F9FC", color: "#16233D", fontFamily: "'Instrument Sans', system-ui, sans-serif", padding: "36px 18px 80px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Instrument+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 22 }}>
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 20, color: "#0B1F4B" }}>Meridian Stays</span>
          <span style={{ fontSize: 12, color: "#8A99B5" }}>short lets, done properly</span>
        </div>

        {done ? (
          <div style={{ background: "#fff", border: "1px solid #D9E2F0", borderRadius: 14, padding: 34, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 24, margin: "0 0 8px" }}>Request received</h1>
            <p style={{ color: "#5A6B85", fontSize: 14, lineHeight: 1.6 }}>
              Thanks {guest.split(" ")[0] || "there"} — {prop.name} for {nights} night{nights > 1 ? "s" : ""} ({checkIn || "dates TBC"}), £{total.toFixed(2)} total.
              The team reviews every request before confirming; you&apos;ll hear back at {email || "your email"} shortly.
            </p>
            <button onClick={() => setDone(false)} style={{ marginTop: 14, border: "1px solid #D9E2F0", background: "#fff", borderRadius: 20, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}>Make another request</button>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 28, margin: "0 0 4px", letterSpacing: "-.02em" }}>Book a stay</h1>
            <p style={{ color: "#5A6B85", fontSize: 14, margin: "0 0 20px" }}>Pick a place, tell us when — a real person confirms every booking.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
              {PROPS.map((p) => (
                <button key={p.id} onClick={() => setPropertyId(p.id)}
                  style={{ textAlign: "left", background: "#fff", border: propertyId === p.id ? `2px solid ${p.hue}` : "1px solid #D9E2F0", borderRadius: 12, padding: 0, overflow: "hidden", cursor: "pointer" }}>
                  <div style={{ height: 84, background: `linear-gradient(135deg, ${p.hue}26, ${p.hue}0d)`, display: "flex", alignItems: "flex-end", padding: 10 }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
                      <div style={{ width: 16, height: 34, background: p.hue, opacity: 0.8, borderRadius: 2 }} />
                      <div style={{ width: 20, height: 46, background: p.hue, borderRadius: 2 }} />
                      <div style={{ width: 13, height: 26, background: p.hue, opacity: 0.55, borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#8A99B5" }}>{p.area}</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}><b>£{p.rate}</b> <span style={{ color: "#8A99B5" }}>/ night</span></div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ background: "#fff", border: "1px solid #D9E2F0", borderRadius: 14, padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                <label style={{ fontSize: 12, color: "#5A6B85" }}>Check-in
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #D9E2F0", borderRadius: 9, padding: "9px 11px", fontSize: 13, fontFamily: "inherit" }} />
                </label>
                <label style={{ fontSize: 12, color: "#5A6B85" }}>Nights
                  <input type="number" min={1} max={28} value={nights} onChange={(e) => setNights(Math.max(1, Number(e.target.value) || 1))} style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #D9E2F0", borderRadius: 9, padding: "9px 11px", fontSize: 13, fontFamily: "inherit" }} />
                </label>
                <label style={{ fontSize: 12, color: "#5A6B85" }}>Your name
                  <input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Sam Carter" style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #D9E2F0", borderRadius: 9, padding: "9px 11px", fontSize: 13, fontFamily: "inherit" }} />
                </label>
                <label style={{ fontSize: 12, color: "#5A6B85" }}>Email
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sam@email.com" style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #D9E2F0", borderRadius: 9, padding: "9px 11px", fontSize: 13, fontFamily: "inherit" }} />
                </label>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontSize: 14 }}>{nights} night{nights > 1 ? "s" : ""} × £{prop.rate} = <b style={{ fontSize: 17 }}>£{total.toFixed(2)}</b></div>
                <button onClick={() => setDone(true)} disabled={!guest.trim()}
                  style={{ background: "#1B3F9C", color: "#fff", border: "none", borderRadius: 999, padding: "11px 26px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: guest.trim() ? 1 : 0.5 }}>
                  Request to book
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: "#8A99B5", marginTop: 12, marginBottom: 0 }}>
                No payment is taken now. Requests are reviewed by the agency; an invoice follows on confirmation.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
