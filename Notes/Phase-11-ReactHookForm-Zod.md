# Phase 11 — React Hook Form + Zod Validation

> **Status:** ✅ Complete  
> **Key packages:** `react-hook-form`, `zod`, `@hookform/resolvers`  
> **Modified:** `AddTaskForm.jsx` (migrated from custom hook → RHF + Zod)

---

## 1. The Core Problem RHF Solves

Every controlled form re-renders on every keystroke because `onChange` calls `setState`:

```
Controlled (useState):           React Hook Form (uncontrolled):
──────────────────────           ───────────────────────────────
Type "H"   → setState → render   Type "H"   → DOM only, no render
Type "He"  → setState → render   Type "He"  → DOM only, no render
Type "Hello" → setState → render Type "Hello" → DOM only, no render
                                 Blur/Submit → read DOM → validate → 1 render
```

For a 50-field enterprise form, controlled = hundreds of renders per second. RHF = zero renders while typing.

**RHF stores values in the DOM via refs, not in React state.** React only gets involved when it needs to display errors or update `formState`.

---

## 2. The Mental Model — What `useForm` Returns

```javascript
const {
  register,      // (name, options?) → { name, ref, onChange, onBlur }
  handleSubmit,  // (onValid, onInvalid?) → event handler
  formState,     // { errors, isSubmitting, isDirty, isValid, touchedFields }
  reset,         // (values?) → reset to defaultValues
  watch,         // (name?) → subscribe to live field value
  setValue,      // (name, value) → programmatically set a field
  getValues,     // (name?) → read field values without subscribing
  trigger,       // (name?) → manually trigger validation
  control,       // for Controller component (custom inputs, UI libraries)
} = useForm({ resolver, defaultValues, mode })
```

**The three things you use in 90% of forms:** `register`, `handleSubmit`, `formState.errors`.

---

## 3. Zod — Schema as Single Source of Truth

```javascript
import { z } from 'zod'

const taskSchema = z.object({
  title: z
    .string()
    .trim()                           // transform: strip whitespace
    .min(3, 'At least 3 characters')  // constraint + error message
    .max(80, 'Max 80 characters'),

  description: z
    .string()
    .max(200)
    .optional()
    .or(z.literal('')),   // allow empty string

  priority: z.enum(['low', 'medium', 'high']),
})
```

**Zod vs manual validation rules:**
| | Manual rules (Phase 5) | Zod schema |
|---|---|---|
| **Type safety** | None | Full (z.infer<T>) |
| **Transforms** | Manual `.trim()` after submit | Automatic in schema |
| **Composability** | Flat functions | Chainable, nestable |
| **Reusability** | Copy-paste | Import schema anywhere |
| **Error messages** | In the function | Inline with constraint |

---

## 4. Connecting Zod to RHF — `zodResolver`

```javascript
import { zodResolver } from '@hookform/resolvers/zod'

useForm({
  resolver: zodResolver(taskSchema),  // RHF calls Zod on every validation
  defaultValues: { title: '', priority: 'medium' },
  mode: 'onBlur',  // when to validate: 'onBlur' | 'onChange' | 'onSubmit'
})
```

`zodResolver` is the adapter. Without it, RHF's built-in validation (the `{ required: true }` passed to `register()`) would be used instead. With it, Zod runs all validation and RHF just displays the results.

---

## 5. The `register` Function — How Inputs Connect

```jsx
// register('title') returns:
// { name: 'title', ref: refCallback, onChange: fn, onBlur: fn }

<input {...register('title')} />

// Equivalent to:
<input
  name="title"
  ref={rhfInternalRef}
  onChange={rhfOnChange}
  onBlur={rhfOnBlur}
/>
```

RHF's `ref` stores the DOM node. When validation runs, RHF reads `node.value` directly — no React state involved. This is **uncontrolled input** managed by RHF.

**Registering a select (same pattern):**
```jsx
<select {...register('priority')}>
  <option value="low">Low</option>
</select>
```

**RHF's built-in validation (without Zod):**
```jsx
<input {...register('title', {
  required: 'Title is required',
  minLength: { value: 3, message: 'Min 3 chars' },
})} />
```
When using `zodResolver`, these inline rules are ignored — Zod takes over.

---

## 6. `handleSubmit` — The Validation Gate

