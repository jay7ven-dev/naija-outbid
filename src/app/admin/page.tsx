import { desc } from "drizzle-orm";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { bids, listings, payments } from "@/lib/db/schema";
import { formatNaira } from "@/lib/format";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdminAuthenticated()) {
    return (
      <>
        <h1 className="page-title">Admin</h1>
        <p className="page-lead">Enter the admin password to continue.</p>
        <AdminLoginForm />
      </>
    );
  }

  let listingRows: (typeof listings.$inferSelect)[] = [];
  let bidRows: (typeof bids.$inferSelect)[] = [];
  let paymentRows: (typeof payments.$inferSelect)[] = [];
  let err: string | null = null;

  try {
    const db = getDb();
    [listingRows, bidRows, paymentRows] = await Promise.all([
      db.select().from(listings).orderBy(desc(listings.createdAt)).limit(100),
      db.select().from(bids).orderBy(desc(bids.createdAt)).limit(100),
      db.select().from(payments).orderBy(desc(payments.createdAt)).limit(100),
    ]);
  } catch {
    err = "Failed to load admin data.";
  }

  return (
    <>
      <h1 className="page-title">Admin</h1>
      <p className="page-lead">Raw listings, bids, and payments (latest 100).</p>
      {err && <p className="error">{err}</p>}

      <h2 style={{ marginTop: "2rem", fontSize: "1.1rem" }}>Listings</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Total</th>
              <th>Status fields</th>
            </tr>
          </thead>
          <tbody>
            {listingRows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name}
                  <br />
                  <span style={{ color: "var(--muted)" }}>{r.url}</span>
                </td>
                <td>{formatNaira(r.totalBidAmount)}</td>
                <td>
                  {r.ownerEmail || "—"}
                  <br />
                  <span style={{ color: "var(--muted)" }}>{r.id}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: "2rem", fontSize: "1.1rem" }}>Bids</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {bidRows.map((r) => (
              <tr key={r.id}>
                <td>{formatNaira(r.amount)}</td>
                <td>{r.status}</td>
                <td style={{ wordBreak: "break-all" }}>{r.paystackReference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: "2rem", fontSize: "1.1rem" }}>Payments</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {paymentRows.map((r) => (
              <tr key={r.id}>
                <td>{formatNaira(r.amount)}</td>
                <td>{r.status}</td>
                <td style={{ wordBreak: "break-all" }}>{r.paystackReference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
