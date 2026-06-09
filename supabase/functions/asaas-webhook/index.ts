import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

serve(async (req) => {
  try {
    const payload = await req.json()
    
    // Check if it is a payment received event
    if (payload.event === 'PAYMENT_RECEIVED' || payload.event === 'PAYMENT_CONFIRMED') {
      const payment = payload.payment
      const userId = payment.externalReference

      if (userId) {
        // Initialize Supabase admin client to bypass RLS
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!supabaseUrl || !supabaseServiceKey) {
             throw new Error("Missing Supabase credentials")
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Update the user's profile
        const { error } = await supabase
          .from('profiles')
          .update({ is_pro: true })
          .eq('id', userId)

        if (error) {
          console.error("Supabase Update Error:", error)
          throw new Error("Erro ao atualizar o perfil do usuario")
        }
        
        console.log(`User ${userId} upgraded to PRO via Asaas webhook.`)
      } else {
        console.warn("Webhook received without externalReference (userId)")
      }
    }

    // Always return 200 OK to Asaas
    return new Response("OK", { status: 200 })

  } catch (error: any) {
    console.error("Webhook Error:", error)
    // Asaas might retry if it fails, but we should usually return 200 unless it's a critical infrastructure failure
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }
})