```javascript
const onSubmit = handleSubmit(
  // Called ONLY when validation passes
  (data) => {
    console.log(data)  // clean, validated, transformed values
    // data.title is already .trim()'d by Zod
    saveToAPI(data)
  },
  // Optional: called when validation fails (useful for analytics)
  (errors) => {
    console.log('Validation failed:', errors)
  }
)

// Attach to form:
<form onSubmit={onSubmit}>
```

`handleSubmit` handles `e.preventDefault()` for you. The `data` argument is the final validated value — transforms (like `.trim()`) have already been applied.

---

## 7. `formState` — The Status Object

```javascript
const { formState: {
  errors,          // { fieldName: { message: string, type: string } }
  isSubmitting,    // true while the async submit handler runs (NOT your API call)
  isDirty,         // true if any field differs from defaultValues
  isValid,         // true if schema passes (depends on mode)
  touchedFields,   // { fieldName: true } — which fields were interacted with
  dirtyFields,     // { fieldName: true } — which fields were changed
}} = useForm(...)
```

**Key distinction:** RHF's `isSubmitting` is true while your `handleSubmit` callback is running (if it's async). This is different from a "is API call pending" state — which is what the `isSubmitting` prop we pass from the parent (via React Query's `isPending`) represents.

**Displaying an error:**
```jsx
{errors.title && (
  <span className="form-error">{errors.title.message}</span>
)}
```

---

## 8. `watch` — The Escape Hatch for Live Values

Since RHF doesn't use state, you can't read `values.title` directly. `watch()` subscribes to a field and **causes a re-render when it changes**:

```javascript
const title = watch('title')         // subscribe to one field
const { title, desc } = watch()      // subscribe to all fields (watch entire form)
const title = watch('title', '')     // with default value
```

**Use sparingly.** Every `watch('title')` turns that field into a re-render trigger — you lose RHF's performance benefit for that field. Use only when you genuinely need live feedback (char counts, conditional field visibility, dependent field validation).

---

## 9. `reset` and `setValue` — Programmatic Control

```javascript
// Reset to defaultValues (after submit):
reset()

// Reset to specific values (populate form from API data):
reset({ title: 'Pre-filled title', priority: 'high' })

// Set a single field (e.g., after an API call fills in a value):
setValue('title', 'Auto-filled title')
setValue('title', 'Auto-filled', { shouldValidate: true, shouldDirty: true })
```

**Common pattern — Edit form pre-populated from API:**
```javascript
const { data: task } = useQuery({ queryKey: ['tasks', id], queryFn: () => taskApi.getById(id) })

useEffect(() => {
  if (task) {
    reset(task)  // populate all fields from fetched data
  }
}, [task, reset])
```

---

## 10. `Controller` — For Custom/UI Library Inputs

`register()` works with native HTML inputs. For custom components (React Select, date pickers, Chakra UI inputs) that don't expose a native `ref`, use `Controller`:

```jsx
import { Controller } from 'react-hook-form'

<Controller
  name="assignee"
  control={control}   // from useForm()
  render={({ field, fieldState: { error } }) => (
    <ReactSelect
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
    />
  )}
/>
```

`Controller` wraps the custom component and bridges it to RHF's internal tracking. The `field` prop contains the same `{ value, onChange, onBlur, name, ref }` that `register()` returns — you connect them manually.

---

## 11. Validation Modes

```javascript
useForm({ mode: 'onBlur' })     // validate when field loses focus (best UX)
useForm({ mode: 'onChange' })   // validate on every keystroke (aggressive)
useForm({ mode: 'onSubmit' })   // validate only on submit (minimal UX feedback)
useForm({ mode: 'onTouched' })  // validate on blur for first touch, then onChange
useForm({ mode: 'all' })        // validate on both blur and change
```

**Best practice:** `'onBlur'` for most forms — shows errors when the user leaves a field, not while they're still typing. `'onChange'` for fields where real-time feedback matters (e.g., password strength meter).

---

## 12. `useFieldArray` — Dynamic Fields (Interview Knowledge)

For forms with a variable number of items (add/remove rows):

```javascript
const { fields, append, remove, prepend, move } = useFieldArray({
  control,
  name: 'tasks',   // name of the array field in your schema
})

// In JSX:
{fields.map((field, index) => (
  <div key={field.id}>   // ← ALWAYS use field.id, not index, as key
    <input {...register(`tasks.${index}.title`)} />
    <button onClick={() => remove(index)}>Remove</button>
  </div>
))}
<button onClick={() => append({ title: '' })}>Add Row</button>
```

**Why `field.id` not `index`?** When you remove item 1 of 3, items shift. React uses the key to decide what to unmount/remount. Using `index` as key causes the wrong items to get wrong state. RHF generates stable `field.id` UUIDs for this purpose.

---

## 13. Async Validation (Interview Knowledge)

```javascript
const schema = z.object({
  username: z.string().refine(
    async (username) => {
      // Call API to check if username is taken
      const taken = await checkUsernameAvailable(username)
      return !taken
    },
    { message: 'Username is already taken' }
  )
})

// With mode: 'onBlur' — fires the async check when field loses focus
```

Or using RHF's `validate` option:
```javascript
<input {...register('username', {
  validate: async (value) => {
    const taken = await checkUsername(value)
    return taken ? 'Username taken' : true
  }
})} />
```

In practice: debounce the check to avoid firing on every character if using `onChange` mode.

---

## 14. Project Implementation — What Changed

**Before (Phase 5 — custom hook):**
```javascript
// useState for every field
const { values, errors, handleChange, handleBlur, handleSubmit } = useFormValidation(...)

<input
  value={values.title}            // controlled
  onChange={e => handleChange('title', e.target.value)}
  onBlur={() => handleBlur('title')}
/>
// Re-renders on every keystroke
```

**After (Phase 11 — RHF + Zod):**
```javascript
// useRef internally (uncontrolled via RHF)
const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
  resolver: zodResolver(taskSchema),
  defaultValues: { title: '', description: '', priority: 'medium' },
  mode: 'onBlur',
})

<input {...register('title')} />
// Zero re-renders while typing
```

**What stayed the same:** same form UI, same error styling, same UX (onBlur validation, char count, required/optional fields, disabled submit during API call). The observable user experience is identical — only the implementation changed.

---

## 15. Comparison — RHF vs Formik vs Custom Hook

| | Custom Hook (our Phase 5) | React Hook Form | Formik |
|---|---|---|---|
| **Re-renders while typing** | Yes (controlled) | No (uncontrolled) | Yes (controlled) |
| **Bundle size** | 0 (you write it) | ~9KB gzipped | ~15KB gzipped |
| **Zod/Yup support** | Custom | `@hookform/resolvers` | `yup` built-in |
| **Learning curve** | Low (you control it) | Medium | Medium |
| **Performance** | Poor on large forms | Excellent | Poor on large forms |
| **useFieldArray** | You implement | Built-in | Built-in (FieldArray) |
| **Industry adoption** | N/A | ✅ Dominant (10M/week) | Legacy (declining) |
| **React 18/19 compat** | ✅ | ✅ | Issues |

**The verdict:** RHF is the industry standard. Formik was popular in 2019-2021 but is now largely replaced by RHF. Build new projects with RHF.

---

## 16. Interview Q&A

**Q: Why is React Hook Form faster than a controlled form approach?**  
A: RHF registers inputs via `ref`, storing values in the DOM rather than React state. Since there's no `setState` call on every keystroke, no re-render is triggered while typing. React only re-renders when RHF updates `formState` (on blur, on submit, when errors change). For large forms, this is dramatically faster — a 50-field form with controlled inputs generates hundreds of renders per second; RHF generates zero.

**Q: What does `register()` do?**  
A: It returns `{ name, ref, onChange, onBlur }` which you spread onto an input. RHF uses the `ref` to get the DOM node and read its `.value` during validation/submit. The `onChange` and `onBlur` hooks let RHF track dirty/touched state and trigger validation at the right time.

**Q: When would you use `watch()` and when would you avoid it?**  
A: Use `watch()` when you genuinely need the live value — real-time character count, showing/hiding a conditional field based on another field's value, or dependent validation. Avoid it when you don't need live feedback — on submit is enough. Every `watch()` subscription restores the re-render-on-change behaviour for that field, defeating RHF's main performance advantage.

**Q: What is `zodResolver` and why is it needed?**  
A: RHF has its own built-in validation system (constraints in `register()`). Zod is an external schema library with a richer API. `zodResolver` from `@hookform/resolvers` is the adapter between the two — it translates Zod's validation result into the format RHF expects. When you pass `resolver: zodResolver(schema)` to `useForm()`, RHF delegates all validation to Zod and ignores its own built-in constraints.

**Q: How do you pre-populate an edit form from API data?**  
A: Use `reset(data)` inside a `useEffect` that fires when the data loads:
```javascript
const { data } = useQuery(...)
useEffect(() => { if (data) reset(data) }, [data, reset])
```
This is the correct pattern because `defaultValues` in `useForm()` only runs once on mount — if the API data hasn't loaded yet, the form starts empty. `reset()` after data loads populates all fields at once without triggering unnecessary re-renders.

**Q: What's the difference between `isSubmitting` in RHF's `formState` and a loading state from React Query?**  
A: RHF's `formState.isSubmitting` is `true` while your `handleSubmit` callback is executing (if it's async). If your callback is `async () => await apiCall()`, RHF's `isSubmitting` covers the duration of that API call. React Query's `isPending` covers the mutation's network request. They can overlap, but they're conceptually different — RHF doesn't know about React Query, and React Query doesn't know about form state.

