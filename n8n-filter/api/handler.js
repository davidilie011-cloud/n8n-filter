export default async function handler(request, response) {
  // Preluăm datele trimise de wasenderapi.com
  const webhookPayload = request.body;
  
  // Preluăm din variabilele de mediu URL-ul secret n8n și JID-ul botului
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  const MY_BOT_JID = process.env.MY_BOT_JID;
  const N8N_WEBHOOK_AUTH_SECRET = process.env.N8N_WEBHOOK_AUTH_SECRET; // Pentru autentificare (dacă e cazul)

  if (!N8N_WEBHOOK_URL || !MY_BOT_JID) {
    console.error("Variabilele de mediu nu sunt configurate!");
    return response.status(200).send('OK');
  }

  const mentionedJids = webhookPayload?.payload?.message?.mentionedJids || [];
  
  if (mentionedJids.includes(MY_BOT_JID)) {
    console.log('Botul a fost menționat! Se trimite către n8n...');
    try {
      // AM ÎNLOCUIT axios.post CU fetch
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Adaugă header-ul de autentificare dacă l-ai configurat în n8n
          'n8n-webhook-secret': N8N_WEBHOOK_AUTH_SECRET 
        },
        // Body-ul trebuie transformat manual în text JSON
        body: JSON.stringify(webhookPayload) 
      });

    } catch (error) {
      console.error('Eroare la trimiterea către n8n:', error.message);
    }
  } else {
    console.log('Mesaj ignorat (fără mențiune).');
  }

  // Întotdeauna răspundem cu succes
  response.status(200).send('OK');
}