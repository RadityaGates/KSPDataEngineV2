// Use native fetch in Next.js (available in Node.js 18+)
// import fetch from "node-fetch";

/**
 * Start an Apify Instagram scraping run
 * Returns the run ID immediately (does not wait for completion)
 */
export async function startInstagramScrape(username) {
  const startUrl = `https://api.apify.com/v2/acts/apify~instagram-post-scraper/runs?token=${process.env.APIFY_TOKEN}`;

  const payload = {
    resultsLimit: 1,
    skipPinnedPosts: true,
    username: [
      `https://www.instagram.com/${username}/`
    ],
    proxyConfiguration: { useApifyProxy: true }
  };

  console.log("Starting Apify run with payload:", JSON.stringify(payload));
  
  const startRes = await fetch(startUrl, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  if (!startRes.ok) {
    const errorText = await startRes.text();
    console.error("Failed to start Apify run:", errorText);
    throw new Error(`Failed to start Apify run (${startRes.status}): ${errorText}`);
  }

  const runData = await startRes.json();
  const runId = runData.data.id;
  console.log("Apify run started with ID:", runId);
  
  return {
    runId,
    status: runData.data.status,
    statusUrl: `https://console.apify.com/actors/runs/${runId}`
  };
}

/**
 * Check the status of an Apify run
 * Returns status and posts if completed
 */
export async function checkApifyRunStatus(runId) {
  const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_TOKEN}`;
  const statusRes = await fetch(statusUrl);
  
  if (!statusRes.ok) {
    throw new Error(`Failed to check run status: ${statusRes.status}`);
  }

  const statusData = await statusRes.json();
  const status = statusData.data.status;

  console.log(`Run ${runId} status: ${status}`);

  if (status === 'SUCCEEDED') {
    // Get the dataset
    const datasetId = statusData.data.defaultDatasetId;
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_TOKEN}`;
    
    const datasetRes = await fetch(datasetUrl);
    if (!datasetRes.ok) {
      throw new Error(`Failed to fetch dataset: ${datasetRes.status}`);
    }

    const posts = await datasetRes.json();
    console.log(`Retrieved ${posts.length} posts from dataset`);
    return {
      status: 'SUCCEEDED',
      posts,
      completedAt: statusData.data.finishedAt || statusData.data.startedAt
    };
  } else if (status === 'FAILED' || status === 'ABORTED') {
    return {
      status: status.toLowerCase(),
      error: statusData.data.statusMessage || 'Unknown error',
      posts: null
    };
  } else {
    // Still running
    return {
      status: status,
      posts: null,
      message: `Run is ${status.toLowerCase()}`
    };
  }
}

/**
 * Legacy function for backward compatibility
 * Polls until completion (use startInstagramScrape + checkApifyRunStatus for async pattern)
 */
export async function scrapeInstagram(username) {
  const { runId } = await startInstagramScrape(username);
  
  // Poll for completion (max 4.5 minutes)
  const maxWaitTime = 270000; // 4.5 minutes
  const pollInterval = 3000; // 3 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    const result = await checkApifyRunStatus(runId);
    
    if (result.status === 'SUCCEEDED') {
      return result.posts;
    } else if (result.status === 'failed' || result.status === 'aborted') {
      throw new Error(`Apify run ${result.status}: ${result.error || 'Unknown error'}`);
    }
  }

  throw new Error(`Apify run timed out after ${maxWaitTime / 1000} seconds. Run ID: ${runId}. Check status manually at: https://console.apify.com/actors/runs/${runId}`);
}