**Q: When would you use `Controller` instead of `register()`?**  
A: When the input component doesn't expose a native DOM `ref` — custom components from UI libraries (Material UI, Ant Design, React Select, date pickers). `register()` needs access to the DOM node via ref. `Controller` provides `field.value`, `field.onChange`, `field.onBlur` as props that you manually connect to the custom component.

---

## 17. Tricky Interview Questions

**Q: `useFieldArray` warns about using `index` as a key. Why?**  
A: When items are removed or reordered, array indices shift. React uses the key to reconcile which DOM element maps to which array item. If you remove item at index 1, item 2 becomes index 1 — React thinks the "index 1" item changed content rather than that an item was deleted, leading to wrong state in inputs. RHF generates stable UUIDs (`field.id`) that don't change when items reorder, so React correctly unmounts/remounts the right components.

**Q: Can you use RHF with a `<form>` that doesn't have a submit button?**  
A: Yes. You can call `handleSubmit(onValid)()` programmatically (note the double `()` — the first call returns an event handler, the second call invokes it). This is useful when submitting on a specific event, like pressing Enter in a particular field or clicking an external button.

**Q: Zod's `.optional()` vs `.nullable()` — what's the difference?**  
A: `.optional()` means the field can be `undefined` (missing entirely). `.nullable()` means the value can be `null` (explicitly null). `.optional().nullable()` allows both. HTML form inputs submit empty strings `""`, not `undefined` or `null` — so for optional text fields, you often need `.or(z.literal(''))` to allow empty strings, or use a Zod transform: `z.string().optional().transform(v => v || undefined)`.

