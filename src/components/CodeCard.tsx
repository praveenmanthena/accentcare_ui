import {
  AlertCircle,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Save,
  Star,
  User,
  UserCheck,
  X,
  XCircle,
  XIcon,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { acceptRejectCode, addCodeComment, getUserData } from "../services/api";
import {
  Comment,
  HighlightRequest,
  MedicalCode,
  SupportingInfo,
} from "../types/medical-codes";

interface CodeCardProps {
  code: MedicalCode;
  onHighlightRequest?: (request: HighlightRequest) => void;
  onAccept?: (code: MedicalCode) => void;
  onReject?: (code: MedicalCode) => void;
  onUpdateCode?: (code: MedicalCode) => void;
  onDeleteCode?: (code: MedicalCode) => void; // New prop for delete functionality
  showDecisionButtons?: boolean;
  isPrimary?: boolean; // Enhanced prop to indicate if this is a primary code
  currentDocId?: string; // Add document ID for API calls
  onSessionExpired?: () => void; // Add session expiration handler prop
  sessionActions?: Set<string>; // NEW: Persistent session actions tracking
  onSessionAction?: (codeId: string) => void; // NEW: Session action handler
}

// Success Notification Component
const SuccessNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Successss!</p>
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

// FIXED: Simple Rejection Notification Component - No error styling, just simple red notification
const RejectionNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
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

// Error Notification Component - Only for actual API errors
const ErrorNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // Auto-hide after 6 seconds for errors

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
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

const CodeCard: React.FC<CodeCardProps> = ({
  code,
  onHighlightRequest,
  onAccept,
  onReject,
  onUpdateCode,
  onDeleteCode,
  showDecisionButtons = true,
  isPrimary = false,
  currentDocId,
  onSessionExpired,
  sessionActions = new Set(), // NEW: Persistent session actions
  onSessionAction, // NEW: Session action handler
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingActiveDisease, setIsEditingActiveDisease] = useState(false);
  const [isEditingActiveManagement, setIsEditingActiveManagement] =
    useState(false);
  const [isEditingReasonForCoding, setIsEditingReasonForCoding] =
    useState(false);
  const [editedActiveDisease, setEditedActiveDisease] = useState(
    code.supporting_sentence_for_active_disease
  );
  const [editedActiveManagement, setEditedActiveManagement] = useState(
    code.supporting_sentence_for_active_management
  );
  const [editedReasonForCoding, setEditedReasonForCoding] = useState(
    code.reason_for_coding
  );
  const [editedActiveDiseaseStatus, setEditedActiveDiseaseStatus] = useState(
    code.active_disease_asof_1june2025
  );
  const [editedActiveManagementStatus, setEditedActiveManagementStatus] =
    useState(code.active_management_asof_1june2025);

  // Comment states
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showCommentsSection, setShowCommentsSection] = useState(true); // NEW: Control comments section visibility
  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Accept/Reject states
  const [isAcceptingCode, setIsAcceptingCode] = useState(false);
  const [isRejectingCode, setIsRejectingCode] = useState(false);

  // FIXED: Separate notification states for different types
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showRejectionNotification, setShowRejectionNotification] =
    useState(false); // FIXED: Dedicated rejection notification
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  // Get current user data for added_by field - memoized to prevent re-renders
  const currentUser = useMemo(() => getUserData(), []);

  // Determine if this is a primary code based on multiple factors - memoized
  const isActuallyPrimary = useMemo(
    () =>
      isPrimary ||
      code.is_primary === true ||
      code.code_type === "primary" ||
      (code.priority && code.priority <= 5), // If priority is 1-5, consider primary
    [isPrimary, code.is_primary, code.code_type, code.priority]
  );

  // Check if this is a newly added code - memoized
  const isNewlyAdded = useMemo(
    () => code.code_type === "ADDED",
    [code.is_newly_added, code.added_by]
  );

  // Memoized helper functions to prevent re-renders
  const getStatusIcon = useCallback((status: string) => {
    return status === "True" ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  }, []);

  const getStatusColor = useCallback((status: string) => {
    return status === "True"
      ? "text-green-700 bg-green-50"
      : "text-red-700 bg-red-50";
  }, []);

  // Enhanced bounding box conversion with support for multiple bboxes - memoized
  const convertBboxToBoundingBox = useCallback((bbox: number[]) => {
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
  }, []);

  // Handle multiple bboxes for supporting info - memoized
  const handleSupportingInfoClick = useCallback(
    (supportingInfo: SupportingInfo, bboxIndex?: number) => {
      if (!onHighlightRequest) return;

      let boundingBox = null;

      // Handle multiple bboxes - if bboxIndex is provided, use that specific bbox
      if (supportingInfo.bbox && Array.isArray(supportingInfo.bbox)) {
        if (typeof bboxIndex === "number" && supportingInfo.bbox[bboxIndex]) {
          // Use specific bbox from the array
          boundingBox = convertBboxToBoundingBox(
            supportingInfo.bbox[bboxIndex]
          );
        } else if (
          supportingInfo.bbox.length > 0 &&
          Array.isArray(supportingInfo.bbox[0])
        ) {
          // Use first bbox if no specific index provided
          boundingBox = convertBboxToBoundingBox(supportingInfo.bbox[0]);
        } else if (supportingInfo.bbox.length === 8) {
          // Single bbox format
          boundingBox = convertBboxToBoundingBox(supportingInfo.bbox);
        }
      }
      // Try to get bounding box from existing bounding_box property
      else if (supportingInfo.bounding_box) {
        boundingBox = supportingInfo.bounding_box;
      }

      if (boundingBox) {
        const request: HighlightRequest = {
          documentName: supportingInfo.document_name,
          pageNumber: parseInt(supportingInfo.page_number),
          boundingBox: boundingBox,
          text: supportingInfo.supporting_sentence_in_document,
        };
        onHighlightRequest(request);
      } else {
        console.warn(
          "No valid bounding box found for supporting info:",
          supportingInfo
        );
      }
    },
    [onHighlightRequest, convertBboxToBoundingBox]
  );

  // Memoized function to check if supporting info has valid coordinates for highlighting
  const hasValidCoordinates = useCallback((info: SupportingInfo) => {
    if (info.bounding_box) {
      const bb = info.bounding_box;
      return (
        bb.x >= 0 &&
        bb.y >= 0 &&
        bb.width > 0 &&
        bb.height > 0 &&
        bb.x <= 1 &&
        bb.y <= 1 &&
        bb.x + bb.width <= 1 &&
        bb.y + bb.height <= 1
      );
    }

    if (info.bbox && Array.isArray(info.bbox)) {
      // Check if it's an array of bbox arrays (multiple bboxes)
      if (info.bbox.length > 0 && Array.isArray(info.bbox[0])) {
        return info.bbox.some(
          (bbox) =>
            Array.isArray(bbox) &&
            bbox.length === 8 &&
            bbox.every(
              (coord) => typeof coord === "number" && coord >= 0 && coord <= 1
            )
        );
      }
      // Check if it's a single bbox array
      else if (info.bbox.length === 8) {
        return info.bbox.every(
          (coord) => typeof coord === "number" && coord >= 0 && coord <= 1
        );
      }
    }

    return false;
  }, []);

  // Get count of valid bboxes for supporting info - memoized
  const getValidBboxCount = useCallback((info: SupportingInfo) => {
    if (info.bounding_box) {
      return 1;
    }

    if (info.bbox && Array.isArray(info.bbox)) {
      // Check if it's an array of bbox arrays (multiple bboxes)
      if (info.bbox.length > 0 && Array.isArray(info.bbox[0])) {
        return info.bbox.filter(
          (bbox) =>
            Array.isArray(bbox) &&
            bbox.length === 8 &&
            bbox.every(
              (coord) => typeof coord === "number" && coord >= 0 && coord <= 1
            )
        ).length;
      }
      // Check if it's a single bbox array
      else if (info.bbox.length === 8) {
        return info.bbox.every(
          (coord) => typeof coord === "number" && coord >= 0 && coord <= 1
        )
          ? 1
          : 0;
      }
    }

    return 0;
  }, []);

  // Helper function to format section name - removes "Unknown" and handles empty sections
  const formatSectionName = useCallback((sectionName: string) => {
    if (
      !sectionName ||
      sectionName.trim() === "" ||
      sectionName.toLowerCase() === "unknown"
    ) {
      return ""; // Return empty string instead of "Document section"
    }
    return sectionName;
  }, []);

  // Memoized comments count to prevent re-renders
  const commentsCount = useMemo(
    () => code.comments?.length || 0,
    [code.comments]
  );

  // Memoized handlers to prevent re-renders
  const handleRemoveSupportingInfo = useCallback(
    (indexToRemove: number) => {
      if (code.supporting_info.length <= 1) {
        setNotificationMessage(
          "Cannot remove the last supporting evidence. At least one piece of evidence is required."
        );
        setShowErrorNotification(true);
        return;
      }

      const updatedSupportingInfo = code.supporting_info.filter(
        (_, index) => index !== indexToRemove
      );
      const updatedCode = {
        ...code,
        supporting_info: updatedSupportingInfo,
      };
      onUpdateCode?.(updatedCode);
    },
    [code, onUpdateCode]
  );

  const handleSaveActiveDisease = useCallback(() => {
    const updatedCode = {
      ...code,
      active_disease_asof_1june2025: editedActiveDiseaseStatus,
      supporting_sentence_for_active_disease: editedActiveDisease,
    };
    onUpdateCode?.(updatedCode);
    setIsEditingActiveDisease(false);
  }, [code, editedActiveDiseaseStatus, editedActiveDisease, onUpdateCode]);

  const handleCancelActiveDisease = useCallback(() => {
    setEditedActiveDisease(code.supporting_sentence_for_active_disease);
    setEditedActiveDiseaseStatus(code.active_disease_asof_1june2025);
    setIsEditingActiveDisease(false);
  }, [
    code.supporting_sentence_for_active_disease,
    code.active_disease_asof_1june2025,
  ]);

  const handleSaveActiveManagement = useCallback(() => {
    const updatedCode = {
      ...code,
      active_management_asof_1june2025: editedActiveManagementStatus,
      supporting_sentence_for_active_management: editedActiveManagement,
    };
    onUpdateCode?.(updatedCode);
    setIsEditingActiveManagement(false);
  }, [
    code,
    editedActiveManagementStatus,
    editedActiveManagement,
    onUpdateCode,
  ]);

  const handleCancelActiveManagement = useCallback(() => {
    setEditedActiveManagement(code.supporting_sentence_for_active_management);
    setEditedActiveManagementStatus(code.active_management_asof_1june2025);
    setIsEditingActiveManagement(false);
  }, [
    code.supporting_sentence_for_active_management,
    code.active_management_asof_1june2025,
  ]);

  const handleSaveReasonForCoding = useCallback(() => {
    const updatedCode = {
      ...code,
      reason_for_coding: editedReasonForCoding,
    };
    onUpdateCode?.(updatedCode);
    setIsEditingReasonForCoding(false);
  }, [code, editedReasonForCoding, onUpdateCode]);

  const handleCancelReasonForCoding = useCallback(() => {
    setEditedReasonForCoding(code.reason_for_coding);
    setIsEditingReasonForCoding(false);
  }, [code.reason_for_coding]);

  // Enhanced accept handler with API integration and session expiration handling - memoized
  const handleAccept = useCallback(async () => {
    if (!currentDocId) {
      setNotificationMessage(
        "Unable to accept suggestion: No document ID available"
      );
      setShowErrorNotification(true);
      return;
    }

    setIsAcceptingCode(true);

    try {
      console.log("Accepting suggestion:", code.diagnosis_code);

      // Determine target based on code classification
      const target = isActuallyPrimary ? "primary" : "secondary";

      // Call the accept/reject API
      const response = await acceptRejectCode(
        currentDocId,
        code.diagnosis_code,
        code.disease_description,
        code.reason_for_coding,
        code.considered_but_excluded === "True",
        code.reason_for_exclusion || "",
        target,
        "accept"
      );

      console.log("Accept suggestion API response:", response);

      // Update local state
      const updatedCode = { ...code, user_decision: "accepted" as const };
      onUpdateCode?.(updatedCode);
      onAccept?.(updatedCode);

      // NEW: Track this action in session
      onSessionAction?.(code.diagnosis_code);

      // Show success notification
      setNotificationMessage(`Suggestion ${code.diagnosis_code} accepted`);
      setShowSuccessNotification(true);
    } catch (error) {
      console.error("Error accepting suggestion:", error);

      // Check for session expiration
      if (error instanceof Error && error.message.includes("Session expired")) {
        onSessionExpired?.();
        return;
      }

      setNotificationMessage(
        `Failed to accept suggestion: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setShowErrorNotification(true);
    } finally {
      setIsAcceptingCode(false);
    }
  }, [
    currentDocId,
    code,
    isActuallyPrimary,
    onUpdateCode,
    onAccept,
    onSessionExpired,
    onSessionAction,
  ]);

  // FIXED: Enhanced reject handler - shows only rejection notification, no error notification
  const handleReject = useCallback(async () => {
    if (!currentDocId) {
      setNotificationMessage(
        "Unable to reject suggestion: No document ID available"
      );
      setShowErrorNotification(true);
      return;
    }

    setIsRejectingCode(true);

    try {
      console.log("Rejecting suggestion:", code.diagnosis_code);

      // Determine target based on code classification
      const target = isActuallyPrimary ? "primary" : "secondary";

      // Call the accept/reject API
      const response = await acceptRejectCode(
        currentDocId,
        code.diagnosis_code,
        code.disease_description,
        code.reason_for_coding,
        code.considered_but_excluded === "True",
        code.reason_for_exclusion || "",
        target,
        "reject"
      );

      console.log("Reject suggestion API response:", response);

      // Update local state
      const updatedCode = { ...code, user_decision: "rejected" as const };
      onUpdateCode?.(updatedCode);
      onReject?.(updatedCode);

      // NEW: Track this action in session
      onSessionAction?.(code.diagnosis_code);

      // FIXED: Show simple rejection notification - no error styling
      setNotificationMessage(`${code.diagnosis_code} rejected`);
      setShowRejectionNotification(true);
    } catch (error) {
      console.error("Error rejecting suggestion:", error);

      // Check for session expiration
      if (error instanceof Error && error.message.includes("Session expired")) {
        onSessionExpired?.();
        return;
      }

      // Only show error notification for actual API errors
      setNotificationMessage(
        `Failed to reject suggestion: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setShowErrorNotification(true);
    } finally {
      setIsRejectingCode(false);
    }
  }, [
    currentDocId,
    code,
    isActuallyPrimary,
    onUpdateCode,
    onReject,
    onSessionExpired,
    onSessionAction,
  ]);

  // Enhanced comment handlers with API integration and notifications - memoized
  const handleAddComment = useCallback(async () => {
    if (!newCommentText.trim()) return;

    if (!currentDocId) {
      console.error("No document ID available for adding comment");
      setNotificationMessage("Unable to add comment: No document ID available");
      setShowErrorNotification(true);
      return;
    }

    setIsSubmittingComment(true);

    try {
      // Determine target based on code classification
      const target = isActuallyPrimary ? "primary" : "secondary";

      // Call the API to add the comment with the correct target parameter
      const response = await addCodeComment(
        {
          document_id: currentDocId,
          diagnosis_code: code.diagnosis_code,
          comment: newCommentText.trim(),
        },
        target
      );

      console.log("Comment added successfully:", response);

      // Create a new comment object for local state with added_by field
      const newComment: Comment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: newCommentText.trim(),
        timestamp: new Date().toISOString(),
        author: currentUser?.username || "Current User",
        added_by: currentUser?.username || "Current User", // Add the added_by field
      };

      // Update local state
      const updatedCode = {
        ...code,
        comments: [...(code.comments || []), newComment],
      };
      onUpdateCode?.(updatedCode);

      setNewCommentText("");
      setIsAddingComment(false);

      // Show success notification instead of alert
      setNotificationMessage(
        `Comment added successfully for ${code.diagnosis_code}`
      );
      setShowSuccessNotification(true);
    } catch (error) {
      console.error("Error adding comment:", error);

      // Check for session expiration
      if (error instanceof Error && error.message.includes("Session expired")) {
        onSessionExpired?.();
        return;
      }

      setNotificationMessage(
        `Failed to add comment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setShowErrorNotification(true);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [
    newCommentText,
    currentDocId,
    code,
    currentUser,
    onUpdateCode,
    onSessionExpired,
    isActuallyPrimary,
  ]);

  const handleEditComment = useCallback((comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  }, []);

  const handleSaveEditComment = useCallback(() => {
    if (editingCommentId && editingCommentText.trim()) {
      const updatedComments = (code.comments || []).map((comment) =>
        comment.id === editingCommentId
          ? {
              ...comment,
              text: editingCommentText.trim(),
              timestamp: new Date().toISOString(),
              // Keep the original added_by but update author if different
              author: currentUser?.username || comment.author,
            }
          : comment
      );

      const updatedCode = {
        ...code,
        comments: updatedComments,
      };
      onUpdateCode?.(updatedCode);
      setEditingCommentId(null);
      setEditingCommentText("");

      // Show success notification
      setNotificationMessage("Comment updated successfully");
      setShowSuccessNotification(true);
    }
  }, [editingCommentId, editingCommentText, code, currentUser, onUpdateCode]);

  const handleCancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentText("");
  }, []);

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      if (confirm("Are you sure you want to delete this comment?")) {
        const updatedComments = (code.comments || []).filter(
          (comment) => comment.id !== commentId
        );

        const updatedCode = {
          ...code,
          comments: updatedComments,
        };
        onUpdateCode?.(updatedCode);

        // Show success notification
        setNotificationMessage("Comment deleted successfully");
        setShowSuccessNotification(true);
      }
    },
    [code, onUpdateCode]
  );

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080)
      return `${Math.floor(diffInMinutes / 1440)}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }, []);

  const getDecisionBadge = useCallback(() => {
    if (code.user_decision === "accepted") {
      return (
        <span className="bg-green-100 text-green-800 text-xs px-2 py-0 rounded flex items-center space-x-1">
          <Check className="w-3 h-6" />
          <span>Accepted</span>
        </span>
      );
    } else if (code.user_decision === "rejected") {
      return (
        <span className="bg-red-100 text-red-800 text-xs px-2 py-0 rounded flex items-center space-x-1">
          <X className="w-3 h-6" />
          <span>Rejected</span>
        </span>
      );
    }
    return null;
  }, [code.user_decision]);

  // NEW: Handle Add Comments button click
  const handleAddCommentsClick = useCallback(() => {
    setShowCommentsSection(true);
    setIsAddingComment(true);
  }, []);

  return (
    <>
      {/* FIXED: Separate notification components for different types */}
      {/* <SuccessNotification
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
      /> */}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 relative">
        {/* Enhanced Header with Primary/Secondary Indicators and Newly Added Badge */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3 flex-1">
            {/* Enhanced ICD Code Badge with Primary/Secondary Indicator */}
            <div
              className={`relative rounded-full ${
                isActuallyPrimary ? "bg-green-600" : "bg-blue-600"
              }`}
              style={{ width: "100px" }}
            >
              <span className="text-sm font-bold px-3 py-1 text-white block w-full text-center">
                {code.diagnosis_code}
              </span>
            </div>

            <div style={{ width: "75%" }}>
              <span className="text-gray-900 font-medium text-base">
                {code.disease_description}
              </span>
              <div style={{ width: "90px" }}> {getDecisionBadge()}</div>

              {isNewlyAdded && code.code_type === "ADDED" && (
                <>
                  <span className="ml-2 text-xs text-purple-600 font-medium flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>Newly Added</span>
                  </span>

                  <span className="ml-2 text-xs  font-small flex items-center space-x-1">
                    Added By:{code?.added_by}
                  </span>
                </>
              )}
            </div>

            {/* Enhanced Status Badges - REMOVED: Excluded badge for secondary codes */}
            <div className="flex  space-x-2"></div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Decision Buttons with Enhanced Accept/Reject */}

            <div className="flex items-center space-x-1">
              {/* When the user has **not** decided yet – show both */}
              {code.user_decision === undefined &&
                !isNewlyAdded &&
                code.code_type === "AI_MODEL" && (
                  <>
                    {/* Accept */}
                    <button
                      onClick={handleAccept}
                      disabled={
                        isAcceptingCode || isRejectingCode || !currentDocId
                      }
                      className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        !currentDocId
                          ? "Document ID required to accept suggestions"
                          : "Accept this diagnosis"
                      }
                    >
                      {isAcceptingCode ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>

                    {/* Reject */}
                    <button
                      onClick={handleReject}
                      disabled={
                        isAcceptingCode || isRejectingCode || !currentDocId
                      }
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        !currentDocId
                          ? "Document ID required to reject suggestions"
                          : "Reject this diagnosis"
                      }
                    >
                      {isRejectingCode ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}

              {/* If already **accepted** – show only the Reject button (to undo) */}
              {code.user_decision === "accepted" && (
                <button
                  onClick={handleReject}
                  disabled={isRejectingCode || !currentDocId}
                  className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo accept (reject this diagnosis)"
                >
                  {isRejectingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* If already **rejected** – show only the Accept button (to undo) */}
              {code.user_decision === "rejected" && (
                <button
                  onClick={handleAccept}
                  disabled={isAcceptingCode || !currentDocId}
                  className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo reject (accept this diagnosis)"
                >
                  {isAcceptingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Enhanced Reason for Coding */}
            <div className="bg-gray-50 rounded-md p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">
                    Reason for Coding
                    {/* {isActuallyPrimary && (
                      <span className="ml-2 text-xs text-green-600 font-medium">
                        (Primary Diagnosis)
                      </span>
                    )} */}
                    {/* {isNewlyAdded && (
                      <span className="ml-2 text-xs text-purple-600 font-medium">
                        (Newly Added by Admin)
                      </span>
                    )} */}
                  </span>
                </div>
              </div>

              {isEditingReasonForCoding ? (
                <div className="space-y-3">
                  <textarea
                    value={editedReasonForCoding}
                    onChange={(e) => setEditedReasonForCoding(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Explain why this suggestion should be included..."
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveReasonForCoding}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      <Save className="w-3 h-3" />

                      <span>Save</span>
                    </button>
                    <button
                      onClick={handleCancelReasonForCoding}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
                    >
                      <XIcon className="w-3 h-3" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700">
                  {code.reason_for_coding}
                </p>
              )}
            </div>

            {/* Enhanced Supporting Info with Multiple Bboxes Support */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>Supporting Evidence</span>
                <span className="text-xs text-gray-500">
                  ({code.supporting_info.length} item
                  {code.supporting_info.length !== 1 ? "s" : ""})
                </span>
              </h4>
              <div className="space-y-2">
                {code.supporting_info.map((info, index) => {
                  const validBboxCount = getValidBboxCount(info);
                  const hasValidCoords = validBboxCount > 0;
                  const sectionName = formatSectionName(info.section_name);

                  return (
                    <div
                      key={index}
                      className={`w-full rounded-md p-3 border-l-4 transition-colors group relative ${
                        hasValidCoords
                          ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {/* Main supporting info content */}
                      <div className="mb-2">
                        <p
                          className={`text-sm text-gray-800 mb-2 font-medium ${
                            hasValidCoords ? "group-hover:text-blue-800" : ""
                          }`}
                        >
                          "{info.supporting_sentence_in_document}"
                        </p>
                        <div
                          className={`flex items-center space-x-4 text-xs ${
                            hasValidCoords
                              ? "text-gray-600 group-hover:text-blue-600"
                              : "text-gray-500"
                          }`}
                        >
                          <span className="flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <span>{info.document_name}</span>
                          </span>
                          {sectionName && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{sectionName}</span>
                            </span>
                          )}
                          <span>Page {info.page_number}</span>
                          {hasValidCoords && (
                            <span className="text-blue-500 font-medium">
                              {validBboxCount} highlight
                              {validBboxCount !== 1 ? "s" : ""} available
                            </span>
                          )}
                          {info.added_by && (
                            <span className="text-purple-500 font-medium">
                              Added by: {info.added_by}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Multiple bbox buttons */}
                      {hasValidCoords &&
                        info.bbox &&
                        Array.isArray(info.bbox) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Array.isArray(info.bbox[0]) ? (
                              // Multiple bboxes
                              info.bbox.map((bbox, bboxIndex) => {
                                if (!Array.isArray(bbox) || bbox.length !== 8)
                                  return null;
                                return (
                                  <button
                                    key={bboxIndex}
                                    onClick={() =>
                                      handleSupportingInfoClick(info, bboxIndex)
                                    }
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                    title={`Highlight evidence ${
                                      bboxIndex + 1
                                    }`}
                                  >
                                    Highlight {bboxIndex + 1}
                                  </button>
                                );
                              })
                            ) : (
                              // Single bbox
                              <button
                                onClick={() => handleSupportingInfoClick(info)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                title="Highlight evidence"
                              >
                                Highlight
                              </button>
                            )}
                          </div>
                        )}

                      {/* Single bbox or bounding_box click handler */}
                      {hasValidCoords && info.bounding_box && (
                        <button
                          onClick={() => handleSupportingInfoClick(info)}
                          className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                          title="Highlight evidence"
                        >
                          Highlight
                        </button>
                      )}

                      {!hasValidCoords && (
                        <div className="mt-2">
                          <span className="text-gray-400 text-xs">
                            No coordinates available for highlighting
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NEW: Add Comments Button - Only show when comments section is not visible */}
            {!showCommentsSection && (
              <div className="flex justify-end">
                <button
                  onClick={handleAddCommentsClick}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                  disabled={!currentDocId}
                  title={
                    !currentDocId
                      ? "Document ID required to add comments"
                      : "Add comments to this ICD code"
                  }
                >
                  <Plus className="w-4 h-4" />
                  <span>Comments</span>
                </button>
              </div>
            )}

            {/* Enhanced Comments Section - Only show when showCommentsSection is true */}
            {/* UPDATED: Add Comments Button - Only show when comments section is not visible */}
            {!showCommentsSection && (
              <div className="flex justify-end">
                {commentsCount > 0 ? (
                  // When comments exist, show a simple "View Comments" button
                  <button
                    onClick={() => setShowCommentsSection(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>View Comments ({commentsCount})</span>
                  </button>
                ) : (
                  // When no comments exist, show "Add Comments" button
                  <button
                    onClick={handleAddCommentsClick}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    disabled={!currentDocId}
                    title={
                      !currentDocId
                        ? "Document ID required to add comments"
                        : "Add comments to this ICD code"
                    }
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Comments</span>
                  </button>
                )}
              </div>
            )}

            {/* UPDATED: Enhanced Comments Section with new logic */}
            {showCommentsSection && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                {/* UPDATED: Show header and comments when comments exist */}
                {commentsCount > 0 ? (
                  <>
                    {/* Header with comment count */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-purple-500" />
                        <h4 className="font-medium text-gray-900">Comments</h4>
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                          {commentsCount}
                        </span>
                        {currentDocId && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            Doc: {currentDocId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3 mb-4">
                      {(code.comments || []).map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-white rounded-lg p-3 border border-gray-200 group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                {comment.added_by ? (
                                  <UserCheck className="w-3 h-3 text-purple-600" />
                                ) : (
                                  <User className="w-3 h-3 text-purple-600" />
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-600">
                                <span className="font-medium text-gray-900">
                                  {comment.author}
                                </span>
                                {comment.added_by &&
                                  comment.added_by !== comment.author && (
                                    <>
                                      <span>•</span>
                                      <span className="text-purple-600 font-medium">
                                        Added by: {comment.added_by}
                                      </span>
                                    </>
                                  )}
                              </div>
                            </div>
                          </div>

                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) =>
                                  setEditingCommentText(e.target.value)
                                }
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                              />
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={handleCancelEditComment}
                                  className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-gray-800 transition-colors text-xs"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Cancel</span>
                                </button>
                                <button
                                  onClick={handleSaveEditComment}
                                  disabled={!editingCommentText.trim()}
                                  className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {comment.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Comment Button - shown below existing comments */}
                    {!isAddingComment && (
                      <button
                        onClick={() => setIsAddingComment(true)}
                        className="w-medium flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                        disabled={!currentDocId}
                        title={
                          !currentDocId
                            ? "Document ID required to add comments"
                            : "Add another comment"
                        }
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Comment</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* UPDATED: When no comments exist, show centered empty state */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-purple-500" />
                        <h4 className="font-medium text-gray-900">Comments</h4>
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                          0
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsAddingComment(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm mx-auto"
                      disabled={!currentDocId}
                      title={
                        !currentDocId
                          ? "Document ID required to add comments"
                          : "Add first comment"
                      }
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Comment</span>
                    </button>
                  </>
                )}

                {/* Add Comment Form - shown when adding a comment */}
                {isAddingComment && (
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={`Add your comment about ${code.diagnosis_code}...`}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                      autoFocus
                      disabled={isSubmittingComment}
                    />
                    <div className="flex items-center justify-end space-x-2 mt-3">
                      <button
                        onClick={() => {
                          setIsAddingComment(false);
                          setNewCommentText("");
                        }}
                        className="px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                        disabled={isSubmittingComment}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddComment}
                        disabled={
                          !newCommentText.trim() ||
                          isSubmittingComment ||
                          !currentDocId
                        }
                        className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {isSubmittingComment ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-3 h-3" />
                            <span>Add Comment</span>
                          </>
                        )}
                      </button>
                    </div>
                    {!currentDocId && (
                      <p className="text-xs text-red-600 mt-2">
                        Document ID is required to add comments. Please ensure a
                        document is selected.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Exclusion Reason */}
            {/* {code.considered_but_excluded === "True" &&
              code.reason_for_exclusion && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Reason for Exclusion
                  </h4>
                  <p className="text-sm text-gray-700 bg-red-50 p-3 rounded-md border-l-4 border-red-200">
                    {code.reason_for_exclusion}
                  </p>
                </div>
              )} */}
          </div>
        )}
      </div>
    </>
  );
};

export default React.memo(CodeCard);
