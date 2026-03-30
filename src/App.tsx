import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  Excalidraw,
  MainMenu,
  MIME_TYPES,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  FileId,
} from "@excalidraw/excalidraw/element/types";
import { renderPdf } from "./pdf-utils";
import type { PdfPage } from "./pdf-utils";
import type { TabState, PdfSceneData } from "./types";
import "@excalidraw/excalidraw/index.css";
import "./App.css";

const PAGE_GAP = 60;
const SAVE_DEBOUNCE_MS = 1000;
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_PDF_PAGES = 200;

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getSaveKey(pdfName: string): string {
  // Sanitize to alphanumeric, dots, hyphens, underscores to avoid
  // localStorage key injection via crafted filenames
  const safe = pdfName.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 128);
  return `excalipdf:${safe}`;
}

// ── Helpers ─────────────────────────────────────────────────

function buildSceneData(pages: PdfPage[], pdfName: string): PdfSceneData {
  const files: BinaryFiles = {};
  const skeletons: Array<Record<string, unknown>> = [];
  const pdfElementIds = new Set<string>();
  let yOffset = 0;

  for (const page of pages) {
    const fileId = generateId();
    const elementId = generateId();
    pdfElementIds.add(elementId);

    const displayWidth = page.width / 2;
    const displayHeight = page.height / 2;

    files[fileId] = {
      mimeType: MIME_TYPES.png,
      id: fileId as FileId,
      dataURL: page.dataURL as BinaryFileData["dataURL"],
      created: Date.now(),
      lastRetrieved: Date.now(),
    };

    skeletons.push({
      type: "image",
      id: elementId,
      x: 0,
      y: yOffset,
      width: displayWidth,
      height: displayHeight,
      fileId: fileId as FileId,
      locked: true,
    });

    yOffset += displayHeight + PAGE_GAP;
  }

  const pdfElements = convertToExcalidrawElements(
    skeletons as Parameters<typeof convertToExcalidrawElements>[0],
  );

  let annotations: ExcalidrawElement[] = [];
  try {
    const saved = localStorage.getItem(getSaveKey(pdfName));
    if (saved) annotations = JSON.parse(saved);
  } catch {
    // ignore
  }

  return {
    elements: [...pdfElements, ...annotations],
    files,
    pdfElementIds,
  };
}

// ── App ─────────────────────────────────────────────────────

