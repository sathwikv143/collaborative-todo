import { redirect } from "next/navigation";
import { getActorFromCookies } from "@/lib/jwt";

export default async function HomePage() {
  const actor = await getActorFromCookies();
  if (actor?.type === "guest") {
    redirect(`/lists/${actor.listId}`);
  }
  if (actor?.type === "user") {
    redirect("/lists");
  }
  redirect("/login");
}
