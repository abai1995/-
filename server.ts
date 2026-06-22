import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DB } from './src/db.js';
import { analyzeClientMessage, generateRealtorResponse } from './src/realtorAI.js';
import { Lead, PurchaseType, LeadStatus } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // 1. Get/Set Property Information
  app.get('/api/property', (req, res) => {
    try {
      const property = DB.getProperty();
      res.json(property);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/property', (req, res) => {
    try {
      const updated = DB.updateProperty(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Leads Management
  app.get('/api/leads', (req, res) => {
    try {
      const leads = DB.getLeads();
      res.json(leads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/leads/:id', (req, res) => {
    try {
      const success = DB.deleteLead(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Messages log per Lead
  app.get('/api/leads/:id/messages', (req, res) => {
    try {
      const messages = DB.getMessages(req.params.id);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Knowledge Base Operations
  app.get('/api/kb', (req, res) => {
    try {
      const entries = DB.getKB();
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/kb', (req, res) => {
    try {
      const { question, answer } = req.body;
      if (!question || !answer) {
        return res.status(400).json({ error: "Question and Answer are required." });
      }
      const entry = DB.addKBEntry(question, answer);
      res.json(entry);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/kb/:id', (req, res) => {
    try {
      const { question, answer } = req.body;
      const updated = DB.updateKBEntry(req.params.id, question, answer);
      if (!updated) return res.status(404).json({ error: "Entry not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/kb/:id', (req, res) => {
    try {
      const success = DB.deleteKBEntry(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Unanswered Owner Queries
  app.get('/api/queries', (req, res) => {
    try {
      const queries = DB.getUnknownQueries();
      res.json(queries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/queries/:id/answer', (req, res) => {
    try {
      const { answer } = req.body;
      if (!answer) return res.status(400).json({ error: "Answer required" });
      const query = DB.answerUnknownQuery(req.params.id, answer);
      if (!query) return res.status(404).json({ error: "Query not found" });

      // Simulate sending answer back dynamically to client messages
      DB.addMessage(query.lead_id, 'owner', answer);
      DB.addMessage(query.lead_id, 'realtor', `Владелец квартиры сообщил ответ на ваш вопрос:\n\n"${answer}"\n\nМогу ли я помочь вам записаться на просмотр квартиры?`);

      // Add simple system notice and lead update notification
      DB.addNotification(
        'new_lead',
        query.lead_id,
        "✉️ Ответ отправлен клиенту",
        `Вы успешно ответили на вопрос от ${query.lead_name}: "${query.question}". ИИ переслал ответ в WhatsApp.`
      );

      res.json({ success: true, query });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Notifications for Owner panel
  app.get('/api/notifications', (req, res) => {
    try {
      const notifications = DB.getNotifications();
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/read', (req, res) => {
    try {
      DB.markNotificationsRead();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. KPIs details
  app.get('/api/kpi', (req, res) => {
    try {
      const leads = DB.getLeads();
      const hotCount = leads.filter(l => l.status === 'hot').length;
      const warmCount = leads.filter(l => l.status === 'warm').length;
      const coldCount = leads.filter(l => l.status === 'cold').length;
      const viewingCount = leads.filter(l => l.appointment_date !== null).length;
      const contactsCollected = leads.filter(l => l.name !== null).length;
      const conversionRate = leads.length > 0 ? Math.round((viewingCount / leads.length) * 100) : 0;

      res.json({
        totalLeads: leads.length,
        hotCount,
        warmCount,
        coldCount,
        viewingCount,
        contactsCollected,
        conversionRate
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Core WhatsApp Simulation Dispatch Hook
  app.post('/api/simulation/receive', async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: "Phone and Message are required for simulation." });
      }

      const property = DB.getProperty();
      const kbEntries = DB.getKB();
      const leads = DB.getLeads();

      // Look up existing lead or create a new one
      let lead = leads.find(l => l.phone === phone);
      let isNewLead = false;

      if (!lead) {
        isNewLead = true;
        lead = {
          id: "lead_" + Date.now(),
          name: null,
          phone: phone,
          purchase_type: null,
          status: 'cold',
          appointment_date: null,
          appointment_time: null,
          notes: "Новый клиент из симулятора WhatsApp.",
          created_at: new Date().toISOString()
        };
        DB.addLead(lead);
      }

      // 1. Log Client message
      DB.addMessage(lead.id, 'client', message);

      // Fetch full history logs for context
      const history = DB.getMessages(lead.id);

      // 2. Perform AI Extract/Analysis pass
      const analysis = await analyzeClientMessage(message, property, kbEntries);

      // Update lead parameters dynamically based on analyzed results
      const updates: Partial<Lead> = {};
      if (analysis.extracted_name && !lead.name) {
        updates.name = analysis.extracted_name;
      }
      if (analysis.extracted_purchase_type && !lead.purchase_type) {
        updates.purchase_type = analysis.extracted_purchase_type;
      }
      if (analysis.appointment_date) {
        updates.appointment_date = analysis.appointment_date;
      }
      if (analysis.appointment_time) {
        updates.appointment_time = analysis.appointment_time;
      }

      // Check if viewing newly scheduled, send notification if yes
      const newlyBooked = analysis.appointment_date && analysis.appointment_time && (!lead.appointment_date || !lead.appointment_time);

      // Combine previous props with updates to recalculate lead quality
      const resolvedName = updates.name || lead.name;
      const resolvedPurchase = updates.purchase_type || lead.purchase_type;
      const resolvedApptDate = updates.appointment_date || lead.appointment_date;
      
      let finalStatus: LeadStatus = lead.status;
      if (resolvedName && resolvedPurchase && resolvedApptDate) {
        finalStatus = 'hot';
      } else if (history.length > 2) {
        finalStatus = 'warm';
      } else {
        finalStatus = 'cold';
      }
      updates.status = finalStatus;

      // Update Lead records in Database
      const updatedLead = DB.updateLead(lead.id, updates) || lead;

      // Handle owner alerts for new lead creation
      if (isNewLead) {
        DB.addNotification(
          'new_lead',
          updatedLead.id,
          "🏠 Новый лид",
          `Появился новый диалог в WhatsApp (${updatedLead.phone}). ИИ начал общение.`
        );
      }

      // Formulate agent text response
      let aiResponseText = "";
      
      if (analysis.is_unknown_question && analysis.unknown_question_text) {
        // Unknown question triggers notification and placeholder holding response
        aiResponseText = "Хороший вопрос, сейчас уточню у владельца квартиры и вернусь с ответом в ближайшее время!";
        
        // Log in owner questions database
        DB.addUnknownQuery(updatedLead.id, resolvedName || updatedLead.phone, analysis.unknown_question_text);
        
        // Push notification to owner
        DB.addNotification(
          'unknown_question',
          updatedLead.id,
          `❓ Новый неизвестный вопрос от ${resolvedName || updatedLead.phone}`,
          `Клиент спрашивает: "${analysis.unknown_question_text}". Ответьте в панели, чтобы ИИ переслал ответ.`
        );
      } else {
        // Known details: generate response
        aiResponseText = await generateRealtorResponse(updatedLead, message, history, property, kbEntries);
      }

      // Log AI response
      DB.addMessage(updatedLead.id, 'realtor', aiResponseText);

      // Add scheduled viewing notification if newly generated
      if (newlyBooked) {
        DB.addNotification(
          'viewing_scheduled',
          updatedLead.id,
          `🏠 Просмотр записан: ${resolvedName || updatedLead.phone}`,
          `Имя: ${resolvedName || 'неизвестно'}\nТелефон: ${updatedLead.phone}\nСпособ покупки: ${resolvedPurchase === 'cash' ? 'Наличные' : resolvedPurchase === 'mortgage' ? 'Ипотека' : 'Не определился'}\nПросмотр: ${updates.appointment_date} в ${updates.appointment_time}`
        );
      }

      res.json({
        lead: updatedLead,
        messages: DB.getMessages(updatedLead.id)
      });
    } catch (err: any) {
      console.error("Simulation endpoint failure:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Hot Leads feed endpoint (returns only leads matching status 'hot')
  app.get('/api/leads/hot', (req, res) => {
    try {
      const leads = DB.getLeads();
      const hotLeads = leads.filter(l => l.status === 'hot');
      res.json(hotLeads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reminders simulator endpoint
  app.post('/api/simulation/reminder', (req, res) => {
    try {
      const { leadId, hours } = req.body;
      const lead = DB.getLeads().find(l => l.id === leadId);
      if (!lead || !lead.appointment_date) {
        return res.status(400).json({ error: "Lead must have booked appointment to send reminders." });
      }

      const reminderText = `🔔 Напоминание WhatsApp (за ${hours} ч. до просмотра):\n\nЗдравствуйте, ${lead.name || 'Гость'}. Напоминаем, что вы записаны на просмотр 2-комнатной квартиры сегодня (${lead.appointment_date}) в ${lead.appointment_time}.\n\nЖдем вас по адресу: ${DB.getProperty().address}.`;

      DB.addMessage(lead.id, 'system', reminderText);
      res.json({ success: true, text: reminderText });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
