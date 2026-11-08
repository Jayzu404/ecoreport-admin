import "./Analytics.css";

/* ------------------------------------------------------------------
   Small helper: count how many reports fall under each label,
   then sort from most to least.
   e.g. [{category:"A"},{category:"A"},{category:"B"}] -> [{label:"A",count:2},{label:"B",count:1}]
------------------------------------------------------------------- */
function tally(reports, field) {
  const counts = {};
  reports.forEach((r) => {
    const key = r[field] || "Other";
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/* One card in the top row */
function StatCard({ label, value, note }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__note">{note}</div>
    </div>
  );
}

/* A ranked list panel (used for both categories and barangays) */
function RankedPanel({ title, subtitle, items, total }) {
  const max = items.length ? items[0].count : 1; // longest bar = the top item

  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <h2 className="panel__title">{title}</h2>
          <p className="panel__sub">{subtitle}</p>
        </div>
        <span className="panel__pill">{total} reports</span>
      </div>

      {items.length === 0 ? (
        <p className="panel__empty">No reports yet.</p>
      ) : (
        <ol className="rank-list">
          {items.map((item, i) => {
            const percent = Math.round((item.count / total) * 100);
            const width = (item.count / max) * 100; // relative to the top item
            const classes = [
              "rank-row",
              i < 3 ? "rank-row--top" : "",
              i === 0 ? "rank-row--first" : "",
            ].join(" ");

            return (
              <li key={item.label} className={classes}>
                <span className="rank-row__badge">{i + 1}</span>
                <div>
                  <div className="rank-row__top">
                    <span>{item.label}</span>
                    <span>
                      <span className="rank-row__count">{item.count}</span>
                      <span className="rank-row__percent">{percent}%</span>
                    </span>
                  </div>
                  <div className="rank-row__track">
                    <div className="rank-row__bar" style={{ width: `${width}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------
   The page. Pass in your reports array from Firestore:
   <Analytics reports={reports} />
   Each report needs: status, category, barangay
------------------------------------------------------------------- */
export default function Analytics({ reports = [] }) {
  const total = reports.length;
  const countStatus = (s) => reports.filter((r) => r.status === s).length;

  const pending = countStatus("pending");
  const verified = countStatus("verified");
  const inProgress = countStatus("in_progress");
  const resolved = countStatus("resolved");
  const rejected = countStatus("rejected");
  const duplicate = countStatus("duplicate");

  return (
    <div className="analytics">
      <h1 className="analytics__title">Analytics</h1>
      <p className="analytics__subtitle">Live from current report data  </p>

      <div className="stats">
        <StatCard label="Total report/s" value={total} note={`${pending} pending`} />
        <StatCard label="Verified" value={verified} note="Confirmed by staff" />
        <StatCard label="In progress" value={inProgress} note="Being worked on" />
        <StatCard label="Resolved" value={resolved} note="Closed with proof" />
        <StatCard
          label="Rejected / Duplicate"
          value={rejected + duplicate}
          note={`${rejected} rejected · ${duplicate} duplicate`}
        />
      </div>

      <div className="panels">
        <RankedPanel
          title="Most reported categories"
          subtitle="All submitted reports, every status"
          items={tally(reports, "category")}
          total={total}
        />
        <RankedPanel
          title="Most reported Baranggays"
          subtitle="Biliran Province · all submitted reports"
          items={tally(reports, "brgy")}
          total={total}
        />
        <RankedPanel
          title="Most reported Municipality"
          subtitle="Biliran Province · all submitted reports"
          items={tally(reports, "municipality")}
          total={total}
        />
      </div>
    </div>
  );
}