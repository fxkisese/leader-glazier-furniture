import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("M-Pesa Callback received:", JSON.stringify(body, null, 2));

    const { Body } = body;

    if (!Body?.stkCallback) {
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { stkCallback } = Body;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (ResultCode === 0) {
      // Payment successful — extract metadata
      const items = CallbackMetadata?.Item || [];
      const getValue = (name: string) => items.find((i: any) => i.Name === name)?.Value;

      const amountPaid = getValue("Amount") || 0;
      const mpesaReceiptNumber = getValue("MpesaReceiptNumber") || "";
      const transactionDate = getValue("TransactionDate") || "";
      const phoneNumber = getValue("PhoneNumber") || "";

      console.log("Payment successful:", { amountPaid, mpesaReceiptNumber, phoneNumber });

      // Find the order by CheckoutRequestID
      const { data: order, error: findError } = await supabase
        .from("orders")
        .select("*")
        .eq("mpesa_checkout_request_id", CheckoutRequestID)
        .single();

      if (findError || !order) {
        console.error("Order not found for CheckoutRequestID:", CheckoutRequestID, findError);
        return new Response(
          JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine payment status
      const newAmountPaid = (order.amount_paid || 0) + Number(amountPaid);
      const balanceDue = order.total_amount - newAmountPaid;
      const paymentStatus = balanceDue <= 0 ? "paid" : "partial";

      // Update the order
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          amount_paid: newAmountPaid,
          balance_due: Math.max(0, balanceDue),
          mpesa_receipt_number: mpesaReceiptNumber,
          payment_status: paymentStatus,
          order_status: "confirmed",
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      } else {
        console.log(`Order ${order.id} updated: ${paymentStatus}, paid: ${newAmountPaid}`);
      }

    } else {
      // Payment failed or cancelled
      console.log("Payment failed/cancelled:", ResultDesc);

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "failed",
        })
        .eq("mpesa_checkout_request_id", CheckoutRequestID);

      if (updateError) {
        console.error("Failed to update failed order:", updateError);
      }
    }

    // Always respond with success to Safaricom
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Callback processing error:", err);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
