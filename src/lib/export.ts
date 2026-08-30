// Lightweight CSV + print-to-PDF helpers. No deps.

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCsv(filename: string, columns: string[], rows: Record<string, unknown>[]) {
  const header = columns.map(csvCell).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPdf(opts: {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  meta?: Record<string, string>;
}) {
  const { title, subtitle, columns, rows, meta } = opts;
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!win) return;
  const safe = (s: unknown) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const metaHtml = meta
    ? `<div class="meta">${Object.entries(meta).map(([k, v]) => `<span><b>${safe(k)}:</b> ${safe(v)}</span>`).join("")}</div>`
    : "";
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safe(title)}</title>
    <style>
      *{box-sizing:border-box} body{font:13px/1.4 -apple-system,Segoe UI,Inter,system-ui,sans-serif;color:#000;margin:32px}
      h1{font-size:22px;margin:0 0 4px} .sub{color:#555;margin-bottom:16px}
      .meta{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:20px;padding:10px 14px;background:#f5f5f5;border-radius:6px;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:8px} th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #ddd}
      th{background:#fafafa;text-transform:uppercase;font-size:11px;letter-spacing:.04em;color:#555}
      tr:nth-child(even) td{background:#fcfcfc}
      .foot{margin-top:24px;font-size:11px;color:#777;border-top:1px solid #eee;padding-top:10px}
      @media print{body{margin:16mm}}
    </style></head><body>
    <h1>${safe(title)}</h1>${subtitle ? `<div class="sub">${safe(subtitle)}</div>` : ""}
    ${metaHtml}
    <table><thead><tr>${columns.map((c) => `<th>${safe(c)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${safe(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <div class="foot">Generated ${new Date().toLocaleString()} • RestoStack</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script>
    </body></html>`);
  win.document.close();
}
