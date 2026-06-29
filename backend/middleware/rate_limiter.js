import  rateLimit from "express-rate-limit";


export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message:{
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes"
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers which are like `X-RateLimit-*` headers but standardized
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers which are deprecated in favor of the `RateLimit-*` headers
})
export const startInterviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message:{
        success: false,
        message: "Too many interview start requests from this IP, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const scoreInterviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message:{
        success: false,
        message: "Too many score requests from this IP, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
})