import fs from 'fs';
import path from 'path';
import { Property, Lead, KnowledgeBaseEntry, Message, UnknownQuery, Notification } from './types.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface DatabaseSchema {
  property: Property;
  leads: Lead[];
  knowledge_base: KnowledgeBaseEntry[];
  messages: Message[];
  unknown_queries: UnknownQuery[];
  notifications: Notification[];
}

const DEFAULT_DB: DatabaseSchema = {
  property: {
    id: 1,
    title: "2-комнатная квартира",
    price: 35000000,
    address: "Астана, ул. Сарыарка 10",
    rooms: 2,
    area: 62,
    floor: 5,
    floors_total: 9,
    year_built: 2018,
    description: "Светлая, уютная и угловая квартира с отличным ремонтом в престижном районе. Окна выходят во двор. Тихий подъезд, доброжелательные соседи, детская площадка перед домом.",
    is_active: true,
    viewing_hours: "10:00-20:00"
  },
  leads: [
    {
      id: "lead_1",
      name: "Иван",
      phone: "+77771234567",
      purchase_type: "mortgage",
      status: "hot",
      appointment_date: "2026-06-25",
      appointment_time: "19:00",
      notes: "Интересует ипотека от Отбасы банка. Переживает, подходит ли год постройки (2018).",
      created_at: "2026-06-20T10:15:30Z"
    },
    {
      id: "lead_2",
      name: "Марат",
      phone: "+7012345678",
      purchase_type: "cash",
      status: "warm",
      appointment_date: null,
      appointment_time: null,
      notes: "Готов купить за наличные. Интересуется торгом и тем, что остается из мебели.",
      created_at: "2026-06-21T08:30:00Z"
    },
    {
      id: "lead_3",
      name: "Анна",
      phone: "+77059876543",
      purchase_type: "undecided",
      status: "cold",
      appointment_date: null,
      appointment_time: null,
      notes: "Спросила цену в первом сообщении, на вопросы об имени и способе покупки отвечает неохотно. Сказала, подумает.",
      created_at: "2026-06-19T14:22:11Z"
    }
  ],
  knowledge_base: [
    {
      id: "kb_1",
      question: "Какая планировка в квартире?",
      answer: "Распашонка, комнаты изолированные, окна выходят на две стороны (во двор и на улицу). Санузел раздельный.",
      created_at: "2026-06-20T09:00:00Z"
    },
    {
      id: "kb_2",
      question: "Остается ли мебель в квартире после продажи?",
      answer: "Да, полностью остается встроенная кухня, кухонный гарнитур, плита, вытяжка, встроенные шкафы-купе в прихожей и спальне. Остальная мебель по договоренности.",
      created_at: "2026-06-20T09:02:00Z"
    },
    {
      id: "kb_3",
      question: "Есть ли торг?",
      answer: "Символический торг уместен только при встрече с реальным покупателем после просмотра квартиры. По телефону или в сообщениях скидок не даем.",
      created_at: "2026-06-20T09:05:00Z"
    },
    {
      id: "kb_4",
      question: "Есть ли балкон или лоджия?",
      answer: "Да, просторная застекленная лоджия (выход из спальни), полностью утеплена, проведены розетки и освещение, можно использовать как рабочую зону.",
      created_at: "2026-06-20T09:10:00Z"
    }
  ],
  messages: [
    // Lead 1 Dialogue (Hot Lead)
    {
      id: "m_1_1",
      lead_id: "lead_1",
      role: "client",
      message: "Здравствуйте! Я по поводу объявления 2-комнатной квартиры на Сарыарка.",
      created_at: "2026-06-20T10:15:30Z"
    },
    {
      id: "m_1_2",
      lead_id: "lead_1",
      role: "realtor",
      message: "Здравствуйте. Спасибо за интерес к квартире. Подскажите, пожалуйста, как я могу к вам обращаться?",
      created_at: "2026-06-20T10:16:00Z"
    },
    {
      id: "m_1_3",
      lead_id: "lead_1",
      role: "client",
      message: "Меня зовут Иван, очень приятно.",
      created_at: "2026-06-20T10:16:15Z"
    },
    {
      id: "m_1_4",
      lead_id: "lead_1",
      role: "realtor",
      message: "Взаимно приятно, Иван! Подскажите, покупку рассматриваете:\n\n1. За наличный расчет\n2. Через ипотеку\n3. Пока не определились",
      created_at: "2026-06-20T10:16:45Z"
    },
    {
      id: "m_1_5",
      lead_id: "lead_1",
      role: "client",
      message: "Покупать буду в ипотеку через Отбасы банк, они у меня одобрены.",
      created_at: "2026-06-20T10:17:20Z"
    },
    {
      id: "m_1_6",
      lead_id: "lead_1",
      role: "realtor",
      message: "Отлично! Да, наша квартира полностью подходит под ипотечные программы большинства банков Казахстана, включая Отбасы банк, так как год постройки 2018 и документы в полном порядке. Если вам удобно, можем организовать просмотр квартиры. На какую дату и время вам будет удобно приехать?",
      created_at: "2026-06-20T10:18:00Z"
    },
    {
      id: "m_1_7",
      lead_id: "lead_1",
      role: "client",
      message: "Давайте 25 июня в 19:00, после работы успею.",
      created_at: "2026-06-20T10:18:40Z"
    },
    {
      id: "m_1_8",
      lead_id: "lead_1",
      role: "realtor",
      message: "Записал вас на просмотр квартиры! Ждем вас 25.06.2026 в 19:00 по адресу: Астана, ул. Сарыарка 10. Перед выездом я вам напомню.",
      created_at: "2026-06-20T10:19:00Z"
    },

    // Lead 2 Dialogue (Warm Lead asking questions)
    {
      id: "m_2_1",
      lead_id: "lead_2",
      role: "client",
      message: "Добрый день! Объявление актуально? Цена 35 млн окончательная?",
      created_at: "2026-06-21T08:30:00Z"
    },
    {
      id: "m_2_2",
      lead_id: "lead_2",
      role: "realtor",
      message: "Здравствуйте. Спасибо за интерес к квартире. Подскажите, пожалуйста, как я могу к вам обращаться?",
      created_at: "2026-06-21T08:31:00Z"
    },
    {
      id: "m_2_3",
      lead_id: "lead_2",
      role: "client",
      message: "Марат меня зовут. Я с наличкой сразу готов зайти, если уступите немного.",
      created_at: "2026-06-21T08:31:30Z"
    },
    {
      id: "m_2_4",
      lead_id: "lead_2",
      role: "realtor",
      message: "Рад нашему знакомству, Марат. Подскажите, покупку рассматриваете:\n\n1. За наличный расчет\n2. Через ипотеку\n3. Пока не определились",
      created_at: "2026-06-21T08:32:00Z"
    },
    {
      id: "m_2_5",
      lead_id: "lead_2",
      role: "client",
      message: "Я же написал, за наличный расчет.",
      created_at: "2026-06-21T08:32:20Z"
    },
    {
      id: "m_2_6",
      lead_id: "lead_2",
      role: "realtor",
      message: "Понял вас, спасибо за уточнение. Символический торг уместен только при встрече с реальным покупателем после просмотра квартиры. По телефону или в сообщениях скидок не даем.",
      created_at: "2026-06-21T08:33:00Z"
    },
    {
      id: "m_2_7",
      lead_id: "lead_2",
      role: "client",
      message: "А что по поводу мебели? Все что на фото остается?",
      created_at: "2026-06-21T08:33:45Z"
    },
    {
      id: "m_2_8",
      lead_id: "lead_2",
      role: "realtor",
      message: "Да, Марат. Плита, вытяжка, встроенная кухня, кухонный гарнитур и встроенные шкафы-купе в прихожей и спальне остаются полностью. Остальная мебель и техника обсуждаются при встрече.",
      created_at: "2026-06-21T08:34:20Z"
    },

    // Lead 3 Dialogue (Cold Lead)
    {
      id: "m_3_1",
      lead_id: "lead_3",
      role: "client",
      message: "Цена квартира какая?",
      created_at: "2026-06-19T14:22:11Z"
    },
    {
      id: "m_3_2",
      lead_id: "lead_3",
      role: "realtor",
      message: "Здравствуйте. Спасибо за интерес к квартире. Подскажите, пожалуйста, как я могу к вам обращаться?",
      created_at: "2026-06-19T14:22:50Z"
    },
    {
      id: "m_3_3",
      lead_id: "lead_3",
      role: "client",
      message: "Вы цену скажите.",
      created_at: "2026-06-19T14:23:10Z"
    },
    {
      id: "m_3_4",
      lead_id: "lead_3",
      role: "realtor",
      message: "Стоимость нашей 2-комнатной квартиры составляет 35 000 000 тенге.",
      created_at: "2026-06-19T14:23:40Z"
    },
    {
      id: "m_3_5",
      lead_id: "lead_3",
      role: "client",
      message: "Ок, понятно, дороговато. Я подумаю.",
      created_at: "2026-06-19T14:24:15Z"
    }
  ],
  unknown_queries: [
    {
      id: "q_1",
      lead_id: "lead_2",
      lead_name: "Марат",
      question: "Какое КСК обслуживает дом и сколько выходят коммунальные услуги зимой?",
      is_answered: false,
      answer: null,
      created_at: "2026-06-21T08:35:00Z"
    }
  ],
  notifications: [
    {
      id: "n_1",
      type: "new_lead",
      lead_id: "lead_1",
      title: "🏠 Новый лид на квартиру",
      body: "Иван (+77771234567) записался на просмотр квартиры на 25.06.2026 в 19:00. Способ покупки: Ипотека.",
      created_at: "2026-06-20T10:19:05Z",
      is_read: false
    },
    {
      id: "n_2",
      type: "unknown_question",
      lead_id: "lead_2",
      title: "❓ Новый неизвестный вопрос",
      body: "Марат спросил: 'Какое КСК обслуживает дом и сколько выходят коммунальные услуги зимой?'. Требуется ответ владельца.",
      created_at: "2026-06-21T08:35:05Z",
      is_read: false
    }
  ]
};

