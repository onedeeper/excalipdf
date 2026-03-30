import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { PdfPage } from "./pdf-utils";

export interface SceneSnapshot {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  appState: Record<string, unknown>;
}

export interface InitialScene {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  appState?: Record<string, unknown>;
}

export interface TabState {
  id: string;
  name: string;
  type: "pdf" | "excalidraw";
  pdfPages: PdfPage[] | null;
  pdfElementIds: Set<string>;
  sceneSnapshot: SceneSnapshot | null;
  initialScene: InitialScene;
}

export interface PdfSceneData {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  pdfElementIds: Set<string>;
}
