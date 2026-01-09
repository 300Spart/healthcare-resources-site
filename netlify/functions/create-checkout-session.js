const Stripe = require("stripe");

exports.handler = async (event) => {
  // Always return JSON
  const headers = { "Content-Type": "application/json" };

  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    // Parse body safely
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    const { priceId } = body;

    // Helpful log for Netlify function logs
    console.log("Received priceId:", priceId);

    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing or invalid priceId (must start with price_)" }),
      };
    }

    // Ensure secret key exists
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing STRIPE_SECRET_KEY in environment variables" }),
      };
    }

    // Initialize Stripe
    const stripe = new Stripe(secretKey);

    // Build a reliable site URL (works even if process.env.URL isn't set how you expect)
    const siteUrl =
      process.env.URL ||
      (event.headers && (event.headers.origin || `https://${event.headers.host}`));

    if (!siteUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Could not determine site URL for redirect" }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/success.html`,
      cancel_url: `${siteUrl}/cancel.html`,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe error:", err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
