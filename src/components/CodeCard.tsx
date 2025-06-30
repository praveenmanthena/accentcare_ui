import {
  AlertCircle,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Star,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  onDeleteCode?: (code: MedicalCode) => void;
  showDecisionButtons?: boolean;
  isPrimary?: boolean;
  currentDocId?: string;
  onSessionExpired?: () => void;
  sessionActions?: Set<string>;
  onSessionAction?: (codeId: string) => void;

  // NEW: Drag and drop props
  index?: number;
  section?: "primary" | "secondary";
  onDragStart?: (code: MedicalCode, index: number, section: string) => void;
  onDragEnd?: () => void;
  isDragging?: {
    id: string;
    code: MedicalCode;
    index: number;
    section: string;
  } | null;
  dragOverIndex?: number;
  enableDragDrop?: boolean;
  onDragOver?: (section: string, index: number) => void;
  onDrop?: (section: string, index: number) => void;
}

// Keep all existing notification components exactly the same
const SuccessNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
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

const RejectionNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
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

const ErrorNotification: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000);
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
  sessionActions = new Set(),
  onSessionAction,

  // NEW: Drag and drop props with defaults
  index = 0,
  section = "secondary",
  onDragStart,
  onDragEnd,
  isDragging,
  dragOverIndex = -1,
  enableDragDrop = false,
  onDragOver,
  onDrop,
}) => {
  // Keep all existing state variables exactly the same
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
  const [showCommentsSection, setShowCommentsSection] = useState(true);
  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Accept/Reject states
  const [isAcceptingCode, setIsAcceptingCode] = useState(false);
  const [isRejectingCode, setIsRejectingCode] = useState(false);

  // Notification states
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showRejectionNotification, setShowRejectionNotification] =
    useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  // NEW: Drag and drop ref
  const dragRef = useRef<HTMLDivElement>(null);

  // Keep all existing memoized values and callbacks exactly the same
  const currentUser = useMemo(() => getUserData(), []);

  const isActuallyPrimary = useMemo(
    () =>
      isPrimary ||
      code.is_primary === true ||
      code.code_type === "primary" ||
      section === "primary" ||
      (code.priority && code.priority <= 5),
    [isPrimary, code.is_primary, code.code_type, code.priority, section]
  );

  const isNewlyAdded = useMemo(
    () => code.code_type === "ADDED",
    [code.code_type]
  );

  // UPDATED: Check if this code is rejected
  const isRejected = useMemo(
    () => code.user_decision === "rejected",
    [code.user_decision]
  );

  // FIXED: Enhanced decision button logic to handle cross-section moves
  const shouldShowDecisionButtons = useMemo(() => {
    // Don't show decision buttons if explicitly disabled
    if (!showDecisionButtons) return false;
    
    // Don't show decision buttons for newly added codes
    if (isNewlyAdded) return false;
    
    // Show decision buttons for AI_MODEL codes without decisions
    if (code.code_type === "AI_MODEL" && !code.user_decision) return true;
    
    // FIXED: Show decision buttons for codes that have been moved between sections
    // but still need decisions (regardless of original code_type)
    if (!code.user_decision && (code.code_type === "AI_MODEL" || code.code_type === "primary" || code.code_type === "secondary")) {
      return true;
    }
    
    // Show opposite decision button for codes that already have a decision
    if (code.user_decision === "accepted" || code.user_decision === "rejected") {
      return true;
    }
    
    return false;
  }, [showDecisionButtons, isNewlyAdded, code.code_type, code.user_decision]);

  // NEW: Calculate rank number based on API rank or index + 1
  const rankNumber = useMemo(() => {
    // Use API rank if available, otherwise use index + 1

    if(code.rank === null)
      return null
    return code.rank || (index + 1);
  }, [code.rank, index]);

  // FIXED: Drag and drop handlers with proper event handling
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      console.log("🎯 CodeCard: handleDragStart called", {
        enableDragDrop,
        isRejected,
        onDragStart: !!onDragStart,
        code: code.diagnosis_code
      });

      // UPDATED: Prevent dragging rejected codes
      if (!enableDragDrop || !onDragStart || isRejected) {
        console.log("🚫 Preventing drag:", { enableDragDrop, onDragStart: !!onDragStart, isRejected });
        e.preventDefault();
        return;
      }

      console.log("✅ Starting drag for:", code.diagnosis_code);
      
      // Call the parent drag start handler
      onDragStart(code, index, section);
      
      // Set drag effect
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", code.diagnosis_code);

      // Create a custom drag image with rotation effect
      if (dragRef.current) {
        const dragImage = dragRef.current.cloneNode(true) as HTMLElement;
        dragImage.style.transform = "rotate(2deg)";
        dragImage.style.opacity = "0.8";
        dragImage.style.position = "absolute";
        dragImage.style.top = "-1000px";
        dragImage.style.left = "-1000px";
        dragImage.style.zIndex = "9999";
        document.body.appendChild(dragImage);
        
        // Set the custom drag image
        e.dataTransfer.setDragImage(dragImage, 50, 25);
        
        // Clean up the temporary element
        setTimeout(() => {
          if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage);
          }
        }, 0);
      }
    },
    [enableDragDrop, onDragStart, code, index, section, isRejected]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      console.log("🎯 CodeCard: handleDragEnd called");
      if (onDragEnd) {
        onDragEnd();
      }
    },
    [onDragEnd]
  );

  // NEW: Handle drag over events
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!enableDragDrop || !onDragOver) return;
      
      e.preventDefault(); // Allow drop
      e.dataTransfer.dropEffect = "move";
      
      onDragOver(section, index);
    },
    [enableDragDrop, onDragOver, section, index]
  );

  // NEW: Handle drop events
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      console.log("🎯 CodeCard: handleDrop called");
      
      if (!enableDragDrop || !onDrop) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      onDrop(section, index);
    },
    [enableDragDrop, onDrop, section, index]
  );

  // Keep all existing helper functions exactly the same
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

  const convertBboxToBoundingBox = useCallback((bbox: number[]) => {
    if (!bbox || bbox.length !== 8) {
      console.warn("Invalid bbox format:", bbox);
      return null;
    }

    try {
      const x1 = bbox[0];
      const y1 = bbox[1];
      const x2 = bbox[2];
      const y2 = bbox[3];
      const x3 = bbox[4];
      const y3 = bbox[5];
      const x4 = bbox[6];
      const y4 = bbox[7];

      const minX = Math.min(x1, x2, x3, x4);
      const maxX = Math.max(x1, x2, x3, x4);
      const minY = Math.min(y1, y2, y3, y4);
      const maxY = Math.max(y1, y2, y3, y4);

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

  const handleSupportingInfoClick = useCallback(
    (supportingInfo: SupportingInfo, bboxIndex?: number) => {
      if (!onHighlightRequest) return;

      let boundingBox = null;

      if (supportingInfo.bbox && Array.isArray(supportingInfo.bbox)) {
        if (typeof bboxIndex === "number" && supportingInfo.bbox[bboxIndex]) {
          boundingBox = convertBboxToBoundingBox(
            supportingInfo.bbox[bboxIndex]
          );
        } else if (
          supportingInfo.bbox.length > 0 &&
          Array.isArray(supportingInfo.bbox[0])
        ) {
          boundingBox = convertBboxToBoundingBox(supportingInfo.bbox[0]);
        } else if (supportingInfo.bbox.length === 8) {
          boundingBox = convertBboxToBoundingBox(supportingInfo.bbox);
        }
      } else if (supportingInfo.bounding_box) {
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
      if (info.bbox.length > 0 && Array.isArray(info.bbox[0])) {
        return info.bbox.some(
          (bbox) =>
            Array.isArray(bbox) &&
            bbox.length === 8 &&
            bbox.every(
              (coord) => typeof coord === "number" && coord >= 0 && coord <= 1
            )
        );
      } else if (info.bbox.length === 8) {
        return info.bbox.every(
          (coord) => typeof coord === "number" && coord >= 0 && coord <= 1
        );
      }
    }

    return false;
  }, []);

  const getValidBboxCount = useCallback((info: SupportingInfo) => {
    if (info.bounding_box) {
      return 1;
    }

    if (info.bbox && Array.isArray(info.bbox)) {
      if (info.bbox.length > 0 && Array.isArray(info.bbox[0])) {
        return info.bbox.filter(
          (bbox) =>
            Array.isArray(bbox) &&
            bbox.length === 8 &&
            bbox.every(
              (coord) => typeof coord === "number" && coord >= 0 && coord <= 1
            )
        ).length;
      } else if (info.bbox.length === 8) {
        return info.bbox.every(
          (coord) => typeof coord === "number" && coord >= 0 && coord <= 1
        )
          ? 1
          : 0;
      }
    }

    return 0;
  }, []);

  const formatSectionName = useCallback((sectionName: string) => {
    if (
      !sectionName ||
      sectionName.trim() === "" ||
      sectionName.toLowerCase() === "unknown"
    ) {
      return "";
    }
    return sectionName;
  }, []);

  const commentsCount = useMemo(
    () => code.comments?.length || 0,
    [code.comments]
  );

  // Keep all existing action handlers exactly the same (handleAccept, handleReject, etc.)
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

      const target = isActuallyPrimary ? "primary" : "secondary";

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

      const updatedCode = { ...code, user_decision: "accepted" as const };
      onUpdateCode?.(updatedCode);
      onAccept?.(updatedCode);

      onSessionAction?.(code.diagnosis_code);

      setNotificationMessage(`Suggestion ${code.diagnosis_code} accepted`);
      setShowSuccessNotification(true);
    } catch (error) {
      console.error("Error accepting suggestion:", error);

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

      const target = isActuallyPrimary ? "primary" : "secondary";

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

      const updatedCode = { ...code, user_decision: "rejected" as const };
      onUpdateCode?.(updatedCode);
      onReject?.(updatedCode);

      onSessionAction?.(code.diagnosis_code);

      setNotificationMessage(`${code.diagnosis_code} rejected`);
      setShowRejectionNotification(true);
    } catch (error) {
      console.error("Error rejecting suggestion:", error);

      if (error instanceof Error && error.message.includes("Session expired")) {
        onSessionExpired?.();
        return;
      }

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
      const target = isActuallyPrimary ? "primary" : "secondary";

      const response = await addCodeComment(
        {
          document_id: currentDocId,
          diagnosis_code: code.diagnosis_code,
          comment: newCommentText.trim(),
        },
        target
      );

      console.log("Comment added successfully:", response);

      const newComment: Comment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: newCommentText.trim(),
        timestamp: new Date().toISOString(),
        author: currentUser?.username || "Current User",
        added_by: currentUser?.username || "Current User",
      };

      const updatedCode = {
        ...code,
        comments: [...(code.comments || []), newComment],
      };
      onUpdateCode?.(updatedCode);

      setNewCommentText("");
      setIsAddingComment(false);

      setNotificationMessage(
        `Comment added successfully for ${code.diagnosis_code}`
      );
      setShowSuccessNotification(true);
    } catch (error) {
      console.error("Error adding comment:", error);

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

  const handleAddCommentsClick = useCallback(() => {
    setShowCommentsSection(true);
    setIsAddingComment(true);
  }, []);

  // NEW: Determine drag and visual states
  const isBeingDragged = isDragging?.id === code.diagnosis_code;
  const showDropIndicator =
    dragOverIndex === index && isDragging && !isBeingDragged;

  // NEW: Debug logging for drag and drop
  useEffect(() => {
    console.log("🎯 CodeCard render:", {
      code: code.diagnosis_code,
      enableDragDrop,
      isRejected,
      isBeingDragged,
      dragOverIndex,
      index,
      section
    });
  }, [code.diagnosis_code, enableDragDrop, isRejected, isBeingDragged, dragOverIndex, index, section]);

  return (
    <>
      {/* Keep all existing notification components - commented out to avoid duplicates */}
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

      <div className="relative">
        {/* FIXED: Enhanced main card container with proper drag and drop event handlers */}
        <div
          ref={dragRef}
          draggable={enableDragDrop && !isRejected} // UPDATED: Disable dragging for rejected codes
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200 relative ${
            isBeingDragged
              ? "opacity-50 transform rotate-1 scale-105 shadow-xl ring-2 ring-blue-400 ring-opacity-60"
              : "hover:shadow-md"
          } ${
            enableDragDrop && !isRejected ? "cursor-move" : ""
          } ${
            isRejected ? "opacity-75 bg-red-50 border-red-200" : ""
          } ${
            showDropIndicator ? "ring-2 ring-green-400 ring-opacity-60" : ""
          }`} // UPDATED: Visual styling for rejected codes and drop indicator
        >
          {/* Enhanced Header with Drag Handle and Rank Number */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3 flex-1">
              {/* NEW: Drag Handle with Rank Number - only show when drag & drop is enabled and not rejected */}
              {enableDragDrop && !isRejected && (
                <div className="flex items-center space-x-2">
                  {/* NEW: Rank Number Badge */}
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                      isActuallyPrimary ? "bg-green-600" : "bg-blue-600"
                    }`}
                    title={`Rank ${rankNumber}`}
                  >
                    {rankNumber}
                  </div>
                  
                  {/* FIXED: Drag Handle with proper cursor and touch handling */}
                  <div
                    className="flex items-center justify-center p-1 rounded cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Drag to reorder or move between sections"
                    style={{ touchAction: "none" }} // Prevent touch scrolling on mobile
                    onMouseDown={(e) => {
                      // Ensure the drag handle is ready for dragging
                      console.log("🎯 Drag handle mouse down");
                    }}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* UPDATED: Show rank number for rejected codes but without drag handle */}
              {isRejected && (
                <div className="flex items-center space-x-2">
                  {/* Rank Number Badge for rejected codes */}

                  {rankNumber === null ? ("") :(<>
                                               <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                      isActuallyPrimary ? "bg-red-400" : "bg-red-400"
                    }`}
                    title={`Rank ${rankNumber} (Rejected - Cannot reorder)`}
                  >
                    
                    {rankNumber}
                  </div></>)}
                 
                  
                  {/* Disabled drag handle for rejected codes */}
                  <div
                    className="flex items-center justify-center p-1 rounded text-gray-300 cursor-not-allowed"
                    title="Rejected codes cannot be reordered"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* Enhanced ICD Code Badge with Primary/Secondary Indicator */}
              <div
                className={`relative rounded-full ${
                  isRejected 
                    ? "bg-red-400" 
                    : isActuallyPrimary 
                    ? "bg-green-600" 
                    : "bg-blue-600"
                }`}
                style={{ width: "100px" }}
              >
                <span className="text-sm font-bold px-3 py-1 text-white block w-full text-center">
                  {code.diagnosis_code}
                </span>
              </div>

              <div style={{ width: "75%" }}>
                <span className={`font-medium text-base ${
                  isRejected ? "text-red-700" : "text-gray-900"
                }`}>
                  {code.disease_description}
                </span>
                <div style={{ width: "90px" }}> {getDecisionBadge()}</div>

                {isNewlyAdded && code.code_type === "ADDED" && (
                  <>
                    <span className="ml-2 text-xs text-purple-600 font-medium flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>Newly Added</span>
                    </span>

                    <span className="ml-2 text-xs font-small flex items-center space-x-1">
                      Added By: {code?.added_by}
                    </span>
                  </>
                )}

                {/* UPDATED: Show rejection notice */}
                {isRejected && (
                  <div className="ml-2 text-xs text-red-600 font-medium flex items-center space-x-1 mt-1">
                    <XCircle className="w-3 h-3" />
                    <span>Rejected - Moved to bottom (Cannot reorder)</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2"></div>
            </div>

            <div className="flex items-center space-x-2">
              {/* FIXED: Enhanced decision buttons logic */}
              <div className="flex items-center space-x-1">
                {shouldShowDecisionButtons && (
                  <>
                    {/* Show accept button when no decision or when rejected */}
                    {(!code.user_decision || code.user_decision === "rejected") && (
                      <button
                        onClick={handleAccept}
                        disabled={
                          isAcceptingCode || isRejectingCode || !currentDocId
                        }
                        className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          !currentDocId
                            ? "Document ID required to accept suggestions"
                            : code.user_decision === "rejected"
                            ? "Undo reject (accept this diagnosis)"
                            : "Accept this diagnosis"
                        }
                      >
                        {isAcceptingCode ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Show reject button when no decision or when accepted */}
                    {(!code.user_decision || code.user_decision === "accepted") && (
                      <button
                        onClick={handleReject}
                        disabled={
                          isAcceptingCode || isRejectingCode || !currentDocId
                        }
                        className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          !currentDocId
                            ? "Document ID required to reject suggestions"
                            : code.user_decision === "accepted"
                            ? "Undo accept (reject this diagnosis)"
                            : "Reject this diagnosis"
                        }
                      >
                        {isRejectingCode ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </>
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

          {/* Keep all existing expanded content exactly the same */}
          {isExpanded && (
            <div className="p-4 space-y-4">
              {/* Enhanced Reason for Coding */}
              <div className="bg-gray-50 rounded-md p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700">
                      Reason for Coding
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700">
                  {code.reason_for_coding}
                </p>
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
                                info.bbox.map((bbox, bboxIndex) => {
                                  if (!Array.isArray(bbox) || bbox.length !== 8)
                                    return null;
                                  return (
                                    <button
                                      key={bboxIndex}
                                      onClick={() =>
                                        handleSupportingInfoClick(
                                          info,
                                          bboxIndex
                                        )
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
                                <button
                                  onClick={() =>
                                    handleSupportingInfoClick(info)
                                  }
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                  title="Highlight evidence"
                                >
                                  Highlight
                                </button>
                              )}
                            </div>
                          )}

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

              {/* Keep all existing comment sections exactly the same */}
              {!showCommentsSection && (
                <div className="flex justify-end">
                  {commentsCount > 0 ? (
                    <button
                      onClick={() => setShowCommentsSection(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>View Comments ({commentsCount})</span>
                    </button>
                  ) : (
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

              {/* Enhanced Comments Section */}
              {showCommentsSection && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  {commentsCount > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-4 h-4 text-purple-500" />
                          <h4 className="font-medium text-gray-900">
                            Comments
                          </h4>
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

                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {comment.text}
                            </p>
                          </div>
                        ))}
                      </div>

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
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-4 h-4 text-purple-500" />
                          <h4 className="font-medium text-gray-900">
                            Comments
                          </h4>
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
                          Document ID is required to add comments. Please ensure
                          a document is selected.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(CodeCard);