import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQ() {
  return (
    <section id="faq" className="border-t border-border bg-background">
      <div className="container py-14">
        <header className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">FAQ</h2>
          <p className="mt-3 text-muted-foreground">Answers to the most common questions.</p>
        </header>

        <div className="mt-8 max-w-2xl">
          <Accordion type="single" collapsible>
            <AccordionItem value="q1">
              <AccordionTrigger>Are interviewers verified?</AccordionTrigger>
              <AccordionContent>
                Yes — interviewers apply and are reviewed by an admin before they can accept bookings.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>How do payments work?</AccordionTrigger>
              <AccordionContent>
                Students pay at checkout to confirm the booking. Interviewer payouts are tracked in-app and paid out
                manually in v1.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Do you provide a report after the session?</AccordionTrigger>
              <AccordionContent>
                You’ll receive rubric-based ratings plus written feedback and an improvement plan; we also generate an AI
                summary for clarity.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
}
