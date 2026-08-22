export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // BLOB_STORE_ID includes "store_" prefix, strip it for the URL
    const storeId = process.env.BLOB_STORE_ID?.replace(/^store_/, "") || "";
    const blobUrl = `https://${storeId}.public.blob.vercel-storage.com/daily-picks.json`;

    console.log("Fetching from:", blobUrl);

    const dataRes = await fetch(blobUrl, {
      cache: "no-store"
    });

    if (!dataRes.ok) {
      console.log("Blob fetch failed:", dataRes.status, blobUrl);
      return res.status(404).json({ error: "No picks available yet" });
    }

    const picks = await dataRes.json();
    console.log("Picks fetched OK, keys:", Object.keys(picks));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(picks);

  } catch (error) {
    console.error("Get picks error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
