import { api } from "@/integrations/api/browser";
export async function probe() {
  const q = api.from("user_roles").select("role");
  const res = await q;
  const d = res.data;
  return (d ?? []).map((r) => r);
}
