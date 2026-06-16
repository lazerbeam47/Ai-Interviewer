import z from "zod";

export const PreInterviewSchema = z.object({
    githubUrl: z.string().url()
})