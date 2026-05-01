import { Card } from "@/components/ui/card";
import { Search, Calendar, Video, FileText, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Search,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    number: "01",
    title: "Choose your track",
    body: "Pick student or interviewer at signup. Students choose interview type + goals; interviewers apply and get verified.",
  },
  {
    icon: Calendar,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    number: "02",
    title: "Book instantly",
    body: "Browse verified interviewers, select an available slot, and pay to confirm. No back-and-forth emails.",
  },
  {
    icon: Video,
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    number: "03",
    title: "Join the Interview Room",
    body: "Embedded video + chat + code editor. Run a realistic session that mirrors top-company interviews.",
  },
  {
    icon: FileText,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    number: "04",
    title: "Get a real report",
    body: "Receive rubric-based ratings, strengths/weaknesses, and an actionable improvement plan with AI summary.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />

      <div className="container relative py-20 md:py-28">
        <header className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for speed and signal: simple booking, realistic sessions, and feedback you can act on.
          </p>
        </header>

        {/* Steps Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
              )}

              <Card className="relative p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/30">
                {/* Step Number */}
                <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br ${step.color} text-white flex items-center justify-center text-sm font-bold shadow-lg`}>
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl ${step.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <step.icon className={`h-7 w-7 bg-gradient-to-br ${step.color} bg-clip-text`} style={{ color: step.color.includes('blue') ? '#3b82f6' : step.color.includes('purple') ? '#a855f7' : step.color.includes('orange') ? '#f97316' : '#22c55e' }} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
              </Card>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-primary hover:gap-4 transition-all cursor-pointer group">
            <span className="font-medium">Start your first interview</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </section>
  );
}
