import {
    Copy,
    Check,
    Lock
} from "lucide-react";

import { useState } from "react";

import PasswordModal from "./PasswordModal";

export default function Navbar({
    slug,
    saving,
    canEdit,
    isOwner,
    togglePermission
}) {

    const [copied, setCopied] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    async function copyLink() {

        const url = window.location.origin + "/" + slug;

        await navigator.clipboard.writeText(url);

        setCopied(true);

        setTimeout(() => {

            setCopied(false);

        }, 2000);

    }

    return (

        <div
            style={{
                height: 55,
                background: "#0f172a",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 20px",
                borderBottom: "1px solid #1f2937"
            }}
        >

            <div
                style={{
                    display: "flex",
                    gap: "20px",
                    alignItems: "center"
                }}
            >

                <div
    style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        lineHeight: 1.1
    }}
>

    <h2
        style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: "700",
            letterSpacing: "0.5px",
            color: "#ffffff"
        }}
    >
        ShareBoard
    </h2>

    <span
        style={{
            fontSize: "10px",
            color: "#ffffff88",
            marginTop: "4px",
            fontWeight: "500",
            letterSpacing: "0.8px",
            textTransform: "uppercase"
        }}
    >
        Sharing is Caring
    </span>

</div>

                <span
                    style={{
                        color: "#9ca3af",
                        fontSize: "14px"
                    }}
                >
                    {saving ? "Saving..." : "✓ Saved"}
                </span>



            </div>

           



            <div
    style={{
        display: "flex",
        gap: 12
    }}
>

    <button
        onClick={() => setShowPasswordModal(true)}
        style={{
            background: "#374151",
            color: "white",
            border: "none",
            padding: "8px 15px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            gap: "8px",
            alignItems: "center"
        }}
    >

        <Lock size={16} />

        Protect

    </button>

    {isOwner && (
        <label
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "white"
            }}
        >
            <input
                type="checkbox"
                checked={canEdit}
                onChange={togglePermission}
            />

            Allow Editing
        </label>
    )}


    <button
        onClick={copyLink}
        style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "8px 15px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            gap: "8px",
            alignItems: "center"
        }}
    >

        {copied ? <Check size={16}/> : <Copy size={16}/>}

        {copied ? "Copied" : "Copy Link"}

    </button>

</div>

<PasswordModal
    slug={slug}
    open={showPasswordModal}
    onClose={() => setShowPasswordModal(false)}
/>  

        </div>

    );

}