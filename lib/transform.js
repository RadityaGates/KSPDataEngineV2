import { Parser } from "json2csv";

const INDONESIAN_DAYS = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
];

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export function formatPosts(posts) {
  const mapped = posts.map((p) => {
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

    return {
      "Timestamp": formattedTimestamp,
      "Tgl": `${date.getDate()} ${INDONESIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      "Hari": INDONESIAN_DAYS[date.getDay()],
      "Bulan": INDONESIAN_MONTHS[date.getMonth()],
      "Rubrik Konten": "Update KSP",
      "Thumbnail": thumbnail,
      "Narasi 1": caption,
      "Link post": url,
    };
  });

  const parser = new Parser();
  return parser.parse(mapped);
}

