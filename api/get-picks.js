import { list, download } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { blobs } = await list({ prefix: "daily-picks.json" });

    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: "No picks available yet" });
    }

    const blob = blobs[0];
    const { body } = await download(blob.url);
    const text = await new Response(body).text();
    const picks = JSON.parse(text);

    res.status(200).json(picks);

  } catch (error) {
    console.error("Get picks error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
