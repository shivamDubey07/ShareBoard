import { useState } from "react";
import api from "../services/api";

export default function PasswordModal({
    slug,
    open,
    onClose
}) {

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    async function lockBoard() {

        if (password.length < 4) {
            alert("Password must be at least 4 characters.");
            return;
        }

        if (password !== confirm) {
            alert("Passwords do not match.");
            return;
        }

        try {

            setLoading(true);

            await api.post(
                `/boards/${slug}/lock`,
                {
                    password
                }
            );

            alert("Board protected successfully 🔒");

            onClose();

        } catch {

            alert("Unable to protect board.");

        } finally {

            setLoading(false);

        }

    }

    return (

        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 999
            }}
        >

            <div
                style={{
                    width: 420,
                    background: "#1f2937",
                    padding: 25,
                    borderRadius: 12,
                    color: "white"
                }}
            >

                <h2>🔒 Protect Board</h2>

                <p>
                    Anyone with the link must enter this password.
                </p>

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    style={{
                        width:"100%",
                        padding:10,
                        marginTop:20
                    }}
                />

                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={(e)=>setConfirm(e.target.value)}
                    style={{
                        width:"100%",
                        padding:10,
                        marginTop:12
                    }}
                />

                <div
                    style={{
                        display:"flex",
                        justifyContent:"flex-end",
                        gap:10,
                        marginTop:20
                    }}
                >

                    <button onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        onClick={lockBoard}
                    >
                        {
                            loading
                                ? "Locking..."
                                : "Lock Board"
                        }
                    </button>

                </div>

            </div>

        </div>

    );

}