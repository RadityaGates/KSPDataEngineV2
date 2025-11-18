import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatDateIndonesian, formatDayIndonesian, formatMonthIndonesian } from '../utils/date.js';
import { convertToCSV } from '../utils/convert.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apifyToken = process.env.APIFY_TOKEN;
    if (!apifyToken) {
      return res.status(500).json({ error: 'APIFY_TOKEN environment variable not set' });
    }

    // Fetch data from Apify Instagram Profile Scraper
    console.log('Fetching Instagram data from Apify...');
    const apifyResponse = await fetch('https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync?token=' + apifyToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resultsLimit: 8,
        skipPinnedPosts: true,
        username: [
          "https://www.instagram.com/kantorstafpresidenri/"
        ],
      }),
    });

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error('Apify API error:', errorText);
      return res.status(500).json({ error: 'Failed to fetch from Apify', details: errorText });
    }

    const apifyData = await apifyResponse.json();
    console.log('Apify response received:', JSON.stringify(apifyData).substring(0, 200));

    // Extract posts from Apify response
    let posts = [];
    if (apifyData.output && apifyData.output.posts) {
      posts = apifyData.output.posts;
    } else if (Array.isArray(apifyData)) {
      posts = apifyData;
    }

    // Transform posts to CSV format
    const csvRows = posts.map((post) => {
      const timestamp = post.timestamp || post.posted || new Date().toISOString();
      const date = new Date(timestamp);

      return {
        Tgl: formatDateIndonesian(date),
        Hari: formatDayIndonesian(date),
        Bulan: formatMonthIndonesian(date),
        'Rubrik Konten': 'Update KSP',
        Thumbnail: post.displayUrl || post.thumbnail || '',
        'Narasi 1': post.caption || post.description || '',
        'Link post': post.url || post.link || '',
      };
    });

    // Create directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'public', 'data');
    await fs.mkdir(dataDir, { recursive: true });

    const csvPath = path.join(dataDir, 'instagram.csv');

    let existingContent = '';
    try {
      existingContent = await fs.readFile(csvPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, that's fine
      existingContent = '';
    }

    let csvContent;
    if (!existingContent.trim()) {
      // New CSV file
      csvContent = convertToCSV(csvRows);
    } else {
      // Append to existing CSV (skip header row)
      const newRows = convertToCSV(csvRows);
      const lines = newRows.split('\n');
      const dataLines = lines.slice(1).filter(line => line.trim()); // Skip header
      csvContent = existingContent.trim() + '\n' + dataLines.join('\n');
    }

    // Write CSV file (updates existing or creates new)
    await fs.writeFile(csvPath, csvContent, 'utf-8');
    console.log('CSV file written to:', csvPath);

    // Return success response
    const fileUrl = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/data/instagram.csv`;
    return res.status(200).json({
      success: true,
      message: 'Instagram data scraped and converted to CSV successfully',
      rowsProcessed: csvRows.length,
      fileUrl: fileUrl,
      data: csvRows,
    });
  } catch (error) {
    console.error('Error in scrape handler:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
