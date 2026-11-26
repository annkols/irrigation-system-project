export type Measurement = {
    id: number;
    experiment_id: number;
    station_number: number;
    pot_number: number;
    moisture_percent: number | null;
    air_temperature: number | null;
    air_humidity: number | null;
    pressure_hpa: number | null;
    soil_temperature: number | null;
    light_lux: number | null;
    pump_on: boolean;
    created_at: string;
}