const MIN_GAP_THRESHOLD_MS = 60 * 1000;

export const formatChartTime = (value) => new Date(value).toLocaleString("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const addVisibleGaps = (points) => {
  const intervals = points
    .slice(1)
    .map((point, index) => point.time - points[index].time)
    .filter((interval) => interval > 0);
  const usualInterval = median(intervals);
  const gapThreshold = Math.max(MIN_GAP_THRESHOLD_MS, usualInterval * 3);

  return points.flatMap((point, index) => {
    if (index === 0) return [point];
    const previous = points[index - 1];
    if (point.time - previous.time <= gapThreshold) return [point];
    return [{ time: previous.time + ((point.time - previous.time) / 2), value: null }, point];
  });
};

export const buildChartSeries = ({
  measurements,
  valueKey,
  valueGetter,
  predicate = () => true,
  startDate = "",
  endDate = "",
}) => {
  const startTime = startDate ? new Date(startDate).getTime() : null;
  const endTime = endDate ? new Date(endDate).getTime() : null;

  const points = measurements
    .filter(predicate)
    .map((measurement) => ({
      time: new Date(measurement.created_at).getTime(),
      value: valueGetter ? valueGetter(measurement) : measurement[valueKey],
    }))
    .filter((point) => Number.isFinite(point.time) && point.value != null)
    .filter((point) => startTime == null || point.time >= startTime)
    .filter((point) => endTime == null || point.time <= endTime)
    .sort((a, b) => a.time - b.time);

  return addVisibleGaps(points);
};

export const findSharedSensorSource = (measurements, valueKey) => {
  const counts = new Map();
  measurements.forEach((measurement) => {
    if (measurement[valueKey] == null) return;
    counts.set(measurement.pot_number, (counts.get(measurement.pot_number) || 0) + 1);
  });

  return [...counts.entries()]
    .sort(([potA, countA], [potB, countB]) => countB - countA || potA - potB)[0]?.[0] ?? null;
};