// Database class helper helper
export class DB {
  static getDB(): DatabaseSchema {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return DEFAULT_DB;
    }
  }

  static saveDB(data: DatabaseSchema) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  static getProperty(): Property {
    return this.getDB().property;
  }

  static updateProperty(property: Partial<Property>): Property {
    const db = this.getDB();
    db.property = { ...db.property, ...property };
    this.saveDB(db);
    return db.property;
  }

  static getLeads(): Lead[] {
    return this.getDB().leads;
  }

  static addLead(lead: Lead): Lead {
    const db = this.getDB();
    db.leads.push(lead);
    this.saveDB(db);
    return lead;
  }

  static updateLead(id: string, updates: Partial<Lead>): Lead | null {
    const db = this.getDB();
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    db.leads[idx] = { ...db.leads[idx], ...updates };
    this.saveDB(db);
    return db.leads[idx];
  }

  static deleteLead(id: string): boolean {
    const db = this.getDB();
    const filterLen = db.leads.length;
    db.leads = db.leads.filter(l => l.id !== id);
    db.messages = db.messages.filter(m => m.lead_id !== id);
    db.unknown_queries = db.unknown_queries.filter(q => q.lead_id !== id);
    db.notifications = db.notifications.filter(n => n.lead_id !== id);
    this.saveDB(db);
    return db.leads.length < filterLen;
  }

  static getKB(): KnowledgeBaseEntry[] {
    return this.getDB().knowledge_base;
  }

  static addKBEntry(question: string, answer: string): KnowledgeBaseEntry {
    const db = this.getDB();
    const entry: KnowledgeBaseEntry = {
      id: "kb_" + Date.now(),
      question,
      answer,
      created_at: new Date().toISOString()
    };
    db.knowledge_base.push(entry);
    this.saveDB(db);
    return entry;
  }

  static updateKBEntry(id: string, question: string, answer: string): KnowledgeBaseEntry | null {
    const db = this.getDB();
    const idx = db.knowledge_base.findIndex(entry => entry.id === id);
    if (idx === -1) return null;
    db.knowledge_base[idx].question = question;
    db.knowledge_base[idx].answer = answer;
    this.saveDB(db);
    return db.knowledge_base[idx];
  }

  static deleteKBEntry(id: string): boolean {
    const db = this.getDB();
    const filterLen = db.knowledge_base.length;
    db.knowledge_base = db.knowledge_base.filter(entry => entry.id !== id);
    this.saveDB(db);
    return db.knowledge_base.length < filterLen;
  }

  static getMessages(leadId: string): Message[] {
    return this.getDB().messages.filter(m => m.lead_id === leadId);
  }

  static addMessage(leadId: string, role: 'client' | 'realtor' | 'owner' | 'system', messageText: string): Message {
    const db = this.getDB();
    const msg: Message = {
      id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      lead_id: leadId,
      role,
      message: messageText,
      created_at: new Date().toISOString()
    };
    db.messages.push(msg);
    this.saveDB(db);
    return msg;
  }

  static getUnknownQueries(): UnknownQuery[] {
    return this.getDB().unknown_queries;
  }

  static addUnknownQuery(leadId: string, leadName: string, question: string): UnknownQuery {
    const db = this.getDB();
    const q: UnknownQuery = {
      id: "q_" + Date.now(),
      lead_id: leadId,
      lead_name: leadName,
      question,
      is_answered: false,
      answer: null,
      created_at: new Date().toISOString()
    };
    db.unknown_queries.push(q);
    this.saveDB(db);
    return q;
  }

  static answerUnknownQuery(id: string, answer: string): UnknownQuery | null {
    const db = this.getDB();
    const idx = db.unknown_queries.findIndex(q => q.id === id);
    if (idx === -1) return null;
    db.unknown_queries[idx].is_answered = true;
    db.unknown_queries[idx].answer = answer;
    // Autocommit to KB
    const q = db.unknown_queries[idx];
    this.addKBEntry(q.question, answer);
    this.saveDB(db);
    return db.unknown_queries[idx];
  }

  static getNotifications(): Notification[] {
    return this.getDB().notifications;
  }

  static addNotification(type: 'new_lead' | 'unknown_question' | 'viewing_scheduled', leadId: string, title: string, body: string): Notification {
    const db = this.getDB();
    const notification: Notification = {
      id: "n_" + Date.now(),
      type,
      lead_id: leadId,
      title,
      body,
      created_at: new Date().toISOString(),
      is_read: false
    };
    db.notifications.unshift(notification);
    this.saveDB(db);
    return notification;
  }

  static markNotificationsRead(): void {
    const db = this.getDB();
    db.notifications.forEach(n => n.is_read = true);
    this.saveDB(db);
  }
}
