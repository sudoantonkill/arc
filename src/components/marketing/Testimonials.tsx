import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const testimonials = [
    {
        quote: "The feedback was incredibly detailed. My interviewer from Google helped me identify gaps in my system design approach that I didn't even know I had.",
        name: "Sarah Chen",
        role: "Software Engineer",
        company: "Now at Meta",
        avatar: "SC",
        rating: 5,
        color: "from-blue-500 to-cyan-500",
    },
    {
        quote: "After 3 sessions on ArcInterview, I felt so much more confident. The structured rubric made it clear exactly what I needed to work on.",
        name: "Marcus Johnson",
        role: "Backend Developer",
        company: "Now at Stripe",
        avatar: "MJ",
        rating: 5,
        color: "from-purple-500 to-pink-500",
    },
    {
        quote: "The real-time code editor and video quality were seamless. Felt just like a real interview, which made the practice so much more valuable.",
        name: "Priya Patel",
        role: "Full-stack Engineer",
        company: "Now at Amazon",
        avatar: "PP",
        rating: 5,
        color: "from-orange-500 to-red-500",
    },
    {
        quote: "As an interviewer, I love helping candidates grow. The platform makes it easy to give detailed feedback that actually helps people improve.",
        name: "David Kim",
        role: "Senior SWE",
        company: "Google",
        avatar: "DK",
        rating: 5,
        color: "from-green-500 to-emerald-500",
    },
];

export default function Testimonials() {
    return (
        <section className="relative overflow-hidden py-20 md:py-28">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5" />

            <div className="container relative">
                <header className="text-center max-w-2xl mx-auto mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-4">
                        Success Stories
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                        Loved by engineers worldwide
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Join thousands of candidates who've leveled up their interview skills
                    </p>
                </header>

                <div className="grid gap-6 md:grid-cols-2">
                    {testimonials.map((testimonial, index) => (
                        <Card
                            key={testimonial.name}
                            className={`p-6 relative transition-all duration-300 hover:shadow-lg ${index === 0 || index === 3 ? 'md:col-span-1' : ''
                                }`}
                        >
                            {/* Quote Icon */}
                            <Quote className="absolute top-4 right-4 h-8 w-8 text-muted-foreground/20" />

                            {/* Rating */}
                            <div className="flex gap-0.5 mb-4">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                                ))}
                            </div>

                            {/* Quote */}
                            <blockquote className="text-lg leading-relaxed mb-6">
                                "{testimonial.quote}"
                            </blockquote>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                    <AvatarFallback className={`bg-gradient-to-br ${testimonial.color} text-white font-semibold`}>
                                        {testimonial.avatar}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-semibold">{testimonial.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {testimonial.role} • {testimonial.company}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Stats */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { value: "2,000+", label: "Interviews completed" },
                        { value: "94%", label: "Got job offers" },
                        { value: "4.9/5", label: "Average rating" },
                        { value: "50+", label: "FAANG interviewers" },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                {stat.value}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
