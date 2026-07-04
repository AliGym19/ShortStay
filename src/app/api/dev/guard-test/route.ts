import { NextResponse } from "next/server";
import {
  assertPermittedXeroRequest,
  NeverMovesMoneyViolation,
} from "@/lib/xero";

// Proves the never-moves-money guard against every boundary case by
// calling the guard function directly — zero network traffic, works while
// disconnected.
interface Case {
  name: string;
  expect: "pass" | "throw";
  run: () => void;
}

const CASES: Case[] = [
  {
    name: "draft ACCPAY POST passes",
    expect: "pass",
    run: () =>
      assertPermittedXeroRequest(
        "POST",
        "Invoices",
        JSON.stringify({ Type: "ACCPAY", Status: "DRAFT", Contact: {} })
      ),
  },
  {
    name: "POST /Payments throws",
    expect: "throw",
    run: () =>
      assertPermittedXeroRequest("POST", "Payments", JSON.stringify({})),
  },
  {
    name: "POST /Invoices Type ACCREC throws",
    expect: "throw",
    run: () =>
      assertPermittedXeroRequest(
        "POST",
        "Invoices",
        JSON.stringify({ Type: "ACCREC", Status: "DRAFT" })
      ),
  },
  {
    name: "POST /Invoices Status AUTHORISED throws",
    expect: "throw",
    run: () =>
      assertPermittedXeroRequest(
        "POST",
        "Invoices",
        JSON.stringify({ Type: "ACCPAY", Status: "AUTHORISED" })
      ),
  },
  {
    name: "GET /Payments throws (reads are whitelisted too)",
    expect: "throw",
    run: () => assertPermittedXeroRequest("GET", "Payments", undefined),
  },
  {
    name: "GET /Invoices/{id} passes (read-back after draft)",
    expect: "pass",
    run: () =>
      assertPermittedXeroRequest("GET", "Invoices/abc-123", undefined),
  },
  {
    name: "GET /Reports/ProfitAndLoss passes",
    expect: "pass",
    run: () =>
      assertPermittedXeroRequest(
        "GET",
        "Reports/ProfitAndLoss?periods=11&timeframe=MONTH",
        undefined
      ),
  },
  {
    name: "GET /Reports/BalanceSheet throws (P&L is the only report)",
    expect: "throw",
    run: () =>
      assertPermittedXeroRequest("GET", "Reports/BalanceSheet", undefined),
  },
  {
    name: "PUT /Invoices throws (no updates, ever)",
    expect: "throw",
    run: () =>
      assertPermittedXeroRequest(
        "PUT",
        "Invoices",
        JSON.stringify({ Type: "ACCPAY", Status: "DRAFT" })
      ),
  },
];

export async function GET() {
  const results = CASES.map((c) => {
    try {
      c.run();
      return {
        name: c.name,
        pass: c.expect === "pass",
        outcome: "no throw",
      };
    } catch (err) {
      const guardThrew = err instanceof NeverMovesMoneyViolation;
      return {
        name: c.name,
        pass: c.expect === "throw" && guardThrew,
        outcome: err instanceof Error ? err.message : String(err),
      };
    }
  });
  const allPass = results.every((r) => r.pass);
  return NextResponse.json({ allPass, results }, { status: allPass ? 200 : 500 });
}
