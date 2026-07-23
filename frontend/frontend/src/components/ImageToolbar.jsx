import { Trash2, Copy } from "lucide-react";


export default function ImageToolbar({
    imageUrl,
    onDelete
}) {


    function copyImageUrl() {

        navigator.clipboard.writeText(
            imageUrl
        );

    }


    return (

        <div
            style={{
                display:"flex",
                gap:"8px",
                background:"#1f2937",
                padding:"8px",
                borderRadius:"8px",
                width:"fit-content",
                marginBottom:"10px",
                boxShadow:
                "0 4px 15px rgba(0,0,0,.4)"
            }}
        >


            <button
                onClick={onDelete}
                style={{
                    background:"#dc2626",
                    color:"white",
                    border:"none",
                    padding:"6px 10px",
                    borderRadius:"6px",
                    cursor:"pointer"
                }}
            >
                <Trash2 size={16}/>
            </button>



            <button
                onClick={copyImageUrl}
                style={{
                    background:"#374151",
                    color:"white",
                    border:"none",
                    padding:"6px 10px",
                    borderRadius:"6px",
                    cursor:"pointer"
                }}
            >
                <Copy size={16}/>
            </button>


        </div>

    );
}