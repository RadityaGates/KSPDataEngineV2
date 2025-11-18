// Helper function to convert formatted posts to Google Sheets rows format
const INDONESIAN_DAYS = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
];

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * Convert posts array to Google Sheets rows format (array of arrays)
 * @param {Array} posts - Array of post objects from Apify
 * @returns {Array} Array of arrays, each inner array is a row for Google Sheets
 */
export function formatPostsForSheets(posts) {
  return posts.map((p) => {
    // Handle different timestamp field names
    const timestamp = p.timestamp || p.postedAt || p.createdAt || p.date || new Date().toISOString();
    const date = new Date(timestamp);

    // Format timestamp with only hour, minutes, and seconds
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const formattedTimestamp = `${hours}:${minutes}:${seconds}`;

    // Handle different image URL field names
    const thumbnail = p.imageUrl || p.displayUrl || p.thumbnail || p.image || "";

    // Handle different caption/description field names
    const caption = p.caption || p.description || p.text || "";

    // Handle different URL field names
    const url = p.url || p.link || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : "");

    // Return as array (row format for Google Sheets)
    return [
      formattedTimestamp, // Timestamp (formatted as YYYY-MM-DD HH:MM AM/PM)
      `${date.getDate()} ${INDONESIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`, // Tgl
      INDONESIAN_DAYS[date.getDay()], // Hari
      INDONESIAN_MONTHS[date.getMonth()], // Bulan
      "Update KSP", // Rubrik Konten
      thumbnail, // Thumbnail
      caption, // Narasi 1
      url, // Link post
    ];
  });
}

