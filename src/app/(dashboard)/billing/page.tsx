"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "£29",
    period: "/month",
    description: "For small firms getting started",
    features: [
      "Up to 50 clients",
      "100 email reminders/month",
      "All templates",
      "Magic link uploads",
      "Email support",
    ],
    cta: "Start free trial",
    popular: false,
  },
  {
    name: "Pro",
    price: "£59",
    period: "/month",
    description: "For growing firms with more clients",
    features: [
      "Unlimited clients",
      "Unlimited email reminders",
      "100 SMS reminders/month",
      "All templates",
      "Magic link uploads",
      "Priority support",
      "Custom branding",
    ],
    cta: "Start free trial",
    popular: true,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">Free Trial</p>
                <Badge>Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                14 days remaining. Upgrade to keep using MTD Client Chaser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? "border-primary shadow-md" : ""}
          >
            <CardHeader>
              {plan.popular && (
                <Badge className="w-fit mb-2">Most Popular</Badge>
              )}
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
