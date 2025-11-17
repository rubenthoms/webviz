# Fix for Double-Fetch Issue in jotai-tanstack-query

## Problem Description

When using `atomWithQuery`, every time the atom's dependencies change, a **canceled network request** occurs before the actual request completes. This happens consistently and adds unnecessary overhead.

## Root Cause Analysis

### The Issue
In `baseAtomWithQuery.ts`, the `defaultedOptionsAtom` (lines 54-69 in v0.11.0) calls `setOptions` on the cached observer whenever it evaluates:

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
```

**The problem:** This `setOptions` call happens BEFORE the old `resultAtom` unmounts.

### The Sequence When Dependencies Change

1. **Atom re-evaluates** (e.g., user changes a filter)
2. `defaultedOptionsAtom` evaluates with new queryKey
   - ⚠️ Calls `cachedObserver.setOptions(newOptions)`
   - ⚠️ Observer STILL HAS LISTENERS from old resultAtom_v1
   - ⚠️ TanStack Query's `setOptions` sees: "observer has listeners + options changed"
   - ⚠️ **FIRST FETCH TRIGGERED** via `shouldFetchOptionally()`
3. `dataAtom` creates **new resultAtom_v2** (old resultAtom_v1 still mounted)
4. Main atom reads new resultAtom_v2
5. **resultAtom_v1 unmounts** (replaced by v2)
   - Cleanup runs: `unsubscribe()`
   - **FIRST FETCH CANCELED** (no listeners)
6. **resultAtom_v2 mounts:**
   - Calls `observer.subscribe()`
   - **SECOND FETCH TRIGGERED** via `shouldFetchOnMount()`

Result: One canceled request, one successful request.

**Key insight from console logs:**
```
[defaultedOptionsAtom] queryKey: ["FGIR"]
[defaultedOptionsAtom] listeners before setOptions: 1  ← OLD ATOM STILL MOUNTED!
[defaultedOptionsAtom] calling setOptions              ← TRIGGERS FIRST FETCH
[resultAtom.unmount] queryKey: ["FGIP"]                ← OLD ATOM UNMOUNTS
[resultAtom.onMount] queryKey: ["FGIR"]
[resultAtom.onMount] listeners before subscribe: 0
```

## The Fix

**Move the `setOptions` call from `defaultedOptionsAtom` to `resultAtom.onMount`**, and only call it when the observer has no active listeners:

```typescript
// In defaultedOptionsAtom - REMOVE the setOptions call:
const defaultedOptionsAtom = atom((get) => {
  const client = get(clientAtom)
  const options = getOptions(get)
  const defaultedOptions = client.defaultQueryOptions(options)

  const cache = get(observerCacheAtom)
  const cachedObserver = cache.get(client)

  defaultedOptions._optimisticResults = 'optimistic'

  // REMOVED: Don't call setOptions here - it's too early!
  // if (cachedObserver) {
  //   cachedObserver.setOptions(defaultedOptions)
  // }

  return ensureStaleTime(defaultedOptions)
})

// In resultAtom.onMount - ADD conditional setOptions:
resultAtom.onMount = (set) => {
  // Only call setOptions if observer doesn't have listeners yet
  // This prevents triggering a duplicate fetch when re-mounting with the same observer
  // which happens during atom dependency changes
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

## Why This Fix Works

### 1. First Mount Behavior (UNCHANGED)
When a query is used for the first time:
- Observer is created fresh → `listeners.size === 0`
- `resultAtom` mounts
- `hadNoListeners = true` → `setOptions` IS called
- Then `subscribe` is called
- **Behavior: Identical to original**

### 2. Dependency Change Behavior (FIXED)
When query dependencies change (e.g., different queryKey):

**Before fix:**
1. `defaultedOptionsAtom` evaluates → calls `setOptions` with `listeners = 1` → **FETCH #1**
2. Old `resultAtom` unmounts → **FETCH #1 CANCELED**
3. New `resultAtom` mounts → calls `subscribe` → **FETCH #2**
4. Result: 1 canceled + 1 successful request ❌

**After fix:**
1. `defaultedOptionsAtom` evaluates → does NOT call `setOptions`
2. Old `resultAtom` unmounts → no fetch to cancel
3. New `resultAtom` mounts → `listeners = 0` → calls `setOptions` → calls `subscribe` → **FETCH #1**
4. Result: 0 canceled + 1 successful request ✅

### 3. Why Subscribe Still Works Without Early setOptions

**Q: If we don't call setOptions in defaultedOptionsAtom, how does the observer get the new query key?**

**A:** The new `resultAtom` gets the updated observer from `observerAtom`, which already has the correct options:

1. When `observerAtom` evaluates, it gets `defaultedOptions` from `defaultedOptionsAtom` (which has the NEW queryKey)
2. If cached observer exists, it's returned as-is (without calling setOptions)
3. When new `resultAtom` mounts and `listeners = 0`, it calls `setOptions(defaultedOptions)` with the NEW options
4. Then `subscribe()` is called, which will fetch with the correct query key

**Key Insight:** Moving `setOptions` from `defaultedOptionsAtom` to `resultAtom.onMount` (with listener check) ensures it's only called AFTER the old resultAtom unmounts, eliminating the race condition.

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

- `src/baseAtomWithQuery.ts`:
  - Lines 54-69: `defaultedOptionsAtom` - remove `setOptions` call
  - Lines 95-113: `resultAtom.onMount` - add conditional `setOptions` call

## Migration Notes

This is a bug fix with no breaking changes. No user code changes required.
