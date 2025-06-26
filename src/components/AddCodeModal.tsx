import { Loader2, Search, Shield, Star, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  addCode,
  fetchCodingResults,
  IcdSearchResult,
  searchIcdCodes,
} from "../services/api";
import { MedicalCode, SupportingInfo } from "../types/medical-codes";

interface DrawnBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  documentName: string;
  pageNumber: number;
}

interface AddCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCode: (code: MedicalCode, target?: "primary" | "secondary") => void;
  drawnBoundingBox?: DrawnBoundingBox | null;
  forcePrimary?: boolean; // Force primary selection (from primary section)
  forceSecondary?: boolean; // Force secondary selection (from secondary section)
  showTargetSelection?: boolean; // Show target selection (from PDF viewer or general add)
  currentDocId?: string; // Add document ID prop
}

const AddCodeModal: React.FC<AddCodeModalProps> = ({
  isOpen,
  onClose,
  onAddCode,
  drawnBoundingBox,
  forcePrimary = false,
  forceSecondary = false,
  showTargetSelection = false,
  currentDocId,
}) => {
  const [formData, setFormData] = useState({
    diagnosis_code: "",
    disease_description: "",
    reason_for_coding: "",
    active_disease_asof_1june2025: "True",
    supporting_sentence_for_active_disease: "",
    active_management_asof_1june2025: "True",
    supporting_sentence_for_active_management: "",
    considered_but_excluded: "False",
    reason_for_exclusion: "",
  });

  const [supportingInfo, setSupportingInfo] = useState<SupportingInfo[]>([
    {
      supporting_sentence_in_document: "",
      document_name: "H&P 5.pdf",
      section_name: "",
      page_number: "1",
      bounding_box: {
        x: 100,
        y: 200,
        width: 200,
        height: 20,
      },
    },
  ]);

  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // UPDATED: Target selection state (mandatory when showTargetSelection is true)
  const [selectedTarget, setSelectedTarget] = useState<
    "primary" | "secondary" | null
  >(null);

  // Unified Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IcdSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // NEW: State to track invalid search attempts
  const [showInvalidSearchMessage, setShowInvalidSearchMessage] =
    useState(false);
  // NEW: State to track when a code has been selected to prevent unnecessary API calls
  const [codeSelected, setCodeSelected] = useState(false);

  const documentOptions = [
    "H&P 5.pdf",
    "H&P 4.pdf",
    "Discharge Summary.pdf",
    "Nursing Assessment.pdf",
    "Lab Results.pdf",
  ];

  // UPDATED: Initialize target selection based on props
  useEffect(() => {
    if (forcePrimary) {
      setSelectedTarget("primary");
    } else if (forceSecondary) {
      setSelectedTarget("secondary");
    } else if (showTargetSelection) {
      setSelectedTarget(null); // User must select
    } else {
      setSelectedTarget("secondary"); // Default fallback
    }
  }, [forcePrimary, forceSecondary, showTargetSelection]);

  // Update supporting info when drawnBoundingBox changes
  useEffect(() => {
    if (drawnBoundingBox) {
      setSupportingInfo([
        {
          supporting_sentence_in_document: "",
          document_name: drawnBoundingBox.documentName,
          section_name: "",
          page_number: drawnBoundingBox.pageNumber.toString(),
          bounding_box: {
            x: drawnBoundingBox.x,
            y: drawnBoundingBox.y,
            width: drawnBoundingBox.width,
            height: drawnBoundingBox.height,
          },
        },
      ]);
    }
  }, [drawnBoundingBox]);

  // Unified Search functionality - searches both code and description
  useEffect(() => {
    // FIRST CHECK: If a code has been selected, do nothing at all
    if (codeSelected) {
      return;
    }

    const performSearch = async () => {
      // Don't search if less than 3 characters
      if (searchTerm.trim().length < 3) {
        setSearchResults([]);
        setShowSearchResults(false);
        setShowInvalidSearchMessage(false);
        return;
      }

      setIsSearching(true);
      setShowInvalidSearchMessage(false);

      try {
        // Search by both code and description, then combine and deduplicate results
        const [codeResults, descriptionResults] = await Promise.all([
          searchIcdCodes(searchTerm, "Code"),
          searchIcdCodes(searchTerm, "Description"),
        ]);

        // Combine results and remove duplicates based on Code
        const combinedResults = [...codeResults, ...descriptionResults];
        const uniqueResults = combinedResults.filter(
          (result, index, self) =>
            index === self.findIndex((r) => r.Code === result.Code)
        );

        const limitedResults = uniqueResults.slice(0, 10); // Limit to 10 results
        setSearchResults(limitedResults);

        // Show invalid search message if no results found
        if (limitedResults.length === 0) {
          setShowInvalidSearchMessage(true);
          setShowSearchResults(false);
        } else {
          setShowSearchResults(true);
          setShowInvalidSearchMessage(false);
        }
      } catch (error) {
        console.error("Error searching ICD codes:", error);
        setSearchResults([]);
        setShowSearchResults(false);
        setShowInvalidSearchMessage(true);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, codeSelected]); // Include codeSelected to prevent API calls after code selection

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle ICD code selection from search results
  const handleIcdCodeSelect = (result: IcdSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      diagnosis_code: result.Code,
      disease_description: result.Description,
    }));

    // Set code selected flag FIRST to prevent any API calls
    setCodeSelected(true);

    // Clear search results and hide dropdown immediately
    setSearchResults([]);
    setShowSearchResults(false);
    setShowInvalidSearchMessage(false);

    // Set the display text but this won't trigger search due to codeSelected flag
    setSearchTerm(`${result.Code} - ${result.Description}`);
  };

  const handleSupportingInfoChange = (
    index: number,
    field: keyof SupportingInfo,
    value: any
  ) => {
    setSupportingInfo((prev) =>
      prev.map((info, i) => (i === index ? { ...info, [field]: value } : info))
    );
  };

  const addSupportingInfo = () => {
    setSupportingInfo((prev) => [
      ...prev,
      {
        supporting_sentence_in_document: "",
        document_name: drawnBoundingBox?.documentName || "H&P 5.pdf",
        section_name: "",
        page_number: drawnBoundingBox?.pageNumber.toString() || "1",
        bounding_box: drawnBoundingBox
          ? {
              x: drawnBoundingBox.x,
              y: drawnBoundingBox.y,
              width: drawnBoundingBox.width,
              height: drawnBoundingBox.height,
            }
          : {
              x: 100,
              y: 200,
              width: 200,
              height: 20,
            },
      },
    ]);
  };

  const removeSupportingInfo = (index: number) => {
    if (supportingInfo.length > 1) {
      setSupportingInfo((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (
      !formData.diagnosis_code ||
      !formData.disease_description ||
      !formData.reason_for_coding
    ) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    // UPDATED: Validate target selection when required
    if (showTargetSelection && !selectedTarget) {
      setSubmitError(
        "Please select whether this is a primary or secondary diagnosis"
      );
      return;
    }

    const newCode: MedicalCode = {
      ...formData,
      supporting_info: supportingInfo.filter(
        (info) => info.supporting_sentence_in_document.trim() !== ""
      ),
    };

    // UPDATED: Use selected target or determine from props
    const finalTarget =
      selectedTarget || (forcePrimary ? "primary" : "secondary");
    console.log("AddCodeModal: Submitting with target:", finalTarget);

    handleDirectAdd(newCode, finalTarget);
  };

  const handleDirectAdd = async (
    newCode: MedicalCode,
    target: "primary" | "secondary"
  ) => {
    console.log("AddCodeModal: Calling addCode with target:", newCode);

    if (!currentDocId) {
      setSubmitError("Unable to add suggestion: No document ID available");
      return;
    }

    setIsSubmittingCode(true);
    setSubmitError(null);

    try {
      console.log(
        "FINAL API CALL - calling API with target:",
        target,
        "docId:",
        currentDocId
      );
      console.log("API response:", drawnBoundingBox);

      // Call the API with the target parameter
      const response = await addCode(
        currentDocId,
        newCode.diagnosis_code,
        newCode.disease_description,
        newCode.reason_for_coding,
        newCode.considered_but_excluded === "True",
        newCode.reason_for_exclusion || "",
        target,
        drawnBoundingBox,
        drawnBoundingBox.documentName,
        drawnBoundingBox.pageNumber
      );

      // Add to local state with proper classification
      const codeWithTarget = {
        ...newCode,
        is_primary: target === "primary",
        code_type: target,
      };

      console.log(
        "Adding suggestion to local state with target:",
        target,
        codeWithTarget
      );
      fetchCodingResults("EP_CERVANTES_MORAN_MARIA_D");
      onAddCode(codeWithTarget, target);
      handleClose();
    } catch (error) {
      console.error("Error adding suggestion:", error);
      setSubmitError(
        `Failed to add suggestion: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setFormData({
      diagnosis_code: "",
      disease_description: "",
      reason_for_coding: "",
      active_disease_asof_1june2025: "True",
      supporting_sentence_for_active_disease: "",
      active_management_asof_1june2025: "True",
      supporting_sentence_for_active_management: "",
      considered_but_excluded: "False",
      reason_for_exclusion: "",
    });
    setSupportingInfo([
      {
        supporting_sentence_in_document: "",
        document_name: "H&P 5.pdf",
        section_name: "",
        page_number: "1",
        bounding_box: {
          x: 100,
          y: 200,
          width: 200,
          height: 20,
        },
      },
    ]);
    setIsSubmittingCode(false);
    setSubmitError(null);
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchResults(false);
    setShowInvalidSearchMessage(false); // Reset invalid search message
    setCodeSelected(false); // Reset code selected flag
    setSelectedTarget(null); // Reset target selection
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Add New ICD Suggestion
              </h2>
              {drawnBoundingBox && (
                <p className="text-sm text-green-600 mt-1">
                  📍 Bounding box drawn on {drawnBoundingBox.documentName}, page{" "}
                  {drawnBoundingBox.pageNumber}
                </p>
              )}
              {currentDocId && (
                <p className="text-sm text-blue-600 mt-1">
                  Document: {currentDocId}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmittingCode}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="overflow-y-auto max-h-[calc(90vh-140px)]"
          >
            <div className="p-6 space-y-6">
              {/* UPDATED: Target Selection Section (when showTargetSelection is true) */}
              {showTargetSelection && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Classification Required
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Please select whether this ICD code should be classified as
                    a primary or secondary diagnosis:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedTarget("primary")}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedTarget === "primary"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-green-300 hover:bg-green-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Star className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">Primary Diagnosis</div>
                          <div className="text-xs text-gray-600">
                            Main condition requiring active management
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTarget("secondary")}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedTarget === "secondary"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">
                            Secondary Diagnosis
                          </div>
                          <div className="text-xs text-gray-600">
                            Additional context or comorbidity
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* UPDATED: Show selected target when forced */}
              {(forcePrimary || forceSecondary) && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    {forcePrimary ? (
                      <>
                        <Star className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-700">
                          Primary Diagnosis
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-700">
                          Secondary Diagnosis
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Unified ICD Code Search Section */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  <span>Search & Select ICD Suggestion</span>
                  <span className="text-sm text-gray-500 font-normal">
                    (Enter 3+ characters to search)
                  </span>
                </h3>

                {/* Single Search Field */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by ICD Code or Description
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCodeSelected(false); // Reset code selected flag when user starts typing again
                      }}
                      placeholder="e.g., I44, atrioventricular, E66.9, obesity, diabetes..."
                      className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      disabled={isSubmittingCode}
                    />
                    {isSearching && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-lg z-10">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleIcdCodeSelect(result)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          disabled={isSubmittingCode}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="font-mono text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {result.Code}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {result.Description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* NEW: Invalid Search Message */}
                  {showInvalidSearchMessage &&
                    searchTerm.trim().length >= 3 &&
                    !isSearching &&
                    !codeSelected && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700">
                          ⚠️ Please enter valid ICD code or valid description
                        </p>
                      </div>
                    )}
                </div>

                {/* Search Instructions */}
                <div className="mt-3 p-3 bg-blue-100 rounded-md">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Type at least 3 characters to
                    search by either ICD code (e.g., "I44") or description
                    (e.g., "atrioventricular"). Select from the dropdown to
                    auto-fill both fields.
                  </p>
                </div>
              </div>

              {/* Selected ICD Information - Read Only Display */}
              {formData.diagnosis_code && formData.disease_description && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Selected ICD Suggestion</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ICD Code
                      </label>
                      <div className="px-3 py-2 bg-white border border-gray-300 rounded-md font-mono text-blue-600 font-medium">
                        {formData.diagnosis_code}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <div className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900">
                        {formData.disease_description}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason for Coding */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Coding <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason_for_coding}
                  onChange={(e) =>
                    handleInputChange("reason_for_coding", e.target.value)
                  }
                  placeholder="Explain why this suggestion should be included..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmittingCode}
                />
              </div>

              {/* Supporting Information */}
              {/* <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Supporting Information
                  </h3>
                  <button
                    type="button"
                    onClick={addSupportingInfo}
                    disabled={isSubmittingCode}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Evidence</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {supportingInfo.map((info, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Evidence #{index + 1}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {drawnBoundingBox && index === 0 && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md">
                              📍 From drawn box
                            </span>
                          )}
                          {supportingInfo.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSupportingInfo(index)}
                              disabled={isSubmittingCode}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Supporting Sentence
                          </label>
                          <textarea
                            value={info.supporting_sentence_in_document}
                            onChange={(e) =>
                              handleSupportingInfoChange(
                                index,
                                "supporting_sentence_in_document",
                                e.target.value
                              )
                            }
                            placeholder="Quote the exact sentence from the document..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            disabled={isSubmittingCode}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document Name
                          </label>
                          <select
                            value={info.document_name}
                            onChange={(e) =>
                              handleSupportingInfoChange(
                                index,
                                "document_name",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={
                              (drawnBoundingBox && index === 0) ||
                              isSubmittingCode
                            }
                          >
                            {documentOptions.map((doc) => (
                              <option key={doc} value={doc}>
                                {doc}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Section Name
                          </label>
                          <input
                            type="text"
                            value={info.section_name}
                            onChange={(e) =>
                              handleSupportingInfoChange(
                                index,
                                "section_name",
                                e.target.value
                              )
                            }
                            placeholder="e.g., Medical Problems"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isSubmittingCode}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Page Number
                          </label>
                          <input
                            type="text"
                            value={info.page_number}
                            onChange={(e) =>
                              handleSupportingInfoChange(
                                index,
                                "page_number",
                                e.target.value
                              )
                            }
                            placeholder="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={
                              (drawnBoundingBox && index === 0) ||
                              isSubmittingCode
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmittingCode}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmittingCode ||
                  !currentDocId ||
                  !formData.diagnosis_code ||
                  !formData.disease_description ||
                  (showTargetSelection && !selectedTarget)
                }
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !currentDocId
                    ? "Document ID required to add suggestions"
                    : !formData.diagnosis_code || !formData.disease_description
                    ? "Please search and select an ICD suggestion first"
                    : showTargetSelection && !selectedTarget
                    ? "Please select primary or secondary classification"
                    : ""
                }
              >
                {isSubmittingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>
                    Add{" "}
                    {selectedTarget
                      ? selectedTarget === "primary"
                        ? "Primary"
                        : "Secondary"
                      : ""}{" "}
                    Suggestion
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddCodeModal;
