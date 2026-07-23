import { useState, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

import api from "../services/api";
import ImageToolbar from "./ImageToolbar";


export default function Editor({
    content,
    onChange,
    editable
}) {


    const [selectedImage, setSelectedImage] =
        useState(null);



    const editor = useEditor({

        extensions: [

            StarterKit,

            Image.configure({

                inline:false,

                allowBase64:false,

            }),

        ],




        content: content || "",

        editable,
        autofocus:true,



        editorProps:{


            attributes:{

                class:"snap-editor",

            },



            handlePaste(view,event){


                const items =
                    event.clipboardData?.items;



                if(!items)
                    return false;



                for(const item of items){


                    if(
                        item.type.startsWith("image")
                    ){

                        const file =
                            item.getAsFile();


                        uploadImage(file);


                        return true;

                    }

                }


                return false;

            },




            handleClick(view,pos,event){


                const target =
                    event.target;



                if(
                    target.tagName === "IMG"
                ){

                    setSelectedImage({

                        src:target.src

                    });

                }
                else{

                    setSelectedImage(null);

                }


                return false;

            }


        },




        onUpdate({editor}){


            onChange(
                editor.getHTML()
            );


        }


    });


    useEffect(() => {

    if (!editor) return;

    if (editor.getHTML() !== content) {

        editor.commands.setContent(
            content,
            false
        );

    }

}, [content, editor]);

useEffect(() => {

    if (editor) {
        editor.setEditable(editable);
    }

}, [editable, editor]);


    async function uploadImage(file){


        try{


            const formData =
                new FormData();



            formData.append(
                "file",
                file
            );



            const response =
                await api.post(

                    "/uploads/",

                    formData,

                    {

                        headers:{

                            "Content-Type":
                            "multipart/form-data"

                        }

                    }

                );



            const imageUrl =
                "http://127.0.0.1:8000"
                +
                response.data.url;




            editor
                .chain()
                .focus()
                .setImage({

                    src:imageUrl

                })
                .run();



        }
        catch(error){


            console.error(
                "Image upload failed",
                error
            );


        }


    }





    function deleteImage(){


        if(!editor)
            return;



        editor
            .chain()
            .focus()
            .deleteSelection()
            .run();



        setSelectedImage(null);


    }






    if(!editor)
        return null;





    return (

        <>


            {editable &&
                selectedImage && (

                    <ImageToolbar


                        imageUrl={
                            selectedImage.src
                        }


                        onDelete={
                            deleteImage
                        }


                    />

                )
            }




            <EditorContent
                editor={editor}
            />


        </>

    );


}