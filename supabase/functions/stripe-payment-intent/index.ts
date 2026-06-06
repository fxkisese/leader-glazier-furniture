import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { amount, currency, product_id, product_name, product_image, product_price, customer_name, customer_phone, customer_email, delivery_address, payment_type } = await req.json();

    if (!amount || !product_name || !customer_name || !customer_phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, product_name, customer_name, customer_phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe PaymentIntent — amount in smallest currency unit (cents for USD, cents for KES)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency || "kes",
      metadata: {
        product_name,
        customer_name,
        customer_phone,
        payment_type: payment_type || "full",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create order record in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const depositAmount = payment_type === "deposit" ? Math.ceil(amount) : 0;
    const totalAmount = payment_type === "deposit" ? Math.ceil(amount * 2) : Math.ceil(amount);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        product_id: product_id || null,
        product_name,
        product_image: product_image || null,
        product_price: product_price || totalAmount,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        delivery_address: delivery_address || null,
        payment_method: "stripe",
        payment_type: payment_type || "full",
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        amount_paid: 0,
        balance_due: totalAmount,
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: "pending",
        order_status: "new",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        order_id: order?.id || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Stripe error:", err);
    return new Response(
      JSON.stringify({ error: "Payment initialization failed", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
