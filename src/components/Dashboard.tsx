import {
  AlertCircle,
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Loader2,
  UserCheck,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { fetchProjects } from "../services/api";
import { MedicalCode, Project } from "../types/medical-codes";

interface DashboardProps {
  codes?: MedicalCode[];
  newlyAddedCodes?: Set<string>;
  onViewResults?: (
    documentId: number,
    docId?: string,
    episodeId?: string
  ) => void; // UPDATED: Added episodeId parameter
  onBackToUpload?: () => void;
  setDashboardPage?: (value: boolean) => void;
}

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

// Status Badge Component - Updated for AI Model Status
const AIModelStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyles = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "PROCESSING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "FAILED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return <Bot className="w-3 h-3" />;
      case "PROCESSING":
        return <Clock className="w-3 h-3" />;
      case "FAILED":
        return <XCircle className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusStyles(
        status
      )}`}
    >
      {getStatusIcon(status)}
      <span>{status}</span>
    </span>
  );
};

// Review Status Badge Component - Updated for Coder Review Status
const CoderReviewStatusBadge: React.FC<{ reviewStatus: string }> = ({
  reviewStatus,
}) => {
  const getReviewStatusStyles = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "IN PROGRESS":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "YET TO REVIEW":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getReviewStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return <UserCheck className="w-3 h-3" />;
      case "IN PROGRESS":
        return <Clock className="w-3 h-3" />;
      case "YET TO REVIEW":
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${getReviewStatusStyles(
        reviewStatus
      )}`}
    >
      {getReviewStatusIcon(reviewStatus)}
      <span>{reviewStatus}</span>
    </span>
  );
};

// Helper function to clean document name - removes "Multiple Documents"
const cleanDocumentName = (documentName: string | undefined): string | null => {
  if (!documentName) return null;

  // Remove "Multiple Documents" and clean up the string
  const cleaned = documentName
    .replace(/Multiple Documents/gi, "")
    .replace(/^[,\s]+|[,\s]+$/g, "") // Remove leading/trailing commas and spaces
    .trim();

  // Return null if empty or just whitespace after cleaning
  return cleaned.length > 0 ? cleaned : null;
};

// Table Row Component - UPDATED: Show actual Episode ID from API
const DocumentRow: React.FC<{
  project: Project;
  index: number;
  onViewResults: (id: number, docId?: string, episodeId?: string) => void; // UPDATED: Added episodeId parameter
}> = ({ project, index, onViewResults }) => {
  const cleanedDocumentName = cleanDocumentName(
    project.documentName || project.fileName
  );

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {index + 1}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="flex items-center space-x-3">
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            {/* FIXED: Show actual Episode ID from API response */}
            <span
              className="truncate max-w-sm block font-medium text-lg font-mono"
              title={project.episodeId}
            >
              {project.episodeId || "N/A"}
            </span>
            {cleanedDocumentName && (
              <span
                className="text-sm text-gray-500 block truncate max-w-xs"
                title={cleanedDocumentName}
              >
                {cleanedDocumentName}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {project.createdDate || project.uploadDate}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <AIModelStatusBadge
          status={project.aiModelStatus || project.status || "Unknown"}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <CoderReviewStatusBadge
          reviewStatus={
            project.coderReviewStatus || project.reviewStatus || "Yet to Review"
          }
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>
                {project.suggestedCodes || project.remainingCount || 0} AI Model
                Recommendations
              </span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>
                {project.acceptedCodes || project.acceptCount || 0} Accepted
              </span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>
                {project.rejectedCodes || project.rejectCount || 0} Rejected
              </span>
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() =>
            onViewResults(project.id, project.docId, project.episodeId)
          } // UPDATED: Pass both docId and episodeId
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-white bg-blue-600 hover:bg-blue-700"
        >
          <Eye className="w-4 h-4" />
          <span>View Results</span>
        </button>
      </td>
    </tr>
  );
};

