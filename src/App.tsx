import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Shield,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import CodesPanel from "./components/CodesPanel";
import Dashboard from "./components/Dashboard";
import PDFViewer from "./components/PDFViewer";
import {
  clearSession,
  fetchCodingResults,
  fetchPatientFiles,
  getUserData,
  isAuthenticated,
  loginUser,
  reorderCodes, // NEW: Import reorder codes API
} from "./services/api";
import {
  ApiCodingResponse,
  ApiFilesResponse,
  HighlightRequest,
  MedicalCode,
} from "./types/medical-codes";

// Enhanced PDGM scores for different ICD codes with more comprehensive mapping
const FICTIONAL_PDGM_SCORES: Record<string, number> = {
  "I11.0": 35, // Hypertensive heart disease with heart failure - Primary
  "F41.9": 8, // Anxiety disorder, unspecified
  "F32.A": 12, // Depression, unspecified
  "I27.23": 25, // Pulmonary hypertension due to lung diseases and hypoxia
  "D86.0": 18, // Sarcoidosis of lung
  "J84.10": 22, // Pulmonary fibrosis, unspecified
  "J45.909": 15, // Unspecified asthma, uncomplicated
  "G47.33": 10, // Obstructive sleep apnea
  "E66.2": 20, // Morbid obesity with alveolar hypoventilation
  "J96.11": 30, // Chronic respiratory failure with hypoxia
  "I47.1": 18, // Supraventricular tachycardia
  "I50.43": 32, // Acute on chronic combined systolic and diastolic heart failure
  "K57.30": 5, // Diverticulosis of large intestine
  "E11.9": 15, // Type 2 diabetes mellitus without complications
  "N17.9": 25, // Acute kidney injury, unspecified
  "I27.81": 28, // Cor pulmonale (chronic)
  "E87.70": 12, // Fluid overload, unspecified
  "J81.0": 20, // Acute pulmonary edema
  "E87.1": 8, // Hyponatremia
  "E87.6": 8, // Hypokalemia
  "E87.8": 6, // Other disorders of electrolyte and fluid balance
  "D72.825": 5, // Drug-induced leukocytosis
  "Z79.01": 3, // Long term use of anticoagulants
  "Z79.82": 2, // Long term use of aspirin
  "Z79.51": 8, // Long term use of systemic steroids
  "E66.01": 18, // Morbid obesity due to excess calories
  "G43.909": 6, // Migraine, unspecified
  "M54.31": 8, // Sciatica, right side
  "I42.8": 22, // Other cardiomyopathies
  "I49.3": 10, // Ventricular premature depolarization
  "D75.1": 12, // Secondary polycythemia
  "K21.9": 4, // Gastroesophageal reflux disease
  "Z99.11": 25, // Dependence on respirator
  "Z99.81": 20, // Dependence on supplemental oxygen
  "Q21.1": 15, // Atrial septal defect
  "I36.1": 18, // Nonrheumatic tricuspid regurgitation
  "I50.23": 30, // Acute on chronic systolic heart failure
  "I50.33": 25, // Acute on chronic diastolic heart failure
  R17: 8, // Unspecified jaundice
  "M54.16": 10, // Radiculopathy, lumbar region
};

interface Document {
  id: string;
  name: string;
  pages: number;
  presignedUrls: Record<string, string>;
}

type CurrentView = "login" | "dashboard" | "coding";

// Penguin Logo Component
function PenguinLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <img
      src="/penguin-DDSl-WiJ (2).svg"
      alt="Penguin AI Logo"
      className={className}
    />
  );
}

// Penguin AI Logo Component - UPDATED: Larger size
function PenguinAILogo({ className = "h-10" }: { className?: string }) {
  return (
    <img src="/Penguinai-Byuw7M0n.png" alt="Penguin AI" className={className} />
  );
}

// NEW: Custom Success Notification Component (matching the image style)
function CustomSuccessNotification({
  isVisible,
  message,
  onClose,
}: {
  isVisible: boolean;
  message: string;
  onClose: () => void;
}) {
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
    <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm min-w-[300px]">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
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
}

