import {useParams} from "react-router-dom";
import { useEffect, useState} from "react";
import axios from "axios";

export function Result(){
    const {interviewId}=useParams();
    const [scores,setScores]=useState(null);
    const [loading,setLoading]=useState(true);

    useEffect(()=>{
        axios.get(`http://localhost:3000/api/interview/${interviewId}/result`)
            .then(response=>{
                setScores(response.data);
                setLoading(false);
            })
            .catch(error=>{
                console.error('Error fetching interview result:', error);
                setLoading(false);
            });
    },[interviewId]);

    

    if (loading) return <div className="h-screen flex items-center justify-center">Loading results...</div>;

    if (!scores) return <div className="h-screen flex items-center justify-center">No scores available</div>;

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center gap-6">
            <h2 className="text-3xl font-semibold">Interview Results</h2>
            <div className="border rounded-md p-6 w-1/3 flex flex-col gap-4">
                <p className="text-lg">Status: <span className="font-semibold">{scores?.status}</span></p>
                <p className="text-lg">Total Score: <span className="font-semibold">{scores?.score} / 40</span></p>
            </div>
        </div>
    );
}