// Pagination Component
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700 font-medium">
          Rows per page:
        </span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">
          {startItem}–{endItem} of {totalItems}
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard: React.FC<DashboardProps> = ({
  codes = [],
  newlyAddedCodes = new Set(),
  onViewResults = () => {},
  onBackToUpload = () => {},
  setDashboardPage,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Load projects data
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        setProjectsError(null);
        const projectsData = await fetchProjects();

        // Transform API data to match our Project interface with new fields
        const transformedProjects: Project[] = projectsData.map(
          (project: any, index: number) => ({
            id: project.id || index + 1,
            fileName:
              project.fileName ||
              project.file_name ||
              project.name ||
              project.document_name ||
              `Document ${index + 1}`,
            docId: project.doc_id || project.docId || `pgn_doc_${index + 1}`,
            episodeId:
              project.episode_id || project.episodeId || `${index + 1}`, // FIXED: Use actual episode_id from API
            documentName:
              project.document_name ||
              project.doc_name ||
              project.docName ||
              project.fileName ||
              project.file_name ||
              project.name,
            uploadDate:
              project.uploadDate ||
              project.upload_date ||
              project.created_date ||
              project.created_at ||
              new Date().toLocaleDateString(),
            createdDate:
              project.created_date ||
              project.uploadDate ||
              project.upload_date ||
              project.created_at ||
              new Date().toLocaleDateString(),
            status: project.status || "COMPLETED",
            aiModelStatus: project.status || "COMPLETED",
            reviewStatus: project.review_status || "YET TO REVIEW",
            coderReviewStatus: project.review_status || "YET TO REVIEW",
            patientName: project.patientName || project.patient_name,
            totalCodes: project.totalCodes || project.total_codes,
            acceptedCodes:
              project.acceptedCodes ||
              project.accepted_codes ||
              project.accept_count ||
              0,
            rejectedCodes:
              project.rejectedCodes ||
              project.rejected_codes ||
              project.reject_count ||
              0,
            suggestedCodes:
              project.suggestedCodes ||
              project.suggested_codes ||
              project.remaining_count ||
              0,
            remainingCount: project.remaining_count || 0,
            acceptCount: project.accept_count || 0,
            rejectCount: project.reject_count || 0,
            pdgmScore: project.pdgmScore || project.pdgm_score,
          })
        );

        setProjects(transformedProjects);
      } catch (error) {
        console.error("Error loading projects:", error);
        setProjectsError(
          error instanceof Error ? error.message : "Failed to load projects"
        );

        // Fallback to mock data if API fails - Updated with proper Episode IDs
        const mockProjects: Project[] = [
          {
            id: 1,
            fileName: "485 ORDER V0.PDF, VISIT NOTE REPO....PDF",
            docId: "pgn_doc_2_5",
            episodeId: "976884", // FIXED: Use actual episode ID format from API
            documentName: "485 ORDER V0.PDF, VISIT NOTE REPO....PDF",
            uploadDate: "2025-06-20T11:44:33.821000",
            createdDate: "2025-06-20T11:44:33.821000",
            status: "COMPLETED",
            aiModelStatus: "COMPLETED",
            reviewStatus: "YET TO REVIEW",
            coderReviewStatus: "YET TO REVIEW",
            patientName: "Dawn Williams",
            totalCodes: 21,
            acceptedCodes: 0,
            rejectedCodes: 0,
            suggestedCodes: 21,
            remainingCount: 21,
            acceptCount: 0,
            rejectCount: 0,
            pdgmScore: 245,
          },
          {
            id: 2,
            fileName: "F_0000165119.PDF, F_0000108071.PD....PDF",
            docId: "pgn_doc_2_2",
            episodeId: "976885", // FIXED: Use actual episode ID format from API
            documentName: "F_0000165119.PDF, F_0000108071.PD....PDF",
            uploadDate: "2025-06-20T11:13:49.710000",
            createdDate: "2025-06-20T11:13:49.710000",
            status: "COMPLETED",
            aiModelStatus: "COMPLETED",
            reviewStatus: "IN PROGRESS",
            coderReviewStatus: "IN PROGRESS",
            patientName: "Dawn Williams",
            totalCodes: 20,
            acceptedCodes: 0,
            rejectedCodes: 2,
            suggestedCodes: 18,
            remainingCount: 18,
            acceptCount: 0,
            rejectCount: 2,
            pdgmScore: 180,
          },
          {
            id: 3,
            fileName: "485 ORDER V0.PDF, H&P 2.PDF, VISI....PDF",
            docId: "pgn_doc_4_2",
            episodeId: "976886", // FIXED: Use actual episode ID format from API
            documentName: "485 ORDER V0.PDF, H&P 2.PDF, VISI....PDF",
            uploadDate: "2025-06-18T16:53:00.000000",
            createdDate: "2025-06-18T16:53:00.000000",
            status: "COMPLETED",
            aiModelStatus: "COMPLETED",
            reviewStatus: "COMPLETED",
            coderReviewStatus: "COMPLETED",
            patientName: "Dawn Williams",
            totalCodes: 18,
            acceptedCodes: 15,
            rejectedCodes: 3,
            suggestedCodes: 0,
            remainingCount: 0,
            acceptCount: 15,
            rejectCount: 3,
            pdgmScore: 200,
          },
          {
            id: 4,
            fileName: "VISIT NOTE REPORT_V0.PDF, 485 ORD....PDF",
            docId: "pgn_doc_5_3",
            episodeId: "976887", // FIXED: Use actual episode ID format from API
            documentName: "VISIT NOTE REPORT_V0.PDF, 485 ORD....PDF",
            uploadDate: "2025-06-18T14:33:00.000000",
            createdDate: "2025-06-18T14:33:00.000000",
            status: "PROCESSING",
            aiModelStatus: "PROCESSING",
            reviewStatus: "YET TO REVIEW",
            coderReviewStatus: "YET TO REVIEW",
            patientName: "Dawn Williams",
            totalCodes: 0,
            acceptedCodes: 0,
            rejectedCodes: 0,
            suggestedCodes: 0,
            remainingCount: 0,
            acceptCount: 0,
            rejectCount: 0,
            pdgmScore: 0,
          },
        ];
        setProjects(mockProjects);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProjects = projects.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number): void => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleViewResults = (
    projectId: number,
    docId?: string,
    episodeId?: string
  ): void => {
    console.log(
      "Viewing results for project:",
      projectId,
      "with Doc ID:",
      docId,
      "and Episode ID:",
      episodeId
    );
    onViewResults(projectId, docId, episodeId); // Pass both docId and episodeId to parent
    setDashboardPage?.(false); // This sets the state to false in the parent App to go to coding view
  };

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ width: "90%", margin: "30px auto" }}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 mb-2">
              ICD Code Extraction Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Review and validate the coding results
            </p>
          </div>
          {projectsError && (
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  Using sample data
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Episodes
            </h3>
          </div>

          {isLoadingProjects ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading episodes...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Episode ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <span>Created Date</span>
                          <span className="text-gray-400">↓</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AI Model Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Coder Review Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Coding Summary
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentProjects.map((project, index) => (
                      <DocumentRow
                        key={project.id}
                        project={project}
                        index={indexOfFirstItem + index}
                        onViewResults={handleViewResults}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalItems={projects.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
