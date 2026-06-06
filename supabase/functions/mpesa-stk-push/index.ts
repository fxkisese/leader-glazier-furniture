import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, amount, product_id, product_name, product_image, product_price, customer_name, customer_email, delivery_address, payment_type } = await req.json();

    if (!phone || !amount || !product_name || !customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount, product_name, customer_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number — ensure it starts with 254
    let formattedPhone = phone.replace(/\s+/g, "").replace(/^0/, "254").replace(/^\+/, "");
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    // Get Daraja credentials from environment
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE") || "174379"; // Sandbox default
    const passkey = Deno.env.get("MPESA_PASSKEY") || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; // Sandbox default
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL");
    const environment = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox";

    const baseUrl = environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // Step 1: Get OAuth token
    const authString = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: { Authorization: `Basic ${authString}` },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Token error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with M-Pesa", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Step 2: Generate timestamp and password
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // Step 3: Initiate STK Push
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount), // M-Pesa requires whole numbers
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`,
      AccountReference: `CG-${Date.now().toString(36).toUpperCase()}`,
      TransactionDesc: `Payment for ${product_name}`,
    };

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkRes.json();

    if (stkData.ResponseCode !== "0") {
      console.error("STK Push error:", stkData);
      return new Response(
        JSON.stringify({ error: "Failed to initiate M-Pesa payment", details: stkData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Create order record in Supabase
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
        customer_phone: formattedPhone,
        customer_email: customer_email || null,
        delivery_address: delivery_address || null,
        payment_method: "mpesa",
        payment_type: payment_type || "full",
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        amount_paid: 0,
        balance_due: totalAmount,
        mpesa_checkout_request_id: stkData.CheckoutRequestID,
        payment_status: "pending",
        order_status: "new",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      // Still return success for STK push — order can be reconciled later
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "STK Push sent. Check your phone.",
        checkout_request_id: stkData.CheckoutRequestID,
        merchant_request_id: stkData.MerchantRequestID,
        order_id: order?.id || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
