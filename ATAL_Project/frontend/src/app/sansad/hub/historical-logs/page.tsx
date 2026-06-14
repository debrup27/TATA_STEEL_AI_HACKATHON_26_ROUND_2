import { redirect } from "next/navigation";

export default function LegacyHistoricalLogsRedirect() {
  redirect("/sansad/hub/reports");
}
