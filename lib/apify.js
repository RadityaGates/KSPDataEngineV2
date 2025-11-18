// Use native fetch in Next.js (available in Node.js 18+)
// import fetch from "node-fetch";

export async function scrapeInstagram(username) {
  // Use async mode: start the run, then poll for completion
  const startUrl = `https://api.apify.com/v2/acts/apify~instagram-post-scraper/runs?token=${process.env.APIFY_TOKEN}`;

  const payload = {
    username: [`https://www.instagram.com/${username}/`],
    resultsLimit: 4,
    skipPinnedPosts: true,
    proxyConfiguration: { useApifyProxy: true }
  };

  console.log("Starting Apify run with payload:", JSON.stringify(payload));
  
  // Start the run
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

  // Poll for completion (max 5 minutes)
  const maxWaitTime = 300000; // 5 minutes
  const pollInterval = 3000; // 3 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

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
      return posts;
    } else if (status === 'FAILED' || status === 'ABORTED') {
      throw new Error(`Apify run ${status.toLowerCase()}: ${statusData.data.statusMessage || 'Unknown error'}`);
    }
    // Continue polling if status is RUNNING, READY, etc.
  }

  throw new Error("Apify run timed out after 5 minutes");
}

