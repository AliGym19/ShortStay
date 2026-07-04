"use server";

import type { RecordType } from "@/lib/types";
import { getContacts, xeroFetch } from "@/lib/xero";

const TYPES: RecordType[] = ["invoice", "repair", "toiletries", "cleaning", "booking"];
// These record types draft a real ACCPAY bill in Xero; the rest are
// agency-local only (no money/accounting-side event to represent).
const BILLABLE_TYPES: RecordType[] = ["invoice", "repair"];

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

/**
 * ShortStay has no landlord/supplier -> Xero Contact mapping yet (deferred
 * to a future Supabase table, see lib/types.ts's xeroContactId). Until that
 * exists, match by exact Contact name as a best-effort bridge — good enough
 * to prove the write path end-to-end, not a real identity system.
 */
async function findContactId(name: string): Promise<string | undefined> {
	if (!name) return undefined;
	try {
		const contacts = await getContacts();
		return contacts.find((c) => c.Name.toLowerCase() === name.toLowerCase())?.ContactID;
	} catch {
		return undefined;
	}
}

async function draftBill(params: {
	contactId: string;
	amount: number;
	date: string;
	reference: string;
	description: string;
}): Promise<string> {
	const body = JSON.stringify({
		Type: "ACCPAY",
		Status: "DRAFT",
		Contact: { ContactID: params.contactId },
		Date: params.date,
		LineAmountTypes: "Exclusive",
		Reference: params.reference,
		LineItems: [
			{
				Description: params.description,
				Quantity: 1,
				UnitAmount: params.amount,
				AccountCode: "429", // Repairs & Maintenance (UK demo chart) — TODO: real account-code mapping
			},
		],
	});
	const data = await xeroFetch<{ Invoices: { InvoiceID: string; Status?: string }[] }>(
		"Invoices",
		{ method: "POST", body }
	);
	const invoice = data.Invoices?.[0];
	if (!invoice || invoice.Status !== "DRAFT") {
		throw new Error(`Xero did not return a DRAFT invoice: ${JSON.stringify(invoice)}`);
	}
	return invoice.InvoiceID;
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

	// TODO(wire): persist the record itself to Supabase once that table exists.
	if (BILLABLE_TYPES.includes(type)) {
		const contactId = await findContactId(supplier || landlord);
		if (!contactId) {
			record.xeroNote =
				`No Xero contact found matching "${supplier || landlord}" — bill not drafted. ` +
				`Real landlord/supplier -> Xero Contact linking is deferred (see lib/types.ts).`;
		} else {
			try {
				record.xeroInvoiceId = await draftBill({
					contactId,
					amount: record.amount,
					date: record.date,
					reference: reference || `ShortStay-${record.id}`,
					description: `${type}: ${property}`.slice(0, 250),
				});
			} catch (err) {
				record.xeroNote = `Xero draft failed: ${err instanceof Error ? err.message : String(err)}`;
			}
		}
	}

	return { status: "success", record };
}
