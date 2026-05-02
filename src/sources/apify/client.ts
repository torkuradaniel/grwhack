import { ApifyClient } from "apify-client";
import { env } from "../../config.js";

export const apify = new ApifyClient({ token: env.apifyToken });

export async function runActor<T>(actorId: string, input: object): Promise<T[]> {
  const run = await apify.actor(actorId).call(input);
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items as T[];
}
