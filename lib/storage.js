import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials not set. CSV upload will be disabled.");
}

const client = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function uploadCSV(csvContent) {
  if (!client) {
    throw new Error("Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_KEY in .env.local");
  }

  const fileName = "instagram-output.csv";

  const { error } = await client.storage
    .from("csv-files")
    .upload(fileName, Buffer.from(csvContent), {
      upsert: true,
      contentType: "text/csv"
    });

  if (error) throw error;

  const { data: publicUrlData } = client.storage
    .from("csv-files")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

