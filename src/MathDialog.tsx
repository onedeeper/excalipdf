import { useState, useEffect, useRef, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./MathDialog.css";

interface MathDialogProps {
  isOpen: boolean;
  initialLatex: string;
  onInsert: (latex: string) => void;
  onCancel: () => void;
}

export function MathDialog({
  isOpen,
  initialLatex,
  onInsert,
  onCancel,
}: MathDialogProps) {
  const [latex, setLatex] = useState(initialLatex);
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLatex(initialLatex);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [initialLatex, isOpen]);

  useEffect(() => {
    if (!previewRef.current) return;
    if (latex.trim()) {
      try {
        katex.render(latex, previewRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        previewRef.current.textContent = "Invalid LaTeX";
      }
    } else {
      previewRef.current.textContent = "";
    }
  }, [latex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Prevent Excalidraw from capturing keys while dialog is open
      e.stopPropagation();
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        if (latex.trim()) onInsert(latex);
      }
    },
    [latex, onInsert, onCancel],
  );

  if (!isOpen) return null;

  return (
    <div className="math-overlay" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className="math-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{initialLatex ? "Edit Equation" : "Insert Equation"}</h3>
        <textarea
          ref={textareaRef}
          className="math-input"
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter LaTeX, e.g. E = mc^2"
          spellCheck={false}
        />
        <div className="math-preview" ref={previewRef} />
        <div className="math-hint">
          <kbd>{navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}</kbd>+
          <kbd>Enter</kbd> to insert
        </div>
        <div className="math-actions">
          <button className="math-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="math-btn insert"
            onClick={() => onInsert(latex)}
            disabled={!latex.trim()}
          >
            {initialLatex ? "Update" : "Insert"}
          </button>
        </div>
      </div>
    </div>
  );
}
