import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../services/api";
import { createSocket } from "../services/websocket";
import Editor from "../components/Editor";
import Navbar from "../components/Navbar";



export default function Board() {

    const { slug } = useParams();
    const navigate = useNavigate();

    const saveTimeout = useRef(null);
    const socketRef = useRef(null);

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [protectedBoard, setProtectedBoard] = useState(false);

    const [password, setPassword] = useState("");


    const [error, setError] = useState("");
    const [canEdit, setCanEdit] = useState(true);
    const [isOwner, setIsOwner] = useState(false);


    // -------------------------------
    // Create board automatically
    // -------------------------------

    useEffect(() => {

    if (!slug) return;

    const socket = createSocket(slug);

    socketRef.current = socket;

    socket.onopen = () => {

        console.log("✅ WebSocket Connected");

    };

    socket.onmessage = (event) => {

    console.log("📩 Received");

    setContent(event.data);

};

    socket.onclose = () => {

        console.log("❌ WebSocket Closed");

    };

    return () => {

        socket.close();

    };

}, [slug]);
    useEffect(() => {

        async function createBoard() {

            try {

                const res =await api.post("/boards/", {});
                localStorage.setItem(
                    `owner_${res.data.slug}`,
                    res.data.owner_token
                );

                navigate(`/${res.data.slug}`);

            }
            catch (err) {

                console.error(err);

            }

        }

        if (!slug) {

            createBoard();

        }

    }, [slug, navigate]);



    // -------------------------------
    // Load board
    // -------------------------------

 useEffect(() => {

    async function loadBoard() {
        if (!slug) return;

        try {

            const res = await api.get(
                `/boards/${slug}`
            );
            setCanEdit(res.data.can_edit);
            setIsOwner(res.data.is_owner);

            // 🔒 Board is password protected
            if (res.data.locked) {

                setProtectedBoard(true);
                setLoading(false);
                return;

            }

            // ✅ Board is accessible
            setProtectedBoard(false);

            setContent(
                res.data.content || ""
            );

            setLoading(false);

        }
        catch (error) {

            // Board doesn't exist → create it
           if (error.response?.status === 404) {

    // Create the board
    const createRes = await api.post(
        "/boards/",
        {
            slug: slug
        }
    );

    // Save owner token
    localStorage.setItem(
        `owner_${createRes.data.slug}`,
        createRes.data.owner_token
    );

    // Load the board again
    const res = await api.get(
        `/boards/${slug}`
    );

    setIsOwner(res.data.is_owner);
    setCanEdit(res.data.can_edit);

    setProtectedBoard(false);

    setContent(
        res.data.content || ""
    );

    setLoading(false);

    return;
}
            else {

                console.error(error);

                setLoading(false);

            }

        }

    }

    loadBoard();

}, [slug]);


    async function togglePermission() {

    const value = !canEdit;

    setCanEdit(value);

    await api.put(
        `/boards/${slug}/permission`,
        {
            can_edit: value
        }
    );

}


    async function verifyPassword() {

    try {

        const res = await api.post(
            `/boards/${slug}/verify`,
            {
                password
            }
        );

        if (res.data.success) {


    setProtectedBoard(false);

    setError("");

    const board = await api.get(
        `/boards/${slug}`
    );

    setContent(board.data.content);

}
        else {

            setError("Incorrect password");

        }

    }
    catch {

        setError("Verification failed");

    }

}

    // -------------------------------
    // Auto Save
    // -------------------------------

    function saveContent(value) {

        setContent(value);

        if (
    socketRef.current &&
    socketRef.current.readyState === WebSocket.OPEN
) {
    socketRef.current.send(value);
}
        if (!slug) return;

        setSaving(true);

        if (saveTimeout.current) {

            clearTimeout(
                saveTimeout.current
            );

        }

        saveTimeout.current = setTimeout(async () => {

            try {

                await api.put(
                    `/boards/${slug}`,
                    {
                        content: value
                    }
                );

            }
            catch (err) {

                console.error(err);

            }

            setSaving(false);

        }, 500);

    }



    if (loading) {

        return <h2>Loading...</h2>;

    }



    if (protectedBoard) {

    return (

        <div
            style={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#111827"
            }}
        >

            <div
                style={{
                    width: 350,
                    background: "#1f2937",
                    padding: 30,
                    borderRadius: 10
                }}
            >

                <h2>🔒 Password Protected</h2>

                <p>
                    Enter the board password
                </p>

                <input

                    type="password"

                    value={password}

                    onChange={(e)=>
                        setPassword(e.target.value)
                    }

                    style={{
                        width:"100%",
                        padding:10,
                        marginTop:15
                    }}

                />

                <button

                    onClick={verifyPassword}

                    style={{
                        width:"100%",
                        marginTop:20,
                        padding:10
                    }}

                >

                    Unlock

                </button>

                <p
                    style={{
                        color:"red",
                        marginTop:10
                    }}
                >
                    {error}
                </p>

            </div>

        </div>

    );

}

    return (

        <div
            style={{
                width: "100%",
                height: "100vh"
            }}
        >

            <Navbar
                    slug={slug}
                    saving={saving}
                    isOwner={isOwner}
                    canEdit={canEdit}
                    togglePermission={togglePermission}
            />

            <div
                style={{
                    height: "calc(100vh - 55px)"
                }}
            >

                <Editor
                    content={content}
                    onChange={saveContent}
                    editable={isOwner || canEdit}
                />

            </div>

        </div>

    );

}