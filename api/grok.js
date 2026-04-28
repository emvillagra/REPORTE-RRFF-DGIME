// ═══════════════════════════════════════════════════════════════
//  /api/grok.js  — Proxy Vercel para Groq API (groq.com)
//  Resuelve CORS: el browser llama a /api/grok (mismo dominio),
//  este proxy llama a api.groq.com desde el servidor.
//
//  SETUP EN VERCEL:
//  1. Copiá este archivo como /api/grok.js en tu repo
//  2. Vercel Dashboard → Settings → Environment Variables:
//       GROQ_API_KEY  =  gsk_xxxxxxxxxxxxxxxxxxxx   (tu clave de console.groq.com)
//  3. Deploy → listo
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {

  // Cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GROQ_API_KEY no configurada. Agregala en Vercel → Settings → Environment Variables.'
    });
  }

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Falta el campo "prompt"' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',  // rápido y muy capaz — alternativas: mixtral-8x7b-32768, gemma2-9b-it
        max_tokens:  1200,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'Sos un analista estratégico de gestión hospitalaria para SIPROSA (Sistema Provincial de Salud de Tucumán, Argentina). Respondés siempre en español, de forma concisa y profesional, orientado a directivos. Generás informes en HTML básico usando solo <p>, <strong>, <ul>, <li>, <ol>. Sin html/head/body/style.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText);
      return res.status(response.status).json({ error: `Groq API error ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ text });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
