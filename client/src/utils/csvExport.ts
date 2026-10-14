/**
 * Vynora Universal CSV Export Utility
 * Serializes arbitrary arrays of objects to CSV with quoted string escaping
 * and triggers immediate browser download with specified filename.
 */

export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!Array.isArray(data) || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  // Extract all unique headers across objects
  const headers = Array.from(
    new Set(data.flatMap(item => Object.keys(item)))
  );

  // Build CSV rows
  const csvRows: string[] = [];
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === undefined || val === null) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', cleanFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
