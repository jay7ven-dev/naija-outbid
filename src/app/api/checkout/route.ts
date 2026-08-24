import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { MIN_BID_NGN } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { bids, listings, payments } from "@/lib/db/schema";
import { initializeTransaction } from "@/lib/paystack";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeUrl } from "@/lib/sanitize-url";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().url().optional(),
  imageUrl: z.string().trim().url().optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  ownerEmail: z.string().trim().email(),
  ownerXHandle: z.string().trim().max(40).optional().nullable(),
  amount: z.number().int().min(MIN_BID_NGN),
  listingId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`checkout:${clientIp(req)}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 500 }
    );
  }

  let listingId = data.listingId;

  try {
    if (listingId) {
      const existing = await getDb()
        .select({ id: listings.id })
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);
      if (!existing[0]) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
    } else {
      if (!data.name || !data.url) {
        return NextResponse.json(
          { error: "name and url are required for new listings" },
          { status: 400 }
        );
      }

      const clean = sanitizeUrl(data.url);
      if (!clean.ok) {
        return NextResponse.json({ error: clean.error }, { status: 400 });
      }

      let imageUrl: string | null = data.imageUrl ?? null;
      if (imageUrl) {
        const img = sanitizeUrl(imageUrl);
        if (!img.ok) {
          return NextResponse.json(
            { error: `imageUrl: ${img.error}` },
            { status: 400 }
          );
        }
        imageUrl = img.url;
      }

      const [created] = await getDb()
        .insert(listings)
        .values({
          name: data.name,
          url: clean.url,
          imageUrl,
          category: data.category ?? null,
          ownerEmail: data.ownerEmail,
          ownerXHandle: data.ownerXHandle ?? null,
          totalBidAmount: 0,
        })
        .returning({ id: listings.id });

      listingId = created.id;
    }

    const reference = `nob_${randomUUID().replace(/-/g, "")}`;

    await getDb().insert(payments).values({
      paystackReference: reference,
      amount: data.amount,
      status: "pending",
    });

    await getDb().insert(bids).values({
      listingId: listingId!,
      amount: data.amount,
      paystackReference: reference,
      status: "pending",
    });

    const init = await initializeTransaction({
      email: data.ownerEmail,
      amountNgn: data.amount,
      reference,
      callbackUrl: `${appUrl}/payment/callback`,
      metadata: {
        listing_id: listingId,
        custom_fields: [
          { display_name: "Listing ID", variable_name: "listing_id", value: listingId },
        ],
      },
    });

    return NextResponse.json({
      authorizationUrl: init.authorization_url,
      reference: init.reference,
      listingId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
