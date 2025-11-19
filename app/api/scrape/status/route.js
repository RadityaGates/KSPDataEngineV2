import { checkApifyRunStatus } from "../../../../lib/apify.js";
import { formatPosts } from "../../../../lib/transform.js";
import { formatPostsForSheets } from "../../../../lib/sheets-format.js";
import { updateGoogleSheet } from "../../../../lib/sheets.js";
import { uploadCSV } from "../../../../lib/storage.js";
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

    const body = await request.json();
    const { runId } = body;

    if (!runId) {
      return Response.json(
        { error: "runId is required" },
        { status: 400 }
      );
    }

    // Check the status of the Apify run
    const result = await checkApifyRunStatus(runId);

    // If still running, return status
    if (result.status !== 'SUCCEEDED') {
      return Response.json({
        success: false,
        status: result.status,
        message: result.message || result.error || `Run is ${result.status}`,
        runId
      });
    }

    // If succeeded, process the posts
    const posts = result.posts;
    
    if (!posts || posts.length === 0) {
      return Response.json({
        success: true,
        status: 'SUCCEEDED',
        message: "No posts found",
        rows: 0,
        runId
      });
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
      status: 'SUCCEEDED',
      rows: posts.length,
      csvUrl: csvUrl,
      sheetsUpdated: sheetsResult ? true : false,
      sheetsMessage: sheetsResult?.message,
      message: `Successfully scraped ${posts.length} posts`,
      runId
    });

  } catch (err) {
    console.error("Error in status check handler:", err);
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
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');
  
  if (!runId) {
    return Response.json(
      { error: "runId query parameter is required" },
      { status: 400 }
    );
  }

  // Create a POST-like request body
  const mockRequest = {
    json: async () => ({ runId })
  };
  
  return POST(mockRequest);
}

