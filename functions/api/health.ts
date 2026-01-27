export const onRequestGet = async () => {
    return new Response(
        JSON.stringify({ status: 'ok', platform: 'Cloudflare Pages' }),
        { headers: { 'Content-Type': 'application/json' } }
    )
}
