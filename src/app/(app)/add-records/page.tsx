import type { Metadata } from "next";
import { getLandlords } from "@/lib/data/mock";
import AddRecordForm from "./AddRecordForm";
import styles from "./addrecords.module.css";

export const metadata: Metadata = { title: "Add records" };

export default function AddRecordsPage() {
	const landlords = getLandlords().map((l) => ({ id: l.id, name: l.name }));

	return (
		<>
			<div className={styles.pagehead}>
				<h1>Add records</h1>
				<p>
					Log invoices, repairs and orders as they come in. ShortStay codes them and drafts the paperwork —
					you approve it.
				</p>
			</div>

			<AddRecordForm landlords={landlords} />
		</>
	);
}
