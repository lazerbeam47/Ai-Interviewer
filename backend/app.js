import express from 'express';
import cors from 'cors';
import interviewRoute from './routes/interview_route.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', interviewRoute);

export default app;