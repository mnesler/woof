# Chat History Auto-Scroll Behavior

This document describes the auto-scroll behavior options for the chat history component.

## Overview

When the chat history contains more messages than can fit in the viewport, users can scroll up to read older messages. The question is: what happens to the scroll position when new messages arrive?

## Auto-Scroll Options

### Option A: Always Auto-Scroll

**Behavior:** The view always jumps to the bottom when any new message arrives.

**Pros:**
- Simple to implement
- User always sees the latest message immediately

**Cons:**
- Interrupts reading if user is scrolled up reviewing older messages
- Can be jarring/frustrating during active conversations

**Use Case:** Best for real-time chat where seeing the latest message is always the priority.

---

### Option B: Smart Auto-Scroll (Scroll-Position Aware)

**Behavior:** Only auto-scroll if the user is already at (or near) the bottom. If scrolled up, stay in place.

**Pros:**
- Preserves user's reading position
- Non-intrusive experience

**Cons:**
- User might miss new messages if scrolled up
- May need a "new messages" indicator (adds complexity)

**Use Case:** Best for long-form content where users frequently review history.

---

### Option C: User-Action Auto-Scroll (Selected)

**Behavior:** 
- Jump to bottom when the **user sends a message**
- Stay in place when the **assistant responds** (if user is scrolled up)

**Pros:**
- Balanced approach - user action triggers scroll
- Sending a message is an intentional action, so scrolling feels natural
- Assistant responses don't interrupt reading

**Cons:**
- Slightly more complex logic
- If user sends message while scrolled up, they jump away from what they were reading

**Use Case:** Best for interactive AI chat where users send messages and expect to see their input, but may be reviewing context while waiting for responses.

---

## Implementation Details

### Selected Option: C (User-Action Auto-Scroll)

The `ScrollArea` component implements Option C with the following logic:

```typescript
// Auto-scroll triggers:
// 1. When user sends a message (new user message added)
// 2. When initially loading (start at bottom)

// No auto-scroll when:
// 1. Assistant message arrives while user is scrolled up
// 2. User is actively reading older messages
```

### Component Props

```typescript
interface ScrollAreaProps {
  children: React.ReactNode[];
  height: number;
  autoScrollOnUserMessage?: boolean;  // default: true
}
```

### Integration with ChatHistory

The `ChatHistory` component tracks message roles and signals to `ScrollArea` when a user message is added, triggering the auto-scroll behavior.

---

## Future Considerations

- **"New messages" indicator:** Could add a subtle indicator when new messages arrive while scrolled up
- **Scroll-to-bottom shortcut:** Could add `G` or `Ctrl+End` to quickly jump to bottom
- **Configurable behavior:** Could make auto-scroll behavior a user preference
