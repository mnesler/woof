import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

export interface ScrollAreaProps {
  /** Array of elements to render in the scrollable area */
  children: React.ReactNode[];
  /** Visible viewport height in lines */
  height: number;
  /** Height of each item in lines (for line-based scrolling) */
  itemHeights?: number[];
  /** Whether to show the scrollbar (default: true) */
  showScrollbar?: boolean;
  /** Trigger to scroll to bottom (increment to trigger) */
  scrollToBottomTrigger?: number;
  /** Enable mouse scroll support (default: false, not yet fully implemented) */
  enableMouseScroll?: boolean;
}

/**
 * A scrollable container component with a styled scrollbar.
 * 
 * Supports line-based scrolling when itemHeights is provided,
 * otherwise falls back to item-based scrolling.
 * 
 * Keyboard controls:
 * - ↑ or k: Scroll up one line
 * - ↓ or j: Scroll down one line
 * - Ctrl+U: Scroll up half page
 * - Ctrl+D: Scroll down half page
 * 
 * Mouse controls:
 * - Scroll wheel up/down
 * 
 * Scrollbar style:
 * - Track: │ (dimColor)
 * - Thumb: ▌ (cyan)
 * 
 * @see docs/scroll-behavior.md for auto-scroll behavior documentation
 */
export function ScrollArea({
  children,
  height,
  itemHeights,
  showScrollbar = true,
  scrollToBottomTrigger = 0,
  enableMouseScroll = false,
}: ScrollAreaProps): React.ReactElement {
  const totalItems = children.length;
  
  // Calculate total lines and cumulative positions
  const { totalLines, linePositions } = useMemo(() => {
    if (!itemHeights || itemHeights.length === 0) {
      // Fallback: assume 1 line per item
      return {
        totalLines: totalItems,
        linePositions: children.map((_, i) => i),
      };
    }
    
    const positions: number[] = [];
    let cumulative = 0;
    
    for (let i = 0; i < itemHeights.length; i++) {
      positions.push(cumulative);
      cumulative += itemHeights[i];
    }
    
    return {
      totalLines: cumulative,
      linePositions: positions,
    };
  }, [children, itemHeights, totalItems]);

  const maxScrollOffset = Math.max(0, totalLines - height);
  const [scrollOffset, setScrollOffset] = useState(maxScrollOffset);

  // Scroll handler for both keyboard and mouse
  const scroll = useCallback((delta: number) => {
    setScrollOffset((prev) => {
      const newOffset = prev + delta;
      return Math.max(0, Math.min(maxScrollOffset, newOffset));
    });
  }, [maxScrollOffset]);

  // Scroll to bottom when trigger changes (user sends message)
  useEffect(() => {
    if (scrollToBottomTrigger > 0) {
      setScrollOffset(maxScrollOffset);
    }
  }, [scrollToBottomTrigger, maxScrollOffset]);

  // Adjust scroll offset if content shrinks (e.g., window resize)
  useEffect(() => {
    if (scrollOffset > maxScrollOffset) {
      setScrollOffset(maxScrollOffset);
    }
  }, [maxScrollOffset, scrollOffset]);

  // Keyboard navigation
  useInput((input, key) => {
    // Scroll up: ↑ or k
    if (key.upArrow || input === 'k') {
      scroll(-1);
    }
    // Scroll down: ↓ or j
    else if (key.downArrow || input === 'j') {
      scroll(1);
    }
    // Half page up: Ctrl+U
    else if (key.ctrl && input === 'u') {
      scroll(-Math.floor(height / 2));
    }
    // Half page down: Ctrl+D
    else if (key.ctrl && input === 'd') {
      scroll(Math.floor(height / 2));
    }
  });

  // Mouse scroll support - disabled by default as it requires
  // intercepting stdin at a lower level to prevent escape sequences
  // from leaking to Ink's input handler. TODO: implement properly.
  // const { stdin, setRawMode, isRawModeSupported } = useStdin();

  useEffect(() => {
    if (!enableMouseScroll) return;

    // Mouse scroll support is disabled for now.
    // When enabled, we would need to:
    // 1. Enable mouse tracking: \x1b[?1000h and \x1b[?1006h
    // 2. Intercept stdin BEFORE Ink's handler to consume mouse sequences
    // 3. Parse SGR format: \x1b[<button;x;yM (button 64=scroll up, 65=scroll down)
    // 4. Strip mouse sequences from data before Ink sees them
    
    return () => {
      // Cleanup would disable mouse tracking
    };
  }, [enableMouseScroll, scroll]);

  // Determine which items are visible based on scroll offset
  const visibleItems = useMemo(() => {
    if (!itemHeights || itemHeights.length === 0) {
      // Fallback: item-based slicing
      return children.slice(scrollOffset, scrollOffset + height);
    }

    // Find first visible item (binary search would be faster for large lists)
    let firstVisible = 0;
    for (let i = 0; i < linePositions.length; i++) {
      if (linePositions[i] + itemHeights[i] > scrollOffset) {
        firstVisible = i;
        break;
      }
    }

    // Find last visible item
    let lastVisible = firstVisible;
    const viewportEnd = scrollOffset + height;
    for (let i = firstVisible; i < linePositions.length; i++) {
      if (linePositions[i] >= viewportEnd) {
        break;
      }
      lastVisible = i;
    }

    return children.slice(firstVisible, lastVisible + 1);
  }, [children, itemHeights, linePositions, scrollOffset, height]);

  // Calculate scrollbar
  const needsScrollbar = totalLines > height;
  const scrollbar = useMemo(() => {
    if (!needsScrollbar || !showScrollbar) return null;

    // Calculate thumb size (minimum 1 line)
    const thumbHeight = Math.max(1, Math.floor((height / totalLines) * height));
    
    // Calculate thumb position
    const scrollRatio = maxScrollOffset > 0 ? scrollOffset / maxScrollOffset : 0;
    const thumbPosition = Math.floor(scrollRatio * (height - thumbHeight));

    // Build scrollbar characters
    const scrollbarChars: React.ReactNode[] = [];
    for (let i = 0; i < height; i++) {
      const isThumb = i >= thumbPosition && i < thumbPosition + thumbHeight;
      scrollbarChars.push(
        <Text key={i} color={isThumb ? 'cyan' : undefined} dimColor={!isThumb}>
          {isThumb ? '▌' : '│'}
        </Text>
      );
    }

    return (
      <Box flexDirection="column" marginLeft={1}>
        {scrollbarChars}
      </Box>
    );
  }, [needsScrollbar, showScrollbar, height, totalLines, scrollOffset, maxScrollOffset]);

  // When content is less than viewport, align to bottom
  const alignToBottom = totalLines < height;

  return (
    <Box flexDirection="row" height={height}>
      <Box 
        flexDirection="column" 
        flexGrow={1} 
        overflow="hidden"
        justifyContent={alignToBottom ? 'flex-end' : 'flex-start'}
      >
        {visibleItems}
      </Box>
      {scrollbar}
    </Box>
  );
}
