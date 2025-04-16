import React, { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Textarea } from "@/components/ui/textarea";

interface AutoBulletTextareaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

const AutoBulletTextarea: React.FC<AutoBulletTextareaProps> = ({
  value,
  onChange,
  rows = 3,
  placeholder = "",
  className = "",
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;
      
      // Get current value and cursor position
      const currentValue = textarea.value;
      
      // Get the current line before cursor
      const textBeforeCursor = currentValue.substring(0, selectionStart);
      const textAfterCursor = currentValue.substring(selectionStart);
      
      // Find the start of the current line
      const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
      const currentLineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;
      const currentLine = textBeforeCursor.substring(currentLineStart);
      
      // Check if current line starts with "- " to continue the bullet point style
      let newLine = '\n';
      if (currentLine.trim().startsWith('- ')) {
        newLine = '\n- ';
      } else if (currentLine.trim() === '-') {
        // If the line only has '-', convert it to a proper bullet
        const updatedTextBeforeCursor = textBeforeCursor.substring(0, currentLineStart) + '- ' + 
          textBeforeCursor.substring(currentLineStart + 1);
        const newValue = updatedTextBeforeCursor + textAfterCursor;
        onChange(newValue);
        
        // Set cursor position after the bullet
        setTimeout(() => {
          if (textareaRef.current) {
            const newPosition = currentLineStart + 2;
            textareaRef.current.selectionStart = newPosition;
            textareaRef.current.selectionEnd = newPosition;
          }
        }, 0);
        return;
      }
      
      // Insert the new line at the cursor position
      const newValue = textBeforeCursor + newLine + textAfterCursor;
      onChange(newValue);
      
      // Set the cursor position after the new line/bullet point
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = selectionStart + newLine.length;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
        }
      }, 0);
    }
    
    // Handle backspace to remove bullet points
    else if (e.key === 'Backspace') {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;
      
      // Only handle if there's no selection (just cursor)
      if (selectionStart === selectionEnd) {
        const currentValue = textarea.value;
        const textBeforeCursor = currentValue.substring(0, selectionStart);
        
        // Find the start of the current line
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        const currentLineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;
        
        // Check if cursor is right after "- " at the start of a line
        if (
          selectionStart === currentLineStart + 2 &&
          textBeforeCursor.substring(currentLineStart) === '- '
        ) {
          e.preventDefault();
          
          // Remove the bullet point
          const newValue = 
            currentValue.substring(0, currentLineStart) + 
            currentValue.substring(selectionStart);
            
          onChange(newValue);
          
          // Set cursor position at the start of the line
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = currentLineStart;
              textareaRef.current.selectionEnd = currentLineStart;
            }
          }, 0);
        }
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Auto-convert lines starting with a single dash to bullet points
    // If a line starts with just '-', automatically add a space after it
    const lines = newValue.split('\n');
    let modified = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '-') {
        lines[i] = '- ';
        modified = true;
      }
    }
    
    if (modified) {
      const formattedValue = lines.join('\n');
      onChange(formattedValue);
      
      // Try to keep cursor position intact
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = e.target.selectionStart + 1; // +1 for the added space
          textareaRef.current.selectionStart = pos;
          textareaRef.current.selectionEnd = pos;
        }
      }, 0);
    } else {
      onChange(newValue);
    }
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      rows={rows}
      placeholder={placeholder}
      className={`resize-none ${className}`}
    />
  );
};

export default AutoBulletTextarea;