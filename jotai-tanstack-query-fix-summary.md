# Fix for Double-Fetch Issue in jotai-tanstack-query

## Problem Description

When using `atomWithQuery`, every time the atom's dependencies change, a **canceled network request** occurs before the actual request completes. This happens consistently and adds unnecessary overhead.

## Root Cause Analysis

### The Issue
In `baseAtomWithQuery.ts`, the `dataAtom` creates a **new `resultAtom` instance** on every evaluation (line 98-113 in v0.11.0). This is by design to track query state changes.

However, the `resultAtom.onMount` handler has a critical issue:

```typescript
resultAtom.onMount = (set) => {
  observer.setOptions(defaultedOptions)  // ← PROBLEM: Observer already has listeners!
  const unsubscribe = observer.subscribe(notifyManager.batchCalls(set))
  return () => { /* cleanup */ }
}
```

### The Sequence When Dependencies Change

1. **Atom re-evaluates** (e.g., user changes a filter)
2. `defaultedOptionsAtom` computes new options with new queryKey
3. `dataAtom` creates **new resultAtom_v2** (old resultAtom_v1 still mounted)
4. Main atom reads new resultAtom_v2
5. **resultAtom_v2 mounts:**
   - Calls `observer.setOptions(newOptions)` 
   - ⚠️ Observer still has listeners from resultAtom_v1
   - ⚠️ TanStack Query's `setOptions` sees: "observer has listeners + options changed"
   - ⚠️ **FIRST FETCH TRIGGERED** via `shouldFetchOptionally()`
6. **resultAtom_v1 unmounts** (replaced by v2)
   - Cleanup runs: `unsubscribe()`
   - **FIRST FETCH CANCELED** (no listeners)
7. **resultAtom_v2 continues mounting:**
   - Calls `observer.subscribe()`
   - **SECOND FETCH TRIGGERED** via `shouldFetchOnMount()`

Result: One canceled request, one successful request.

## The Fix

Only call `setOptions` if the observer has **no active listeners**:

```typescript
resultAtom.onMount = (set) => {
  // Only call setOptions if observer doesn't have listeners yet
  // This prevents triggering a duplicate fetch when re-mounting with the same observer
  // which happens during React re-renders or StrictMode mount/unmount/remount cycles
  const hadNoListeners = (observer as any).listeners?.size === 0
  if (hadNoListeners) {
    observer.setOptions(defaultedOptions)
  }
  
  const unsubscribe = observer.subscribe(notifyManager.batchCalls(set))
  return () => {
    if (observer.getCurrentResult().isError) {
      observer.getCurrentQuery().reset()
    }
    unsubscribe()
  }
}
```

## Why This Fix Is Safe

### 1. First Mount Behavior (UNCHANGED)
When the observer is created for the first time:
- `listeners.size === 0` → `hadNoListeners = true`
- `setOptions` IS called
- Then `subscribe` is called
- **Behavior: Identical to before**

### 2. Re-mount Behavior (FIXED)
When the observer already exists (from previous resultAtom):
- `listeners.size > 0` → `hadNoListeners = false`
- `setOptions` is SKIPPED
- `subscribe` is called, which internally:
  - Adds this listener to the observer
  - Calls `onSubscribe()` which checks `shouldFetchOnMount()`
  - Will fetch if needed based on current state

**Key Insight:** `subscribe()` will trigger a fetch if necessary via `shouldFetchOnMount()`. We don't need `setOptions` to trigger it when listeners already exist.

### 3. Options Update Behavior
**Q: How do new options get applied if we skip setOptions?**

**A:** The observer still gets updated options through the natural flow:

1. When `dataAtom` re-evaluates, it calls `observer.getOptimisticResult(defaultedOptions)` with NEW options (line 96)
2. When we call `subscribe()`, the observer is already aware of the new query state
3. The `onSubscribe()` method internally handles the state transition

The issue was that calling `setOptions` WHILE having listeners was causing a DUPLICATE fetch, not that we needed it for options propagation.

## Potential Edge Cases Analyzed

### Edge Case 1: Query Key Changes
**Scenario:** User changes filter → queryKey changes

**Before Fix:**
- setOptions(newOptions) with listeners → fetch #1 (will be canceled)
- Old resultAtom unmounts → fetch #1 canceled
- New resultAtom subscribes → fetch #2 (completes)

**After Fix:**
- Skip setOptions (has listeners)
- Old resultAtom unmounts → unsubscribes
- New resultAtom subscribes → fetch #1 (completes)
- ✅ One fetch instead of two

### Edge Case 2: Enabled → Disabled → Enabled
**Scenario:** Query gets disabled then re-enabled

**Analysis:**
- When disabled, observer stays in cache but query won't fetch
- When re-enabled, new resultAtom mounts
- If observer has listeners: skip setOptions, subscribe will check enabled state
- If observer has no listeners: call setOptions, subscribe as normal
- ✅ Works correctly

### Edge Case 3: React StrictMode
**Scenario:** Mount → Unmount → Remount (StrictMode behavior)

**Before Fix:**
- Mount #1: setOptions + subscribe → fetch #1
- Unmount #1: cleanup
- Mount #2: setOptions (no listeners after cleanup) → fetch #2
- ✅ This was actually working correctly (no listeners after full unmount)

**After Fix:**
- Mount #1: setOptions (no listeners) + subscribe → fetch #1
- Unmount #1: cleanup
- Mount #2: setOptions (no listeners) + subscribe → fetch #2
- ✅ Identical behavior

### Edge Case 4: Multiple Atoms Sharing Same QueryClient
**Scenario:** Multiple atomWithQuery instances using same QueryClient

**Analysis:**
- Each atom has its own observer (stored in WeakMap by QueryClient)
- The fix only affects the individual observer's listener count
- ✅ No cross-contamination

## Testing Performed

✅ Tested with SimulationTimeSeriesSensitivity module (3 different atomWithQuery instances)
✅ Verified no canceled requests in Network tab
✅ Verified queries still fetch when needed
✅ Verified options updates still work (changing filters, etc.)
✅ Tested in React StrictMode
✅ No console errors or warnings

## Files Changed

- `src/baseAtomWithQuery.ts`: Lines 98-108 (onMount handler)

## Migration Notes

This is a bug fix with no breaking changes. No user code changes required.
