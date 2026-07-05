import { NextResponse } from "next/server";
import { getContacts, NotConnectedError } from "@/lib/xero";

// Live contact list (read-only, guard-whitelisted). ?name= returns the
// case-insensitive exact match the draft-bill path would use — the UI's
// pre-flight "will this supplier resolve?" check.

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name");
  try {
    const contacts = await getContacts();
    if (name) {
      const match = contacts.find(
        (c) => c.Name.toLowerCase() === name.toLowerCase()
      );
      return NextResponse.json({
        connected: true,
        match: match ? { contactId: match.ContactID, name: match.Name } : null,
      });
    }
    return NextResponse.json({
      connected: true,
      contacts: contacts.map((c) => ({
        contactId: c.ContactID,
        name: c.Name,
        isSupplier: c.IsSupplier ?? false,
      })),
    });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json({ connected: false }, { status: 409 });
    }
    throw err;
  }
}
