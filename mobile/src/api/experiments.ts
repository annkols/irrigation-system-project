import { apiGet } from "./access";
import type { Experiment } from "@/types/experiments";

export async function getOwnedExperiments(): Promise<Experiment[]> {

    return apiGet<Experiment[]>("/experiments/owned/");
}

export async function getExperiment(id: number): Promise<Experiment> {

    return apiGet<Experiment>(`/experiments/${id}/`);
}
