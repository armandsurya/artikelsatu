import { api } from "@/integrations/api/browser";
export async function probe() {
  const q = api.from("user_roles");
  const res = await q.select("role");
  const bad: number = q;
  const bad2: number = res;
  const bad3: number = res.data;
  return [bad, bad2, bad3];
}
