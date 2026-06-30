// hooks/useDocumentTitle.js
// A custom hook that updates the browser tab title.
// Demonstrates: useEffect for DOM side effects, cleanup to restore original title.
//
// WHY THIS IS A SIDE EFFECT:
// document.title is part of the browser's DOM — it exists outside React's
// component tree. Any interaction with something outside React (browser APIs,
// network, storage, timers) is a side effect and belongs in useEffect.
//
// PARAMETERS:
//   title (string) — the title to set on the browser tab
//
// CLEANUP:
// We restore the original title when the component unmounts.
// This matters if this hook is used in a sub-page that gets navigated away from.

import { useEffect } from 'react'

function useDocumentTitle(title) {
  useEffect(() => {
    // Side effect: writing to the DOM (document.title is outside React's tree)
    const previousTitle = document.title   // save before changing
    document.title = title

    // Cleanup: restore the title when the component using this hook unmounts
    // This is a good habit — effects that change external state should
    // restore it on cleanup.
    return () => {
      document.title = previousTitle
    }
  }, [title])
  // ↑ [title] dependency: re-run whenever the title string changes.
  //   If title never changes, this runs once on mount and cleans up on unmount.
}

export default useDocumentTitle
