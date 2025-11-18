/**
 * Convert array of objects to CSV string
 * @param {Array<Object>} rows - Array of objects to convert
 * @returns {string} CSV formatted string
 */
export function convertToCSV(rows) {
  if (!rows || rows.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(header => escapeCSVField(header)).join(',');

  // Convert each row
  const dataRows = rows.map(row =>
    headers.map(header => escapeCSVField(row[header] || '')).join(',')
  );

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escape CSV field values (handle quotes and commas)
 * @param {string|number|boolean} field - Field value to escape
 * @returns {string} Escaped field value
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '';
  }

  const stringField = String(field);

  // If field contains comma, newline, or quotes, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}
