"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Layers3 } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { TabsTrigger } from "@/components/ui/tabs";

const DISCOVERY_KEY = "dialogue-board.theme-discovery.v1";

export function ThemeDiscovery({
  visited,
  blocked,
  onView,
}: {
  visited: boolean;
  blocked: boolean;
  onView: () => void;
}) {
  const [due, setDue] = useState(false);
  const [handled, setHandled] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const finish = useCallback(() => {
    setHandled(true);
    try {
      sessionStorage.setItem(DISCOVERY_KEY, "seen");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISCOVERY_KEY)) return;
    } catch {}
    const timer = setTimeout(() => setDue(true), 30_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (visited) {
      try {
        sessionStorage.setItem(DISCOVERY_KEY, "seen");
      } catch {}
    }
  }, [visited]);
  const open = due && !handled && !visited && !blocked;
  useEffect(() => {
    if (open) {
      // A refresh should not repeat an invitation already shown this session.
      try {
        sessionStorage.setItem(DISCOVERY_KEY, "seen");
      } catch {}
    }
  }, [open]);

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        if (!value) finish();
      }}
    >
      <PopoverAnchor asChild>
        <TabsTrigger
          ref={trigger}
          value="themes"
          className={open ? "theme-discovery-highlight" : undefined}
        >
          <Layers3 />
          By theme
        </TabsTrigger>
      </PopoverAnchor>
      <PopoverContent
        className="theme-discovery"
        align="start"
        side="bottom"
        sideOffset={12}
        collisionPadding={16}
        aria-labelledby="theme-discovery-title"
        aria-describedby="theme-discovery-description"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div role="status">
          <h2 id="theme-discovery-title">See what people are talking about</h2>
          <p id="theme-discovery-description">
            Try By theme to explore related questions together.
          </p>
        </div>
        <div className="theme-discovery-actions">
          <button
            className="primary"
            onClick={() => {
              finish();
              onView();
              trigger.current?.focus();
            }}
          >
            View by theme
          </button>
          <button className="theme-discovery-dismiss" onClick={finish}>
            Dismiss
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
