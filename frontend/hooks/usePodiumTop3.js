// hooks/usePodiumTop3.js
import { useEffect, useRef, useState } from "react";
import getAllUsers from "../helper/getAllUsers";
import rankUsers from "../helper/rankUsers";

export default function usePodiumTop3(exerciseName) {
    const [top3, setTop3] = useState([]);
    const allUsersRef = useRef([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const all = await getAllUsers();
                if (cancelled) return;

                allUsersRef.current = Array.isArray(all) ? all : [];
                const ranked = rankUsers(allUsersRef.current, exerciseName) || [];

                const top = ranked.slice(0, 3).map((u) => ({
                    uid: u?.uid,
                    handle: u?.handle ?? "",
                    stat: u?.statsExercises?.[exerciseName]?.["1RM"] ?? 0,
                    fallbackPfp: u?.pfp || u?.image || "",
                }));
                setTop3(top);
            } catch (e) {
                console.log("usePodiumTop3 error", e);
                setTop3([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [exerciseName]);

    return { top3, allUsersRef };
}
