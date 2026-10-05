"use client";

import { useEffect, useState } from "react";

export default function FocusableRow({ focusKey, children }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus") || "";
    if (!focus || focus !== String(focusKey || "")) {
      setActive(false);
      return undefined;
    }
    setActive(true);
    const node = document.querySelector(`[data-focus="${CSS.escape(focus)}"]`);
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
    return undefined;
  }, [focusKey]);

  return (
    <tr data-focus={focusKey || undefined} className={active ? "row-focus" : undefined}>
      {children}
    </tr>
  );
}
