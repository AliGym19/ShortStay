interface Point {
	label: string;
	value: number;
}

export default function Sparkline({
	points,
	width = 220,
	height = 56,
}: {
	points: Point[];
	width?: number;
	height?: number;
}) {
	const pad = 6;
	const max = Math.max(...points.map((p) => p.value));
	const min = Math.min(...points.map((p) => p.value));
	const span = max - min || 1;

	const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
	const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

	const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
	const area = `${line} L${x(points.length - 1)},${height} L${x(0)},${height} Z`;
	const lastX = x(points.length - 1);
	const lastY = y(points[points.length - 1].value);

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label="Agency revenue trend, last 6 months"
			preserveAspectRatio="none"
			style={{ display: "block", width: "100%", height: "auto" }}
		>
			<defs>
				<linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--in)" stopOpacity="0.18" />
					<stop offset="100%" stopColor="var(--in)" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={area} fill="url(#spark)" />
			<path
				d={line}
				fill="none"
				stroke="var(--in)"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<circle cx={lastX} cy={lastY} r="3.5" fill="var(--in)" stroke="var(--surface)" strokeWidth="2" />
		</svg>
	);
}
