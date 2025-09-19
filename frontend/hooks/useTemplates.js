// hooks/useTemplates.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";

const normalizeSetType = (value) => {
    const raw = typeof value === "string" ? value.toLowerCase() : "";
    return raw === "warmup" || raw === "dropset" || raw === "failure" ? raw : null;
};

const normalizeSet = (s = {}) => ({
    ...s,
    type: normalizeSetType(s?.type),
});

const normalizeExercise = (ex = {}) => ({
    ...ex,
    sets: Array.isArray(ex?.sets) ? ex.sets.map(normalizeSet) : [],
});

const normalize = (arr) => {
    const list = Array.isArray(arr) ? arr : [];
    return list.map((t) => {
        const tid = t?.tid || t?.id || makeID();
        return {
            id: t?.id || tid,
            tid,
            name: t?.name || "Untitled Template",
            exercises: Array.isArray(t?.exercises) ? t.exercises.map(normalizeExercise) : [],
            lastDate: t?.lastDate ?? null,
        };
    });
};

const sanitizeForWrite = (arr) => normalize(arr).map((tpl) => ({
    ...tpl,
    exercises: tpl.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((set) => ({
            ...set,
            // Ensure undefined never hits Firestore
            type: set.type ?? null,
        })),
    })),
}));

export default function useTemplates({ uid, userTemplates }) {
    const [templates, setTemplates] = useState([]);
    useEffect(() => setTemplates(normalize(userTemplates || [])), [userTemplates]);

    const templatesWithNone = useMemo(
        () => [{ id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true }, ...templates],
        [templates]
    );

    const [activeIdx, setActiveIdx] = useState(0);

    const debounceRef = useRef(null);
    const saveTemplates = useCallback(
        (next) => {
            // Always update local global copy immediately
            try {
                const normalizedNext = normalize(next || []);
                global.userData = { ...(global.userData || {}), templates: normalizedNext };
                global.__templatesLocalSig = JSON.stringify(normalizedNext || []);
                global.__templatesDirty = true;
            } catch {}
            if (!uid) return; // defer backend write until uid exists
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                const payload = sanitizeForWrite(next || []);
                updateDoc("users", uid, { templates: payload })
                    .catch((e) => console.log("save templates error", e));
            }, 500);
        },
        [uid]
    );

    // CRUD
    const openedTemplateRef = useRef(null);
    const [isEditVisible, setIsEditVisible] = useState(false);

    const initTemplate = useCallback(() => {
        const tid = makeID();
        const t = { id: tid, tid, name: "Untitled Template", exercises: [], lastDate: null };
        setTemplates((prev) => {
            const next = [...prev, t];
            saveTemplates(next);
            return next;
        });
        openedTemplateRef.current = normalize([t])[0];
        setIsEditVisible(true);
    }, [saveTemplates]);

    const openEditTemplate = useCallback((tpl) => {
        if (!tpl || tpl.isNone) return;
        const tid = tpl?.tid || tpl?.id;
        const latest = templates.find((t) => (t.tid || t.id) === tid) || tpl;
        openedTemplateRef.current = normalize([latest])[0];
        setIsEditVisible(true);
    }, [templates]);

    const updateTemplate = useCallback(() => {
        setTemplates((prev) => {
            const idx = prev.findIndex((t) => t.tid === openedTemplateRef.current?.tid);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...openedTemplateRef.current };
            saveTemplates(next);
            return next;
        });
    }, [saveTemplates]);

    const deleteTemplate = useCallback(() => {
        setTemplates((prev) => {
            const next = prev.filter((t) => t.tid !== openedTemplateRef.current?.tid);
            saveTemplates(next);
            return next;
        });
        openedTemplateRef.current = null;
        setIsEditVisible(false);
    }, [saveTemplates]);

    return {
        templatesWithNone,
        activeIdx,
        setActiveIdx,
        isEditVisible,
        setIsEditVisible,
        openedTemplateRef,
        initTemplate,
        openEditTemplate,
        updateTemplate,
        deleteTemplate,
    };
}
