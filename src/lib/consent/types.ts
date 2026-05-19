// Consent channel types
export type ConsentChannel = "email" | "sms";
export type ConsentStatus = "pending" | "accepted" | "rejected";

// Database schema type for client_consents table
export type ClientConsent = {
  id: string;
  client_id: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  consent_token: string;
  created_at: string;
  updated_at: string;
};

// API response type for consent page
export type ConsentPageData = {
  clientName: string;
  firmName: string;
  channels: Array<{
    channel: ConsentChannel;
    status: ConsentStatus;
    hasContactInfo: boolean;
    description: string;
  }>;
};

// PATCH /api/consent/[token] request body
export type ConsentUpdateRequest = {
  channel: ConsentChannel;
  action: "accept" | "reject";
};
