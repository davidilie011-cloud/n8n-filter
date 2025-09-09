import axios from 'axios';

export default async function handler(request, response) {
  const webhookPayload = request.body;
  
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  const MY_BOT_JID = process.env.MY_BOT_JID;
  // Preluăm secretul pentru autentificare
  const N8N_WEBHOOK_AUTH_SECRET = process.env.N8N_WEBHOOK_AUTH_SECRET;

  if (!N8N_WEBHOOK_URL || !MY_BOT_JID || !N8N_WEBHOOK_AUTH_SECRET) {
    console.error("Variabilele de mediu nu sunt configurate complet!");
    return response.status(200).send('OK');
  }

  const mentionedJids = webhookPayload?.payload?.message?.mentionedJids || [];
  
  if (mentionedJids.includes(MY_BOT_JID)) {
    console.log('Botul a fost menționat! Se trimite către n8n...');
    try {
      // Configurăm request-ul către n8n
      await axios.post(N8N_WEBHOOK_URL, webhookPayload, {
        // ADAUGĂM AICI HEADER-UL DE AUTENTIFICARE
        headers: {
          'n8n-webhook-secret': N8N_WEBHOOK_AUTH_SECRET
        }
      });
    } catch (error) {
      console.error('Eroare la trimiterea către n8n:', error.message);
    }
  } else {
    console.log('Mesaj ignorat (fără mențiune).');
  }

  response.status(200).send('OK');
}