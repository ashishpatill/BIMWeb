import { getApiKeys } from "@/lib/actions";
import { ApiKeysClient } from "./api-keys-client";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const keys = await getApiKeys();

  return <ApiKeysClient initialKeys={keys} />;
}
