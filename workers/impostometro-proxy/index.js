const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=30'
}

function saoPauloDateParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )
}

function brazilianDate(parts) {
  return `${parts.day}/${parts.month}/${parts.year}`
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: CORS_HEADERS
      })
    }

    const url = new URL(request.url)
    const today = saoPauloDateParts()
    const dataInicial =
      url.searchParams.get('dataInicial') ?? `01/01/${today.year}`
    const dataFinal = url.searchParams.get('dataFinal') ?? brazilianDate(today)
    const target = new URL('https://impostometro.com.br/Contador/Brasil')
    target.searchParams.set('dataInicial', dataInicial)
    target.searchParams.set('dataFinal', dataFinal)

    const upstream = await fetch(target, {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://impostometro.com.br/'
      }
    })
    const contentType = upstream.headers.get('content-type') ?? ''
    const body = await upstream.text()

    if (!upstream.ok || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Impostometro unavailable' }),
        { status: 502, headers: CORS_HEADERS }
      )
    }

    return new Response(body, {
      status: 200,
      headers: CORS_HEADERS
    })
  }
}
