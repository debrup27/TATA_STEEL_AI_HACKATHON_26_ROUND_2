"use client";

import React, { forwardRef } from "react";

interface ChatContainerRootProps {
  children: React.ReactNode;
  className?: string;
}

const ChatContainerRoot = forwardRef<HTMLDivElement, ChatContainerRootProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col overflow-y-auto scroll-smooth ${className}`}
      >
        {children}
      </div>
    );
  }
);
ChatContainerRoot.displayName = "ChatContainerRoot";

interface ChatContainerContentProps {
  children: React.ReactNode;
  className?: string;
}

function ChatContainerContent({ children, className = "" }: ChatContainerContentProps) {
  return (
    <div className={`flex flex-col gap-4 px-4 py-4 ${className}`}>
      {children}
    </div>
  );
}

interface ChatContainerScrollAnchorProps {
  className?: string;
}

const ChatContainerScrollAnchor = forwardRef<HTMLDivElement, ChatContainerScrollAnchorProps>(
  ({ className = "" }, ref) => {
    return <div ref={ref} className={`h-px ${className}`} />;
  }
);
ChatContainerScrollAnchor.displayName = "ChatContainerScrollAnchor";

export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor };
