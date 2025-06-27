const API_BASE_URL = "https://acc-icdbackend-dev.penguinai.co";

// Authentication API
export const loginUser = async (credentials: {
  username: string;
  password: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Login failed: ${response.statusText}`
      );
    }

    const data = await response.json();

    // Store session token in sessionStorage
    if (data.token || data.access_token) {
      const token = data.token || data.access_token;
      sessionStorage.setItem("auth_token", token);
      sessionStorage.setItem(
        "user_data",
        JSON.stringify({
          username: credentials.username,
          loginTime: new Date().toISOString(),
          ...data.user,
        })
      );
    }

    return data;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};

// Get stored auth token
export const getAuthToken = (): string | null => {
  return sessionStorage.getItem("auth_token");
};

// Get stored user data
export const getUserData = () => {
  const userData = sessionStorage.getItem("user_data");
  return userData ? JSON.parse(userData) : null;
};

// Clear session data
export const clearSession = () => {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("user_data");
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const userData = getUserData();
  return !!(token && userData);
};

// Create authenticated request headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    accept: "application/json",
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ICD Code Search API - Updated to match your exact API response format
export interface IcdSearchResult {
  Code: string;
  Description: string;
}

export const searchIcdCodes = async (
  searchString: string,
  searchKey: "Code" | "Description" = "Code"
): Promise<IcdSearchResult[]> => {
  try {
    // Only call API if search string has 3 or more characters
    if (searchString.trim().length < 3) {
      return [];
    }

    // Construct the API endpoint with query parameters matching your specification
    const params = new URLSearchParams({
      search_string: searchString.trim(),
      key: searchKey,
    });

    const endpoint = `${API_BASE_URL}/search?${params.toString()}`;
    console.log("Searching ICD codes:", endpoint);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      const statusText = response.statusText || "Unknown Error";
      throw new Error(
        `Failed to search ICD codes (${response.status}): ${statusText}`
      );
    }

    const data = await response.json();
    console.log("ICD search API response:", data);

    // Handle the exact response format you provided
    if (Array.isArray(data)) {
      // Validate that each item has Code and Description fields
      return data.filter((item) => item.Code && item.Description);
    } else {
      console.warn("ICD search API response is not an array:", data);
      return [];
    }
  } catch (error) {
    console.error("Error searching ICD codes:", error);
    throw error;
  }
};

// NEW: Document Search API
export interface DocumentSearchResult {
  document_name: string;
  page_number: number;
  bbox: number[][];
  text_snippet?: string;
  match_found: boolean;
}

export interface DocumentSearchResponse {
  document_id: string;
  search_string: string;
  similarity_threshold: number;
  total_matches: number;
  results: DocumentSearchResult[];
}

export const searchDocument = async (
  documentId: string,
  searchString: string
): Promise<DocumentSearchResponse> => {
  try {
    if (!searchString.trim()) {
      throw new Error("Search string is required");
    }

    console.log("Searching document:", documentId, "for:", searchString);

    const response = await fetch(
      `${API_BASE_URL}/search_document/${documentId}`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          search_string: searchString.trim(),
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      const statusText = response.statusText || "Unknown Error";
      throw new Error(
        `Failed to search document (${response.status}): ${statusText}`
      );
    }

    const data = await response.json();
    console.log("Document search API response:", data);

    return data;
  } catch (error) {
    console.error("Error searching document:", error);
    throw error;
  }
};

// Projects API
export const fetchProjects = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();

    // Ensure we return an array - check common response structures
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else if (data && Array.isArray(data.projects)) {
      return data.projects;
    } else if (data && Array.isArray(data.results)) {
      return data.results;
    } else {
      // If no array found, return empty array to prevent map error
      console.warn(
        "Projects API response is not in expected array format:",
        data
      );
      return [];
    }
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
};

// Updated to accept docId parameter - This fetches documents for a specific patient
export const fetchPatientFiles = async (docId?: string) => {
  try {
    // Use docId if provided, otherwise fallback to test-2
    const endpoint = docId
      ? `${API_BASE_URL}/files/${docId}`
      : `${API_BASE_URL}/files/test-2`;
    console.log("Fetching patient files from:", endpoint, "for docId:", docId);

    const response = await fetch(endpoint, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Patient files API response for docId", docId, ":", data);
    return data;
  } catch (error) {
    console.error("Error fetching patient files:", error);
    throw error;
  }
};

// UPDATED: Helper function to check if a code is newly added based on code_type field
const isNewlyAddedCode = (code: any): boolean => {
  // NEW: Check for code_type "ADDED" from API
  if (code.code_type === "ADDED") {
    console.log(
      "Found newly added code with code_type ADDED:",
      code.diagnosis_code
    );
    return true;
  }

  // Keep existing logic as fallback
  if (code.added_by === "admin") {
    console.log("Found newly added code by admin:", code.diagnosis_code);
    return true;
  }

  // Also check in supporting_info for added_by field
  if (code.supporting_info && Array.isArray(code.supporting_info)) {
    const hasAdminAddedInfo = code.supporting_info.some(
      (info: any) => info.added_by === "admin"
    );
    if (hasAdminAddedInfo) {
      console.log(
        "Found newly added code with admin supporting info:",
        code.diagnosis_code
      );
      return true;
    }
  }

  // Check in comments for added_by field
  if (code.comments && Array.isArray(code.comments)) {
    const hasAdminAddedComment = code.comments.some(
      (comment: any) => comment.added_by === "admin"
    );
    if (hasAdminAddedComment) {
      console.log(
        "Found newly added code with admin comment:",
        code.diagnosis_code
      );
      return true;
    }
  }

  return false;
};

// UPDATED: Helper function to check if a code is from AI model based on code_type field
const isAIModelCode = (code: any): boolean => {
  // NEW: Check for code_type "AI_MODEL" from API
  if (code.code_type === "AI_MODEL") {
    console.log(
      "Found AI model code with code_type AI_MODEL:",
      code.diagnosis_code
    );
    return true;
  }

  return false;
};

// Updated to accept docId parameter and detect newly added codes
export const fetchCodingResults = async (docId?: string) => {
  try {
    // Use docId if provided, otherwise fallback to test-2
    const endpoint = docId
      ? `${API_BASE_URL}/coding_results/${docId}`
      : `${API_BASE_URL}/coding_results/test-2`;
    console.log("Fetching coding results from:", endpoint);

    const response = await fetch(endpoint, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      throw new Error(`Failed to fetch coding results: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Raw API response from coding_results:", data);

    // Handle the specific nested structure from your API
    let codesArray = [];

    if (data && data.results) {
      const results = data.results;

      // Handle primary codes
      if (Array.isArray(results.primary_codes)) {
        const primaryCodes = results.primary_codes.map((code) => ({
          ...code,
          is_primary: true,
          // Keep original code_type from API (AI_MODEL or ADDED)
          // code_type: "primary", // Don't override the API code_type
          // Convert boolean fields to string format for consistency
          considered_but_excluded: code.considered_but_excluded
            ? "True"
            : "False",
          active_disease_asof_1june2025: code.active_disease_asof_1june2025
            ? "True"
            : "False",
          active_management_asof_1june2025:
            code.active_management_asof_1june2025 ? "True" : "False",
          // Extract user decision from user_decisions object
          user_decision: extractUserDecision(code.user_decisions),
          // Check if this is a newly added code using new logic
          is_newly_added: isNewlyAddedCode(code),
          // NEW: Check if this is an AI model code
          is_ai_model: isAIModelCode(code),
          // Ensure supporting_info has proper bounding box format
          supporting_info: (code.supporting_info || []).map((info) => ({
            ...info,
            // Convert bbox array to bounding_box object if needed
            bounding_box:
              info.bbox && info.bbox.length === 8
                ? convertBboxToBoundingBox(info.bbox)
                : info.bounding_box,
          })),
        }));
        codesArray.push(...primaryCodes);
      }

      // Handle secondary codes
      if (Array.isArray(results.secondary_codes)) {
        const secondaryCodes = results.secondary_codes.map((code) => ({
          ...code,
          is_primary: false,
          // Keep original code_type from API (AI_MODEL or ADDED)
          // code_type: "secondary", // Don't override the API code_type
          // Convert boolean fields to string format for consistency
          considered_but_excluded: code.considered_but_excluded
            ? "True"
            : "False",
          active_disease_asof_1june2025: code.active_disease_asof_1june2025
            ? "True"
            : "False",
          active_management_asof_1june2025:
            code.active_management_asof_1june2025 ? "True" : "False",
          // Extract user decision from user_decisions object
          user_decision: extractUserDecision(code.user_decisions),
          // Check if this is a newly added code using new logic
          is_newly_added: isNewlyAddedCode(code),
          // NEW: Check if this is an AI model code
          is_ai_model: isAIModelCode(code),
          // Ensure supporting_info has proper bounding box format
          supporting_info: (code.supporting_info || []).map((info) => ({
            ...info,
            // Convert bbox array to bounding_box object if needed
            bounding_box:
              info.bbox && info.bbox.length === 8
                ? convertBboxToBoundingBox(info.bbox)
                : info.bounding_box,
          })),
        }));
        codesArray.push(...secondaryCodes);
      }
    }
    // Fallback for other response structures
    else if (Array.isArray(data)) {
      codesArray = data.map((code) => ({
        ...code,
        user_decision: extractUserDecision(code.user_decisions),
        is_newly_added: isNewlyAddedCode(code),
        is_ai_model: isAIModelCode(code),
      }));
    } else if (data && Array.isArray(data.results)) {
      codesArray = data.results.map((code) => ({
        ...code,
        user_decision: extractUserDecision(code.user_decisions),
        is_newly_added: isNewlyAddedCode(code),
        is_ai_model: isAIModelCode(code),
      }));
    } else if (data && Array.isArray(data.codes)) {
      codesArray = data.codes.map((code) => ({
        ...code,
        user_decision: extractUserDecision(code.user_decisions),
        is_newly_added: isNewlyAddedCode(code),
        is_ai_model: isAIModelCode(code),
      }));
    } else if (data && Array.isArray(data.data)) {
      codesArray = data.data.map((code) => ({
        ...code,
        user_decision: extractUserDecision(code.user_decisions),
        is_newly_added: isNewlyAddedCode(code),
        is_ai_model: isAIModelCode(code),
      }));
    } else {
      console.warn("API response is not in expected format:", data);
      return [];
    }

    console.log("Processed codes array:", codesArray);
    console.log(
      "Primary codes count:",
      codesArray.filter((c) => c.is_primary).length
    );
    console.log(
      "Secondary codes count:",
      codesArray.filter((c) => !c.is_primary).length
    );
    console.log(
      "Accepted codes count:",
      codesArray.filter((c) => c.user_decision === "accepted").length
    );
    console.log(
      "Rejected codes count:",
      codesArray.filter((c) => c.user_decision === "rejected").length
    );
    console.log(
      "AI Model codes count:",
      codesArray.filter((c) => c.is_ai_model || c.code_type === "AI_MODEL")
        .length
    );
    console.log(
      "Newly added codes count:",
      codesArray.filter((c) => c.is_newly_added || c.code_type === "ADDED")
        .length
    );
    console.log(
      "AI Model codes:",
      codesArray
        .filter((c) => c.is_ai_model || c.code_type === "AI_MODEL")
        .map((c) => c.diagnosis_code)
    );
    console.log(
      "Newly added codes:",
      codesArray
        .filter((c) => c.is_newly_added || c.code_type === "ADDED")
        .map((c) => c.diagnosis_code)
    );

    return codesArray;
  } catch (error) {
    console.error("Error fetching coding results:", error);
    throw error;
  }
};

