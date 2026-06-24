import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export function Result() {
    const { interviewId } = useParams();
    const [scores, setScores] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`http://localhost:3000/api/interview/${interviewId}/result`)
            .then(response => {
                setScores(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching interview result:', error);
                setLoading(false);
            });
    }, [interviewId]);

    useEffect(() => {
        window.history.pushState(null, '', window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, '', window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    if (loading) return <div className="h-screen flex items-center justify-center">Loading results...</div>;
    if (!scores) return <div className="h-screen flex items-center justify-center">No scores available</div>;

    const scoreCategories = [
        { label: 'Knowledge', value: scores.knowledge },
        { label: 'Communication', value: scores.communication },
        { label: 'Technical Skills', value: scores.technicalSkills },
        { label: 'Thought Process', value: scores.thoughtProcess },
    ];

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center gap-6">
            <h2 className="text-3xl font-semibold">Interview Results</h2>
            <p className="text-gray-500">Total Score: <span className="font-bold text-black">{scores.score} / 40</span></p>

            <div className="grid grid-cols-2 gap-4 w-1/2">
                {scoreCategories.map((cat) => (
                    <div key={cat.label} className="border rounded-md p-4 flex flex-col gap-2">
                        <p className="text-sm text-gray-500">{cat.label}</p>
                        <p className="text-2xl font-bold">{cat.value ?? 0} <span className="text-sm text-gray-400">/ 10</span></p>
                        {/* progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-black h-2 rounded-full"
                                style={{ width: `${(cat.value ?? 0) * 10}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {scores.summary && (
                <div className="border rounded-md p-4 w-1/2">
                    <p className="text-sm text-gray-500 mb-1">Summary</p>
                    <p className="text-gray-800">{scores.summary}</p>
                </div>
            )}

            <button
                onClick={() => window.location.href = '/'}
                className="px-5 py-2 bg-black text-white rounded-md"
            >
                Start New Interview
            </button>
        </div>
    );
}