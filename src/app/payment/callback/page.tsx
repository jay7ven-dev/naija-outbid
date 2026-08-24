"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatNaira } from "@/lib/format";

type State =
  | { status: "loading" }
  | { status: "success"; amount: number; alreadyProcessed: boolean }
  | { status: "error"; message: string };

function CallbackInner() {
  const searchParams = useSearchParams();
  const reference =
    searchParams.get("reference") || searchParams.get("trxref") || "";
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!reference) {
      setState({ status: "error", message: "Missing payment reference" });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(reference)}`
        );
        const data = (await res.json()) as {
          ok?: boolean;
          amount?: number;
          alreadyProcessed?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState({
            status: "error",
            message: data.error || "Verification failed",
          });
          return;
        }
        setState({
          status: "success",
          amount: data.amount ?? 0,
          alreadyProcessed: Boolean(data.alreadyProcessed),
        });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Network error verifying payment" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <>
      <h1 className="page-title">Payment status</h1>

      {state.status === "loading" && (
        <p className="page-lead">Confirming your payment with Paystack…</p>
      )}

      {state.status === "success" && (
        <>
          <p className="success">
            {state.alreadyProcessed
              ? "This payment was already recorded."
              : `Payment confirmed: ${formatNaira(state.amount)}. Your rank is updated.`}
          </p>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/" className="btn" style={{ display: "inline-flex", width: "auto" }}>
              View leaderboard
            </Link>
          </p>
        </>
      )}

      {state.status === "error" && (
        <>
          <p className="error">{state.message}</p>
          <p className="page-lead" style={{ marginTop: "1rem" }}>
            If you were charged, the webhook may still confirm the bid shortly.
            Check the leaderboard in a minute.
          </p>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/" className="btn btn-secondary" style={{ display: "inline-flex", width: "auto" }}>
              Back home
            </Link>
          </p>
        </>
      )}
    </>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<p className="page-lead">Loading…</p>}>
      <CallbackInner />
    </Suspense>
  );
}
