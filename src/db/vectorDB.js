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

// Insert multiple records with course-specific payload
export async function upsertMany(records, courseInfo = {}) {
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
        course_id: courseInfo.courseId || r.metadata?.course_id,
        topic: courseInfo.topic || r.metadata?.topic,
        title: courseInfo.title || r.metadata?.title,
        file_name: r.metadata?.file_name,
        start_time: r.metadata?.start_time,
        end_time: r.metadata?.end_time,
        section: r.metadata?.section,
        ...r.metadata,
      },
    })),
  });

  console.log(`✅ Inserted ${records.length} vectors for course ${courseInfo.courseId} into Qdrant`);
  return records.length;
}

// Query similar vectors with course filtering
export async function query(embedding, { topK = 5, filter = {}, courseIds = [] } = {}) {
  let searchFilter = undefined;

  // Build filter conditions
  const filterConditions = [];

  // Add course filtering if courseIds provided
  if (courseIds && courseIds.length > 0) {
    if (courseIds.length === 1) {
      filterConditions.push({
        key: "course_id",
        match: { value: courseIds[0] }
      });
    } else {
      filterConditions.push({
        key: "course_id",
        match: { any: courseIds }
      });
    }
  }

  // Add other filters
  Object.entries(filter).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      filterConditions.push({
        key,
        match: { any: value }
      });
    } else {
      filterConditions.push({
        key,
        match: { value }
      });
    }
  });

  // Set up filter if we have conditions
  if (filterConditions.length > 0) {
    searchFilter = {
      must: filterConditions
    };
  }

  const results = await client.search(COLLECTION, {
    vector: embedding,
    limit: topK,
    filter: searchFilter,
  });

  return results.map((r) => ({
    id: r.id,
    score: r.score,
    text: r.payload.text,
    metadata: r.payload,
  }));
}

// Get collection statistics
export async function getCollectionStats() {
  try {
    const info = await client.getCollection(COLLECTION);
    return {
      vectorsCount: info.vectors_count,
      indexedVectorsCount: info.indexed_vectors_count,
      pointsCount: info.points_count,
      status: info.status
    };
  } catch (error) {
    console.error("Error getting collection stats:", error);
    return null;
  }
}

// Get vectors by course
export async function getVectorsByCourse(courseId, limit = 100) {
  try {
    const results = await client.scroll(COLLECTION, {
      filter: {
        must: [{
          key: "course_id",
          match: { value: courseId }
        }]
      },
      limit,
      with_payload: true,
      with_vector: false
    });

    return results.points.map(point => ({
      id: point.id,
      payload: point.payload
    }));
  } catch (error) {
    console.error("Error getting vectors by course:", error);
    return [];
  }
}

// Delete vectors by course
export async function deleteVectorsByCourse(courseId) {
  try {
    await client.delete(COLLECTION, {
      filter: {
        must: [{
          key: "course_id",
          match: { value: courseId }
        }]
      }
    });
    console.log(`✅ Deleted vectors for course ${courseId} from Qdrant`);
    return true;
  } catch (error) {
    console.error("Error deleting vectors by course:", error);
    return false;
  }
}
