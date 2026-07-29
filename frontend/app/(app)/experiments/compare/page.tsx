import { CompareView } from "@/components/experiments/compare-view";

export default function ComparePage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const ids = (searchParams.ids ?? "").split(",").filter(Boolean);
  return <CompareView ids={ids} />;
}