// NEW: Unsaved Changes Warning Modal
function UnsavedChangesModal({
  isVisible,
  onSave,
  onDiscard,
  onCancel,
}: {
  isVisible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-200">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-100">
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Unsaved Changes
            </h3>
            <p className="text-sm text-gray-600">
              You have unsaved drag-and-drop changes
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 text-sm leading-relaxed">
            You've reordered ICD codes but haven't saved your changes. What would you like to do?
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onSave}
            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Save Changes
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Discard Changes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// UPDATED: Simplified Drawing Instruction Alert Component (no target parameter)
function DrawingInstructionAlert({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Add ICD Code
              </h3>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Highlight Medical Evidence
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              Step 1: Highlight Medical Evidence
            </h4>
            <p className="text-blue-800 text-sm leading-relaxed">
              Highlight Medical Evidence in the PDF document that you want to
              highlight for this ICD code.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-cyan-600 text-xs font-bold">1</span>
              </div>
              <p className="text-gray-700 text-sm">
                <strong> Highlight the relevant supporting sentence</strong> in
                the PDF document
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-cyan-600 text-xs font-bold">2</span>
              </div>
              <p className="text-gray-700 text-sm">
                <strong>Select Primary or Secondary</strong> classification for
                the ICD code
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-cyan-600 text-xs font-bold">3</span>
              </div>
              <p className="text-gray-700 text-sm">
                <strong>Fill in the ICD code details</strong> in the form that
                appears
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
          >
            Highlight on PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// REDESIGNED: Beautiful Login Component with Penguin AI Brand Colors
function LoginForm({
  onLogin,
}: {
  onLogin: (credentials: { username: string; password: string }) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLogging) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setIsLogging(true);
    setError("");

    try {
      await loginUser({ username, password });
      onLogin({ username, password });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-100 flex items-center justify-center px-4 py-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      {/* Floating Elements - Updated with Penguin AI brand colors */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute top-40 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header Section - Updated with Penguin AI brand colors */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-r from-cyan-600 to-blue-600">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative text-center">
              {/* Logo Section - Both Penguin logos with same styling */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-3 mr-4">
                  <PenguinLogo className="w-10 h-10" />
                </div>
                <PenguinAILogo className="h-12" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-cyan-100 text-sm">
                Sign in to access your medical coding platform
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-8">
            <div className="space-y-6">
              {/* Username Field - Updated with Penguin AI brand colors */}
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Username
                </label>
                <div className="relative group">
                  <div
                    className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 ${
                      focusedField === "username"
                        ? "text-cyan-500"
                        : "text-gray-400"
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    className={`block w-full pl-12 pr-4 py-4 border-2 rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 ${
                      error
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    placeholder="Enter your username"
                    disabled={isLogging}
                  />
                </div>
              </div>

              {/* Password Field - Updated with Penguin AI brand colors */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <div className="relative group">
                  <div
                    className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 ${
                      focusedField === "password"
                        ? "text-cyan-500"
                        : "text-gray-400"
                    }`}
                  >
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className={`block w-full pl-12 pr-12 py-4 border-2 rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 ${
                      error
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    placeholder="Enter your password"
                    disabled={isLogging}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors duration-200 hover:text-cyan-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLogging}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-3 p-4 text-red-700 bg-red-50 border border-red-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Submit Button - Updated with Penguin AI brand colors */}
              <button
                onClick={handleSubmit}
                disabled={isLogging || !username || !password}
                className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-base font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-700 to-blue-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="relative flex items-center space-x-3">
                  {isLogging ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5" />
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Footer - REMOVED HIPAA text */}
          <div className="px-8 pb-8">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Shield className="h-4 w-4" />
              <span>Secure medical data platform</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [currentView, setCurrentView] = useState<CurrentView>("login");
  const [highlightRequest, setHighlightRequest] =
    useState<HighlightRequest | null>(null);
  const [codes, setCodes] = useState<MedicalCode[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false); // UPDATED: Single loading state for center loader
  const [error, setError] = useState<string | null>(null);
  const [selectedIcdCode, setSelectedIcdCode] = useState<string | null>(null);
  const [newlyAddedCodes, setNewlyAddedCodes] = useState<Set<string>>(
    new Set()
  );
  const [currentDocId, setCurrentDocId] = useState<string | null>(null); // Track current document ID
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null); // NEW: Track current episode ID
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(
    null
  ); // Track selected patient name

  // UPDATED: Simplified drawing state - removed target tracking
  const [showDrawingAlert, setShowDrawingAlert] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // NEW: Persistent session actions tracking - survives navigation between views
  const [sessionActions, setSessionActions] = useState<Set<string>>(new Set());

  // NEW: Drag-and-drop state tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // NEW: Custom success notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = () => {
      if (isAuthenticated()) {
        const userData = getUserData();
        if (userData) {
          setUser({ username: userData.username });
          setIsAuthenticatedState(true);
          setCurrentView("dashboard");
        }
      }
    };

    checkExistingSession();
  }, []);

  // Handle login
  const handleLogin = async (credentials: {
    username: string;
    password: string;
  }) => {
    try {
      const userData = getUserData();
      setUser({ username: userData?.username || credentials.username });
      setIsAuthenticatedState(true);
      setCurrentView("dashboard");
    } catch (error) {
      console.error("Login error:", error);
      // Error is already handled in LoginForm component
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearSession();
    setIsAuthenticatedState(false);
    setUser(null);
    setCurrentView("login");
    setCodes([]);
    setDocuments([]);
    setNewlyAddedCodes(new Set());
    setCurrentDocId(null);
    setCurrentEpisodeId(null); // NEW: Reset episode ID
    setSelectedPatientName(null);
    setError(null);
    setIsLoading(false); // Reset loading state
    setShowDrawingAlert(false); // Reset drawing alert
    setIsDrawingMode(false); // Reset drawing mode
    // NEW: Clear session actions on logout
    setSessionActions(new Set());
    // NEW: Clear unsaved changes on logout
    setHasUnsavedChanges(false);
    setShowUnsavedChangesModal(false);
    setPendingNavigation(null);
    // NEW: Clear success notification
    setShowSuccessNotification(false);
  };

  // NEW: Refresh coding results from API
  const refreshCodingResults = async () => {
    if (!currentDocId) {
      console.warn("No document ID available for refreshing coding results");
      return;
    }

    try {
      console.log("🔄 Refreshing coding results for document:", currentDocId);
      const refreshedCodes = await fetchCodingResults(currentDocId);
      
      // Update the codes state with fresh data from API
      setCodes(refreshedCodes);
      
      // Update newly added codes based on fresh API data
      const apiNewlyAddedCodes = new Set(
        refreshedCodes
          .filter((code) => code.is_newly_added === true || code.code_type === "ADDED")
          .map((code) => code.diagnosis_code)
      );
      setNewlyAddedCodes(apiNewlyAddedCodes);
      
      console.log("✅ Coding results refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing coding results:", error);
      // Don't throw error to avoid breaking the UI flow
    }
  };

  // UPDATED: Load data for specific document with single loading state
  const loadDocumentData = async (
    docId?: string,
    episodeId?: string,
    patientName?: string
  ) => {
    try {
      setIsLoading(true); // UPDATED: Single loading state
      setError(null);

      console.log(
        "Loading data for Doc ID:",
        docId,
        "Episode ID:",
        episodeId,
        "patient:",
        patientName
      );

      // UPDATED: Clear existing data immediately when switching documents
      setCodes([]);
      setDocuments([]);
      setNewlyAddedCodes(new Set());

      // Fetch files and coding results in parallel with docId
      const [filesResponse, codingResponse]: [
        ApiFilesResponse,
        ApiCodingResponse
      ] = await Promise.all([
        fetchPatientFiles(docId),
        fetchCodingResults(docId),
      ]);

      console.log("Files response:", filesResponse);
      console.log("Coding response:", codingResponse);

      // Transform files data into documents
      const transformedDocuments: Document[] = filesResponse.files.map(
        (fileName, index) => {
          const presignedUrls = filesResponse.presigned_urls[fileName] || {};
          const pageCount = Object.keys(presignedUrls).length;

          return {
            id: `doc-${index}`,
            name: fileName,
            pages: pageCount,
            presignedUrls: presignedUrls,
          };
        }
      );

      // The coding response is already processed in the API service
      // Just ensure we have the proper format
      const transformedCodes: MedicalCode[] = codingResponse.map((code) => ({
        ...code,
        // Ensure we have the proper format for excluded codes
        considered_but_excluded: code.considered_but_excluded || "False",
        reason_for_exclusion: code.reason_for_exclusion || "",
      }));

      console.log("Transformed documents:", transformedDocuments);
      console.log(
        "Transformed codes with primary/secondary classification:",
        transformedCodes
      );
      console.log(
        "Primary codes:",
        transformedCodes.filter((c) => c.is_primary)
      );
      console.log(
        "Secondary codes:",
        transformedCodes.filter((c) => !c.is_primary)
      );

      // UPDATED: Extract newly added codes from API response based on added_by field
      const apiNewlyAddedCodes = new Set(
        transformedCodes
          .filter((code) => code.is_newly_added === true)
          .map((code) => code.diagnosis_code)
      );

      console.log(
        "Newly added codes from API:",
        Array.from(apiNewlyAddedCodes)
      );

      setDocuments(transformedDocuments);
      setCodes(transformedCodes);
      setNewlyAddedCodes(apiNewlyAddedCodes); // Use API-detected newly added codes
      setCurrentDocId(docId || null);
      setCurrentEpisodeId(episodeId || docId || null); // NEW: Set episode ID (fallback to doc ID if not provided)
      setSelectedPatientName(patientName || null);
      // NEW: Reset unsaved changes when loading new data
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error loading data:", err);
      if (err instanceof Error && err.message.includes("Session expired")) {
        handleLogout();
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to load patient data"
      );
    } finally {
      setIsLoading(false); // UPDATED: Single loading state
    }
  };

  // Load default data after successful login (for dashboard)
  useEffect(() => {
    if (!isAuthenticatedState || currentView !== "dashboard") return;

    // Only load default data if we're on dashboard and don't have a specific doc ID
    if (!currentDocId) {
      loadDocumentData(); // This will use the default test-2
    }
  }, [isAuthenticatedState, currentView]);

  const handleHighlightRequest = (request: HighlightRequest) => {
    setHighlightRequest(request);
  };

  const handleHighlightComplete = () => {
    setHighlightRequest(null);
  };

  // UPDATED: Enhanced handleUpdateCode with API refresh
  const handleUpdateCode = async (updatedCode: MedicalCode) => {
    console.log("🔄 Updating code:", updatedCode.diagnosis_code);
    
    // Update local state immediately for responsive UI
    setCodes((prevCodes) =>
      prevCodes.map((code) =>
        code.diagnosis_code === updatedCode.diagnosis_code ? updatedCode : code
      )
    );

    // Refresh from API to get the latest state
    await refreshCodingResults();
  };

  // UPDATED: Enhanced handleAddCode to handle API-detected newly added codes with refresh
  const handleAddCode = async (
    newCode: MedicalCode,
    target?: "primary" | "secondary"
  ) => {
    console.log("App.handleAddCode called with:", { newCode, target });

    // Use target parameter or default to secondary
    const finalTarget = target || "secondary";

    // Mark this code as newly added (for local tracking)
    setNewlyAddedCodes((prev) => new Set([...prev, newCode.diagnosis_code]));

    // Determine if the new code should be primary or secondary based on target parameter
    const isPrimary = finalTarget === "primary";

    const codeWithPrimaryStatus = {
      ...newCode,
      is_primary: isPrimary,
      code_type: finalTarget,
      // Mark as newly added for local state
      is_newly_added: true,
      added_by: "admin", // Mark as added by admin for consistency
      // Ensure the code doesn't have a user_decision so it shows in suggestions
      user_decision: undefined,
    };

    console.log(
      "Adding code to state with target:",
      finalTarget,
      codeWithPrimaryStatus
    );

    // Use functional update to ensure state is updated immediately
    setCodes((prevCodes) => {
      // Check if code already exists
      const existingCodeIndex = prevCodes.findIndex(
        (code) => code.diagnosis_code === newCode.diagnosis_code
      );

      if (existingCodeIndex !== -1) {
        // Update existing code
        const updatedCodes = [...prevCodes];
        updatedCodes[existingCodeIndex] = codeWithPrimaryStatus;
        console.log("Updated existing code in state:", updatedCodes);
        return updatedCodes;
      } else {
        // Add new code
        const newCodes = [...prevCodes, codeWithPrimaryStatus];
        console.log("Added new code to state:", newCodes);
        return newCodes;
      }
    });

    // Reset drawing mode after adding code
    setIsDrawingMode(false);
    setShowDrawingAlert(false);

    // Refresh from API to get the latest state
    await refreshCodingResults();
  };

  // Enhanced delete code handler
  const handleDeleteCode = (codeToDelete: MedicalCode) => {
    console.log("App.handleDeleteCode called with:", codeToDelete);

    // Remove from codes array
    setCodes((prevCodes) =>
      prevCodes.filter(
        (code) => code.diagnosis_code !== codeToDelete.diagnosis_code
      )
    );

    // Remove from newly added codes if it was there
    setNewlyAddedCodes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(codeToDelete.diagnosis_code);
      return newSet;
    });

    console.log("Code removed from state:", codeToDelete.diagnosis_code);
  };

  // Handle ICD code selection from PDF viewer
  const handleIcdCodeSelect = (icdCode: string) => {
    setSelectedIcdCode(icdCode === selectedIcdCode ? null : icdCode);
  };

  // UPDATED: Handle view results with both docId and episodeId
  const handleViewResults = (
    documentId: number,
    docId?: string,
    episodeId?: string
  ) => {
    console.log(
      "View results clicked for document ID:",
      documentId,
      "with Doc ID:",
      docId,
      "and Episode ID:",
      episodeId
    );

    // NEW: Check for unsaved changes before navigation
    if (hasUnsavedChanges) {
      setPendingNavigation(() => () => {
        setCurrentView("coding");
        // Find the patient name from the mock data based on documentId
        const patientNames = ["Patient 1", "Patient 2", "Patient 3", "Patient 4"];
        const patientName = patientNames[documentId - 1] || `Patient ${documentId}`;
        // Load data for the specific document with both docId and episodeId
        if (docId) {
          loadDocumentData(docId, episodeId, patientName);
        }
      });
      setShowUnsavedChangesModal(true);
      return;
    }

    setCurrentView("coding");

    // Find the patient name from the mock data based on documentId
    const patientNames = ["Patient 1", "Patient 2", "Patient 3", "Patient 4"];
    const patientName = patientNames[documentId - 1] || `Patient ${documentId}`;

    // Load data for the specific document with both docId and episodeId
    if (docId) {
      loadDocumentData(docId, episodeId, patientName);
    }
  };

  // UPDATED: Simplified drawing mode trigger (no target parameter)
  const handleStartDrawing = () => {
    console.log("🎯 App.handleStartDrawing called");
    setShowDrawingAlert(true); // Show the centered alert first
  };

  // UPDATED: Handle alert close and start actual drawing mode
  const handleAlertClose = () => {
    console.log("🎯 App.handleAlertClose called");
    setShowDrawingAlert(false);
    console.log("🎯 Starting drawing mode");
    setIsDrawingMode(true); // Enable drawing mode after alert is closed
  };

  // UPDATED: Handle exit drawing mode
  const handleExitDrawingMode = () => {
    console.log("🎯 App.handleExitDrawingMode called");
    setIsDrawingMode(false);
    setShowDrawingAlert(false);
  };

  // NEW: Handle session action tracking - persists across navigation
  const handleSessionAction = (codeId: string) => {
    console.log("🔄 Tracking session action for code:", codeId);
    setSessionActions((prev) => new Set([...prev, codeId]));
  };

  // NEW: Handle undo action - removes from session tracking
  const handleUndoAction = (codeId: string) => {
    console.log("↩️ Removing session action for code:", codeId);
    setSessionActions((prev) => {
      const newSet = new Set(prev);
      newSet.delete(codeId);
      return newSet;
    });
  };

  // FIXED: Handle code reordering from drag and drop - PRESERVE original classification
  const handleReorderCodes = (reorderedCodes: MedicalCode[]) => {
    console.log("🔄 App.handleReorderCodes called with:", reorderedCodes.map(c => c.diagnosis_code));
    
    // FIXED: Update the codes state with the new order WITHOUT changing is_primary or code_type
    // Only update the rank property for ordering, preserve all other properties
    setCodes(reorderedCodes);
    
    // NEW: Mark as having unsaved changes
    setHasUnsavedChanges(true);
    
    // Log the reordering for debugging
    console.log("✅ Codes reordered in App state, unsaved changes marked");
  };

  // NEW: Handle save changes with custom notification and API refresh
  const handleSaveChanges = async () => {
    console.log("💾 Saving changes...");
    
    if (!currentDocId) {
      console.error("❌ No document ID available for saving");
      return;
    }

    try {
      // Call the reorder codes API
      await reorderCodes(currentDocId, codes);
      
      // Mark as saved
      setHasUnsavedChanges(false);
      console.log("✅ Changes saved successfully");
      
      // Show custom success notification instead of browser alert
      setSuccessMessage("Code order saved successfully");
      setShowSuccessNotification(true);

      // Refresh coding results after successful save
      await refreshCodingResults();
    } catch (error) {
      console.error("❌ Error saving changes:", error);
      
      // Show error alert (keep browser alert for errors)
      alert(`❌ Failed to save changes: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // NEW: Handle dashboard navigation with unsaved changes check
  const handleDashboardNavigation = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => () => setCurrentView("dashboard"));
      setShowUnsavedChangesModal(true);
    } else {
      setCurrentView("dashboard");
    }
  };

  // NEW: Handle unsaved changes modal actions
  const handleSaveAndNavigate = async () => {
    await handleSaveChanges();
    setShowUnsavedChangesModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleDiscardAndNavigate = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedChangesModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedChangesModal(false);
    setPendingNavigation(null);
  };

  const acceptedCount = codes.filter(
    (code) => code.user_decision === "accepted"
  ).length;
  const rejectedCount = codes.filter(
    (code) => code.user_decision === "rejected"
  ).length;

  // Calculate PDGM score from accepted codes
  const pdgmScore = codes
    .filter((code) => code.user_decision === "accepted")
    .reduce((sum, code) => {
      const score = FICTIONAL_PDGM_SCORES[code.diagnosis_code] || 0;
      return sum + score;
    }, 0);

  // Show login screen if not authenticated
  if (!isAuthenticatedState) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // UPDATED: Single center loader for all loading states - Updated with Penguin AI brand colors
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-600 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Loading Medical Data
          </h3>
          <p className="text-gray-600 mb-4">
            Fetching documents and ICD codes...
          </p>
          {selectedPatientName && (
            <p className="text-sm text-cyan-600 font-medium">
              Patient: {selectedPatientName}
            </p>
          )}
          {currentEpisodeId && (
            <p className="text-sm text-blue-600 font-mono mt-2">
              Episode ID: {currentEpisodeId}
            </p>
          )}
          <div className="mt-6 flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-cyan-600 rounded-full animate-bounce"></div>
            <div
              className="w-3 h-3 bg-cyan-600 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-3 h-3 bg-cyan-600 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900">
              Error Loading Data
            </h1>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* NEW: Custom Success Notification */}
      <CustomSuccessNotification
        isVisible={showSuccessNotification}
        message={successMessage}
        onClose={() => setShowSuccessNotification(false)}
      />

      {/* UPDATED: Centered Drawing Instruction Alert (no target parameter) */}
      <DrawingInstructionAlert
        isVisible={showDrawingAlert}
        onClose={handleAlertClose}
      />

      {/* NEW: Unsaved Changes Modal */}
      <UnsavedChangesModal
        isVisible={showUnsavedChangesModal}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancelNavigation}
      />

      {/* UPDATED: Compact Header - Show Episode ID instead of Document ID */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm p-1">
                  <PenguinLogo className="w-8 h-8" />
                </div>
                <PenguinAILogo className="h-10" />
              </div>
            </div>

            {/* Status Info */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              {currentView !== "dashboard" && (
                <div className="flex items-center space-x-4">
                  {selectedIcdCode && (
                    <span className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded-md font-mono text-xs">
                      Filtering: {selectedIcdCode}
                    </span>
                  )}
                  {selectedPatientName && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">
                      {selectedPatientName}
                    </span>
                  )}
                  {currentEpisodeId && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-mono">
                      Episode: {currentEpisodeId}
                    </span>
                  )}
                  {/* NEW: Unsaved changes indicator */}
                  {hasUnsavedChanges && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs font-medium">
                      Unsaved Changes
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-4">
                <span>Welcome, {user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentView === "dashboard" ? (
        <Dashboard
          codes={codes}
          newlyAddedCodes={newlyAddedCodes}
          onViewResults={handleViewResults}
          setDashboardPage={(value: boolean) =>
            setCurrentView(value ? "dashboard" : "coding")
          }
        />
      ) : (
        <div className="flex h-[calc(100vh-64px)]">
          {/* Left Panel - PDF Viewer */}
          <div className="w-1/2 min-w-0">
            <PDFViewer
              highlightRequest={highlightRequest}
              onHighlightComplete={handleHighlightComplete}
              documents={documents}
              isLoading={false} // UPDATED: No separate loading for PDF viewer
              codes={codes}
              onUpdateCode={handleUpdateCode}
              onIcdCodeSelect={handleIcdCodeSelect}
              selectedIcdCode={selectedIcdCode}
              onAddCode={handleAddCode}
              setDashboardPage={handleDashboardNavigation} // NEW: Use navigation handler
              currentDocId={currentDocId} // Pass document ID to PDFViewer
              selectedPatientName={selectedPatientName} // Pass patient name to PDFViewer
              isDrawingMode={isDrawingMode} // Pass drawing mode state
              onExitDrawingMode={handleExitDrawingMode} // Pass exit drawing mode handler
            />
          </div>

          {/* Right Panel - Codes */}
          <div className="w-1/2 min-w-0">
            <CodesPanel
              codes={codes}
              onHighlightRequest={handleHighlightRequest}
              onUpdateCode={handleUpdateCode}
              onAddCode={handleAddCode}
              selectedIcdCode={selectedIcdCode}
              onClearFilter={() => setSelectedIcdCode(null)}
              newlyAddedCodes={newlyAddedCodes}
              currentDocId={currentDocId} // Pass document ID to CodesPanel
              onSessionExpired={handleLogout} // Pass logout handler for session expiration
              isLoading={false} // UPDATED: No separate loading for codes panel
              setDashboardPage={handleDashboardNavigation} // NEW: Use navigation handler
              onStartDrawing={handleStartDrawing} // UPDATED: Pass simplified drawing trigger to CodesPanel
              sessionActions={sessionActions} // NEW: Pass persistent session actions
              onSessionAction={handleSessionAction} // NEW: Pass session action handler
              onUndoAction={handleUndoAction} // NEW: Pass undo action handler
              onReorderCodes={handleReorderCodes} // NEW: Pass reorder codes handler
              hasUnsavedChanges={hasUnsavedChanges} // NEW: Pass unsaved changes state
              onSaveChanges={handleSaveChanges} // NEW: Pass save changes handler
              refreshCodingResults={refreshCodingResults} // NEW: Pass refresh function
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;