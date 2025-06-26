export interface SupportingInfo {
  supporting_sentence_in_document: string;
  document_name: string;
  section_name: string;
  page_number: string;
  bbox?: number[] | null; // API format: [x1, y1, x2, y2, x3, y3, x4, y4]
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  added_by?: string; // New field to track who added this supporting info
}

export interface Comment {
  id: string;
  text: string;
  timestamp: string;
  author: string;
  added_by?: string; // New field to track who added the comment
}

export interface MedicalCode {
  diagnosis_code: string;
  disease_description: string;
  considered_but_excluded: string;
  reason_for_exclusion: string | null;
  supporting_info: SupportingInfo[];
  reason_for_coding: string;
  active_disease_asof_1june2025: string;
  supporting_sentence_for_active_disease: string;
  active_management_asof_1june2025: string;
  supporting_sentence_for_active_management: string;
  user_decision?: 'accepted' | 'rejected' | 'pending';
  comments?: Comment[];
  is_primary?: boolean; // New field to indicate if this is a primary code from API
  code_type?: 'primary' | 'secondary' | 'AI_MODEL' | 'ADDED'; // UPDATED: Added new API code_type values
  priority?: number; // Some APIs might use priority/ranking
  added_by?: string; // NEW: Field to track who added this code (e.g., "admin")
  is_newly_added?: boolean; // NEW: Computed field to indicate if this is a newly added code
  is_ai_model?: boolean; // NEW: Computed field to indicate if this is an AI model code
}

export interface HighlightRequest {
  documentName: string;
  pageNumber: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: string;
}

export interface ApiFilesResponse {
  files: string[];
  presigned_urls: Record<string, Record<string, string>>;
}

export type ApiCodingResponse = MedicalCode[];

// ICD Search Result interface - Updated to match your exact API response format
export interface IcdSearchResult {
  Code: string;
  Description: string;
}

// Project-related types - UPDATED with new API fields
export interface Project {
  id: number;
  fileName: string;
  docId?: string; // Document ID for API calls
  episodeId?: string; // NEW: Episode ID field (maps from doc_id)
  docName?: string;
  documentName?: string; // NEW: Document name field
  uploadDate: string;
  createdDate?: string; // NEW: Created date field
  status: "COMPLETED" | "PROCESSING" | "FAILED"; // Keep for backward compatibility
  aiModelStatus?: string; // NEW: AI Model Status (maps from API status)
  reviewStatus?: string; // NEW: Review Status (maps from API review_status)
  coderReviewStatus?: string; // NEW: Coder Review Status (maps from API review_status)
  patientName?: string;
  totalCodes?: number;
  acceptedCodes?: number; // NEW: Maps from accept_count
  rejectedCodes?: number; // NEW: Maps from reject_count
  suggestedCodes?: number; // NEW: Maps from remaining_count
  remainingCount?: number; // NEW: Remaining count field
  acceptCount?: number; // NEW: Accept count field
  rejectCount?: number; // NEW: Reject count field
  pdgmScore?: number;
}

export interface ApiProjectsResponse {
  projects?: Project[];
  data?: Project[];
  results?: Project[];
}