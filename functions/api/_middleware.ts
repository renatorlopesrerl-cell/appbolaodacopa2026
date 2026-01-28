export const onRequest = async ({ request, next }) => {
  if (!request.url.includes('/api')) {
    return next()
  }

  // valida token só para API
}
