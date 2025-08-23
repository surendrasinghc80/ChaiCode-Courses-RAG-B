// vectorDb.js
import { QdrantClient } from "@qdrant/js-client-rest";
import crypto from "crypto";

const client = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333", // Qdrant instance
  apiKey: process.env.QDRANT_API_KEY || undefined, // optional if running locally
});

const COLLECTION = process.env.QDRANT_COLLECTION || "course_vectors";

// Ensure collection exists
export async function ensureCollection(dim) {
  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION);

  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: {
        size: dim, // dimension of embeddings (e.g. 1536 for OpenAI)
        distance: "Cosine",
      },
    });
    console.log(`✅ Created Qdrant collection: ${COLLECTION}`);
  }
}

// Insert multiple records
export async function upsertMany(records) {
  if (!records || records.length === 0) return;

  // ensure collection with embedding size
  await ensureCollection(records[0].embedding.length);

  await client.upsert(COLLECTION, {
    wait: true,
    points: records.map((r) => ({
      id: r.id || crypto.randomUUID(),
      vector: r.embedding,
      payload: {
        text: r.text,
        ...r.metadata,
      },
    })),
  });

  console.log(`✅ Inserted ${records.length} vectors into Qdrant`);
}

// Query similar vectors
export async function query(embedding, { topK = 5, filter = {} } = {}) {
  const results = await client.search(COLLECTION, {
    vector: embedding,
    limit: topK,
    filter: Object.keys(filter).length
      ? {
          must: Object.entries(filter).map(([key, value]) => ({
            key,
            match: { value },
          })),
        }
      : undefined,
  });

  return results.map((r) => ({
    id: r.id,
    score: r.score,
    text: r.payload.text,
    metadata: r.payload,
  }));
}
