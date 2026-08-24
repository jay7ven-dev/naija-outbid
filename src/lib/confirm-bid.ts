import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { bids, listings, payments } from "./db/schema";
import { verifyTransaction } from "./paystack";

export type ConfirmResult =
  | { ok: true; alreadyProcessed: boolean; listingId: string; amount: number }
  | { ok: false; error: string };

/**
 * Server-side only: verify Paystack reference then apply bid idempotently.
 * DB transaction + FOR UPDATE on the listing prevents concurrent bid races.
 */
export async function confirmBidFromReference(
  reference: string,
  webhookPayload?: unknown
): Promise<ConfirmResult> {
  const verified = await verifyTransaction(reference);

  if (verified.status !== "success") {
    return { ok: false, error: `Payment not successful (${verified.status})` };
  }

  if (verified.currency !== "NGN") {
    return { ok: false, error: "Unexpected currency" };
  }

  const amountNgn = Math.round(verified.amount / 100);
  if (!Number.isInteger(amountNgn) || amountNgn <= 0) {
    return { ok: false, error: "Invalid amount" };
  }

  try {
    return await getDb().transaction(async (tx) => {
      const existingBid = await tx
        .select()
        .from(bids)
        .where(eq(bids.paystackReference, reference))
        .for("update")
        .limit(1);

      const meta = verified.metadata ?? {};
      const listingId =
        existingBid[0]?.listingId ??
        (typeof meta.listing_id === "string" ? meta.listing_id : null);

      if (!listingId) {
        return { ok: false as const, error: "Missing listing for this payment" };
      }

      if (existingBid[0]?.status === "success") {
        return {
          ok: true as const,
          alreadyProcessed: true,
          listingId,
          amount: amountNgn,
        };
      }

      const existingPay = await tx
        .select()
        .from(payments)
        .where(eq(payments.paystackReference, reference))
        .for("update")
        .limit(1);

      if (existingPay[0]?.status === "success") {
        return {
          ok: true as const,
          alreadyProcessed: true,
          listingId,
          amount: amountNgn,
        };
      }

      const listingRows = await tx
        .select()
        .from(listings)
        .where(eq(listings.id, listingId))
        .for("update")
        .limit(1);

      if (!listingRows[0]) {
        return { ok: false as const, error: "Listing not found" };
      }

      if (existingPay[0]) {
        await tx
          .update(payments)
          .set({
            status: "success",
            amount: amountNgn,
            verifiedAt: new Date(),
            rawWebhookPayload: webhookPayload ?? null,
          })
          .where(eq(payments.paystackReference, reference));
      } else {
        await tx.insert(payments).values({
          paystackReference: reference,
          amount: amountNgn,
          status: "success",
          verifiedAt: new Date(),
          rawWebhookPayload: webhookPayload ?? null,
        });
      }

      if (existingBid[0]) {
        await tx
          .update(bids)
          .set({ status: "success", amount: amountNgn })
          .where(eq(bids.paystackReference, reference));
      } else {
        await tx.insert(bids).values({
          listingId,
          amount: amountNgn,
          paystackReference: reference,
          status: "success",
        });
      }

      await tx
        .update(listings)
        .set({
          totalBidAmount: sql`${listings.totalBidAmount} + ${amountNgn}`,
        })
        .where(eq(listings.id, listingId));

      return {
        ok: true as const,
        alreadyProcessed: false,
        listingId,
        amount: amountNgn,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(message)) {
      const bid = await getDb()
        .select()
        .from(bids)
        .where(eq(bids.paystackReference, reference))
        .limit(1);
      return {
        ok: true,
        alreadyProcessed: true,
        listingId: bid[0]?.listingId ?? "",
        amount: amountNgn,
      };
    }
    throw err;
  }
}
