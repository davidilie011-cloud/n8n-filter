import { Pool } from 'pg';

// Configurarea conexiunii la baza de date folosind variabile de mediu
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

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

  const groupId = webhookPayload?.data?.messages?.key?.remoteJid;
  const mentionedJids = webhookPayload?.data?.messages?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  console.log('Payload primit:', JSON.stringify(webhookPayload, null, 2));
  console.log('JID-uri menționate în mesaj:', mentionedJids);
  console.log('JID-ul botului:', MY_BOT_JID);
  console.log('Group ID:', groupId);

  if (mentionedJids.includes(MY_BOT_JID)) {
    console.log('Botul a fost menționat! Se trimite către n8n...');
    try {
      const query = `
      SELECT EXISTS (
        SELECT 1
        FROM primarii
        WHERE whatsapp_group_id = $1
      );
      `;
      const values = [groupId];
      
      const result = await pool.query(query, values);
      const isValidRequest = result.rows[0].exists;
      if (isValidRequest) {
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
      } else {
        console.log(`Mesaj ignorat de la grupul ${groupId} (grup neînregistrat).`);
      }
    } catch (error) {
      console.error('Eroare la trimiterea către n8n:', error.message);
    }
  } else {
    try {
    // --- Interogare la baza de date ---
    // Verificăm dacă grupul este aprobat ȘI dacă LID-ul menționat este cel al botului nostru
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM primarii
        WHERE whatsapp_group_id = $1 AND bot_lid = ANY($2::text[])
      );
    `;
    const values = [groupId, mentionedJids];
    
    const result = await pool.query(query, values);
    const isValidRequest = result.rows[0].exists;

    if (isValidRequest) {
      console.log(`Cerere validă de la grupul ${groupId}. Se trimite către n8n...`);
      // Folosim fetch, care este nativ și nu necesită dependențe
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
    } else {
      console.log(`Mesaj ignorat de la grupul ${groupId} (grup neînregistrat sau mențiune invalidă).`);
    }

  } catch (error) {
    console.error('Eroare la procesarea webhook-ului:', error.message);
  }
}

  // Întotdeauna răspundem cu succes
  response.status(200).send('OK');
}