// Helper function to extract user decision from user_decisions object
const extractUserDecision = (
  userDecisions: any
): "accepted" | "rejected" | undefined => {
  if (!userDecisions || typeof userDecisions !== "object") {
    return undefined;
  }

  // Get current user data to find their decision
  const currentUser = getUserData();
  const username = currentUser?.username || "admin"; // fallback to admin

  // Check if current user has made a decision
  if (userDecisions[username]) {
    const status = userDecisions[username].status;
    if (status === "accept") return "accepted";
    if (status === "reject") return "rejected";
  }

  // If no decision found for current user, check for any user's decision
  const userKeys = Object.keys(userDecisions);
  if (userKeys.length > 0) {
    const firstUserDecision = userDecisions[userKeys[0]];
    if (firstUserDecision && firstUserDecision.status) {
      if (firstUserDecision.status === "accept") return "accepted";
      if (firstUserDecision.status === "reject") return "rejected";
    }
  }

  return undefined;
};

// Helper function to convert bbox array to bounding_box object
const convertBboxToBoundingBox = (bbox: number[]) => {
  if (!bbox || bbox.length !== 8) {
    console.warn("Invalid bbox format:", bbox);
    return null;
  }

  try {
    // bbox format: [x1, y1, x2, y2, x3, y3, x4, y4] (normalized coordinates 0-1)
    // Convert to simple rectangle format
    const x1 = bbox[0]; // top-left x
    const y1 = bbox[1]; // top-left y
    const x2 = bbox[2]; // top-right x
    const y2 = bbox[3]; // top-right y
    const x3 = bbox[4]; // bottom-right x
    const y3 = bbox[5]; // bottom-right y
    const x4 = bbox[6]; // bottom-left x
    const y4 = bbox[7]; // bottom-left y

    // Calculate bounding rectangle from the 4 points
    const minX = Math.min(x1, x2, x3, x4);
    const maxX = Math.max(x1, x2, x3, x4);
    const minY = Math.min(y1, y2, y3, y4);
    const maxY = Math.max(y1, y2, y3, y4);

    // Validate the calculated bounds
    if (
      minX < 0 ||
      minY < 0 ||
      maxX > 1 ||
      maxY > 1 ||
      minX >= maxX ||
      minY >= maxY
    ) {
      console.warn("Invalid bounding box coordinates:", {
        minX,
        minY,
        maxX,
        maxY,
      });
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } catch (error) {
    console.error("Error converting bbox:", error);
    return null;
  }
};

// NEW: Helper function to convert search result bbox to bounding box object
export const convertSearchBboxToBoundingBox = (
  bbox: number[][]
): { x: number; y: number; width: number; height: number } | null => {
  if (!bbox || !Array.isArray(bbox) || bbox.length === 0) {
    console.warn("Invalid search bbox format:", bbox);
    return null;
  }

  try {
    // Take the first bbox if multiple are provided
    const firstBbox = bbox[0];

    if (!Array.isArray(firstBbox) || firstBbox.length !== 8) {
      console.warn("Invalid bbox array format:", firstBbox);
      return null;
    }

    // bbox format: [x1, y1, x2, y2, x3, y3, x4, y4] (normalized coordinates 0-1)
    const x1 = firstBbox[0]; // top-left x
    const y1 = firstBbox[1]; // top-left y
    const x2 = firstBbox[2]; // top-right x
    const y2 = firstBbox[3]; // top-right y
    const x3 = firstBbox[4]; // bottom-right x
    const y3 = firstBbox[5]; // bottom-right y
    const x4 = firstBbox[6]; // bottom-left x
    const y4 = firstBbox[7]; // bottom-left y

    // Calculate bounding rectangle from the 4 points
    const minX = Math.min(x1, x2, x3, x4);
    const maxX = Math.max(x1, x2, x3, x4);
    const minY = Math.min(y1, y2, y3, y4);
    const maxY = Math.max(y1, y2, y3, y4);

    // Validate the calculated bounds
    if (
      minX < 0 ||
      minY < 0 ||
      maxX > 1 ||
      maxY > 1 ||
      minX >= maxX ||
      minY >= maxY
    ) {
      console.warn("Invalid bounding box coordinates:", {
        minX,
        minY,
        maxX,
        maxY,
      });
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } catch (error) {
    console.error("Error converting search bbox:", error);
    return null;
  }
};

// Helper function to convert bounding box to normalized bbox array format
const convertBoundingBoxToBbox = (boundingBox: {
  x: number;
  y: number;
  width: number;
  height: number;
}): number[] => {
  // Convert from bounding box format to 8-point bbox array format
  // bbox format: [x1, y1, x2, y2, x3, y3, x4, y4] (normalized coordinates 0-1)
  const x1 = boundingBox.x; // top-left x
  const y1 = boundingBox.y; // top-left y
  const x2 = boundingBox.x + boundingBox.width; // top-right x
  const y2 = boundingBox.y; // top-right y
  const x3 = boundingBox.x + boundingBox.width; // bottom-right x
  const y3 = boundingBox.y + boundingBox.height; // bottom-right y
  const x4 = boundingBox.x; // bottom-left x
  const y4 = boundingBox.y + boundingBox.height; // bottom-left y

  return [x1, y1, x2, y2, x3, y3, x4, y4];
};

// UPDATED: Accept/Reject/Undo Code API - Enhanced to support undo action
export interface AcceptRejectCodePayload {
  document_id: string;
  diagnosis_code: string;
  action: "accept" | "reject" | "undo"; // ADDED: undo action
}

export const acceptRejectCode = async (
  documentId: string,
  diagnosisCode: string,
  description: string,
  reasonForCoding: string,
  consideredButExcluded: boolean = false,
  reasonForExclusion: string = "",
  target: "primary" | "secondary" = "primary",
  action: "accept" | "reject" | "undo" = "accept" // ADDED: undo action support
) => {
  try {
    const payload: AcceptRejectCodePayload = {
      document_id: documentId,
      diagnosis_code: diagnosisCode,
      action: action,
    };

    console.log(`${action}ing code with payload:`, payload, "target:", target);

    const response = await fetch(
      `${API_BASE_URL}/accept_reject_code?target=${target}`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to ${action} code: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(`${action} code response:`, data);
    return data;
  } catch (error) {
    console.error(`Error ${action}ing code:`, error);
    throw error;
  }
};

// NEW: Dedicated undo function for better clarity
export const undoCodeDecision = async (
  documentId: string,
  diagnosisCode: string,
  description: string,
  reasonForCoding: string,
  consideredButExcluded: boolean = false,
  reasonForExclusion: string = "",
  target: "primary" | "secondary" = "primary"
) => {
  return acceptRejectCode(
    documentId,
    diagnosisCode,
    description,
    reasonForCoding,
    consideredButExcluded,
    reasonForExclusion,
    target,
    "undo"
  );
};

// FIXED: Comments API - Updated to accept target parameter
export interface AddCommentRequest {
  document_id: string;
  diagnosis_code: string;
  comment: string;
}

export const addCodeComment = async (
  payload: AddCommentRequest,
  target: "primary" | "secondary" = "primary"
) => {
  try {
    console.log("Adding comment with payload:", payload, "target:", target);

    const response = await fetch(
      `${API_BASE_URL}/add_code_comment?target=${target}`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to add comment: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Add comment response:", data);
    return data;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

// Add Code API - Updated with correct payload structure including bounding box
export interface AddCodePayload {
  document_id: string;
  codes: Array<{
    diagnosis_code: string;
    considered_but_excluded: boolean;
    description: string;
    reason_for_coding: string;
    reason_for_exclusion: string;
    bbox: number[]; // Added bbox field in the correct format
  }>;
}

export const addCode = async (
  documentId: string,
  diagnosisCode: string,
  description: string,
  reasonForCoding: string,
  consideredButExcluded: boolean = false,
  reasonForExclusion: string = "",
  target: "primary" | "secondary" = "primary",

  boundingBox?: { x: number; y: number; width: number; height: number },
  doc_name: string,
  page_num: number // Added bounding box parameter
) => {
  try {
    // Convert bounding box to bbox array format if provided
    let bbox: number[] = [];
    if (boundingBox) {
      bbox = convertBoundingBoxToBbox(boundingBox);
      console.log("Converted bounding box to bbox:", boundingBox, "->", bbox);
    }

    const payload: AddCodePayload = {
      document_id: documentId,
      codes: [
        {
          diagnosis_code: diagnosisCode,
          considered_but_excluded: consideredButExcluded,
          description: description,
          reason_for_coding: reasonForCoding,
          reason_for_exclusion: reasonForExclusion,
          bbox: bbox,
          doc_name: doc_name,
          page_num: page_num,
        },
      ],
    };

    console.log("Adding code with payload:", payload, "target:", target);

    const response = await fetch(`${API_BASE_URL}/add_code?target=${target}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to add code: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Add code response:", data);
    return data;
  } catch (error) {
    console.error("Error adding code:", error);
    throw error;
  }
};

// Delete Code API - Updated with bounding box support
export interface DeleteCodePayload {
  document_id: string;
  codes: Array<{
    diagnosis_code: string;
    considered_but_excluded: boolean;
    description: string;
    reason_for_coding: string;
    reason_for_exclusion: string;
    bbox: number[]; // Added bbox field
  }>;
}

export const deleteCode = async (
  documentId: string,
  diagnosisCode: string,
  description: string,
  reasonForCoding: string,
  consideredButExcluded: boolean = false,
  reasonForExclusion: string = "",
  target: "primary" | "secondary" = "primary",
  boundingBox?: { x: number; y: number; width: number; height: number } // Added bounding box parameter
) => {
  try {
    // Convert bounding box to bbox array format if provided
    let bbox: number[] = [];
    if (boundingBox) {
      bbox = convertBoundingBoxToBbox(boundingBox);
    }

    const payload: DeleteCodePayload = {
      document_id: documentId,
      codes: [
        {
          diagnosis_code: diagnosisCode,
          considered_but_excluded: consideredButExcluded,
          description: description,
          reason_for_coding: reasonForCoding,
          reason_for_exclusion: reasonForExclusion,
          bbox: bbox, // Include the bbox array in the payload
        },
      ],
    };

    console.log("Deleting code with payload:", payload, "target:", target);

    const response = await fetch(
      `${API_BASE_URL}/delete_code?target=${target}`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please login again.");
      }
      const errorData = await response.json().catch(() => ({}));
      const statusText = response.statusText || "Unknown Error";
      throw new Error(
        errorData.message ||
          `Failed to delete code (${response.status}): ${statusText}`
      );
    }

    const data = await response.json();
    console.log("Delete code response:", data);
    return data;
  } catch (error) {
    console.error("Error deleting code:", error);
    throw error;
  }
};
