// src/test/setup.js
//
// Runs BEFORE every test file (configured in vite.config.js → test.setupFiles).
//
// @testing-library/jest-dom adds custom matchers to expect():
//   toBeInTheDocument()   — element exists in the DOM
//   toHaveValue('text')   — input has this value
//   toBeDisabled()        — element has disabled attribute
//   toHaveClass('name')   — element has this CSS class
//   toHaveTextContent()   — element contains this text
//   toBeVisible()         — element is visible (not hidden)
//
// Without this import, expect(el).toBeInTheDocument() would throw
// "toBeInTheDocument is not a function".

import '@testing-library/jest-dom'
