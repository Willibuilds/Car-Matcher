import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, picks } = req.body;

  if (password !== "ClaudeCode123!") {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    const payload = {
      date: new Date().toISOString().split("T")[0],
      picks
    };

    await put("daily-picks.json", JSON.stringify(payload), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json"
    });

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Save picks error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}
