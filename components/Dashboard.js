import Link from "next/link";
import OfficeStationFilters from "@/components/OfficeStationFilters";
import { activities, attention, provinces, totals } from "@/lib/dashboard";

function number(value) {
  return value.toLocaleString("en-US");
}

const pieColors = ["#4C8BF5", "#F5A142", "#C8CCD2", "#F6C445", "#7EB6FF", "#E8D48B", "#8E97A3"];
const ringRadius = 70;
const ringLength = 2 * Math.PI * ringRadius;

function pieSlices(rows) {
  const usable = rows.filter((row) => row.value > 0);
  const total = usable.reduce((sum, row) => sum + row.value, 0);
  const gap = usable.length > 1 ? 3 : 0;
  let offset = 0;
  return usable.map((row, index) => {
    const length = Math.max((row.value / total) * ringLength - gap, 1);
    const slice = {
      ...row,
      color: pieColors[index % pieColors.length],
      dasharray: `${length} ${ringLength}`,
      dashoffset: -offset,
    };
    offset += length + gap;
    return slice;
  });
}

function Pie({ rows, label }) {
  const slices = pieSlices(rows);
  if (!slices.length) {
    return (
      <ul className="pie-legend">
        {(rows.length ? rows : [{ label: "No equipment yet", value: 0 }]).map((row) => (
          <li key={row.label}>
            <i style={{ background: "#C8CCD2" }} />
            <span>{row.label}</span>
            <strong>{number(row.value)}</strong>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="pie-block">
      <svg className="donut" viewBox="0 0 200 200" role="img" aria-label={label}>
        <g transform="rotate(-90 100 100)">
          {slices.map((slice) => (
            <circle
              key={slice.label}
              cx="100"
              cy="100"
              r={ringRadius}
              fill="none"
              stroke={slice.color}
              strokeWidth="26"
              strokeLinecap="butt"
              strokeDasharray={slice.dasharray}
              strokeDashoffset={slice.dashoffset}
            >
              <title>{`${slice.label}: ${number(slice.value)}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <ul className="pie-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{number(slice.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard({ kicker = "Dashboard", title = "Inventory overview", locations = [], summary }) {
  const cards = summary?.totals || totals;
  const statusRows = cards.filter((item) => item.label !== "Total equipment");
  const provinceRows = summary?.provinces || provinces;
  const attentionRows = summary?.attention || attention;
  const activityRows = summary?.activities || activities;

  return (
    <div className="dash">
      <header className="dash-head">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
      </header>

      <OfficeStationFilters locations={locations} />

      <section className="stat-grid" aria-label="Equipment totals">
        {cards.map((item) => (
          <article key={item.label} className={`stat tone-${item.tone}`}>
            <p>{item.label}</p>
            <strong>{number(item.value)}</strong>
          </article>
        ))}
      </section>

      <section className="split">
        <article className="panel-card">
          <h2>Equipment by status</h2>
          <Pie rows={statusRows} label="Equipment by status" />
        </article>
        <article className="panel-card">
          <h2>Equipment by province</h2>
          <Pie rows={provinceRows} label="Equipment by province" />
          <Link className="text-link" href="/inventory/locations">View by location</Link>
        </article>
      </section>

      <section className="panel-card">
        <h2>Needs attention</h2>
        <ul className="attention">
          {attentionRows.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>{number(item.count)}</strong>
              <Link href={item.href}>View</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-card">
        <h2>Recent activities</h2>
        <ul className="activity">
          {activityRows.length === 0 ? <li><span>No recent activity.</span></li> : activityRows.map((item) => (
            <li key={item.time + item.label}>
              <time>{item.time}</time>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
