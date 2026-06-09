import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

serve(async (req) => {
  try {
    // 1. Validar a chave de autorização
    const authHeader = req.headers.get('Authorization')
    const secret = Deno.env.get('RC_WEBHOOK_AUTH')

    if (!authHeader || authHeader.replace('Bearer ', '') !== secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // 2. Obter o payload
    const body = await req.json()
    const event = body.event

    if (!event) {
      return new Response(JSON.stringify({ error: 'No event found' }), { status: 400 })
    }

    // 3. Extrair app_user_id (que é o user.id do Supabase)
    const appUserId = event.app_user_id
    
    // 4. Verificar se é uma compra válida
    if (event.type === 'INITIAL_PURCHASE' || event.type === 'NON_RENEWING_PURCHASE') {
      
      // 5. Instanciar o cliente admin do Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase credentials")
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // 6. Atualizar a tabela de utilizadores (profiles)
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_pro: true })
        .eq('id', appUserId)

      if (error) {
        console.error("Error updating profile:", error)
        return new Response(JSON.stringify({ error: 'Failed to update user profile' }), { status: 500 })
      }
      
      console.log(`Successfully updated user ${appUserId} to PRO via RevenueCat webhook`)
    } else {
        console.log(`Ignored RevenueCat event type: ${event.type}`)
    }

    // 7. Retornar 200 OK
    return new Response(JSON.stringify({ received: true }), { status: 200 })
    
  } catch (error: any) {
    console.error("Webhook error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
