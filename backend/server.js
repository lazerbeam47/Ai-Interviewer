import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PreInterviewSchema } from './types.js';
import axios from 'axios';
import prisma from './db.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.post('/api/pre-interview',async (req,res)=>{
    const {success,data}=PreInterviewSchema.safeParse(req.body);
    if(!success){
        return res.status(400).json({error:data});
    }
    // Here you can add logic to handle the valid data, e.g., save it to a database or start the interview process
    //todo url can be very malformed, probably use an slm(small language model) here
    const githubUrl = data.githubUrl.endsWith("/") ? data.githubUrl.slice(0, -1) : data.githubUrl;

    const githubUsername = githubUrl.split('/').pop();

    const userRepos=await axios.get(`https://api.github.com/users/${githubUsername}/repos`);
    const filteredUserRepos=userRepos.data.map((repo=>({
        description:repo.description,
        name:repo.name,
        url:repo.html_url,
        startCount:repo.stargazers_count,
    })));
    console.log(filteredUserRepos);

    const interview = await prisma.interview.create({
        data:{
            githubMetadata:JSON.stringify(githubUsername),
            status:"PENDING",
        }
    })
    return res.json({
        id: interview.id
    });
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});