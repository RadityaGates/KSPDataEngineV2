// Workflow endpoint for cron jobs - starts scrape and checks status with retries
import { startInstagramScrape, checkApifyRunStatus } from "../../../../lib/apify.js";
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

    const body = await request.json().catch(() => ({}));
    // Optimized for 10-second timeout: quick retries
    const { runId, maxRetries = 2, retryDelay = 3000 } = body;
    const username = "kantorstafpresidenri";

    let currentRunId = runId;

    // If no runId provided, start a new scrape
    if (!currentRunId) {
      try {
        const runInfo = await startInstagramScrape(username);
        currentRunId = runInfo.runId;
        console.log(`Started new scrape with runId: ${currentRunId}`);
      } catch (scrapeError) {
        console.error("Scraping error:", scrapeError);
        return Response.json(
          { error: "Failed to start Instagram scrape", message: scrapeError.message },
          { status: 500 }
        );
      }
    }

    // Check status with retries
    let result;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      attempts++;
      console.log(`Checking status (attempt ${attempts}/${maxRetries}) for runId: ${currentRunId}`);
      
      result = await checkApifyRunStatus(currentRunId);
      
      if (result.status === 'SUCCEEDED') {
        // Process the posts
        const posts = result.posts;
        
        if (!posts || posts.length === 0) {
          return Response.json({
            success: true,
            status: 'SUCCEEDED',
            message: "No posts found",
            rows: 0,
            runId: currentRunId
          });
        }

        // Sort posts from oldest to newest
        posts.sort((a, b) => {
          const timestampA = new Date(a.timestamp || a.postedAt || a.createdAt || a.date || 0).getTime();
          const timestampB = new Date(b.timestamp || b.postedAt || b.createdAt || b.date || 0).getTime();
          return timestampA - timestampB;
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

        // Try to upload to Supabase, fallback to local file
        let csvUrl;
        try {
          csvUrl = await uploadCSV(csv);
        } catch (storageError) {
          console.warn("Supabase upload failed, saving locally:", storageError.message);
          
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
          runId: currentRunId
        });
      } else if (result.status === 'failed' || result.status === 'aborted') {
        return Response.json({
          success: false,
          status: result.status,
          error: result.error || 'Unknown error',
          runId: currentRunId
        }, { status: 500 });
      } else {
        // Still running - wait before retry (only if not last attempt)
        if (attempts < maxRetries) {
          console.log(`Run still ${result.status}, waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // Max retries reached, still not done
    return Response.json({
      success: false,
      status: result.status,
      message: `Run still in progress after ${maxRetries} attempts. Run ID: ${currentRunId}`,
      runId: currentRunId,
      checkStatusUrl: `/api/scrape/status?runId=${currentRunId}`,
      instructions: "The scrape is still running. Check status later using the checkStatusUrl"
    });

  } catch (err) {
    console.error("Error in workflow handler:", err);
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

