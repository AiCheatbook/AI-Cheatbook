"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Only first-time visitors see the intro, so its code is loaded
// on demand instead of with the homepage.
const FirstVisitIntro = dynamic(() => import("./FirstVisitIntro"), {
  ssr: false,
});

export default function HomeIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        if (!sessionStorage.getItem("introSeen")) {
          setShow(true);
        }
      } catch {
        // Storage unavailable — skip the intro.
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  if (!show) return null;

  return <FirstVisitIntro onDismiss={() => setShow(false)} />;
}
