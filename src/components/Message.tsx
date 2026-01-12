import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

export interface MessageProps {
  /** Message role determines styling (color, indicator) */
  role: 'user' | 'assistant' | 'system';

  /** Message content text */
  content: string;

  /** Terminal width - used to fill background to full width */
  width?: number;

  /** Timestamp - stored, displayed when showTimestamp is true */
  timestamp?: number;

  /** Show timestamp below message */
  showTimestamp?: boolean;

  /** Show loading spinner instead of content */
  isLoading?: boolean;

  /** Optional: override default color for role */
  color?: string;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL = 80;
const BACKGROUND_COLOR = '#231f1f';
const INDICATOR = '▌ ';
const PADDING_X = 1; // paddingX={1} means 1 space on each side

function useSpinner(isActive: boolean): string {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, SPINNER_INTERVAL);

    return () => clearInterval(timer);
  }, [isActive]);

  return SPINNER_FRAMES[frameIndex];
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getRoleConfig(role: MessageProps['role'], customColor?: string) {
  const configs = {
    user: { color: 'cyan', dimText: false },
    assistant: { color: 'magenta', dimText: true },
    system: { color: 'yellow', dimText: true },
  };

  const config = configs[role];
  return {
    ...config,
    color: customColor ?? config.color,
  };
}

/**
 * Wrap text to fit within a given width, respecting existing newlines.
 * Returns an array of lines.
 */
function wrapText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    let remaining = paragraph;
    while (remaining.length > 0) {
      if (remaining.length <= maxWidth) {
        lines.push(remaining);
        break;
      }

      // Find a good break point (prefer space)
      let breakPoint = maxWidth;
      const lastSpace = remaining.lastIndexOf(' ', maxWidth);
      if (lastSpace > 0) {
        breakPoint = lastSpace;
      }

      lines.push(remaining.slice(0, breakPoint));
      remaining = remaining.slice(breakPoint).trimStart();
    }
  }

  return lines;
}

/**
 * Calculate how many terminal lines a message will take.
 * Useful for scroll calculations.
 */
export function calculateMessageHeight(content: string, width: number): number {
  const prefixLen = PADDING_X + INDICATOR.length;
  const contentWidth = Math.max(1, width - prefixLen);
  const wrappedLines = wrapText(content, contentWidth);
  
  // Content lines + paddingY (1 top + 1 bottom) + marginBottom (1)
  return wrappedLines.length + 2 + 1;
}

export function Message({
  role,
  content,
  width = 80,
  timestamp,
  showTimestamp = false,
  isLoading = false,
  color,
}: MessageProps): React.ReactElement {
  const spinner = useSpinner(isLoading);
  const { color: indicatorColor, dimText } = getRoleConfig(role, color);

  const displayContent = isLoading ? spinner : content;

  // Calculate available width for content (subtract padding and indicator)
  const contentWidth = Math.max(1, width - PADDING_X * 2 - INDICATOR.length);
  
  // Wrap and pad content to fill full width
  const wrappedLines = wrapText(displayContent, contentWidth);
  
  // Create styled lines with full-width background
  const bgStyle = chalk.bgHex(BACKGROUND_COLOR);
  const indicatorStyle = chalk.bgHex(BACKGROUND_COLOR).hex(
    indicatorColor === 'cyan' ? '#00FFFF' :
    indicatorColor === 'magenta' ? '#FF00FF' :
    indicatorColor === 'yellow' ? '#FFFF00' : indicatorColor
  );
  const textStyle = dimText 
    ? chalk.bgHex(BACKGROUND_COLOR).dim 
    : chalk.bgHex(BACKGROUND_COLOR);

  // Build each line with indicator (first line) or padding (subsequent lines)
  // All lines should be exactly `width` characters for consistent background
  const styledLines = wrappedLines.map((line, index) => {
    const leftPad = ' '.repeat(PADDING_X);
    const prefixLen = PADDING_X + INDICATOR.length;
    // Pad content to fill remaining width
    const paddedLine = line.padEnd(width - prefixLen, ' ');
    
    if (index === 0) {
      // First line: indicator + content
      return bgStyle(leftPad) + indicatorStyle(INDICATOR) + textStyle(paddedLine);
    } else {
      // Subsequent lines: spaces for indicator alignment + content
      const indicatorSpace = ' '.repeat(INDICATOR.length);
      return bgStyle(leftPad) + bgStyle(indicatorSpace) + textStyle(paddedLine);
    }
  });

  // Create empty padding line (for paddingY) - exactly `width` characters
  const emptyLine = bgStyle(' '.repeat(width));

  return (
    <Box flexDirection="column" marginBottom={1} flexShrink={0}>
      {/* Top padding */}
      <Text>{emptyLine}</Text>
      
      {/* Content lines */}
      {styledLines.map((styledLine, index) => (
        <Text key={index}>{styledLine}</Text>
      ))}
      
      {/* Bottom padding */}
      <Text>{emptyLine}</Text>

      {showTimestamp && timestamp && (
        <Box marginLeft={3}>
          <Text dimColor>{formatTimestamp(timestamp)}</Text>
        </Box>
      )}
    </Box>
  );
}
