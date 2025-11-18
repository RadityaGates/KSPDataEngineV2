const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format date to Indonesian format: DD Month YYYY
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDateIndonesian(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = INDONESIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format day to Indonesian day name
 * @param {Date} date - The date to get day from
 * @returns {string} Indonesian day name
 */
export function formatDayIndonesian(date) {
  return INDONESIAN_DAYS[date.getDay()];
}

/**
 * Format month to Indonesian month name
 * @param {Date} date - The date to get month from
 * @returns {string} Indonesian month name
 */
export function formatMonthIndonesian(date) {
  return INDONESIAN_MONTHS[date.getMonth()];
}