---

## 18. Revision Cheat Sheet

```
useForm({ resolver: zodResolver(schema), defaultValues, mode: 'onBlur' })

Three core returns:
  register('field')               → { name, ref, onChange, onBlur } — spread onto input
  handleSubmit(onValid)           → event handler — prevents default, validates, calls onValid
  formState.errors.field.message  → error string from Zod schema

Useful extras:
  reset()          → clear form back to defaultValues
  reset(data)      → populate form from object (edit forms)
  watch('field')   → subscribe to live value (re-renders on change)
  setValue(f, v)   → set field programmatically
  trigger('field') → manually validate a field

Validation modes:
  'onBlur'   → validate when field loses focus (recommended)
  'onChange' → validate every keystroke (aggressive)
  'onSubmit' → validate only on submit (minimal)

Zod common methods:
  z.string().min(n, msg).max(n, msg).trim()
  z.number().int().positive()
  z.enum(['a', 'b'])
  z.boolean()
  z.optional() / .nullable()
  .refine(fn, msg)           → custom async/sync validation
  z.infer<typeof schema>     → TypeScript type from schema

RHF vs Controlled:
  Controlled → setState on every key → re-render on every key
  RHF        → DOM ref → no re-render while typing → read on submit

useFieldArray: key={field.id} NOT key={index}
Controller: for custom/UI-library inputs that don't expose native ref
```

---

## 19. Key Takeaways

1. **RHF is uncontrolled** — values live in the DOM via refs, not useState
2. **Zero re-renders while typing** — only formState changes cause re-renders  
3. **`register()` is the connector** — spread it on any native input
4. **`zodResolver` bridges Zod → RHF** — Zod is the schema, RHF is the form manager
5. **Zod transforms run before your handler** — `.trim()` in schema means data is clean
6. **`watch()` is the escape hatch** — use only when live value is genuinely needed
7. **`reset(data)` for edit forms** — populate after API fetch, not in `defaultValues`
8. **`Controller` for custom inputs** — when native `ref` isn't available
9. **RHF dominates the industry** — Formik is legacy; know RHF deeply
10. **`useFieldArray` key must be `field.id`** — never use `index`

---

*Notes: Phase 11 — React Hook Form + Zod*  
*Next Phase: Phase 12 — Styling (CSS Modules, Tailwind CSS, component variants)*
