import React, { useState, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND } from "lexical";          // <-- from lexical core
import { $getSelection, $isRangeSelection } from "lexical";


export default function EditorToolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Apply formatting
  const applyBold = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  const applyItalic = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  const applyUnderline = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  const handleUndo = () => editor.undo();
  const handleRedo = () => editor.redo();

  // Listen to selection changes
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));
        } else {
          setIsBold(false);
          setIsItalic(false);
          setIsUnderline(false);
        }
      });
    });
  }, [editor]);

  // Helper for button classes
  const buttonClass = (active) =>
    `px-2 py-1 border rounded ${active ? 'bg-blue-600 text-white' : ''}`;

  return (
    <div className="editor-toolbar mb-2 flex justify-end space-x-2">
      <button onClick={applyBold} className={buttonClass(isBold)}>B</button>
      <button onClick={applyItalic} className={buttonClass(isItalic)}>I</button>
      <button onClick={applyUnderline} className={buttonClass(isUnderline)}>U</button>
      <button onClick={handleUndo} className="px-2 py-1 border rounded">Undo</button>
      <button onClick={handleRedo} className="px-2 py-1 border rounded">Redo</button>
    </div>
  );
}
