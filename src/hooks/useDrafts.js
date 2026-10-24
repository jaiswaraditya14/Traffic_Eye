import { useState, useEffect, useCallback } from 'react';
import { getDrafts, saveDraft, removeDraft, clearAllDrafts, getDraftCount } from '../services/drafts';

export function useDrafts() {
    const [drafts, setDrafts] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const all = await getDrafts();
            setDrafts(all);
            setCount(all.length);
        } catch {
            setDrafts([]);
            setCount(0);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const save = useCallback(async (draft) => {
        const saved = await saveDraft(draft);
        await refresh();
        return saved;
    }, [refresh]);

    const remove = useCallback(async (id) => {
        await removeDraft(id);
        await refresh();
    }, [refresh]);

    const clear = useCallback(async () => {
        await clearAllDrafts();
        await refresh();
    }, [refresh]);

    return { drafts, count, loading, refresh, save, remove, clear };
}

export default useDrafts;
