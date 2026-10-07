import { env } from "cloudflare:workers";
import { db } from "./server";
import { createClusteringService } from "./clustering-job";
const service = createClusteringService(db, () => ({
  key: env.OPENAI_API_KEY,
  model: env.OPENAI_MODEL,
}));
export const clusterQuestions = service.start;
export const processClustering = service.process;
export const recoverClustering = service.recover;
