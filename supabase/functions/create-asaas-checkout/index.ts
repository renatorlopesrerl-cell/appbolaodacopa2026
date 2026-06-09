import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, email, name, cpfCnpj } = await req.json()

    if (!userId || !email || !name || !cpfCnpj) {
      return new Response(JSON.stringify({ error: 'Faltando userId, email, name ou cpf' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    if (!ASAAS_API_KEY) {
       throw new Error("ASAAS_API_KEY is not set.")
    }

    let customerId = '';

    // 1. Search for existing customer
    const searchRes = await fetch(`https://api.asaas.com/v3/customers?email=${email}`, {
      headers: { 'access_token': ASAAS_API_KEY }
    })
    const searchData = await searchRes.json()

    if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
        // Update customer to ensure CPF is set and notifications are disabled
        await fetch(`https://api.asaas.com/v3/customers/${customerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
            body: JSON.stringify({ cpfCnpj: cpfCnpj, notificationDisabled: true })
        })
    } else {
        // Create new customer with notifications disabled
        const customerRes = await fetch('https://api.asaas.com/v3/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
            body: JSON.stringify({ name: name, email: email, cpfCnpj: cpfCnpj, notificationDisabled: true })
        })
        const customerData = await customerRes.json()
        if (!customerRes.ok) {
            throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(customerData)}`)
        }
        customerId = customerData.id
    }

    // 2. Create Payment
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    const formattedDueDate = dueDate.toISOString().split('T')[0]

    const paymentRes = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Let the user choose
        value: 6.99,
        dueDate: formattedDueDate,
        description: 'Acesso Pro - Palpiteiro da Copa',
        externalReference: userId
      })
    })

    const paymentData = await paymentRes.json()

    if (!paymentRes.ok) {
        console.error("Asaas Payment Error:", paymentData)
        throw new Error(`Erro ao gerar link de pagamento: ${JSON.stringify(paymentData)}`)
    }

    return new Response(JSON.stringify({ invoiceUrl: paymentData.invoiceUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Error creating asaas checkout:", error)
    return new Response(JSON.stringify({ error: error.message, isError: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
