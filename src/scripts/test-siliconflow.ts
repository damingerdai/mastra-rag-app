import "dotenv/config";

const apiKey = process.env.SILICONFLOW_API_KEY;

if (!apiKey) {
  throw new Error("Missing SILICONFLOW_API_KEY");
}

const response = await fetch(
  "https://api.siliconflow.cn/v1/embeddings",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "BAAI/bge-m3",
      input: "Hello, world!",
    }),
  },
);

console.log("Status:", response.status);

const result = await response.json();
if (response.ok) {
  console.log("Dimensions:", result.data?.[0]?.embedding?.length);
} else {
  console.error("Error:", result);
}