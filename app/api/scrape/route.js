// Start Apify scraping run (returns immediately with runId)
import { startInstagramScrape } from "../../../lib/apify.js";

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

    // Start the Apify run (returns immediately)
    let runInfo;
    try {
      runInfo = await startInstagramScrape(username);
    } catch (scrapeError) {
      console.error("Scraping error:", scrapeError);
      return Response.json(
        { error: "Failed to start Instagram scrape", message: scrapeError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Scraping started successfully",
      runId: runInfo.runId,
      status: runInfo.status,
      statusUrl: runInfo.statusUrl,
      checkStatusUrl: `/api/scrape/status?runId=${runInfo.runId}`,
      instructions: "Use the checkStatusUrl to poll for completion, or check the statusUrl for manual monitoring"
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
