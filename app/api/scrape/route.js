// Test imports first
import { scrapeInstagram } from "../../../lib/apify.js";
import { formatPosts } from "../../../lib/transform.js";
import { formatPostsForSheets } from "../../../lib/sheets-format.js";
import { updateGoogleSheet } from "../../../lib/sheets.js";
import { uploadCSV } from "../../../lib/storage.js";
import { promises as fs } from 'fs';
import path from 'path';

// Use Node.js runtime (NOT Edge) for Apify API calls
export const runtime = "nodejs";

export async function POST(request) {
  try {
    // Validate environment variables
    if (!process.env.APIFY_TOKEN) {
      return Response.json(
        { error: "APIFY_TOKEN environment variable not set" },
        { status: 500 }
      );
    }

    const username = "kantorstafpresidenri";

    // Scrape Instagram posts
    let posts;
    try {
      posts = await scrapeInstagram(username);
    } catch (scrapeError) {
      console.error("Scraping error:", scrapeError);
      return Response.json(
        { error: "Failed to scrape Instagram", message: scrapeError.message },
        { status: 500 }
      );
    }
    
    if (!posts || posts.length === 0) {
      return Response.json(
        { error: "No posts found for the specified username" },
        { status: 404 }
      );
    }

    // Sort posts from oldest to newest
    posts.sort((a, b) => {
      const timestampA = new Date(a.timestamp || a.postedAt || a.createdAt || a.date || 0).getTime();
      const timestampB = new Date(b.timestamp || b.postedAt || b.createdAt || b.date || 0).getTime();
      return timestampA - timestampB; // Ascending order (oldest first)
    });

    // Format posts to CSV
    let csv;
    try {
      csv = formatPosts(posts);
    } catch (formatError) {
      console.error("Format error:", formatError);
      return Response.json(
        { error: "Failed to format posts to CSV", message: formatError.message },
        { status: 500 }
      );
    }

    // Try to upload to Supabase, fallback to local file if not configured
    let csvUrl;
    try {
      csvUrl = await uploadCSV(csv);
    } catch (storageError) {
      console.warn("Supabase upload failed, saving locally:", storageError.message);
      
      // Fallback: save to local public/data directory
      const dataDir = path.join(process.cwd(), 'public', 'data');
      await fs.mkdir(dataDir, { recursive: true });
      const csvPath = path.join(dataDir, 'instagram.csv');
      await fs.writeFile(csvPath, csv, 'utf-8');
      
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      csvUrl = `${baseUrl}/data/instagram.csv`;
    }

    // Optionally update Google Sheets
    let sheetsResult = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const sheetRows = formatPostsForSheets(posts);
        sheetsResult = await updateGoogleSheet(sheetRows);
        console.log("Google Sheet updated successfully");
      } catch (sheetsError) {
        console.warn("Failed to update Google Sheet:", sheetsError.message);
        // Don't fail the whole request if sheets update fails
      }
    }

    return Response.json({
      success: true,
      rows: posts.length,
      csvUrl: csvUrl,
      sheetsUpdated: sheetsResult ? true : false,
      sheetsMessage: sheetsResult?.message,
      message: `Successfully scraped ${posts.length} posts`,
    });

  } catch (err) {
    console.error("Error in scrape handler:", err);
    console.error("Error stack:", err.stack);
    return Response.json(
      { 
        error: "Internal server error",
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return POST(request);
}
