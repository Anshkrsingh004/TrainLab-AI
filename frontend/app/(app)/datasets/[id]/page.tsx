import { DatasetInspector } from "@/components/datasets/dataset-inspector";

export default function DatasetPage({ params }: { params: { id: string } }) {
  return <DatasetInspector id={params.id} />;
}
