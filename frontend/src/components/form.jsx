import { useState } from "react"
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom";
export function Form(){
    const [githubUrl, setGithubUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(){

        //add more validation if needed
        if(!githubUrl){
            toast("Please fill in both fields");
            return;
        }
        setLoading(true);
        // Here you can add logic to send the data to the backend or navigate to the interview page
        try {
            const response = await axios.post("http://localhost:3000/api/pre-interview", { githubUrl })
            console.log(response.data);
            navigate(`/interview/${response.data.id}`);
        } catch (error) {
            console.error(error);
            toast("An error occurred while starting the interview");
        } finally {
            setLoading(false);
        }
    }
    return (
       <div className="h-screen w-screen flex items-center justify-center">
           <div>
                <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
                    Ai Interviewer Kickstart
                </h2>
                <div className="p-2 ml-5">
                    <input placeholder="Github url" onChange={e=>setGithubUrl(e.target.value)} className="border border-gray-300 p-2 rounded-md"/>
                </div>
                {/* <div className="p-2 ml-5">
                    <input placeholder="LinkedIn url" onChange={e=>setLinkedinUrl(e.target.value)} className="border border-gray-300 p-2 rounded-md"/>
                </div> */}
                <div className="p-2">
                    <button disabled={loading} onClick={handleSubmit} className="ml-13 px-5 py-2 border border-gray-300 rounded-md bg-black text-white hover:bg-blue-600">
                        {loading ? "Loading..." : "Start Interview"}
                    </button>
                </div>
           </div>
       </div>
    )
}