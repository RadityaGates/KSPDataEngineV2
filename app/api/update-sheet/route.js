import { google } from "googleapis";

// Use Node.js runtime (NOT Edge) for Google Sheets API calls
export const runtime = "nodejs";

export async function POST(request) {
  try {
    // 1. AUTHENTICATION
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return Response.json(
        { error: "GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set" },
        { status: 500 }
      );
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 2. GOOGLE SHEET DETAILS
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1yR_9x6SA7wuAlupOmCnXDr1hJoJUVUmOFySKijRB4j8";
    const range = "Sheet1!A:H"; // Adjust if your sheet name changes (A:H includes Timestamp column)

    // 3. GET DATA FROM REQUEST BODY (or use example data)
    let rows;
    try {
      const body = await request.json();
      rows = body.rows;
    } catch (e) {
      // If no body provided, use example data
      rows = [
        ["2025-11-13T00:00:00.000Z", "13 November 2025", "Kamis", "November", "Update KSP", "https://example.jpg", "Narasi contoh", "https://instagram.com/p/xxx"],
        ["2025-11-14T00:00:00.000Z", "14 November 2025", "Jumat", "November", "Update KSP", "https://example.jpg", "Postingan kedua", "https://instagram.com/p/yyy"],
      ];
    }

    if (!rows || rows.length === 0) {
      return Response.json(
        { error: "No rows provided to insert" },
        { status: 400 }
      );
    }

    // 4. READ EXISTING DATA (to preserve old posts)
    let existingRows = [];
    let existingUrls = new Set();
    
    try {
      const existingData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      if (existingData.data.values && existingData.data.values.length > 0) {
        // Skip header row (first row)
        existingRows = existingData.data.values.slice(1);
        
        // Extract existing URLs (column index 7 = "Link post")
        existingRows.forEach(row => {
          if (row[7]) {
            existingUrls.add(row[7].trim());
          }
        });
      }
    } catch (readError) {
      // If sheet is empty or doesn't exist, continue with empty data
      console.log("No existing data found or sheet is empty, starting fresh");
    }

    // 5. FILTER OUT DUPLICATES (only add new posts)
    const newRows = rows.filter(row => {
      const url = row[7] ? row[7].trim() : "";
      if (!url) return false; // Skip rows without URL
      
      if (existingUrls.has(url)) {
        return false; // Skip duplicate
      }
      
      // Add to set to prevent duplicates within new rows
      existingUrls.add(url);
      return true; // This is a new post
    });

    // 6. MERGE OLD AND NEW ROWS (old posts first, then new posts)
    const headerRow = [["Timestamp", "Tgl", "Hari", "Bulan", "Rubrik Konten", "Thumbnail", "Narasi 1", "Link post"]];
    const allRows = [headerRow[0], ...existingRows, ...newRows];

    // 7. UPDATE SHEET WITH MERGED DATA
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: allRows,
      },
    });

    return Response.json({
      success: true,
      message: "Google Sheet updated!",
      insertedRows: newRows.length,
      totalRows: allRows.length - 1, // Exclude header
      duplicatesSkipped: rows.length - newRows.length,
      spreadsheetId,
    });

  } catch (error) {
    console.error("Error updating sheet:", error);
    return Response.json(
      { 
        error: "Failed to update Google Sheet",
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return Response.json(
    { error: "Use POST method to update the sheet" },
    { status: 405 }
  );
}

