import React from "react";

// Minimal markdown → React renderer for the legal documents. Handles exactly
// what those files use — headings, hr, bullet/numbered lists, tables, bold,
// inline code, links, paragraphs — no dependency, no dangerouslySetInnerHTML.
// Relative .md links between documents are rewritten to /legal?doc=<slug>.

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Tokenise on links, bold, code — in that order of precedence.
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = m[2].startsWith("./") && m[2].endsWith(".md")
        ? `/legal?doc=${m[2].slice(2, -3)}`
        : m[2];
      out.push(
        <a key={`${keyBase}-a${i}`} href={href} style={{ fontWeight: 600, textDecoration: "underline" }}>
          {renderInline(m[1], `${keyBase}-a${i}`)}
        </a>
      );
    } else if (m[3] !== undefined) {
      out.push(<b key={`${keyBase}-b${i}`}>{renderInline(m[3], `${keyBase}-b${i}`)}</b>);
    } else if (m[4] !== undefined) {
      out.push(<code key={`${keyBase}-c${i}`} className="md-code">{m[4]}</code>);
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:|-]+\|?$/.test(line) && line.includes("-");
}

function splitRow(line: string): string[] {
  return line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

export function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let k = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    if (trimmed === "---") {
      blocks.push(<hr key={k++} className="md-hr" />);
      i++;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = (`h${Math.min(level + 1, 5)}`) as "h2" | "h3" | "h4" | "h5";
      blocks.push(<Tag key={k++} className={`md-h${level}`}>{renderInline(heading[2], `h${k}`)}</Tag>);
      i++;
      continue;
    }

    if (trimmed.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim())) {
      const header = splitRow(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      blocks.push(
        <div key={k++} className="md-tablewrap">
          <table className="md-table">
            <thead><tr>{header.map((h, hi) => <th key={hi}>{renderInline(h, `t${k}h${hi}`)}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, `t${k}r${ri}c${ci}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const bm = t.match(/^[-*]\s+(.*)$/);
        const nm = t.match(/^\d+\.\s+(.*)$/);
        if (ordered ? !nm : !bm) break;
        items.push((ordered ? nm : bm)![1]);
        i++;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={k++} className="md-list">
          {items.map((item, ii) => <li key={ii}>{renderInline(item, `l${k}i${ii}`)}</li>)}
        </ListTag>
      );
      continue;
    }

    // Paragraph — join consecutive plain lines (markdown soft-wrap).
    const para: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || t === "---" || /^(#{1,4})\s/.test(t) || t.startsWith("|") || /^[-*]\s/.test(t) || /^\d+\.\s/.test(t)) break;
      para.push(t);
      i++;
    }
    blocks.push(<p key={k++} className="md-p">{renderInline(para.join(" "), `p${k}`)}</p>);
  }

  return blocks;
}
