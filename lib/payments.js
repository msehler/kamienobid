async function createStripeCheckoutSession({
  amount,
  currencyCode,
  caseId,
  email,
  name,
  origin,
}) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { mode: "demo" };
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}/?checkout=cancel&caseId=${caseId}`);
  params.set("customer_email", email);
  params.set("metadata[case_id]", caseId);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", currencyCode.toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
  params.set("line_items[0][price_data][product_data][name]", `Kamieno matter publishing fee for ${name}`);
  params.set(
    "line_items[0][price_data][product_data][description]",
    "One-time jurisdiction-aware publishing fee for a legal matter on Kamieno.",
  );

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Unable to create Stripe checkout session.");
  }

  return {
    mode: "stripe",
    sessionId: payload.id,
    redirectUrl: payload.url,
  };
}

async function fetchStripeCheckoutSession(sessionId) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Unable to verify Stripe checkout session.");
  }
  return payload;
}

module.exports = {
  createStripeCheckoutSession,
  fetchStripeCheckoutSession,
};
