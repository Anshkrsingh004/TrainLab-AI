import { NewExperimentForm } from "@/components/training/new-experiment-form";

export default function NewTrainingPage({
  searchParams,
}: {
  searchParams: { dataset?: string };
}) {
  return <NewExperimentForm initialDatasetId={searchParams.dataset} />;
}
