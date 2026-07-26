import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Editor from "../components/Editor";
import Navbar from "../components/Navbar";
import api from "../services/api";


export default function Board() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const saveTimeout = useRef(null);
    const saveInFlight = useRef(null);
    const localChangeVersion = useRef(0);
    const serverVersion = useRef(0);
    const hasUnsavedChanges = useRef(false);
    const latestContent = useRef("");
    const accessTokenRef = useRef(null);

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [loadError, setLoadError] = useState("");

    const [protectedBoard, setProtectedBoard] = useState(false);
    const [isProtected, setIsProtected] = useState(false);
    const [accessToken, setAccessToken] = useState(null);
    const [password, setPassword] = useState("");
    const [unlocking, setUnlocking] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    const [canEdit, setCanEdit] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    function draftKey() {
        return `draft_${slug}`;
    }

    function accessConfig() {
        if (!accessTokenRef.current) return {};

        return {
            headers: {
                "X-Board-Access-Token":
                    accessTokenRef.current,
            },
        };
    }

    function clearAccess() {
        accessTokenRef.current = null;
        setAccessToken(null);
    }

    function showPasswordGate() {
        clearAccess();
        setProtectedBoard(true);
        setIsProtected(true);
        setContent("");
        latestContent.current = "";
        setCanEdit(false);
        setSaving(false);
        setSaveError("");
    }

    function readDraft() {
        if (!slug) return null;

        try {
            const value = localStorage.getItem(draftKey());
            return value ? JSON.parse(value) : null;
        }
        catch {
            return null;
        }
    }

    function storeDraft(value) {
        if (!slug) return;

        localStorage.setItem(
            draftKey(),
            JSON.stringify({
                content: value,
                baseVersion: serverVersion.current,
            }),
        );
    }

    function clearDraft() {
        if (slug) {
            localStorage.removeItem(draftKey());
        }
    }

    function applyBoardData(data, recoverLocalDraft = true) {
        const responseVersion = Number.isInteger(data.version)
            ? data.version
            : serverVersion.current;

        serverVersion.current = responseVersion;
        setCanEdit(data.can_edit);
        setIsOwner(data.is_owner);
        setIsProtected(data.is_protected);

        const serverContent = data.content || "";
        const draft = recoverLocalDraft ? readDraft() : null;

        if (
            draft &&
            draft.content !== serverContent &&
            (data.is_owner || data.can_edit)
        ) {
            latestContent.current = draft.content;
            setContent(draft.content);
            localChangeVersion.current += 1;
            hasUnsavedChanges.current = true;
            setSaving(true);
            setSaveError("");

            if (saveTimeout.current) {
                window.clearTimeout(saveTimeout.current);
            }

            saveTimeout.current = window.setTimeout(
                persistPendingSave,
                0,
            );
            return;
        }

        if (draft?.content === serverContent) {
            clearDraft();
        }
        else if (
            draft &&
            !data.is_owner &&
            !data.can_edit
        ) {
            setSaveError(
                "This board is read-only. Your local draft remains stored in this browser.",
            );
        }

        latestContent.current = serverContent;
        setContent(serverContent);
        hasUnsavedChanges.current = false;
        setSaving(false);
    }

    async function persistPendingSave() {
        if (saveTimeout.current) {
            window.clearTimeout(saveTimeout.current);
            saveTimeout.current = null;
        }

        if (!hasUnsavedChanges.current || !slug) {
            return true;
        }

        if (saveInFlight.current) {
            try {
                await saveInFlight.current;
            }
            catch {
                return false;
            }

            if (hasUnsavedChanges.current) {
                return persistPendingSave();
            }

            return true;
        }

        const contentToSave = latestContent.current;
        const localVersionToSave = localChangeVersion.current;
        const expectedServerVersion = serverVersion.current;

        const request = api.put(
            `/boards/${slug}`,
            {
                content: contentToSave,
                version: expectedServerVersion,
            },
            accessConfig(),
        );

        saveInFlight.current = request;
        let succeeded = false;

        try {
            const response = await request;

            if (Number.isInteger(response.data.version)) {
                serverVersion.current = response.data.version;
            }
            succeeded = true;
            setSaveError("");

            if (
                localVersionToSave ===
                localChangeVersion.current
            ) {
                hasUnsavedChanges.current = false;
                setSaving(false);
                clearDraft();
            }
        }
        catch (error) {
            const detail = error.response?.data?.detail;

            setSaveError(
                detail || "Save failed. Your draft is stored in this browser.",
            );
            setSaving(false);
        }
        finally {
            saveInFlight.current = null;
        }

        if (succeeded && hasUnsavedChanges.current) {
            return persistPendingSave();
        }

        return succeeded;
    }

    function saveContent(value) {
        setContent(value);
        latestContent.current = value;
        localChangeVersion.current += 1;
        hasUnsavedChanges.current = true;
        setSaving(true);
        setSaveError("");
        storeDraft(value);

        if (saveTimeout.current) {
            window.clearTimeout(saveTimeout.current);
        }

        saveTimeout.current = window.setTimeout(
            persistPendingSave,
            250,
        );
    }

    async function flushPendingSave() {
        return persistPendingSave();
    }

    useEffect(() => {
        async function createBoard() {
            try {
                const response = await api.post("/boards/", {});

                localStorage.setItem(
                    `owner_${response.data.slug}`,
                    response.data.owner_token,
                );

                navigate(`/${response.data.slug}`, {
                    replace: true,
                });
            }
            catch (error) {
                console.error(error);
                setLoadError("Unable to create a board.");
                setLoading(false);
            }
        }

        if (!slug) {
            createBoard();
        }
    }, [slug, navigate]);

    useEffect(() => {
        if (!slug) return;

        let stopped = false;

        async function loadBoard() {
            setLoading(true);
            setLoadError("");
            clearAccess();

            try {
                const response = await api.get(
                    `/boards/${slug}`,
                );

                if (stopped) return;

                if (response.data.locked) {
                    showPasswordGate();
                }
                else {
                    setProtectedBoard(false);
                    applyBoardData(response.data);
                }
            }
            catch (error) {
                if (stopped) return;

                if (error.response?.status === 404) {
                    setLoadError("This board does not exist.");
                }
                else {
                    setLoadError(
                        "Unable to load this board. Please try again.",
                    );
                }
            }
            finally {
                if (!stopped) {
                    setLoading(false);
                }
            }
        }

        loadBoard();

        return () => {
            stopped = true;
        };
        // Access and save helpers read current values from refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    useEffect(() => {
        if (
            !slug ||
            loading ||
            protectedBoard ||
            loadError
        ) {
            return;
        }

        let stopped = false;
        let requestInProgress = false;

        async function refreshBoard() {
            if (stopped || requestInProgress) return;

            requestInProgress = true;

            try {
                const response = await api.get(
                    `/boards/${slug}`,
                    accessConfig(),
                );

                if (stopped) return;

                if (response.data.locked) {
                    showPasswordGate();
                    return;
                }

                setCanEdit(response.data.can_edit);
                setIsOwner(response.data.is_owner);
                setIsProtected(
                    response.data.is_protected,
                );

                if (
                    Number.isInteger(response.data.version) &&
                    response.data.version >
                    serverVersion.current
                ) {
                    if (
                        hasUnsavedChanges.current ||
                        saveInFlight.current
                    ) {
                        setSaveError(
                            "Someone else updated this board. Reload before continuing.",
                        );
                    }
                    else {
                        applyBoardData(
                            response.data,
                            false,
                        );
                    }
                }
            }
            catch (error) {
                if (error.response?.status === 403) {
                    showPasswordGate();
                }
                else {
                    console.error(
                        "Board refresh failed",
                        error,
                    );
                }
            }
            finally {
                requestInProgress = false;
            }
        }

        const interval = window.setInterval(
            refreshBoard,
            2000,
        );

        function refreshWhenVisible() {
            if (document.visibilityState === "visible") {
                refreshBoard();
            }
        }

        document.addEventListener(
            "visibilitychange",
            refreshWhenVisible,
        );

        return () => {
            stopped = true;
            window.clearInterval(interval);
            document.removeEventListener(
                "visibilitychange",
                refreshWhenVisible,
            );
        };
        // Access and save helpers read current values from refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        slug,
        loading,
        protectedBoard,
        loadError,
        accessToken,
    ]);

    useEffect(() => {
        function warnBeforeUnload(event) {
            if (!hasUnsavedChanges.current) return;

            event.preventDefault();
            event.returnValue = "";
        }

        function saveWhenHidden() {
            if (
                document.visibilityState === "hidden" &&
                hasUnsavedChanges.current
            ) {
                persistPendingSave();
            }
        }

        window.addEventListener(
            "beforeunload",
            warnBeforeUnload,
        );
        document.addEventListener(
            "visibilitychange",
            saveWhenHidden,
        );

        return () => {
            window.removeEventListener(
                "beforeunload",
                warnBeforeUnload,
            );
            document.removeEventListener(
                "visibilitychange",
                saveWhenHidden,
            );

            if (saveTimeout.current) {
                window.clearTimeout(saveTimeout.current);
            }
        };
        // The save function reads current content and access from refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    async function verifyPassword(event) {
        event.preventDefault();
        setUnlocking(true);
        setPasswordError("");

        try {
            const response = await api.post(
                `/boards/${slug}/verify`,
                {
                    password,
                },
            );

            accessTokenRef.current =
                response.data.access_token;
            setAccessToken(response.data.access_token);
            setProtectedBoard(false);
            setPassword("");
            applyBoardData(response.data);
        }
        catch (error) {
            if (error.response?.status === 401) {
                setPasswordError("Incorrect password");
            }
            else {
                setPasswordError(
                    "Unable to unlock this board. Please try again.",
                );
            }
        }
        finally {
            setUnlocking(false);
        }
    }

    async function togglePermission() {
        const saved = await flushPendingSave();
        if (!saved) return;

        try {
            const response = await api.put(
                `/boards/${slug}/permission`,
                {
                    can_edit: !canEdit,
                },
            );

            setCanEdit(response.data.can_edit);
        }
        catch (error) {
            setSaveError(
                error.response?.data?.detail ||
                "Unable to change editing permission.",
            );
        }
    }

    function handleLocked(token) {
        accessTokenRef.current = token;
        setAccessToken(token);
        setIsProtected(true);
    }

    if (loading) {
        return <h2>Loading...</h2>;
    }

    if (loadError) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    background: "#111827",
                    color: "white",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <h2>Board unavailable</h2>
                    <p>{loadError}</p>
                </div>
            </div>
        );
    }

    if (protectedBoard) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    background: "#111827",
                    color: "white",
                }}
            >
                <form
                    onSubmit={verifyPassword}
                    style={{
                        width: 350,
                        maxWidth: "calc(100vw - 40px)",
                        background: "#1f2937",
                        padding: 30,
                        borderRadius: 10,
                    }}
                >
                    <h2>🔒 Password Protected</h2>
                    <p>Enter the board password to view it.</p>

                    <input
                        aria-label="Board password"
                        type="password"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        autoFocus
                        required
                        style={{
                            boxSizing: "border-box",
                            width: "100%",
                            padding: 10,
                            marginTop: 15,
                        }}
                    />

                    <button
                        type="submit"
                        disabled={unlocking}
                        style={{
                            width: "100%",
                            marginTop: 20,
                            padding: 10,
                        }}
                    >
                        {unlocking ? "Unlocking..." : "Unlock"}
                    </button>

                    {passwordError && (
                        <p
                            role="alert"
                            style={{
                                color: "#f87171",
                                marginTop: 10,
                            }}
                        >
                            {passwordError}
                        </p>
                    )}
                </form>
            </div>
        );
    }

    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
            }}
        >
            <Navbar
                slug={slug}
                saving={saving}
                saveError={saveError}
                isOwner={isOwner}
                isProtected={isProtected}
                canEdit={canEdit}
                togglePermission={togglePermission}
                flushPendingSave={flushPendingSave}
                onLocked={handleLocked}
            />

            <div
                style={{
                    height: "calc(100vh - 55px)",
                }}
            >
                <Editor
                    content={content}
                    onChange={saveContent}
                    onBlur={flushPendingSave}
                    editable={isOwner || canEdit}
                />
            </div>
        </div>
    );
}
