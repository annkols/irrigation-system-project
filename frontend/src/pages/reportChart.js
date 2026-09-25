// Renders a simple line chart to a PNG data URL using a plain <canvas>,
// independent of Recharts, so it can be embedded into the PDF report.
export function renderLineChartImage({ points, title, color = "#006D3D", width = 900, height = 320 }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillText(title, 20, 26);

  const padding = { top: 40, right: 24, bottom: 42, left: 60 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const valid = points.filter((point) => point.value != null);
  if (valid.length < 2) {
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText("Not enough data to plot a chart.", padding.left, padding.top + plotH / 2);
    return canvas.toDataURL("image/png");
  }

  const xs = valid.map((point) => point.time);
  const ys = valid.map((point) => point.value);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const yPad = (yMax - yMin) * 0.1;
  yMin -= yPad;
  yMax += yPad;

  const xScale = (t) => padding.left + ((t - xMin) / (xMax - xMin || 1)) * plotW;
  const yScale = (v) => padding.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#6b7280";
  ctx.font = "12px Arial, sans-serif";
  ctx.textAlign = "right";
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const value = yMin + ((yMax - yMin) * i) / gridLines;
    const y = yScale(value);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(value.toFixed(1), padding.left - 8, y + 4);
  }

  ctx.textAlign = "left";
  [0, 0.5, 1].forEach((fraction) => {
    const t = xMin + (xMax - xMin) * fraction;
    const x = xScale(t);
    const date = new Date(t);
    const text = `${date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} ${date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
    ctx.textAlign = fraction === 0 ? "left" : fraction === 1 ? "right" : "center";
    ctx.fillText(text, x, height - 16);
  });

  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotH);
  ctx.lineTo(width - padding.right, padding.top + plotH);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let started = false;
  points.forEach((point) => {
    if (point.value == null) {
      started = false;
      return;
    }
    const x = xScale(point.time);
    const y = yScale(point.value);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
