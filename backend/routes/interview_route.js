
import express from 'express';
import { PreInterviewSchema } from '../types.js';
import axios from 'axios';
import prisma from '../db.js';
const router = express.Router();


router.post('/pre-interview',async (req,res)=>{
    const {success,data}=PreInterviewSchema.safeParse(req.body);
    if(!success){
        return res.status(400).json({error:data});
    }
    // Here you can add logic to handle the valid data, e.g., save it to a database or start the interview process
    //todo url can be very malformed, probably use an slm(small language model) here
    const githubUrl = data.githubUrl.endsWith("/") ? data.githubUrl.slice(0, -1) : data.githubUrl;

    const githubUsername = githubUrl.split('/').pop();

    const userRepos=await axios.get(`https://api.github.com/users/${githubUsername}/repos`);
    const filteredUserRepos=userRepos.data
    .filter(repo=>repo.description!=null)
    .map((repo=>({
        description:repo.description,
        name:repo.name,
        url:repo.html_url,
        startCount:repo.stargazers_count,
    })));
    console.log(filteredUserRepos);

    const interview = await prisma.interview.create({
        data:{
            githubMetadata:filteredUserRepos,
            status:"PENDING",
        }
    })
    return res.json({
        id: interview.id,
    });
})

router.get('/interview/:id/result', async (req, res) => {
    const interview = await prisma.interview.findUnique({
        where: { id: req.params.id },
        select: { 
            score: true, 
            status: true,
            knowledge: true,
            communication: true,
            technicalSkills: true,
            thoughtProcess: true,
            summary: true,
        }
    });
    return res.json(interview);
});

export default router;
