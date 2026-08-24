"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { MIN_BID_NGN } from "@/lib/constants";
import { formatNaira } from "@/lib/format";

function SubmitForm() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId") ?? undefined;
  const boosting = Boolean(listingId);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    if (!Number.isInteger(amount) || amount < MIN_BID_NGN) {
      setError(`Bid must be a whole number ≥ ${formatNaira(MIN_BID_NGN)}`);
      setPending(false);
      return;
    }

    const payload: Record<string, unknown> = {
      ownerEmail: String(fd.get("ownerEmail") || "").trim(),
      ownerXHandle: String(fd.get("ownerXHandle") || "").trim() || null,
      amount,
    };

    if (boosting) {
      payload.listingId = listingId;
    } else {
      payload.name = String(fd.get("name") || "").trim();
      payload.url = String(fd.get("url") || "").trim();
      payload.imageUrl = String(fd.get("imageUrl") || "").trim() || null;
      payload.category = String(fd.get("category") || "").trim() || null;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        authorizationUrl?: string;
        error?: unknown;
      };

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Checkout failed. Check your inputs.";
        setError(msg);
        setPending(false);
        return;
      }

      if (!data.authorizationUrl) {
        setError("No Paystack URL returned");
        setPending(false);
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error");
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="page-title">{boosting ? "Boost a listing" : "Submit & bid"}</h1>
      <p className="page-lead">
        {boosting
          ? `Add at least ${formatNaira(MIN_BID_NGN)} to this listing’s total.`
          : `Create a listing and pay at least ${formatNaira(MIN_BID_NGN)} via Paystack to appear on the board.`}
      </p>

      <form className="form" onSubmit={onSubmit}>
        {!boosting && (
          <>
            <div className="field">
              <label htmlFor="name">Product / project name</label>
              <input id="name" name="name" required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="url">URL</label>
              <input
                id="url"
                name="url"
                type="url"
                required
                placeholder="https://…"
              />
            </div>
            <div className="field">
              <label htmlFor="imageUrl">Logo / image URL (optional)</label>
              <input id="imageUrl" name="imageUrl" type="url" />
            </div>
            <div className="field">
              <label htmlFor="category">Category (optional)</label>
              <input id="category" name="category" maxLength={60} />
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="ownerEmail">Email (for Paystack receipt)</label>
          <input id="ownerEmail" name="ownerEmail" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="ownerXHandle">X / Twitter handle (optional)</label>
          <input id="ownerXHandle" name="ownerXHandle" maxLength={40} />
        </div>
        <div className="field">
          <label htmlFor="amount">Bid amount (₦, whole naira)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={MIN_BID_NGN}
            step={1}
            defaultValue={MIN_BID_NGN}
            required
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Redirecting to Paystack…" : "Pay with Paystack"}
        </button>
      </form>
    </>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<p className="page-lead">Loading…</p>}>
      <SubmitForm />
    </Suspense>
  );
}
