import { asc, desc, gt } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

async function loadBoard() {
  return getDb()
    .select()
    .from(listings)
    .where(gt(listings.totalBidAmount, 0))
    .orderBy(desc(listings.totalBidAmount), asc(listings.createdAt));
}

function rankClass(rank: number) {
  if (rank === 1) return "r1";
  if (rank === 2) return "r2";
  if (rank === 3) return "r3";
  return "";
}

export default async function HomePage() {
  let rows: Awaited<ReturnType<typeof loadBoard>> = [];
  let loadError: string | null = null;

  try {
    rows = await loadBoard();
  } catch {
    loadError =
      "Could not load leaderboard. Check DATABASE_URL and run db:push.";
  }

  return (
    <>
      <h1 className="page-title">Who&apos;s on top?</h1>
      <p className="page-lead">
        Pay more in naira, climb higher. Highest total bid holds #1. Ties go to
        the older listing.
      </p>

      {loadError && <p className="error">{loadError}</p>}

      {!loadError && rows.length === 0 && (
        <div className="empty">
          <p>No bids yet. Be the first.</p>
          <p style={{ marginTop: "1rem" }}>
            <Link
              href="/submit"
              className="btn"
              style={{ display: "inline-flex", width: "auto" }}
            >
              Submit a listing
            </Link>
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <ol className="leaderboard">
          {rows.map((row, i) => {
            const rank = i + 1;
            let host = row.url;
            try {
              host = new URL(row.url).hostname.replace(/^www\./, "");
            } catch {
              /* keep raw */
            }
            return (
              <li key={row.id} className="leaderboard-row">
                <span className={`rank-badge ${rankClass(rank)}`}>#{rank}</span>
                <div className="listing-meta">
                  <span className="listing-name">
                    <a href={row.url} target="_blank" rel="noopener noreferrer">
                      {row.name}
                    </a>
                  </span>
                  <div className="listing-sub">
                    {host}
                    {row.category ? ` · ${row.category}` : ""}
                  </div>
                  <Link
                    className="boost-link"
                    href={`/submit?listingId=${row.id}`}
                  >
                    Boost this rank
                  </Link>
                </div>
                <div className="bid-amount">
                  {formatNaira(row.totalBidAmount)}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
