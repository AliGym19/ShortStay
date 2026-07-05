"use server";

import { draftCodedBill } from "@/lib/draft-bill";
import type { RecordType } from "@/lib/types";

const TYPES: RecordType[] = ["invoice", "repair", "toiletries", "cleaning", "booking"];
// These record types draft a real ACCPAY bill in Xero; the rest are
// agency-local only (no money/accounting-side event to represent).
const BILLABLE_TYPES: RecordType[] = ["invoice", "repair"];
// Account by record type (UK demo chart): repairs → 473, general → 429.
const TYPE_ACCOUNT: Partial<Record<RecordType, "473" | "429">> = {
  repair: "473",
  invoice: "429",
};

export interface AddedRecord {
	id: string;
	type: RecordType;
	landlord: string;
	property: string;
	supplier: string;
	amount: number;
	date: string;
	reference: string;
	/** Set if this record drafted a real Xero bill. */
	xeroInvoiceId?: string;
	/** Set if a Xero draft was attempted but skipped/failed — surfaced, not swallowed. */
	xeroNote?: string;
}

export type AddState =
	| { status: "idle" }
	| { status: "error"; errors: Record<string, string> }
	| { status: "success"; record: AddedRecord };

export async function addRecord(_prev: AddState, form: FormData): Promise<AddState> {
	const type = String(form.get("type") ?? "") as RecordType;
	const landlord = String(form.get("landlord") ?? "").trim();
	const property = String(form.get("property") ?? "").trim();
	const supplier = String(form.get("supplier") ?? "").trim();
	const amountRaw = String(form.get("amount") ?? "").trim();
	const date = String(form.get("date") ?? "").trim();
	const reference = String(form.get("reference") ?? "").trim();

	const errors: Record<string, string> = {};
	if (!TYPES.includes(type)) errors.type = "Choose a record type.";
	if (!landlord) errors.landlord = "Select a landlord.";
	if (!property) errors.property = "Add the property.";
	const amount = Number(amountRaw);
	if (type !== "booking" && (!amountRaw || Number.isNaN(amount) || amount <= 0))
		errors.amount = "Enter an amount over £0.";

	if (Object.keys(errors).length > 0) {
		return { status: "error", errors };
	}

	const record: AddedRecord = {
		id: `rec_${Math.random().toString(36).slice(2, 8)}`,
		type,
		landlord,
		property,
		supplier,
		amount: type === "booking" ? 0 : amount,
		date: date || new Date().toISOString().slice(0, 10),
		reference,
	};

	// The shared write path (lib/draft-bill.ts) owns contact resolution,
	// account validation, the DRAFT read-back assertion, and the audit chain.
	if (BILLABLE_TYPES.includes(type)) {
		try {
			const result = await draftCodedBill({
				coded: {
					supplier: supplier || landlord,
					date: record.date,
					grossInclVat: record.amount,
					vatRate: 0.2,
					accountCode: TYPE_ACCOUNT[type] ?? "429",
					propertyId: "",
					confidence: 1,
					note: `add-records form · ${type}: ${property}`,
				},
				receiptId: record.id,
				parentEventId: null,
				actor: "user:demo",
			});
			if (result.ok && result.invoiceId) {
				record.xeroInvoiceId = result.invoiceId;
			} else {
				record.xeroNote = result.error ?? "Xero draft skipped";
			}
		} catch (err) {
			record.xeroNote = `Xero draft failed: ${err instanceof Error ? err.message : String(err)}`;
		}
	}

	return { status: "success", record };
}
