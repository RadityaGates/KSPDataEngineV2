import { google } from "googleapis";

export async function updateGoogleSheet(rows, spreadsheetId = null, range = "Sheet1!A:H") {
  try {
    // 1. AUTHENTICATION
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set");
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 2. GOOGLE SHEET DETAILS
    const sheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID || "1yR_9x6SA7wuAlupOmCnXDr1hJoJUVUmOFySKijRB4j8";

    // 3. READ EXISTING DATA (to preserve old posts)
    let existingRows = [];
    let existingUrls = new Set();
    
    try {
      const existingData = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
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

    // 4. FILTER OUT DUPLICATES (only add new posts)
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

    // 5. MERGE OLD AND NEW ROWS (old posts first, then new posts)
    const headerRow = [["Timestamp", "Tgl", "Hari", "Bulan", "Rubrik Konten", "Thumbnail", "Narasi 1", "Link post"]];
    const allRows = [headerRow[0], ...existingRows, ...newRows];

    // 6. UPDATE SHEET WITH MERGED DATA
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: allRows,
      },
    });

    return {
      success: true,
      message: "Google Sheet updated!",
      insertedRows: newRows.length,
      totalRows: allRows.length - 1, // Exclude header
      duplicatesSkipped: rows.length - newRows.length,
      spreadsheetId: sheetId,
    };
  } catch (error) {
    console.error("Error updating Google Sheet:", error);
    throw error;
  }
}

