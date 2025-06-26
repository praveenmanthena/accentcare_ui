import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RotateCw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  convertSearchBboxToBoundingBox,
  DocumentSearchResult,
  searchDocument,
} from "../services/api";
import { HighlightRequest, MedicalCode } from "../types/medical-codes";
import AddCodeModal from "./AddCodeModal";

interface Document {
  id: string;
  name: string;
  pages: number;
  presignedUrls: Record<string, string>;
}

interface PDFViewerProps {
  highlightRequest?: HighlightRequest | null;
  onHighlightComplete?: () => void;
  documents: Document[];
  isLoading: boolean;
  codes: MedicalCode[];
  onUpdateCode?: (code: MedicalCode) => void;
  onIcdCodeSelect?: (icdCode: string) => void;
  selectedIcdCode?: string | null;
  onAddCode?: (code: MedicalCode, target?: "primary" | "secondary") => void;
  setDashboardPage?: (view: "coding" | "dashboard") => void;
  currentDocId?: string;
  selectedPatientName?: string | null;
  isDrawingMode?: boolean;
  onExitDrawingMode?: () => void;
}

interface DrawnBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  documentName: string;
  pageNumber: number;
}

interface SearchHighlight {
  boundingBox: { x: number; y: number; width: number; height: number };
  documentName: string;
  pageNumber: number;
  searchTerm: string;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  highlightRequest,
  onHighlightComplete,
  documents,
  isLoading,
  codes,
  onUpdateCode,
  onIcdCodeSelect,
  selectedIcdCode,
  onAddCode,
  setDashboardPage,
  currentDocId,
  selectedPatientName,
  isDrawingMode = false,
  onExitDrawingMode,
}) => {
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentBox, setCurrentBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [drawnBoundingBox, setDrawnBoundingBox] =
    useState<DrawnBoundingBox | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const [persistentHighlight, setPersistentHighlight] =
    useState<HighlightRequest | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showEvidenceLoading, setShowEvidenceLoading] = useState(false);

  // Document search states
  const [documentSearchTerm, setDocumentSearchTerm] = useState("");
  const [documentSearchResults, setDocumentSearchResults] = useState<
    DocumentSearchResult[]
  >([]);
  const [isDocumentSearching, setIsDocumentSearching] = useState(false);
  const [searchHighlight, setSearchHighlight] =
    useState<SearchHighlight | null>(null);
  const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(0);

  // Preloading state management
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(
    new Set()
  );
  const [isPageChanging, setIsPageChanging] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Refs for preloading images
  const preloadRefs = useRef<{ [key: string]: HTMLImageElement }>({});

  const currentDocument = documents[currentDocumentIndex];
  const currentPageUrl = currentDocument?.presignedUrls[currentPage.toString()];

  // Function to scroll to a bounding box
  const scrollToBoundingBox = useCallback(
    (boundingBox: BoundingBox, delay: number = 0) => {
      if (!imageRef.current || !containerRef.current || !imageLoaded) {
        return;
      }

      setTimeout(() => {
        if (!imageRef.current || !containerRef.current) return;

        const imageRect = imageRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Calculate the center of the bounding box in image coordinates
        const centerX =
          (boundingBox.x + boundingBox.width / 2) * imageRect.width;
        const centerY =
          (boundingBox.y + boundingBox.height / 2) * imageRect.height;

        // Get current scroll position
        const currentScrollLeft = containerRef.current.scrollLeft;
        const currentScrollTop = containerRef.current.scrollTop;

        // Calculate the position of the image relative to the container
        const imageLeft =
          imageRect.left - containerRect.left + currentScrollLeft;
        const imageTop = imageRect.top - containerRect.top + currentScrollTop;

        // Calculate target scroll position to center the bounding box
        const targetScrollLeft = imageLeft + centerX - containerRect.width / 2;
        const targetScrollTop = imageTop + centerY - containerRect.height / 2;

        // Smooth scroll to the target position
        containerRef.current.scrollTo({
          left: Math.max(0, targetScrollLeft),
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });

        console.log("📍 Scrolling to bounding box:", {
          boundingBox,
          centerX,
          centerY,
          targetScrollLeft,
          targetScrollTop,
          imageRect,
          containerRect,
        });
      }, delay);
    },
    [imageLoaded]
  );

  // Memoize debug logging to prevent infinite re-renders
  const debugInfo = useMemo(
    () => ({
      isDrawingMode,
      currentDocId,
    }),
    [isDrawingMode, currentDocId]
  );

  useEffect(() => {
    console.log("🎯 PDFViewer received props:", debugInfo);
  }, [debugInfo]);

  // Update page input value when currentPage changes
  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  // Preload adjacent pages for faster navigation
  const preloadAdjacentPages = useCallback(() => {
    if (!currentDocument) return;

    const pagesToPreload = [];

    // Preload next page
    if (currentPage < currentDocument.pages) {
      const nextPageUrl =
        currentDocument.presignedUrls[(currentPage + 1).toString()];
      if (nextPageUrl && !preloadedImages.has(nextPageUrl)) {
        pagesToPreload.push({
          url: nextPageUrl,
          key: `${currentDocumentIndex}-${currentPage + 1}`,
        });
      }
    }

    // Preload previous page
    if (currentPage > 1) {
      const prevPageUrl =
        currentDocument.presignedUrls[(currentPage - 1).toString()];
      if (prevPageUrl && !preloadedImages.has(prevPageUrl)) {
        pagesToPreload.push({
          url: prevPageUrl,
          key: `${currentDocumentIndex}-${currentPage - 1}`,
        });
      }
    }

    // Preload next 2 pages for smoother experience
    if (currentPage + 2 <= currentDocument.pages) {
      const nextPage2Url =
        currentDocument.presignedUrls[(currentPage + 2).toString()];
      if (nextPage2Url && !preloadedImages.has(nextPage2Url)) {
        pagesToPreload.push({
          url: nextPage2Url,
          key: `${currentDocumentIndex}-${currentPage + 2}`,
        });
      }
    }

    // Create and preload images
    pagesToPreload.forEach(({ url, key }) => {
      if (!preloadRefs.current[key]) {
        const img = new Image();
        img.onload = () => {
          setPreloadedImages((prev) => new Set([...prev, url]));
          console.log(`✅ Preloaded page: ${key}`);
        };
        img.onerror = () => {
          console.warn(`❌ Failed to preload page: ${key}`);
        };
        img.src = url;
        preloadRefs.current[key] = img;
      }
    });
  }, [currentDocument, currentPage, currentDocumentIndex, preloadedImages]);

  // Trigger preloading when page or document changes
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadAdjacentPages();
    }, 100);

    return () => clearTimeout(timer);
  }, [preloadAdjacentPages]);

  // Clear preloaded images when document changes
  useEffect(() => {
    setPreloadedImages(new Set());
    preloadRefs.current = {};
  }, [currentDocumentIndex]);

  // Document search functionality
  const handleDocumentSearch = useCallback(async () => {
    if (!documentSearchTerm.trim() || !currentDocId) {
      setDocumentSearchResults([]);
      setCurrentSearchResultIndex(0);
      return;
    }

    setIsDocumentSearching(true);
    try {
      console.log(
        "Searching document:",
        currentDocId,
        "for:",
        documentSearchTerm
      );
      const response = await searchDocument(currentDocId, documentSearchTerm);

      console.log("Document search response:", response);

      setDocumentSearchResults(response.results || []);
      setCurrentSearchResultIndex(0);

      // Auto-navigate to first result if results exist
      if (response.results && response.results.length > 0) {
        handleSearchResultClick(response.results[0]);
      }
    } catch (error) {
      console.error("Error searching document:", error);
      setDocumentSearchResults([]);
      setCurrentSearchResultIndex(0);
    } finally {
      setIsDocumentSearching(false);
    }
  }, [documentSearchTerm, currentDocId]);

  // Handle search result click
  const handleSearchResultClick = useCallback(
    (result: DocumentSearchResult) => {
      console.log("Search result clicked:", result);

      // Find the document index by name
      const docIndex = documents.findIndex(
        (doc) => doc.name === result.document_name
      );

      if (docIndex !== -1) {
        // Convert bbox to bounding box format
        const boundingBox = convertSearchBboxToBoundingBox(result.bbox);

        if (boundingBox) {
          // Navigate to the document and page
          setCurrentDocumentIndex(docIndex);
          setCurrentPage(result.page_number);

          // Clear existing highlights
          setPersistentHighlight(null);
          setSearchHighlight(null);

          // Show search loading indicator
          setShowEvidenceLoading(true);

          // Create search highlight
          const searchHighlightData: SearchHighlight = {
            boundingBox,
            documentName: result.document_name,
            pageNumber: result.page_number,
            searchTerm: documentSearchTerm,
          };

          // Wait for image to load before showing highlight and scrolling
          const showSearchHighlight = () => {
            setTimeout(() => {
              setSearchHighlight(searchHighlightData);
              setShowEvidenceLoading(false);

              // Scroll to the bounding box after highlight is set
              setTimeout(() => {
                scrollToBoundingBox(boundingBox, 100);
              }, 100);
            }, 1500);
          };

          // If image is already loaded, show highlight with delay
          if (
            imageLoaded &&
            currentDocumentIndex === docIndex &&
            currentPage === result.page_number
          ) {
            showSearchHighlight();
          } else {
            // Wait for navigation and image load
            const checkImageLoad = () => {
              if (imageRef.current?.complete) {
                showSearchHighlight();
              } else {
                setTimeout(checkImageLoad, 100);
              }
            };
            setTimeout(checkImageLoad, 200);
          }
        }
      }
    },
    [
      documents,
      documentSearchTerm,
      imageLoaded,
      currentDocumentIndex,
      currentPage,
      scrollToBoundingBox,
    ]
  );

  // Handle previous search result
  const handlePreviousSearchResult = useCallback(() => {
    if (documentSearchResults.length === 0) return;

    const newIndex =
      currentSearchResultIndex > 0
        ? currentSearchResultIndex - 1
        : documentSearchResults.length - 1;
    setCurrentSearchResultIndex(newIndex);
    handleSearchResultClick(documentSearchResults[newIndex]);
  }, [
    currentSearchResultIndex,
    documentSearchResults,
    handleSearchResultClick,
  ]);

  // Handle next search result
  const handleNextSearchResult = useCallback(() => {
    if (documentSearchResults.length === 0) return;

    const newIndex =
      currentSearchResultIndex < documentSearchResults.length - 1
        ? currentSearchResultIndex + 1
        : 0;
    setCurrentSearchResultIndex(newIndex);
    handleSearchResultClick(documentSearchResults[newIndex]);
  }, [
    currentSearchResultIndex,
    documentSearchResults,
    handleSearchResultClick,
  ]);

  // Handle document search input
  const handleDocumentSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setDocumentSearchTerm(value);

      // Clear results if search is empty
      if (!value.trim()) {
        setDocumentSearchResults([]);
        setCurrentSearchResultIndex(0);
        setSearchHighlight(null);
      }
    },
    []
  );

  // Handle document search key press
  const handleDocumentSearchKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleDocumentSearch();
      }
    },
    [handleDocumentSearch]
  );

  // Stable event handler with useCallback
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setShowDocumentDropdown(false);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // Reset image loaded state when page or document changes
  useEffect(() => {
    setImageLoaded(false);
    setIsPageChanging(false);
  }, [currentPageUrl, currentDocumentIndex, currentPage]);

  // Stable highlight handler with proper dependencies
  const handleHighlightRequest = useCallback(() => {
    if (!highlightRequest) return;

    // Find the document and navigate to it
    const docIndex = documents.findIndex(
      (doc) => doc.name === highlightRequest.documentName
    );
    if (docIndex !== -1) {
      setCurrentDocumentIndex(docIndex);
      setCurrentPage(highlightRequest.pageNumber);

      // Clear any existing highlight first
      setPersistentHighlight(null);
      setSearchHighlight(null);

      // Show evidence loading indicator immediately
      setShowEvidenceLoading(true);

      // Wait for image to load before showing highlight and scrolling
      const showHighlightAfterLoad = () => {
        // Add additional delay to ensure page is fully rendered
        setTimeout(() => {
          setPersistentHighlight(highlightRequest);
          // Hide evidence loading indicator when highlight appears
          setShowEvidenceLoading(false);

          // Scroll to the highlight after it's set
          setTimeout(() => {
            scrollToBoundingBox(highlightRequest.boundingBox, 100);
          }, 100);
        }, 1500); // 1.5 second delay after image loads
      };

      // If image is already loaded, show highlight with delay
      if (imageLoaded) {
        showHighlightAfterLoad();
      } else {
        // Wait for image load event, then show highlight with delay
        const checkImageLoad = () => {
          if (imageRef.current?.complete) {
            showHighlightAfterLoad();
          } else {
            // Check again in 100ms if image isn't loaded yet
            setTimeout(checkImageLoad, 100);
          }
        };
        checkImageLoad();
      }

      // Clear the original highlight request immediately
      onHighlightComplete?.();
    }
  }, [
    highlightRequest,
    documents,
    onHighlightComplete,
    imageLoaded,
    scrollToBoundingBox,
  ]);

  // Use stable handler with proper dependencies
  useEffect(() => {
    handleHighlightRequest();
  }, [handleHighlightRequest]);

  // Memoized handlers to prevent re-renders
  const handleZoomIn = useCallback(
    () => setZoom((prev) => Math.min(prev + 0.25, 3)),
    []
  );
  const handleZoomOut = useCallback(
    () => setZoom((prev) => Math.max(prev - 0.25, 0.5)),
    []
  );
  const handleRotate = useCallback(
    () => setRotation((prev) => (prev + 90) % 360),
    []
  );

  // Navigate to a specific page
  const navigateToPage = useCallback(
    (pageNumber: number) => {
      if (!currentDocument) return;

      const targetPage = Math.max(
        1,
        Math.min(pageNumber, currentDocument.pages)
      );

      if (targetPage !== currentPage) {
        setIsPageChanging(true);
        const targetPageUrl =
          currentDocument.presignedUrls[targetPage.toString()];

        // Check if the target page is already preloaded
        if (targetPageUrl && preloadedImages.has(targetPageUrl)) {
          console.log(`✅ Using preloaded page ${targetPage}`);
        } else {
          console.log(`⏳ Loading page ${targetPage}...`);
        }

        setCurrentPage(targetPage);

        // Clear persistent highlight when changing pages
        setPersistentHighlight(null);
        setSearchHighlight(null);
        // Hide evidence loading when changing pages
        setShowEvidenceLoading(false);

        // Clear search when changing pages since results are no longer relevant
        setDocumentSearchTerm("");
        setDocumentSearchResults([]);
        setCurrentSearchResultIndex(0);
      }
    },
    [currentDocument, currentPage, preloadedImages]
  );

  // Handle page input change
  const handlePageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Allow only numbers
      if (value === "" || /^\d+$/.test(value)) {
        setPageInputValue(value);
      }
    },
    []
  );

  // Handle page input submission (Enter key or blur)
  const handlePageInputSubmit = useCallback(() => {
    if (!currentDocument || !pageInputValue.trim()) {
      setPageInputValue(currentPage.toString());
      return;
    }

    const pageNumber = parseInt(pageInputValue, 10);

    if (isNaN(pageNumber)) {
      setPageInputValue(currentPage.toString());
      return;
    }

    navigateToPage(pageNumber);
  }, [currentDocument, pageInputValue, currentPage, navigateToPage]);

  // Handle page input key press
  const handlePageInputKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handlePageInputSubmit();
        (e.target as HTMLInputElement).blur();
      }
    },
    [handlePageInputSubmit]
  );

  // Enhanced page navigation with preloading check
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      navigateToPage(currentPage - 1);
    }
  }, [currentPage, navigateToPage]);

  const handleNextPage = useCallback(() => {
    if (currentDocument && currentPage < currentDocument.pages) {
      navigateToPage(currentPage + 1);
    }
  }, [currentDocument, currentPage, navigateToPage]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore shortcuts while user is typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft": // ⬅ previous page
          handlePrevPage();
          break;
        case "ArrowRight": // ➡ next page
          handleNextPage();
          break;

        default:
          return; // let browser handle everything else
      }

      e.preventDefault(); // stop the default scroll/selection behaviour
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePrevPage, handleNextPage]);

  const handlePrevDocument = useCallback(() => {
    if (currentDocumentIndex > 0) {
      setCurrentDocumentIndex((prev) => prev - 1);
      setCurrentPage(1);
      // Clear persistent highlight when changing documents
      setPersistentHighlight(null);
      setSearchHighlight(null);
      // Hide evidence loading when changing documents
      setShowEvidenceLoading(false);
    }
  }, [currentDocumentIndex]);

  const handleNextDocument = useCallback(() => {
    if (currentDocumentIndex < documents.length - 1) {
      setCurrentDocumentIndex((prev) => prev + 1);
      setCurrentPage(1);
      // Clear persistent highlight when changing documents
      setPersistentHighlight(null);
      setSearchHighlight(null);
      // Hide evidence loading when changing documents
      setShowEvidenceLoading(false);
    }
  }, [currentDocumentIndex, documents.length]);

  const handleDocumentSelect = useCallback((index: number) => {
    setCurrentDocumentIndex(index);
    setCurrentPage(1);
    setShowDocumentDropdown(false);
    // Clear persistent highlight when changing documents
    setPersistentHighlight(null);
    setSearchHighlight(null);
    // Hide evidence loading when changing documents
    setShowEvidenceLoading(false);
  }, []);

  // Enhanced image load handler
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setIsPageChanging(false);
    console.log("✅ Current page loaded");
  }, []);

  // Only allow drawing when in drawing mode
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!imageRef.current || !isDrawingMode) return;

      console.log("🎯 PDFViewer: Starting to draw");

      const rect = imageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentBox({ x, y, width: 0, height: 0 });

      // Clear persistent highlight when starting to draw
      setPersistentHighlight(null);
      setSearchHighlight(null);
      // Hide evidence loading when starting to draw
      setShowEvidenceLoading(false);
    },
    [isDrawingMode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !startPoint || !imageRef.current || !isDrawingMode)
        return;

      const rect = imageRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / rect.width;
      const currentY = (e.clientY - rect.top) / rect.height;

      const width = currentX - startPoint.x;
      const height = currentY - startPoint.y;

      setCurrentBox({
        x: Math.min(startPoint.x, currentX),
        y: Math.min(startPoint.y, currentY),
        width: Math.abs(width),
        height: Math.abs(height),
      });
    },
    [isDrawing, startPoint, isDrawingMode]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentBox || !currentDocument || !isDrawingMode) return;

    console.log("🎯 PDFViewer: Finished drawing, opening modal");

    setIsDrawing(false);

    // Only create bounding box if it has meaningful size
    if (currentBox.width > 0.01 && currentBox.height > 0.01) {
      const boundingBox: DrawnBoundingBox = {
        x: currentBox.x,
        y: currentBox.y,
        width: currentBox.width,
        height: currentBox.height,
        documentName: currentDocument.name,
        pageNumber: currentPage,
      };

      setDrawnBoundingBox(boundingBox);
      setIsAddModalOpen(true);
      // Exit drawing mode after drawing
      onExitDrawingMode?.();
    }

    setStartPoint(null);
    setCurrentBox(null);
  }, [
    isDrawing,
    currentBox,
    currentDocument,
    isDrawingMode,
    currentPage,
    onExitDrawingMode,
  ]);

  const handleAddCode = useCallback(
    (newCode: MedicalCode, target?: "primary" | "secondary") => {
      console.log("🎯 PDFViewer.handleAddCode called with:", {
        newCode,
        target,
      });
      onAddCode?.(newCode, target);
      setDrawnBoundingBox(null);
    },
    [onAddCode]
  );

  // Clear document search
  const clearDocumentSearch = useCallback(() => {
    setDocumentSearchTerm("");
    setDocumentSearchResults([]);
    setSearchHighlight(null);
    setCurrentSearchResultIndex(0);
  }, []);

  // Memoized highlight style to prevent re-computation
  const highlightStyle = useMemo(() => {
    if (!persistentHighlight || !imageLoaded) return {};

    const { boundingBox } = persistentHighlight;
    return {
      position: "absolute" as const,
      left: `${boundingBox.x * 100}%`,
      top: `${boundingBox.y * 100}%`,
      width: `${boundingBox.width * 100}%`,
      height: `${boundingBox.height * 100}%`,
      backgroundColor: "rgba(255, 255, 0, 0.3)",
      border: "2px solid #fbbf24",
      pointerEvents: "none" as const,
      zIndex: 10,
      animation: "pulse 2s infinite",
    };
  }, [persistentHighlight, imageLoaded]);

  // Memoized search highlight style
  const searchHighlightStyle = useMemo(() => {
    if (!searchHighlight || !imageLoaded) return {};

    const { boundingBox } = searchHighlight;
    return {
      position: "absolute" as const,
      left: `${boundingBox.x * 100}%`,
      top: `${boundingBox.y * 100}%`,
      width: `${boundingBox.width * 100}%`,
      height: `${boundingBox.height * 100}%`,
      backgroundColor: "rgba(34, 197, 94, 0.3)", // Green highlight for search results
      border: "2px solid #16a34a",
      pointerEvents: "none" as const,
      zIndex: 15, // Higher than evidence highlights
      animation: "pulse 2s infinite",
    };
  }, [searchHighlight, imageLoaded]);

  // Memoized current box style
  const currentBoxStyle = useMemo(() => {
    if (!currentBox) return {};

    return {
      position: "absolute" as const,
      left: `${currentBox.x * 100}%`,
      top: `${currentBox.y * 100}%`,
      width: `${currentBox.width * 100}%`,
      height: `${currentBox.height * 100}%`,
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      border: "2px dashed #3b82f6",
      pointerEvents: "none" as const,
      zIndex: 10,
    };
  }, [currentBox]);

  // Memoized evidence loading style
  const evidenceLoadingStyle = useMemo(
    () => ({
      position: "fixed" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 50,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "16px 24px",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      fontSize: "14px",
      fontWeight: "500",
      backdropFilter: "blur(4px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    }),
    []
  );

  // Memoized modal close handler
  const handleModalClose = useCallback(() => {
    setIsAddModalOpen(false);
    setDrawnBoundingBox(null);
    // Exit drawing mode when closing modal
    onExitDrawingMode?.();
  }, [onExitDrawingMode]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading documents...</p>
          {selectedPatientName && (
            <p className="text-sm text-gray-500 mt-2">
              Loading documents for {selectedPatientName}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!documents.length) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No documents available</p>
          {selectedPatientName && (
            <p className="text-sm text-gray-500 mt-2">
              No documents found for {selectedPatientName}
            </p>
          )}
          {currentDocId && (
            <p className="text-xs text-blue-600 mt-1 font-mono">
              Document ID: {currentDocId}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Evidence Loading Indicator */}
      {showEvidenceLoading && (
        <div style={evidenceLoadingStyle}>
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span>
            {searchHighlight
              ? "Showing search result..."
              : "Showing the evidence..."}
          </span>
        </div>
      )}

      {/* Page Loading Indicator */}
      {isPageChanging && !imageLoaded && (
        <div className="fixed top-20 right-4 z-40 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading page...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <FileText className="w-5 h-5 text-gray-600" />

          <div className="relative" ref={dropdownRef}>
            {/* Document Dropdown */}
            <button
              onClick={() => setShowDocumentDropdown(!showDocumentDropdown)}
              className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors min-w-[200px] text-left"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 truncate text-sm">
                  {currentDocument?.name}
                </div>
                <div className="text-xs text-gray-600">
                  Page {currentPage} of {currentDocument?.pages}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  showDocumentDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {showDocumentDropdown && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {documents.length > 0 ? (
                  documents.map((doc, index) => (
                    <button
                      key={doc.id}
                      onClick={() => handleDocumentSelect(index)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        index === currentDocumentIndex
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-900"
                      }`}
                    >
                      <div className="font-medium truncate text-sm">
                        {doc.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {doc.pages} page{doc.pages !== 1 ? "s" : ""}
                        {index === currentDocumentIndex && (
                          <span className="ml-2 text-blue-600 font-medium">
                            • Current
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-center text-gray-500">
                    <p>No documents available</p>
                    {selectedPatientName && (
                      <p className="text-xs mt-1">for {selectedPatientName}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Document Search with Inline Navigation */}
          <div className="flex items-center">
            <div className="relative flex items-center bg-white border border-gray-300 rounded-lg">
              <Search className="absolute left-3 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search in documents..."
                value={documentSearchTerm}
                onChange={handleDocumentSearchChange}
                onKeyPress={handleDocumentSearchKeyPress}
                className="pl-10 pr-4 py-2 border-0 rounded-l-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm w-64 outline-none"
                disabled={!currentDocId}
              />

              {/* Results counter and navigation */}
              {documentSearchResults.length > 0 && (
                <div className="flex items-center px-2 border-l border-gray-200">
                  <span className="text-sm text-gray-600 mr-2">
                    {currentSearchResultIndex + 1}/
                    {documentSearchResults.length}
                  </span>
                  <button
                    onClick={handlePreviousSearchResult}
                    disabled={currentSearchResultIndex === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous result"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={handleNextSearchResult}
                    disabled={
                      currentSearchResultIndex ===
                      documentSearchResults.length - 1
                    }
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next result"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}

              {/* No results message */}
              {documentSearchTerm.trim() &&
                documentSearchResults.length === 0 &&
                !isDocumentSearching && (
                  <div className="flex items-center px-2 border-l border-gray-200">
                    <span className="text-sm text-gray-500 italic">
                      No results found
                    </span>
                  </div>
                )}

              {/* Loading indicator and clear button */}
              <div className="flex items-center px-2 border-l border-gray-200">
                {isDocumentSearching && (
                  <Loader2 className="w-4 h-4 animate-spin text-green-500 mr-1" />
                )}
                {documentSearchTerm && (
                  <button
                    onClick={clearDocumentSearch}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dashboard Button */}
          <button
            onClick={() => setDashboardPage?.("dashboard")}
            className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        {/* Document Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevDocument}
            disabled={currentDocumentIndex === 0}
            className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Doc {currentDocumentIndex + 1} of {documents.length}
          </span>
          <button
            onClick={handleNextDocument}
            disabled={currentDocumentIndex === documents.length - 1}
            className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Page Navigation with Input Box */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <span>Page</span>
            <input
              type="text"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onBlur={handlePageInputSubmit}
              onKeyPress={handlePageInputKeyPress}
              className="w-12 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              title="Enter page number and press Enter"
            />
            <span>of {currentDocument?.pages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={!currentDocument || currentPage === currentDocument.pages}
            className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom and Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-md hover:bg-gray-200"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-md hover:bg-gray-200"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-md hover:bg-gray-200"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <a
            href={currentPageUrl}
            download
            className="p-2 rounded-md hover:bg-gray-200"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* PDF Content */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="flex justify-center">
          <div
            className="relative bg-white shadow-lg"
            style={{
              transform: `rotate(${rotation}deg) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {currentPageUrl ? (
              <>
                <img
                  ref={imageRef}
                  src={currentPageUrl}
                  alt={`Page ${currentPage} of ${currentDocument?.name}`}
                  className={`max-w-full h-auto transition-opacity duration-200 ${
                    imageLoaded ? "opacity-100" : "opacity-50"
                  } ${isDrawingMode ? "cursor-crosshair" : "cursor-default"}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onLoad={handleImageLoad}
                  draggable={false}
                />

                {/* Loading overlay for page changes */}
                {isPageChanging && !imageLoaded && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">
                        Loading page...
                      </span>
                    </div>
                  </div>
                )}

                {/* Persistent highlight overlay - only show when image is loaded */}
                {persistentHighlight && imageLoaded && (
                  <div style={highlightStyle} />
                )}

                {/* Search highlight overlay - only show when image is loaded */}
                {searchHighlight && imageLoaded && (
                  <div style={searchHighlightStyle}>
                    {/* Search result indicator */}
                    <div className="absolute -top-8 left-0 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                      Search Result: "{searchHighlight.searchTerm}"
                    </div>
                  </div>
                )}

                {/* Current drawing box */}
                {currentBox && <div style={currentBoxStyle} />}
              </>
            ) : (
              <div className="w-96 h-96 flex items-center justify-center bg-gray-200">
                <p className="text-gray-500">Page not available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-3 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-blue-700">
          {isDrawingMode ? (
            <>
              🎯 <strong>Drawing Mode Active:</strong> Click and drag on the
              document to draw a bounding box around the supporting sentence for
              your ICD code.
            </>
          ) : (
            <>
              💡 <strong>Tip:</strong> Click "Add ICD Code" in the right panel
              to start adding a new code with supporting evidence from this
              document. Use the search box to filter ICD codes in the right
              panel. Type a page number and press Enter to jump to any page.
            </>
          )}
          {selectedPatientName && (
            <span className="ml-2 font-medium">
              Currently viewing: {selectedPatientName}
            </span>
          )}
          {currentDocId && (
            <span className="ml-2 text-blue-600 font-mono text-xs">
              (Doc ID: {currentDocId})
            </span>
          )}
        </p>
      </div>

      {/* Add Code Modal - Now shows target selection */}
      <AddCodeModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        onAddCode={handleAddCode}
        drawnBoundingBox={drawnBoundingBox}
        showTargetSelection={true}
        currentDocId={currentDocId}
      />
    </div>
  );
};

export default PDFViewer;
