import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: 79,
    description: "Best for a first high-signal baseline.",
    icon: Zap,
    popular: false,
    features: [
      "45–60 min session",
      "Structured rubric feedback",
      "AI-generated summary",
      "Strengths & weaknesses",
      "Post-session notes",
    ],
    cta: "Book a session",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro",
    price: 129,
    description: "For role-specific practice and deeper feedback.",
    icon: Sparkles,
    popular: true,
    features: [
      "60 min session",
      "Everything in Starter",
      "Personalized action plan",
      "Curated resources",
      "Hiring recommendation",
      "Priority booking",
    ],
    cta: "Get Pro",
    ctaVariant: "default" as const,
  },
  {
    name: "Interview-Ready",
    price: 299,
    description: "Multiple sessions across all interview types.",
    icon: Crown,
    popular: false,
    features: [
      "3 sessions bundle",
      "Mix DSA / SD / Behavioral",
      "Progress tracking",
      "Everything in Pro",
      "Same interviewer option",
      "Save 25%",
    ],
    cta: "Start bundle",
    ctaVariant: "outline" as const,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />

      <div className="container relative py-20 md:py-28">
        <header className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium mb-4">
            Transparent Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Invest in your career
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pay per session. Interviewers set their rate; platform fee is included at checkout.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative p-6 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${plan.popular
                  ? 'border-2 border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-primary/5 to-transparent'
                  : 'hover:border-primary/30'
                }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-purple-600 text-white border-none shadow-lg">
                  Most Popular
                </Badge>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <plan.icon className={`h-5 w-5 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-semibold text-lg">{plan.name}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/session</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 flex-grow mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-primary' : 'text-green-500'}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                asChild
                variant={plan.ctaVariant}
                className={`w-full ${plan.popular ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white border-none' : ''}`}
                size="lg"
              >
                <Link to="/sign-up">{plan.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted">
            <Check className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">
              100% satisfaction guarantee — reschedule or refund if not satisfied
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
