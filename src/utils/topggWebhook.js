import express from 'express';
import { recordVote } from '../models/VoteModel.js';

const TOPGG_WEBHOOK_SECRET = process.env.TOPGG_WEBHOOK_SECRET;

export function setupTopggWebhook(client) {
  if (!TOPGG_WEBHOOK_SECRET) {
    console.warn('TOPGG_WEBHOOK_SECRET not found - webhook disabled');
    return null;
  }

  const app = express();
  
  app.use(express.json());
  
  app.post('/topgg/webhook', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      
      if (auth !== TOPGG_WEBHOOK_SECRET) {
        console.warn('Invalid webhook authorization');
        return res.status(401).send('Unauthorized');
      }
      
      const { type, user, bot } = req.body;
      
      if (type === 'upvote' && user && bot === process.env.BOT_ID) {
        console.log(`Vote received from user: ${user}`);
        await recordVote(user);
        
        try {
          const discordUser = await client.users.fetch(user);
          console.log(`Vote recorded for ${discordUser.username} (${user})`);
        } catch (error) {
          console.log(`Vote recorded for user ID: ${user}`);
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  const port = process.env.WEBHOOK_PORT || 3000;
  
  const server = app.listen(port, () => {
    console.log(`Top.gg webhook listening on port ${port}`);
  });
  
  return server;
}