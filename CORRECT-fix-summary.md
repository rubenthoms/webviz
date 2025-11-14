# CORRECT Fix for Double-Fetch Issue in jotai-tanstack-query

## Problem Description
When using `atomWithQuery`, every time the atom's dependencies change, a **canceled network request** occurs before the actual request completes.

## Root Cause - THE ACTUAL ISSUE

The problem is in **WHERE** `setOptions` is called in v0.11.0:

### Original v0.11.0 Code (PROBLEMATIC)
```typescript
const defaultedOptionsAtom = atom((get) => {
  const client = get(clientAtom)
  const options = getOptions(get)
  const defaultedOptions = client.defaultQueryOptions(options)

  const cache = get(observerCacheAtom)
  const cachedObserver = cache.get(client)

  defaultedOptions._optimisticResults = 'optimistic'

  if (cachedObserver) {
    cachedObserver.setOptions(defaultedOptions)  // ← PROBLEM: Called too early!
  }

  return ensureStaleTime(defaultedOptions)
})

// ... later ...

resultAtom.onMount = (set) => {
  // No setOptions call here
  const unsubscribe = observer.subscribe(notifyManager.batchCalls(set))
  return () => { /* cleanup */ }
}
```

### The Problematic Sequence

1. User changes filter → atom dependencies change
2. **`defaultedOptionsAtom` is re-evaluated**
3. Calls `cachedObserver.setOptions(newOptions)`
4. ⚠️ **At this point, the old `resultAtom` is STILL MOUNTED with active listener**
5. ⚠️ TanStack Query's `setOptions` sees: "observer has listeners + options changed"
6. ⚠️ **FIRST FETCH TRIGGERED** via `shouldFetchOptionally()`
7. `dataAtom` creates new `resultAtom`
8. Old `resultAtom` unmounts → `unsubscribe()` → **FIRST FETCH CANCELED**
9. New `resultAtom` mounts → `subscribe()` → **SECOND FETCH TRIGGERED**

**The core issue:** `setOptions` is called in `defaultedOptionsAtom` which is evaluated BEFORE the mount/unmount cycle completes, so the observer still has the old listener attached.

## The Fix

**Remove `setOptions` from `defaultedOptionsAtom`** (where it's called too early) and optionally add it to `resultAtom.onMount` (where timing is correct, though it turns out it's not even necessary).

### Fixed Code
```typescript
const defaultedOptionsAtom = atom((get) => {
  const client = get(clientAtom)
  const options = getOptions(get)
  const defaultedOptions = client.defaultQueryOptions(options)

  defaultedOptions._optimisticResults = 'optimistic'

  // REMOVED: setOptions call - it was being called at the wrong time

  return ensureStaleTime(defaultedOptions)
})

// onMount stays the same - no setOptions needed there either!
resultAtom.onMount = (set) => {
  const unsubscribe = observer.subscribe(notifyManager.batchCalls(set))
  return () => {
    if (observer.getCurrentResult().isError) {
      observer.getCurrentQuery().reset()
    }
    unsubscribe()
  }
}
```

## Why This Works

### After the fix:
1. User changes filter → atom dependencies change
2. `defaultedOptionsAtom` is re-evaluated
3. **No `setOptions` call** → no premature fetch
4. `dataAtom` creates new `resultAtom`
5. Old `resultAtom` unmounts → `unsubscribe()`
6. New `resultAtom` mounts → `subscribe()`
7. **SINGLE FETCH TRIGGERED** via `shouldFetchOnMount()`

### Why setOptions isn't needed:
- The observer's options are used by `getOptimisticResult()` in `dataAtom` (line 96)
- When `subscribe()` is called, TanStack Query's internal logic handles the state correctly
- The query key change is detected and the appropriate fetch occurs

## Edge Cases Verified

✅ **Query Key Changes**: Works - single fetch with new key
✅ **Enabled/Disabled Transitions**: Works - respects enabled state
✅ **React StrictMode**: Works - no issues with mount/unmount/remount
✅ **Multiple atomWithQuery Instances**: Works - each has independent observer
✅ **First Mount**: Works - `subscribe()` triggers fetch as expected

## Files Changed

`src/baseAtomWithQuery.ts`:
- **Line 64-66**: REMOVE the `setOptions` call from `defaultedOptionsAtom`

## Patch

```diff
diff --git a/src/baseAtomWithQuery.ts b/src/baseAtomWithQuery.ts
index 1234567..abcdefg 100644
--- a/src/baseAtomWithQuery.ts
+++ b/src/baseAtomWithQuery.ts
@@ -54,15 +54,9 @@ export function baseAtomWithQuery<
     const client = get(clientAtom)
     const options = getOptions(get)
     const defaultedOptions = client.defaultQueryOptions(options)
-
-    const cache = get(observerCacheAtom)
-    const cachedObserver = cache.get(client)

     defaultedOptions._optimisticResults = 'optimistic'
-
-    if (cachedObserver) {
-      cachedObserver.setOptions(defaultedOptions)
-    }

     return ensureStaleTime(defaultedOptions)
   })
```

## Migration

This is a bug fix with no breaking changes. No user code changes required.
