export interface Property {
  id: number;
  title: string;
  price: number;
  address: string;
  rooms: number;
  area: number;
  floor: number;
  floors_total: number;
  year_built: number;
  description: string;
  is_active: boolean;
  viewing_hours: string; // e.g. "10:00-20:00"
}

export type PurchaseType = 'cash' | 'mortgage' | 'undecided';

export type LeadStatus = 'hot' | 'warm' | 'cold';

export interface Lead {
  id: string;
  name: string | null;
  phone: string;
  purchase_type: PurchaseType | null;
  status: LeadStatus;
  appointment_date: string | null; // e.g. "2026-06-25"
  appointment_time: string | null; // e.g. "19:00"
  notes: string;
  created_at: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface Message {
  id: string;
  lead_id: string;
  role: 'client' | 'realtor' | 'owner' | 'system';
  message: string;
  created_at: string;
}

export interface UnknownQuery {
  id: string;
  lead_id: string;
  lead_name: string;
  question: string;
  is_answered: boolean;
  answer: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'new_lead' | 'unknown_question' | 'viewing_scheduled';
  lead_id: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
}
