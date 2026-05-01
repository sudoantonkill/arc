import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  Sparkles,
  Users,
  Star,
  ArrowRight,
  Play,
  Zap
} from "lucide-react";

export default function MarketingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-30" />

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)]" />

      <div className="container relative py-20 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-8">
            {/* Trust Badge */}
            <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Trusted by 500+ engineers at FAANG companies
            </Badge>

            {/* Main Headline */}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block">Ace your next</span>
              <span className="block mt-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                tech interview
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
              Book paid interviews with real engineers from
              <span className="font-semibold text-foreground"> Google, Meta, Amazon, </span>
              and more. Get structured feedback with actionable improvement plans.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="text-lg h-14 px-8 gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Link to="/sign-up">
                  Start Practicing
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg h-14 px-8 gap-2">
                <a href="#how-it-works">
                  <Play className="h-5 w-5" />
                  Watch Demo
                </a>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500'].map((color, i) => (
                  <div key={i} className={`w-10 h-10 rounded-full ${color} border-2 border-background flex items-center justify-center text-white text-xs font-bold`}>
                    {['JD', 'AK', 'ML', 'PS', 'RK'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="ml-1 font-semibold">4.9</span>
                </div>
                <p className="text-sm text-muted-foreground">from 2,000+ interviews</p>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="lg:col-span-5 space-y-4">
            {/* Main Feature Card */}
            <Card className="p-6 bg-gradient-to-br from-card to-muted/50 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Instant Booking</h3>
                  <p className="text-muted-foreground mt-1">
                    Browse verified interviewers, pick a time slot, and pay to confirm. No back-and-forth emails.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5 hover:shadow-lg transition-shadow group">
                <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30 w-fit mb-3 group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold">Structured Rubric</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Technical + behavioral + communication scores
                </p>
              </Card>

              <Card className="p-5 hover:shadow-lg transition-shadow group">
                <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 w-fit mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold">AI Summary</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Turn feedback into clear action items
                </p>
              </Card>
            </div>

            {/* Interview Types Card */}
            <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-amber-400" />
                <span className="font-semibold">Practice Any Interview Type</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['DSA', 'System Design', 'Behavioral', 'Full-stack', 'ML', 'Frontend'].map(type => (
                  <Badge key={type} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
                    {type}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">50+</div>
                <div className="text-xs text-muted-foreground">Verified Interviewers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">2K+</div>
                <div className="text-xs text-muted-foreground">Interviews Done</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">94%</div>
                <div className="text-xs text-muted-foreground">Got Offers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Companies Bar */}
        <div className="mt-20 pt-12 border-t">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Our interviewers have worked at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            {['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix', 'OpenAI', 'Stripe'].map(company => (
              <span key={company} className="text-xl md:text-2xl font-bold text-muted-foreground/80 hover:text-foreground transition-colors">
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
