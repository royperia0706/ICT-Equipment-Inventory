"use client";

import { useEffect } from "react";
import { IDLE_MS } from "@/lib/idle";

const TOUCH_MS = 60 * 1000;

export default function IdleLogout() {
  useEffect(() => {
    let lastActivity = Date.now();
    let lastTouch = 0;
    let loggingOut = false;

    async function logout() {
      if (loggingOut) return;
      loggingOut = true;
      await fetch("/api/logout", { method: "POST" }).catch(() => {});
      window.location.assign("/?signedOut=idle");
    }

    async function touch() {
      lastTouch = Date.now();
      try {
        const response = await fetch("/api/session", { method: "POST" });
        if (response.status === 401) logout();
      } catch {
        /* the next check will try again */
      }
    }

    function mark() {
      lastActivity = Date.now();
      if (lastActivity - lastTouch >= TOUCH_MS) touch();
    }

    const events = ["pointerdown", "keydown", "touchstart", "wheel", "input"];
    events.forEach((name) => document.addEventListener(name, mark, true));
    document.addEventListener("scroll", mark, true);
    let moveReady = true;
    function onMove() {
      if (!moveReady) return;
      moveReady = false;
      mark();
      window.setTimeout(() => {
        moveReady = true;
      }, 1000);
    }
    document.addEventListener("mousemove", onMove, true);

    touch();
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity >= IDLE_MS) logout();
    }, 5000);
    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - lastActivity >= IDLE_MS) logout();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      events.forEach((name) => document.removeEventListener(name, mark, true));
      document.removeEventListener("scroll", mark, true);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
