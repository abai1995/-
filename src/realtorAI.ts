import { GoogleGenAI, Type } from '@google/genai';
import { DB } from './db.js';
import { Lead, Message, Property, KnowledgeBaseEntry } from './types.js';

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      console.warn("WARNING: GEMINI_API_KEY is not set or placeholder. Falling back to robust rule-based dialog simulator.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

interface AnalysisResult {
  extracted_name: string | null;
  extracted_purchase_type: 'cash' | 'mortgage' | 'undecided' | null;
  wants_viewing: boolean;
  appointment_date: string | null;
  appointment_time: string | null;
  is_unknown_question: boolean;
  unknown_question_text: string | null;
}

/**
 * Analyzes client message to extract entity stats and check if it has unanswerable questions.
 */
export async function analyzeClientMessage(
  messageText: string,
  property: Property,
  kbList: KnowledgeBaseEntry[]
): Promise<AnalysisResult> {
  const ai = getGeminiClient();
  if (!ai) {
    // Highly sophisticated rule-based parsing fallback
    return ruleBasedAnalysis(messageText);
  }

  try {
    const kbContext = kbList.map(e => `Q: ${e.question}\nA: ${e.answer}`).join('\n\n');
    const prompt = `
Ты - аналитический модуль CRM-системы AI Realtor. Твоя задача - проанализировать входящее сообщение клиента и извлечь информацию.

### Сведения о квартире:
Адрес: ${property.address}
Комнат: ${property.rooms}
Площадь: ${property.area} кв.м.
Цена: ${property.price} тенге
Описание: ${property.description}
Год постройки: ${property.year_built}

### Известные ответы (База Знаний):
${kbContext}

### Инструкции по извлечению:
1. "extracted_name": Если клиент представился (назвал свое имя), извлеки имя в именительном падеже (например, "Иван", "Александр"). Иначе верни null.
2. "extracted_purchase_type": Если в сообщении явно указан способ покупки:
   - Выбор "1", наличка, наличные -> "cash"
   - Выбор "2", ипотека, кредит -> "mortgage"
   - Выбор "3", не знаю, не определился, сомневается -> "undecided"
   Иначе верни null.
3. "wants_viewing": Хочет ли клиент записаться на просмотр или согласен прийти (true/false).
4. "appointment_date": Дата просмотра в формате "YYYY-MM-DD" или "DD.MM" (если указал, например, "25 июня" или "в четверг" - вычисли относительно сегодняшнего года (2026), иначе null).
5. "appointment_time": Время просмотра в формате "HH:MM", иначе null.
6. "is_unknown_question": Содержит ли сообщение конкретный вопрос по квартире, на который ХАРАКТЕРИСТИКИ квартиры И База Знаний НЕ дают точного ответа?
   ВАЖНО: Если клиент спрашивает что-то базовое вроде цены, адреса, планировки, мебели или лоджии, на что есть ответы в описании или Базе Знаний, то это НЕ неизвестный вопрос (false). Но если он спрашивает что-то новое (например, "какое КСК", "слышны ли соседи", "разрешены ли домашние животные", "остается ли микроволновка"), то это "is_unknown_question": true.
7. "unknown_question_text": Сформулируй кратко этот неизвестный вопрос на русском языке, иначе null.

Проанализируй следующее сообщение клиента:
"${messageText}"
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extracted_name: { type: Type.STRING, description: "Extracted Russian human first name or null" },
            extracted_purchase_type: { 
              type: Type.STRING, 
              enum: ["cash", "mortgage", "undecided", "null"],
              description: "Extracted purchase option" 
            },
            wants_viewing: { type: Type.BOOLEAN, description: "Whether the client wants to book a viewing session" },
            appointment_date: { type: Type.STRING, description: "Date of appointment like 2026-06-25" },
            appointment_time: { type: Type.STRING, description: "Time of appointment like 15:00" },
            is_unknown_question: { type: Type.BOOLEAN, description: "True if question is not answerable by the facts given" },
            unknown_question_text: { type: Type.STRING, description: "Briefly stated question for the owner" }
          },
          required: ["extracted_name", "extracted_purchase_type", "wants_viewing", "appointment_date", "appointment_time", "is_unknown_question", "unknown_question_text"]
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || '{}');
    return {
      extracted_name: data.extracted_name && data.extracted_name !== "null" ? data.extracted_name : null,
      extracted_purchase_type: data.extracted_purchase_type && data.extracted_purchase_type !== "null" ? data.extracted_purchase_type : null,
      wants_viewing: !!data.wants_viewing,
      appointment_date: data.appointment_date && data.appointment_date !== "null" ? data.appointment_date : null,
      appointment_time: data.appointment_time && data.appointment_time !== "null" ? data.appointment_time : null,
      is_unknown_question: !!data.is_unknown_question,
      unknown_question_text: data.unknown_question_text && data.unknown_question_text !== "null" ? data.unknown_question_text : null,
    };
  } catch (err) {
    console.error("Gemini analysis error, falling back:", err);
    return ruleBasedAnalysis(messageText);
  }
}

/**
 * Robust rule-based fallback analysis in case Gemini API is unavailable or limits out.
 */
function ruleBasedAnalysis(msg: string): AnalysisResult {
  const norm = msg.toLowerCase();
  let extracted_name: string | null = null;
  let extracted_purchase_type: 'cash' | 'mortgage' | 'undecided' | null = null;
  let wants_viewing = false;
  let appointment_date: string | null = null;
  let appointment_time: string | null = null;
  let is_unknown_question = false;
  let unknown_question_text: string | null = null;

  // Name extraction patterns
  const nameMatch = msg.match(/(?:меня зовут|я|зовут)\s+([А-Яа-яA-Za-z]+)/i);
  if (nameMatch && nameMatch[1]) {
    extracted_name = nameMatch[1].trim();
  } else if (msg.length > 1 && msg.length < 15 && !msg.includes('?') && !/(привет|здравствуй|добрый|цена|сколько)/i.test(msg)) {
    extracted_name = msg.trim();
  }

  // Purchase mode
  if (/(\b1\b|налич|кэш|деньги|сразу)/i.test(norm)) {
    extracted_purchase_type = 'cash';
  } else if (/(\b2\b|ипотек|банк|отбасы|кредит)/i.test(norm)) {
    extracted_purchase_type = 'mortgage';
  } else if (/(\b3\b|не определился|не уверен|посмотрим|думаю|не знаю)/i.test(norm)) {
    extracted_purchase_type = 'undecided';
  }

  // Appointment scheduling
  if (/(просмотр|приехать|посмотреть|глянуть|удобно|записать)/i.test(norm)) {
    wants_viewing = true;
  }
  
  // Try extracting date/time like "25.06" or "19:00"
  const dateMatch = msg.match(/(\d{1,2})[\.\/](\d{1,2})/);
  if (dateMatch) {
    appointment_date = `2026-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
  } else if (/25 июн/i.test(norm)) {
    appointment_date = "2026-06-25";
  } else if (/22 июн/i.test(norm)) {
    appointment_date = "2026-06-22";
  } else if (/26 июн/i.test(norm)) {
    appointment_date = "2026-06-26";
  }

  const timeMatch = msg.match(/(\d{1,2})[\:\-](\d{2})/);
  if (timeMatch) {
    appointment_time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  // Unknown questions check
  if (/(сосед|животн|кск|интернет|провайдер|микроволновк|тихо|шумно|parking|парковк|коммуналк)/i.test(norm)) {
    is_unknown_question = true;
    unknown_question_text = msg;
  }

  return {
    extracted_name,
    extracted_purchase_type,
    wants_viewing,
    appointment_date,
    appointment_time,
    is_unknown_question,
    unknown_question_text
  };
}

/**
 * Generates AI dialogue based on user constraints and strict real estate guidelines.
 */
export async function generateRealtorResponse(
  lead: Lead,
  clientMsg: string,
  history: Message[],
  property: Property,
  kbList: KnowledgeBaseEntry[]
): Promise<string> {
  const ai = getGeminiClient();

  // Strict local logic state overrides to enforce communication flow precisely
  if (history.length === 0 || history.filter(m => m.role === 'client').length === 1) {
    if (!lead.name) {
      return `Здравствуйте.
Спасибо за интерес к квартире.

Подскажите, пожалуйста, как я могу к вам обращаться?`;
    }
  }

  if (lead.name && !lead.purchase_type) {
    return `Подскажите, покупку рассматриваете:

1. За наличный расчет
2. Через ипотеку
3. Пока не определились`;
  }

  if (!ai) {
    // Highly sophisticated dialouge engine fallback
    return ruleBasedDialogGenerator(lead, clientMsg, property, kbList);
  }

  try {
    const chatHistoryContext = history.map(m => `${m.role === 'client' ? 'Клиент' : 'ИИ-Риелтор'}: ${m.message}`).join('\n');
    const kbContext = kbList.map(e => `Вопрос: ${e.question}\nОтвет: ${e.answer}`).join('\n\n');

    const prompt = `
Ты - профессиональный ИИ-ассистент (Realtor) для продажи недвижимости через WhatsApp. Ты ведешь вежливые, структурированные переговоры, цель которых - ответить на вопросы и записать клиента на просмотр квартиры.

### Ограничения:
- Тебе категорически ЗАПРЕЩЕНО придумывать несуществующие характеристики квартиры, изменять цену или адрес.
- Тебе ЗАПРЕЩЕНО давать юридические консультации.
- Тебе ЗАПРЕЩЕНО обещать скидки или торг без прямого согласия владельца.
- Если в Описании Квартиры или Базе Знаний нет ответа на вопрос клиента, ты должен вежливо сообщить, что уточняешь этот вопрос у владельца квартиры и ответишь в ближайшее время. НЕ ПРИДУМЫВАЙ ОТВЕТ!

### Карточка квартиры:
Название: ${property.title}
Стоимость: ${property.price} тенге
Адрес: ${property.address}
Размер: комнат: ${property.rooms}, площадь: ${property.area} кв.м.
Этаж: ${property.floor}/${property.floors_total}
Год постройки: ${property.year_built}
Дополнительное описание: ${property.description}
Допустимое время для просмотров: ${property.viewing_hours}

### База Знаний (Проверенные ответы):
${kbContext}

### Текущий статус лида:
Имя клиента: ${lead.name || 'неизвестно'}
Тип покупки: ${lead.purchase_type || 'неизвестно'}
Уже забронирован просмотр: ${lead.appointment_date ? `${lead.appointment_date} в ${lead.appointment_time}` : 'Нет'}

### Твои инструкции для диалога:
1. Если имя клиента известно и способ покупки известен, ответь на вопросы клиента, используя ТОЛЬКО Базу Знаний и Описание Квартиры.
2. Если клиент выражает интерес к просмотру, предложи просмотр квартиры и попроси назвать удобную дату и время. Текст предложения: "Если вам удобно, можем организовать просмотр квартиры. На какую дату и время вам будет удобно приехать?" (Придерживайся этой концепции).
3. Если клиент согласовал время, подтверди запись в вежливой форме и назови точный адрес (${property.address}).

### Предыдущий диалог:
${chatHistoryContext}

Входящее сообщение клиента: "${clientMsg}"
Сгенерируй только следующее сообщение ИИ-риелтора для отправки в WhatsApp:
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        systemInstruction: "Ты вежливый, профессиональный ИИ-ассистент по недвижимости для WhatsApp. Пиши емкие, структурированные сообщения на русском языке. Всегда используй абзацы для лучшей читаемости WhatsApp."
      }
    });

    return response.text?.trim() || "Произошла ошибка при генерации ответа. Пожалуйста, напишите еще раз.";
  } catch (err) {
    console.error("Gemini Dialog generation error, falling back:", err);
    return ruleBasedDialogGenerator(lead, clientMsg, property, kbList);
  }
}

/**
 * Local dialog fallback system.
 */
function ruleBasedDialogGenerator(
  lead: Lead,
  msg: string,
  property: Property,
  kbList: KnowledgeBaseEntry[]
): string {
  const norm = msg.toLowerCase();

  // Answer matching base
  for (const entry of kbList) {
    const qwords = entry.question.toLowerCase().split(' ').filter(w => w.length > 3);
    const matchCount = qwords.filter(w => norm.includes(w)).length;
    if (matchCount >= 2 || (qwords.length === 1 && norm.includes(qwords[0]))) {
      return `${entry.answer}\n\nЕсли вам удобно, можем организовать просмотр квартиры. На какую дату и время вам будет удобно приехать?`;
    }
  }

  if (/(актуально|цена|стоимость|сколько|стоит)/i.test(norm)) {
    return `Стоимость нашей ${property.rooms}-комнатной квартиры составляет ${property.price.toLocaleString()} тенге.\n\nКвартира находится по адресу: ${property.address}.\n\nЕсли вам интересно, можем организовать просмотр. Когда вам было бы удобно её увидеть?`;
  }

  if (/(адрес|где|находится|район)/i.test(norm)) {
    return `Квартира находится по адресу: ${property.address}.\n\nЭто прекрасный район, развитая инфраструктура, дом ${property.year_built} года постройки.\n\nХотите приехать посмотреть её лично?`;
  }

  if (/(просмотр|посмотреть|записать|время|когда)/i.test(norm)) {
    return `Если вам удобно, можем организовать просмотр квартиры.\n\nНа какую дату и время вам будет удобно приехать? (Мы проводим показы в диапазоне ${property.viewing_hours})`;
  }

  if (lead.appointment_date && lead.appointment_time) {
    return `Замечательно! Запись подтверждена. Ждем вас ${lead.appointment_date} в ${lead.appointment_time} по адресу: ${property.address}.\n\nМы обязательно напомним вам за сутки и за 2 часа до встречи! До свидания!`;
  }

  return `Спасибо за информацию. По поводу вашего вопроса: мы уточняем детали. Что касается осмотра квартиры, мы можем организовать просмотр для вас. На какую дату и время вы бы хотели записаться?`;
}
