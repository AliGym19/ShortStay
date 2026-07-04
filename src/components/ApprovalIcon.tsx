import type { ApprovalKind } from "@/lib/types";

export default function ApprovalIcon({ kind, size = 18 }: { kind: ApprovalKind; size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{kind === "repair" ? (
				<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2l-6 6a1.5 1.5 0 0 0 2.1 2.1l6-6a4 4 0 0 0 5.2-5.4l-2.3 2.3-2.1-.6-.6-2.1z" />
			) : kind === "confirm-booking" ? (
				<>
					<rect x="3" y="4.5" width="18" height="16" rx="2.5" />
					<path d="M3 9h18M8 2.5v4M16 2.5v4" />
					<path d="M9 14.5l2 2 4-4" />
				</>
			) : kind === "attend-booking" ? (
				<>
					<circle cx="8" cy="8" r="3" />
					<path d="M11 11l9 9M17.5 17.5l1.8-1.8M15.7 15.7l1.8-1.8" />
				</>
			) : (
				<>
					<path d="M12 2.7 3.5 7v10L12 21.3 20.5 17V7L12 2.7z" />
					<path d="M3.7 7 12 11.4 20.3 7M12 11.4V21.3" />
				</>
			)}
		</svg>
	);
}