function App() {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  // ── Snapshot active tab before switching ──

  const snapshotActiveTab = useCallback(() => {
    const api = excalidrawAPIRef.current;
    if (!api || !activeTabId) return;

    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();

    // Null the ref so nothing else uses the stale instance during transition
    excalidrawAPIRef.current = null;

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, sceneSnapshot: { elements, files, appState } }
          : tab,
      ),
    );
  }, [activeTabId]);

  // ── Load files ──

  const loadPdf = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
        return;
      }
      setLoading(true);
      try {
        const result = await renderPdf(file, 2, MAX_PDF_PAGES);
        const scene = buildSceneData(result.pages, file.name);

        const newTab: TabState = {
          id: generateId(),
          name: file.name,
          type: "pdf",
          pdfPages: result.pages,
          pdfElementIds: scene.pdfElementIds,
          sceneSnapshot: null,
          initialScene: {
            elements: scene.elements,
            files: scene.files,
            appState: { viewBackgroundColor: "#f5f5f5" },
          },
        };

        snapshotActiveTab();
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } catch (err) {
        console.error("Failed to render PDF:", err);
        alert("Failed to render PDF. Make sure it's a valid PDF file.");
      } finally {
        setLoading(false);
      }
    },
    [snapshotActiveTab],
  );

  const loadExcalidrawFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
        return;
      }
      setLoading(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (typeof data !== "object" || data === null || Array.isArray(data)) {
          throw new Error("Invalid file structure");
        }
        if (data.elements != null && !Array.isArray(data.elements)) {
          throw new Error("Invalid elements field");
        }

        const newTab: TabState = {
          id: generateId(),
          name: file.name,
          type: "excalidraw",
          pdfPages: null,
          pdfElementIds: new Set(),
          sceneSnapshot: null,
          initialScene: {
            elements: data.elements || [],
            files: data.files || {},
            appState: {
              viewBackgroundColor:
                data.appState?.viewBackgroundColor || "#f5f5f5",
              zoom: data.appState?.zoom,
              scrollX: data.appState?.scrollX,
              scrollY: data.appState?.scrollY,
              theme: data.appState?.theme,
            },
          },
        };

        snapshotActiveTab();
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } catch (err) {
        console.error("Failed to load .excalidraw file:", err);
        alert("Failed to load file. Make sure it's a valid .excalidraw file.");
      } finally {
        setLoading(false);
      }
    },
    [snapshotActiveTab],
  );

  const loadFile = useCallback(
    (file: File) => {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        loadPdf(file);
      } else if (
        file.name.endsWith(".excalidraw") ||
        file.name.endsWith(".json")
      ) {
        loadExcalidrawFile(file);
      }
    },
    [loadPdf, loadExcalidrawFile],
  );

  const newCanvas = useCallback(() => {
    const newTab: TabState = {
      id: generateId(),
      name: "Untitled",
      type: "excalidraw",
      pdfPages: null,
      pdfElementIds: new Set(),
      sceneSnapshot: null,
      initialScene: {
        elements: [],
        files: {},
        appState: { viewBackgroundColor: "#ffffff" },
      },
    };
    snapshotActiveTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [snapshotActiveTab]);

  // ── Tab management ──

  const switchTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTabId) return;
      snapshotActiveTab();
      setActiveTabId(tabId);
    },
    [activeTabId, snapshotActiveTab],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        const newTabs = prev.filter((t) => t.id !== tabId);

        if (tabId === activeTabId) {
          if (newTabs.length === 0) {
            setActiveTabId(null);
          } else {
            const newIdx = Math.min(idx, newTabs.length - 1);
            setActiveTabId(newTabs[newIdx].id);
          }
          excalidrawAPIRef.current = null;
        }

        return newTabs;
      });
    },
    [activeTabId],
  );

  // ── Excalidraw callbacks ──

  const onExcalidrawAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      excalidrawAPIRef.current = api;
      // Only auto-scroll on first mount (no snapshot = first time viewing)
      if (activeTab && !activeTab.sceneSnapshot) {
        setTimeout(() => {
          api.scrollToContent(undefined, { fitToContent: true });
        }, 200);
      }
    },
    [activeTab],
  );

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (!activeTab || activeTab.type !== "pdf") return;

      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const annotations = elements.filter(
          (el) => !activeTab.pdfElementIds.has(el.id) && !el.isDeleted,
        );
        try {
          localStorage.setItem(
            getSaveKey(activeTab.name),
            JSON.stringify(annotations),
          );
        } catch {
          // localStorage full
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [activeTab],
  );

  useEffect(() => {
    return () => clearTimeout(saveTimerRef.current);
  }, []);

  // ── Get initial data for a tab ──

  const getInitialData = useCallback((tab: TabState) => {
    if (tab.sceneSnapshot) {
      return {
        elements: tab.sceneSnapshot.elements,
        files: tab.sceneSnapshot.files,
        appState: tab.sceneSnapshot.appState,
      };
    }
    return tab.initialScene;
  }, []);

  // ── Drag and drop ──

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const handlePdfInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdf(file);
      e.target.value = "";
    },
    [loadPdf],
  );

  const handleExcalidrawInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadExcalidrawFile(file);
      e.target.value = "";
    },
    [loadExcalidrawFile],
  );

  // ── Render ──

  // No tabs: show drop zone
  if (tabs.length === 0) {
    return (
      <div
        className="app"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          onChange={handlePdfInput}
          hidden
        />
        <div
          className={`dropzone ${dragOver ? "drag-over" : ""} ${loading ? "loading" : ""}`}
        >
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
              <p>Loading...</p>
            </div>
          ) : (
            <>
              <h1>ExcaliPDF</h1>
              <p>Drop a PDF or .excalidraw file to get started</p>
              <p className="hint">or</p>
              <div className="button-row">
                <label className="file-button">
                  Open PDF
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfInput}
                    hidden
                  />
                </label>
                <label className="file-button secondary">
                  Open .excalidraw
                  <input
                    type="file"
                    accept=".excalidraw,.json"
                    onChange={handleExcalidrawInput}
                    hidden
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Tabs exist: show tab bar + Excalidraw
  return (
    <div
      className="app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        onChange={handlePdfInput}
        hidden
      />

      <div className="tab-bar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => switchTab(tab.id)}
          >
            <span className="tab-name">{tab.name}</span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              &times;
            </button>
          </div>
        ))}
        <button className="tab-add" onClick={newCanvas} title="New canvas">
          +
        </button>
      </div>

      {loading && (
        <div className="tab-loading">
          <div className="spinner" />
        </div>
      )}

      {activeTab && (
        <div className="excalidraw-wrapper" key={activeTab.id}>
          <Excalidraw
            excalidrawAPI={onExcalidrawAPI}
            onChange={handleChange}
            initialData={getInitialData(activeTab)}
          >
            <MainMenu>
              <MainMenu.Item onSelect={() => newCanvas()}>
                New Canvas
              </MainMenu.Item>
              <MainMenu.Item onSelect={() => pdfInputRef.current?.click()}>
                Open PDF...
              </MainMenu.Item>
              <MainMenu.DefaultItems.SaveToActiveFile />
              <MainMenu.DefaultItems.Export />
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.Separator />
              <MainMenu.DefaultItems.SearchMenu />
              <MainMenu.DefaultItems.Help />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.Separator />
              <MainMenu.DefaultItems.ToggleTheme />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </MainMenu>
          </Excalidraw>
        </div>
      )}
    </div>
  );
}

export default App;
