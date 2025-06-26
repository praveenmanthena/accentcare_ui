import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Shield,
  Star,
  Undo,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { addCode, getUserData, undoCodeDecision } from "../services/api";
import { HighlightRequest, MedicalCode } from "../types/medical-codes";
import AddCodeModal from "./AddCodeModal";
import CodeCard from "./CodeCard";

interface CodesPanelProps {
  codes: MedicalCode[];
  onHighlightRequest?: (request: HighlightRequest) => void;
  onUpdateCode?: (updatedCode: MedicalCode) => void;
  onAddCode?: (newCode: MedicalCode, target?: "primary" | "secondary") => void;
  selectedIcdCode?: string | null;
  onClearFilter?: () => void;
  newlyAddedCodes?: Set<string>;
  currentDocId?: string; // Add document ID prop
  onSessionExpired?: () => void; // Add session expiration handler prop
  isLoading?: boolean; // Add loading state prop
  setDashboardPage?: (view: "coding" | "dashboard") => void; // Add dashboard navigation prop
  onStartDrawing?: () => void; // UPDATED: Simplified drawing trigger prop (no target parameter)
  sessionActions?: Set<string>; // NEW: Persistent session actions tracking
  onSessionAction?: (codeId: string) => void; // NEW: Session action handler
  onUndoAction?: (codeId: string) => void; // NEW: Undo action handler
  onReorderCodes?: (codes: MedicalCode[]) => void; // NEW: Reorder codes handler
}

// Success Notification Component - UPDATED: Positioned near search bar area
const SuccessNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-32 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Success!</p>
            <p className="text-sm text-green-700 mt-1">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 text-green-400 hover:text-green-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Rejection Notification Component - UPDATED: Positioned near search bar area
const RejectionNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-32 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Notification Component - UPDATED: Positioned near search bar area
const ErrorNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // Auto-hide after 6 seconds for errors

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-32 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CodesPanel: React.FC<CodesPanelProps> = ({
  codes,
  onHighlightRequest,
  onUpdateCode,
  onAddCode,
  selectedIcdCode,
  onClearFilter,
  newlyAddedCodes = new Set(),
  currentDocId,
  onSessionExpired,
  isLoading = false,
  setDashboardPage,
  onStartDrawing, // UPDATED: Simplified drawing trigger prop
  sessionActions = new Set(), // NEW: Persistent session actions
  onSessionAction, // NEW: Session action handler
  onUndoAction, // NEW: Undo action handler
  onReorderCodes, // NEW: Reorder codes handler
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive" | "excluded"
  >("all");
  const [activeTab, setActiveTab] = useState<
    "suggestions" | "accepted" | "rejected" | "newAdded"
  >("suggestions");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  // Separate notification states for different types
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showRejectionNotification, setShowRejectionNotification] =
    useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  // Track undo operations in progress
  const [undoingCodes, setUndoingCodes] = useState<Set<string>>(new Set());

  console.log("CodesPanel - codes:", codes);
  console.log(
    "CodesPanel - primary codes:",
    codes.filter((c) => c.is_primary)
  );
  console.log(
    "CodesPanel - secondary codes:",
    codes.filter((c) => !c.is_primary)
  );
  console.log("CodesPanel - currentDocId:", currentDocId);
  console.log("CodesPanel - isLoading:", isLoading);
  console.log(
    "CodesPanel - newlyAddedCodes from props:",
    Array.from(newlyAddedCodes)
  );
  console.log(
    "CodesPanel - codes with is_newly_added:",
    codes.filter((c) => c.is_newly_added).map((c) => c.diagnosis_code)
  );
  console.log(
    "CodesPanel - codes with code_type ADDED:",
    codes.filter((c) => c.code_type === "ADDED").map((c) => c.diagnosis_code)
  );
  console.log(
    "CodesPanel - codes with code_type AI_MODEL:",
    codes.filter((c) => c.code_type === "AI_MODEL").map((c) => c.diagnosis_code)
  );
  console.log("CodesPanel - sessionActions:", Array.from(sessionActions)); // NEW: Log session actions

  // Enhanced primary/secondary separation using API data
  const primaryCodes = codes.filter((code) => {
    // Use API-provided classification first
    return code.is_primary === true || code.code_type === "primary";
  });

  const secondaryCodes = codes.filter((code) => {
    // Use API-provided classification first
    return code.is_primary === false || code.code_type === "secondary";
  });

  console.log("Filtered primary codes:", primaryCodes.length);
  console.log("Filtered secondary codes:", secondaryCodes.length);

  const handleAcceptCode = (code: MedicalCode) => {
    const updatedCode = { ...code, user_decision: "accepted" as const };
    onUpdateCode?.(updatedCode);

    // NEW: Track that this code was acted upon in this session
    onSessionAction?.(code.diagnosis_code);

    // Show success notification for accept
    setNotificationMessage(`Suggestion ${code.diagnosis_code} accepted`);
    setShowSuccessNotification(true);
  };

  const handleRejectCode = (code: MedicalCode) => {
    const updatedCode = { ...code, user_decision: "rejected" as const };
    onUpdateCode?.(updatedCode);

    // NEW: Track that this code was acted upon in this session
    onSessionAction?.(code.diagnosis_code);

    // Show only rejection notification
    setNotificationMessage(`${code.diagnosis_code} rejected`);
    setShowRejectionNotification(true);
  };

  // Enhanced undo functionality with API integration
  const handleUndoDecision = async (code: MedicalCode) => {
    if (!currentDocId) {
      setNotificationMessage(
        "Unable to undo decision: No document ID available"
      );
      setShowErrorNotification(true);
      return;
    }

    // Prevent multiple undo operations on the same code
    if (undoingCodes.has(code.diagnosis_code)) {
      return;
    }

    setUndoingCodes((prev) => new Set([...prev, code.diagnosis_code]));

    try {
      console.log("Undoing decision for code:", code.diagnosis_code);

      // Determine target based on code classification
      const target =
        code.is_primary === true || code.code_type === "primary"
          ? "primary"
          : "secondary";

      // Call the undo API
      const response = await undoCodeDecision(
        currentDocId,
        code.diagnosis_code,
        code.disease_description,
        code.reason_for_coding,
        code.considered_but_excluded === "True",
        code.reason_for_exclusion || "",
        target
      );

      console.log("Undo API response:", response);

      // Create a new code object without the user_decision property
      const { user_decision, ...codeWithoutDecision } = code;
      const undoneCode = {
        ...codeWithoutDecision,
        // Explicitly set user_decision to undefined to ensure it's removed
        user_decision: undefined,
      } as MedicalCode;

      console.log("Code before undo:", code);
      console.log("Code after undo:", undoneCode);

      onUpdateCode?.(undoneCode);

      // NEW: Remove from session actions when undoing
      onUndoAction?.(code.diagnosis_code);

      // Show success notification
      setNotificationMessage(
        `Decision for suggestion ${code.diagnosis_code} has been undone`
      );
      setShowSuccessNotification(true);
    } catch (error) {
      console.error("Error undoing decision:", error);

      // Check for session expiration
      if (error instanceof Error && error.message.includes("Session expired")) {
        onSessionExpired?.();
        return;
      }

      setNotificationMessage(
        `Failed to undo decision: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setShowErrorNotification(true);
    } finally {
      // Remove from undoing set
      setUndoingCodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(code.diagnosis_code);
        return newSet;
      });
    }
  };

  // UPDATED: Simplified drawing instruction flow (no target parameter)
  const handleAddCodeClick = () => {
    console.log("🎯 Add suggestion clicked");

    // Trigger drawing mode
    if (onStartDrawing) {
      console.log("🎯 Calling onStartDrawing");
      onStartDrawing(); // This will show the drawing instruction and enable drawing mode
    } else {
      // Fallback: open modal directly if no drawing handler
      console.log("🎯 No drawing handler, opening modal directly");
      setIsAddModalOpen(true);
    }
  };

  const handleAddCode = async (
    newCode: MedicalCode,
    target: "primary" | "secondary" = "secondary"
  ) => {
    console.log("handleAddCode called with:", {
      newCode,
      target,
      currentDocId,
    });

    if (!currentDocId) {
      setNotificationMessage(
        "Unable to add suggestion: No document ID available"
      );
      setShowErrorNotification(true);
      return;
    }

    setIsSubmittingCode(true);

    try {
      console.log("Calling API with target:", target);

      // Call the API with the correct payload structure
      const response = await addCode(
        currentDocId,
        newCode.diagnosis_code,
        newCode.disease_description,
        newCode.reason_for_coding,
        newCode.considered_but_excluded === "True",
        newCode.reason_for_exclusion || "",
        target
      );

      console.log("Add suggestion API response:", response);

      // FIXED: Get current user data from token instead of hardcoding "admin"
      const currentUser = getUserData();
      const currentUsername = currentUser?.username || "Unknown User";

      // Add to local state with proper classification and user attribution
      const codeWithTarget = {
        ...newCode,
        is_primary: target === "primary",
        code_type: "ADDED", // NEW: Set code_type to ADDED for newly added codes
        is_newly_added: true, // Mark as newly added
        added_by: currentUsername, // FIXED: Use actual username from token
      };

      console.log("Adding suggestion to local state:", codeWithTarget);
      console.log("Current user from token:", currentUser);
      console.log("Using username:", currentUsername);

      onAddCode?.(codeWithTarget, target);
      setIsAddModalOpen(false);

      // Show success notification
      setNotificationMessage(
        `${target === "primary" ? "Primary" : "Secondary"} suggestion ${
          newCode.diagnosis_code
        } added successfully`
      );
      setShowSuccessNotification(true);
    } catch (error) {
      console.error("Error adding suggestion:", error);

      // Check for session expiration
      if (error instanceof Error && error.message.includes("Session expired")) {
        onSessionExpired?.();
        return;
      }

      setNotificationMessage(
        `Failed to add suggestion: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setShowErrorNotification(true);
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // UPDATED: Enhanced filtering logic - search across all codes when searching
  const getFilteredCodesForTab = () => {
    let filteredCodes = codes;

    /* --- ICD-code filter (PDF viewer) --- */
    if (selectedIcdCode) {
      filteredCodes = filteredCodes.filter(
        (code) => code.diagnosis_code === selectedIcdCode
      );
    }

    /* --- Search filter --- */
    if (searchTerm.trim()) {
      // UPDATED: When searching, search across ALL codes regardless of tab
      // This includes newly added codes in search results
      filteredCodes = filteredCodes.filter(
        (code) =>
          code.diagnosis_code
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          code.disease_description
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
      // Return all matching codes regardless of tab when searching
      return filteredCodes;
    }

    /* --- Tab filter (only applied when not searching) --- */
    if (activeTab === "accepted") {
      return filteredCodes.filter((code) => code.user_decision === "accepted");
    } else if (activeTab === "rejected") {
      return filteredCodes.filter((code) => code.user_decision === "rejected");
    } else if (activeTab === "newAdded") {
      // UPDATED: Filter by code_type "ADDED" from API
      return filteredCodes.filter(
        (code) =>
          code.code_type === "ADDED" ||
          code.is_newly_added === true ||
          newlyAddedCodes.has(code.diagnosis_code)
      );
    } else if (activeTab === "suggestions") {
      // UPDATED: Show AI Model recommendations (code_type "AI_MODEL")
      return filteredCodes.filter(
        (code) =>
          code.code_type === "AI_MODEL" ||
          (code.code_type !== "ADDED" &&
            !code.is_newly_added &&
            !newlyAddedCodes.has(code.diagnosis_code))
      );
    }

    /* Fallback (shouldn't be reached) */
    return filteredCodes;
  };

  // Get filtered codes for current tab
  const filteredCodes = getFilteredCodesForTab();

  // Separate filtered codes into primary and secondary based on current tab
  const filteredPrimaryCodes = filteredCodes.filter((code) => {
    return code.is_primary === true || code.code_type === "primary";
  });

  const filteredSecondaryCodes = filteredCodes.filter((code) => {
    return code.is_primary === false || code.code_type === "secondary";
  });

  // FIXED: Calculate counts for specific code types
  const acceptedCount = codes.filter(
    (code) => code.user_decision === "accepted"
  ).length;
  const rejectedCount = codes.filter(
    (code) => code.user_decision === "rejected"
  ).length;

  // UPDATED: Calculate newly added count using code_type "ADDED"
  const newAddedCount = codes.filter(
    (code) =>
      code.code_type === "ADDED" ||
      code.is_newly_added === true ||
      newlyAddedCodes.has(code.diagnosis_code)
  ).length;

  // UPDATED: Calculate AI model suggestions count using code_type "AI_MODEL"
  const aiModelSuggestionsCount = codes.filter(
    (code) =>
      code.code_type === "AI_MODEL" ||
      (code.code_type !== "ADDED" &&
        !code.is_newly_added &&
        !newlyAddedCodes.has(code.diagnosis_code))
  ).length;

  // FIXED: Calculate pending suggestions - only count AI Model codes that need decisions
  const aiModelCodes = codes.filter((code) => code.code_type === "AI_MODEL");
  const pendingSuggestionsCount = aiModelCodes.filter(
    (code) => !code.user_decision || code.user_decision === "pending"
  ).length;

  // FIXED: Calculate accepted/rejected counts for AI Model codes only
  const aiModelAcceptedCount = aiModelCodes.filter(
    (code) => code.user_decision === "accepted"
  ).length;
  const aiModelRejectedCount = aiModelCodes.filter(
    (code) => code.user_decision === "rejected"
  ).length;

  // FIXED: Check if all AI Model suggestions have been decided
  const allSuggestionsDecided =
    pendingSuggestionsCount === 0 && aiModelCodes.length > 0;

  console.log("FIXED calculation debug:", {
    totalCodes: codes.length,
    aiModelCodes: aiModelCodes.length,
    aiModelAcceptedCount,
    aiModelRejectedCount,
    pendingSuggestionsCount,
    acceptedCount,
    rejectedCount,
    newAddedCount,
    aiModelSuggestionsCount,
    allSuggestionsDecided,
    codesWithAIModel: codes.filter((c) => c.code_type === "AI_MODEL").length,
    codesWithADDED: codes.filter((c) => c.code_type === "ADDED").length,
  });

  const renderCodeSection = (
    sectionCodes: MedicalCode[],
    title: string,
    isPrimary: boolean
  ) => {
    if (sectionCodes.length === 0) return null;

    return (
      <div
        className={`rounded-lg border-2 mb-6 transition-all duration-200 ${
          isPrimary
            ? "bg-green-50 border-green-200"
            : "bg-blue-50 border-blue-200"
        }`}
      >
        {/* Section Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3
              className={`text-xl font-semibold flex items-center space-x-2 ${
                isPrimary ? "text-green-700" : "text-blue-700"
              }`}
            >
              {isPrimary ? (
                <Star className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              <span>
                {title} ({sectionCodes.length})
              </span>
            </h3>
            {/* UPDATED: Only show Add ICD Code button if NOT in newly added tab */}
            {activeTab !== "newAdded" && (
              <button
                onClick={handleAddCodeClick}
                disabled={isSubmittingCode || !currentDocId}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPrimary
                    ? "bg-green-600 hover:bg-green-700 disabled:bg-green-400"
                    : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                }`}
                title={
                  !currentDocId
                    ? "Document ID required to add suggestions"
                    : "Add new ICD suggestion"
                }
              >
                {isSubmittingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add ICD Code</span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="text-gray-600 text-sm italic">
            {isPrimary
              ? "Primary diagnoses are the main conditions requiring active management and significantly impacting care planning."
              : "Secondary diagnoses provide additional context but are not the primary focus of treatment."}
          </p>
          {!currentDocId && (
            <p className="text-xs text-red-600 mt-2">
              Document ID is required to add new suggestions. Please ensure a
              document is selected.
            </p>
          )}
        </div>

        {/* Code Cards */}
        <div className="px-4 pb-4 space-y-3">
          {sectionCodes.map((code, index) => (
            <div key={`${code.diagnosis_code}-${index}`} className="relative">
              <CodeCard
                code={code}
                onHighlightRequest={onHighlightRequest}
                onAccept={handleAcceptCode}
                onReject={handleRejectCode}
                onUpdateCode={onUpdateCode}
                showDecisionButtons={
                  activeTab === "suggestions" ||
                  (activeTab === "newAdded" ? false : true) // UPDATED: Don't show decision buttons in newly added tab
                }
                isPrimary={isPrimary}
                currentDocId={currentDocId}
                onSessionExpired={onSessionExpired}
                sessionActions={sessionActions}
                onSessionAction={onSessionAction}
              />

              {/* FIXED: Enhanced undo button with better positioning to prevent overlap */}
              {(code.user_decision === "accepted" ||
                code.user_decision === "rejected") &&
                sessionActions.has(code.diagnosis_code) && (
                  <div className="absolute top-0 right-2 z-10">
                    <button
                      onClick={() => handleUndoDecision(code)}
                      disabled={
                        undoingCodes.has(code.diagnosis_code) || !currentDocId
                      }
                      className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        !currentDocId
                          ? "Document ID required to undo decisions"
                          : "Undo decision and move back to suggestions"
                      }
                    >
                      {undoingCodes.has(code.diagnosis_code) ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Undoing...</span>
                        </>
                      ) : (
                        <>
                          <Undo className="w-3 h-3" />
                          <span>Undo</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Separate notification components for different types - UPDATED: Positioned near search bar */}
      <SuccessNotification
        message={notificationMessage}
        isVisible={showSuccessNotification}
        onClose={() => setShowSuccessNotification(false)}
      />
      <RejectionNotification
        message={notificationMessage}
        isVisible={showRejectionNotification}
        onClose={() => setShowRejectionNotification(false)}
      />
      <ErrorNotification
        message={notificationMessage}
        isVisible={showErrorNotification}
        onClose={() => setShowErrorNotification(false)}
      />

      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Medical Suggestions
              </h2>
              {selectedIcdCode && (
                <div className="flex items-center space-x-2">
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-md text-sm font-mono">
                    Filtered: {selectedIcdCode}
                  </div>
                  <button
                    onClick={onClearFilter}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    title="Clear filter"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Save Button - Changed from Submit to Save with green color */}
            <button
              onClick={() => setDashboardPage?.("dashboard")}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-3 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("suggestions")}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "suggestions"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>AI Model Recommendations</span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  aiModelSuggestionsCount > 0
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {selectedIcdCode
                  ? filteredCodes.length
                  : aiModelSuggestionsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("accepted")}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "accepted"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Accepted</span>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {selectedIcdCode ? filteredCodes.length : acceptedCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "rejected"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>Rejected</span>
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                {selectedIcdCode ? filteredCodes.length : rejectedCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("newAdded")}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "newAdded"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span className="whitespace-nowrap">Newly Added</span>
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                {selectedIcdCode ? filteredCodes.length : newAddedCount}
              </span>
            </button>
          </div>

          {/* Enhanced Statistics - Show actual counts from API */}
          <div className="flex items-center justify-between text-xs text-gray-600 mb-3 px-2">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{primaryCodes.length} Primary</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{secondaryCodes.length} Secondary</span>
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{acceptedCount} Accepted</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{rejectedCount} Rejected</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span>{newAddedCount} Newly Added</span>
              </span>
              {/* NEW: Show session actions count */}
              {sessionActions.size > 0 && (
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>{sessionActions.size} Can Undo</span>
                </span>
              )}
            </div>
          </div>

          {/* FIXED: Progress Indicator - Only count AI Model codes */}
          {aiModelCodes.length > 0 && !selectedIcdCode && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Decision Progress</span>
                <span>
                  {aiModelAcceptedCount + aiModelRejectedCount} of{" "}
                  {aiModelCodes.length} recommendations completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      aiModelCodes.length > 0
                        ? ((aiModelAcceptedCount + aiModelRejectedCount) /
                            aiModelCodes.length) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
              {pendingSuggestionsCount > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {pendingSuggestionsCount} recommendation
                  {pendingSuggestionsCount !== 1 ? "s" : ""} still need
                  {pendingSuggestionsCount === 1 ? "s" : ""} a decision before
                  saving
                </p>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={
                selectedIcdCode
                  ? `Search ${selectedIcdCode} suggestions...`
                  : activeTab === "suggestions"
                  ? "Search ICD codes"
                  : `Search ${
                      activeTab === "newAdded" ? "new added" : activeTab
                    } suggestions...`
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results - Always show primary/secondary sections */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-6">
            {/* Primary Codes Section - Always visible */}
            {renderCodeSection(
              filteredPrimaryCodes,
              "Primary ICD Suggestions",
              true
            )}

            {/* Secondary Codes Section - Always visible */}
            {renderCodeSection(
              filteredSecondaryCodes,
              "Secondary ICD Suggestions",
              false
            )}

            {/* Show message only if both sections are empty */}
            {filteredPrimaryCodes.length === 0 &&
              filteredSecondaryCodes.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    {activeTab === "suggestions" && (
                      <FileText className="w-12 h-12 mx-auto" />
                    )}
                    {activeTab === "newAdded" && (
                      <UserPlus className="w-12 h-12 mx-auto" />
                    )}
                    {activeTab === "accepted" && (
                      <CheckCircle className="w-12 h-12 mx-auto" />
                    )}
                    {activeTab === "rejected" && (
                      <XCircle className="w-12 h-12 mx-auto" />
                    )}
                  </div>
                  <p className="text-gray-600">
                    {selectedIcdCode ? (
                      `No suggestions found for ${selectedIcdCode}`
                    ) : (
                      <>
                        {activeTab === "suggestions" &&
                          "No suggestions found matching your criteria"}
                        {activeTab === "newAdded" &&
                          "No new suggestions added yet"}
                        {activeTab === "accepted" &&
                          "No accepted suggestions yet"}
                        {activeTab === "rejected" &&
                          "No rejected suggestions yet"}
                      </>
                    )}
                  </p>
                  {!selectedIcdCode && !searchTerm.trim() && (
                    <>
                      {activeTab === "newAdded" && newAddedCount === 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Click "Add ICD Code" in the primary or secondary
                          sections to manually add new ICD suggestions
                        </p>
                      )}
                      {activeTab === "accepted" && acceptedCount === 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Accept suggestions from the Suggestions tab to see
                          them here
                        </p>
                      )}
                      {activeTab === "rejected" && rejectedCount === 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Reject suggestions from the Suggestions tab to see
                          them here
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* UPDATED: Add Code Modal - Always show target selection */}
        <AddCodeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddCode={handleAddCode}
          showTargetSelection={true} // Always show target selection
          currentDocId={currentDocId}
        />
      </div>
    </>
  );
};

export default CodesPanel;
