"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { RecordType } from "@/lib/types";
import { money } from "@/lib/utils";
import { addRecord, type AddState, type AddedRecord } from "./actions";
import styles from "./addrecords.module.css";

const typeMeta: Record<RecordType, { label: string; blurb: string }> = {
	invoice: { label: "Invoice", blurb: "Supplier bill to draft in Xero" },
	repair: { label: "Repair", blurb: "Maintenance job + cost" },
	toiletries: { label: "Toiletries", blurb: "Consumables restock" },
	cleaning: { label: "Cleaning", blurb: "Turnover clean" },
	booking: { label: "Booking", blurb: "Guest stay + revenue" },
};
const order: RecordType[] = ["invoice", "repair", "toiletries", "cleaning", "booking"];

const emptyFields = { landlord: "", property: "", supplier: "", amount: "", date: "", reference: "" };

export default function AddRecordForm({ landlords }: { landlords: { id: string; name: string }[] }) {
	const [state, formAction] = useActionState<AddState, FormData>(addRecord, { status: "idle" });
	const [added, setAdded] = useState<AddedRecord[]>([]);
	const [selectedType, setSelectedType] = useState<RecordType>("invoice");
	const [f, setF] = useState({ ...emptyFields });
	const doneRef = useRef<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	// Optimistic queue: on a successful save, prepend the record and reset the
	// form. In the wired app the record is also drafted in Xero for approval.
	useEffect(() => {
		if (state.status === "success" && state.record.id !== doneRef.current) {
			doneRef.current = state.record.id;
			setAdded((a) => [state.record, ...a]);
			setF({ ...emptyFields });
			setSelectedType("invoice");
			if (fileRef.current) fileRef.current.value = "";
		}
	}, [state]);

	const errs = state.status === "error" ? state.errors : undefined;
	const set = (k: keyof typeof emptyFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
		setF((prev) => ({ ...prev, [k]: e.target.value }));

	return (
		<div className={styles.cols}>
			{/* form */}
			<section className={`card ${styles.formcard}`}>
				<form action={formAction}>
					<fieldset className={styles.types}>
						<legend className="eyebrow">Record type</legend>
						<div className={styles.typegrid}>
							{order.map((t) => (
								<label key={t} className={`${styles.type} ${selectedType === t ? styles.on : ""}`}>
									<input
										type="radio"
										name="type"
										value={t}
										checked={selectedType === t}
										onChange={() => setSelectedType(t)}
									/>
									<span className={styles.tl}>{typeMeta[t].label}</span>
									<span className={styles.tb}>{typeMeta[t].blurb}</span>
								</label>
							))}
						</div>
						{errs?.type && <p className={styles.err}>{errs.type}</p>}
					</fieldset>

					<div className={styles.row2}>
						<div className={styles.field}>
							<label htmlFor="landlord">Landlord</label>
							<select id="landlord" name="landlord" value={f.landlord} onChange={set("landlord")}>
								<option value="" disabled>
									Select landlord…
								</option>
								{landlords.map((l) => (
									<option key={l.id} value={l.name}>
										{l.name}
									</option>
								))}
							</select>
							{errs?.landlord && <p className={styles.err}>{errs.landlord}</p>}
						</div>
						<div className={styles.field}>
							<label htmlFor="property">Property</label>
							<input
								id="property"
								name="property"
								placeholder="Flat 2 · 14 High St"
								value={f.property}
								onChange={set("property")}
							/>
							{errs?.property && <p className={styles.err}>{errs.property}</p>}
						</div>
					</div>

					<div className={styles.row2}>
						<div className={styles.field}>
							<label htmlFor="supplier">
								{selectedType === "booking" ? "Guest / channel" : "Supplier"}
							</label>
							<input
								id="supplier"
								name="supplier"
								placeholder={selectedType === "booking" ? "Airbnb — guest name" : "e.g. BritGas"}
								value={f.supplier}
								onChange={set("supplier")}
							/>
						</div>
						<div className={styles.field}>
							<label htmlFor="amount">Amount {selectedType === "booking" ? "(optional)" : ""}</label>
							<div className={styles["money-in"]}>
								<span>£</span>
								<input
									id="amount"
									name="amount"
									inputMode="decimal"
									placeholder="0.00"
									value={f.amount}
									onChange={set("amount")}
								/>
							</div>
							{errs?.amount && <p className={styles.err}>{errs.amount}</p>}
						</div>
					</div>

					<div className={styles.row2}>
						<div className={styles.field}>
							<label htmlFor="date">Date</label>
							<input id="date" name="date" type="date" value={f.date} onChange={set("date")} />
						</div>
						<div className={styles.field}>
							<label htmlFor="reference">Reference</label>
							<input
								id="reference"
								name="reference"
								placeholder="Invoice no. / tenancy ref"
								value={f.reference}
								onChange={set("reference")}
							/>
						</div>
					</div>

					<div className={styles.field}>
						<label htmlFor="receipt">
							Receipt or photo <span className={styles.opt}>optional</span>
						</label>
						<input ref={fileRef} id="receipt" name="receipt" type="file" accept="image/*,application/pdf" />
					</div>

					<div className={styles.submit}>
						<button className={styles.save} type="submit">
							Save record
						</button>
						<span className={styles.note}>
							{selectedType === "booking"
								? "Logged against the landlord's revenue."
								: "Drafts a bill in Xero for your approval — never paid automatically."}
						</span>
					</div>
				</form>
			</section>

			{/* side */}
			<aside className={styles.side}>
				<div className={`card ${styles.helper}`}>
					<p className="eyebrow">What happens next</p>
					<ol>
						<li>ShortStay reads the record and codes it to the right account.</li>
						<li>
							For costs, a <strong>draft</strong> bill is created in Xero against the property.
						</li>
						<li>It lands in your approvals queue. Nothing is paid until you say so.</li>
					</ol>
				</div>

				<div className={`card ${styles.recents}`}>
					<div className={styles.rhead}>
						<p className="eyebrow">Added this session</p>
						<span className={`${styles.rcount} fig`}>{added.length}</span>
					</div>
					{added.length === 0 ? (
						<p className={styles.rempty}>Records you add will appear here, then sync to Xero.</p>
					) : (
						<ul>
							{added.map((r) => (
								<li key={r.id}>
									<span className={`${styles.rtag} ${styles[`t-${r.type}`] ?? ""}`}>
										{typeMeta[r.type].label}
									</span>
									<div className={styles.rbody}>
										<span className={styles.rtitle}>{r.property}</span>
										<span className={styles.rmeta}>
											{r.landlord}
											{r.supplier ? ` · ${r.supplier}` : ""}
										</span>
									</div>
									{r.amount > 0 && <span className={`${styles.ramt} fig`}>{money(r.amount)}</span>}
								</li>
							))}
						</ul>
					)}
				</div>
			</aside>
		</div>
	);
}
