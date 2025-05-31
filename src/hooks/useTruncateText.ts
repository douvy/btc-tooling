import { useState } from 'react';

interface TruncateOptions {
  /**
   * Maximum length before truncation is applied
   */
  maxLength?: number;
  
  /**
   * A specific phrase to truncate at, if found (takes precedence over maxLength)
   */
  truncatePhrase?: string;
  
  /**
   * Number of characters after the truncation phrase to include
   */
  includeAfter?: number;
  
  /**
   * Words to include after the truncation point
   */
  wordsAfter?: string;
}

interface TruncateResult {
  /**
   * The text to display initially (truncated if needed)
   */
  initialText: string;
  
  /**
   * The remaining text that was truncated
   */
  remainingText: string;
  
  /**
   * Whether the text is expanded to show the full content
   */
  expanded: boolean;
  
  /**
   * Function to toggle the expanded state
   */
  toggleExpanded: () => void;
  
  /**
   * Whether the text needed truncation
   */
  isTruncated: boolean;
}

/**
 * Hook for handling text truncation with show more/less functionality
 */
export function useTruncateText(
  text: string, 
  options: TruncateOptions = {}
): TruncateResult {
  const { 
    maxLength = 280,
    truncatePhrase,
    includeAfter = 0,
    wordsAfter = ''
  } = options;
  
  const [expanded, setExpanded] = useState(false);
  
  // Check if truncation is needed
  const needsTruncation = text.length > maxLength;
  
  // Initial truncation logic
  let truncateAt = -1;
  let shouldTruncate = false;
  
  // If truncatePhrase is specified, try to find it
  if (truncatePhrase) {
    truncateAt = text.indexOf(truncatePhrase);
    shouldTruncate = truncateAt > 0;
  } 
  // Otherwise use maxLength
  else if (needsTruncation) {
    truncateAt = maxLength;
    shouldTruncate = true;
  }
  
  // Determine initial and remaining text
  let initialText = text;
  let remainingText = '';
  
  if (shouldTruncate) {
    if (truncatePhrase && truncateAt > 0) {
      // Include the truncation phrase plus any specified words after
      const endPoint = truncateAt + truncatePhrase.length;
      initialText = text.substring(0, endPoint);
      
      if (wordsAfter) {
        initialText += ' ' + wordsAfter;
        remainingText = text.substring(endPoint + wordsAfter.length + 1);
      } else if (includeAfter > 0) {
        const includePoint = Math.min(endPoint + includeAfter, text.length);
        initialText = text.substring(0, includePoint);
        remainingText = text.substring(includePoint);
      } else {
        remainingText = text.substring(endPoint);
      }
    } else {
      // Simple length-based truncation
      initialText = text.substring(0, truncateAt);
      remainingText = text.substring(truncateAt);
    }
  }
  
  return {
    initialText,
    remainingText,
    expanded,
    toggleExpanded: () => setExpanded(!expanded),
    isTruncated: shouldTruncate
  };
}