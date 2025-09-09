import axios from 'axios';

export default async function handler(request, response) {
  // Preluăm datele trimise de wasenderapi.com
  const webhookPayload = request.body;

  // Preluăm din variabilele de mediu URL-ul secret n8n și JID-ul botului
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  const MY_BOT_JID = process.env.MY_BOT_JID;

  // Verificăm dacă variabilele de mediu esențiale sunt setate
  if (!N8N_WEBHOOK_URL || !MY_BOT_JID) {
    console.error("Variabilele de mediu nu sunt configurate!");
    // Răspundem cu OK pentru a nu genera erori în wasenderapi.com
    return response.status(200).send('OK');
  }

  // Calea către lista de mențiuni (poate necesita ajustare)
  const mentionedJids = webhookPayload?.payload?.message?.mentionedJids || [];

  // Verificăm dacă JID-ul botului nostru se află în lista de mențiuni
  if (mentionedJids.includes(MY_BOT_JID)) {
    console.log('Botul a fost menționat! Se trimite către n8n...');
    try {
      // Trimitem mai departe ACELEAȘI date către n8n
      await axios.post(N8N_WEBHOOK_URL, webhookPayload);
    } catch (error) {
      console.error('Eroare la trimiterea către n8n:', error.message);
    }
  }

  response.status(200).send('OK');
}