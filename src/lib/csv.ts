/** Utilitário de exportação CSV no navegador (sem serviços externos). */

function escapeCell(value: string | number): string {
  const text = typeof value === 'number' ? String(value) : value;
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Gera e baixa um CSV com separador ";" e BOM UTF-8 (compatível com Excel pt-BR).
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): void {
  const lines = [headers.map(escapeCell).join(';')];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(';'));
  }
  // BOM ajuda o Excel a interpretar acentos corretamente.
  const content = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
