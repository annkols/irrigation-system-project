import { apiGet } from "./access";
import type { Measurement } from "@/types/measurements";

export async function getLatestMeasurement(experimentId: number): Promise<Measurement | null> {

    const measurements = await apiGet<Measurement[]>(`/measurements/?experiment_id=${experimentId}&limit=1`);

    return measurements[0] ?? null;
}