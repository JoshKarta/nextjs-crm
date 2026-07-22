import React from "react";
import Navbar from "@/components/landing/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Database, Palette } from "lucide-react";
import Link from "next/link";
import { Hero } from "@/components/ui/animated-hero";

const HomePage = () => {
  const features = [
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Authentication & Authorization",
      description:
        "Complete auth system with email verification, password reset, and role-based access control.",
      items: [
        "Email & Password Auth",
        "Session Management",
        "Role-based Access",
        "Account Linking",
      ],
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "User Management",
      description:
        "Comprehensive user administration with advanced controls and audit capabilities.",
      items: [
        "User Registration",
        "Profile Management",
        "Ban/Unban Users",
        "Session Revocation",
      ],
    },
    {
      icon: <Database className="h-5 w-5" />,
      title: "Database & ORM",
      description:
        "Modern database setup with type-safe queries and automated migrations.",
      items: [
        "PostgreSQL",
        "Drizzle ORM",
        "Type Safety",
        "Automated Migrations",
      ],
    },
    {
      icon: <Palette className="h-5 w-5" />,
      title: "Modern UI/UX",
      description:
        "Beautiful, responsive design system with accessibility built-in.",
      items: ["Tailwind CSS", "shadcn ui", "Dark Mode", "Mobile Responsive"],
    },
  ];

  const techStack = [
    "Next.js 15",
    "Better Auth",
    "PostgreSQL",
    "Drizzle ORM",
    "Tailwind CSS",
    "shadcn ui",
    "TypeScript",
    "React Hook Form",
    "Zod",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <Hero />

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-border/50 hover:border-border transition-colors"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {feature.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tech Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
            <CardDescription>
              Built with modern technologies for performance, security, and
              developer experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, index) => (
                <Badge key={index} variant="outline" className="px-3 py-1">
                  {tech}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-border/50">
          <p className="text-muted-foreground">
            Built with ❤️ by{" "}
            <Link
              href="https://zexa.app"
              target="_blank"
              className="text-primary hover:underline font-medium"
            >
              Zexa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
