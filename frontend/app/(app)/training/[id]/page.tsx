import { ExperimentDetailView } from "@/components/training/experiment-detail";

export default function TrainingRunPage({ params }: { params: { id: string } }) {
  return <ExperimentDetailView id={params.id} />;
}
